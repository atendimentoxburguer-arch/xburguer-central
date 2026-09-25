// Browser regression checks against an isolated local server and fresh demo data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const output=process.env.UI_SCREENSHOTS;
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data)});
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce'});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.fonts.check('16px Inter')&&document.fonts.check('16px bootstrap-icons')),'Fonts and icons load without external services');
  const ids=await page.locator('.nav button[data-page]').evaluateAll(es=>es.map(e=>e.dataset.page));
  assert.equal(ids.length,17,'All modules plus the task directory remain reachable');
  assert.ok(await page.locator('#inicio.active').isVisible(),'First launch opens the task directory');
  if(output)fs.mkdirSync(output,{recursive:true});
  let cases=0;
  for(const width of [1920,1440,1366,1024,768,390]){
   await page.setViewportSize({width,height:1000});
   for(const theme of ['light','dark']){
    await page.evaluate(t=>applyTheme(t),theme);
    for(const id of ids){
     await page.evaluate(id=>go(id),id);
     const result=await page.evaluate(()=>{
      const root=document.querySelector('.page.active');
      const overflow=[...root.querySelectorAll('*')].filter(e=>{
       if(!e.getClientRects().length)return false;
       const rect=e.getBoundingClientRect();if(rect.right<=innerWidth+1)return false;
       // Tables/product lists may intentionally scroll inside their own containers.
       for(let p=e.parentElement;p&&p!==root;p=p.parentElement){if(['auto','scroll','hidden'].includes(getComputedStyle(p).overflowX))return false}
       return true;
      }).map(e=>e.className).slice(0,6);
      return {overflow,error:!!root.querySelector('.error-state'),heading:root.querySelector('h1')?.textContent,nav:document.querySelector('.nav [aria-current="page"]')?.dataset.page};
     });
     const label=`${id}, ${width}px, ${theme}`;
     assert.ok(result.heading,label+': missing title');assert.ok(!result.error,label+': render failed');
     assert.equal(result.nav,id,label+': navigation state');assert.deepEqual(result.overflow,[],label+': overflow');
     if(id==='pdv'){
      const clipped=await page.locator('.product-tile').evaluateAll(tiles=>tiles.some(tile=>tile.querySelector('.price').getBoundingClientRect().bottom>tile.getBoundingClientRect().bottom));
      assert.ok(!clipped,label+': product price is clipped');
     }
     if(id==='cardapio'){
      const overlapping=await page.locator('.menu-item-row').evaluateAll(rows=>rows.some(row=>{
       const badge=row.querySelector('.badge'),actions=row.querySelector('.menu-item-actions');
       if(!badge||!actions||!badge.getClientRects().length)return false;
       const a=badge.getBoundingClientRect(),b=actions.getBoundingClientRect();
       return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      }));
      assert.ok(!overlapping,label+': status overlaps actions');
      assert.ok(await page.locator('.menu-price').first().isVisible(),label+': prices remain accessible');
      assert.ok(await page.locator('.menu-stock').first().isVisible(),label+': stock remains accessible');
     }
     if(output&&width===1440)await page.screenshot({path:path.join(output,`${theme}-${id}.png`),fullPage:true});
     if(output&&width===390&&theme==='light'&&['inicio','pdv','salao','cardapio','relatorios','config'].includes(id))await page.screenshot({path:path.join(output,`mobile-${id}.png`),fullPage:true});
     cases++;
    }
   }
  }
  await page.setViewportSize({width:1366,height:900});await page.evaluate(()=>{applyTheme('light');go('pdv')});
  const first=page.locator('.product-tile:not([disabled])').first();
  await first.click();assert.equal(await page.locator('.pdv-order-line').count(),1,'Product added to draft');
  assert.ok(await page.locator('.pdv-save-main').isEnabled(),'Draft can be saved');
  await page.locator('.pdv-options summary').click();
  await page.locator('.pdv-adjust-tabs button').first().click();
  assert.ok(await page.locator('#modal.open').isVisible(),'Adjustment form opens');
  await page.keyboard.press('Control+k');
  assert.equal(await page.locator('#commandInput').count(),0,'Global search does not replace an active form');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#modal.open').count(),0,'Modal closes');
  // Inspect checkout without receiving payment or sending print jobs.
  for(const theme of ['light','dark']){
   await page.evaluate(t=>{applyTheme(t);openTableCheckoutV22(state.tables.find(table=>state.orders.some(o=>o.table===table.name&&!['done','cancelled'].includes(o.status))).id)},theme);
   assert.ok(await page.locator('.checkout-shell-v24').isVisible(),'Table checkout opens');
   if(output)await page.screenshot({path:path.join(output,`${theme}-checkout.png`),fullPage:true});
   await page.keyboard.press('Escape');
  }
  // Search works by intent, without accents, and opens the requested destination.
  await page.keyboard.press('Control+k');
  await page.locator('#commandInput').fill('impressora');
  assert.ok(await page.locator('[data-command="print"]').isVisible(),'Printer action discoverable');
  if(output)await page.screenshot({path:path.join(output,'global-search.png'),fullPage:true});
  await page.locator('#commandInput').fill('relatorios');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#relatorios.active');
  await page.keyboard.press('Control+k');
  await page.locator('#commandInput').fill('fechar mesa');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#salao.active');
  assert.equal(await page.evaluate(()=>salaoTab),'comandas','Intent opens the correct salon tab');
  await page.keyboard.press('Control+k');
  await page.locator('#commandInput').fill('funcao inexistente xyz');
  assert.equal(await page.locator('#commandResults button').count(),0,'Search empty state');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>go('pdv'));
  await page.locator('#pdvSearch').fill('zzzz-inexistente');
  assert.equal(await page.locator('.product-tile:visible').count(),0,'Product search hides unmatched items');
  assert.ok(await page.locator('#pdvSearchEmpty').isVisible(),'Product empty state visible');
  await page.locator('#pdvSearch').fill('');
  await page.getByRole('button',{name:'Limpar pedido',exact:true}).click();
  assert.ok(await page.locator('#modal.open').isVisible(),'Clearing draft requires confirmation');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.pdv-order-line').count(),1,'Cancel preserves draft');
  // Save a real demo order through the revised UI; physical printing stays disabled.
  const before=await page.evaluate(()=>{state.settings.printing.enabled=false;const line=pdvCart[0];return {id:line.p,stock:product(line.p).stock,price:line.price,orders:state.orders.length}});
  await page.locator('#pdvCustomer').fill('Teste de navegação');
  if(!await page.locator('.pdv-options').evaluate(e=>e.open))await page.locator('.pdv-options summary').click();
  await page.locator('.pdv-pay-card').filter({hasText:'Dinheiro'}).click();
  assert.ok(await page.locator('.pdv-options').evaluate(e=>e.open),'Payment options remain open after selection');
  await page.locator('.pdv-save-main').click();await page.waitForSelector('#pedidos.active');
  const saved=await page.evaluate(id=>({orders:state.orders.length,stock:product(id).stock,order:state.orders.at(-1)}),before.id);
  assert.equal(saved.orders,before.orders+1);assert.equal(saved.stock,before.stock-1);
  assert.equal(saved.order.customer,'Teste de navegação');assert.equal(saved.order.payment,'Dinheiro');
  assert.equal(saved.order.items[0].price,before.price);assert.equal(saved.order.items[0].q,1);
  await page.setViewportSize({width:390,height:844});
  await page.locator('.mobile-menu').click();
  await page.locator('.nav button[data-page="pedidos"]').click();
  assert.equal(await page.locator('#sidebar.open').count(),0,'Mobile navigation closes');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log(`Browser checks OK: ${cases} module/viewport/theme combinations, global search, PDV search/draft protection, modal, checkout and mobile navigation`);
 }finally{await browser.close()}
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
