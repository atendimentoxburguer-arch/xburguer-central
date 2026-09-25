/* Cardápio público — preços finais e estoque sempre confirmados pelo servidor */
(function(){
 const api=globalThis.XBPlatform,cart=new Map(),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const format=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const message=text=>document.getElementById('shopMessage').textContent=text;
 let catalog=null,key=crypto.randomUUID().replaceAll('-',''),lastPayload='',submitting=false,quote=null,quoteSequence=0;
 const params=new URLSearchParams(location.hash.slice(1)),tableToken=params.get('mesa');
 const form=document.getElementById('checkout');
 const jump=document.createElement('button');jump.type='button';jump.hidden=true;jump.className='cart-jump btn btn-primary';jump.textContent='Ver meu pedido';document.body.append(jump);
 jump.onclick=()=>document.querySelector('.commerce-cart').scrollIntoView({behavior:'smooth',block:'start'});
 async function updateQuote(){
  const sequence=++quoteSequence;quote=null;document.getElementById('sendOrder').disabled=true;
  if(!cart.size){document.getElementById('cartTotal').textContent='Seu pedido está vazio.';return}
  document.getElementById('cartTotal').textContent='Calculando total…';
  try{
   const result=await api.request('public/quote',{method:'POST',data:{type:tableToken?'Mesa':form.type.value,coupon:form.coupon.value,
    items:[...cart].map(([id,quantity])=>({id,quantity}))}});
   if(sequence!==quoteSequence)return;
   quote=result;document.getElementById('cartTotal').textContent='Produtos '+format(result.subtotal)+' · Taxas '+format(result.fee)+
    (result.discount?' · Desconto −'+format(result.discount):'')+' · Total '+format(result.totalCents);
   jump.textContent='Ver pedido · '+format(result.totalCents);
   document.getElementById('sendOrder').disabled=submitting;
  }catch(error){if(sequence===quoteSequence)document.getElementById('cartTotal').textContent=error.message}
 }
 function renderCart(){
  document.getElementById('cart').innerHTML=[...cart].map(([id,quantity])=>{
   const p=catalog.products.find(p=>p.id===id);return '<div class="cart-line"><span>'+quantity+' × '+escape(p.name)+'<br><b>'+format(p.priceCents*quantity)+'</b></span><button type="button" class="btn btn-outline" data-remove="'+escape(id)+'" aria-label="Remover uma unidade de '+escape(p.name)+'">−</button></div>';
  }).join('')||'<p class="muted">Escolha os produtos para começar.</p>';
  jump.textContent='Ver pedido · '+[...cart.values()].reduce((a,b)=>a+b,0)+' item(ns)';jump.hidden=!cart.size;
  updateQuote();
 }
 function renderProducts(){
  const search=document.getElementById('productSearch').value.toLocaleLowerCase('pt-BR');
  document.getElementById('catalog').innerHTML=catalog.products.filter(p=>p.name.toLocaleLowerCase('pt-BR').includes(search)).map(p=>
   '<article class="card commerce-product">'+(p.image&&p.image.startsWith('data:image/')?'<img src="'+escape(p.image)+'" alt="">':'<span class="emoji" aria-hidden="true">'+escape(p.emoji)+'</span>')+'<h3>'+escape(p.name)+'</h3><strong>'+format(p.priceCents)+'</strong><button type="button" class="btn btn-primary" data-add="'+escape(p.id)+'" '+(!catalog.store.open?'disabled':'')+'>Adicionar</button></article>').join('')||'<p>Nenhum produto disponível.</p>';
 }
 async function track(token){
  try{const order=await api.request('public/tracking',{method:'POST',data:{token}});
   const labels={analysis:'Recebido pela loja',production:'Em preparo',ready:'Pronto',done:'Concluído',cancelled:'Cancelado'};
   message('Pedido '+order.id+' · '+(labels[order.status]||order.status)+(order.scheduledAt?' · Agendado para '+new Date(order.scheduledAt).toLocaleString('pt-BR'):'')+' · Total '+format(order.totalCents));
  }catch(error){message(error.message)}
 }
 form.type.onchange=()=>{document.getElementById('addressField').hidden=form.type.value!=='Delivery';form.address.required=form.type.value==='Delivery';if(catalog)renderCart()};
 document.getElementById('productSearch').oninput=renderProducts;
 form.coupon.oninput=()=>{clearTimeout(updateQuote.timer);quote=null;document.getElementById('sendOrder').disabled=true;updateQuote.timer=setTimeout(updateQuote,300)};
 document.getElementById('catalog').onclick=event=>{if(submitting)return;const id=event.target.closest('[data-add]')?.dataset.add;if(id){cart.set(id,Math.min(99,(cart.get(id)||0)+1));renderCart()}};
 document.getElementById('cart').onclick=event=>{if(submitting)return;const id=event.target.closest('[data-remove]')?.dataset.remove;if(id){const count=cart.get(id)-1;if(count)cart.set(id,count);else cart.delete(id);renderCart()}};
 form.onsubmit=async event=>{
  event.preventDefault();if(submitting)return;
  if(!cart.size){message('Adicione pelo menos um produto.');return}
  if(!quote){message('Aguarde a confirmação do total.');return}
  submitting=true;document.getElementById('sendOrder').disabled=true;
  try{
   const payload=Object.fromEntries(new FormData(form));payload.items=[...cart].map(([id,quantity])=>({id,quantity}));payload.expectedTotalCents=quote.totalCents;
   if(tableToken){payload.type='Mesa';payload.tableToken=tableToken}
   if(payload.scheduledAt)payload.scheduledAt=new Date(payload.scheduledAt).toISOString();
   const serialized=JSON.stringify(payload);if(lastPayload&&lastPayload!==serialized)key=crypto.randomUUID().replaceAll('-','');lastPayload=serialized;
   const result=await api.request('public/orders',{method:'POST',headers:{'Idempotency-Key':key},data:payload});
   cart.clear();renderCart();form.hidden=true;history.replaceState(null,'','#pedido='+result.trackingToken);
   await track(result.trackingToken);setInterval(()=>track(result.trackingToken),15000);
   const again=document.createElement('a');again.className='btn btn-outline';again.href='loja.html'+(tableToken?'#mesa='+encodeURIComponent(tableToken):'');again.textContent='Fazer outro pedido';document.querySelector('.commerce-cart').append(again);
  }catch(error){message(error.message);if(error.status===409)await updateQuote()}
  finally{submitting=false;document.getElementById('sendOrder').disabled=!quote}
 };
 async function start(){
  if(!globalThis.XB_RUNTIME?.connected){message('O cardápio online ficará disponível no endereço do servidor após a migração.');form.hidden=true;return}
  try{
   catalog=await api.request('public/menu');document.getElementById('storeName').textContent=catalog.store.name;
   document.getElementById('storeStatus').textContent=catalog.store.open?'Loja aberta · Faça seu pedido':'Loja fechada no momento';
   if(tableToken){form.type.innerHTML='<option>Mesa</option>';form.phone.required=false;form.scheduledAt.parentElement.hidden=true}
   renderProducts();renderCart();
   if(params.get('pedido')){form.hidden=true;await track(params.get('pedido'));setInterval(()=>track(params.get('pedido')),15000)}
  }catch(error){message(error.message);form.hidden=true}
 }
 start();
})();
