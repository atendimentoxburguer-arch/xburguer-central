/* X Burguer Central V16 — bootstrap da aplicação */
function enhanceTables(){document.querySelectorAll('.page.active .table:not([data-enhanced])').forEach(table=>{table.dataset.enhanced='1';if(table.parentElement?.classList.contains('table-shell'))return;const wrap=document.createElement('div');wrap.className='table-shell';table.parentNode.insertBefore(wrap,table);wrap.appendChild(table)})}
function renderPage(id){
 const renderer={pedidos:renderPedidos,pdv:()=>renderPdv(),salao:renderSalao,cardapio:renderCardapio,entregas:renderEntregas,performance:renderPerformance,kds:renderKds,clientes:renderClientes,marketing:renderMarketing,atendimento:renderAtendimento,caixa:renderCaixa,estoque:renderEstoque,financeiro:renderFinanceiro,equipe:renderEquipe,config:renderConfig}[id];
 if(!renderer)return;
 try{renderer();enhanceTables()}
 catch(error){
  console.error('Falha ao renderizar página',id,error);
  const target=document.getElementById(id);
  if(target)target.innerHTML=`<div class="page-head"><div><h1>Não foi possível abrir esta área</h1><p>Ocorreu uma falha de interface. Seus dados locais foram preservados.</p></div><button class="btn btn-primary" onclick="renderPage('${id}')">${icon('arrow-clockwise')}<span>Tentar novamente</span></button></div><div class="card error-state"><b>Detalhes técnicos</b><p>${esc(error?.message||'Erro desconhecido')}</p></div>`;
 }
}
function renderAll(){syncTables();setHeader();renderPage(currentPage)}
function updateConnectionStatus(){const el=document.getElementById('connectionStatus');if(!el)return;const online=navigator.onLine;el.classList.toggle('is-offline',!online);el.innerHTML=`<i class="bi ${online?'bi-cloud-check':'bi-cloud-slash'}" aria-hidden="true"></i> ${online?'Dados locais':'Sem internet'}`;el.title=online?'Aplicação disponível; dados continuam locais neste navegador.':'Sem internet; funções locais continuam disponíveis.'}
function filterNavigation(query=''){const q=query.trim().toLowerCase();document.querySelectorAll('.nav button').forEach(btn=>btn.classList.toggle('is-filtered-out',!!q&&!btn.textContent.toLowerCase().includes(q)))}
const sideSearch=document.getElementById('sideSearch');
sideSearch?.addEventListener('input',e=>filterNavigation(e.target.value));
sideSearch?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const hit=[...document.querySelectorAll('.nav button:not(.is-filtered-out)')][0];if(hit){go(hit.dataset.page);e.target.value='';filterNavigation('')}});
window.addEventListener('online',updateConnectionStatus);window.addEventListener('offline',updateConnectionStatus);
window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(document.getElementById(id))go(id,{historyMode:'none'})});
document.addEventListener('keydown',event=>{const tag=document.activeElement?.tagName?.toLowerCase(),typing=['input','textarea','select'].includes(tag);if(event.key==='Escape'){if(document.getElementById('modal')?.classList.contains('open'))closeModal(null);else toggleSide(false)}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();sideSearch?.focus();sideSearch?.select()}if(!typing&&event.key==='/'){event.preventDefault();sideSearch?.focus()}});
let shownGlobalError=false;
function reportGlobalError(error){console.error('Erro de interface:',error);if(!shownGlobalError){shownGlobalError=true;toast('Ocorreu um erro inesperado. A área afetada pode ser recarregada sem perder os dados locais.','error')}}
window.addEventListener('error',event=>reportGlobalError(event.error||event.message));
window.addEventListener('unhandledrejection',event=>reportGlobalError(event.reason));
initThemeUI();load();const initial=location.hash.slice(1);if(initial&&document.getElementById(initial))currentPage=initial;syncTables();setHeader();go(currentPage,{historyMode:'replace'});updateConnectionStatus();
