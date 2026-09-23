/* X Burguer Central V18 — PDV, vendas e roteamento de impressão */
function renderPdv(editOrder=null){const incomingId=editOrder?.id||'';if(incomingId&&incomingId!==pdvEditingId){pdvCustomerDraft=editOrder?.customer||'';pdvPayDraft=editOrder?.payment||'PIX'}pdvEditingId=incomingId;const root=document.getElementById('pdv');const cats=[{id:'all',name:'Todos'},...state.categories];const list=state.products.filter(p=>(pdvCat==='all'||p.cat===pdvCat)&&p.active);root.innerHTML=`<div class="page-head"><div><h1>Pedidos balcão (PDV)</h1><p>Venda rápida para balcão, retirada, delivery ou mesa.</p></div><button class="btn btn-outline" onclick="pdvCart=[];pdvCustomerDraft='';pdvPayDraft='PIX';pdvEditingId='';renderPdv()">Limpar pedido</button></div><div class="pdv"><div><div class="pdv-categories">${cats.map(c=>`<button class="chip ${pdvCat===c.id?'active':''}" onclick="pdvCat='${c.id}';renderPdv()">${esc(c.name)}</button>`).join('')}</div><div class="pdv-products">${list.map(p=>`<button type="button" class="product-tile ${p.sold?'sold':''}" ${p.sold?'disabled':''} onclick="addCart('${p.id}')"><div class="photo">${productMedia(p,'pdv-product-image')}</div><b>${esc(p.name)}</b><div class="price">${money(p.price)}</div></button>`).join('')}</div></div><div class="cart"><h3>${editOrder?'Editando pedido #'+editOrder.id:'Novo pedido'}</h3><div class="field"><label>Tipo</label><select id="pdvType" onchange="pdvType=this.value;updatePdvTotals()"><option ${pdvType==='Balcão'?'selected':''}>Balcão</option><option ${pdvType==='Retirada'?'selected':''}>Retirada</option><option ${pdvType==='Delivery'?'selected':''}>Delivery</option><option ${pdvType==='Mesa'?'selected':''}>Mesa</option></select></div><div id="cartRows">${pdvCart.map((i,n)=>{const p=product(i.p);return `<div class="cart-row"><div><b>${esc(p?.name||'Item')}</b><div class="muted">${money(i.price)}</div></div><div class="qty"><button onclick="cartQty(${n},-1)">−</button><b>${i.q}</b><button onclick="cartQty(${n},1)">+</button></div></div>`}).join('')||'<div class="empty">Clique nos produtos para adicionar.</div>'}</div><div class="cart-summary"><div><span>Subtotal</span><b id="pdvSubtotal">${money(pdvCart.reduce((s,i)=>s+i.q*i.price,0))}</b></div><div id="pdvFeeLine"><span id="pdvFeeLabel">Taxas</span><b id="pdvFeeValue">${money(0)}</b></div></div><div class="cart-total"><span>Total</span><span id="pdvGrandTotal">${money(pdvCart.reduce((s,i)=>s+i.q*i.price,0))}</span></div><div class="field"><label>Cliente / identificador</label><input id="pdvCustomer" value="${esc(pdvCustomerDraft)}" oninput="pdvCustomerDraft=this.value" placeholder="Nome do cliente"></div><div class="field"><label>Pagamento</label><select id="pdvPay" onchange="pdvPayDraft=this.value">${['PIX','Dinheiro','Cartão (Débito)','Cartão (Crédito)','Não registrado'].map(v=>`<option ${pdvPayDraft===v?'selected':''}>${v}</option>`).join('')}</select></div><button class="btn btn-primary btn-block" onclick="finishPdv('${editOrder?.id||''}')">${editOrder?'Salvar alterações':'Criar pedido'}</button></div></div>`;updatePdvTotals()}
function updatePdvTotals(){const subtotal=pdvCart.reduce((s,i)=>s+i.q*i.price,0),type=document.getElementById('pdvType')?.value||pdvType;let fee=0,label='Taxas';if(type==='Delivery'){fee=Math.max(0,Number(state.settings.deliveryFee)||0);label='Taxa de entrega'}else if(type==='Mesa'){fee=subtotal*Math.max(0,Number(state.settings.serviceFee)||0)/100;label='Serviço ('+Number(state.settings.serviceFee||0)+'%)'}const line=document.getElementById('pdvFeeLine'),labelEl=document.getElementById('pdvFeeLabel'),feeEl=document.getElementById('pdvFeeValue'),total=document.getElementById('pdvGrandTotal');if(labelEl)labelEl.textContent=label;if(feeEl)feeEl.textContent=money(fee);if(total)total.textContent=money(subtotal+fee);if(line)line.hidden=fee<=0}
function addCart(id){const p=product(id);if(!p||p.sold||p.stock<=0){toast('Produto esgotado.','warning');return}const e=pdvCart.find(i=>i.p===id);if(e){if(e.q>=p.stock){toast('Quantidade máxima disponível atingida.','warning');return}e.q++}else pdvCart.push({p:id,q:1,price:p.price});renderPdv()}
function cartQty(n,d){
 const line=pdvCart[n];if(!line)return;
 const p=product(line.p);if(!p)return;
 if(d>0){
  const editing=state.orders.find(o=>o.id===pdvEditingId);
  const original=editing?.items?.find(i=>i.p===line.p);
  const max=(Number(p.stock)||0)+(Number(original?.q)||0);
  if(line.q>=max){toast('Quantidade máxima disponível atingida.','warning');return}
 }
 line.q+=d;
 if(line.q<=0)pdvCart.splice(n,1);
 renderPdv(state.orders.find(o=>o.id===pdvEditingId)||null);
}
async function finishPdv(editId=''){
 if(!pdvCart.length){toast('Adicione pelo menos um item.','warning');return}
 const type=document.getElementById('pdvType')?.value||pdvType||'Balcão',customer=(document.getElementById('pdvCustomer')?.value||pdvCustomerDraft).trim()||'Não identificado',pay=document.getElementById('pdvPay')?.value||pdvPayDraft||'Não registrado';
 const existing=editId?state.orders.find(o=>o.id===editId):null;
 let table=existing?.table||'',address=existing?.address||'',phone=existing?.phone||'';
 if(type==='Mesa'){
  address='';if(pdvDraftTable)table=pdvDraftTable;
  if(!table){const v=await formDialog({title:'Vincular mesa',fields:[{key:'table',label:'Mesa',type:'select',value:'Mesa 1',options:state.tables.map(t=>t.name),required:true}]});if(!v)return;table=v.table}
 }else if(type==='Delivery'){
  table='';
  if(!address||existing?.type!=='Delivery'){const v=await formDialog({title:'Dados da entrega',fields:[{key:'address',label:'Endereço',value:address,required:true,full:true},{key:'phone',label:'Telefone',value:phone,placeholder:'(62) 9____-____'}]});if(!v)return;address=v.address.trim();phone=v.phone.trim()}
 }else{table='';address=''}
 const matchedCustomer=state.customers.find(c=>phone&&c.phone&&c.phone===phone)||state.customers.find(c=>c.name.trim().toLowerCase()===customer.trim().toLowerCase());
 const customerId=matchedCustomer?.id||'';
 const oldQty=new Map((existing?.items||[]).map(i=>[i.p,Number(i.q)||0]));
 let createdOrder=null;
 for(const i of pdvCart){const p=product(i.p),available=(Number(p?.stock)||0)+(oldQty.get(i.p)||0);if(!p||(p.sold&&!(oldQty.get(i.p)>0))||available<i.q){toast(`Estoque insuficiente para ${p?.name||'um item'}.`,'error');return}}
 if(existing){
  const newQty=new Map(pdvCart.map(i=>[i.p,Number(i.q)||0])),ids=new Set([...oldQty.keys(),...newQty.keys()]);
  ids.forEach(pid=>{
   const p=product(pid);if(!p)return;
   const before=oldQty.get(pid)||0,after=newQty.get(pid)||0,delta=before-after;
   p.stock=Math.max(0,(Number(p.stock)||0)+delta);
   p.sold=Boolean(p.manualSold||p.stock<=0);
   if(delta)recordStockMovement(pid,delta,'Edição de pedido',existing.id);
  });
  Object.assign(existing,{items:pdvCart.map(x=>({...x,cost:Number(product(x.p)?.cost)||0})),customer,customerId,payment:pay,type,table,address,phone,deliveryFee:type==='Delivery'?Math.max(0,Number(state.settings.deliveryFee)||0):0,serviceFeePct:type==='Mesa'?Math.max(0,Number(state.settings.serviceFee)||0):0});
 }else{
  const id=String(Math.max(...state.orders.map(o=>Number(o.id)||0),77500)+1);
  createdOrder={id,type,table,customer,customerId,phone,address,payment:pay,status:state.settings.autoAccept?'production':'analysis',createdAt:new Date().toISOString(),deliveryFee:type==='Delivery'?Math.max(0,Number(state.settings.deliveryFee)||0):0,serviceFeePct:type==='Mesa'?Math.max(0,Number(state.settings.serviceFee)||0):0,items:pdvCart.map(x=>({...x,cost:Number(product(x.p)?.cost)||0})),notes:'',courier:'',scheduled:false};
  state.orders.push(createdOrder);
  pdvCart.forEach(i=>{const p=product(i.p);if(p&&Number.isFinite(p.stock)){p.stock=Math.max(0,p.stock-i.q);p.sold=Boolean(p.manualSold||p.stock<=0);recordStockMovement(p.id,-Number(i.q||0),'Venda',id)}})
 }
 pdvCart=[];pdvDraftTable='';pdvEditingId='';pdvCustomerDraft='';pdvPayDraft='PIX';syncTables();save();
 if(createdOrder){
  globalThis.dispatchAutoPrintEvent?.('created',createdOrder);
  if(createdOrder.status==='production')globalThis.dispatchAutoPrintEvent?.('production',createdOrder);
 }
 go('pedidos');toast('Pedido salvo com sucesso.','success');
}
