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
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
  const ids=await page.locator('.nav button[data-page]').evaluateAll(es=>es.map(e=>e.dataset.page));
  assert.equal(ids.length,16,'All modules remain reachable');
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
     if(id==='cardapio'){
      const overlapping=await page.locator('.menu-item-row').evaluateAll(rows=>rows.some(row=>{
       const badge=row.querySelector('.badge'),actions=row.querySelector('.menu-item-actions');
       if(!badge||!actions||!badge.getClientRects().length)return false;
       const a=badge.getBoundingClientRect(),b=actions.getBoundingClientRect();
       return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      }));
      assert.ok(!overlapping,label+': status overlaps actions');
     }
     if(output&&width===1440)await page.screenshot({path:path.join(output,`${theme}-${id}.png`),fullPage:true});
     cases++;
    }
   }
  }
  await page.setViewportSize({width:1366,height:900});await page.evaluate(()=>{applyTheme('light');go('pdv')});
  const first=page.locator('.product-tile:not([disabled])').first();
  await first.click();assert.equal(await page.locator('.pdv-order-line').count(),1,'Product added to draft');
  assert.ok(await page.locator('.pdv-save-main').isEnabled(),'Draft can be saved');
  await page.locator('.pdv-adjust-tabs button').first().click();
  assert.ok(await page.locator('#modal.open').isVisible(),'Adjustment form opens');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#modal.open').count(),0,'Modal closes');
  // Inspect checkout without receiving payment or sending print jobs.
  for(const theme of ['light','dark']){
   await page.evaluate(t=>{applyTheme(t);openTableCheckoutV22(state.tables.find(table=>state.orders.some(o=>o.table===table.name&&!['done','cancelled'].includes(o.status))).id)},theme);
   assert.ok(await page.locator('.checkout-shell-v24').isVisible(),'Table checkout opens');
   if(output)await page.screenshot({path:path.join(output,`${theme}-checkout.png`),fullPage:true});
   await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.mobile-menu').click();
  await page.locator('.nav button[data-page="pedidos"]').click();
  assert.equal(await page.locator('#sidebar.open').count(),0,'Mobile navigation closes');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log(`Browser checks OK: ${cases} module/viewport/theme combinations, PDV draft, modal, checkout and mobile navigation`);
 }finally{await browser.close()}
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
