import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderEscPosJob, validateJob, sanitizeText, paperColumns, wrapText } from '../apps/print-agent/lib/agent-core.mjs';

assert.equal(sanitizeText('Porção de Tilápia — João'),'Porcao de Tilapia - Joao');
assert.equal(paperColumns('58mm'),32);
assert.equal(paperColumns('80mm'),48);
assert.ok(wrapText('X-Burguer especial sem cebola e com bastante molho',20).length>=2);

const job={
  id:'pj-test-001',
  dedupeKey:'77552:print-kitchen:production:Chapa',
  printerName:'EPSON TM-T20',
  profile:{paper:'80mm',copies:1,strongText:true},
  document:{
    purpose:'kitchen',
    station:'Chapa',
    id:'77552',
    type:'Mesa',
    table:'Mesa 6',
    customer:'Não identificado',
    createdAt:'23/09/2026 15:30',
    items:[
      {qty:2,name:'X-Tudo',station:'Chapa',total:63.8},
      {qty:1,name:'Batata Frita 300g',station:'Fritadeira',total:22}
    ],
    notes:'Sem cebola',
    store:{name:'X Burguer'}
  }
};
assert.equal(validateJob(job),'');
const raw=renderEscPosJob(job);
assert.ok(Buffer.isBuffer(raw));
assert.ok(raw.length>80);
assert.ok(raw.includes(Buffer.from('PEDIDO #77552')));
assert.ok(raw.includes(Buffer.from('2x X-Tudo')));
assert.equal(raw.at(-4),0x1d);
assert.equal(raw.at(-3),0x56);

assert.match(validateJob({...job,printerName:''}),/Impressora fisica/i);
assert.match(validateJob({...job,profile:{...job.profile,paper:'a4'}}),/58 mm ou 80 mm/i);
assert.match(validateJob({...job,profile:{...job.profile,copies:4}}),/copias/i);
assert.match(validateJob({...job,document:{...job.document,purpose:'hack'}}),/documento/i);
assert.match(validateJob({...job,dedupeKey:'x '.repeat(100)}),/deduplicacao/i);


const server=fs.readFileSync('apps/print-agent/server.mjs','utf8');
const desktopMain=fs.readFileSync('apps/print-agent/desktop/main.mjs','utf8');
assert.match(server,/printerProvider/);
assert.match(server,/Get-Printer/);
assert.match(server,/Get-CimInstance Win32_Printer/);
assert.match(desktopMain,/getPrintersAsync/);
assert.match(desktopMain,/printerProvider:nativePrinterProvider/);

const client=fs.readFileSync('assets/js/print-agent-client.js','utf8');
assert.match(client,/loopback-network/);
assert.match(client,/local-network-access/);
assert.match(client,/targetAddressSpace:'loopback'/);
assert.match(client,/showLocalNetworkHelp/);
assert.match(client,/userInitiated:true/);
assert.match(client,/ensurePrintBridge/);
assert.match(client,/window\.open\(agentBase\(\)\+'\/bridge'/);
assert.match(client,/Clique em Conectar agente para abrir a ponte local/);
assert.match(client,/function showPrintBridgeHelp/);
assert.doesNotMatch(client,/Permissão local necessária/);
assert.doesNotMatch(client,/document\.createElement\('iframe'\)/);
assert.match(client,/xb-print-bridge-request/);
assert.match(client,/xb-print-bridge-response/);
assert.match(client,/bridgeRequest/);

const sw=fs.readFileSync('service-worker.js','utf8');
assert.match(sw,/url\.hostname==='127\.0\.0\.1'/);
assert.match(sw,/url\.hostname==='localhost'/);
assert.match(sw,/url\.port==='17871'\)return/);

console.log('Print agent contracts OK');
