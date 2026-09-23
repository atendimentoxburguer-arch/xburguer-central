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
context.confirmDialog=async()=>true;

vm.runInContext(fs.readFileSync('assets/js/core.js','utf8'),context,{filename:'core.js'});
vm.runInContext('state=defaultState();normalize()',context);
vm.runInContext(fs.readFileSync('assets/js/printing.js','utf8'),context,{filename:'printing.js'});

const cfg=vm.runInContext('state.settings.printing',context);
assert.equal(cfg.enabled,true);
assert.equal(cfg.orientation,'portrait');
assert.equal(cfg.density,'compact');
assert.equal(cfg.strongText,true);
assert.equal(cfg.showLogo,false);
assert.equal(cfg.profiles.length,3);
assert.deepEqual([...cfg.profiles.map(p=>p.purpose)],['receipt','kitchen','delivery']);
assert.ok(cfg.profiles.every(p=>Array.isArray(p.autoEvents)));
assert.ok(cfg.profiles.every(p=>typeof p.deviceName==='string'));

vm.runInContext("product('p12').station='Bebidas'",context);
const receipt=vm.runInContext("buildPrintPayload(state.orders.find(o=>o.id==='77552'),'receipt')",context);
assert.equal(receipt.id,'77552');
assert.equal(receipt.type,'Mesa');
assert.equal(receipt.items.length,2);
assert.ok(receipt.total>receipt.subtotal);
assert.match(receipt.feeLabel,/Serviço/);
assert.equal(receipt.footer,'Obrigado pela preferência!');

const beverages=vm.runInContext("buildPrintPayload(state.orders.find(o=>o.id==='77552'),'kitchen','Bebidas')",context);
assert.equal(beverages.purpose,'kitchen');
assert.equal(beverages.station,'Bebidas');
assert.equal(beverages.items.length,1);
assert.equal(beverages.items[0].name,'Chope 300ml');

vm.runInContext(`
 state.settings.printing.profiles=[
  {id:'print-chapa',name:'Chapa',purpose:'kitchen',paper:'80mm',copies:1,enabled:true,station:'Cozinha',autoEvents:['production']},
  {id:'print-bebidas',name:'Bebidas',purpose:'kitchen',paper:'58mm',copies:1,enabled:true,station:'Bebidas',autoEvents:['production']},
  {id:'print-exp',name:'Expedição',purpose:'delivery',paper:'80mm',copies:1,enabled:true,station:'all',autoEvents:['ready']},
  {id:'print-caixa',name:'Caixa',purpose:'receipt',paper:'80mm',copies:1,enabled:true,station:'all',autoEvents:['created','completed']}
 ];
 normalize();
`,context);
const productionTargets=vm.runInContext("autoProfilesForEvent('production',state.orders.find(o=>o.id==='77552'))",context);
assert.equal(productionTargets.length,2);
assert.deepEqual([...productionTargets.map(p=>p.name)].sort(),['Bebidas','Chapa']);

const deliveryReady=vm.runInContext("autoProfilesForEvent('ready',state.orders.find(o=>o.id==='77540'))",context);
assert.equal(deliveryReady.length,1);
assert.equal(deliveryReady[0].purpose,'delivery');

const mesaReady=vm.runInContext("autoProfilesForEvent('ready',state.orders.find(o=>o.id==='77552'))",context);
assert.equal(mesaReady.length,0);

vm.runInContext(`
 state.settings.printing={
  enabled:true,orientation:'landscape',density:'invalid',fontScale:'giant',strongText:true,showLogo:true,footer:'Teste',
  profiles:[{id:'print-test',name:'Teste',purpose:'invalid',paper:'invalid',copies:99,enabled:true,station:'all',autoEvents:['production','hack']}]
 };
 state.schemaVersion=8;
 normalize();
`,context);
const normalized=vm.runInContext('state.settings.printing',context);
assert.equal(normalized.orientation,'portrait');
assert.equal(normalized.density,'compact');
assert.equal(normalized.fontScale,'normal');
assert.equal(normalized.profiles[0].purpose,'receipt');
assert.equal(normalized.profiles[0].paper,'80mm');
assert.equal(normalized.profiles[0].copies,3);
assert.deepEqual([...normalized.profiles[0].autoEvents],['production']);

const css=fs.readFileSync('assets/css/print.css','utf8');
assert.match(css,/size:A4 portrait/);
assert.match(css,/size:portrait/);
assert.match(css,/color:#000/);
assert.match(css,/density-compact/);
assert.match(css,/print-strong/);

console.log('Printing contracts OK');
