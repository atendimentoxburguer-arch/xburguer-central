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

// Taxas configuradas precisam entrar no total.
vm.runInContext("state.settings.deliveryFee=7;state.settings.serviceFee=10",context);
context.__mesa={type:'Mesa',items:[{p:'p1',q:1,price:100}]};
context.__delivery={type:'Delivery',items:[{p:'p1',q:1,price:100}]};
assert.equal(vm.runInContext('orderTotal(__mesa)',context),110);
assert.equal(vm.runInContext('orderTotal(__delivery)',context),107);

console.log('Business contracts OK');
