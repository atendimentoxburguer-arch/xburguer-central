/* X Burguer Central V22 — relatórios operacionais */
let reportTabV22='caixas';
let reportRangeV22=30;

function reportOrdersV22({includeCancelled=false}={}){
 const now=Date.now(),ms=Number(reportRangeV22)*86400000;
 return state.orders.filter(function(o){
  const ts=new Date(o.completedAt||o.cancelledAt||o.createdAt).getTime();
  if(!Number.isFinite(ts)||now-ts>ms)return false;
  return includeCancelled||o.status!=='cancelled';
 });
}
function reportDateV22(value){
 const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
}
function reportNavV22(){
 const items=[
  ['caixas','Caixas','cash-coin'],['clientes','Clientes','people'],['entradas','Entradas','box-arrow-in-down'],
  ['pedidos','Pedidos','receipt'],['mesas','Mesas e comandas','grid-3x3-gap'],['cupons','Cupons','ticket-perforated'],['itens','Itens','box2']
 ];
 return '<aside class="reports-nav-v22">'+items.map(function(x){return '<button class="'+(reportTabV22===x[0]?'active':'')+'" onclick="setReportTabV22(\''+x[0]+'\')">'+icon(x[2])+'<span>'+x[1]+'</span></button>'}).join('')+'</aside>';
}
function reportKpisV22(items){
 return '<div class="report-kpis-v22">'+items.map(function(x){return '<div><span>'+esc(x[0])+'</span><b>'+x[1]+'</b>'+(x[2]?'<small>'+esc(x[2])+'</small>':'')+'</div>'}).join('')+'</div>';
}
function reportTableV22(headers,rows,empty='Nenhum registro no período.'){
 return '<div class="report-table-shell-v22"><table class="table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'"><div class="empty">'+esc(empty)+'</div></td></tr>')+'</tbody></table></div>';
}
function renderReportCaixasV22(){
 const orders=reportOrdersV22(),done=orders.filter(o=>o.status==='done'),sales=done.reduce((s,o)=>s+orderTotal(o),0),cash=done.filter(o=>o.payment==='Dinheiro').reduce((s,o)=>s+orderTotal(o),0);
 const rows=(state.cash.history||[]).slice().reverse().map(function(h){return ['<b>'+reportDateV22(h.closedAt||h.at)+'</b>',money(Number(h.opening)||0),String(Number(h.sales)||0),money(Number(h.salesTotal)||0),money(Number(h.cashSales)||0),money(Number(h.drawerBalance??h.balance)||0)]});
 return reportKpisV22([['Vendas no período',money(sales)],['Em dinheiro',money(cash)],['Caixa atual',state.cash.open?'Aberto':'Fechado'],['Saldo gaveta',money(cashDrawerBalance())]])+
 reportTableV22(['Fechamento','Abertura','Pedidos','Vendas','Dinheiro','Saldo físico'],rows,'Ainda não há fechamentos de caixa registrados.');
}
function renderReportClientesV22(){
 const orders=reportOrdersV22().filter(o=>o.status==='done');
 const rows=state.customers.map(function(c){
  const mine=orders.filter(o=>o.customerId===c.id||(!o.customerId&&o.customer===c.name)),total=mine.reduce((s,o)=>s+orderTotal(o),0);
  return ['<b>'+esc(c.name)+'</b>',esc(c.phone||'—'),String(mine.length),money(total),mine.length?reportDateV22(mine.map(o=>o.completedAt||o.createdAt).sort().at(-1)):'—'];
 }).sort((a,b)=>Number(String(b[2]).replace(/\D/g,''))-Number(String(a[2]).replace(/\D/g,'')));
 return reportKpisV22([['Clientes cadastrados',String(state.customers.length)],['Com compra no período',String(rows.filter(r=>Number(r[2])>0).length)],['Pedidos concluídos',String(orders.length)],['Faturamento',money(orders.reduce((s,o)=>s+orderTotal(o),0))]])+
 reportTableV22(['Cliente','Telefone','Pedidos','Total comprado','Última compra'],rows);
}
function renderReportEntradasV22(){
 const orders=reportOrdersV22().filter(o=>o.status==='done').sort((a,b)=>new Date(b.completedAt||b.createdAt)-new Date(a.completedAt||a.createdAt));
 const rows=orders.map(o=>[reportDateV22(o.completedAt||o.createdAt),'<b>Pedido #'+esc(o.id)+'</b>',esc(o.payment||'Não registrado'),esc(o.type),money(orderTotal(o))]);
 return reportKpisV22([['Entradas de vendas',String(orders.length)],['Total',money(orders.reduce((s,o)=>s+orderTotal(o),0))],['PIX',money(orders.filter(o=>o.payment==='PIX').reduce((s,o)=>s+orderTotal(o),0))],['Cartões',money(orders.filter(o=>String(o.payment).startsWith('Cartão')).reduce((s,o)=>s+orderTotal(o),0))]])+
 reportTableV22(['Data','Origem','Pagamento','Tipo','Valor'],rows);
}
function renderReportPedidosV22(){
 const orders=reportOrdersV22({includeCancelled:true}).slice().sort((a,b)=>new Date(b.completedAt||b.cancelledAt||b.createdAt)-new Date(a.completedAt||a.cancelledAt||a.createdAt));
 const done=orders.filter(o=>o.status==='done'),cancelled=orders.filter(o=>o.status==='cancelled');
 const rows=orders.map(o=>{const meta=orderStatusMetaV21(o.status);return ['<b>#'+esc(o.id)+'</b>',esc(o.customer||'Não identificado'),esc(o.type),'<span class="badge '+meta.badge+'">'+esc(meta.label)+'</span>',esc(o.payment||'—'),money(orderTotal(o)),reportDateV22(o.completedAt||o.cancelledAt||o.createdAt)]});
 return reportKpisV22([['Pedidos',String(orders.length)],['Concluídos',String(done.length)],['Cancelados',String(cancelled.length)],['Ticket médio',money(done.length?done.reduce((s,o)=>s+orderTotal(o),0)/done.length:0)]])+
 reportTableV22(['Pedido','Cliente','Tipo','Status','Pagamento','Total','Data'],rows);
}
function renderReportMesasV22(){
 const orders=reportOrdersV22().filter(o=>o.status==='done'&&o.table);
 const rows=state.tables.map(function(t){
  const mine=orders.filter(o=>o.table===t.name),revenue=mine.reduce((s,o)=>s+orderTotal(o),0),items=mine.reduce((s,o)=>s+o.items.reduce((a,i)=>a+(Number(i.q)||0),0),0);
  return ['<b>'+esc(t.name)+'</b>',esc((state.diningAreas||[]).find(a=>a.id===t.area)?.name||'—'),String(mine.length),String(items),money(revenue),'<span class="badge '+(t.status==='free'?'b-green':t.status==='closing'?'b-orange':'b-red')+'">'+esc(t.status==='free'?'Livre':t.status==='closing'?'Fechando':'Ocupada')+'</span>'];
 });
 return reportKpisV22([['Mesas',String(state.tables.length)],['Comandas abertas',String(state.tables.filter(t=>t.status!=='free').length)],['Pedidos em mesa',String(orders.length)],['Faturamento em mesa',money(orders.reduce((s,o)=>s+orderTotal(o),0))]])+
 reportTableV22(['Mesa','Área','Pedidos','Itens','Faturamento','Status atual'],rows);
}
function renderReportCuponsV22(){
 const rows=state.promos.map(p=>['<b>'+esc(p.name)+'</b>',esc(p.type),esc(p.value),'<span class="badge '+(p.active?'b-green':'b-gray')+'">'+(p.active?'Ativo':'Inativo')+'</span>','—']);
 return reportKpisV22([['Promoções',String(state.promos.length)],['Ativas',String(state.promos.filter(p=>p.active).length)],['Cupons',String(state.promos.filter(p=>p.type==='Cupom').length)],['Cashback',state.settings.cashback+'%']])+
 '<div class="report-note-v22">'+icon('info-circle')+'<span>O protótipo ainda não registra o uso individual de cada cupom por pedido; esta coluna será preenchida quando o backend de promoções for conectado.</span></div>'+
 reportTableV22(['Campanha','Tipo','Benefício','Status','Usos'],rows);
}
function renderReportItensV22(){
 const orders=reportOrdersV22().filter(o=>o.status==='done');
 const rows=state.products.map(function(p){
  let qty=0,revenue=0;
  orders.forEach(o=>o.items.filter(i=>i.p===p.id).forEach(i=>{qty+=Number(i.q)||0;revenue+=(Number(i.q)||0)*(Number(i.price)||0)}));
  return ['<div class="report-product-cell">'+productMedia(p,'report-product-photo')+'<b>'+esc(p.name)+'</b></div>',esc(state.categories.find(c=>c.id===p.cat)?.name||'—'),String(qty),money(revenue),String(Number(p.stock)||0)];
 }).sort((a,b)=>Number(b[2])-Number(a[2]));
 return reportKpisV22([['Itens vendidos',String(rows.reduce((s,r)=>s+Number(r[2]),0))],['Produtos cadastrados',String(state.products.length)],['Receita por itens',money(orders.reduce((s,o)=>s+orderSubtotal(o),0))],['Estoque baixo',String(state.products.filter(p=>Number(p.stock)<=Number(p.min)).length)]])+
 reportTableV22(['Item','Categoria','Qtd. vendida','Receita','Estoque'],rows);
}
function renderReportBodyV22(){
 return ({caixas:renderReportCaixasV22,clientes:renderReportClientesV22,entradas:renderReportEntradasV22,pedidos:renderReportPedidosV22,mesas:renderReportMesasV22,cupons:renderReportCuponsV22,itens:renderReportItensV22}[reportTabV22]||renderReportPedidosV22)();
}
function renderRelatorios(){
 const root=document.getElementById('relatorios');if(!root)return;
 root.innerHTML='<div class="page-head"><div><h1>Relatórios</h1><p>Acompanhe os números operacionais das áreas mostradas nas referências.</p></div><div class="page-head-actions"><select class="select" onchange="reportRangeV22=Number(this.value);renderRelatorios()"><option value="7" '+(reportRangeV22===7?'selected':'')+'>Últimos 7 dias</option><option value="30" '+(reportRangeV22===30?'selected':'')+'>Últimos 30 dias</option><option value="90" '+(reportRangeV22===90?'selected':'')+'>Últimos 90 dias</option></select></div></div><div class="reports-shell-v22">'+reportNavV22()+'<section class="reports-content-v22"><div class="reports-content-head"><div><span>Relatório</span><h2>'+esc({caixas:'Caixas',clientes:'Clientes',entradas:'Entradas',pedidos:'Pedidos',mesas:'Mesas e comandas',cupons:'Cupons',itens:'Itens'}[reportTabV22])+'</h2></div></div>'+renderReportBodyV22()+'</section></div>';
}
function setReportTabV22(tab){reportTabV22=tab;renderRelatorios()}
