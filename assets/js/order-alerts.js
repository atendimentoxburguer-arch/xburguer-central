/* Alertas locais de pedidos e atualização dos tempos da operação */
(function(){
 'use strict';
 let started=false,timer=null,audio=null,sound=false,activating=false;
 let seen=new Set(),unread=new Set();
 const key=o=>String(o.id)+'@'+String(o.createdAt||'');
 const active=o=>['analysis','production','ready'].includes(o.status);

 function updateControls(){
  document.querySelectorAll('[data-order-sound]').forEach(button=>{
   button.textContent=sound?'Silenciar pedidos':'Ativar som dos pedidos';
   button.setAttribute('aria-pressed',String(sound));
   button.disabled=activating;
  });
  const banner=document.getElementById('orderAlerts');
  if(banner)banner.hidden=unread.size===0;
  const count=document.getElementById('orderAlertsCount');
  const message=unread.size+' novo(s) pedido(s) para acompanhar.';
  if(count&&count.textContent!==message)count.textContent=message;
  const orders=new Map(state.orders.map(o=>[String(o.id),o]));
  document.querySelectorAll('[data-new-order]').forEach(badge=>{
   const order=orders.get(badge.dataset.newOrder);
   badge.hidden=!order||!unread.has(key(order));
  });
 }
 function beep(){
  if(!sound||audio?.state!=='running')return;
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  oscillator.frequency.value=880;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(0.12,now+0.02);
  gain.gain.linearRampToValueAtTime(0,now+0.35);
  oscillator.connect(gain);gain.connect(audio.destination);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
  oscillator.start(now);oscillator.stop(now+0.36);
 }
 async function toggleOrderSound(){
  if(activating)return;
  if(sound){sound=false;updateControls();return}
  activating=true;updateControls();
  try{
   const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Audio)throw new Error('Áudio indisponível');
   if(!audio||audio.state==='closed'){
    audio=new Audio();
    audio.onstatechange=()=>{if(audio.state!=='running'){sound=false;updateControls()}};
   }
   await audio.resume();
   if(audio.state!=='running')throw new Error('Áudio bloqueado');
   sound=true;beep();
  }catch(error){sound=false;toast('Não foi possível ativar o som. Os avisos visuais continuam disponíveis.','warning')}
  finally{activating=false;updateControls()}
 }
 function resetOrderAlerts(){
  seen=new Set(state.orders.map(key));unread.clear();updateControls();
 }
 function syncOrderAlerts(){
  if(!started)return;
  const arrived=state.orders.filter(o=>active(o)&&!seen.has(key(o)));
  state.orders.forEach(o=>seen.add(key(o)));
  const current=new Set(state.orders.filter(active).map(key));
  unread=new Set([...unread].filter(id=>current.has(id)));
  arrived.forEach(o=>unread.add(key(o)));
  updateControls();
  if(arrived.length){try{beep()}catch(error){sound=false;updateControls()}}
 }
 function acknowledgeOrderAlerts(){unread.clear();updateControls()}
 function refreshOrderTimes(){
  const orders=new Map(state.orders.map(o=>[String(o.id),o]));
  document.querySelectorAll('[data-order-clock]').forEach(card=>{
   const order=orders.get(card.dataset.orderClock);if(!order)return;
   const age=orderAge(order),late=order.status==='production'&&age>35;
   card.classList.toggle('late',late);
   const warning=card.querySelector('[data-order-late]');if(warning)warning.hidden=!late;
   const minutes=card.querySelector('[data-order-minutes]');if(minutes)minutes.textContent=age+' min';
  });
  const lateCount=document.getElementById('ordersLateCount');
  if(lateCount)lateCount.textContent=state.orders.filter(o=>o.status==='production'&&orderAge(o)>35).length+' com atraso';
 }
 function tick(){
  clearTimeout(timer);
  if(document.visibilityState!=='hidden')refreshOrderTimes();
  timer=setTimeout(tick,30000);
 }
 function initOrderAlerts(){
  if(started)return;
  started=true;resetOrderAlerts();tick();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick()});
 }
 Object.assign(globalThis,{initOrderAlerts,syncOrderAlerts,resetOrderAlerts,toggleOrderSound,acknowledgeOrderAlerts,refreshOrderTimes,updateOrderAlertControls:updateControls});
})();
