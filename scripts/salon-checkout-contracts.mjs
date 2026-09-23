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

// Recebimentos não podem reabrir cancelados nem modificar encerrados.
vm.runInContext(`state.orders=[{id:'qa',type:'Balcão',status:'cancelled',payment:'PIX',items:[{p:'p1',q:1,price:100}],discount:0,surcharge:0}];`,context);
await vm.runInContext("closeOrderCheckoutV22('qa')",context);
vm.runInContext("checkoutSetOrderPaymentV22('qa','Dinheiro');checkoutSplitOrderV22('qa',1)",context);
assert.equal(vm.runInContext("state.orders[0].status",context),'cancelled');
assert.equal(vm.runInContext("state.orders[0].payment",context),'PIX');
vm.runInContext("state.orders[0].status='ready';state.orders[0].payment='Não registrado'",context);
await vm.runInContext("closeOrderCheckoutV22('qa')",context);
assert.equal(vm.runInContext("state.orders[0].status",context),'ready');

// A última conta individual libera inclusive uma mesa marcada como fechando.
vm.runInContext("state.tables=[{id:'tqa',name:'Mesa QA',status:'closing',guests:2,server:'Mariana'}];state.orders[0].table='Mesa QA';state.orders[0].payment='PIX'",context);
await vm.runInContext("closeOrderCheckoutV22('qa')",context);
assert.equal(vm.runInContext("state.tables[0].status",context),'free');
assert.equal(vm.runInContext("state.tables[0].guests",context),0);
vm.runInContext("state.tables[0].status='closing';state.tables[0].guests=2;syncTables()",context);
assert.equal(vm.runInContext("state.tables[0].status",context),'free');
const completed=vm.runInContext("state.orders[0].completedAt",context);
vm.runInContext("state.tables[0].server='Mariana';syncTables()",context);
assert.equal(vm.runInContext("state.tables[0].server",context),'Mariana');
await vm.runInContext("closeOrderCheckoutV22('qa')",context);
assert.equal(vm.runInContext("state.orders[0].completedAt",context),completed);

// Rateio em centavos preserva o ajuste total, inclusive quando todas as bases são zero.
vm.runInContext(`state.orders=Array.from({length:6},(_,i)=>({id:'qa'+i,type:'Mesa',table:'Mesa QA',status:'ready',payment:'PIX',serviceFeePct:0,items:[{p:'p1',q:1,price:0.01}],discount:0,surcharge:0}));`,context);
context.formDialog=async()=>({value:0.04});
await vm.runInContext("checkoutAdjustTableV22('tqa','discount')",context);
assert.equal(vm.runInContext("Math.round(state.orders.reduce((s,o)=>s+o.discount,0)*100)",context),4);
context.formDialog=async()=>({value:100});
await vm.runInContext("checkoutAdjustTableV22('tqa','discount')",context);
assert.equal(vm.runInContext("Math.round(state.orders.reduce((s,o)=>s+o.discount,0)*100)",context),6);
vm.runInContext("state.orders.forEach(o=>{o.items[0].price=0;o.discount=0})",context);
context.formDialog=async()=>({value:0.04});
await vm.runInContext("checkoutAdjustTableV22('tqa','surcharge')",context);
assert.equal(vm.runInContext("Math.round(state.orders.reduce((s,o)=>s+o.surcharge,0)*100)",context),4);

// Edição usa as taxas históricas, mesmo depois de mudar as configurações.
vm.runInContext("state.orders[0].serviceFeePct=5;state.settings.serviceFee=20;pdvEditingId='qa0'",context);
assert.equal(vm.runInContext("pdvFeeV22('Mesa',100).value",context),5);
vm.runInContext("state.orders[0].type='Delivery';state.orders[0].deliveryFee=4;state.settings.deliveryFee=9",context);
assert.equal(vm.runInContext("pdvFeeV22('Delivery',100).value",context),4);

// Os dois totais do PDV e a divisão acompanham a mudança de atendimento.
const fields={pdvType:{value:'Mesa'},pdvBalanceTotal:{},pdvPerPerson:{},pdvGrandTotal:{}};
context.document.getElementById=id=>fields[id]||null;
vm.runInContext("pdvEditingId='';pdvCart=[{p:'p1',q:1,price:100}];pdvDiscountDraft=0;pdvSurchargeDraft=0;pdvSplitDraft=2;updatePdvTotals()",context);
assert.match(fields.pdvBalanceTotal.textContent,/120,00/);
assert.match(fields.pdvPerPerson.textContent,/60,00/);
context.document.getElementById=()=>null;

// Período aplicado a pedidos e fechamentos, excluindo datas futuras/inválidas.
context.cashDrawerBalance=()=>0;
vm.runInContext(`reportRangeV22=7;state.cash.history=[
 {closedAt:new Date().toISOString(),sales:123},
 {closedAt:new Date(Date.now()-20*86400000).toISOString(),sales:456},
 {closedAt:new Date(Date.now()+86400000).toISOString(),sales:789}];`,context);
const cashHtml=vm.runInContext('renderReportCaixasV22()',context);
assert.match(cashHtml,/<td>123<\/td>/);
assert.doesNotMatch(cashHtml,/<td>(456|789)<\/td>/);
assert.equal(vm.runInContext("reportInRangeV22('invalid')",context),false);

// O quadro encaminha pedidos de loja ao checkout, sem recebimento implícito.
vm.runInContext("state.orders[0].type='Balcão';state.orders[0].status='ready';advanceOrder('qa0')",context);
assert.equal(vm.runInContext("state.orders[0].status",context),'ready');

// Fechar um diálogo não deve apagar outro aberto antes do próximo frame.
const frames=[];
let open=false,cleared=0,focused=0;
const modal={classList:{contains:()=>open,add:()=>{open=true},remove:()=>{open=false}},setAttribute(){},removeAttribute(){},addEventListener(){}};
const card={innerHTML:'',querySelector(){return null},querySelectorAll(){return []},replaceChildren(){cleared++},focus(){focused++}};
const uiContext=vm.createContext({document:{getElementById:id=>id==='modal'?modal:id==='modalCard'?card:null,querySelectorAll:()=>[],body:{classList:{add(){},remove(){}}}},requestAnimationFrame:cb=>frames.push(cb)});
vm.runInContext(fs.readFileSync('assets/js/ui.js','utf8'),uiContext);
vm.runInContext("openModal('first');closeModal();openModal('checkout')",uiContext);
frames.splice(0).forEach(cb=>cb());
assert.equal(cleared,0);
assert.equal(card.innerHTML,'checkout');
vm.runInContext('closeModal()',uiContext);
frames.splice(0).forEach(cb=>cb());
assert.equal(cleared,1);
console.log('Salon, checkout and report contracts OK');
