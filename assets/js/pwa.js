/* PWA — instalação e atualização */
let deferredInstallPrompt=null;
const installBtn=document.getElementById('installAppBtn');
let swRegistration=null;

async function refreshServiceWorker(){
  if(!swRegistration)return;
  try{await swRegistration.update()}catch(err){console.warn('Falha ao verificar atualização do app',err)}
}

if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{
      swRegistration=await navigator.serviceWorker.register('./service-worker.js');
      await refreshServiceWorker();
    }catch(err){
      console.warn('Service Worker não registrado',err);
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshServiceWorker()});
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  if(installBtn)installBtn.hidden=false;
});
installBtn?.addEventListener('click',async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  installBtn.hidden=true;
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  if(installBtn)installBtn.hidden=true;
  toast('X Burguer Central instalado.','success');
});
