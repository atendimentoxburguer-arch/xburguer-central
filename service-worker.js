const CACHE='xburguer-central-v22-1';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./assets/css/app.css','./assets/css/domain-management.css','./assets/css/print.css','./assets/img/logo.png','./assets/img/icon.svg','./assets/img/icon-maskable.svg','./assets/js/core.js','./assets/js/ui.js','./assets/js/print-agent-client.js','./assets/js/printing.js','./assets/js/orders.js','./assets/js/sales.js','./assets/js/operations.js','./assets/js/crm.js','./assets/js/management.js','./assets/js/reports.js','./assets/js/salon-management.js','./assets/js/menu-management.js','./assets/js/app.js','./assets/js/pwa.js'];

async function put(cacheName,request,response){
  if(!response||(!response.ok&&response.type!=='opaque'))return response;
  const cache=await caches.open(cacheName);
  await cache.put(request,response.clone());
  return response;
}
async function networkFirst(request,fallback){
  try{
    const response=await fetch(request,{cache:'no-cache'});
    await put(CACHE,request,response);
    return response;
  }catch(error){
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : Response.error());
  }
}
async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  await put(CACHE,request,response);
  return response;
}
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request,'./index.html'));
    return;
  }
  if(url.origin===self.location.origin){
    const fresh=/\.(?:css|js|json|webmanifest)$/i.test(url.pathname);
    event.respondWith(fresh?networkFirst(event.request):cacheFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request).catch(()=>fetch(event.request)));
});
