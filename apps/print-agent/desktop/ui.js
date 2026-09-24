const $=id=>document.getElementById(id);
let printers=[],lastSnapshot=null;

function toast(message){
  const el=$('toast');el.textContent=message;el.classList.add('show');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);
}
function time(value){
  if(!value)return '—';
  const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
}
function duration(value){
  if(!value)return '';
  const ms=Date.now()-new Date(value).getTime();
  const min=Math.max(0,Math.floor(ms/60000));
  if(min<60)return min+' min ativo';
  const h=Math.floor(min/60),m=min%60;return h+'h '+m+'min ativo';
}
function text(el,value){if(el)el.textContent=value}
function clear(el){while(el.firstChild)el.removeChild(el.firstChild)}
function cell(value){const td=document.createElement('td');td.textContent=value;return td}

async function loadSnapshot(){
  try{
    const s=await window.xbAgent.snapshot();lastSnapshot=s;
    $('statusCard').classList.toggle('online',Boolean(s.ok));
    text($('statusText'),s.ok?'Agente online':'Agente com problema');
    text($('uptimeText'),duration(s.startedAt));
    text($('pairingCode'),s.pairingCode||'------');const pair=$('pairState');pair.textContent=s.pairedOnce?'Já pareado':'Aguardando pareamento';pair.className='pill '+(s.pairedOnce?'success':'');text($('lastJobText'),s.lastJob?'Último: #'+(s.lastJob.orderId||s.lastJob.id)+' • '+s.lastJob.status:'Nenhum job ainda');
    text($('queuedMetric'),s.queue?.queued||0);text($('printingMetric'),s.queue?.printing||0);
    text($('failedMetric'),s.queue?.failed||0);text($('printedMetric'),s.queue?.printed||0);
  }catch(error){
    $('statusCard').classList.remove('online');text($('statusText'),'Agente indisponível');text($('uptimeText'),String(error.message||error));
  }
}
async function loadSettings(){
  const s=await window.xbAgent.settings();text($('versionText'),'Versão '+s.version+(s.packaged?' • aplicativo instalado':' • desenvolvimento'));if(s.logoUrl)$('brandLogo').src=s.logoUrl;
  $('startupToggle').checked=Boolean(s.startWithWindows);
  $('autoCentralToggle').checked=Boolean(s.openCentralAutomatically);
}
function renderPrinters(list){
  const root=$('printers');clear(root);
  if(!list.length){root.innerHTML='<div class="empty">Nenhuma impressora instalada foi encontrada.</div>';return}
  for(const p of list){
    const row=document.createElement('div');row.className='printer'+(p.offline?' offline':'');
    const dot=document.createElement('span');dot.className='printer-dot';
    const info=document.createElement('div'),name=document.createElement('b'),meta=document.createElement('span');
    name.textContent=p.name;meta.textContent=[p.driver,p.port].filter(Boolean).join(' • ')||'Driver do Windows';
    info.append(name,meta);
    const badge=document.createElement('span');badge.className='badge';badge.textContent=p.offline?'Offline':p.default?'Padrão':'Disponível';
    row.append(dot,info,badge);root.append(row);
  }
}
async function loadPrinters(){
  try{
    printers=await window.xbAgent.printers();renderPrinters(printers);
    if(!printers.length){
      const d=await window.xbAgent.printerDiagnostics();
      const attempts=(d?.attempts||[]).map(x=>x.source+': '+(x.error?'erro':x.count+' encontrada(s)')).join(' • ');
      $('printers').innerHTML='<div class="empty"><b>Nenhuma impressora retornada pelas APIs do Windows.</b><br><span>'+(attempts||'Sem diagnóstico disponível.')+'</span><br><small>Você ainda pode mapear manualmente pelo X Burguer Central usando o nome exato da impressora.</small></div>';
    }
    const select=$('testPrinter'),current=select.value;clear(select);
    if(!printers.length){const o=document.createElement('option');o.value='';o.textContent='Nenhuma impressora';select.append(o)}
    for(const p of printers){const o=document.createElement('option');o.value=p.name;o.textContent=p.name+(p.offline?' — Offline':'');select.append(o)}
    if(printers.some(p=>p.name===current))select.value=current;
  }catch(error){$('printers').innerHTML='<div class="empty">Falha ao consultar impressoras: '+String(error.message||error)+'</div>'}
}
function jobState(status){
  const span=document.createElement('span');span.className='state '+status;span.textContent=status;return span;
}
async function loadJobs(){
  const body=$('jobsBody');clear(body);
  try{
    const jobs=await window.xbAgent.jobs(60);
    if(!jobs.length){body.innerHTML='<tr><td colspan="6"><div class="empty">Nenhum job de impressão registrado.</div></td></tr>';return}
    for(const j of jobs){
      const tr=document.createElement('tr'),statusTd=document.createElement('td');statusTd.append(jobState(j.status));
      tr.append(statusTd,cell(j.orderId||'—'),cell(j.printerName||'—'),cell(j.purpose||'—'),cell(time(j.updatedAt)));
      const action=document.createElement('td');
      if(j.status==='failed'){
        const btn=document.createElement('button');btn.className='btn ghost';btn.textContent='Tentar novamente';
        btn.addEventListener('click',async()=>{try{await window.xbAgent.retry(j.id);toast('Job recolocado na fila.');await refreshData()}catch(e){toast('Falha ao repetir job.')}});
        action.append(btn);
      }
      tr.append(action);body.append(tr);
    }
  }catch(error){body.innerHTML='<tr><td colspan="6"><div class="empty">Falha ao carregar fila.</div></td></tr>'}
}
async function loadLogs(){
  const root=$('logs');clear(root);
  try{
    const logs=await window.xbAgent.logs(40);
    if(!logs.length){root.innerHTML='<div class="empty">Sem eventos registrados.</div>';return}
    for(const l of logs){
      const row=document.createElement('div');row.className='log '+(l.level||'info');
      const when=document.createElement('time');when.textContent=time(l.at);
      const level=document.createElement('span');level.className='level';level.textContent=l.level||'info';
      const msg=document.createElement('span');msg.textContent=l.message+(l.error?' — '+l.error:'');
      row.append(when,level,msg);root.append(row);
    }
  }catch{root.innerHTML='<div class="empty">Não foi possível ler os logs.</div>'}
}
async function refreshData(){await Promise.all([loadSnapshot(),loadPrinters(),loadJobs(),loadLogs()])}

$('refreshBtn').addEventListener('click',refreshData);
$('reloadPrintersBtn').addEventListener('click',loadPrinters);
$('reloadJobsBtn').addEventListener('click',loadJobs);
$('dashboardBtn').addEventListener('click',()=>window.xbAgent.openDashboard());
$('dataBtn').addEventListener('click',()=>window.xbAgent.openData());
$('restartBtn').addEventListener('click',async()=>{
  $('restartBtn').disabled=true;text($('restartBtn'),'Reiniciando...');
  const result=await window.xbAgent.restart();
  $('restartBtn').disabled=false;text($('restartBtn'),'Reiniciar agente');
  toast(result.ok?'Agente reiniciado.':'Falha ao reiniciar: '+result.error);await refreshData();
});
$('startupToggle').addEventListener('change',async event=>{
  const r=await window.xbAgent.setStartup(event.target.checked);event.target.checked=Boolean(r.startWithWindows);
});
$('autoCentralToggle').addEventListener('change',async event=>{
  const r=await window.xbAgent.setAutoOpenCentral(event.target.checked);event.target.checked=Boolean(r.openCentralAutomatically);
  toast(r.openCentralAutomatically?'Central será aberto automaticamente.':'Abertura automática do Central desativada.');
});
$('testBtn').addEventListener('click',async()=>{
  const printer=$('testPrinter').value;if(!printer){toast('Selecione uma impressora.');return}
  $('testBtn').disabled=true;text($('testBtn'),'Enviando...');
  const msg=$('testMessage');msg.hidden=true;msg.classList.remove('error');
  try{
    const result=await window.xbAgent.test({printerName:printer,paper:$('testPaper').value});
    msg.textContent=result.deduplicated?'Teste já estava na fila.':'Teste enviado para a fila.';msg.hidden=false;toast('Teste enviado.');
    await loadJobs();
  }catch(error){msg.textContent='Falha: '+String(error.message||error);msg.classList.add('error');msg.hidden=false}
  finally{$('testBtn').disabled=false;text($('testBtn'),'Imprimir teste')}
});
$('updateBtn').addEventListener('click',async()=>{
  const msg=$('updateStatus');msg.hidden=false;msg.classList.remove('error');msg.textContent='Verificando...';
  const result=await window.xbAgent.checkUpdate();
  if(!result.ok){msg.textContent='Não foi possível verificar atualizações: '+result.error;msg.classList.add('error');return}
  if(result.available){
    msg.textContent='Nova versão '+result.latest+' disponível. Clique aqui para abrir o release.';
    msg.style.cursor='pointer';msg.onclick=()=>window.xbAgent.openExternal(result.url);
  }else{msg.textContent=result.message||'Você está na versão mais recente.'}
});
window.xbAgent.onChanged(()=>refreshData());

loadSettings().then(refreshData);
setInterval(()=>{loadSnapshot();loadJobs()},4000);
