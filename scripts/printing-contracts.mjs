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
    createElement(){return {click(){},remove(){},style:{}}},
    body:{appendChild(){}}
  },
  navigator:{onLine:true},
  globalThis:null
});
context.globalThis=context;
context.toast=()=>{};
context.openModal=()=>{};
context.formDialog=async()=>null;

vm.runInContext(fs.readFileSync('assets/js/core.js','utf8'),context,{filename:'core.js'});
vm.runInContext('state=defaultState();normalize()',context);
vm.runInContext(fs.readFileSync('assets/js/printing.js','utf8'),context,{filename:'printing.js'});

const cfg=vm.runInContext('state.settings.printing',context);
assert.equal(cfg.enabled,true);
assert.equal(cfg.profiles.length,3);
assert.deepEqual([...cfg.profiles.map(p=>p.purpose)],['receipt','kitchen','delivery']);

vm.runInContext("product('p12').station='Bebidas'",context);
const receipt=vm.runInContext("buildPrintPayload(state.orders.find(o=>o.id==='77552'),'receipt')",context);
assert.equal(receipt.id,'77552');
assert.equal(receipt.type,'Mesa');
assert.equal(receipt.items.length,2);
assert.ok(receipt.total>receipt.subtotal);
assert.match(receipt.feeLabel,/Serviço/);

const beverages=vm.runInContext("buildPrintPayload(state.orders.find(o=>o.id==='77552'),'kitchen','Bebidas')",context);
assert.equal(beverages.purpose,'kitchen');
assert.equal(beverages.station,'Bebidas');
assert.equal(beverages.items.length,1);
assert.equal(beverages.items[0].name,'Chope 300ml');

vm.runInContext(`
 state.settings.printing={
  enabled:true,showLogo:true,footer:'Teste',openKitchenOnAccept:false,openReceiptOnSave:false,
  profiles:[{id:'print-test',name:'Teste',purpose:'invalid',paper:'invalid',copies:99,enabled:true,station:'all'}]
 };
 normalize();
`,context);
const normalized=vm.runInContext('state.settings.printing.profiles[0]',context);
assert.equal(normalized.purpose,'receipt');
assert.equal(normalized.paper,'80mm');
assert.equal(normalized.copies,3);

console.log('Printing contracts OK');
