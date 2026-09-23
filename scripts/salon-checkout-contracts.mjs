import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context=vm.createContext({
  console,Date,Math,Blob,URL,setTimeout,clearTimeout,
  location:{origin:'https://example.test',pathname:'/xburguer-central/'},
  localStorage:{length:0,key(){return null},getItem(){return null},setItem(){},removeItem(){}},
  document:{
    documentElement:{setAttribute(){}},
    getElementById(){return null},
    querySelector(){return null},
    querySelectorAll(){return []},
    createElement(){return {click(){},remove(){},style:{},getContext(){return null}}},
    body:{appendChild(){}}
  },
  navigator:{onLine:true},
  globalThis:null
});
context.globalThis=context;
context.toast=()=>{};
context.closeModal=()=>{};
context.openModal=()=>{};
context.confirmDialog=async()=>true;
context.formDialog=async()=>null;
context.go=()=>{};
context.renderPage=()=>{};
context.setHeader=()=>{};
context.dispatchAutoPrintEvent=()=>{};
context.printOrderMenu=()=>{};

for(const file of ['assets/js/core.js','assets/js/orders.js','assets/js/sales.js','assets/js/salon-management.js','assets/js/reports.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
vm.runInContext('state=defaultState();normalize();save=function(){return true};renderSalao=function(){}',context);

// Configurações do salão.
assert.equal(vm.runInContext("state.settings.salon.operationModel",context),'a-la-carte');
vm.runInContext("setSalonModelV22('rodizio')",context);
assert.equal(vm.runInContext("state.settings.salon.operationModel",context),'rodizio');
vm.runInContext("toggleSalonModeV22('command')",context);
assert.equal(vm.runInContext("state.settings.salon.serviceModes.includes('command')",context),true);

// Cadastro de garçom com dados operacionais.
context.formDialog=async()=>({name:'Mariana',email:'mariana@xburguer.com',phone:'(62) 99999-1111'});
await vm.runInContext("createWaiterV22()",context);
assert.equal(vm.runInContext("state.team.some(u=>u.role==='Garçom'&&u.name==='Mariana'&&u.email==='mariana@xburguer.com')",context),true);

// Fechamento de conta da mesa conclui pedidos prontos e libera a mesa.
vm.runInContext(`
  {
    const table=state.tables.find(t=>t.name==='Mesa 6');
    const orders=state.orders.filter(o=>o.table===table.name&&!['done','cancelled'].includes(o.status));
    orders.forEach(o=>{o.status='ready';o.payment='Dinheiro';o.discount=5;o.surcharge=0});
    globalThis.__tableId=table.id;
  }
`,context);
await vm.runInContext("closeTableCheckoutV22(__tableId)",context);
assert.equal(vm.runInContext("state.tables.find(t=>t.id===__tableId).status",context),'free');
assert.equal(vm.runInContext("state.orders.filter(o=>o.table==='Mesa 6'&&!['cancelled'].includes(o.status)).every(o=>o.status==='done')",context),true);

// Ajustes de checkout entram no total.
context.__order={type:'Balcão',items:[{p:'p1',q:1,price:100}],discount:12,surcharge:7};
assert.equal(vm.runInContext("orderTotal(__order)",context),95);

// Relatórios retornam visão operacional.
vm.runInContext("reportRangeV22=90",context);
const reportHtml=vm.runInContext("renderReportPedidosV22()",context);
assert.match(reportHtml,/Ticket médio/);
assert.match(reportHtml,/Pedido/);

console.log('Salon, checkout and report contracts OK');
