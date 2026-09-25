/* Pedidos — ciclo operacional e histórico */
let orderViewV21='active';

function orderStatusMetaV21(status){
 const map={
  analysis:{label:'Em análise',badge:'b-orange'},
  production:{label:'Em produção',badge:'b-orange'},
  ready:{label:'Pronto',badge:'b-green'},
  done:{label:'Concluído',badge:'b-green'},
  cancelled:{label:'Cancelado',badge:'b-red'}
 };
 return map[status]||{label:'Pedido',badge:'b-gray'};
}
function orderDateV21(value){
 if(!value)return '—';
 const d=new Date(value);
 return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
}
function advanceOrder(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 if(['done','cancelled'].includes(o.status)){toast('Este pedido já está encerrado.','warning');return}
 let printEvent='';
 if(o.status==='analysis'){o.status='production';printEvent='production'}
 else if(o.status==='production'){o.status='ready';printEvent='ready'}
 else if(o.status==='ready'){
  if(o.type!=='Delivery'){openOrderCheckoutV22(id);return}
  if(o.type==='Delivery'&&!o.courier){toast('Atribua um entregador antes de finalizar a entrega.','warning');return}
  o.status='done';o.completedAt=new Date().toISOString();printEvent='completed';
  if(o.courier&&!o.deliveryCounted){const d=state.couriers.find(d=>d.id===o.courier);if(d)d.deliveries=(Number(d.deliveries)||0)+1;o.deliveryCounted=true}
 }
 syncTables();save();
 if(printEvent)globalThis.dispatchAutoPrintEvent?.(printEvent,o);
 toast('Pedido atualizado.','success');
}
async function cancelOrder(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 if(o.status==='done'){toast('Pedido concluído não pode ser cancelado. Preserve o histórico financeiro.','warning');return}
 if(o.status==='cancelled'){toast('Este pedido já está cancelado.','warning');return}
 if((o.settlements||[]).length){toast('Este pedido possui pagamentos registrados. Estorne os recebimentos antes de cancelar.','warning');return}
 const v=await formDialog({
  title:'Cancelar pedido #'+id,
  subtitle:'O estoque dos itens será devolvido. O pedido continuará no histórico até ser excluído manualmente.',
  submitLabel:'Cancelar pedido',danger:true,
  fields:[{key:'reason',label:'Motivo do cancelamento',type:'textarea',required:true,full:true,placeholder:'Ex.: cliente desistiu, pedido duplicado, erro no lançamento'}]
 });
 if(!v)return;
 const reason=String(v.reason||'').trim().slice(0,240);
 if(!reason){toast('Informe o motivo do cancelamento.','warning');return}
 if(!o.stockRestored){
  o.items.forEach(i=>{
   const p=product(i.p);
   if(p&&Number.isFinite(p.stock)){
    const qty=Number(i.q)||0;
    p.stock+=qty;
    p.sold=Boolean(p.manualSold||p.stock<=0);
    recordStockMovement(p.id,qty,'Cancelamento de pedido',o.id);
   }
  });
  o.stockRestored=true;
 }
 o.status='cancelled';
 o.cancelReason=reason;
 o.cancelledAt=new Date().toISOString();
 syncTables();save();
 toast('Pedido cancelado e estoque restaurado.','warning');
}
async function deleteOrderV21(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 if(o.status!=='cancelled'){
  toast('Para proteger caixa e estoque, somente pedidos cancelados podem ser excluídos.','warning');
  return;
 }
 const ok=await confirmDialog(
  'Excluir pedido definitivamente',
  'Excluir o pedido #'+id+' do histórico? Esta ação não poderá ser desfeita.',
  {confirmLabel:'Excluir definitivamente',danger:true}
 );
 if(!ok)return;
 state.orders=state.orders.filter(x=>x.id!==id);
 state.printOutbox=(state.printOutbox||[]).filter(j=>String(j.document?.id||'')!==String(id));
 syncTables();closeModal();save();
 toast('Pedido excluído definitivamente.','success');
}
function saveOrderNotesV21(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 const field=document.getElementById('detailNotes');
 if(field)o.notes=String(field.value||'').slice(0,600);
 closeModal();save();toast('Observações atualizadas.','success');
}
function detailsOrder(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 const subtotal=orderSubtotal(o),fees=orderFeeTotal(o),status=orderStatusMetaV21(o.status);
 const feeLabel=o.type==='Delivery'?'Taxa de entrega':o.type==='Mesa'?'Serviço ('+Number((o.serviceFeePct??state.settings.serviceFee)||0)+'%)':'Taxas';
 const ended=o.status==='done'?'<div class="order-detail-alert success">'+icon('check-circle')+'<div><b>Pedido concluído</b><span>'+orderDateV21(o.completedAt)+'</span></div></div>':
  o.status==='cancelled'?'<div class="order-detail-alert danger">'+icon('x-circle')+'<div><b>Pedido cancelado</b><span>'+esc(o.cancelReason||'Sem motivo registrado')+' • '+orderDateV21(o.cancelledAt)+'</span></div></div>':'';
 const active=!['done','cancelled'].includes(o.status);
 openModal(`<div class="modal-head"><div><h2>Pedido #${esc(o.id)}</h2><div class="muted order-meta"><span class="type-badge sm">${typeIcon(o.type)}<span>${esc(o.type)}</span></span><span class="badge ${status.badge}">${status.label}</span><span class="meta-sep">•</span><span>${icon('clock')} ${orderTime(o)}</span></div></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div>
 ${ended}
 <div class="form2"><div class="card"><b>Cliente</b><p>${esc(o.customer)}<br><span class="muted">${esc(o.phone||'Sem telefone')}</span></p><b>Entrega/Mesa</b><p>${esc(o.address||o.table||'Balcão')}</p><b>Pagamento</b><p>${esc(orderPaymentLabel(o))}</p></div><div class="card"><b>Itens</b><p>${orderItemsText(o)}</p><div class="order-summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div>${fees?'<div><span>'+esc(feeLabel)+'</span><b>'+money(fees)+'</b></div>':''}${Number(o.discount)>0?'<div><span>Desconto</span><b>− '+money(o.discount)+'</b></div>':''}${Number(o.surcharge)>0?'<div><span>Acréscimo</span><b>+ '+money(o.surcharge)+'</b></div>':''}<div class="order-summary-total"><span>Total</span><b>${money(orderTotal(o))}</b></div></div></div></div>
 <div class="field"><label>Observações</label><textarea id="detailNotes" ${active?'':'readonly'}>${esc(o.notes||'')}</textarea></div>
 <div class="modal-foot order-detail-actions">
  <button class="btn btn-outline" onclick="printOrderMenu('${o.id}')">${icon('printer')}<span>Imprimir</span></button>
  ${active?'<button class="btn btn-danger" onclick="cancelOrder(\''+o.id+'\')">'+icon('x-circle')+'<span>Cancelar</span></button><button class="btn btn-outline" onclick="oEdit(\''+o.id+'\')">'+icon('pencil')+'<span>Editar pedido</span></button>'+(o.status==='ready'&&o.type!=='Delivery'?'<button class="btn btn-green" onclick="closeModal();openOrderCheckoutV22(\''+o.id+'\')">'+icon('cash-coin')+'<span>Fechar conta</span></button>':'')+'<button class="btn btn-primary" onclick="saveOrderNotesV21(\''+o.id+'\')">Salvar</button>':''}
  ${o.status==='cancelled'?'<button class="btn btn-danger" onclick="deleteOrderV21(\''+o.id+'\')">'+icon('trash')+'<span>Excluir definitivamente</span></button>':''}
  ${o.status==='done'?'<button class="btn btn-primary" onclick="closeModal()">Fechar</button>':''}
 </div>`);
}
function oEdit(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 if(['done','cancelled'].includes(o.status)){toast('Pedidos encerrados não podem ser editados.','warning');return}
 closeModal();
 pdvCart=o.items.map(i=>({...i}));
 pdvType=o.type||'Balcão';
 pdvDraftTable=o.table||'';
 go('pdv');renderPdv(o);
}
function setOrderViewV21(view){
 orderViewV21=['active','done','cancelled'].includes(view)?view:'active';
 renderPedidos();
}
function setOrderFilterV16(filter){
 orderFilter=filter;
 document.querySelectorAll('#pedidos [data-order-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.orderFilter===filter));
 filterOrderCardsV16();
}
function filterOrderCardsV16(){
 const input=document.getElementById('orderSearchInput');
 if(input)orderSearch=input.value;
 const q=String(orderSearch||'').trim().toLowerCase();
 const records=[...document.querySelectorAll('#pedidos [data-order-search]')];
 records.forEach(card=>{
  const typeOk=orderFilter==='all'||(orderFilter==='delivery'?card.dataset.type==='Delivery':card.dataset.type!=='Delivery');
  const searchOk=!q||String(card.dataset.orderSearch||'').includes(q);
  card.hidden=!(typeOk&&searchOk);
 });
 document.querySelectorAll('#pedidos .order-col').forEach(col=>{
  const visible=[...col.querySelectorAll('[data-order-search]')].filter(card=>!card.hidden).length;
  const count=col.querySelector('[data-visible-count]');if(count)count.textContent=visible;
  const empty=col.querySelector('.filter-empty');if(empty)empty.hidden=visible!==0;
 });
 const historyEmpty=document.getElementById('orderHistoryEmpty');
 if(historyEmpty)historyEmpty.hidden=records.some(card=>!card.hidden);
}
function renderPedidos(){
 const root=document.getElementById('pedidos'),statuses=['analysis','production','ready'];
 const active=state.orders.filter(o=>!['done','cancelled'].includes(o.status));
 const done=state.orders.filter(o=>o.status==='done');
 const cancelled=state.orders.filter(o=>o.status==='cancelled');
 const historyList=(orderViewV21==='done'?done:cancelled).slice().sort((a,b)=>new Date(b.completedAt||b.cancelledAt||b.createdAt)-new Date(a.completedAt||a.cancelledAt||a.createdAt));
 const body=orderViewV21==='active'
  ?`<div class="orders-board">
    ${statuses.map(st=>{const list=active.filter(o=>o.status===st),cls=st==='analysis'?'analysis':st==='production'?'production':'ready',title=st==='analysis'?'Em análise':st==='production'?'Em produção':'Prontos para entrega';return `<div class="order-col ${cls}"><div class="col-head"><span>${title}</span><span data-visible-count>${list.length}</span></div><div class="col-body">${list.map(orderCard).join('')}<div class="empty filter-empty" hidden>Nenhum pedido corresponde aos filtros.</div></div></div>`}).join('')}
   </div>`
  :renderOrderHistoryV21(historyList);
 root.innerHTML=`<div class="page-head"><div><h1>Pedidos</h1><p>Da entrada à entrega. Acompanhe cada etapa sem perder o ritmo.</p></div><div class="page-head-actions"><button class="btn btn-outline" onclick="orderPreferences()">${icon('sliders2')} Preferências</button><button class="btn btn-primary" onclick="go('pdv')">${icon('plus-lg')}<span>Novo pedido</span></button></div></div>
 <div class="orders-overview"><span>${icon('circle-fill')} Caixa ${state.cash.open?'aberto':'fechado'}</span><button onclick="go('caixa')">Ver caixa ${icon('arrow-up-right')}</button><span>${active.length} pedidos em andamento</span><span>${active.filter(o=>o.status==='production'&&orderAge(o)>35).length} com atraso</span></div>
 <div class="orders-view-tabs">
  <button class="${orderViewV21==='active'?'active':''}" onclick="setOrderViewV21('active')">Ativos <span>${active.length}</span></button>
  <button class="${orderViewV21==='done'?'active':''}" onclick="setOrderViewV21('done')">Concluídos <span>${done.length}</span></button>
  <button class="${orderViewV21==='cancelled'?'active':''}" onclick="setOrderViewV21('cancelled')">Cancelados <span>${cancelled.length}</span></button>
 </div>
 <div class="toolbar"><div class="toolbar-left"><div class="seg"><button data-order-filter="all" class="${orderFilter==='all'?'active':''}" onclick="setOrderFilterV16('all')">Todos</button><button data-order-filter="delivery" class="${orderFilter==='delivery'?'active':''}" onclick="setOrderFilterV16('delivery')" title="Delivery">${icon('scooter')}<span class="visually-hidden">Delivery</span></button><button data-order-filter="store" class="${orderFilter==='store'?'active':''}" onclick="setOrderFilterV16('store')" title="Loja">${icon('shop')}<span class="visually-hidden">Loja</span></button></div><div class="searchbox"><span class="search-icon">${icon('search')}</span><input id="orderSearchInput" value="${esc(orderSearch)}" oninput="filterOrderCardsV16()" placeholder="Buscar cliente, mesa ou número do pedido"></div></div><div class="toolbar-right"><button class="icon-btn icon-soft" onclick="toggleStore()" title="${state.settings.storeOpen?'Pausar recebimento':'Reabrir recebimento'}">${icon(state.settings.storeOpen?'pause-circle':'play-circle')}</button><button class="icon-btn" onclick="go('config')" aria-label="Configurações">${icon('gear')}</button></div></div>
 ${body}`;
 filterOrderCardsV16();
}
function orderCard(o){
 const late=orderAge(o)>35&&o.status==='production';
 const readyDelivery=o.status==='ready'&&o.type==='Delivery';
 const action=readyDelivery&&!o.courier
  ?`<button class="btn btn-outline btn-sm" onclick="go('entregas')">Definir entregador ${icon('person-plus')}</button>`
  :`<button class="btn ${o.status==='ready'?'btn-green':'btn-blue'} btn-sm" onclick="advanceOrder('${o.id}')">${o.status==='analysis'?'Aceitar pedido':o.status==='production'?'Marcar pronto':'Finalizar pedido'} ${icon('arrow-right-short')}</button>`;
 const search=esc([o.id,o.customer,o.table,o.address].filter(Boolean).join(' ').toLowerCase());
 return `<div class="order-card ${late?'late':''}" data-order-search="${search}" data-type="${esc(o.type)}"><div class="order-head"><span class="type-badge">${typeIcon(o.type)}</span><span class="num">Pedido #${esc(o.id)}</span><time>${icon('clock')} ${orderTime(o)}</time></div>${late?'<div class="order-late">Pedido atrasado</div>':''}<div class="order-info"><div>${esc(o.customer)}</div><div class="order-items-preview">${o.items.slice(0,2).map(i=>`${i.q}× ${esc(product(i.p)?.name||'Item')}`).join(' · ')}${o.items.length>2?` +${o.items.length-2} itens`:``}</div>${o.table?`<div class="order-address"><span class="addr-icon">${icon('table')}</span><span>${esc(o.table)}</span></div>`:''}${o.address?`<div class="order-address"><span class="addr-icon">${icon('geo-alt')}</span><span>${esc(o.address)}</span></div>`:''}<div class="order-row"><span>${esc(orderPaymentLabel(o))}</span><b>${money(orderTotal(o))}</b></div></div><div class="order-actions"><button class="btn btn-outline btn-sm" onclick="detailsOrder('${o.id}')">Ver pedido</button>${action}</div></div>`;
}
function renderOrderHistoryV21(list){
 return `<div class="order-history-list">${list.map(o=>{
  const status=orderStatusMetaV21(o.status);
  const search=esc([o.id,o.customer,o.table,o.address,o.cancelReason].filter(Boolean).join(' ').toLowerCase());
  const endDate=o.status==='done'?o.completedAt:o.cancelledAt;
  return `<article class="order-history-card" data-order-search="${search}" data-type="${esc(o.type)}"><div class="order-history-status"><span class="badge ${status.badge}">${status.label}</span><small>${orderDateV21(endDate)}</small></div><div class="order-history-main"><div><b>Pedido #${esc(o.id)}</b><span>${esc(o.customer)}${o.table?' • '+esc(o.table):''}</span></div><div class="order-history-meta"><span>${typeIcon(o.type)} ${esc(o.type)}</span><span>${esc(orderPaymentLabel(o))}</span>${o.cancelReason?'<span class="cancel-reason">'+icon('info-circle')+' '+esc(o.cancelReason)+'</span>':''}</div></div><strong>${money(orderTotal(o))}</strong><button class="btn btn-outline btn-sm" onclick="detailsOrder('${o.id}')">Gerenciar</button></article>`;
 }).join('')}<div class="empty" id="orderHistoryEmpty" ${list.length?'hidden':''}>Nenhum pedido neste histórico.</div></div>`;
}
async function settingsTimes(){
 const v=await formDialog({title:'Tempos de atendimento',fields:[{key:'counter',label:'Balcão',value:state.settings.counterMin,required:true},{key:'delivery',label:'Delivery',value:state.settings.deliveryMin,required:true}]});
 if(!v)return;
 state.settings.counterMin=v.counter.trim();state.settings.deliveryMin=v.delivery.trim();save();toast('Tempos atualizados.','success');
}

async function orderPreferences(){
 const values=await formDialog({title:'Preferências de pedidos',subtitle:'Prazos exibidos na operação e aceite de novos pedidos.',fields:[
  {key:'counter',label:'Prazo de balcão',value:state.settings.counterMin,required:true},
  {key:'delivery',label:'Prazo de delivery',value:state.settings.deliveryMin,required:true},
  {key:'auto',label:'Aceitar novos pedidos automaticamente',type:'select',value:state.settings.autoAccept?'yes':'no',options:[{value:'no',label:'Não — revisar antes de aceitar'},{value:'yes',label:'Sim — enviar direto para a produção'}],full:true}
 ]});
 if(!values)return;state.settings.counterMin=values.counter.trim();state.settings.deliveryMin=values.delivery.trim();state.settings.autoAccept=values.auto==='yes';save();toast('Preferências atualizadas.','success');
}
