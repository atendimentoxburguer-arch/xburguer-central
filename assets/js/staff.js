/* Operação conectada da equipe — ações limitadas ao perfil autenticado */
(function(){
 const api=globalThis.XBPlatform;
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const message=text=>document.getElementById('staffMessage').textContent=text;
 let workspace=null,submitting=false,key=crypto.randomUUID().replaceAll('-',''),lastPayload='';
 async function refresh(first=false){
  try{
   workspace=await api.request('workspace');document.getElementById('staffName').textContent=workspace.user.name;
   const canProgress=['admin','cashier','kitchen'].includes(workspace.user.role);
   document.getElementById('staffOrders').innerHTML=workspace.orders.map(o=>
    '<article class="card"><h3>'+escape(o.table||o.type)+' · '+escape(o.id)+'</h3><p>'+o.items.map(i=>i.quantity+' × '+escape(i.name)).join('<br>')+'</p><p>'+escape(o.notes)+'</p>'+
    (o.scheduledAt?'<p>Agendado: '+escape(new Date(o.scheduledAt).toLocaleString('pt-BR'))+'</p>':'')+
    '<p>'+escape({analysis:'Em análise',production:'Em preparo',ready:'Pronto'}[o.status]||o.status)+'</p>'+
    (canProgress&&o.status!=='ready'?'<button class="btn btn-primary" data-order="'+escape(o.id)+'" data-status="'+(o.status==='analysis'?'production':'ready')+'">'+(o.status==='analysis'?'Iniciar preparo':'Marcar pronto')+'</button>':'')+'</article>').join('')||'<div class="card">Nenhum pedido em andamento.</div>';
   document.getElementById('staffSale').hidden=workspace.user.role==='kitchen';
   if(first){
    document.getElementById('staffTable').innerHTML=workspace.tables.map(t=>'<option value="'+escape(t.id)+'">'+escape(t.name)+'</option>').join('');
    document.getElementById('staffProducts').innerHTML=workspace.catalog.products.map((p,i)=>'<div class="staff-product"><label for="staffQty'+i+'">'+escape(p.name)+'</label><input id="staffQty'+i+'" type="number" data-product="'+escape(p.id)+'" min="0" max="99" value="0"></div>').join('');
   }
  }catch(error){if(error.status===401){location.replace('index.html');return}message(error.message)}
 }
 document.getElementById('staffOrders').onclick=async event=>{
  const button=event.target.closest('[data-order]');if(!button)return;button.disabled=true;
  try{await api.request('workspace/status',{method:'POST',data:{id:button.dataset.order,status:button.dataset.status}});await refresh()}
  catch(error){message(error.message);button.disabled=false}
 };
 document.getElementById('staffForm').onsubmit=async event=>{
  event.preventDefault();if(submitting)return;submitting=true;
  const button=event.target.querySelector('button');button.disabled=true;
  try{
   const payload={name:document.getElementById('staffCustomer').value,type:'Mesa',tableId:document.getElementById('staffTable').value,
    items:[...document.querySelectorAll('[data-product]')].map(el=>({id:el.dataset.product,quantity:Number(el.value)})).filter(i=>i.quantity>0)};
   const serialized=JSON.stringify(payload);if(lastPayload&&lastPayload!==serialized)key=crypto.randomUUID().replaceAll('-','');lastPayload=serialized;
   await api.request('workspace/order',{method:'POST',headers:{'Idempotency-Key':key},data:payload});
   key=crypto.randomUUID().replaceAll('-','');lastPayload='';event.target.reset();message('Pedido confirmado e enviado à operação.');await refresh();
  }catch(error){message(error.message)}
  finally{submitting=false;button.disabled=false}
 };
 document.getElementById('staffLogout').onclick=async()=>{await api.request('logout',{method:'POST',data:{}});location.replace('index.html')};
 if(globalThis.XB_RUNTIME?.connected){refresh(true);setInterval(()=>refresh(),10000)}else message('Esta área exige o servidor conectado.');
})();
