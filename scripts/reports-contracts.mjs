import fs from 'node:fs';
import assert from 'node:assert/strict';

const reports=fs.readFileSync('assets/js/reports.js','utf8');
const core=fs.readFileSync('assets/js/core.js','utf8');
const sales=fs.readFileSync('assets/js/sales.js','utf8');
const css=fs.readFileSync('assets/css/app.css','utf8');

for(const fn of [
  'renderReportOverview','renderReportOrders','renderReportPayments','renderReportProducts',
  'renderReportCategories','renderReportChannels','renderReportCustomers','renderReportTables',
  'renderReportWaiters','renderReportAdjustments','renderReportCancellations','renderReportCash',
  'renderReportInventory','renderReportFinance','exportCurrentReportCsv'
]){
  assert.ok(reports.includes('function '+fn+'('),'Função de relatório ausente: '+fn);
}

for(const tab of [
  'overview','orders','payments','products','categories','channels','customers',
  'tables','waiters','adjustments','cancellations','cash','inventory','finance'
]){
  assert.ok(reports.includes("['"+tab+"'")||reports.includes(tab+':renderReport'),'Aba de relatório ausente: '+tab);
}

for(const range of ["value=\"1\"","value=\"7\"","value=\"30\"","value=\"90\"","value=\"all\"","value=\"custom\""]){
  assert.ok(reports.includes(range),'Faixa de período ausente: '+range);
}

assert.match(reports,/type="date"/);
assert.match(reports,/text\/csv/);
assert.match(reports,/reportSetExport/);
assert.match(reports,/orderPaymentBreakdown/);
assert.match(reports,/reportCost/);
assert.match(reports,/cancelReason/);
assert.match(reports,/inventoryMovements/);
assert.match(reports,/state\.finance/);

assert.match(core,/o\.server=String\(o\.server\|\|''\)/);
assert.match(sales,/server=type==='Mesa'/);
assert.match(sales,/createdOrder=\{id,type,table,customer,customerId,server,/);

for(const selector of [
  '.report-detail-grid{','.report-detail-card{','.report-breakdown{',
  '.report-progress{','.report-facts{','.reports-period-strip{'
]){
  assert.ok(css.includes(selector),'Estilo de relatório ausente: '+selector);
}

assert.ok(css.length<115000,'app.css ultrapassou o orçamento de arquitetura após relatórios.');
console.log('Reports contracts OK');
