/* Cliente do agente local de impressão */
(function(){
  'use strict';

  const DEFAULT_AGENT_URL='http://127.0.0.1:17871';
  let agentHealth={online:false,authorized:false,version:'',queue:null,error:'',permission:'unknown',checkedAt:''};
  let physicalPrinters=[];
  let flushBusy=false;

  function agentConfig(){
    const printing=state.settings.printing;
    if(!printing.agent)printing.agent={enabled:true,url:DEFAULT_AGENT_URL,token:'',pairedAt:'',fallbackBrowser:false,lastSeen:'',lastVersion:''};
    return printing.agent;
  }
  function agentBase(){
    const raw=String(agentConfig().url||DEFAULT_AGENT_URL).trim().replace(/\/+$/,'');
    return /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(raw)?raw:DEFAULT_AGENT_URL;
  }
  async function localNetworkPermission(){
    if(!globalThis.navigator?.permissions?.query)return 'unsupported';
    for(const name of ['loopback-network','local-network-access','local-network']){
      try{
        const result=await navigator.permissions.query({name});
        if(result?.state)return result.state;
      }catch{}
    }
    return 'unsupported';
  }
  function localNetworkBlockedMessage(){
    return 'O navegador bloqueou o acesso ao aplicativo local. Abra as permissões deste site, permita “Rede local”/“Loopback” e tente novamente.';
  }
  async function showLocalNetworkHelp(){
    const permission=await localNetworkPermission();
    const blocked=permission==='denied';
    openModal('<div class="modal-head"><div><h2>Permissão para impressão local</h2><p class="dialog-subtitle">O X Burguer Central precisa acessar o Print Agent neste computador.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div><div class="print-agent-help">'+
      '<b>1.</b><span>Confirme que o <strong>X Burguer Print Agent</strong> está aberto e mostra “Agente online”.</span>'+
      '<b>2.</b><span>No navegador, abra as permissões do site e deixe <strong>Rede local / Loopback</strong> como <strong>Permitir</strong>.</span>'+
      '<b>3.</b><span>Depois clique em <strong>Testar conexão</strong>. O navegador pode exibir um pedido de permissão.</span>'+
      '<b>4.</b><span>Quando o agente for encontrado, informe o código de 6 dígitos mostrado no aplicativo.</span>'+
      '</div>'+(blocked?'<div class="notice">'+icon('shield-exclamation')+'<div><b>Acesso local está bloqueado</b><span>Altere a permissão do site para permitir acesso à rede local e recarregue a página.</span></div></div>':'')+
      '<div class="modal-foot"><button class="btn btn-outline" onclick="openLocalPrintAgentPage()">'+icon('box-arrow-up-right')+'<span>Abrir agente local</span></button><button class="btn btn-primary" onclick="closeModal();probePrintAgent({silent:false,userInitiated:true})">'+icon('wifi')+'<span>Testar conexão</span></button></div>');
  }
  async function agentRequest(path,{method='GET',body=null,auth=true,timeout=3500}={}){
    const cfg=agentConfig(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const headers={'Accept':'application/json'};
      if(body!==null)headers['Content-Type']='application/json';
      if(auth&&cfg.token)headers['X-XB-Print-Token']=cfg.token;
      const response=await fetch(agentBase()+path,{method,headers,body:body===null?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',targetAddressSpace:'loopback'});
      let data={};try{data=await response.json()}catch{}
      if(!response.ok)throw new Error(data.error||('Agente respondeu HTTP '+response.status));
      return data;
    }finally{clearTimeout(timer)}
  }
  function setHealth(next){
    agentHealth={...agentHealth,...next,checkedAt:new Date().toISOString()};
    const cfg=agentConfig();
    if(agentHealth.online){cfg.lastSeen=agentHealth.checkedAt;if(agentHealth.version)cfg.lastVersion=agentHealth.version}
    try{save({render:false})}catch{}
    refreshAgentStatusCard();
  }
  async function probePrintAgent({silent=true,userInitiated=false}={}){
    if(!agentConfig().enabled){setHealth({online:false,authorized:false,error:'Agente desativado',permission:'unknown'});return agentHealth}
    const permission=await localNetworkPermission();
    if(permission==='denied'){
      setHealth({online:false,authorized:false,version:'',queue:null,error:localNetworkBlockedMessage(),permission});
      if(!silent)showLocalNetworkHelp();
      return agentHealth;
    }
    if(permission==='prompt'&&!userInitiated){
      setHealth({online:false,authorized:false,version:'',queue:null,error:'Permissão de acesso local necessária.',permission});
      return agentHealth;
    }
    try{
      const health=await agentRequest('/health',{auth:false,timeout:3200});
      let authorized=false,queue=health.queue||null,error='';
      if(agentConfig().token){
        try{
          const protectedStatus=await agentRequest('/jobs?limit=1',{timeout:2600});
          authorized=true;queue=protectedStatus.queue||queue;
        }catch(authError){error=authError.message}
      }
      setHealth({online:true,authorized,version:health.version||'',queue,error,permission:permission==='unsupported'?'unknown':'granted'});
      if(!silent&&!authorized)toast('Agente encontrado. Falta concluir o pareamento.','info');
    }catch(error){
      const afterPermission=await localNetworkPermission();
      const blocked=afterPermission==='denied';
      const message=blocked?localNetworkBlockedMessage():(error.name==='AbortError'?'Agente não respondeu na porta 17871.':String(error.message||error));
      setHealth({online:false,authorized:false,version:'',queue:null,error:message,permission:afterPermission});
      if(!silent){
        if(blocked)showLocalNetworkHelp();
        else toast('Não foi possível alcançar o Print Agent. Confirme que o aplicativo está aberto.','warning');
      }
    }
    return agentHealth;
  }
  async function pairPrintAgent(){
    const online=await probePrintAgent({silent:true,userInitiated:true});
    if(!online.online){
      if(online.permission==='denied'||online.permission==='prompt'){showLocalNetworkHelp();return false}
      openModal('<div class="modal-head"><div><h2>Print Agent não encontrado</h2><p class="dialog-subtitle">O sistema não conseguiu acessar o aplicativo local na porta 17871.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div><div class="print-agent-help"><b>1.</b><span>Abra o <strong>X Burguer Print Agent</strong> e confirme que aparece <strong>Agente online</strong>.</span><b>2.</b><span>Clique em <strong>Abrir agente local</strong>. Se a página local abrir, o aplicativo está funcionando.</span><b>3.</b><span>Se a página não abrir, reinicie o Print Agent. Se aparecer erro da porta 17871, feche versões antigas ou reinicie o Windows.</span></div><div class="modal-foot"><button class="btn btn-outline" onclick="openPrintAgentDownload()">'+icon('download')+'<span>Baixar aplicativo</span></button><button class="btn btn-outline" onclick="openLocalPrintAgentPage()">'+icon('box-arrow-up-right')+'<span>Abrir agente local</span></button><button class="btn btn-primary" onclick="closeModal();pairPrintAgent()">'+icon('arrow-repeat')+'<span>Tentar novamente</span></button></div>');
      return false;
    }
    const v=await formDialog({title:'Parear agente local',subtitle:'Informe o código de 6 dígitos exibido pelo X Burguer Print Agent.',fields:[{key:'code',label:'Código de pareamento',placeholder:'000000',required:true}]});
    if(!v)return false;
    const code=String(v.code||'').replace(/\D/g,'').slice(0,6);
    if(code.length!==6){toast('Informe os 6 dígitos do código.','warning');return false}
    try{
      const result=await agentRequest('/pair',{method:'POST',body:{code},auth:false,timeout:4000});
      const cfg=agentConfig();cfg.token=String(result.token||'');cfg.pairedAt=new Date().toISOString();cfg.lastVersion=result.version||'';save({render:false});
      await probePrintAgent({silent:true});
      toast('Agente de impressão conectado.','success');
      globalThis.printerCenter?.();
      return true;
    }catch(error){toast('Não foi possível parear: '+String(error.message||error),'error');return false}
  }
  async function unpairPrintAgent(){
    const ok=await confirmDialog('Desconectar agente','Remover a autorização deste navegador? O agente continuará instalado no computador.',{confirmLabel:'Desconectar',danger:true});
    if(!ok)return;
    const cfg=agentConfig();cfg.token='';cfg.pairedAt='';cfg.lastSeen='';agentHealth={online:false,authorized:false,version:'',queue:null,error:'',permission:'unknown',checkedAt:''};save({render:false});globalThis.printerCenter?.();
  }
  function openLocalPrintAgentPage(){window.open(agentBase()+'/','_blank','noopener,noreferrer')}
  function openPrintAgentDownload(){window.open('https://github.com/atendimentoxburguer-arch/xburguer-central/releases/latest','_blank','noopener,noreferrer')}
  async function fetchPhysicalPrinters({silent=false}={}){
    if(!agentConfig().token){toast('Pareie o agente antes de buscar impressoras.','warning');return []}
    try{
      const data=await agentRequest('/printers',{timeout:7000});
      physicalPrinters=Array.isArray(data.printers)?data.printers:[];
      setHealth({online:true,authorized:true,error:'',version:agentHealth.version});
      return physicalPrinters;
    }catch(error){physicalPrinters=[];setHealth({online:false,authorized:false,error:String(error.message||error)});if(!silent)toast('Não foi possível listar as impressoras: '+String(error.message||error),'error');return []}
  }
  async function mapPrinterDevice(profileId){
    const profile=(state.settings.printing.profiles||[]).find(p=>p.id===profileId);if(!profile)return;
    if(profile.paper==='a4'){toast('O aplicativo de impressão silenciosa é destinado a térmicas 58/80 mm. Para A4 use o modo do navegador.','warning');return}
    if(!agentConfig().token){const paired=await pairPrintAgent();if(!paired)return}
    const printers=await fetchPhysicalPrinters();if(!printers.length){toast('Nenhuma impressora instalada foi encontrada pelo agente.','warning');return}
    const options=[{value:'',label:'Sem impressora física'}].concat(printers.map(p=>({value:p.name,label:p.name+(p.offline?' — Offline':'')})));
    const v=await formDialog({title:'Mapear impressora física',subtitle:profile.name,fields:[{key:'device',label:'Impressora do Windows',type:'select',value:profile.deviceName||'',options}]});
    if(!v)return;
    profile.deviceName=v.device||'';save({render:false});globalThis.printerCenter?.();toast(profile.deviceName?'Impressora física vinculada.':'Mapeamento removido.','success');
  }

  function agentJob(profile,document,event='manual'){
    const automatic=event!=='manual'&&event!=='test';
    const station=profile.station||'all';
    return {
      id:uid('pj'),
      dedupeKey:automatic?[document.id,profile.id,event,station].join(':'):'',
      profileId:profile.id,
      printerName:profile.deviceName,
      purpose:profile.purpose,
      station,
      event,
      paper:profile.paper,
      copies:profile.copies,
      document,
      profile:{paper:profile.paper,copies:profile.copies,strongText:state.settings.printing.strongText!==false}
    };
  }
  function pushOutbox(job,error=''){
    if(!Array.isArray(state.printOutbox))state.printOutbox=[];
    if(state.printOutbox.some(x=>x.id===job.id))return;
    state.printOutbox.push({...job,attempts:Number(job.attempts)||0,lastError:String(error||'').slice(0,300),createdAt:job.createdAt||new Date().toISOString()});
    if(state.printOutbox.length>100)state.printOutbox=state.printOutbox.slice(-100);
    save({render:false});
  }
  async function submitAgentJob(job,{queueOnFailure=true,silent=false}={}){
    try{
      const result=await agentRequest('/jobs',{method:'POST',body:job,timeout:4500});
      setHealth({online:true,authorized:true,error:''});
      return {ok:true,result};
    }catch(error){
      if(queueOnFailure)pushOutbox(job,error.message||error);
      setHealth({online:false,authorized:false,error:String(error.message||error)});
      if(!silent)toast(queueOnFailure?'Agente indisponível. Impressão guardada na fila local.':'Falha ao enviar impressão.','warning');
      return {ok:false,error};
    }
  }
  async function sendManagedPrint(profile,document,event='manual',{silent=false}={}){
    if(!profile?.enabled)return false;
    if(profile.paper==='a4')return false;
    if(!profile.deviceName){
      if(!silent)toast('O destino “'+profile.name+'” ainda não possui uma impressora física mapeada.','warning');
      return false;
    }
    if(!agentConfig().enabled||!agentConfig().token){
      const job=agentJob(profile,document,event);pushOutbox(job,'Agente não pareado.');
      if(!silent)toast('Impressão guardada até o agente ser conectado.','warning');
      return false;
    }
    const result=await submitAgentJob(agentJob(profile,document,event),{queueOnFailure:true,silent});
    return result.ok;
  }
  async function flushPrintOutbox(){
    if(flushBusy||!agentConfig().enabled||!agentConfig().token||!state.printOutbox?.length)return;
    flushBusy=true;
    try{
      await probePrintAgent({silent:true});
      if(!agentHealth.online||!agentHealth.authorized)return;
      const pending=[...state.printOutbox].slice(0,8);
      for(const job of pending){
        const result=await submitAgentJob(job,{queueOnFailure:false,silent:true});
        if(result.ok)state.printOutbox=state.printOutbox.filter(x=>x.id!==job.id);
        else{
          const target=state.printOutbox.find(x=>x.id===job.id);
          if(target){target.attempts=(Number(target.attempts)||0)+1;target.lastError=String(result.error?.message||result.error||'').slice(0,300)}
          break;
        }
      }
      save({render:false});
    }finally{flushBusy=false}
  }
  async function getAgentJobs(){
    if(!agentConfig().token)return {jobs:[],queue:null};
    try{return await agentRequest('/jobs?limit=40',{timeout:4000})}catch(error){toast('Não foi possível ler a fila do agente.','warning');return {jobs:[],queue:null}}
  }
  async function retryAgentJob(id){
    try{await agentRequest('/jobs/'+encodeURIComponent(id)+'/retry',{method:'POST',body:{},timeout:3500});toast('Job recolocado na fila.','success');showManagedPrintQueue()}
    catch(error){toast('Não foi possível repetir a impressão.','error')}
  }
  async function showManagedPrintQueue(){
    const data=await getAgentJobs(),local=state.printOutbox||[];
    openModal('<div class="modal-head"><div><h2>Fila de impressão</h2><p class="dialog-subtitle">Jobs do agente local e impressões aguardando conexão.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div><div class="print-queue-summary"><div><span>No agente</span><b>'+Number(data.queue?.queued||0)+'</b></div><div><span>Falhas</span><b>'+Number(data.queue?.failed||0)+'</b></div><div><span>Aguardando conexão</span><b>'+local.length+'</b></div></div><div class="managed-print-jobs">'+(data.jobs||[]).map(j=>'<div class="managed-print-job"><span class="print-job-state '+esc(j.status)+'">'+esc(j.status)+'</span><div><b>#'+esc(j.orderId||j.id)+' • '+esc(j.printerName)+'</b><span>'+esc(j.purpose||'')+(j.lastError?' • '+esc(j.lastError):'')+'</span></div>'+(j.status==='failed'?'<button class="btn btn-outline btn-sm" onclick="retryAgentJob(\''+j.id+'\')">Tentar novamente</button>':'')+'</div>').join('')+(local.map(j=>'<div class="managed-print-job"><span class="print-job-state queued">local</span><div><b>#'+esc(j.document?.id||j.id)+' • '+esc(j.printerName)+'</b><span>Aguardando o agente ficar disponível.</span></div></div>').join('')||'<div class="empty">Nenhum job recente.</div>')+'</div><div class="modal-foot"><button class="btn btn-outline" onclick="flushPrintOutbox();closeModal()">'+icon('arrow-repeat')+'<span>Reenviar pendentes</span></button><button class="btn btn-primary" onclick="closeModal()">Fechar</button></div>');
  }
  function printerDeviceState(name){
    if(!name)return {state:'unmapped',label:'Não mapeada'};
    const printer=physicalPrinters.find(p=>p.name===name);
    if(!printer)return {state:'unknown',label:'Não encontrada no Windows'};
    if(printer.offline)return {state:'offline',label:'Offline'};
    return {state:'online',label:'Online'};
  }
  async function refreshPrinterDeviceBadges(){
    if(!agentConfig().token)return;
    try{
      if(!agentHealth.online||!agentHealth.authorized)await probePrintAgent({silent:true});
      if(!agentHealth.online||!agentHealth.authorized)return;
      await fetchPhysicalPrinters({silent:true});
      document.querySelectorAll('[data-printer-device]').forEach(el=>{
        const info=printerDeviceState(el.dataset.printerDevice||'');
        el.dataset.deviceState=info.state;
        el.textContent=(el.dataset.devicePrefix||'Windows')+': '+(el.dataset.printerDevice||'—')+' • '+info.label;
        el.classList.toggle('device-mapped',info.state==='online');
        el.classList.toggle('device-unmapped',info.state!=='online');
      });
    }catch{}
  }
  function agentStatusCard(){
    const cfg=agentConfig(),needsPermission=agentHealth.permission==='denied'||agentHealth.permission==='prompt';
    const status=!cfg.enabled?'disabled':agentHealth.online&&agentHealth.authorized?'ready':agentHealth.online?'pair':needsPermission?'permission':'offline';
    const label=status==='ready'?'Agente conectado':status==='pair'?'Agente encontrado':status==='permission'?'Permissão local necessária':status==='disabled'?'Agente desativado':'Agente offline';
    const badge=status==='ready'?'b-green':status==='pair'||status==='permission'?'b-orange':'b-gray';
    const detail=status==='ready'
      ?'Versão '+esc(agentHealth.version||cfg.lastVersion||'—')+' • fila '+Number(agentHealth.queue?.queued||0)
      :status==='pair'?'Informe o código de pareamento para liberar a impressão silenciosa.'
      :status==='permission'?'Permita que este site acesse o aplicativo local neste computador.'
      :(agentHealth.error||'Inicie o X Burguer Print Agent neste computador.');
    const action=status==='ready'
      ?'<button class="btn btn-outline btn-sm" onclick="showManagedPrintQueue()">Fila</button><button class="btn btn-outline btn-sm" onclick="unpairPrintAgent()">Desconectar</button>'
      :status==='permission'
        ?'<button class="btn btn-primary btn-sm" onclick="showLocalNetworkHelp()">Liberar acesso</button>'
        :'<button class="btn btn-primary btn-sm" onclick="pairPrintAgent()">Conectar agente</button>';
    return '<div class="print-agent-card" id="printAgentCard"><span class="print-agent-icon">'+icon(status==='ready'?'pc-display-horizontal':status==='permission'?'shield-lock':'printer')+'</span><div><b>'+label+'</b><span>'+esc(detail)+'</span></div><span class="badge '+badge+'">'+(status==='ready'?'Online':status==='pair'?'Parear':status==='permission'?'Permissão':status==='disabled'?'Off':'Offline')+'</span><div class="print-agent-actions">'+action+'<button class="icon-btn" onclick="probePrintAgent({silent:false,userInitiated:true})" title="Verificar agente">'+icon('arrow-clockwise')+'</button></div></div>';
  }
  function refreshAgentStatusCard(){
    const current=document.getElementById('printAgentCard');if(!current)return;
    const wrap=document.createElement('div');wrap.innerHTML=agentStatusCard();current.replaceWith(wrap.firstElementChild);
  }
  function initPrintAgentClient(){
    if(agentConfig().enabled){
      probePrintAgent({silent:true,userInitiated:false}).then(()=>flushPrintOutbox());
      setInterval(()=>{probePrintAgent({silent:true,userInitiated:false});flushPrintOutbox()},15000);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){probePrintAgent({silent:true,userInitiated:false});flushPrintOutbox()}});
    }
  }

  globalThis.agentConfig=agentConfig;
  globalThis.probePrintAgent=probePrintAgent;
  globalThis.pairPrintAgent=pairPrintAgent;
  globalThis.unpairPrintAgent=unpairPrintAgent;
  globalThis.openLocalPrintAgentPage=openLocalPrintAgentPage;
  globalThis.showLocalNetworkHelp=showLocalNetworkHelp;
  globalThis.localNetworkPermission=localNetworkPermission;
  globalThis.openPrintAgentDownload=openPrintAgentDownload;
  globalThis.fetchPhysicalPrinters=fetchPhysicalPrinters;
  globalThis.mapPrinterDevice=mapPrinterDevice;
  globalThis.printerDeviceState=printerDeviceState;
  globalThis.refreshPrinterDeviceBadges=refreshPrinterDeviceBadges;
  globalThis.sendManagedPrint=sendManagedPrint;
  globalThis.flushPrintOutbox=flushPrintOutbox;
  globalThis.showManagedPrintQueue=showManagedPrintQueue;
  globalThis.retryAgentJob=retryAgentJob;
  globalThis.agentStatusCard=agentStatusCard;
  globalThis.initPrintAgentClient=initPrintAgentClient;
})();