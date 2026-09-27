import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let tones=0,audioInstance;
class AudioMock{
 constructor(){this.state='suspended';this.currentTime=0;audioInstance=this}
 async resume(){this.state='running'}
 createOscillator(){return {frequency:{},connect(){},disconnect(){},start(){tones++},stop(){this.onended?.()}}}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
}
const button={setAttribute(name,value){this[name]=value}},banner={hidden:true},count={textContent:''};
const elements={orderAlerts:banner,orderAlertsCount:count,ordersLateCount:{}};
const timers=new Map(),listeners=new Map();let seq=0;
const context=vm.createContext({
 console,AudioContext:AudioMock,state:{orders:[{id:'old',createdAt:'2026-09-27',status:'analysis'}]},
 toast(){},orderAge:o=>o.age||0,
 document:{visibilityState:'visible',getElementById:id=>elements[id]||null,
  querySelectorAll:selector=>selector==='[data-order-sound]'?[button]:[],
  addEventListener(name,fn){listeners.set(name,fn)}},
 setTimeout(fn){const id=++seq;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}
});
vm.runInContext(fs.readFileSync('assets/js/order-alerts.js','utf8'),context);
context.initOrderAlerts();context.initOrderAlerts();context.syncOrderAlerts();
assert.equal(banner.hidden,true,'Pedidos carregados não são avisos novos');
assert.equal(tones,0);assert.equal(timers.size,1);
await context.toggleOrderSound();
assert.equal(button['aria-pressed'],'true');assert.equal(tones,1,'Ativação toca uma amostra');
context.state.orders.push({id:'new',createdAt:'now',status:'analysis'});
context.syncOrderAlerts();context.syncOrderAlerts();
assert.equal(banner.hidden,false);assert.equal(tones,2,'Salvar novamente não repete o alerta');
assert.match(count.textContent,/1 novo/);
context.state.orders.at(-1).status='production';context.syncOrderAlerts();
assert.equal(tones,2,'Aceite automático/transição não repete o alerta');
context.acknowledgeOrderAlerts();context.syncOrderAlerts();
assert.equal(banner.hidden,true);assert.equal(tones,2);
context.state.orders.push({id:'auto',createdAt:'now',status:'production'});context.syncOrderAlerts();
assert.equal(tones,3,'Pedidos novos já aceitos também são avisados');
context.state.orders.at(-1).status='done';context.syncOrderAlerts();assert.equal(banner.hidden,true);
context.state.orders.push({id:'import',status:'analysis'});context.resetOrderAlerts();context.syncOrderAlerts();
assert.equal(tones,3,'Restauração de backup redefine a referência sem avisar');
await context.toggleOrderSound();assert.equal(button['aria-pressed'],'false');
context.state.orders.push({id:'silent',status:'ready'});context.syncOrderAlerts();
assert.equal(tones,3);assert.equal(banner.hidden,false,'Silenciar mantém o aviso visual');
await context.toggleOrderSound();audioInstance.state='suspended';audioInstance.onstatechange();
assert.equal(button['aria-pressed'],'false','Suspensão não deixa o botão prometer som ativo');
context.AudioContext=undefined;await context.toggleOrderSound();assert.equal(button['aria-pressed'],'false');
listeners.get('visibilitychange')();listeners.get('visibilitychange')();assert.equal(timers.size,1);
// Relógio altera somente os indicadores, preservando os elementos e filtros.
const warning={},minutes={},classes=new Set();
const card={dataset:{orderClock:'clock'},classList:{toggle(name,on){on?classes.add(name):classes.delete(name)}},querySelector:s=>s==='[data-order-late]'?warning:minutes};
context.document.querySelectorAll=s=>s==='[data-order-clock]'?[card]:[];
context.state.orders=[{id:'clock',status:'production',age:36}];
context.refreshOrderTimes();assert.equal(classes.has('late'),true);assert.equal(warning.hidden,false);
assert.equal(minutes.textContent,'36 min');assert.equal(elements.ordersLateCount.textContent,'1 com atraso');
context.state.orders[0].status='ready';context.refreshOrderTimes();assert.equal(classes.has('late'),false);
console.log('Order alerts contracts OK');
