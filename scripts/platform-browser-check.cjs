const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {createRequire}=require('node:module');
const platformRequire=createRequire(path.resolve('apps/platform/package.json'));
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('connected browser: migration, customer sale, waiter, admin sync and conflict recovery',async t=>{
 const {PGlite}=await import(pathToFileURL(platformRequire.resolve('@electric-sql/pglite')));
 const {migrate}=await import('../apps/platform/src/db.mjs');
 const {application,bootstrapAdmin}=await import('../apps/platform/src/server.mjs');
 const {demoState}=await import('../apps/platform/src/state.mjs');
 const engine=new PGlite();
 const db={query:(sql,params)=>sql.includes('CREATE TABLE')?engine.exec(sql):engine.query(sql,params),transaction:work=>engine.transaction(work)};
 await migrate(db);await bootstrapAdmin(db,'admin@example.test','password-testing-1234');
 // Reserve a random local port before constructing the strict Origin policy.
 const net=require('node:net'),reservation=net.createServer();
 await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const base='http://127.0.0.1:'+port,server=application(db,{origin:base});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 t.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));await engine.close()});
 const context=await browser.newContext(),admin=await context.newPage(),errors=[];
 admin.on('pageerror',error=>errors.push(error.message));
 await admin.goto(base);
 await admin.locator('#cloudEmail').fill('admin@example.test');
 await admin.locator('#cloudPassword').fill('password-testing-1234');
 await admin.locator('#platformLogin button').click();
 const state=demoState();state.orders=[];state.inventoryMovements=[];state.settings.printing.enabled=false;
 state.settings.printing.agent.token='old-origin-token-must-not-travel';
 state.settings.printing.profiles[0].deviceName='MP-4200 TH';
 state.settings.printing.profiles[1].deviceName='EPSON COZINHA';
 const importBodies=[];
 admin.on('request',request=>{if(request.url().endsWith('/api/state/import'))importBodies.push(request.postData())});
 await admin.locator('#cloudImport').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({state}))});
 await admin.getByRole('button',{name:'Validar e migrar'}).click();
 await admin.locator('#inicio.active').waitFor();
 assert.equal(await admin.locator('#platformGate').count(),0);
 assert.equal(await admin.evaluate(()=>state.settings.printing.profiles[0].deviceName),'MP-4200 TH');
 assert.equal(await admin.evaluate(()=>state.settings.printing.profiles[1].deviceName),'EPSON COZINHA');
 assert.notEqual(await admin.evaluate(()=>state.settings.printing.agent.token),'old-origin-token-must-not-travel');
 assert.equal(JSON.stringify((await db.query('SELECT document FROM store_state')).rows).includes('old-origin-token'),false);
 assert.equal(importBodies.length,1);
 assert.equal(importBodies[0].includes('old-origin-token'),false);
 // Initial connected state never goes into the old business localStorage slot.
 assert.equal(await admin.evaluate(()=>localStorage.getItem('xburguer_gestor_pro_v3')),null);
 await admin.evaluate(()=>go('config'));
 await admin.locator('#cfgName').fill('Loja de integração');
 await admin.getByRole('button',{name:'Salvar',exact:true}).click();
 await admin.waitForFunction(()=>!XBCloud.isPending());
 assert.equal((await db.query('SELECT document FROM store_state WHERE id=1')).rows[0].document.settings.storeName,'Loja de integração');
 // Two actual browser sessions: a customer sale appears in the administrator's operation.
 const customer=await browser.newPage({viewport:{width:390,height:844}});
 customer.on('pageerror',error=>errors.push(error.message));
 await customer.goto(base+'/loja.html');
 if(process.env.UI_SCREENSHOTS){
  const fs=require('node:fs');fs.mkdirSync(process.env.UI_SCREENSHOTS,{recursive:true});
  await customer.locator('[data-add="p1"]').waitFor();
  await customer.screenshot({path:path.join(process.env.UI_SCREENSHOTS,'cardapio-celular.png'),fullPage:true});
 }
 await customer.locator('[data-add="p1"]').click();
 await customer.locator('#name').fill('Cliente navegador');
 await customer.locator('#phone').fill('62999999999');
 await customer.locator('#sendOrder').click();
 await customer.waitForFunction(()=>location.hash.startsWith('#pedido='));
 assert.match(await customer.locator('#shopMessage').textContent(),/Recebido|preparo/);
 await admin.evaluate(()=>XBCloud.refresh());
 await admin.evaluate(()=>go('pedidos'));
 await admin.getByText('Cliente navegador',{exact:true}).first().waitFor();
 assert.ok(await customer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Conflict is not silently merged: latest committed server values win and pending change is kept separately.
 await admin.evaluate(()=>go('config'));
 await admin.locator('#cfgName').fill('Alteração conflitante');
 await db.query("UPDATE store_state SET revision=revision+1,document=jsonb_set(document,'{settings,storeName}','\"Alteração de outro aparelho\"') WHERE id=1");
 await admin.getByRole('button',{name:'Salvar',exact:true}).click();
 await admin.waitForFunction(()=>!XBCloud.isPending());
 assert.equal(await admin.locator('#cfgName').inputValue(),'Alteração de outro aparelho');
 assert.ok(await admin.evaluate(()=>localStorage.getItem('xburguer_backup_alteracao_pendente')));
 // A delayed poll must not roll back a newer confirmed save.
 const oldSnapshot=(await db.query('SELECT revision,document FROM store_state WHERE id=1')).rows[0];
 let signalEntered,releaseResponse,holdOnce=true;
 const entered=new Promise(resolve=>signalEntered=resolve),release=new Promise(resolve=>releaseResponse=resolve);
 await admin.route('**/api/state',async route=>{
  if(route.request().method()==='GET'&&holdOnce){holdOnce=false;signalEntered();await release;await route.fulfill({json:oldSnapshot});return}
  await route.continue();
 });
 const polling=admin.evaluate(()=>XBCloud.refresh());
 await entered;
 await admin.evaluate(()=>{state.settings.storeName='Gravação mais recente';save()});
 await admin.waitForFunction(()=>!XBCloud.isPending());
 releaseResponse();await polling;
 assert.equal(await admin.evaluate(()=>state.settings.storeName),'Gravação mais recente');
 await admin.unroute('**/api/state');
 // Staff account has a dedicated minimal view and can submit a table order.
 await admin.evaluate(async()=>XBPlatform.request('users',{method:'POST',data:{name:'Garçom teste',email:'waiter@example.test',password:'password-testing-1234',role:'waiter'}}));
 const waiter=await browser.newPage({viewport:{width:390,height:844}});
 waiter.on('pageerror',error=>errors.push(error.message));
 await waiter.goto(base);
 await waiter.locator('#cloudEmail').fill('waiter@example.test');
 await waiter.locator('#cloudPassword').fill('password-testing-1234');
 await waiter.locator('#platformLogin button').click();
 await waiter.waitForURL('**/equipe-online.html');
 await waiter.locator('#staffCustomer').fill('Mesa pelo celular');
 await waiter.locator('[data-product="p2"]').fill('1');
 await waiter.getByRole('button',{name:'Enviar para a operação'}).click();
 await waiter.getByText('Pedido confirmado e enviado à operação.').waitFor();
 if(process.env.UI_SCREENSHOTS)await waiter.screenshot({path:path.join(process.env.UI_SCREENSHOTS,'garcom-celular.png'),fullPage:true});
 const result=(await db.query('SELECT document FROM store_state WHERE id=1')).rows[0].document;
 assert.ok(result.orders.some(o=>o.customer==='Mesa pelo celular'&&o.type==='Mesa'));
 assert.ok(await waiter.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await admin.evaluate(()=>go('marketing'));
 await admin.locator('#onlineMarketing').getByText('Saldos de cashback').waitFor();
 if(process.env.UI_SCREENSHOTS)await admin.screenshot({path:path.join(process.env.UI_SCREENSHOTS,'fidelidade-online.png'),fullPage:true});
 // A runtime script/network failure must not reopen the local demonstration on the server origin.
 const offline=await context.newPage();
 await offline.route('**/api/**',route=>route.abort());
 await offline.route('**/assets/js/runtime.js',route=>route.abort());
 await offline.goto(base);
 await offline.locator('#platformGate').getByText('Conexão indisponível').waitFor();
 assert.equal(await offline.evaluate(()=>typeof state),'undefined');
 assert.equal(await offline.locator('.app').getAttribute('inert'),'');
 assert.deepEqual(errors,[]);
 console.log('Connected browser OK: migration, admin save, public sale, conflict protection, waiter and mobile');
});
