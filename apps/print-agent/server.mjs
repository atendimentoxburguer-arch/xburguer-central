import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderEscPosJob, validateJob } from './lib/agent-core.mjs';

export const AGENT_VERSION='2.3.0';
export const AGENT_HOST='127.0.0.1';
export const AGENT_PORT=17871;

const moduleDir=path.dirname(fileURLToPath(import.meta.url));
const allowedOrigins=[
  /^https:\/\/atendimentoxburguer-arch\.github\.io$/,
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/
];

function defaultDataDir(){
  return path.join(process.env.APPDATA||path.join(os.homedir(),'.xburguer-central'),'X Burguer Central','Print Agent');
}
function safeJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}}
function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2),'utf8')}
function iso(){return new Date().toISOString()}

export function createPrintAgent(options={}){
  const version=String(options.version||AGENT_VERSION);
  const host=String(options.host||AGENT_HOST);
  const port=Number(options.port)||AGENT_PORT;
  const dataDir=options.dataDir||defaultDataDir();
  const rawPrintScript=options.rawPrintScript||path.join(moduleDir,'scripts','raw-print.ps1');
  const printerProvider=typeof options.printerProvider==='function'?options.printerProvider:null;
  const configPath=path.join(dataDir,'config.json');
  const queuePath=path.join(dataDir,'queue.json');
  const logPath=path.join(dataDir,'agent.log.jsonl');
  fs.mkdirSync(dataDir,{recursive:true});

  let config=safeJson(configPath,{token:'',createdAt:iso(),lastPairedAt:''});
  if(!config.token){config.token=crypto.randomBytes(24).toString('hex');writeJson(configPath,config)}
  let pairingCode=String(crypto.randomInt(100000,1000000));
  let jobs=safeJson(queuePath,[]);
  if(!Array.isArray(jobs))jobs=[];
  jobs=jobs.slice(-500).map(j=>j.status==='printing'?{...j,status:'queued',updatedAt:iso()}:j);
  let processing=false,timer=null,server=null,startedAt='',lastError='';

  const persistQueue=()=>writeJson(queuePath,jobs.slice(-500));
  const queueSummary=()=>{
    const count=status=>jobs.filter(j=>j.status===status).length;
    return {queued:count('queued')+count('retry'),printing:count('printing'),failed:count('failed'),printed:count('printed'),total:jobs.length};
  };
  const publicJob=j=>({
    id:j.id,dedupeKey:j.dedupeKey||'',printerName:j.printerName,status:j.status,attempts:j.attempts,
    createdAt:j.createdAt,updatedAt:j.updatedAt,printedAt:j.printedAt||'',lastError:j.lastError||'',
    orderId:j.document?.id||'',purpose:j.document?.purpose||'',station:j.document?.station||j.station||'all'
  });
  const log=(level,message,extra={})=>{
    const entry={at:iso(),level,message,...extra};
    if(level==='error')lastError=message+(extra.error?' — '+extra.error:'');
    try{fs.appendFileSync(logPath,JSON.stringify(entry)+'\n','utf8')}catch{}
    console[level==='error'?'error':'log']('[X Burguer Print Agent]',message,extra);
    return entry;
  };
  const recentLogs=(limit=40)=>{
    try{
      const lines=fs.readFileSync(logPath,'utf8').trim().split(/\r?\n/).filter(Boolean).slice(-Math.min(200,Math.max(1,limit)));
      return lines.reverse().map(line=>{try{return JSON.parse(line)}catch{return {at:'',level:'error',message:line}}});
    }catch{return []}
  };

  function corsOrigin(req){
    const origin=String(req.headers.origin||'');
    return allowedOrigins.some(re=>re.test(origin))?origin:'';
  }
  function jsonHeaders(req){
    const origin=corsOrigin(req);
    return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})};
  }
  function send(req,res,status,payload){res.writeHead(status,jsonHeaders(req));res.end(JSON.stringify(payload))}
  function authorized(req){
    const provided=String(req.headers['x-xb-print-token']||'');
    if(provided.length!==config.token.length)return false;
    return crypto.timingSafeEqual(Buffer.from(provided),Buffer.from(config.token));
  }
  function readBody(req){
    return new Promise((resolve,reject)=>{
      let body='',size=0,aborted=false;
      req.setEncoding('utf8');
      req.on('data',chunk=>{
        if(aborted)return;
        size+=Buffer.byteLength(chunk);
        if(size>512*1024){aborted=true;reject(new Error('Payload excede 512 KB.'));return}
        body+=chunk;
      });
      req.on('end',()=>{if(aborted)return;try{resolve(body?JSON.parse(body):{})}catch{reject(new Error('JSON invalido.'))}});
      req.on('error',reject);
    });
  }
  function runPowerShell(args,{timeout=15000}={}){
    return new Promise((resolve,reject)=>{
      if(process.platform!=='win32'){reject(new Error('Agente de impressao silenciosa requer Windows.'));return}
      const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',...args],{windowsHide:true});
      let stdout='',stderr='',settled=false;
      const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timeoutId);fn(value)};
      const timeoutId=setTimeout(()=>{try{child.kill()}catch{}finish(reject,new Error('Tempo limite do PowerShell excedido.'))},timeout);
      child.stdout.on('data',d=>stdout+=d);
      child.stderr.on('data',d=>stderr+=d);
      child.on('error',err=>finish(reject,err));
      child.on('close',code=>code===0?finish(resolve,stdout):finish(reject,new Error(stderr.trim()||('PowerShell terminou com codigo '+code))));
    });
  }
  function normalizePrinters(list=[]){
    const seen=new Set();
    return (Array.isArray(list)?list:[]).map(p=>({
      name:String(p.name||p.Name||p.displayName||'').trim(),
      driver:String(p.driver||p.DriverName||p.description||'').trim(),
      port:String(p.port||p.PortName||p.options?.['printer-location']||'').trim(),
      status:String(p.status??p.PrinterStatus??''),
      offline:Boolean(p.offline??p.WorkOffline??false),
      default:Boolean(p.default??p.Default??p.isDefault??false)
    })).filter(p=>p.name&&!seen.has(p.name.toLowerCase())&&seen.add(p.name.toLowerCase()))
      .sort((a,b)=>Number(b.default)-Number(a.default)||a.name.localeCompare(b.name,'pt-BR'));
  }
  async function powershellPrinterSources(){
    const sources=[
      {
        name:'Get-Printer',
        command:"$ErrorActionPreference='Stop'; Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus,WorkOffline,Default | ConvertTo-Json -Compress"
      },
      {
        name:'Win32_Printer',
        command:"$ErrorActionPreference='Stop'; Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PortName,PrinterStatus,WorkOffline,Default | ConvertTo-Json -Compress"
      },
      {
        name:'.NET Printing',
        command:"$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Drawing; $d=(New-Object System.Drawing.Printing.PrinterSettings).PrinterName; @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters) | ForEach-Object { [pscustomobject]@{Name=[string]$_;DriverName='';PortName='';PrinterStatus='';WorkOffline=$false;Default=([string]$_ -eq $d)} } | ConvertTo-Json -Compress"
      },
      {
        name:'Registro do Windows',
        command:"$ErrorActionPreference='Stop'; $items=@(); $devices='HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices'; if(Test-Path $devices){ (Get-ItemProperty $devices).PSObject.Properties | Where-Object { $_.MemberType -eq 'NoteProperty' -and $_.Name -notmatch '^PS' } | ForEach-Object { $items += [pscustomobject]@{Name=$_.Name;DriverName='';PortName='';PrinterStatus='';WorkOffline=$false;Default=$false} } }; $machine='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers'; if(Test-Path $machine){ Get-ChildItem $machine | ForEach-Object { $items += [pscustomobject]@{Name=$_.PSChildName;DriverName='';PortName='';PrinterStatus='';WorkOffline=$false;Default=$false} } }; $items | Sort-Object Name -Unique | ConvertTo-Json -Compress"
      }
    ];
    const attempts=[];
    for(const source of sources){
      try{
        const output=(await runPowerShell(['-Command',source.command])).trim();
        if(!output){attempts.push({source:source.name,count:0,error:''});continue}
        const parsed=JSON.parse(output),list=normalizePrinters(Array.isArray(parsed)?parsed:[parsed]);
        attempts.push({source:source.name,count:list.length,error:''});
        if(list.length)return {list,source:source.name,attempts};
      }catch(error){
        attempts.push({source:source.name,count:0,error:String(error.message||error).slice(0,500)});
      }
    }
    return {list:[],source:'',attempts};
  }
  let lastPrinterDiagnostics={source:'',count:0,attempts:[],at:''};
  async function listPrinters(){
    const attempts=[];
    if(printerProvider){
      try{
        const nativeList=normalizePrinters(await printerProvider());
        attempts.push({source:'Electron',count:nativeList.length,error:''});
        if(nativeList.length){
          lastPrinterDiagnostics={source:'Electron',count:nativeList.length,attempts,at:iso()};
          log('info','Impressoras detectadas via Electron',{count:nativeList.length});
          return nativeList;
        }
      }catch(error){attempts.push({source:'Electron',count:0,error:String(error.message||error).slice(0,500)})}
    }
    const ps=await powershellPrinterSources();
    attempts.push(...ps.attempts);
    lastPrinterDiagnostics={source:ps.source,count:ps.list.length,attempts,at:iso()};
    if(ps.list.length){
      log('info','Impressoras detectadas via '+ps.source,{count:ps.list.length});
      return ps.list;
    }
    log('warn','Nenhuma impressora detectada',{error:attempts.map(x=>x.source+': '+(x.error||x.count)).join(' | ')});
    return [];
  }
  function getPrinterDiagnostics(){return JSON.parse(JSON.stringify(lastPrinterDiagnostics))}

  async function spoolRaw(job){
    const buffer=renderEscPosJob(job),temp=path.join(dataDir,'job-'+job.id+'.bin');
    fs.writeFileSync(temp,buffer);
    try{
      for(let copy=0;copy<job.profile.copies;copy++){
        await runPowerShell(['-File',rawPrintScript,'-PrinterName',job.printerName,'-FilePath',temp,'-DocumentName','X Burguer #'+job.document.id],{timeout:20000});
      }
    }finally{try{fs.unlinkSync(temp)}catch{}}
  }
  function findDuplicate(body){
    if(!body.dedupeKey)return jobs.find(j=>j.id===body.id);
    const horizon=Date.now()-24*60*60*1000;
    return jobs.find(j=>j.dedupeKey===body.dedupeKey&&new Date(j.createdAt||0).getTime()>=horizon&&j.status!=='failed');
  }
  function enqueueJob(body){
    const problem=validateJob(body);if(problem)throw new Error(problem);
    const duplicate=findDuplicate(body);
    if(duplicate)return {job:duplicate,deduplicated:true};
    const job={...body,status:'queued',attempts:0,createdAt:iso(),updatedAt:iso(),lastError:''};
    jobs.push(job);persistQueue();void processQueue();
    log('info','Job recebido',{jobId:job.id,printer:job.printerName,purpose:job.document?.purpose,dedupeKey:job.dedupeKey||''});
    return {job,deduplicated:false};
  }
  function retryJob(id){
    const job=jobs.find(j=>j.id===id);if(!job)throw new Error('Job nao encontrado.');
    job.status='queued';job.attempts=0;job.nextAttemptAt='';job.lastError='';job.updatedAt=iso();persistQueue();void processQueue();
    log('info','Job recolocado na fila',{jobId:id});
    return publicJob(job);
  }
  function getJobs(limit=40){
    return jobs.slice(-Math.min(100,Math.max(1,Number(limit)||40))).reverse().map(publicJob);
  }
  function getLastJob(){return jobs.length?publicJob(jobs.at(-1)):null}
  function getSnapshot(){
    return {
      ok:true,name:'X Burguer Print Agent',version,platform:process.platform,host,port,startedAt,pairingCode,
      queue:queueSummary(),lastJob:getLastJob(),lastError,dataDir,pairedOnce:Boolean(config.lastPairedAt),lastPairedAt:config.lastPairedAt||'',logCount:recentLogs(200).length
    };
  }
  function rotatePairingCode(){pairingCode=String(crypto.randomInt(100000,1000000));return pairingCode}
  async function createTestJob({printerName,paper='80mm'}={}){
    const name=String(printerName||'').trim();if(!name)throw new Error('Selecione uma impressora.');
    const job={
      id:'test-'+Date.now().toString(36),dedupeKey:'',printerName:name,
      profile:{paper:paper==='58mm'?'58mm':'80mm',copies:1,strongText:true},
      document:{
        purpose:'kitchen',station:'Teste',id:'TESTE',type:'Balcao',table:'Mesa 01',customer:'Cliente de teste',
        createdAt:new Date().toLocaleString('pt-BR'),items:[{qty:1,name:'X-Burguer de teste',station:'Chapa'}],
        notes:'Teste do X Burguer Print Agent',store:{name:'X Burguer'}
      }
    };
    return enqueueJob(job);
  }
  async function processQueue(){
    if(processing)return;
    const job=jobs.find(j=>['queued','retry'].includes(j.status)&&(!j.nextAttemptAt||new Date(j.nextAttemptAt)<=new Date()));
    if(!job)return;
    processing=true;job.status='printing';job.updatedAt=iso();persistQueue();
    try{
      await spoolRaw(job);
      job.status='printed';job.printedAt=iso();job.updatedAt=job.printedAt;job.lastError='';
      log('info','Job impresso',{jobId:job.id,printer:job.printerName,purpose:job.document?.purpose});
    }catch(error){
      job.attempts=(Number(job.attempts)||0)+1;job.lastError=String(error.message||error);job.updatedAt=iso();
      if(job.attempts>=3){job.status='failed';log('error','Job falhou apos tentativas',{jobId:job.id,error:job.lastError})}
      else{
        job.status='retry';job.nextAttemptAt=new Date(Date.now()+Math.min(30000,2000*Math.pow(2,job.attempts))).toISOString();
        log('info','Job agendado para nova tentativa',{jobId:job.id,attempts:job.attempts,error:job.lastError});
      }
    }finally{persistQueue();processing=false;setTimeout(()=>void processQueue(),100)}
  }
  function homeHtml(){
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>X Burguer Print Agent</title><style>body{font:16px system-ui;margin:40px;max-width:760px;color:#111}code{font-size:28px;font-weight:800;letter-spacing:5px}section{padding:20px;border:1px solid #ddd;border-radius:14px;margin:14px 0}small{color:#666}</style></head><body><h1>X Burguer Print Agent</h1><section><b>Agente ativo</b><p>Versao '+version+' • http://'+host+':'+port+'</p></section><section><b>Codigo de pareamento</b><p><code>'+pairingCode+'</code></p><small>Digite este codigo no X Burguer Central para autorizar este computador.</small></section><section><b>Aplicativo Windows</b><p>Abra o X Burguer Print Agent pela bandeja do Windows para gerenciar impressoras, fila e testes.</p></section></body></html>';
  }
  function bridgeHtml(){
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>X Burguer Print Bridge</title></head><body><script>
(function(){
  const allowed=[
    /^https:\\/\\/atendimentoxburguer-arch\\.github\\.io$/,
    /^http:\\/\\/localhost(?::\\d+)?$/,
    /^http:\\/\\/127\\.0\\.0\\.1(?::\\d+)?$/
  ];
  const originOk=origin=>allowed.some(re=>re.test(String(origin||'')));
  const pathOk=path=>/^\\/(?:health|pair|printers|jobs(?:\\?[^#]*)?|jobs\\/[A-Za-z0-9._:-]{1,96}\\/retry)$/.test(String(path||''));
  async function call(req){
    if(!pathOk(req.path))throw new Error('Rota do bridge não permitida.');
    const method=req.method==='POST'?'POST':'GET';
    const headers={Accept:'application/json'};
    if(req.body!==null&&req.body!==undefined)headers['Content-Type']='application/json';
    if(req.token)headers['X-XB-Print-Token']=String(req.token);
    const response=await fetch(req.path,{method,headers,body:req.body===null||req.body===undefined?undefined:JSON.stringify(req.body),cache:'no-store',credentials:'omit'});
    let data={};try{data=await response.json()}catch{}
    return {ok:response.ok,status:response.status,data,error:data.error||''};
  }
  window.addEventListener('message',async event=>{
    if(!originOk(event.origin))return;
    const msg=event.data||{};
    if(msg.type!=='xb-print-bridge-request'||!msg.id)return;
    try{
      const result=await call(msg);
      event.source&&event.source.postMessage({type:'xb-print-bridge-response',id:msg.id,...result},event.origin);
    }catch(error){
      event.source&&event.source.postMessage({type:'xb-print-bridge-response',id:msg.id,ok:false,status:0,data:{},error:String(error&&error.message||error)},event.origin);
    }
  });
  parent.postMessage({type:'xb-print-bridge-ready',version:${JSON.stringify(version)}},'*');
})();
<\/script></body></html>`;
  }
  function requestHandler(req,res){
    void (async()=>{
      const url=new URL(req.url||'/','http://'+host+':'+port);
      if(req.method==='OPTIONS'){
        const origin=corsOrigin(req);
        res.writeHead(origin?204:403,{
          ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),
          'Access-Control-Allow-Headers':'Content-Type, X-XB-Print-Token',
          'Access-Control-Allow-Private-Network':'true',
          'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'600'
        });res.end();return;
      }
      if(req.method==='GET'&&url.pathname==='/'){
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(homeHtml());return;
      }
      if(req.method==='GET'&&url.pathname==='/bridge'){
        res.writeHead(200,{
          'Content-Type':'text/html; charset=utf-8',
          'Cache-Control':'no-store',
          'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'"
        });
        res.end(bridgeHtml());return;
      }
      if(req.method==='GET'&&url.pathname==='/health'){send(req,res,200,{...getSnapshot(),pairingRequired:true});return}
      if(req.method==='POST'&&url.pathname==='/pair'){
        try{
          const body=await readBody(req);
          if(String(body.code||'')!==pairingCode){send(req,res,403,{ok:false,error:'Codigo de pareamento invalido.'});return}
          config.lastPairedAt=iso();writeJson(configPath,config);rotatePairingCode();send(req,res,200,{ok:true,token:config.token,version,lastPairedAt:config.lastPairedAt});
          log('info','Novo pareamento autorizado',{origin:req.headers.origin||''});
        }catch(error){send(req,res,400,{ok:false,error:error.message})}
        return;
      }
      if(!authorized(req)){send(req,res,401,{ok:false,error:'Agente nao pareado ou token invalido.'});return}
      if(req.method==='GET'&&url.pathname==='/printers'){
        try{send(req,res,200,{ok:true,printers:await listPrinters()})}catch(error){send(req,res,503,{ok:false,error:error.message,printers:[]})}return;
      }
      if(req.method==='GET'&&url.pathname==='/jobs'){
        send(req,res,200,{ok:true,jobs:getJobs(url.searchParams.get('limit')),queue:queueSummary()});return;
      }
      if(req.method==='POST'&&url.pathname==='/jobs'){
        try{
          const body=await readBody(req),result=enqueueJob(body);
          send(req,res,result.deduplicated?200:202,{ok:true,jobId:result.job.id,status:result.job.status,deduplicated:result.deduplicated});
        }catch(error){send(req,res,400,{ok:false,error:error.message})}return;
      }
      const retry=url.pathname.match(/^\/jobs\/([A-Za-z0-9._:-]{1,96})\/retry$/);
      if(req.method==='POST'&&retry){
        try{const job=retryJob(retry[1]);send(req,res,200,{ok:true,jobId:job.id,status:job.status})}
        catch(error){send(req,res,404,{ok:false,error:error.message})}return;
      }
      send(req,res,404,{ok:false,error:'Rota nao encontrada.'});
    })().catch(error=>{log('error','Falha inesperada na API',{error:String(error.message||error)});if(!res.headersSent)send(req,res,500,{ok:false,error:'Falha interna do agente.'});else res.end()});
  }
  async function start(){
    if(server)return getSnapshot();
    server=http.createServer(requestHandler);
    await new Promise((resolve,reject)=>{
      const onError=error=>{server?.off('listening',onListening);server=null;reject(error)};
      const onListening=()=>{server?.off('error',onError);resolve()};
      server.once('error',onError);server.once('listening',onListening);server.listen(port,host);
    });
    startedAt=iso();timer=setInterval(()=>void processQueue(),800);timer.unref?.();
    log('info','Agente iniciado',{host,port,version});void processQueue();return getSnapshot();
  }
  async function stop(){
    if(timer){clearInterval(timer);timer=null}
    if(!server)return;
    const current=server;server=null;
    await new Promise(resolve=>current.close(()=>resolve()));
    log('info','Agente encerrado',{version});
  }

  return {start,stop,getSnapshot,listPrinters,getPrinterDiagnostics,getJobs,retryJob,createTestJob,recentLogs,queueSummary,getLastJob,enqueueJob,getPairingCode:()=>pairingCode,dataDir,logPath,version};
}

async function runStandalone(){
  const agent=createPrintAgent();
  await agent.start();
  const snapshot=agent.getSnapshot();
  console.log('');
  console.log('X Burguer Print Agent '+snapshot.version);
  console.log('Agente local: http://'+snapshot.host+':'+snapshot.port);
  console.log('Codigo de pareamento: '+snapshot.pairingCode);
  console.log('');
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  runStandalone().catch(error=>{console.error(error);process.exitCode=1});
}
