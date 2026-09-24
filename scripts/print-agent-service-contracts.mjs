import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPrintAgent } from '../apps/print-agent/server.mjs';

const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'xb-print-agent-'));
const port=17879;
const agent=createPrintAgent({port,dataDir,version:'2.3.0-test',printerProvider:async()=>[{name:'X Burguer Thermal',displayName:'X Burguer Thermal',description:'Driver térmico',status:0,isDefault:true,options:{'printer-location':'USB001'}}]});
await agent.start();

try{
  const preflight=await fetch('http://127.0.0.1:'+port+'/health',{
    method:'OPTIONS',
    headers:{
      Origin:'https://atendimentoxburguer-arch.github.io',
      'Access-Control-Request-Method':'GET',
      'Access-Control-Request-Private-Network':'true'
    }
  });
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),'https://atendimentoxburguer-arch.github.io');
  assert.equal(preflight.headers.get('access-control-allow-private-network'),'true');

  const bridge=await fetch('http://127.0.0.1:'+port+'/bridge');
  assert.equal(bridge.status,200);
  const bridgeHtml=await bridge.text();
  assert.match(bridgeHtml,/xb-print-bridge-ready/);
  assert.match(bridgeHtml,/xb-print-bridge-request/);
  assert.match(bridgeHtml,/atendimentoxburguer-arch\\.github\\.io/);
  assert.match(bridge.headers.get('content-security-policy')||'',/connect-src 'self'/);

  const health=await fetch('http://127.0.0.1:'+port+'/health').then(r=>r.json());
  assert.equal(health.ok,true);
  assert.equal(health.version,'2.3.0-test');
  assert.match(health.pairingCode,/^\d{6}$/);

  const denied=await fetch('http://127.0.0.1:'+port+'/jobs?limit=1');
  assert.equal(denied.status,401);

  const pair=await fetch('http://127.0.0.1:'+port+'/pair',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({code:health.pairingCode})
  });
  assert.equal(pair.status,200);
  const paired=await pair.json();
  assert.equal(paired.ok,true);
  assert.ok(paired.token.length>=32);

  const printersResponse=await fetch('http://127.0.0.1:'+port+'/printers',{
    headers:{'X-XB-Print-Token':paired.token}
  });
  assert.equal(printersResponse.status,200);
  const printersData=await printersResponse.json();
  assert.equal(printersData.ok,true);
  assert.equal(printersData.printers.length,1);
  assert.equal(printersData.printers[0].name,'X Burguer Thermal');
  assert.equal(printersData.printers[0].default,true);

  const jobs=await fetch('http://127.0.0.1:'+port+'/jobs?limit=10',{
    headers:{'X-XB-Print-Token':paired.token}
  });
  assert.equal(jobs.status,200);
  const data=await jobs.json();
  assert.equal(data.ok,true);
  assert.deepEqual(data.jobs,[]);
}finally{
  await agent.stop();
  fs.rmSync(dataDir,{recursive:true,force:true});
}

console.log('Print agent service contracts OK');
