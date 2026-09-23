/* X Burguer Central V24 — PDV e fechamento de conta */
let pdvDiscountDraft=0;
let pdvSurchargeDraft=0;
let pdvSplitDraft=1;
let checkoutModeV23='total';
let checkoutPaymentV23='PIX';
let checkoutSelectedUnitsV23=new Set();
let checkoutOpenKeyV23='';
let checkoutActionOrderV24='';
const CHECKOUT_METHODS_V23=['Dinheiro','PIX','Cartão (Débito)','Cartão (Crédito)'];

function pdvBaseSubtotalV22(){return pdvCart.reduce((s,i)=>s+(Number(i.q)||0)*(Number(i.price)||0),0)}
function pdvFeeV22(type,subtotal){
 const existing=state.orders.find(o=>o.id===pdvEditingId&&o.type===type);
 if(type==='Delivery')return {label:'Taxa de entrega',value:Math.max(0,Number(existing?.deliveryFee??state.settings.deliveryFee)||0)};
 if(type==='Mesa'){const pct=Math.max(0,Number(existing?.serviceFeePct??state.settings.serviceFee)||0);return {label:'Serviço ('+pct+'%)',value:subtotal*pct/100}}
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
    <div class="pdv-balance-head"><span>Valor da conta</span><b id="pdvBalanceTotal">${money(total)}</b></div>
    <div class="pdv-split-row"><span>Dividir por</span><div class="pdv-stepper"><button onclick="changePdvSplitV22(-1)">−</button><b>${pdvSplitDraft}</b><button onclick="changePdvSplitV22(1)">+</button></div><strong id="pdvPerPerson">${money(remainingPerPerson)} / pessoa</strong></div>
   </div>
   <button class="btn btn-primary btn-block pdv-save-main" ${pdvCart.length?'':'disabled'} onclick="finishPdv('${editOrder?.id||''}')">${editOrder?'Salvar alterações':'Criar pedido'}</button>
   ${editOrder?.status==='ready'&&editOrder.type!=='Delivery'?'<button class="btn btn-green btn-block" onclick="finishPdv(\''+editOrder.id+'\',true)">'+icon('check2-circle')+'<span>Salvar e fechar conta</span></button>':''}
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
 const balance=document.getElementById('pdvBalanceTotal'),person=document.getElementById('pdvPerPerson');
 if(balance)balance.textContent=money(total);if(person)person.textContent=money(total/Math.max(1,pdvSplitDraft))+' / pessoa';
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
async function finishPdv(editId='',checkoutAfter=false){
 if(!pdvCart.length){toast('Adicione pelo menos um item.','warning');return}
 const type=document.getElementById('pdvType')?.value||pdvType||'Balcão',customer=(document.getElementById('pdvCustomer')?.value||pdvCustomerDraft).trim()||'Não identificado',pay=pdvPayDraft||'Não registrado';
 const existing=editId?state.orders.find(o=>o.id===editId):null;
 if(editId&&(!existing||['done','cancelled'].includes(existing.status))){toast('Este pedido não pode mais ser editado.','warning');return}
 if(editId&&(existing.settlements||[]).length){toast('Este pedido já possui pagamento parcial. Estorne os recebimentos antes de editar itens ou valores.','warning');return}
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
  const deliveryFee=type==='Delivery'?Math.max(0,Number(existing.type===type?existing.deliveryFee??state.settings.deliveryFee:state.settings.deliveryFee)||0):0;
  const serviceFeePct=type==='Mesa'?Math.max(0,Number(existing.type===type?existing.serviceFeePct??state.settings.serviceFee:state.settings.serviceFee)||0):0;
  Object.assign(existing,{items:pdvCart.map(x=>({...x,cost:Number(product(x.p)?.cost)||0})),customer,customerId,payment:pay,type,table,address,phone,discount:pdvDiscountDraft,surcharge:pdvSurchargeDraft,splitCount:pdvSplitDraft,deliveryFee,serviceFeePct});
 }else{
  const id=String(Math.max(...state.orders.map(o=>Number(o.id)||0),77500)+1);
  createdOrder={id,type,table,customer,customerId,phone,address,payment:pay,status:state.settings.autoAccept?'production':'analysis',createdAt:new Date().toISOString(),discount:pdvDiscountDraft,surcharge:pdvSurchargeDraft,splitCount:pdvSplitDraft,deliveryFee:type==='Delivery'?Math.max(0,Number(state.settings.deliveryFee)||0):0,serviceFeePct:type==='Mesa'?Math.max(0,Number(state.settings.serviceFee)||0):0,items:pdvCart.map(x=>({...x,cost:Number(product(x.p)?.cost)||0})),notes:'',courier:'',scheduled:false};
  state.orders.push(createdOrder);
  pdvCart.forEach(i=>{const p=product(i.p);if(p&&Number.isFinite(p.stock)){p.stock=Math.max(0,p.stock-i.q);p.sold=Boolean(p.manualSold||p.stock<=0);recordStockMovement(p.id,-Number(i.q||0),'Venda',id)}})
 }
 resetPdvDraftV22();syncTables();save();
 if(createdOrder){globalThis.dispatchAutoPrintEvent?.('created',createdOrder);if(createdOrder.status==='production')globalThis.dispatchAutoPrintEvent?.('production',createdOrder)}
 go('pedidos');toast('Pedido salvo com sucesso.','success');
 if(checkoutAfter&&existing)openOrderCheckoutV22(existing.id);
}
function resetPdvDraftV22(){pdvCart=[];pdvDraftTable='';pdvEditingId='';pdvCustomerDraft='';pdvPayDraft='PIX';pdvDiscountDraft=0;pdvSurchargeDraft=0;pdvSplitDraft=1}
function checkoutSummaryV22(orders){
 const subtotal=orders.reduce((s,o)=>s+orderSubtotal(o),0),fees=orders.reduce((s,o)=>s+orderFeeTotal(o),0),discount=orders.reduce((s,o)=>s+Math.max(0,Number(o.discount)||0),0),surcharge=orders.reduce((s,o)=>s+Math.max(0,Number(o.surcharge)||0),0),total=orders.reduce((s,o)=>s+orderTotal(o),0);
 return {subtotal,fees,discount,surcharge,total};
}
function checkoutSettlementsV23(orders){
 return orders.flatMap(o=>(Array.isArray(o.settlements)?o.settlements:[]).map(s=>({order:o,settlement:s})));
}
function checkoutPaidCentsV23(orders){
 return checkoutSettlementsV23(orders).reduce((sum,x)=>sum+Math.max(0,Math.round(Number(x.settlement.amountCents)||0)),0);
}
function checkoutRemainingCentsV23(orders){
 return Math.max(0,Math.round(checkoutSummaryV22(orders).total*100)-checkoutPaidCentsV23(orders));
}
function checkoutPaymentGroupsV23(orders){
 const groups=new Map();
 checkoutSettlementsV23(orders).forEach(({settlement})=>{
  const key=String(settlement.groupId||settlement.id||'');
  if(!key)return;
  const current=groups.get(key)||{id:key,amountCents:0,method:settlement.method||'Não registrado',kind:settlement.kind||'total',at:settlement.at||'',count:0};
  current.amountCents+=Math.max(0,Math.round(Number(settlement.amountCents)||0));current.count++;
  if(new Date(settlement.at||0)>new Date(current.at||0))current.at=settlement.at||current.at;
  groups.set(key,current);
 });
 return [...groups.values()].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
}
function checkoutItemUnitsV23(orders){
 const result=[];
 orders.forEach(o=>{
  const defs=[];
  (o.items||[]).forEach((item,itemIndex)=>{
   const count=Math.max(1,Math.round(Number(item.q)||0)),baseCents=Math.max(0,Math.round((Number(item.price)||0)*100));
   for(let unitIndex=0;unitIndex<count;unitIndex++)defs.push({orderId:o.id,itemIndex,unitIndex,key:o.id+':'+itemIndex+':'+unitIndex,name:product(item.p)?.name||'Item',product:item.p,count,baseCents});
  });
  const target=Math.max(0,Math.round(orderTotal(o)*100)),baseTotal=defs.reduce((sum,u)=>sum+u.baseCents,0),divisor=baseTotal||defs.length||1;
  let cumulative=0,allocated=0;
  defs.forEach((u,index)=>{
   cumulative+=baseTotal?u.baseCents:1;
   const next=index===defs.length-1?target:Math.round(target*cumulative/divisor);
   u.amountCents=Math.max(0,next-allocated);allocated=next;
  });
  const paid=new Map();
  (o.settlements||[]).forEach(st=>(st.allocations||[]).forEach(a=>paid.set(String(a.unitKey||''),(paid.get(String(a.unitKey||''))||0)+Math.max(0,Math.round(Number(a.amountCents)||0)))));
  defs.forEach(u=>result.push({...u,paidCents:Math.min(u.amountCents,paid.get(u.key)||0),remainingCents:Math.max(0,u.amountCents-(paid.get(u.key)||0))}));
 });
 return result;
}
function checkoutStatusMetaV24(status){
 const map={
  analysis:{label:'Recebido',badge:'b-orange'},
  production:{label:'Em preparo',badge:'b-orange'},
  ready:{label:'Pronto',badge:'b-green'}
 };
 return map[status]||orderStatusMetaV21?.(status)||{label:'Pedido',badge:'b-gray'};
}
function checkoutContextLabelV24(context){
 if(context.tableId){
  const t=state.tables.find(x=>x.id===context.tableId);
  return t?.name||'Mesa';
 }
 return 'Pedido #'+String(context.orderId||'');
}
function checkoutServerV24(context,order){
 if(context.tableId){
  const t=state.tables.find(x=>x.id===context.tableId);
  return String(t?.server||'Sem garçom');
 }
 return String(state.tables.find(t=>t.name===order?.table)?.server||'Sem garçom');
}
function checkoutOrderActionMenuV24(o,context){
 const open=checkoutActionOrderV24===o.id,locked=(o.settlements||[]).length>0;
 return '<div class="checkout-order-actions-v24">'+
  '<button class="checkout-order-action-btn-v24" onclick="checkoutToggleOrderActionsV24(\''+o.id+'\',\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\')">Ações '+icon('chevron-down')+'</button>'+
  (open?'<div class="checkout-order-menu-v24">'+
    '<button onclick="printOrderMenu(\''+o.id+'\')">'+icon('printer')+'<span>Imprimir</span></button>'+
    '<button '+(locked?'disabled title="Estorne os pagamentos antes de editar"':'')+' onclick="checkoutEditOrderV24(\''+o.id+'\')">'+icon('pencil')+'<span>Editar</span></button>'+
    '<button onclick="checkoutViewOrderV24(\''+o.id+'\')">'+icon('file-earmark-text')+'<span>Ver detalhes</span></button>'+
    '<button class="danger" '+(locked?'disabled title="Estorne os pagamentos antes de excluir"':'')+' onclick="checkoutCancelOrderV24(\''+o.id+'\',\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\')">'+icon('trash')+'<span>Excluir</span></button>'+
   '</div>':'')+
 '</div>';
}
function checkoutOrderItemsV24(o,context,itemMode){
 if(!itemMode){
  return (o.items||[]).map(i=>'<div class="checkout-order-item-v24"><span><b>'+Number(i.q||0)+'x</b> '+esc(product(i.p)?.name||'Item')+'</span><strong>'+money((Number(i.q)||0)*(Number(i.price)||0))+'</strong></div>').join('');
 }
 const units=checkoutItemUnitsV23([o]);
 return units.map(u=>{
  const selected=checkoutSelectedUnitsV23.has(u.key)&&u.remainingCents>0,paid=u.remainingCents<=0;
  return '<div class="checkout-order-item-v24 selectable '+(selected?'selected ':'')+(paid?'paid':'')+'">'+
   '<button class="checkout-item-select-v23" '+(paid?'disabled':'')+' aria-pressed="'+selected+'" onclick="checkoutToggleItemV23(\''+u.key+'\',\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\')">'+(paid?icon('check-square-fill'):selected?icon('check-square-fill'):icon('square'))+'</button>'+
   '<span><b>1x</b> '+esc(u.name)+(u.count>1?' <small>• unidade '+(u.unitIndex+1)+'/'+u.count+'</small>':'')+'</span>'+
   '<strong>'+money(u.remainingCents/100)+'</strong>'+
   '<button class="checkout-item-split-v24" '+(paid?'disabled':'')+' onclick="checkoutSplitItemValueV23(\''+u.orderId+'\','+u.itemIndex+','+u.unitIndex+',\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\')">Dividir</button>'+
  '</div>';
 }).join('');
}
function checkoutOrderListV22(orders,context={tableId:'',orderId:''}){
 const itemMode=checkoutModeV23==='items';
 return orders.map(o=>{
  const meta=checkoutStatusMetaV24(o.status),totalCents=Math.max(0,Math.round(orderTotal(o)*100)),paidCents=Math.min(totalCents,Math.round(orderSettlementTotal(o)*100)),server=checkoutServerV24(context,o);
  return '<article class="checkout-order-card v24">'+
   '<div class="checkout-order-head-v24">'+
    '<div class="checkout-order-identity-v24"><b>Pedido #'+esc(o.id)+'</b><span class="badge '+meta.badge+'">'+esc(meta.label)+'</span></div>'+
    '<div class="checkout-order-controls-v24">'+
     '<label class="checkout-served-v24 '+(o.servedAt?'checked':'')+'"><input type="checkbox" '+(o.servedAt?'checked':'')+' onchange="checkoutToggleServedV24(\''+o.id+'\',\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\')"><span>Entregar</span></label>'+
     '<span class="checkout-time-v24">'+icon('clock')+' '+orderTime(o)+'</span>'+
     '<span class="checkout-server-v24">'+icon('person-badge')+' '+esc(server)+'</span>'+
     checkoutOrderActionMenuV24(o,context)+
    '</div>'+
   '</div>'+
   '<div class="checkout-order-items-v24">'+checkoutOrderItemsV24(o,context,itemMode)+'</div>'+
   '<div class="checkout-order-total-v24"><span>Total</span><b>'+money(orderTotal(o))+'</b></div>'+
   (paidCents?'<div class="checkout-order-progress-v23"><span>Recebido '+money(paidCents/100)+'</span><span>Falta '+money(Math.max(0,totalCents-paidCents)/100)+'</span></div>':'')+
  '</article>';
 }).join('');
}
function checkoutItemsPanelV23(orders,context){
 return '<div class="checkout-orders-list">'+checkoutOrderListV22(orders,context)+'</div>';
}
function checkoutPaymentHistoryV23(orders,context){
 const groups=checkoutPaymentGroupsV23(orders);
 if(!groups.length)return '';
 return '<details class="checkout-history-v24"><summary><span>Pagamentos registrados</span><b>'+groups.length+'</b></summary><div class="checkout-history-v23">'+groups.map(g=>'<div class="checkout-history-row-v23"><div><b>'+money(g.amountCents/100)+'</b><span>'+esc(g.method)+' • '+(g.kind==='items'?'produtos':g.kind==='item-part'?'produto dividido':g.kind==='split'?'parcela':'conta')+'</span></div><button class="btn btn-outline btn-sm" onclick="checkoutUndoPaymentV23(\''+g.id+'\',\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\')">Estornar</button></div>').join('')+'</div></details>';
}
function checkoutCanReceiveV23(orders,notify=true){
 const ok=orders.length&&orders.every(o=>!['done','cancelled'].includes(o.status)&&o.type!=='Delivery');
 if(!ok&&notify)toast('Esta conta não está disponível para recebimento.','warning');
 return ok;
}
function checkoutReadyToCloseV24(orders){
 return orders.length&&orders.every(o=>o.status==='ready'&&o.type!=='Delivery');
}
function checkoutContextOrdersV23(tableId='',orderId=''){
 if(tableId){
  const t=state.tables.find(x=>x.id===tableId);if(!t)return [];
  return state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));
 }
 const o=editableCheckoutOrderV22(orderId);return o?[o]:[];
}
function reopenCheckoutV23(tableId='',orderId=''){
 if(tableId)openTableCheckoutV22(tableId,true);else openOrderCheckoutV22(orderId,true);
}
function checkoutChangeTableV24(tableId){
 if(!tableId)return;
 checkoutActionOrderV24='';
 openTableCheckoutV22(tableId,false);
}
function checkoutToggleServedV24(id,tableId='',orderId=''){
 const o=state.orders.find(x=>x.id===id);if(!o||['done','cancelled'].includes(o.status))return;
 o.servedAt=o.servedAt?'':new Date().toISOString();
 save({render:false});reopenCheckoutV23(tableId,orderId);
}
function checkoutToggleOrderActionsV24(id,tableId='',orderId=''){
 checkoutActionOrderV24=checkoutActionOrderV24===id?'':id;
 reopenCheckoutV23(tableId,orderId);
}
function checkoutEditOrderV24(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 checkoutActionOrderV24='';oEdit(id);
}
function checkoutViewOrderV24(id){
 checkoutActionOrderV24='';detailsOrder(id);
}
async function checkoutCancelOrderV24(id,tableId='',orderId=''){
 checkoutActionOrderV24='';
 await cancelOrder(id);
 const o=state.orders.find(x=>x.id===id);
 if(o?.status!=='cancelled')return;
 const remaining=checkoutContextOrdersV23(tableId,orderId);
 if(remaining.length)reopenCheckoutV23(tableId,orderId);
}
function checkoutNewTableOrderV24(tableId){
 closeModal();newTableOrderV14(tableId);
}
async function checkoutQuickPayV24(method,tableId='',orderId=''){
 checkoutPaymentV23=method;
 const orders=checkoutContextOrdersV23(tableId,orderId);if(!orders.length)return;
 const split=Math.max(1,Number(orders[0]?.splitCount)||1);
 const kind=checkoutModeV23==='items'?'items':split>1?'split':'total';
 await checkoutReceiveV23(tableId,orderId,kind);
}
async function checkoutChooseCardV24(tableId='',orderId=''){
 const v=await formDialog({title:'Pagamento com cartão',subtitle:'Escolha o tipo de cartão para registrar corretamente no caixa.',submitLabel:'Continuar',fields:[{key:'method',label:'Tipo do cartão',type:'select',value:'Cartão (Débito)',options:['Cartão (Débito)','Cartão (Crédito)'],required:true}]});
 if(!v)return;
 await checkoutQuickPayV24(v.method,tableId,orderId);
}
function checkoutSelectItemsV24(tableId='',orderId=''){
 checkoutModeV23=checkoutModeV23==='items'?'total':'items';
 checkoutSelectedUnitsV23=new Set();
 reopenCheckoutV23(tableId,orderId);
}
function checkoutTopbarV24(orders,context){
 const table=context.tableId?state.tables.find(x=>x.id===context.tableId):null;
 const activeTables=state.tables.filter(t=>state.orders.some(o=>o.table===t.name&&!['done','cancelled'].includes(o.status)));
 const selector=table?'<select class="checkout-table-select-v24" onchange="checkoutChangeTableV24(this.value)">'+activeTables.map(t=>'<option value="'+esc(t.id)+'" '+(t.id===table.id?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>':'<div class="checkout-order-title-v24">Pedido #'+esc(context.orderId)+'</div>';
 return '<header class="checkout-topbar-v24"><div>'+selector+'</div><div class="checkout-top-actions-v24">'+
  '<button class="btn btn-outline" onclick="printOrderMenu(\''+orders[0].id+'\')">'+icon('printer')+'<span>Imprimir conferência</span>'+icon('chevron-down')+'</button>'+
  (table?'<button class="btn btn-outline" onclick="tableMenuV14(\''+table.id+'\')">'+icon('gear')+'<span>Ações</span>'+icon('chevron-down')+'</button><button class="btn btn-primary" onclick="checkoutNewTableOrderV24(\''+table.id+'\')">'+icon('plus-lg')+'<span>Novo pedido</span></button>':'')+
  '<button class="btn btn-danger-outline" onclick="closeModal()">'+icon('x-lg')+'<span>Fechar</span></button>'+
 '</div></header>';
}
function openOrderCheckoutV22(id,preserve=false){
 const o=editableCheckoutOrderV22(id);if(!o)return;
 openCheckoutV22([o],{title:'Fechar pedido #'+id,orderId:id,tableId:''},preserve);
}
function openTableCheckoutV22(id,preserve=false){
 const t=state.tables.find(x=>x.id===id);if(!t)return;
 const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));
 if(!orders.length){toast('Esta mesa não possui pedidos abertos.','warning');return}
 openCheckoutV22(orders,{title:'Fechar conta — '+t.name,orderId:'',tableId:id},preserve);
}
function openCheckoutV22(orders,context,preserve=false){
 const summary=checkoutSummaryV22(orders),totalCents=Math.max(0,Math.round(summary.total*100)),paidCents=Math.min(totalCents,checkoutPaidCentsV23(orders)),remainingCents=Math.max(0,totalCents-paidCents),split=Math.max(1,Number(orders[0]?.splitCount)||1),key=context.tableId?'table:'+context.tableId:'order:'+context.orderId,canReceive=checkoutCanReceiveV23(orders,false),readyToClose=checkoutReadyToCloseV24(orders);
 if(!preserve||checkoutOpenKeyV23!==key){
  checkoutOpenKeyV23=key;checkoutModeV23='total';checkoutSelectedUnitsV23=new Set();checkoutActionOrderV24='';
  const latest=checkoutPaymentGroupsV23(orders)[0]?.method,legacy=orders[0]?.payment;
  checkoutPaymentV23=CHECKOUT_METHODS_V23.includes(latest)?latest:CHECKOUT_METHODS_V23.includes(legacy)?legacy:'PIX';
 }
 const units=checkoutItemUnitsV23(orders);
 [...checkoutSelectedUnitsV23].forEach(unitKey=>{if(!units.some(u=>u.key===unitKey&&u.remainingCents>0))checkoutSelectedUnitsV23.delete(unitKey)});
 const selectedCents=units.filter(u=>checkoutSelectedUnitsV23.has(u.key)).reduce((sum,u)=>sum+u.remainingCents,0);
 const suggestedCents=Math.min(remainingCents,Math.max(1,Math.floor(totalCents/split)));
 const paymentTitle=paidCents?'Escolha a próxima forma de pagamento:':'Escolha a 1ª forma de pagamento:';
 const splitControl='<div class="checkout-split-row-v24"><span>Dividir por:</span><div class="checkout-stepper-v24"><button onclick="'+(context.tableId?'checkoutSplitTableV22(\''+context.tableId+'\',-1)':'checkoutSplitOrderV22(\''+context.orderId+'\',-1)')+'">−</button><b>'+split+'</b><button onclick="'+(context.tableId?'checkoutSplitTableV22(\''+context.tableId+'\',1)':'checkoutSplitOrderV22(\''+context.orderId+'\',1)')+'">+</button></div><strong>'+money((split>1?suggestedCents:remainingCents)/100)+'</strong></div>';
 const contextArgs='\''+(context.tableId||'')+'\',\''+(context.orderId||'')+'\'';
 const paymentButtons='<div class="checkout-primary-payments-v24">'+
  '<button '+(!canReceive||!remainingCents?'disabled':'')+' onclick="checkoutQuickPayV24(\'Dinheiro\','+contextArgs+')">'+icon('currency-dollar')+'<span>Dinheiro</span></button>'+
  '<button '+(!canReceive||!remainingCents?'disabled':'')+' onclick="checkoutChooseCardV24('+contextArgs+')">'+icon('credit-card')+'<span>Cartão</span></button>'+
 '</div><button class="checkout-pix-v24" '+(!canReceive||!remainingCents?'disabled':'')+' onclick="checkoutQuickPayV24(\'PIX\','+contextArgs+')">'+icon('qr-code')+'<span>PIX</span></button>';
 const closeDisabled=!readyToClose||remainingCents;
 openModal('<div class="checkout-shell-v22 checkout-shell-v24">'+
  checkoutTopbarV24(orders,context)+
  '<section class="checkout-main-v22 checkout-main-v24">'+
   '<div class="checkout-customer v24">'+icon('person')+'<b>'+esc(orders[0].customer||'Cliente não identificado')+'</b></div>'+
   '<div class="checkout-orders-scroll-v24"><div class="checkout-orders-list">'+checkoutOrderListV22(orders,context)+'</div></div>'+
  '</section>'+
  '<aside class="checkout-side-v22 checkout-side-v24">'+
   '<div class="checkout-adjust-grid"><button '+(paidCents?'disabled title="Estorne os pagamentos antes de alterar o desconto"':'')+' onclick="'+(context.tableId?'checkoutAdjustTableV22(\''+context.tableId+'\',\'discount\')':'checkoutAdjustOrderV22(\''+context.orderId+'\',\'discount\')')+'">'+icon('percent')+'<span>Desconto</span></button><button '+(paidCents?'disabled title="Estorne os pagamentos antes de alterar o acréscimo"':'')+' onclick="'+(context.tableId?'checkoutAdjustTableV22(\''+context.tableId+'\',\'surcharge\')':'checkoutAdjustOrderV22(\''+context.orderId+'\',\'surcharge\')')+'">'+icon('plus-lg')+'<span>Acréscimo</span></button></div>'+
   '<div class="checkout-summary-v24"><div><span>Subtotal</span><b>'+money(summary.subtotal)+'</b></div>'+(summary.fees?'<div><span>Taxas</span><b>'+money(summary.fees)+'</b></div>':'')+(summary.discount?'<div><span>Desconto</span><b>− '+money(summary.discount)+'</b></div>':'')+(summary.surcharge?'<div><span>Acréscimo</span><b>+ '+money(summary.surcharge)+'</b></div>':'')+'<div class="grand"><span>Valor total:</span><b>'+money(summary.total)+'</b></div></div>'+
   '<div class="checkout-payment-v24"><b>'+paymentTitle+'</b>'+paymentButtons+'</div>'+
   '<div class="checkout-settlement-bottom-v24">'+
    '<div class="checkout-missing-v24"><span>Falta</span><b>'+money(remainingCents/100)+'</b></div>'+
    splitControl+
    '<button class="checkout-select-items-v24 '+(checkoutModeV23==='items'?'active':'')+'" onclick="checkoutSelectItemsV24('+contextArgs+')">'+icon('list-task')+'<span>'+(checkoutModeV23==='items'?'Voltar para conta':'Selecionar itens para pagamento')+'</span>'+(checkoutModeV23==='items'&&selectedCents?'<b>'+money(selectedCents/100)+'</b>':'')+'</button>'+
    checkoutPaymentHistoryV23(orders,context)+
    '<button class="btn btn-block checkout-close-btn v24" '+(closeDisabled?'disabled':'')+' onclick="'+(context.tableId?'closeTableCheckoutV22(\''+context.tableId+'\')':'closeOrderCheckoutV22(\''+context.orderId+'\')')+'"><span>'+(context.tableId?'Fechar conta':'Fechar pedido')+'</span></button>'+
    (!readyToClose?'<small class="checkout-close-help-v24">A conta pode ser paga agora; a mesa só é liberada quando todos os pedidos estiverem prontos.</small>':'')+
   '</div>'+
  '</aside>'+
 '</div>');
}
function checkoutSetModeV23(mode,tableId='',orderId=''){
 if(!['total','split','items'].includes(mode))return;
 checkoutModeV23=mode;checkoutSelectedUnitsV23=new Set();reopenCheckoutV23(tableId,orderId);
}
function checkoutSetPaymentV23(payment,tableId='',orderId=''){
 if(!CHECKOUT_METHODS_V23.includes(payment))return;
 checkoutPaymentV23=payment;reopenCheckoutV23(tableId,orderId);
}
function checkoutToggleItemV23(unitKey,tableId='',orderId=''){
 const orders=checkoutContextOrdersV23(tableId,orderId),unit=checkoutItemUnitsV23(orders).find(u=>u.key===unitKey&&u.remainingCents>0);if(!unit)return;
 if(checkoutSelectedUnitsV23.has(unitKey))checkoutSelectedUnitsV23.delete(unitKey);else checkoutSelectedUnitsV23.add(unitKey);
 reopenCheckoutV23(tableId,orderId);
}
function checkoutAllocatePaymentV23(orders,amountCents,unitKeys=[]){
 let remaining=Math.max(0,Math.round(Number(amountCents)||0));
 const allowed=unitKeys.length?new Set(unitKeys):null,candidates=checkoutItemUnitsV23(orders).filter(u=>u.remainingCents>0&&(!allowed||allowed.has(u.key))),allocations=[];
 for(const unit of candidates){
  if(remaining<=0)break;
  const take=Math.min(unit.remainingCents,remaining);
  if(take>0){allocations.push({orderId:unit.orderId,unitKey:unit.key,amountCents:take});remaining-=take}
 }
 return {allocations,allocatedCents:Math.max(0,Math.round(Number(amountCents)||0))-remaining};
}
function recordCheckoutPaymentV23(orders,amountCents,method,kind='total',unitKeys=[]){
 const requested=Math.min(checkoutRemainingCentsV23(orders),Math.max(0,Math.round(Number(amountCents)||0)));if(!requested)return '';
 const plan=checkoutAllocatePaymentV23(orders,requested,unitKeys);if(plan.allocatedCents!==requested){toast('Não foi possível distribuir todo o valor selecionado.','error');return ''}
 const groupId=uid('pay'),at=new Date().toISOString(),byOrder=new Map();
 plan.allocations.forEach(a=>{if(!byOrder.has(a.orderId))byOrder.set(a.orderId,[]);byOrder.get(a.orderId).push(a)});
 byOrder.forEach((allocations,orderId)=>{
  const o=orders.find(x=>x.id===orderId);if(!o)return;
  const ownCents=allocations.reduce((sum,a)=>sum+a.amountCents,0);
  o.settlements=Array.isArray(o.settlements)?o.settlements:[];
  o.settlements.push({id:uid('st'),groupId,method,kind,amountCents:ownCents,at,allocations:allocations.map(a=>({unitKey:a.unitKey,amountCents:a.amountCents}))});
  o.payment=orderPaymentLabel(o);
 });
 return groupId;
}
async function checkoutReceiveV23(tableId='',orderId='',kind='total'){
 const orders=checkoutContextOrdersV23(tableId,orderId);if(!orders.length||!checkoutCanReceiveV23(orders))return;
 const remaining=checkoutRemainingCentsV23(orders);if(!remaining){toast('A conta já está totalmente recebida.','info');return}
 let amount=remaining,unitKeys=[];
 if(kind==='split'){
  const split=Math.max(1,Number(orders[0]?.splitCount)||1),total=Math.max(0,Math.round(checkoutSummaryV22(orders).total*100));
  amount=Math.min(remaining,Math.max(1,Math.floor(total/split)));
 }else if(kind==='items'){
  unitKeys=checkoutItemUnitsV23(orders).filter(u=>checkoutSelectedUnitsV23.has(u.key)&&u.remainingCents>0).map(u=>u.key);
  amount=checkoutItemUnitsV23(orders).filter(u=>unitKeys.includes(u.key)).reduce((sum,u)=>sum+u.remainingCents,0);
  if(!amount){toast('Selecione pelo menos um produto para receber.','warning');return}
 }
 const ok=await confirmDialog('Registrar pagamento','Receber '+money(amount/100)+' em '+checkoutPaymentV23+'?',{confirmLabel:'Registrar pagamento'});if(!ok)return;
 const fresh=checkoutContextOrdersV23(tableId,orderId);if(!fresh.length||!checkoutCanReceiveV23(fresh))return;
 const id=recordCheckoutPaymentV23(fresh,amount,checkoutPaymentV23,kind,unitKeys);if(!id)return;
 checkoutSelectedUnitsV23=new Set();save({render:false});toast('Pagamento de '+money(amount/100)+' registrado.','success');reopenCheckoutV23(tableId,orderId);
}
async function checkoutSplitItemValueV23(unitOrderId,itemIndex,unitIndex,tableId='',orderId=''){
 const orders=checkoutContextOrdersV23(tableId,orderId);if(!orders.length||!checkoutCanReceiveV23(orders))return;
 const unit=checkoutItemUnitsV23(orders).find(u=>u.orderId===unitOrderId&&u.itemIndex===Number(itemIndex)&&u.unitIndex===Number(unitIndex));if(!unit||unit.remainingCents<=0)return;
 const v=await formDialog({title:'Dividir valor do produto',subtitle:unit.name+' • restante '+money(unit.remainingCents/100),submitLabel:'Registrar parte',fields:[{key:'value',label:'Valor a receber agora',type:'number',value:(unit.remainingCents/200).toFixed(2),min:0.01,max:unit.remainingCents/100,step:'0.01',required:true},{key:'method',label:'Forma de pagamento',type:'select',value:checkoutPaymentV23,options:CHECKOUT_METHODS_V23,required:true}]});if(!v)return;
 const amount=Math.min(unit.remainingCents,Math.max(1,Math.round((Number(v.value)||0)*100))),method=CHECKOUT_METHODS_V23.includes(v.method)?v.method:checkoutPaymentV23;
 const fresh=checkoutContextOrdersV23(tableId,orderId),freshUnit=checkoutItemUnitsV23(fresh).find(u=>u.key===unit.key);if(!freshUnit||freshUnit.remainingCents<=0)return;
 const cents=Math.min(freshUnit.remainingCents,amount),id=recordCheckoutPaymentV23(fresh,cents,method,cents<freshUnit.remainingCents?'item-part':'items',[freshUnit.key]);if(!id)return;
 checkoutPaymentV23=method;save({render:false});toast('Parte de '+money(cents/100)+' registrada para '+unit.name+'.','success');reopenCheckoutV23(tableId,orderId);
}
async function checkoutUndoPaymentV23(groupId,tableId='',orderId=''){
 const orders=checkoutContextOrdersV23(tableId,orderId),group=checkoutPaymentGroupsV23(orders).find(g=>g.id===groupId);if(!group)return;
 const ok=await confirmDialog('Estornar pagamento','Estornar '+money(group.amountCents/100)+' recebido em '+group.method+'?',{confirmLabel:'Estornar',danger:true});if(!ok)return;
 orders.forEach(o=>{
  o.settlements=(o.settlements||[]).filter(s=>String(s.groupId||s.id)!==String(groupId));
  o.payment=o.settlements.length?orderPaymentLabel(o):'Não registrado';
 });
 save({render:false});toast('Pagamento estornado.','success');reopenCheckoutV23(tableId,orderId);
}
async function checkoutAdjustOrderV22(id,kind){
 const o=editableCheckoutOrderV22(id);if(!o)return;
 if((o.settlements||[]).length){toast('Estorne os pagamentos antes de alterar desconto ou acréscimo.','warning');return}
 const v=await formDialog({title:kind==='discount'?'Desconto':'Acréscimo',fields:[{key:'value',label:'Valor',type:'number',value:Number(o[kind])||0,min:0,step:'0.01',required:true}]});if(!v)return;
 if(!editableCheckoutOrderV22(id))return;
 const value=Math.max(0,Number(v.value)||0);
 o[kind]=kind==='discount'?Math.min(value,orderSubtotal(o)+orderFeeTotal(o)+Math.max(0,Number(o.surcharge)||0)):value;save({render:false});openOrderCheckoutV22(id,true);
}
async function checkoutAdjustTableV22(id,kind){
 const t=state.tables.find(x=>x.id===id);if(!t)return;
 const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));if(!orders.length)return;
 if(checkoutPaidCentsV23(orders)){toast('Estorne os pagamentos antes de alterar desconto ou acréscimo.','warning');return}
 const current=orders.reduce((s,o)=>s+Math.max(0,Number(o[kind])||0),0);
 const v=await formDialog({title:kind==='discount'?'Desconto da conta':'Acréscimo da conta',fields:[{key:'value',label:'Valor total',type:'number',value:current,min:0,step:'0.01',required:true}]});if(!v)return;
 if(orders.some(o=>!editableCheckoutOrderV22(o.id)))return;
 const bases=orders.map(o=>Math.round((orderSubtotal(o)+orderFeeTotal(o)+(kind==='discount'?Math.max(0,Number(o.surcharge)||0):0))*100)),sum=bases.reduce((a,b)=>a+b,0);
 const requested=Math.round(Math.max(0,Number(v.value)||0)*100),cents=kind==='discount'?Math.min(requested,sum):requested;
 let cumulative=0,allocated=0;
 orders.forEach((o,i)=>{cumulative+=sum?bases[i]:1;const next=Math.round(cents*cumulative/(sum||orders.length));o[kind]=(next-allocated)/100;allocated=next});
 save({render:false});openTableCheckoutV22(id,true);
}
function checkoutSetOrderPaymentV22(id,payment){const o=editableCheckoutOrderV22(id);if(!o)return;o.payment=payment;checkoutPaymentV23=CHECKOUT_METHODS_V23.includes(payment)?payment:checkoutPaymentV23;save({render:false});openOrderCheckoutV22(id,true)}
function checkoutSetTablePaymentV22(id,payment){const t=state.tables.find(x=>x.id===id);if(!t)return;state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status)).forEach(o=>o.payment=payment);checkoutPaymentV23=CHECKOUT_METHODS_V23.includes(payment)?payment:checkoutPaymentV23;save({render:false});openTableCheckoutV22(id,true)}
function checkoutSplitOrderV22(id,delta){const o=editableCheckoutOrderV22(id);if(!o)return;const next=Math.min(20,Math.max(1,(Number(o.splitCount)||1)+delta));o.splitCount=next;if(checkoutModeV23!=='items')checkoutModeV23=next>1?'split':'total';save({render:false});openOrderCheckoutV22(id,true)}
function checkoutSplitTableV22(id,delta){const t=state.tables.find(x=>x.id===id);if(!t)return;const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status)),next=Math.min(20,Math.max(1,(Number(orders[0]?.splitCount)||1)+delta));orders.forEach(o=>o.splitCount=next);if(checkoutModeV23!=='items')checkoutModeV23=next>1?'split':'total';save({render:false});openTableCheckoutV22(id,true)}
async function closeOrderCheckoutV22(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 if(o.type==='Delivery'){toast('Pedidos delivery devem ser finalizados pelo fluxo de Entregas.','warning');return}
 if(o.status!=='ready'){toast('Somente pedidos prontos podem ser recebidos.','warning');return}
 if(!checkoutHasPaymentV22([o]))return;
 const ok=await confirmDialog('Concluir pedido','Confirmar recebimento total de '+money(orderTotal(o))+' e concluir o pedido #'+id+'?',{confirmLabel:'Concluir pedido'});if(!ok)return;
 if(o.status!=='ready')return;
 if((o.settlements||[]).length)o.payment=orderPaymentLabel(o);
 o.status='done';o.completedAt=new Date().toISOString();globalThis.dispatchAutoPrintEvent?.('completed',o);closeModal();syncTables();
 const t=state.tables.find(t=>t.name===o.table);
 if(t&&!state.orders.some(x=>x.table===t.name&&!['done','cancelled'].includes(x.status))){t.status='free';t.guests=0;t.server=''}
 save();toast('Conta fechada com sucesso.','success');
}
async function closeTableCheckoutV22(id){
 const t=state.tables.find(x=>x.id===id);if(!t)return;
 const orders=state.orders.filter(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));
 if(!orders.length){toast('Esta mesa não possui pedidos abertos.','warning');return}
 if(orders.some(o=>o.status!=='ready'||o.type==='Delivery')){toast('Todos os pedidos da mesa precisam estar prontos para recebimento.','warning');return}
 if(!checkoutHasPaymentV22(orders))return;
 const total=orders.reduce((s,o)=>s+orderTotal(o),0),ok=await confirmDialog('Concluir conta','Confirmar que '+money(total)+' foi totalmente recebido e liberar '+t.name+'?',{confirmLabel:'Concluir e liberar'});if(!ok)return;
 orders.forEach(o=>{if((o.settlements||[]).length)o.payment=orderPaymentLabel(o);o.status='done';o.completedAt=new Date().toISOString();globalThis.dispatchAutoPrintEvent?.('completed',o)});t.status='free';t.guests=0;t.server='';closeModal();save();toast('Conta concluída e mesa liberada.','success');
}
function editableCheckoutOrderV22(id){
 const o=state.orders.find(x=>x.id===id);
 return o&&!['done','cancelled'].includes(o.status)?o:null;
}
function checkoutHasPaymentV22(orders){
 const total=Math.max(0,Math.round(checkoutSummaryV22(orders).total*100)),paid=checkoutPaidCentsV23(orders);
 if(paid>0){
  if(paid<total){toast('Ainda falta receber '+money((total-paid)/100)+' antes de concluir a conta.','warning');return false}
  return true;
 }
 if(orders.some(o=>!o.payment||o.payment==='Não registrado')){toast('Registre o pagamento antes de concluir a conta.','warning');return false}
 return true;
}
