/* X Burguer Central V16 — pedidos */
function advanceOrder(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 if(o.status==='analysis')o.status='production';
 else if(o.status==='production')o.status='ready';
 else if(o.status==='ready'){if(o.type==='Delivery'&&!o.courier){toast('Atribua um entregador antes de finalizar a entrega.','warning');return}o.status='done';o.completedAt=new Date().toISOString();if(o.courier&&!o.deliveryCounted){const d=state.couriers.find(d=>d.id===o.courier);if(d)d.deliveries=(Number(d.deliveries)||0)+1;o.deliveryCounted=true}}
 syncTables();save();toast('Pedido atualizado.','success');
}
async function cancelOrder(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 const ok=await confirmDialog('Cancelar pedido',`Cancelar o pedido #${id}?`,{confirmLabel:'Cancelar pedido',danger:true});if(!ok)return;
 if(!o.stockRestored){o.items.forEach(i=>{const p=product(i.p);if(p&&Number.isFinite(p.stock)){const qty=Number(i.q)||0;p.stock+=qty;p.sold=Boolean(p.manualSold||p.stock<=0);recordStockMovement(p.id,qty,'Cancelamento de pedido',o.id)}});o.stockRestored=true}
 o.status='cancelled';o.cancelledAt=new Date().toISOString();syncTables();save();toast('Pedido cancelado.','warning');
}
function detailsOrder(id){
 const o=state.orders.find(o=>o.id===id);if(!o)return;
 const subtotal=orderSubtotal(o),fees=orderFeeTotal(o);
 const feeLabel=o.type==='Delivery'?'Taxa de entrega':o.type==='Mesa'?'Serviço ('+Number(state.settings.serviceFee||0)+'%)':'Taxas';
 openModal(`<div class="modal-head"><div><h2>Pedido #${esc(o.id)}</h2><div class="muted order-meta"><span class="type-badge sm">${typeIcon(o.type)}<span>${esc(o.type)}</span></span><span class="meta-sep">•</span><span><i class="bi bi-clock" aria-hidden="true"></i> ${orderTime(o)}</span></div></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div><div class="form2"><div class="card"><b>Cliente</b><p>${esc(o.customer)}<br><span class="muted">${esc(o.phone||'Sem telefone')}</span></p><b>Entrega/Mesa</b><p>${esc(o.address||o.table||'Balcão')}</p></div><div class="card"><b>Itens</b><p>${orderItemsText(o)}</p><div class="order-summary"><div><span>Subtotal</span><b>${money(subtotal)}</b></div>${fees?'<div><span>'+esc(feeLabel)+'</span><b>'+money(fees)+'</b></div>':''}<div class="order-summary-total"><span>Total</span><b>${money(orderTotal(o))}</b></div></div></div></div><div class="field"><label>Observações</label><textarea id="detailNotes">${esc(o.notes||'')}</textarea></div><div class="modal-foot"><button class="btn btn-danger" onclick="closeModal();cancelOrder('${o.id}')">Cancelar pedido</button><button class="btn btn-outline" onclick="oEdit('${o.id}')">Editar</button><button class="btn btn-primary" onclick="document.querySelector('#detailNotes')&&(state.orders.find(o=>o.id==='${o.id}').notes=document.querySelector('#detailNotes').value);closeModal();save()">Salvar</button></div>`);
}
function oEdit(id){closeModal();const o=state.orders.find(x=>x.id===id);pdvCart=o.items.map(i=>({...i}));pdvType=o.type||'Balcão';go('pdv');renderPdv(o)}
function setOrderFilterV16(filter){
 orderFilter=filter;
 document.querySelectorAll('#pedidos [data-order-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.orderFilter===filter));
 filterOrderCardsV16();
}
function filterOrderCardsV16(){
 const input=document.getElementById('orderSearchInput');
 if(input)orderSearch=input.value;
 const q=String(orderSearch||'').trim().toLowerCase();
 document.querySelectorAll('#pedidos .order-col').forEach(col=>{
  const cards=[...col.querySelectorAll('.order-card')];
  let visible=0;
  cards.forEach(card=>{
   const typeOk=orderFilter==='all'||(orderFilter==='delivery'?card.dataset.type==='Delivery':card.dataset.type!=='Delivery');
   const searchOk=!q||card.dataset.search.includes(q);
   card.hidden=!(typeOk&&searchOk);
   if(!card.hidden)visible++;
  });
  const count=col.querySelector('[data-visible-count]');if(count)count.textContent=visible;
  const empty=col.querySelector('.filter-empty');if(empty)empty.hidden=visible!==0;
 });
}
function renderPedidos(){
 const root=document.getElementById('pedidos'),statuses=['analysis','production','ready'];
 const active=state.orders.filter(o=>!['done','cancelled'].includes(o.status));
 root.innerHTML=`<div class="notice"><span class="notice-icon">${icon('info-circle')}</span><span>Caixa ${state.cash.open?'aberto':'fechado'}${state.cash.open?' • saldo em dinheiro '+money(cashDrawerBalance()):''}. <span class="link" onclick="go('caixa')">Abrir frente de caixa</span>.</span><button class="x" onclick="this.parentElement.remove()" aria-label="Fechar aviso">${icon('x-lg')}</button></div>
 <div class="toolbar"><div class="toolbar-left"><div class="seg"><button data-order-filter="all" class="${orderFilter==='all'?'active':''}" onclick="setOrderFilterV16('all')">Todos</button><button data-order-filter="delivery" class="${orderFilter==='delivery'?'active':''}" onclick="setOrderFilterV16('delivery')" title="Delivery">${icon('scooter')}<span class="visually-hidden">Delivery</span></button><button data-order-filter="store" class="${orderFilter==='store'?'active':''}" onclick="setOrderFilterV16('store')" title="Loja">${icon('shop')}<span class="visually-hidden">Loja</span></button></div><div class="searchbox"><span class="search-icon">${icon('search')}</span><input id="orderSearchInput" value="${esc(orderSearch)}" oninput="filterOrderCardsV16()" placeholder="Busque por cliente, mesa ou número do pedido"></div></div><div class="toolbar-right"><button class="btn btn-blue" onclick="go('pdv')">${icon('plus-lg')}<span>Novo pedido</span></button><button class="icon-btn icon-soft" onclick="toggleStore()" title="${state.settings.storeOpen?'Pausar recebimento':'Reabrir recebimento'}">${icon(state.settings.storeOpen?'pause-circle':'play-circle')}</button><button class="icon-btn" onclick="go('config')" aria-label="Configurações">${icon('gear')}</button></div></div>
 <div class="orders-board">
 ${statuses.map(st=>{const list=active.filter(o=>o.status===st),cls=st==='analysis'?'analysis':st==='production'?'production':'ready',title=st==='analysis'?'Em análise':st==='production'?'Em produção':'Prontos para entrega';return `<div class="order-col ${cls}"><div class="col-head"><span>${title}</span><span data-visible-count>${list.length}</span></div><div class="col-body">${st==='analysis'?`<div class="auto-box"><div class="auto-status">${icon('check-circle-fill')}<span>Pedidos atualizados</span></div><div class="auto-section-head"><div><span class="auto-kicker">Configuração rápida</span><strong>Tempos de atendimento</strong></div><button class="auto-edit" onclick="settingsTimes()" type="button">${icon('pencil')}<span>Editar</span></button></div><div class="auto-times"><div class="auto-time-card"><span class="auto-time-icon">${icon('shop-window')}</span><div><small>Balcão</small><strong>${esc(state.settings.counterMin)}</strong></div></div><div class="auto-time-card"><span class="auto-time-icon">${icon('truck')}</span><div><small>Delivery</small><strong>${esc(state.settings.deliveryMin)}</strong></div></div></div><div class="auto-toggle-row"><div class="auto-toggle-copy"><span class="auto-toggle-icon">${icon('lightning-charge')}</span><div><strong>Aceitar automaticamente</strong><small>Novos pedidos entram direto na fila.</small></div></div><span class="toggle ${state.settings.autoAccept?'on':''}" onclick="state.settings.autoAccept=!state.settings.autoAccept;save()" role="switch" aria-label="Aceitar pedidos automaticamente" aria-checked="${state.settings.autoAccept?'true':'false'}"></span></div></div>`:''}${list.map(orderCard).join('')}<div class="empty filter-empty" hidden>Nenhum pedido corresponde aos filtros.</div></div></div>`}).join('')}
 </div>`;
 filterOrderCardsV16();
}
function orderCard(o){
 const late=orderAge(o)>35&&o.status==='production';
 const readyDelivery=o.status==='ready'&&o.type==='Delivery';
 const action=readyDelivery&&!o.courier
  ?`<button class="btn btn-outline btn-sm" onclick="go('entregas')">Definir entregador ${icon('person-plus')}</button>`
  :`<button class="btn ${o.status==='ready'?'btn-green':'btn-blue'} btn-sm" onclick="advanceOrder('${o.id}')">${o.status==='analysis'?'Aceitar pedido':o.status==='production'?'Avançar pedido':'Finalizar pedido'} ${icon('arrow-right-short')}</button>`;
 const search=esc([o.id,o.customer,o.table,o.address].filter(Boolean).join(' ').toLowerCase());
 return `<div class="order-card ${late?'late':''}" data-search="${search}" data-type="${esc(o.type)}"><div class="order-head"><span class="type-badge">${typeIcon(o.type)}</span><span class="num">Pedido #${esc(o.id)}</span><time>${icon('clock')} ${orderTime(o)}</time></div>${late?'<div class="order-late">Pedido atrasado</div>':''}<div class="order-info"><div>${esc(o.customer)}</div>${o.table?`<div class="order-address"><span class="addr-icon">${icon('table')}</span><span>${esc(o.table)}</span></div>`:''}${o.address?`<div class="order-address"><span class="addr-icon">${icon('geo-alt')}</span><span>${esc(o.address)}</span></div>`:''}<div class="order-row"><span>${esc(o.payment)}</span><b>${money(orderTotal(o))}</b></div></div><div class="order-actions"><button class="btn btn-outline btn-sm" onclick="detailsOrder('${o.id}')">Detalhes</button>${action}</div></div>`;
}
async function settingsTimes(){const v=await formDialog({title:'Tempos de atendimento',fields:[{key:'counter',label:'Balcão',value:state.settings.counterMin,required:true},{key:'delivery',label:'Delivery',value:state.settings.deliveryMin,required:true}]});if(!v)return;state.settings.counterMin=v.counter.trim();state.settings.deliveryMin=v.delivery.trim();save();toast('Tempos atualizados.','success')}
