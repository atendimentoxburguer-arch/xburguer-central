/* X Burguer Central V22 — PDV e fechamento de conta */
let pdvDiscountDraft=0;
let pdvSurchargeDraft=0;
let pdvSplitDraft=1;

function pdvBaseSubtotalV22(){return pdvCart.reduce((s,i)=>s+(Number(i.q)||0)*(Number(i.price)||0),0)}
function pdvFeeV22(type,subtotal){
 if(type==='Delivery')return {label:'Taxa de entrega',value:Math.max(0,Number(state.settings.deliveryFee)||0)};
 if(type==='Mesa')return {label:'Serviço ('+Number(state.settings.serviceFee||0)+'%)',value:subtotal*Math.max(0,Number(state.settings.serviceFee)||0)/100};
 return {label:'Taxas',value:0};
}
function pdvGrandV22(){
 const subtotal=pdvBaseSubtotalV22(),type=document.getElementById('pdvType')?.value||pdvType,fee=pdvFeeV22(type,subtotal);
 return Math.max(0,subtotal+fee.value+Math.max(0,pdvSurchargeDraft)-Math.max(0,pdvDiscountDraft));
}
function pdvPaymentButtonV22(label,iconName,value){
 return `<button type="button" class="pdv-pay-card ${pdvPayDraft===value?'active':''}" onclick="setPdvPaymentV22('${value.replaceAll("'","\\'")}')">${icon(iconName)}<span>${esc(label)}</span></button>`;
}
function renderPdv(editOrder=null){
 const incomingId=editOrder?.id||'';
 if(incomingId&&incomingId!==pdvEditingId){
  pdvCustomerDraft=editOrder?.customer||'';
  pdvPayDraft=editOrder?.payment||'PIX';
  pdvDiscountDraft=Math.max(0,Number(editOrder?.discount)||0);
  pdvSurchargeDraft=Math.max(0,Number(editOrder?.surcharge)||0);
  pdvSplitDraft=Math.min(20,Math.max(1,Number(editOrder?.splitCount)||1));
 }
 if(!incomingId&&pdvEditingId){
  pdvDiscountDraft=0;pdvSurchargeDraft=0;pdvSplitDraft=1;
 }
 pdvEditingId=incomingId;
 const root=document.getElementById('pdv');
 const cats=[{id:'all',name:'Todos'},...state.categories];
 const list=state.products.filter(p=>(pdvCat==='all'||p.cat===pdvCat)&&p.active);
 const subtotal=pdvBaseSubtotalV22(),fee=pdvFeeV22(pdvType,subtotal),total=Math.max(0,subtotal+fee.value+pdvSurchargeDraft-pdvDiscountDraft);
 const remainingPerPerson=total/Math.max(1,pdvSplitDraft);
 root.innerHTML=`
 <div class="page-head pdv-page-head">
  <div><h1>${editOrder?'Pedido #'+esc(editOrder.id):'Novo pedido'}</h1><p>Monte o pedido e finalize valores, pagamento e divisão da conta no mesmo fluxo.</p></div>
  <div class="page-head-actions">
   ${editOrder?`<button class="btn btn-outline" onclick="printOrderMenu('${editOrder.id}')">${icon('printer')}<span>Imprimir conferência</span></button><button class="btn btn-outline" onclick="detailsOrder('${editOrder.id}')">${icon('three-dots')}<span>Ações</span></button>`:''}
   <button class="btn btn-primary" onclick="resetPdvV22()">${icon('plus-lg')}<span>Novo pedido</span></button>
  </div>
 </div>
 <div class="pdv-reference-bar">
  <label><span>Atendimento</span><select id="pdvType" onchange="pdvType=this.value;updatePdvTotals()"><option ${pdvType==='Balcão'?'selected':''}>Balcão</option><option ${pdvType==='Retirada'?'selected':''}>Retirada</option><option ${pdvType==='Delivery'?'selected':''}>Delivery</option><option ${pdvType==='Mesa'?'selected':''}>Mesa</option></select></label>
  <div class="pdv-reference-meta">${editOrder?'<span class="badge b-orange">'+esc(orderStatusMetaV21?.(editOrder.status)?.label||editOrder.status)+'</span>':'<span class="badge b-blue">Rascunho</span>'}</div>
 </div>
 <div class="pdv-shell-v22">
  <section class="pdv-main-v22">
   <div class="pdv-categories">${cats.map(c=>`<button class="chip ${pdvCat===c.id?'active':''}" onclick="pdvCat='${c.id}';renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null)">${esc(c.name)}</button>`).join('')}</div>
   <div class="pdv-products">${list.map(p=>`<button type="button" class="product-tile ${p.sold?'sold':''}" ${p.sold?'disabled':''} onclick="addCart('${p.id}')"><div class="photo">${productMedia(p,'pdv-product-image')}</div><b>${esc(p.name)}</b><div class="price">${money(p.price)}</div></button>`).join('')||'<div class="empty">Nenhum produto nesta categoria.</div>'}</div>
   <div class="pdv-order-card">
    <div class="pdv-order-head"><div><span class="customer-icon">${icon('person')}</span><b id="pdvCustomerTitle">${esc(pdvCustomerDraft||'Cliente não identificado')}</b></div><span>${pdvCart.reduce((s,i)=>s+(Number(i.q)||0),0)} item(ns)</span></div>
    <div id="cartRows" class="pdv-order-lines">${pdvCart.map((i,n)=>{const p=product(i.p);return `<div class="pdv-order-line"><div class="pdv-order-product">${productMedia(p,'pdv-line-photo')}<div><b>${i.q}x ${esc(p?.name||'Item')}</b><span>${money(i.price)} un.</span></div></div><div class="qty"><button onclick="cartQty(${n},-1)">−</button><b>${i.q}</b><button onclick="cartQty(${n},1)">+</button></div><strong>${money(i.q*i.price)}</strong></div>`}).join('')||'<div class="empty">Clique nos produtos acima para adicionar itens ao pedido.</div>'}</div>
    <div class="pdv-order-total"><span>Total dos itens</span><b>${money(subtotal)}</b></div>
   </div>
  </section>
  <aside class="pdv-settlement-v22">
   <div class="pdv-adjust-tabs">
    <button onclick="setPdvAdjustmentV22('discount')">${icon('dash-circle')}<span>Desconto</span><b>${pdvDiscountDraft?'- '+money(pdvDiscountDraft):'Adicionar'}</b></button>
    <button onclick="setPdvAdjustmentV22('surcharge')">${icon('plus-circle')}<span>Acréscimo</span><b>${pdvSurchargeDraft?'+ '+money(pdvSurchargeDraft):'Adicionar'}</b></button>
   </div>
   <div class="pdv-totals-box">
    <div><span>Subtotal</span><b id="pdvSubtotal">${money(subtotal)}</b></div>
    <div id="pdvFeeLine" ${fee.value<=0?'hidden':''}><span id="pdvFeeLabel">${esc(fee.label)}</span><b id="pdvFeeValue">${money(fee.value)}</b></div>
    <div ${pdvDiscountDraft<=0?'hidden':''}><span>Desconto</span><b>− ${money(pdvDiscountDraft)}</b></div>
    <div ${pdvSurchargeDraft<=0?'hidden':''}><span>Acréscimo</span><b>+ ${money(pdvSurchargeDraft)}</b></div>
    <div class="grand"><span>Valor total</span><b id="pdvGrandTotal">${money(total)}</b></div>
   </div>
   <div class="pdv-customer-panel">
    <div class="field"><label>Cliente / identificador</label><input id="pdvCustomer" value="${esc(pdvCustomerDraft)}" oninput="pdvCustomerDraft=this.value;document.getElementById('pdvCustomerTitle').textContent=this.value.trim()||'Cliente não identificado'" placeholder="Nome do cliente"></div>
   </div>
   <div class="pdv-payment-panel">
    <b>Escolha a forma de pagamento</b>
    <div class="pdv-payment-grid">
     ${pdvPaymentButtonV22('Dinheiro','cash','Dinheiro')}
     ${pdvPaymentButtonV22('PIX','qr-code','PIX')}
     ${pdvPaymentButtonV22('Débito','credit-card','Cartão (Débito)')}
     ${pdvPaymentButtonV22('Crédito','credit-card-2-front','Cartão (Crédito)')}
    </div>
   </div>
   <div class="pdv-balance-box">
    <div class="pdv-balance-head"><span>Valor da conta</span><b>${money(total)}</b></div>
    <div class="pdv-split-row"><span>Dividir por</span><div class="pdv-stepper"><button onclick="changePdvSplitV22(-1)">−</button><b>${pdvSplitDraft}</b><button onclick="changePdvSplitV22(1)">+</button></div><strong>${money(remainingPerPerson)} / pessoa</strong></div>
   </div>
   <button class="btn btn-primary btn-block pdv-save-main" ${pdvCart.length?'':'disabled'} onclick="finishPdv('${editOrder?.id||''}')">${editOrder?'Salvar alterações':'Criar pedido'}</button>
   ${editOrder?'<button class="btn btn-green btn-block" onclick="openOrderCheckoutV22(\''+editOrder.id+'\')">'+icon('check2-circle')+'<span>Fechar conta</span></button>':''}
  </aside>
 </div>`;
 updatePdvTotals();
}
function updatePdvTotals(){
 const subtotal=pdvBaseSubtotalV22(),type=document.getElementById('pdvType')?.value||pdvType;
 pdvType=type;
 const fee=pdvFeeV22(type,subtotal),total=Math.max(0,subtotal+fee.value+pdvSurchargeDraft-pdvDiscountDraft);
 const labelEl=document.getElementById('pdvFeeLabel'),feeEl=document.getElementById('pdvFeeValue'),totalEl=document.getElementById('pdvGrandTotal'),line=document.getElementById('pdvFeeLine');
 if(labelEl)labelEl.textContent=fee.label;if(feeEl)feeEl.textContent=money(fee.value);if(totalEl)totalEl.textContent=money(total);if(line)line.hidden=fee.value<=0;
}
function setPdvPaymentV22(value){pdvPayDraft=value;renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null)}
async function setPdvAdjustmentV22(kind){
 const current=kind==='discount'?pdvDiscountDraft:pdvSurchargeDraft;
 const v=await formDialog({title:kind==='discount'?'Aplicar desconto':'Aplicar acréscimo',subtitle:'Informe o valor em reais.',fields:[{key:'value',label:'Valor',type:'number',value:current,min:0,step:'0.01',required:true}]});
 if(!v)return;
 const value=Math.max(0,Number(v.value)||0),limit=pdvBaseSubtotalV22()+pdvFeeV22(pdvType,pdvBaseSubtotalV22()).value+pdvSurchargeDraft;
 if(kind==='discount')pdvDiscountDraft=Math.min(value,Math.max(0,limit));else pdvSurchargeDraft=value;
 renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null);
}
function changePdvSplitV22(delta){pdvSplitDraft=Math.min(20,Math.max(1,pdvSplitDraft+delta));renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null)}
function resetPdvV22(){pdvCart=[];pdvCustomerDraft='';pdvPayDraft='PIX';pdvEditingId='';pdvDraftTable='';pdvDiscountDraft=0;pdvSurchargeDraft=0;pdvSplitDraft=1;renderPdv()}
function addCart(id){
 const p=product(id);if(!p||p.sold||p.stock<=0){toast('Produto esgotado.','warning');return}
 const e=pdvCart.find(i=>i.p===id);
 if(e){const editing=state.orders.find(o=>o.id===pdvEditingId),original=editing?.items?.find(i=>i.p===id),max=(Number(p.stock)||0)+(Number(original?.q)||0);if(e.q>=max){toast('Quantidade máxima disponível atingida.','warning');return}e.q++}
 else pdvCart.push({p:id,q:1,price:p.price});
 renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null);
}
function cartQty(n,d){
 const line=pdvCart[n];if(!line)return;
 const p=product(line.p);if(!p)return;
 if(d>0){const editing=state.orders.find(o=>o.id===pdvEditingId),original=editing?.items?.find(i=>i.p===line.p),max=(Number(p.stock)||0)+(Number(original?.q)||0);if(line.q>=max){toast('Quantidade máxima disponível atingida.','warning');return}}
 line.q+=d;if(line.q<=0)pdvCart.splice(n,1);
 renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null);
}
async function finishPdv(editId=''){
 if(!pdvCart.length){toast('Adicione pelo menos um item.','warning');return}
 const type=document.getElementById('pdvType')?.value||pdvType||'Balcão',customer=(document.getElementById('pdvCustomer')?.value||pdvCustomerDraft).trim()||'Não identificado',pay=pdvPayDraft||'Não registrado';
 const existing=editId?state.orders.find(o=>o.id===editId):null;
 let table=existing?.table||'',address=existing?.address||'',phone=existing?.phone||'';
 if(type==='Mesa'){
  address='';if(pdvDraftTable)table=pdvDraftTable;
  if(!table){const v=await formDialog({title:'Vincular mesa',fields:[{key:'table',label:'Mesa',type:'select',value:state.tables[0]?.name||'',options:state.tables.map(t=>t.name),required:true}]});if(!v)return;table=v.table}
 }else if(type==='Delivery'){
  table='';
  if(!address||existing?.type!=='Delivery'){const v=await formDialog({title:'Dados da entrega',fields:[{key:'address',label:'Endereço',value:address,required:true,full:true},{key:'phone',label:'Telefone',value:phone,placeholder:'(62) 9____-____'}]});if(!v)return;address=v.address.trim();phone=v.phone.trim()}
 }else{table='';address=''}
 const matchedCustomer=state.customers.find(c=>phone&&c.phone&&c.phone===phone)||state.customers.find(c=>c.name.trim().toLowerCase()===customer.trim().toLowerCase());
 const customerId=matchedCustomer?.id||'',oldQty=new Map((existing?.items||[]).map(i=>[i.p,Number(i.q)||0]));
 let createdOrder=null;
 for(const i of pdvCart){const p=product(i.p),available=(Number(p?.stock)||0)+(oldQty.get(i.p)||0);if(!p||(p.sold&&!(oldQty.get(i.p)>0))||available<i.q){toast(`Estoque insuficiente para ${p?.name||'um item'}.`,'error');return}}
 if(existing){
  const newQty=new Map(pdvCart.map(i=>[i.p,Number(i.q)||0])),ids=new Set([...oldQty.keys(),...newQty.keys()]);
  ids.forEach(pid=>{const p=product(pid);if(!p)return;const before=oldQty.get(pid)||0,after=newQty.get(pid)||0,delta=before-after;p.stock=Math.max(0,(Number(p.stock)||0)+delta);p.sold=Boolean(p.manualSold||p.stock<=0);if(delta)recordStockMovement(pid,delta,'Edição de pedido',existing.id)});
  Object.assign(existing,{items:pdvCart.map(x=>({...x,cost:Number(product(x.p)?.cost)||0})),customer,customerId,payment:pay,type,table,address,phone,discount:pdvDiscountDraft,surcharge:pdvSurchargeDraft,splitCount:pdvSplitDraft,deliveryFee:type==='Delivery'?Math.max(0,Number(state.settings.deliveryFee)||0):0,serviceFeePct:type==='Mesa'?Math.max(0,Number(state.settings.serviceFee)||0):0});
 }else{
  const id=String(Math.max(...state.orders.map(o=>Number(o.id)||0),77500)+1);
  createdOrder={id,type,table,customer,customerId,phone,address,payment:pay,status:state.settings.autoAccept?'production':'analysis',createdAt:new Date().toISOString(),discount:pdvDiscountDraft,surcharge:pdvSurchargeDraft,splitCount:pdvSplitDraft,deliveryFee:type==='Delivery'?Math.max(0,Number(state.settings.deliveryFee)||0):0,serviceFeePct:type==='Mesa'?Math.max(0,Number(state.settings.serviceFee)||0):0,items:pdvCart.map(x=>({...x,cost:Number(product(x.p)?.cost)||0})),notes:'',courier:'',scheduled:false};
  state.orders.push(createdOrder);
  pdvCart.forEach(i=>{const p=product(i.p);if(p&&Number.isFinite(p.stock)){p.stock=Math.max(0,p.stock-i.q);p.sold=Boolean(p.manualSold||p.stock<=0);recordStockMovement(p.id,-Number(i.q||0),'Venda',id)}})
 }
 resetPdvDraftV22();syncTables();save();
 if(createdOrder){globalThis.dispatchAutoPrintEvent?.('created',createdOrder);if(createdOrder.status==='production')globalThis.dispatchAutoPrintEvent?.('production',createdOrder)}
 go('pedidos');toast('Pedido salvo com sucesso.','success');
}
function resetPdvDraftV22(){pdvCart=[];pdvDraftTable='';pdvEditingId='';pdvCustomerDraft='';pdvPayDraft='PIX';pdvDiscountDraft=0;pdvSurchargeDraft=0;pdvSplitDraft=1}
function checkoutSummaryV22(orders){
 const subtotal=orders.reduce((s,o)=>s+orderSubtotal(o),0),fees=orders.reduce((s,o)=>s+orderFeeTotal(o),0),discount=orders.reduce((s,o)=>s+Math.max(0,Number(o.discount)||0),0),surcharge=orders.reduce((s,o)=>s+Math.max(0,Number(o.surcharge)||0),0),total=orders.reduce((s,o)=>s+orderTotal(o),0);
 return {subtotal,fees,discount,surcharge,total};
}
function checkoutOrderListV22(orders){
 return orders.map(o=>`<article class="checkout-order-card"><div class="checkout-order-head"><div><b>Pedido #${esc(o.id)}</b><span class="badge ${orderStatusMetaV21?.(o.status)?.badge||'b-gray'}">${esc(orderStatusMetaV21?.(o.status)?.label||o.status)}</span></div><span>${orderTime(o)}</span></div><div class="checkout-order-items">${o.items.map(i=>`<div><span>${Number(i.q)||0}x ${esc(product(i.p)?.name||'Item')}</span><b>${money((Number(i.q)||0)*(Number(i.price)||0))}</b></div>`).join('')}</div><div class="checkout-order-foot"><span>${esc(o.payment||'Não registrado')}</span><b>${money(orderTotal(o))}</b></div></article>`).join('');
}
function openOrderCheckoutV22(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 openCheckoutV22([o],{title:'Fechar pedido #'+id,orderId:id,tableId:''});
}
function openTableCheckoutV22(id){
 const t=state.tables.find(x=>x.id===id);if(!t)return;
 const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));
 if(!orders.length){toast('Esta mesa não possui pedidos abertos.','warning');return}
 openCheckoutV22(orders,{title:'Fechar conta — '+t.name,orderId:'',tableId:id});
}
function openCheckoutV22(orders,context){
 const summary=checkoutSummaryV22(orders),split=Math.max(1,Number(orders[0]?.splitCount)||1),payment=orders[0]?.payment||'Não registrado';
 openModal(`<div class="checkout-shell-v22"><section class="checkout-main-v22"><div class="checkout-toolbar"><div><h2>${esc(context.title)}</h2><p>${orders.length} pedido(s) • conferência antes do recebimento</p></div><div><button class="btn btn-outline" onclick="printOrderMenu('${orders[0].id}')">${icon('printer')}<span>Imprimir conferência</span></button><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div></div><div class="checkout-customer">${icon('person')}<b>${esc(orders[0].customer||'Cliente não identificado')}</b></div><div class="checkout-orders-list">${checkoutOrderListV22(orders)}</div></section><aside class="checkout-side-v22"><div class="checkout-adjust-grid"><button onclick="${context.tableId?`checkoutAdjustTableV22('${context.tableId}','discount')`:`checkoutAdjustOrderV22('${context.orderId}','discount')`}">Desconto</button><button onclick="${context.tableId?`checkoutAdjustTableV22('${context.tableId}','surcharge')`:`checkoutAdjustOrderV22('${context.orderId}','surcharge')`}">Acréscimo</button></div><div class="checkout-summary-v22"><div><span>Subtotal</span><b>${money(summary.subtotal)}</b></div><div><span>Taxas</span><b>${money(summary.fees)}</b></div>${summary.discount?'<div><span>Desconto</span><b>− '+money(summary.discount)+'</b></div>':''}${summary.surcharge?'<div><span>Acréscimo</span><b>+ '+money(summary.surcharge)+'</b></div>':''}<div class="grand"><span>Valor total</span><b>${money(summary.total)}</b></div></div><div class="checkout-payment-v22"><b>Forma de pagamento</b><div class="checkout-payment-grid">${['Dinheiro','PIX','Cartão (Débito)','Cartão (Crédito)'].map(v=>`<button class="${payment===v?'active':''}" onclick="${context.tableId?`checkoutSetTablePaymentV22('${context.tableId}','${v}')`:`checkoutSetOrderPaymentV22('${context.orderId}','${v}')`}">${esc(v)}</button>`).join('')}</div></div><div class="checkout-balance-v22"><div><span>Falta</span><b>${money(summary.total)}</b></div><div class="checkout-split-v22"><span>Dividir por</span><button onclick="${context.tableId?`checkoutSplitTableV22('${context.tableId}',-1)`:`checkoutSplitOrderV22('${context.orderId}',-1)`}">−</button><b>${split}</b><button onclick="${context.tableId?`checkoutSplitTableV22('${context.tableId}',1)`:`checkoutSplitOrderV22('${context.orderId}',1)`}">+</button><strong>${money(summary.total/split)}</strong></div></div><button class="btn btn-green btn-block checkout-close-btn" onclick="${context.tableId?`closeTableCheckoutV22('${context.tableId}')`:`closeOrderCheckoutV22('${context.orderId}')`}">${icon('check2-circle')}<span>Fechar conta</span></button></aside></div>`);
}
async function checkoutAdjustOrderV22(id,kind){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 const v=await formDialog({title:kind==='discount'?'Desconto':'Acréscimo',fields:[{key:'value',label:'Valor',type:'number',value:Number(o[kind])||0,min:0,step:'0.01',required:true}]});if(!v)return;
 o[kind]=Math.max(0,Number(v.value)||0);save({render:false});openOrderCheckoutV22(id);
}
async function checkoutAdjustTableV22(id,kind){
 const t=state.tables.find(x=>x.id===id);if(!t)return;
 const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));if(!orders.length)return;
 const current=orders.reduce((s,o)=>s+Math.max(0,Number(o[kind])||0),0);
 const v=await formDialog({title:kind==='discount'?'Desconto da conta':'Acréscimo da conta',fields:[{key:'value',label:'Valor total',type:'number',value:current,min:0,step:'0.01',required:true}]});if(!v)return;
 const value=Math.max(0,Number(v.value)||0),bases=orders.map(o=>orderSubtotal(o)+orderFeeTotal(o)),sum=bases.reduce((a,b)=>a+b,0)||1;
 orders.forEach((o,i)=>o[kind]=Number((value*(bases[i]/sum)).toFixed(2)));
 const diff=Number((value-orders.reduce((s,o)=>s+o[kind],0)).toFixed(2));if(orders[0])orders[0][kind]=Math.max(0,orders[0][kind]+diff);
 save({render:false});openTableCheckoutV22(id);
}
function checkoutSetOrderPaymentV22(id,payment){const o=state.orders.find(x=>x.id===id);if(!o)return;o.payment=payment;save({render:false});openOrderCheckoutV22(id)}
function checkoutSetTablePaymentV22(id,payment){const t=state.tables.find(x=>x.id===id);if(!t)return;state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status)).forEach(o=>o.payment=payment);save({render:false});openTableCheckoutV22(id)}
function checkoutSplitOrderV22(id,delta){const o=state.orders.find(x=>x.id===id);if(!o)return;o.splitCount=Math.min(20,Math.max(1,(Number(o.splitCount)||1)+delta));save({render:false});openOrderCheckoutV22(id)}
function checkoutSplitTableV22(id,delta){const t=state.tables.find(x=>x.id===id);if(!t)return;const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status)),next=Math.min(20,Math.max(1,(Number(orders[0]?.splitCount)||1)+delta));orders.forEach(o=>o.splitCount=next);save({render:false});openTableCheckoutV22(id)}
async function closeOrderCheckoutV22(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 if(o.type==='Delivery'){toast('Pedidos delivery devem ser finalizados pelo fluxo de Entregas.','warning');return}
 if(['analysis','production'].includes(o.status)){toast('O pedido ainda está em análise ou produção. Avance-o antes de fechar a conta.','warning');return}
 const ok=await confirmDialog('Fechar conta','Confirmar recebimento de '+money(orderTotal(o))+' e concluir o pedido #'+id+'?',{confirmLabel:'Fechar conta'});if(!ok)return;
 o.status='done';o.completedAt=new Date().toISOString();closeModal();syncTables();save();toast('Conta fechada com sucesso.','success');
}
async function closeTableCheckoutV22(id){
 const t=state.tables.find(x=>x.id===id);if(!t)return;
 const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));
 if(orders.some(o=>['analysis','production'].includes(o.status))){toast('Ainda existem pedidos em análise ou produção nesta mesa.','warning');return}
 const total=orders.reduce((s,o)=>s+orderTotal(o),0),ok=await confirmDialog('Fechar conta','Confirmar recebimento de '+money(total)+' e liberar '+t.name+'?',{confirmLabel:'Fechar conta'});if(!ok)return;
 orders.forEach(o=>{o.status='done';o.completedAt=new Date().toISOString()});t.status='free';t.guests=0;t.server='';closeModal();save();toast('Conta fechada e mesa liberada.','success');
}
