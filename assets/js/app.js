/* X Burguer Central V22 — bootstrap da aplicação */
function enhanceTables(){document.querySelectorAll('.page.active .table:not([data-enhanced])').forEach(table=>{table.dataset.enhanced='1';if(table.parentElement?.classList.contains('table-shell'))return;const wrap=document.createElement('div');wrap.className='table-shell';table.parentNode.insertBefore(wrap,table);wrap.appendChild(table)})}
function renderPage(id){
 updatePageTitle(id);
 const renderer={pedidos:renderPedidos,pdv:()=>renderPdv(),salao:renderSalao,cardapio:renderCardapio,entregas:renderEntregas,performance:renderPerformance,kds:renderKds,clientes:renderClientes,marketing:renderMarketing,atendimento:renderAtendimento,caixa:renderCaixa,estoque:renderEstoque,financeiro:renderFinanceiro,equipe:renderEquipe,relatorios:renderRelatorios,config:renderConfig}[id];
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
function operationalAlerts(){
 const alerts=[];
 const analysis=state.orders.filter(o=>o.status==='analysis').length;
 const late=state.orders.filter(o=>o.status==='production'&&orderAge(o)>35).length;
 const waitingCourier=state.orders.filter(o=>o.type==='Delivery'&&o.status==='ready'&&!o.courier).length;
 const low=state.products.filter(p=>p.stock<=p.min).length;
 const overdue=state.finance.filter(f=>!f.paid&&f.due&&new Date(f.due+'T23:59:59')<new Date()).length;
 if(late)alerts.push({type:'danger',icon:'clock-history',title:late+' pedido(s) atrasado(s)',text:'Há pedidos em produção acima de 35 minutos.',page:'pedidos'});
 if(waitingCourier)alerts.push({type:'warning',icon:'truck',title:waitingCourier+' entrega(s) sem entregador',text:'Pedidos prontos aguardam distribuição.',page:'entregas'});
 if(low)alerts.push({type:'warning',icon:'box-seam',title:low+' item(ns) com estoque baixo',text:'Revise os níveis mínimos do estoque.',page:'estoque'});
 if(overdue)alerts.push({type:'danger',icon:'calendar-x',title:overdue+' conta(s) vencida(s)',text:'Existem lançamentos financeiros pendentes e vencidos.',page:'financeiro'});
 if(analysis)alerts.push({type:'info',icon:'receipt',title:analysis+' pedido(s) aguardando análise',text:'Há novos pedidos aguardando aceite.',page:'pedidos'});
 if(!alerts.length)alerts.push({type:'success',icon:'check-circle',title:'Operação sem alertas críticos',text:'Nenhuma pendência operacional importante foi detectada.',page:'pedidos'});
 return alerts;
}
function showNotifications(){
 const alerts=operationalAlerts();
 openModal(`<div class="modal-head"><div><h2>Central de alertas</h2><p class="dialog-subtitle">Pendências calculadas a partir dos dados locais deste navegador.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div><div class="notification-list">${alerts.map(a=>`<button type="button" class="notification-item ${a.type}" onclick="closeModal();go('${a.page}')"><span class="n-icon">${icon(a.icon)}</span><div><b>${esc(a.title)}</b><span>${esc(a.text)}</span></div><span class="badge ${a.type==='danger'?'b-red':a.type==='warning'?'b-orange':a.type==='success'?'b-green':'b-blue'}">Abrir</span></button>`).join('')}</div>`);
}
function updatePageTitle(id){
 const names={pedidos:'Pedidos',pdv:'PDV',salao:'Salão',cardapio:'Cardápio',entregas:'Entregas',performance:'Desempenho',kds:'Cozinha KDS',clientes:'Clientes',marketing:'Promoções',atendimento:'Atendimento',caixa:'Caixa',estoque:'Estoque',financeiro:'Financeiro',equipe:'Equipe',relatorios:'Relatórios',config:'Configurações'};
 document.title=(names[id]?names[id]+' — ':'')+'X Burguer Central';
}
function filterNavigation(query=''){const q=query.trim().toLowerCase();document.querySelectorAll('.nav button').forEach(btn=>btn.classList.toggle('is-filtered-out',!!q&&!btn.textContent.toLowerCase().includes(q)))}
const sideSearch=document.getElementById('sideSearch');
sideSearch?.addEventListener('input',e=>filterNavigation(e.target.value));
sideSearch?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const hit=[...document.querySelectorAll('.nav button:not(.is-filtered-out)')][0];if(hit){go(hit.dataset.page);e.target.value='';filterNavigation('')}});
window.addEventListener('online',updateConnectionStatus);window.addEventListener('offline',updateConnectionStatus);
document.getElementById('storeToggle')?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleStore()}});

window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(document.getElementById(id))go(id,{historyMode:'none'})});
document.addEventListener('keydown',event=>{const tag=document.activeElement?.tagName?.toLowerCase(),typing=['input','textarea','select'].includes(tag);if(event.key==='Escape'){if(document.getElementById('modal')?.classList.contains('open'))closeModal(null);else toggleSide(false)}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();sideSearch?.focus();sideSearch?.select()}if(!typing&&event.key==='/'){event.preventDefault();sideSearch?.focus()}});
let shownGlobalError=false;
function reportGlobalError(error){console.error('Erro de interface:',error);if(!shownGlobalError){shownGlobalError=true;toast('Ocorreu um erro inesperado. A área afetada pode ser recarregada sem perder os dados locais.','error')}}
window.addEventListener('error',event=>reportGlobalError(event.error||event.message));
window.addEventListener('unhandledrejection',event=>reportGlobalError(event.reason));
initThemeUI();load();globalThis.initPrintAgentClient?.();const initial=location.hash.slice(1);if(initial&&document.getElementById(initial))currentPage=initial;syncTables();setHeader();go(currentPage,{historyMode:'replace'});updateConnectionStatus();
