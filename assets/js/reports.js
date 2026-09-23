/* Relatórios — análise operacional detalhada */
let reportTab='overview';
let reportRange='30';
let reportStart='';
let reportEnd='';
let reportExportData={title:'Relatório',headers:[],rows:[]};

function reportPeriod(){
 const now=new Date(),end=new Date();
 end.setHours(23,59,59,999);
 if(reportRange==='all')return {start:-Infinity,end:end.getTime(),label:'Todo o histórico'};
 if(reportRange==='custom'){
  const start=reportStart?new Date(reportStart+'T00:00:00').getTime():-Infinity;
  const finish=reportEnd?new Date(reportEnd+'T23:59:59.999').getTime():end.getTime();
  return {start:Number.isFinite(start)?start:-Infinity,end:Number.isFinite(finish)?finish:end.getTime(),label:(reportStart||'Início')+' a '+(reportEnd||'Hoje')};
 }
 const days=Math.max(1,Number(reportRange)||30);
 const start=new Date();
 if(days===1)start.setHours(0,0,0,0);
 else{start.setDate(start.getDate()-(days-1));start.setHours(0,0,0,0)}
 return {start:start.getTime(),end:end.getTime(),label:days===1?'Hoje':'Últimos '+days+' dias'};
}
function reportInPeriod(value){
 const ts=new Date(value).getTime(),period=reportPeriod();
 return Number.isFinite(ts)&&ts>=period.start&&ts<=period.end;
}
function reportOrderDate(o){return o.completedAt||o.cancelledAt||o.createdAt}
function reportOrders({includeCancelled=true,doneOnly=false}={}){
 return state.orders.filter(function(o){
  if(!reportInPeriod(reportOrderDate(o)))return false;
  if(doneOnly)return o.status==='done';
  return includeCancelled||o.status!=='cancelled';
 });
}
function reportDoneOrders(){return reportOrders({doneOnly:true})}
function reportDate(value,withTime=true){
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return '—';
 return d.toLocaleString('pt-BR',withTime?{dateStyle:'short',timeStyle:'short'}:{dateStyle:'short'});
}
function reportDayKey(value){
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return '';
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function reportMinutes(start,end){
 const a=new Date(start).getTime(),b=new Date(end).getTime();
 return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?Math.round((b-a)/60000):null;
}
function reportItemsQty(o){return (o.items||[]).reduce((sum,i)=>sum+(Number(i.q)||0),0)}
function reportCost(o){return (o.items||[]).reduce((sum,i)=>sum+(Number(i.q)||0)*(Number(i.cost)||0),0)}
function reportGrossBeforeDiscount(o){return orderSubtotal(o)+orderFeeTotal(o)+Math.max(0,Number(o.surcharge)||0)}
function reportPct(value,total){return total>0?(Number(value||0)/total*100):0}
function reportCell(html,text){return {html:html,text:String(text??'')}}
function reportHtmlCell(value){
 if(value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'html'))return value.html;
 return esc(value===undefined||value===null?'—':String(value));
}
function reportTextCell(value){
 if(value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'text'))return value.text;
 return value===undefined||value===null?'':String(value);
}
function reportKpis(items){
 return '<div class="report-kpis-v22">'+items.map(function(x){
  return '<div><span>'+esc(x[0])+'</span><b>'+x[1]+'</b>'+(x[2]?'<small>'+esc(x[2])+'</small>':'')+'</div>';
 }).join('')+'</div>';
}
function reportTable(headers,rows,empty='Nenhum registro no período.'){
 return '<div class="report-table-shell-v22"><table class="table"><thead><tr>'+
  headers.map(h=>'<th>'+esc(h)+'</th>').join('')+
  '</tr></thead><tbody>'+
  (rows.length?rows.map(row=>'<tr>'+row.map(cell=>'<td>'+reportHtmlCell(cell)+'</td>').join('')+'</tr>').join(''):
   '<tr><td colspan="'+headers.length+'"><div class="empty">'+esc(empty)+'</div></td></tr>')+
  '</tbody></table></div>';
}
function reportSetExport(title,headers,rows){
 reportExportData={title,headers:headers.slice(),rows:rows.map(row=>row.map(reportTextCell))};
}
function reportCsvValue(value){
 const text=String(value??'').replace(/"/g,'""');
 return '"'+text+'"';
}
function exportCurrentReportCsv(){
 const data=reportExportData;
 if(!data.headers.length){toast('Este relatório não possui dados exportáveis.','warning');return}
 const lines=[data.headers.map(reportCsvValue).join(';')].concat(data.rows.map(row=>row.map(reportCsvValue).join(';')));
 const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 const period=reportPeriod().label.replace(/[^A-Za-z0-9À-ÿ]+/g,'-').replace(/^-|-$/g,'').toLowerCase();
 a.href=url;
 a.download=(data.title||'relatorio').replace(/[^A-Za-z0-9À-ÿ]+/g,'-').replace(/^-|-$/g,'').toLowerCase()+'-'+period+'.csv';
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function reportSection(title,subtitle,body){
 return '<section class="report-detail-card"><div class="report-detail-head"><div><h3>'+esc(title)+'</h3>'+(subtitle?'<p>'+esc(subtitle)+'</p>':'')+'</div></div>'+body+'</section>';
}
function reportBreakdown(rows,total){
 return '<div class="report-breakdown">'+rows.map(function(row){
  const pct=reportPct(row.value,total);
  return '<div class="report-breakdown-row"><div><span>'+esc(row.label)+'</span><b>'+money(row.value)+'</b></div><div class="report-progress"><i style="width:'+Math.min(100,pct).toFixed(1)+'%"></i></div><small>'+pct.toFixed(1).replace('.',',')+'%</small></div>';
 }).join('')+'</div>';
}
function reportPayments(orders){
 const map={};
 orders.forEach(function(o){
  Object.entries(orderPaymentBreakdown(o)).forEach(function(entry){
   const method=entry[0]||'Não registrado',amount=Number(entry[1])||0;
   const row=map[method]||(map[method]={method,orders:new Set(),amount:0});
   row.orders.add(o.id);row.amount+=amount;
  });
 });
 return Object.values(map).map(x=>({method:x.method,orders:x.orders.size,amount:x.amount})).sort((a,b)=>b.amount-a.amount);
}
function reportNav(){
 const items=[
  ['overview','Visão geral','speedometer2'],
  ['orders','Vendas e pedidos','receipt'],
  ['payments','Pagamentos','credit-card'],
  ['products','Produtos','box2'],
  ['categories','Categorias','collection'],
  ['channels','Canais','diagram-3'],
  ['customers','Clientes','people'],
  ['tables','Mesas','grid-3x3-gap'],
  ['waiters','Garçons','person-badge'],
  ['adjustments','Descontos e acréscimos','percent'],
  ['cancellations','Cancelamentos','x-octagon'],
  ['cash','Caixa','cash-coin'],
  ['inventory','Estoque','boxes'],
  ['finance','Financeiro','wallet2']
 ];
 return '<aside class="reports-nav-v22">'+items.map(function(x){
  return '<button class="'+(reportTab===x[0]?'active':'')+'" onclick="setReportTab(\''+x[0]+'\')">'+icon(x[2])+'<span>'+x[1]+'</span></button>';
 }).join('')+'</aside>';
}
function reportTitle(){
 return ({
  overview:'Visão geral',orders:'Vendas e pedidos',payments:'Pagamentos',products:'Produtos',
  categories:'Categorias',channels:'Canais',customers:'Clientes',tables:'Mesas',
  waiters:'Garçons',adjustments:'Descontos e acréscimos',cancellations:'Cancelamentos',
  cash:'Caixa',inventory:'Estoque',finance:'Financeiro'
 })[reportTab]||'Relatórios';
}
function reportRangeControls(){
 if(reportRange!=='custom')return '';
 if(!reportStart){
  const d=new Date();d.setDate(d.getDate()-29);reportStart=d.toISOString().slice(0,10);
 }
 if(!reportEnd)reportEnd=new Date().toISOString().slice(0,10);
 return '<input class="select report-date-input" type="date" value="'+esc(reportStart)+'" onchange="setReportCustomDate(\'start\',this.value)">'+
  '<span class="report-date-separator">até</span>'+
  '<input class="select report-date-input" type="date" value="'+esc(reportEnd)+'" onchange="setReportCustomDate(\'end\',this.value)">';
}

function renderReportOverview(){
 const done=reportDoneOrders(),all=reportOrders({includeCancelled:true}),cancelled=all.filter(o=>o.status==='cancelled');
 const sales=done.reduce((s,o)=>s+orderTotal(o),0),subtotal=done.reduce((s,o)=>s+orderSubtotal(o),0);
 const fees=done.reduce((s,o)=>s+orderFeeTotal(o),0),discount=done.reduce((s,o)=>s+(Number(o.discount)||0),0);
 const surcharge=done.reduce((s,o)=>s+(Number(o.surcharge)||0),0),cost=done.reduce((s,o)=>s+reportCost(o),0);
 const items=done.reduce((s,o)=>s+reportItemsQty(o),0),margin=sales-cost;
 const durations=done.map(o=>reportMinutes(o.createdAt,o.completedAt)).filter(x=>Number.isFinite(x));
 const avgMinutes=durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0;
 const payments=reportPayments(done);
 const byChannel={};
 done.forEach(o=>{const key=o.type||'Não informado';const row=byChannel[key]||(byChannel[key]={label:key,value:0});row.value+=orderTotal(o)});
 const daily={};
 done.forEach(function(o){
  const key=reportDayKey(o.completedAt||o.createdAt);if(!key)return;
  const row=daily[key]||(daily[key]={key,orders:0,items:0,sales:0,cost:0,discount:0});
  row.orders++;row.items+=reportItemsQty(o);row.sales+=orderTotal(o);row.cost+=reportCost(o);row.discount+=Number(o.discount)||0;
 });
 const dailyRows=Object.values(daily).sort((a,b)=>b.key.localeCompare(a.key)).map(x=>[
  reportDate(x.key+'T12:00:00',false),String(x.orders),String(x.items),money(x.sales),money(x.discount),money(x.cost),money(x.sales-x.cost)
 ]);
 const headers=['Data','Pedidos','Itens','Faturamento','Descontos','Custo produtos','Margem estimada'];
 reportSetExport('visao-geral-diaria',headers,dailyRows);
 return reportKpis([
  ['Faturamento',money(sales),done.length+' pedidos concluídos'],
  ['Ticket médio',money(done.length?sales/done.length:0),'por pedido'],
  ['Itens vendidos',String(items),done.length?((items/done.length).toFixed(1).replace('.',',')+' por pedido'):'sem vendas'],
  ['Margem bruta estimada',money(margin),reportPct(margin,sales).toFixed(1).replace('.',',')+'% do faturamento'],
  ['Subtotal produtos',money(subtotal),'antes de taxas e ajustes'],
  ['Taxas cobradas',money(fees),'serviço + delivery'],
  ['Descontos',money(discount),reportPct(discount,done.reduce((s,o)=>s+reportGrossBeforeDiscount(o),0)).toFixed(1).replace('.',',')+'% do bruto'],
  ['Tempo médio',avgMinutes?Math.round(avgMinutes)+' min':'—','criação até conclusão']
 ])+
 '<div class="report-detail-grid">'+
  reportSection('Formas de pagamento','Participação no faturamento',reportBreakdown(payments.map(x=>({label:x.method,value:x.amount})),sales))+
  reportSection('Canais de venda','Mesa, balcão e delivery',reportBreakdown(Object.values(byChannel).sort((a,b)=>b.value-a.value),sales))+
 '</div>'+
 reportSection('Evolução diária','Detalhamento consolidado por dia',reportTable(headers,dailyRows))+
 (cancelled.length?'<div class="report-note-v22">'+icon('info-circle')+'<span>'+cancelled.length+' pedido(s) cancelado(s) no período. Consulte “Cancelamentos” para motivos e valores.</span></div>':'');
}

function renderReportOrders(){
 const orders=reportOrders({includeCancelled:true}).slice().sort((a,b)=>new Date(reportOrderDate(b))-new Date(reportOrderDate(a)));
 const done=orders.filter(o=>o.status==='done'),cancelled=orders.filter(o=>o.status==='cancelled');
 const sales=done.reduce((s,o)=>s+orderTotal(o),0);
 const durations=done.map(o=>reportMinutes(o.createdAt,o.completedAt)).filter(x=>Number.isFinite(x));
 const rows=orders.map(function(o){
  const meta=orderStatusMetaV21(o.status),fees=orderFeeTotal(o);
  return [
   reportCell('<b>#'+esc(o.id)+'</b>','#'+o.id),
   reportDate(reportOrderDate(o)),
   o.customer||'Não identificado',
   o.type||'—',
   o.table||'—',
   String(reportItemsQty(o)),
   money(orderSubtotal(o)),
   money(fees),
   money(Number(o.discount)||0),
   money(Number(o.surcharge)||0),
   money(orderTotal(o)),
   reportCell('<span class="badge '+meta.badge+'">'+esc(meta.label)+'</span>',meta.label),
   orderPaymentLabel(o)
  ];
 });
 const headers=['Pedido','Data','Cliente','Canal','Mesa','Itens','Subtotal','Taxas','Desconto','Acréscimo','Total','Status','Pagamento'];
 reportSetExport('vendas-e-pedidos',headers,rows);
 return reportKpis([
  ['Pedidos no período',String(orders.length)],
  ['Concluídos',String(done.length)],
  ['Cancelados',String(cancelled.length),reportPct(cancelled.length,orders.length).toFixed(1).replace('.',',')+'% dos pedidos'],
  ['Faturamento',money(sales)],
  ['Ticket médio',money(done.length?sales/done.length:0)],
  ['Itens por pedido',done.length?(done.reduce((s,o)=>s+reportItemsQty(o),0)/done.length).toFixed(1).replace('.',','):'—'],
  ['Tempo médio',durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length)+' min':'—'],
  ['Maior venda',money(done.length?Math.max(...done.map(orderTotal)):0)]
 ])+reportTable(headers,rows);
}

function renderReportPayments(){
 const orders=reportDoneOrders(),sales=orders.reduce((s,o)=>s+orderTotal(o),0),data=reportPayments(orders);
 const rows=data.map(x=>[x.method,String(x.orders),money(x.amount),money(x.orders?x.amount/x.orders:0),reportPct(x.amount,sales).toFixed(1).replace('.',',')+'%']);
 const headers=['Forma de pagamento','Pedidos','Valor recebido','Média por pedido','Participação'];
 reportSetExport('pagamentos',headers,rows);
 const mixed=orders.filter(o=>Object.keys(orderPaymentBreakdown(o)).filter(k=>(orderPaymentBreakdown(o)[k]||0)>0).length>1).length;
 return reportKpis([
  ['Total recebido',money(sales)],
  ['Formas utilizadas',String(data.length)],
  ['Pedidos com pagamento misto',String(mixed)],
  ['Dinheiro',money(data.find(x=>x.method==='Dinheiro')?.amount||0)],
  ['PIX',money(data.find(x=>x.method==='PIX')?.amount||0)],
  ['Débito',money(data.find(x=>x.method==='Cartão (Débito)')?.amount||0)],
  ['Crédito',money(data.find(x=>x.method==='Cartão (Crédito)')?.amount||0)],
  ['Não registrado',money(data.find(x=>x.method==='Não registrado')?.amount||0)]
 ])+reportTable(headers,rows);
}

function renderReportProducts(){
 const orders=reportDoneOrders(),sales=orders.reduce((s,o)=>s+orderSubtotal(o),0),map={};
 state.products.forEach(p=>map[p.id]={p,qty:0,revenue:0,cost:0,orders:new Set()});
 orders.forEach(o=>(o.items||[]).forEach(i=>{
  const p=state.products.find(x=>x.id===i.p);if(!p)return;
  const row=map[p.id];row.qty+=Number(i.q)||0;row.revenue+=(Number(i.q)||0)*(Number(i.price)||0);row.cost+=(Number(i.q)||0)*(Number(i.cost)||0);row.orders.add(o.id);
 }));
 const data=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
 const rows=data.map(x=>[
  reportCell('<div class="report-product-cell">'+productMedia(x.p,'report-product-photo')+'<b>'+esc(x.p.name)+'</b></div>',x.p.name),
  state.categories.find(c=>c.id===x.p.cat)?.name||'—',
  String(x.qty),
  String(x.orders.size),
  money(x.revenue),
  money(x.cost),
  money(x.revenue-x.cost),
  reportPct(x.revenue,sales).toFixed(1).replace('.',',')+'%',
  String(Number(x.p.stock)||0),
  Number(x.p.stock)<=0?'Esgotado':Number(x.p.stock)<=Number(x.p.min)?'Estoque baixo':'Normal'
 ]);
 const headers=['Produto','Categoria','Qtd. vendida','Pedidos','Receita','Custo','Margem estimada','Participação','Estoque atual','Situação'];
 reportSetExport('produtos',headers,rows);
 const active=data.filter(x=>x.qty>0);
 return reportKpis([
  ['Itens vendidos',String(active.reduce((s,x)=>s+x.qty,0))],
  ['Receita em produtos',money(sales)],
  ['Custo estimado',money(active.reduce((s,x)=>s+x.cost,0))],
  ['Margem estimada',money(active.reduce((s,x)=>s+x.revenue-x.cost,0))],
  ['Produtos vendidos',String(active.length)],
  ['Sem venda no período',String(data.filter(x=>x.qty===0).length)],
  ['Estoque baixo',String(state.products.filter(p=>Number(p.stock)>0&&Number(p.stock)<=Number(p.min)).length)],
  ['Esgotados',String(state.products.filter(p=>Number(p.stock)<=0).length)]
 ])+reportTable(headers,rows);
}

function renderReportCategories(){
 const orders=reportDoneOrders(),total=orders.reduce((s,o)=>s+orderSubtotal(o),0),map={};
 state.categories.forEach(c=>map[c.id]={c,qty:0,revenue:0,cost:0,orders:new Set(),products:new Set()});
 orders.forEach(o=>(o.items||[]).forEach(i=>{
  const p=state.products.find(x=>x.id===i.p),row=p?map[p.cat]:null;if(!row)return;
  row.qty+=Number(i.q)||0;row.revenue+=(Number(i.q)||0)*(Number(i.price)||0);row.cost+=(Number(i.q)||0)*(Number(i.cost)||0);row.orders.add(o.id);row.products.add(p.id);
 }));
 const data=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
 const rows=data.map(x=>[
  x.c.name,String(x.products.size),String(x.qty),String(x.orders.size),money(x.revenue),money(x.cost),money(x.revenue-x.cost),reportPct(x.revenue,total).toFixed(1).replace('.',',')+'%'
 ]);
 const headers=['Categoria','Produtos vendidos','Itens','Pedidos','Receita','Custo','Margem estimada','Participação'];
 reportSetExport('categorias',headers,rows);
 return reportKpis([
  ['Categorias',String(state.categories.length)],
  ['Com vendas',String(data.filter(x=>x.qty>0).length)],
  ['Receita em produtos',money(total)],
  ['Categoria líder',data[0]?.revenue?data[0].c.name:'—']
 ])+reportTable(headers,rows);
}

function renderReportChannels(){
 const orders=reportDoneOrders(),total=orders.reduce((s,o)=>s+orderTotal(o),0),map={};
 orders.forEach(function(o){
  const key=o.type||'Não informado',row=map[key]||(map[key]={type:key,orders:0,items:0,revenue:0,discount:0,fees:0,cost:0});
  row.orders++;row.items+=reportItemsQty(o);row.revenue+=orderTotal(o);row.discount+=Number(o.discount)||0;row.fees+=orderFeeTotal(o);row.cost+=reportCost(o);
 });
 const data=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
 const rows=data.map(x=>[
  x.type,String(x.orders),String(x.items),money(x.revenue),money(x.orders?x.revenue/x.orders:0),money(x.fees),money(x.discount),money(x.revenue-x.cost),reportPct(x.revenue,total).toFixed(1).replace('.',',')+'%'
 ]);
 const headers=['Canal','Pedidos','Itens','Faturamento','Ticket médio','Taxas','Descontos','Margem estimada','Participação'];
 reportSetExport('canais',headers,rows);
 return reportKpis([
  ['Faturamento total',money(total)],
  ['Mesa',money(data.find(x=>x.type==='Mesa')?.revenue||0)],
  ['Balcão',money(data.find(x=>x.type==='Balcão')?.revenue||0)],
  ['Delivery',money(data.find(x=>x.type==='Delivery')?.revenue||0)]
 ])+
 '<div class="report-note-v22">'+icon('info-circle')+'<span>O sistema diferencia Mesa, Balcão e Delivery. A origem “WhatsApp” ainda não é gravada separadamente; quando o backend de atendimento for integrado, este relatório poderá separar WhatsApp de outros pedidos de delivery.</span></div>'+
 reportTable(headers,rows);
}

function renderReportCustomers(){
 const orders=reportDoneOrders(),map={};
 orders.forEach(function(o){
  const key=o.customerId||('name:'+String(o.customer||'Não identificado').toLowerCase());
  const row=map[key]||(map[key]={name:o.customer||'Não identificado',phone:o.phone||'',orders:0,items:0,revenue:0,last:'',first:''});
  row.orders++;row.items+=reportItemsQty(o);row.revenue+=orderTotal(o);
  const date=o.completedAt||o.createdAt;
  if(!row.first||new Date(date)<new Date(row.first))row.first=date;
  if(!row.last||new Date(date)>new Date(row.last))row.last=date;
 });
 state.customers.forEach(c=>{
  const key=c.id,row=map[key]||(map[key]={name:c.name,phone:c.phone||'',orders:0,items:0,revenue:0,last:'',first:''});
  if(!row.phone)row.phone=c.phone||'';
 });
 const data=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
 const rows=data.map(x=>[
  reportCell('<b>'+esc(x.name)+'</b>',x.name),x.phone||'—',String(x.orders),String(x.items),money(x.revenue),money(x.orders?x.revenue/x.orders:0),x.first?reportDate(x.first):'—',x.last?reportDate(x.last):'—'
 ]);
 const headers=['Cliente','Telefone','Pedidos','Itens','Total comprado','Ticket médio','Primeira compra no período','Última compra'];
 reportSetExport('clientes',headers,rows);
 const buyers=data.filter(x=>x.orders>0),sales=buyers.reduce((s,x)=>s+x.revenue,0);
 return reportKpis([
  ['Clientes cadastrados',String(state.customers.length)],
  ['Compradores no período',String(buyers.length)],
  ['Faturamento identificado',money(sales)],
  ['Ticket médio por cliente',money(buyers.length?sales/buyers.length:0)],
  ['Recorrentes',String(buyers.filter(x=>x.orders>1).length)],
  ['Novos no período',String(buyers.filter(x=>x.orders===1).length)],
  ['Maior cliente',buyers[0]?.name||'—'],
  ['Maior valor',money(buyers[0]?.revenue||0)]
 ])+reportTable(headers,rows);
}

function renderReportTables(){
 const orders=reportDoneOrders().filter(o=>o.type==='Mesa'&&o.table),map={};
 state.tables.forEach(t=>map[t.name]={table:t,orders:0,items:0,revenue:0,discount:0});
 orders.forEach(o=>{
  const row=map[o.table]||(map[o.table]={table:{name:o.table,area:'',status:'free',server:''},orders:0,items:0,revenue:0,discount:0});
  row.orders++;row.items+=reportItemsQty(o);row.revenue+=orderTotal(o);row.discount+=Number(o.discount)||0;
 });
 const data=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
 const rows=data.map(x=>[
  reportCell('<b>'+esc(x.table.name)+'</b>',x.table.name),
  (state.diningAreas||[]).find(a=>a.id===x.table.area)?.name||'—',
  String(x.orders),String(x.items),money(x.revenue),money(x.orders?x.revenue/x.orders:0),money(x.discount),
  x.table.server||'Sem responsável',
  x.table.status==='free'?'Livre':x.table.status==='closing'?'Fechando':'Ocupada'
 ]);
 const headers=['Mesa','Área','Pedidos','Itens','Faturamento','Ticket médio','Descontos','Responsável atual','Status atual'];
 reportSetExport('mesas',headers,rows);
 const revenue=data.reduce((s,x)=>s+x.revenue,0);
 return reportKpis([
  ['Mesas cadastradas',String(state.tables.length)],
  ['Mesas com vendas',String(data.filter(x=>x.orders>0).length)],
  ['Pedidos de mesa',String(orders.length)],
  ['Faturamento salão',money(revenue)],
  ['Ticket médio',money(orders.length?revenue/orders.length:0)],
  ['Mesa líder',data.find(x=>x.orders>0)?.table.name||'—'],
  ['Comandas abertas',String(state.tables.filter(t=>t.status!=='free').length)],
  ['Mesas ocupadas agora',String(state.tables.filter(t=>t.status==='busy').length)]
 ])+reportTable(headers,rows);
}

function renderReportWaiters(){
 const orders=reportDoneOrders().filter(o=>o.type==='Mesa'),map={};
 state.team.filter(u=>u.role==='Garçom'||u.role==='Administrador').forEach(u=>map[u.name]={name:u.name,active:u.active,orders:0,items:0,revenue:0,discount:0});
 orders.forEach(function(o){
  const name=String(o.server||'Não registrado'),row=map[name]||(map[name]={name,active:false,orders:0,items:0,revenue:0,discount:0});
  row.orders++;row.items+=reportItemsQty(o);row.revenue+=orderTotal(o);row.discount+=Number(o.discount)||0;
 });
 const data=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
 const rows=data.map(x=>[x.name,x.active?'Ativo':'—',String(x.orders),String(x.items),money(x.revenue),money(x.orders?x.revenue/x.orders:0),money(x.discount)]);
 const headers=['Garçom / responsável','Status','Pedidos','Itens','Faturamento','Ticket médio','Descontos'];
 reportSetExport('garcons',headers,rows);
 return reportKpis([
  ['Garçons cadastrados',String(state.team.filter(u=>u.role==='Garçom').length)],
  ['Com vendas atribuídas',String(data.filter(x=>x.orders>0&&x.name!=='Não registrado').length)],
  ['Pedidos sem responsável histórico',String(data.find(x=>x.name==='Não registrado')?.orders||0)],
  ['Faturamento atribuído',money(data.filter(x=>x.name!=='Não registrado').reduce((s,x)=>s+x.revenue,0))]
 ])+
 '<div class="report-note-v22">'+icon('info-circle')+'<span>A atribuição histórica de garçom passa a ser registrada nos novos pedidos de mesa. Pedidos antigos sem responsável aparecem como “Não registrado”.</span></div>'+
 reportTable(headers,rows);
}

function renderReportAdjustments(){
 const orders=reportDoneOrders(),gross=orders.reduce((s,o)=>s+reportGrossBeforeDiscount(o),0);
 const affected=orders.filter(o=>(Number(o.discount)||0)>0||(Number(o.surcharge)||0)>0);
 const discount=orders.reduce((s,o)=>s+(Number(o.discount)||0),0),surcharge=orders.reduce((s,o)=>s+(Number(o.surcharge)||0),0);
 const rows=affected.slice().sort((a,b)=>(Number(b.discount)||0)+(Number(b.surcharge)||0)-(Number(a.discount)||0)-(Number(a.surcharge)||0)).map(o=>[
  reportCell('<b>#'+esc(o.id)+'</b>','#'+o.id),reportDate(o.completedAt||o.createdAt),o.customer||'Não identificado',o.type,money(reportGrossBeforeDiscount(o)),money(Number(o.discount)||0),money(Number(o.surcharge)||0),money(orderTotal(o))
 ]);
 const headers=['Pedido','Data','Cliente','Canal','Bruto antes do desconto','Desconto','Acréscimo','Total final'];
 reportSetExport('descontos-e-acrescimos',headers,rows);
 return reportKpis([
  ['Pedidos com ajuste',String(affected.length)],
  ['Descontos concedidos',money(discount),reportPct(discount,gross).toFixed(1).replace('.',',')+'% do bruto'],
  ['Desconto médio',money(affected.filter(o=>Number(o.discount)>0).length?discount/affected.filter(o=>Number(o.discount)>0).length:0)],
  ['Acréscimos',money(surcharge)],
  ['Pedidos com desconto',String(orders.filter(o=>Number(o.discount)>0).length)],
  ['Pedidos com acréscimo',String(orders.filter(o=>Number(o.surcharge)>0).length)],
  ['Maior desconto',money(orders.length?Math.max(...orders.map(o=>Number(o.discount)||0)):0)],
  ['Impacto líquido',money(surcharge-discount)]
 ])+reportTable(headers,rows);
}

function renderReportCancellations(){
 const all=reportOrders({includeCancelled:true}),cancelled=all.filter(o=>o.status==='cancelled').sort((a,b)=>new Date(b.cancelledAt||b.createdAt)-new Date(a.cancelledAt||a.createdAt));
 const value=cancelled.reduce((s,o)=>s+orderTotal(o),0),items=cancelled.reduce((s,o)=>s+reportItemsQty(o),0);
 const reasons={};cancelled.forEach(o=>{const r=o.cancelReason||'Sem motivo registrado';reasons[r]=(reasons[r]||0)+1});
 const rows=cancelled.map(o=>[
  reportCell('<b>#'+esc(o.id)+'</b>','#'+o.id),reportDate(o.cancelledAt||o.createdAt),o.customer||'Não identificado',o.type,o.table||'—',String(reportItemsQty(o)),money(orderTotal(o)),o.cancelReason||'Sem motivo registrado'
 ]);
 const headers=['Pedido','Cancelado em','Cliente','Canal','Mesa','Itens','Valor cancelado','Motivo'];
 reportSetExport('cancelamentos',headers,rows);
 return reportKpis([
  ['Cancelamentos',String(cancelled.length)],
  ['Taxa de cancelamento',reportPct(cancelled.length,all.length).toFixed(1).replace('.',',')+'%'],
  ['Valor cancelado',money(value)],
  ['Itens cancelados',String(items)],
  ['Ticket cancelado',money(cancelled.length?value/cancelled.length:0)],
  ['Motivos diferentes',String(Object.keys(reasons).length)],
  ['Com motivo informado',String(cancelled.filter(o=>o.cancelReason).length)],
  ['Sem motivo',String(cancelled.filter(o=>!o.cancelReason).length)]
 ])+
 reportSection('Motivos mais frequentes','Quantidade de cancelamentos por motivo',
  reportTable(['Motivo','Ocorrências'],Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(x=>[x[0],String(x[1])]))
 )+
 reportSection('Pedidos cancelados','Detalhamento individual',reportTable(headers,rows));
}

function renderReportCash(){
 const done=reportDoneOrders(),payments=reportPayments(done),sales=done.reduce((s,o)=>s+orderTotal(o),0);
 const sessions=(state.cash.history||[]).filter(h=>reportInPeriod(h.closedAt||h.openedAt)).slice().sort((a,b)=>new Date(b.closedAt||b.openedAt)-new Date(a.closedAt||a.openedAt));
 const rows=sessions.map(function(h){
  const movements=Array.isArray(h.movements)?h.movements:[],supply=movements.filter(m=>m.type==='suprimento').reduce((s,m)=>s+(Number(m.value)||0),0),withdraw=movements.filter(m=>m.type==='sangria').reduce((s,m)=>s+(Number(m.value)||0),0);
  return [reportDate(h.openedAt),reportDate(h.closedAt),money(Number(h.opening)||0),String(Number(h.sales)||0),money(Number(h.salesTotal)||0),money(Number(h.cashSales)||0),money(supply),money(withdraw),money(Number(h.drawerBalance??h.balance)||0)];
 });
 const headers=['Abertura','Fechamento','Fundo inicial','Pedidos','Vendas','Dinheiro','Suprimentos','Sangrias','Saldo físico'];
 reportSetExport('fechamentos-de-caixa',headers,rows);
 const currentMoves=(state.cash.movements||[]).filter(m=>reportInPeriod(m.at));
 const supply=currentMoves.filter(m=>m.type==='suprimento').reduce((s,m)=>s+(Number(m.value)||0),0),withdraw=currentMoves.filter(m=>m.type==='sangria').reduce((s,m)=>s+(Number(m.value)||0),0);
 return reportKpis([
  ['Vendas concluídas',money(sales)],
  ['Pedidos concluídos',String(done.length)],
  ['Recebido em dinheiro',money(payments.find(x=>x.method==='Dinheiro')?.amount||0)],
  ['Fechamentos',String(sessions.length)],
  ['Caixa atual',state.cash.open?'Aberto':'Fechado'],
  ['Saldo atual estimado',money(cashDrawerBalance())],
  ['Suprimentos atuais',money(supply)],
  ['Sangrias atuais',money(withdraw)]
 ])+
 '<div class="report-detail-grid">'+
  reportSection('Recebimentos por forma','Vendas concluídas no período',reportBreakdown(payments.map(x=>({label:x.method,value:x.amount})),sales))+
  reportSection('Sessão atual','Informações do caixa aberto',
   '<div class="report-facts"><div><span>Aberto em</span><b>'+(state.cash.openedAt?reportDate(state.cash.openedAt):'—')+'</b></div><div><span>Fundo inicial</span><b>'+money(state.cash.opening||0)+'</b></div><div><span>Movimentos líquidos</span><b>'+money(cashMovementsNet())+'</b></div><div><span>Saldo estimado</span><b>'+money(cashDrawerBalance())+'</b></div></div>'
  )+
 '</div>'+reportTable(headers,rows,'Ainda não há fechamentos registrados no período.');
}

function renderReportInventory(){
 const movements=(state.inventoryMovements||[]).filter(m=>reportInPeriod(m.at)),by={};
 movements.forEach(m=>{const row=by[m.productId]||(by[m.productId]={in:0,out:0,count:0});row.count++;if(m.delta>0)row.in+=m.delta;else row.out+=Math.abs(m.delta)});
 const data=state.products.map(p=>{
  const m=by[p.id]||{in:0,out:0,count:0};
  return {p,m,stock:Number(p.stock)||0,cost:Number(p.cost)||0,price:Number(p.price)||0};
 }).sort((a,b)=>(a.stock<=a.p.min?-1:1)-(b.stock<=b.p.min?-1:1)||a.stock-b.stock);
 const rows=data.map(x=>[
  reportCell('<div class="report-product-cell">'+productMedia(x.p,'report-product-photo')+'<b>'+esc(x.p.name)+'</b></div>',x.p.name),
  state.categories.find(c=>c.id===x.p.cat)?.name||'—',
  String(x.stock),String(Number(x.p.min)||0),String(x.m.in),String(x.m.out),String(x.m.count),money(x.cost),money(x.stock*x.cost),money(x.stock*x.price),
  x.stock<=0?'Esgotado':x.stock<=Number(x.p.min)?'Estoque baixo':'Normal'
 ]);
 const headers=['Produto','Categoria','Estoque','Mínimo','Entradas período','Saídas período','Movimentos','Custo unit.','Valor em custo','Valor em venda','Situação'];
 reportSetExport('estoque',headers,rows);
 return reportKpis([
  ['Produtos',String(state.products.length)],
  ['Unidades em estoque',String(data.reduce((s,x)=>s+x.stock,0))],
  ['Valor em custo',money(data.reduce((s,x)=>s+x.stock*x.cost,0))],
  ['Valor potencial venda',money(data.reduce((s,x)=>s+x.stock*x.price,0))],
  ['Estoque baixo',String(data.filter(x=>x.stock>0&&x.stock<=Number(x.p.min)).length)],
  ['Esgotados',String(data.filter(x=>x.stock<=0).length)],
  ['Movimentos no período',String(movements.length)],
  ['Saídas registradas',String(movements.filter(m=>m.delta<0).reduce((s,m)=>s+Math.abs(m.delta),0))]
 ])+reportTable(headers,rows);
}

function renderReportFinance(){
 const period=reportPeriod(),today=new Date();today.setHours(0,0,0,0);
 const entries=(state.finance||[]).filter(function(f){
  const ts=new Date(String(f.due||'')+'T12:00:00').getTime();
  return reportRange==='all'||(Number.isFinite(ts)&&ts>=period.start&&ts<=period.end);
 }).slice().sort((a,b)=>String(a.due).localeCompare(String(b.due)));
 const pay=entries.filter(f=>f.kind==='pay'),receive=entries.filter(f=>f.kind==='receive');
 const pendingPay=pay.filter(f=>!f.paid).reduce((s,f)=>s+(Number(f.value)||0),0),pendingReceive=receive.filter(f=>!f.paid).reduce((s,f)=>s+(Number(f.value)||0),0);
 const overdue=entries.filter(f=>!f.paid&&new Date(String(f.due||'')+'T00:00:00')<today);
 const rows=entries.map(f=>[
  f.kind==='pay'?'Conta a pagar':'Conta a receber',f.desc,reportDate(String(f.due)+'T12:00:00',false),money(Number(f.value)||0),f.paid?'Baixado':overdue.includes(f)?'Vencido':'Pendente'
 ]);
 const headers=['Tipo','Descrição','Vencimento','Valor','Status'];
 reportSetExport('financeiro',headers,rows);
 return reportKpis([
  ['A pagar',money(pay.reduce((s,f)=>s+(Number(f.value)||0),0))],
  ['A receber',money(receive.reduce((s,f)=>s+(Number(f.value)||0),0))],
  ['Pendente a pagar',money(pendingPay)],
  ['Pendente a receber',money(pendingReceive)],
  ['Vencidos',String(overdue.length)],
  ['Valor vencido',money(overdue.reduce((s,f)=>s+(Number(f.value)||0),0))],
  ['Baixados',String(entries.filter(f=>f.paid).length)],
  ['Saldo previsto',money(pendingReceive-pendingPay)]
 ])+reportTable(headers,rows);
}

function renderReportBody(){
 return ({
  overview:renderReportOverview,
  orders:renderReportOrders,
  payments:renderReportPayments,
  products:renderReportProducts,
  categories:renderReportCategories,
  channels:renderReportChannels,
  customers:renderReportCustomers,
  tables:renderReportTables,
  waiters:renderReportWaiters,
  adjustments:renderReportAdjustments,
  cancellations:renderReportCancellations,
  cash:renderReportCash,
  inventory:renderReportInventory,
  finance:renderReportFinance
 }[reportTab]||renderReportOverview)();
}
function renderRelatorios(){
 const root=document.getElementById('relatorios');if(!root)return;
 const period=reportPeriod();
 root.innerHTML=
  '<div class="page-head report-page-head"><div><h1>Relatórios</h1><p>Análise detalhada de vendas, operação, caixa, estoque e desempenho da lanchonete.</p></div>'+
   '<div class="report-head-actions">'+
    '<div class="report-range-group"><select class="select" onchange="setReportRange(this.value)">'+
     '<option value="1" '+(reportRange==='1'?'selected':'')+'>Hoje</option>'+
     '<option value="7" '+(reportRange==='7'?'selected':'')+'>Últimos 7 dias</option>'+
     '<option value="30" '+(reportRange==='30'?'selected':'')+'>Últimos 30 dias</option>'+
     '<option value="90" '+(reportRange==='90'?'selected':'')+'>Últimos 90 dias</option>'+
     '<option value="all" '+(reportRange==='all'?'selected':'')+'>Todo o histórico</option>'+
     '<option value="custom" '+(reportRange==='custom'?'selected':'')+'>Personalizado</option>'+
    '</select>'+reportRangeControls()+'</div>'+
    '<button class="btn btn-outline" onclick="exportCurrentReportCsv()">'+icon('download')+'<span>Exportar CSV</span></button>'+
   '</div>'+
  '</div>'+
  '<div class="reports-period-strip">'+icon('calendar3')+'<span>Período analisado:</span><b>'+esc(period.label)+'</b></div>'+
  '<div class="reports-shell-v22">'+reportNav()+
   '<section class="reports-content-v22"><div class="reports-content-head"><div><span>Relatório detalhado</span><h2>'+esc(reportTitle())+'</h2></div></div>'+renderReportBody()+'</section>'+
  '</div>';
}
function setReportTab(tab){reportTab=tab;renderRelatorios()}
function setReportRange(value){
 reportRange=String(value||'30');
 if(reportRange==='custom'&&!reportStart){
  const d=new Date();d.setDate(d.getDate()-29);reportStart=d.toISOString().slice(0,10);reportEnd=new Date().toISOString().slice(0,10);
 }
 renderRelatorios();
}
function setReportCustomDate(which,value){
 if(which==='start')reportStart=value||'';
 else reportEnd=value||'';
 renderRelatorios();
}
