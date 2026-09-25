import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { migrate,postgresDatabase } from '../src/db.mjs';
import { application,bootstrapAdmin } from '../src/server.mjs';
import { demoState } from '../src/state.mjs';
import { secret } from '../src/security.mjs';

test('connected platform: authentication, migration, concurrent sales and access boundaries', async t => {
  const engine = process.env.TEST_DATABASE_URL ? null : new PGlite();
  const db = engine ? {
    query:(sql,params)=>sql.includes('CREATE TABLE')?engine.exec(sql):engine.query(sql,params),
    transaction:work=>engine.transaction(work),close:()=>engine.close()
  } : postgresDatabase(new pg.Pool({connectionString:process.env.TEST_DATABASE_URL}));
  await migrate(db);
  await migrate(db);
  await bootstrapAdmin(db,'admin@example.test','test-password-long-123');
  const server=application(db,{origin:'http://127.0.0.1:3080'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  async function request(path,{method='GET',data,token='',headers={}}={}){
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',
      Origin:'http://127.0.0.1:3080','X-XBurguer-Request':'1',...(token?{Cookie:token}:{}),...headers},
      ...(data===undefined?{}:{body:JSON.stringify(data)})});
    const text=await response.text();
    let body;try{body=JSON.parse(text)}catch{body=text}
    return {status:response.status,body,cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
  }
  const login=await request('/api/login',{method:'POST',data:{email:'admin@example.test',password:'test-password-long-123'}});
  assert.equal(login.status,200);
  assert.ok(login.cookie);
  const token=login.cookie;
  await t.test('API does not disclose state without authentication and refuses cross-site writes',async()=>{
    assert.equal((await request('/api/state')).status,401);
    assert.equal((await request('/api/login',{method:'POST',data:{},headers:{Origin:'https://evil.test'}})).status,403);
    assert.equal((await request('/.env')).status,404);
    assert.equal((await request('/apps/platform/src/main.mjs')).status,404);
    assert.equal((await request('/assets/js/runtime.js')).body,'globalThis.XB_RUNTIME=Object.freeze({connected:true});');
  });
  const imported=demoState();
  imported.settings.printing.agent.token='must-stay-on-workstation';
  imported.orders=[];imported.inventoryMovements=[];imported.printOutbox=[];
  await t.test('initial migration runs exactly once and strips workstation secrets',async()=>{
    assert.equal((await request('/api/state/import',{method:'POST',token,data:imported})).status,201);
    assert.equal((await request('/api/state/import',{method:'POST',token,data:imported})).status,409);
    const state=await request('/api/state',{token});
    assert.equal(state.body.revision,1);
    assert.equal(state.body.document.settings.printing,undefined);
    assert.equal(JSON.stringify(state.body).includes('must-stay'),false);
    assert.equal(state.headers.get('cache-control'),'no-store');
  });
  await t.test('public catalog only exposes sale fields',async()=>{
    const {body}=await request('/api/public/menu');
    assert.ok(body.products.length);
    assert.equal(body.products[0].cost,undefined);
    assert.equal(body.customers,undefined);
    assert.equal(body.store.phone,undefined);
  });
  await t.test('waiter cannot read financial state, create users or progress kitchen statuses',async()=>{
    assert.equal((await request('/api/users',{method:'POST',token,data:{name:'Garçom',email:'waiter@example.test',password:'waiter-password-123',role:'waiter'}})).status,201);
    const waiter=(await request('/api/login',{method:'POST',data:{email:'waiter@example.test',password:'waiter-password-123'}})).cookie;
    assert.equal((await request('/api/state',{token:waiter})).status,403);
    assert.equal((await request('/api/users',{method:'POST',token:waiter,data:{}})).status,403);
    assert.equal((await request('/api/workspace/status',{method:'POST',token:waiter,data:{}})).status,403);
    const workspace=await request('/api/workspace',{token:waiter});
    assert.equal(workspace.status,200);assert.equal(workspace.body.catalog.products[0].cost,undefined);
    const users=await request('/api/users',{token});
    const id=users.body.find(u=>u.email==='waiter@example.test').id;
    assert.equal((await request('/api/users/deactivate',{method:'POST',token,data:{id}})).status,200);
    assert.equal((await request('/api/workspace',{token:waiter})).status,401);
  });
  const payload={name:'Cliente Teste',phone:'62999999999',type:'Retirada',items:[{id:'p1',quantity:1}],price:0,totalCents:1,paymentStatus:'paid'};
  await t.test('quote exposes complete totals without reserving stock and stale totals cannot be confirmed',async()=>{
    const quote=await request('/api/public/quote',{method:'POST',data:{...payload,type:'Delivery'}});
    assert.equal(quote.status,200);assert.equal(quote.body.subtotal,5190);assert.equal(quote.body.fee,700);assert.equal(quote.body.totalCents,5890);
    assert.equal(quote.body.items,undefined);
    assert.equal((await request('/api/public/orders',{method:'POST',data:{...payload,expectedTotalCents:1},headers:{'Idempotency-Key':secret()}})).status,409);
    assert.equal((await request('/api/state',{token})).body.document.orders.length,0);
  });
  let trackingToken,createdOrder;
  await t.test('server prices override forged prices; duplicate request neither duplicates nor consumes stock twice',async()=>{
    const key=secret(),before=(await request('/api/state',{token})).body.document;
    const first=await request('/api/public/orders',{method:'POST',data:payload,headers:{'Idempotency-Key':key}});
    assert.equal(first.status,201);assert.equal(first.body.totalCents,5190);assert.equal(first.body.paymentStatus,'pending');
    const again=await request('/api/public/orders',{method:'POST',data:payload,headers:{'Idempotency-Key':key}});
    assert.deepEqual(again.body,first.body);
    assert.equal((await request('/api/public/orders',{method:'POST',data:{...payload,name:'Outro'},headers:{'Idempotency-Key':key}})).status,409);
    const after=(await request('/api/state',{token})).body.document;
    assert.equal(after.orders.length,1);
    assert.equal(after.products[0].stock,before.products[0].stock-1);
    assert.equal(after.orders[0].payment,'Não registrado');
    trackingToken=first.body.trackingToken;createdOrder=first.body.id;
  });
  await t.test('tracking token does not expose customer private data',async()=>{
    const result=await request('/api/public/tracking',{method:'POST',data:{token:trackingToken}});
    assert.equal(result.status,200);assert.equal(result.body.id,createdOrder);
    assert.equal(result.body.phone,undefined);assert.equal(result.body.customer,undefined);
    assert.equal((await request('/api/public/tracking',{method:'POST',data:{token:'wrong'}})).status,404);
  });
  await t.test('optimistic revision rejects overwriting changes from another device',async()=>{
    const state=(await request('/api/state',{token})).body;
    const proposed=structuredClone(state.document);proposed.settings.storeName='Loja conectada';
    assert.equal((await request('/api/state',{method:'PUT',token,data:proposed,headers:{'If-Match':String(state.revision)}})).status,200);
    assert.equal((await request('/api/state',{method:'PUT',token,data:state.document,headers:{'If-Match':String(state.revision)}})).status,409);
    assert.equal((await request('/api/state',{token})).body.document.settings.storeName,'Loja conectada');
  });
  await t.test('coupon redemption is atomic and has usage limit',async()=>{
    const coupon={code:'TESTE10',percent:10,minimumCents:1000,maxUses:1,expiresAt:new Date(Date.now()+86400000).toISOString()};
    assert.equal((await request('/api/coupons',{method:'POST',token,data:coupon})).status,201);
    const result=await request('/api/public/orders',{method:'POST',data:{...payload,coupon:'teste10'},headers:{'Idempotency-Key':secret()}});
    assert.equal(result.status,201);assert.equal(result.body.totalCents,4671);
    assert.equal((await request('/api/public/orders',{method:'POST',data:{...payload,coupon:'teste10'},headers:{'Idempotency-Key':secret()}})).status,400);
  });
  await t.test('two buyers cannot buy the last unit',async()=>{
    const current=(await request('/api/state',{token})).body;
    current.document.products[0].stock=1;
    await request('/api/state',{method:'PUT',token,data:current.document,headers:{'If-Match':String(current.revision)}});
    const results=await Promise.all([1,2].map(()=>request('/api/public/orders',{method:'POST',data:payload,headers:{'Idempotency-Key':secret()}})));
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
    assert.equal((await request('/api/state',{token})).body.document.products[0].stock,0);
  });
  await t.test('table link is scoped and old link is revoked',async()=>{
    const data={tableId:imported.tables[0].id};
    const first=await request('/api/table-links',{method:'POST',token,data});
    const previousToken=new URL(first.body.url).hash.split('=')[1];
    const second=await request('/api/table-links',{method:'POST',token,data});
    const tableToken=new URL(second.body.url).hash.split('=')[1];
    const order={...payload,type:'Mesa',items:[{id:'p2',quantity:1}],tableToken:previousToken};
    assert.equal((await request('/api/public/orders',{method:'POST',data:order,headers:{'Idempotency-Key':secret()}})).status,403);
    const result=await request('/api/public/orders',{method:'POST',data:{...order,tableToken},headers:{'Idempotency-Key':secret()}});
    assert.equal(result.status,201);
    const state=(await request('/api/state',{token})).body.document;
    assert.equal(state.orders.find(o=>o.id===result.body.id).table,imported.tables[0].name);
  });
  await t.test('scheduling validates window and cannot start early',async()=>{
    const scheduled={...payload,items:[{id:'p2',quantity:1}],scheduledAt:new Date(Date.now()+3600000).toISOString()};
    const result=await request('/api/public/orders',{method:'POST',data:scheduled,headers:{'Idempotency-Key':secret()}});
    assert.equal(result.status,201);
    assert.equal((await request('/api/workspace/status',{method:'POST',token,data:{id:result.body.id,status:'production'}})).status,409);
    assert.equal((await request('/api/public/orders',{method:'POST',data:{...scheduled,scheduledAt:'bad'},headers:{'Idempotency-Key':secret()}})).status,400);
  });
  await t.test('audit records changes and integrations honestly report inactive',async()=>{
    const audit=(await request('/api/audit',{token})).body;
    assert.ok(audit.some(e=>e.action==='migration.import'));assert.ok(audit.some(e=>e.action==='order.created'));
    const status=(await request('/api/integrations',{token})).body;
    assert.equal(status.payments.status,'not_configured');
    assert.equal((await request('/api/logout',{method:'POST',token,data:{}})).status,200);
    assert.equal((await request('/api/state',{token})).status,401);
  });
});
