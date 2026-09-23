import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context=vm.createContext({
  console,Date,Math,Blob,URL,setTimeout,clearTimeout,
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  document:{
    documentElement:{setAttribute(){}},
    getElementById(){return null},
    querySelector(){return null},
    createElement(){return {click(){},remove(){},style:{}}},
    body:{appendChild(){}}
  },
  navigator:{onLine:true},
  globalThis:null
});
context.globalThis=context;
context.toast=()=>{};
context.confirmDialog=async()=>true;
vm.runInContext(fs.readFileSync('assets/js/core.js','utf8'),context,{filename:'core.js'});
vm.runInContext(fs.readFileSync('assets/js/orders.js','utf8'),context,{filename:'orders.js'});
vm.runInContext('save=function(){return true}',context);

vm.runInContext('state=defaultState();normalize()',context);
const deliveryId=vm.runInContext("state.orders.find(o=>o.type==='Delivery').id",context);
vm.runInContext(`{const o=state.orders.find(x=>x.id==='${deliveryId}');o.status='ready';o.courier='';advanceOrder(o.id)}`,context);
assert.equal(vm.runInContext(`state.orders.find(x=>x.id==='${deliveryId}').status`,context),'ready','Delivery sem entregador não pode ser finalizado');

const courierBefore=vm.runInContext("state.couriers.find(d=>d.id==='d1').deliveries",context);
vm.runInContext(`{const o=state.orders.find(x=>x.id==='${deliveryId}');o.courier='d1';advanceOrder(o.id)}`,context);
assert.equal(vm.runInContext(`state.orders.find(x=>x.id==='${deliveryId}').status`,context),'done');
assert.equal(vm.runInContext("state.couriers.find(d=>d.id==='d1').deliveries",context),courierBefore+1);

vm.runInContext(`
  {
    const p=state.products.find(x=>x.id==='p1');
    p.stock=0;p.manualSold=false;p.sold=true;
    state.orders.push({id:'test-cancel',type:'Balcão',table:'',customer:'Teste',payment:'PIX',status:'analysis',createdAt:new Date().toISOString(),items:[{p:'p1',q:2,price:10}],stockRestored:false});
  }
`,context);
await vm.runInContext("cancelOrder('test-cancel')",context);
assert.equal(vm.runInContext("state.products.find(x=>x.id==='p1').stock",context),2);
assert.equal(vm.runInContext("state.products.find(x=>x.id==='p1').sold",context),false,'Cancelamento deve reabrir item esgotado apenas por falta de estoque');

console.log('Business contracts OK');
