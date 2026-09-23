import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderEscPosJob, validateJob } from './lib/agent-core.mjs';

const VERSION='1.0.0';
const HOST='127.0.0.1';
const PORT=17871;
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const dataDir=path.join(process.env.APPDATA||path.join(os.homedir(),'.xburguer-central'),'X Burguer Central','Print Agent');
const configPath=path.join(dataDir,'config.json');
const queuePath=path.join(dataDir,'queue.json');
const logPath=path.join(dataDir,'agent.log.jsonl');
const rawPrintScript=path.join(__dirname,'scripts','raw-print.ps1');
const allowedOrigins=[
  /^https:\/\/atendimentoxburguer-arch\.github\.io$/,
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/
];

fs.mkdirSync(dataDir,{recursive:true});
const readJson=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2),'utf8');
const log=(level,message,extra={})=>{
  const entry={at:new Date().toISOString(),level,message,...extra};
  try{fs.appendFileSync(logPath,JSON.stringify(entry)+'\n','utf8')}catch{}
  console[level==='error'?'error':'log']('[X Burguer Print Agent]',message,extra);
};

let config=readJson(configPath,{token:'',createdAt:new Date().toISOString()});
if(!config.token){config.token=crypto.randomBytes(24).toString('hex');writeJson(configPath,config)}
let pairingCode=String(crypto.randomInt(100000,1000000));
let jobs=readJson(queuePath,[]);
if(!Array.isArray(jobs))jobs=[];
jobs=jobs.slice(-300).map(j=>j.status==='printing'?{...j,status:'queued'}:j);
let processing=false;

function persistQueue(){writeJson(queuePath,jobs.slice(-300))}
function corsOrigin(req){
  const origin=String(req.headers.origin||'');
  return allowedOrigins.some(re=>re.test(origin))?origin:'';
}
function jsonHeaders(req){
  const origin=corsOrigin(req);
  return {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
  };
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
    const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value)};
    const timer=setTimeout(()=>{try{child.kill()}catch{}finish(reject,new Error('Tempo limite do PowerShell excedido.'))},timeout);
    child.stdout.on('data',d=>stdout+=d);
    child.stderr.on('data',d=>stderr+=d);
    child.on('error',err=>finish(reject,err));
    child.on('close',code=>code===0?finish(resolve,stdout):finish(reject,new Error(stderr.trim()||('PowerShell terminou com codigo '+code))));
  });
}
async function listPrinters(){
  const command="$ErrorActionPreference='Stop'; Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus,WorkOffline | ConvertTo-Json -Compress";
  const output=(await runPowerShell(['-Command',command])).trim();
  if(!output)return [];
  const parsed=JSON.parse(output),list=Array.isArray(parsed)?parsed:[parsed];
  return list.map(p=>({
    name:String(p.Name||''),
    driver:String(p.DriverName||''),
    port:String(p.PortName||''),
    status:String(p.PrinterStatus??''),
    offline:Boolean(p.WorkOffline)
  })).filter(p=>p.name);
}
async function spoolRaw(job){
  const buffer=renderEscPosJob(job),temp=path.join(dataDir,'job-'+job.id+'.bin');
  fs.writeFileSync(temp,buffer);
  try{
    for(let copy=0;copy<job.profile.copies;copy++){
      await runPowerShell(['-File',rawPrintScript,'-PrinterName',job.printerName,'-FilePath',temp,'-DocumentName','X Burguer #'+job.document.id],{timeout:20000});
    }
  }finally{try{fs.unlinkSync(temp)}catch{}}
}
function queueSummary(){
  const count=status=>jobs.filter(j=>j.status===status).length;
  return {queued:count('queued')+count('retry'),printing:count('printing'),failed:count('failed'),printed:count('printed')};
}
async function processQueue(){
  if(processing)return;
  const job=jobs.find(j=>['queued','retry'].includes(j.status)&&(!j.nextAttemptAt||new Date(j.nextAttemptAt)<=new Date()));
  if(!job)return;
  processing=true;job.status='printing';job.updatedAt=new Date().toISOString();persistQueue();
  try{
    await spoolRaw(job);
    job.status='printed';job.printedAt=new Date().toISOString();job.updatedAt=job.printedAt;job.lastError='';
    log('info','Job impresso',{jobId:job.id,printer:job.printerName,purpose:job.document.purpose});
  }catch(error){
    job.attempts=(Number(job.attempts)||0)+1;job.lastError=String(error.message||error);job.updatedAt=new Date().toISOString();
    if(job.attempts>=3){job.status='failed';log('error','Job falhou apos tentativas',{jobId:job.id,error:job.lastError})}
    else{job.status='retry';job.nextAttemptAt=new Date(Date.now()+Math.min(30000,2000*Math.pow(2,job.attempts))).toISOString();log('info','Job agendado para nova tentativa',{jobId:job.id,attempts:job.attempts})}
  }finally{persistQueue();processing=false;setTimeout(processQueue,100)}
}
setInterval(processQueue,800).unref();

function homeHtml(){
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>X Burguer Print Agent</title><style>body{font:16px system-ui;margin:40px;max-width:760px;color:#111}code{font-size:28px;font-weight:800;letter-spacing:5px}section{padding:20px;border:1px solid #ddd;border-radius:14px;margin:14px 0}small{color:#666}</style></head><body><h1>X Burguer Print Agent</h1><section><b>Agente ativo</b><p>Versao '+VERSION+' • http://'+HOST+':'+PORT+'</p></section><section><b>Codigo de pareamento</b><p><code>'+pairingCode+'</code></p><small>Digite este codigo no X Burguer Central para autorizar este computador.</small></section><section><b>Dados locais</b><p>'+dataDir+'</p></section></body></html>';
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/','http://'+HOST+':'+PORT);
  if(req.method==='OPTIONS'){
    const origin=corsOrigin(req);
    res.writeHead(origin?204:403,{
      ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),
      'Access-Control-Allow-Headers':'Content-Type, X-XB-Print-Token',
      'Access-Control-Allow-Private-Network':'true',
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Max-Age':'600'
    });res.end();return;
  }
  if(req.method==='GET'&&url.pathname==='/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(homeHtml());return;
  }
  if(req.method==='GET'&&url.pathname==='/health'){
    send(req,res,200,{ok:true,name:'X Burguer Print Agent',version:VERSION,platform:process.platform,pairingRequired:true,queue:queueSummary()});return;
  }
  if(req.method==='POST'&&url.pathname==='/pair'){
    try{
      const body=await readBody(req);
      if(String(body.code||'')!==pairingCode){send(req,res,403,{ok:false,error:'Codigo de pareamento invalido.'});return}
      pairingCode=String(crypto.randomInt(100000,1000000));
      send(req,res,200,{ok:true,token:config.token,version:VERSION});
      log('info','Novo pareamento autorizado',{origin:req.headers.origin||''});
    }catch(error){send(req,res,400,{ok:false,error:error.message})}
    return;
  }
  if(!authorized(req)){send(req,res,401,{ok:false,error:'Agente nao pareado ou token invalido.'});return}
  if(req.method==='GET'&&url.pathname==='/printers'){
    try{send(req,res,200,{ok:true,printers:await listPrinters()})}
    catch(error){send(req,res,503,{ok:false,error:error.message,printers:[]})}
    return;
  }
  if(req.method==='GET'&&url.pathname==='/jobs'){
    const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit'))||30));
    send(req,res,200,{ok:true,jobs:jobs.slice(-limit).reverse().map(j=>({id:j.id,printerName:j.printerName,status:j.status,attempts:j.attempts,createdAt:j.createdAt,updatedAt:j.updatedAt,printedAt:j.printedAt||'',lastError:j.lastError||'',orderId:j.document?.id||'',purpose:j.document?.purpose||''})),queue:queueSummary()});return;
  }
  if(req.method==='POST'&&url.pathname==='/jobs'){
    try{
      const body=await readBody(req),problem=validateJob(body);
      if(problem){send(req,res,400,{ok:false,error:problem});return}
      const existing=jobs.find(j=>j.id===body.id);
      if(existing){send(req,res,200,{ok:true,jobId:existing.id,status:existing.status,deduplicated:true});return}
      const job={...body,status:'queued',attempts:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastError:''};
      jobs.push(job);persistQueue();processQueue();
      send(req,res,202,{ok:true,jobId:job.id,status:'queued'});
    }catch(error){send(req,res,400,{ok:false,error:error.message})}
    return;
  }
  const retry=url.pathname.match(/^\/jobs\/([A-Za-z0-9._:-]{1,96})\/retry$/);
  if(req.method==='POST'&&retry){
    const job=jobs.find(j=>j.id===retry[1]);
    if(!job){send(req,res,404,{ok:false,error:'Job nao encontrado.'});return}
    job.status='queued';job.attempts=0;job.nextAttemptAt='';job.lastError='';job.updatedAt=new Date().toISOString();persistQueue();processQueue();
    send(req,res,200,{ok:true,jobId:job.id,status:job.status});return;
  }
  send(req,res,404,{ok:false,error:'Rota nao encontrada.'});
});

server.listen(PORT,HOST,()=>{
  console.log('');
  console.log('X Burguer Print Agent '+VERSION);
  console.log('Agente local: http://'+HOST+':'+PORT);
  console.log('Codigo de pareamento: '+pairingCode);
  console.log('Abra o endereco acima para visualizar o codigo.');
  console.log('');
  log('info','Agente iniciado',{host:HOST,port:PORT,version:VERSION});
});
