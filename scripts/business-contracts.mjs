import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context=vm.createContext({
  console,Date,Math,Blob,URL,setTimeout,clearTimeout,
  localStorage:{length:0,key(){return null},getItem(){return null},setItem(){},removeItem(){}},
  document:{
    documentElement:{setAttribute(){}},
    getElementById(){return null},
    querySelector(){return null},
    querySelectorAll(){return []},
    createElement(){return {click(){},remove(){},style:{}}},
    body:{appendChild(){}}
  },
  navigator:{onLine:true},
  globalThis:null
});
context.globalThis=context;
context.toast=()=>{};
context.confirmDialog=async()=>true;
context.formDialog=async()=>({reason:'Teste de cancelamento'});
context.closeModal=()=>{};
context.renderAll=()=>{};
vm.runInContext(fs.readFileSync('assets/js/core.js','utf8'),context,{filename:'core.js'});
vm.runInContext(fs.readFileSync('assets/js/orders.js','utf8'),context,{filename:'orders.js'});
vm.runInContext(fs.readFileSync('assets/js/management.js','utf8'),context,{filename:'management.js'});
vm.runInContext('save=function(){return true}',context);

vm.runInContext('state=defaultState();normalize()',context);

// Delivery só finaliza com entregador.
const deliveryId=vm.runInContext("state.orders.find(o=>o.type==='Delivery').id",context);
vm.runInContext(`{const o=state.orders.find(x=>x.id==='${deliveryId}');o.status='ready';o.courier='';advanceOrder(o.id)}`,context);
assert.equal(vm.runInContext(`state.orders.find(x=>x.id==='${deliveryId}').status`,context),'ready');

const courierBefore=vm.runInContext("state.couriers.find(d=>d.id==='d1').deliveries",context);
vm.runInContext(`{const o=state.orders.find(x=>x.id==='${deliveryId}');o.courier='d1';advanceOrder(o.id)}`,context);
assert.equal(vm.runInContext(`state.orders.find(x=>x.id==='${deliveryId}').status`,context),'done');
assert.equal(vm.runInContext("state.couriers.find(d=>d.id==='d1').deliveries",context),courierBefore+1);

// Cancelamento restaura estoque, disponibilidade e trilha de auditoria.
vm.runInContext(`
  {
    const p=state.products.find(x=>x.id==='p1');
    p.stock=0;p.manualSold=false;p.sold=true;
    state.orders.push({id:'test-cancel',type:'Balcão',table:'',customer:'Teste',customerId:'',payment:'PIX',status:'analysis',createdAt:new Date().toISOString(),items:[{p:'p1',q:2,price:10}],stockRestored:false});
  }
`,context);
await vm.runInContext("cancelOrder('test-cancel')",context);
assert.equal(vm.runInContext("state.products.find(x=>x.id==='p1').stock",context),2);
assert.equal(vm.runInContext("state.products.find(x=>x.id==='p1').sold",context),false);
assert.equal(vm.runInContext("state.inventoryMovements.at(-1).delta",context),2);
assert.equal(vm.runInContext("state.inventoryMovements.at(-1).reason",context),'Cancelamento de pedido');
assert.equal(vm.runInContext("state.orders.find(x=>x.id==='test-cancel').cancelReason",context),'Teste de cancelamento');

// Pedido com recebimento parcial exige estorno antes do cancelamento.
vm.runInContext(`
 state.orders.push({id:'test-paid',type:'Mesa',table:'Mesa 1',customer:'Teste',payment:'Misto',status:'analysis',createdAt:new Date().toISOString(),items:[{p:'p1',q:1,price:20}],settlements:[{id:'st-paid',groupId:'pay-paid',method:'PIX',kind:'item-part',amountCents:1000,at:new Date().toISOString(),allocations:[{unitKey:'test-paid:0:0',amountCents:1000}]}]});
`,context);
await vm.runInContext("cancelOrder('test-paid')",context);
assert.equal(vm.runInContext("state.orders.find(x=>x.id==='test-paid').status",context),'analysis');

// Exclusão permanente só remove pedidos já cancelados.
vm.runInContext(`
  state.orders.push({id:'test-delete',type:'Balcão',table:'',customer:'Teste',customerId:'',payment:'PIX',status:'cancelled',createdAt:new Date().toISOString(),items:[{p:'p1',q:1,price:10}],stockRestored:true,cancelReason:'Duplicado'});
`,context);
await vm.runInContext("deleteOrderV21('test-delete')",context);
assert.equal(vm.runInContext("state.orders.some(x=>x.id==='test-delete')",context),false);

// Caixa físico não soma PIX/cartão ao dinheiro da gaveta.
vm.runInContext(`
  state.cash={open:true,openedAt:new Date(Date.now()-60000).toISOString(),opening:100,movements:[
    {id:'mtest1',type:'suprimento',value:20,desc:'Troco',at:new Date().toISOString()},
    {id:'mtest2',type:'sangria',value:10,desc:'Retirada',at:new Date().toISOString()}
  ],history:[]};
  state.orders=[
    {id:'cash1',type:'Balcão',table:'',customer:'A',payment:'Dinheiro',status:'done',createdAt:new Date().toISOString(),completedAt:new Date().toISOString(),items:[{p:'p1',q:1,price:50}]},
    {id:'pix1',type:'Balcão',table:'',customer:'B',payment:'PIX',status:'done',createdAt:new Date().toISOString(),completedAt:new Date().toISOString(),items:[{p:'p1',q:1,price:80}]}
  ];
`,context);
assert.equal(vm.runInContext('cashSalesTotal()',context),130);
assert.equal(vm.runInContext('cashCashSales()',context),50);
assert.equal(vm.runInContext('cashDrawerBalance()',context),160);

// Recebimentos mistos preservam o valor exato por forma.
vm.runInContext(`
 state.orders.push({id:'mix1',type:'Mesa',table:'Mesa 1',customer:'C',payment:'Misto',status:'done',createdAt:new Date().toISOString(),completedAt:new Date().toISOString(),items:[{p:'p1',q:1,price:100}],settlements:[
  {id:'st-m1',groupId:'pay-m1',method:'Dinheiro',kind:'split',amountCents:4000,at:new Date().toISOString(),allocations:[{unitKey:'mix1:0:0',amountCents:4000}]},
  {id:'st-m2',groupId:'pay-m2',method:'PIX',kind:'split',amountCents:6000,at:new Date().toISOString(),allocations:[{unitKey:'mix1:0:0',amountCents:6000}]}
 ]});
`,context);
assert.equal(vm.runInContext("orderPaymentLabel(state.orders.find(x=>x.id==='mix1'))",context),'Misto');
assert.equal(vm.runInContext("orderCashAmount(state.orders.find(x=>x.id==='mix1'))",context),40);
assert.equal(vm.runInContext('cashCashSales()',context),90);

// Taxas configuradas precisam entrar no total.
vm.runInContext("state.settings.deliveryFee=7;state.settings.serviceFee=10",context);
context.__mesa={type:'Mesa',items:[{p:'p1',q:1,price:100}]};
context.__delivery={type:'Delivery',items:[{p:'p1',q:1,price:100}]};
assert.equal(vm.runInContext('orderTotal(__mesa)',context),110);
assert.equal(vm.runInContext('orderTotal(__delivery)',context),107);

console.log('Business contracts OK');
