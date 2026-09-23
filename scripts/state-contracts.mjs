import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('assets/js/core.js','utf8');
const context=vm.createContext({
  console,
  Date,
  Math,
  Blob,
  URL,
  setTimeout,
  clearTimeout,
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
vm.runInContext(source,context,{filename:'assets/js/core.js'});

const api=vm.runInContext('({APP_VERSION,SCHEMA_VERSION,defaultState,validateState})',context);
assert.equal(api.APP_VERSION,'17.0.0');
assert.equal(api.SCHEMA_VERSION,6);

const fresh=vm.runInContext('defaultState()',context);
assert.equal(fresh.schemaVersion,6);
assert.ok(Array.isArray(fresh.diningAreas)&&fresh.diningAreas.length>=1);
assert.ok(fresh.tables.every(t=>t.area&&Number(t.seats)>=1));
assert.equal(new Set(fresh.tables.map(t=>t.name.toLowerCase())).size,fresh.tables.length);
assert.ok(Array.isArray(fresh.inventoryMovements));
assert.ok(fresh.settings.printing?.enabled);
assert.equal(fresh.settings.printing.profiles.length,3);
assert.ok(fresh.settings.printing.profiles.every(p=>['58mm','80mm','a4'].includes(p.paper)));

context.__legacy=JSON.stringify({
  ...fresh,
  schemaVersion:2,
  diningAreas:[],
  tables:fresh.tables.map(({area,seats,guests,server,order,...rest})=>rest),
  products:fresh.products.map(({description,station,manualSold,...rest},i)=>({...rest,sold:i===0?true:rest.sold,stock:i===0?3:rest.stock})),
  inventoryMovements:undefined,
  settings:{...fresh.settings,printing:undefined}
});
vm.runInContext('state=JSON.parse(__legacy);normalize()',context);
const migrated=vm.runInContext('state',context);
assert.equal(migrated.schemaVersion,6);
assert.ok(migrated.diningAreas.length>=1);
assert.ok(migrated.tables.every(t=>t.area&&t.seats>=1&&Number.isFinite(t.order)));
assert.ok(migrated.products.every(p=>typeof p.description==='string'&&p.station&&typeof p.manualSold==='boolean'));
assert.ok(Array.isArray(migrated.inventoryMovements));
assert.ok(Array.isArray(migrated.settings.printing.profiles));
assert.ok(migrated.settings.printing.profiles.length>=1);
assert.equal(migrated.products[0].manualSold,true);
assert.equal(migrated.products[0].sold,true);
assert.equal(vm.runInContext('validateState(state)',context),'');

const bad=structuredClone(migrated);
bad.tables[1].name=bad.tables[0].name;
context.__bad=bad;
assert.match(vm.runInContext('validateState(__bad)',context),/mesmo nome/i);

const unsafe=structuredClone(migrated);
unsafe.products[0].id="x' onclick='alert(1)";
context.__unsafe=unsafe;
assert.match(vm.runInContext('validateState(__unsafe)',context),/Identificador inválido/i);

const badCustomer=structuredClone(migrated);
badCustomer.orders[0].customerId='missing-customer';
context.__badCustomer=badCustomer;
assert.match(vm.runInContext('validateState(__badCustomer)',context),/cliente inexistente/i);

context.__mesa={type:'Mesa',items:[{p:'p1',q:1,price:100}]};
assert.equal(vm.runInContext('orderSubtotal(__mesa)',context),100);
assert.equal(vm.runInContext('orderFeeTotal(__mesa)',context),10);
assert.equal(vm.runInContext('orderTotal(__mesa)',context),110);

console.log('State contracts OK');
