/* X Burguer Central V15 — PWA */
let deferredInstallPrompt=null;
const installBtn=document.getElementById('installAppBtn');
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service Worker não registrado',err)))}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;if(installBtn)installBtn.hidden=false});
installBtn?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBtn.hidden=true});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;if(installBtn)installBtn.hidden=true;toast('X Burguer Central instalado.','success')});
