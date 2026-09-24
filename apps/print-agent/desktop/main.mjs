import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, Notification, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPrintAgent } from '../server.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_URL='https://atendimentoxburguer-arch.github.io/xburguer-central/';
const RELEASES_API='https://api.github.com/repos/atendimentoxburguer-arch/xburguer-central/releases?per_page=20';

let mainWindow=null,tray=null,quitting=false,agent=null,desktopConfig={startWithWindows:true};

function resourcePath(name){
  return app.isPackaged?path.join(process.resourcesPath,name):path.resolve(__dirname,'../../../assets/img',name);
}
function rawPrintPath(){
  return app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked','scripts','raw-print.ps1'):path.resolve(__dirname,'../scripts/raw-print.ps1');
}
function configPath(){return agent?path.join(agent.dataDir,'desktop-config.json'):''}
function loadDesktopConfig(){
  try{desktopConfig={startWithWindows:true,...JSON.parse(fs.readFileSync(configPath(),'utf8'))}}catch{desktopConfig={startWithWindows:true}}
}
function saveDesktopConfig(){
  try{fs.writeFileSync(configPath(),JSON.stringify(desktopConfig,null,2),'utf8')}catch{}
}
function applyStartupPreference(){
  if(!app.isPackaged)return;
  app.setLoginItemSettings({openAtLogin:Boolean(desktopConfig.startWithWindows),path:process.execPath,args:['--hidden']});
}
function cleanupLegacyStartupShortcut(){
  if(process.platform!=='win32')return;
  const appData=process.env.APPDATA;if(!appData)return;
  const legacy=path.join(appData,'Microsoft','Windows','Start Menu','Programs','Startup','X Burguer Print Agent.lnk');
  try{if(fs.existsSync(legacy))fs.unlinkSync(legacy)}catch{}
}
function statusText(snapshot){
  if(!snapshot)return 'Inicializando';
  if(snapshot.queue?.failed)return snapshot.queue.failed+' falha(s)';
  if(snapshot.queue?.printing)return 'Imprimindo';
  if(snapshot.queue?.queued)return snapshot.queue.queued+' na fila';
  return 'Online';
}
function trayMenu(){
  const snapshot=agent?.getSnapshot();
  return Menu.buildFromTemplate([
    {label:'Abrir X Burguer Print Agent',click:()=>showWindow()},
    {label:'Status: '+statusText(snapshot),enabled:false},
    {label:'Fila: '+Number(snapshot?.queue?.queued||0)+' • Falhas: '+Number(snapshot?.queue?.failed||0),enabled:false},
    {type:'separator'},
    {label:'Abrir X Burguer Central',click:()=>shell.openExternal(DASHBOARD_URL)},
    {label:'Reiniciar agente',click:()=>restartAgent()},
    {label:'Iniciar com o Windows',type:'checkbox',checked:Boolean(desktopConfig.startWithWindows),click:item=>setStartWithWindows(item.checked)},
    {type:'separator'},
    {label:'Sair',click:()=>{quitting=true;app.quit()}}
  ]);
}
function refreshTray(){
  if(!tray)return;
  tray.setContextMenu(trayMenu());
  tray.setToolTip('X Burguer Print Agent — '+statusText(agent?.getSnapshot()));
}
function showWindow(){
  if(!mainWindow)return createWindow();
  mainWindow.show();mainWindow.focus();
}
function createWindow({show=true}={}){
  if(mainWindow){if(show)showWindow();return mainWindow}
  mainWindow=new BrowserWindow({
    width:980,height:720,minWidth:780,minHeight:600,show:false,
    title:'X Burguer Print Agent',
    icon:resourcePath('logo.png'),
    autoHideMenuBar:true,
    backgroundColor:'#f4f7fb',
    webPreferences:{
      preload:path.join(__dirname,'preload.cjs'),
      contextIsolation:true,nodeIntegration:false,sandbox:true,
      devTools:false
    }
  });
  mainWindow.loadFile(path.join(__dirname,'ui.html'));
  mainWindow.once('ready-to-show',()=>{if(show)mainWindow?.show()});
  mainWindow.on('close',event=>{
    if(!quitting){event.preventDefault();mainWindow.hide();refreshTray()}
  });
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,url)=>{
    if(!url.startsWith('file:'))event.preventDefault();
  });
  return mainWindow;
}
function createTray(){
  let image=nativeImage.createFromPath(resourcePath('logo.png'));
  if(!image.isEmpty())image=image.resize({width:20,height:20});
  tray=new Tray(image);
  refreshTray();
  tray.on('double-click',showWindow);
  tray.on('click',showWindow);
}
async function nativePrinterProvider(){
  const win=mainWindow||createWindow({show:false});
  if(win.webContents.isLoading()){
    await new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  }
  const list=await win.webContents.getPrintersAsync();
  return Array.isArray(list)?list:[];
}
async function restartAgent(){
  try{
    await agent.stop();
    await agent.start();
    refreshTray();
    mainWindow?.webContents.send('agent:changed');
    if(Notification.isSupported())new Notification({title:'X Burguer Print Agent',body:'Agente reiniciado e pronto para imprimir.'}).show();
    return {ok:true};
  }catch(error){
    return {ok:false,error:String(error.message||error)};
  }
}
function setStartWithWindows(value){
  desktopConfig.startWithWindows=Boolean(value);saveDesktopConfig();applyStartupPreference();refreshTray();
  return {ok:true,startWithWindows:desktopConfig.startWithWindows};
}
function versionTuple(value){return String(value||'0').split('.').map(x=>Number.parseInt(x,10)||0).slice(0,3)}
function isNewer(remote,local){
  const a=versionTuple(remote),b=versionTuple(local);
  for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0)}
  return false;
}
async function checkUpdates(){
  try{
    const response=await fetch(RELEASES_API,{headers:{'Accept':'application/vnd.github+json','User-Agent':'X-Burguer-Print-Agent'}});
    if(!response.ok)throw new Error('GitHub respondeu HTTP '+response.status);
    const releases=await response.json();
    const release=(Array.isArray(releases)?releases:[]).find(r=>String(r.tag_name||'').startsWith('print-agent-v'));
    if(!release)return {ok:true,available:false,message:'Ainda não há release público do agente.',current:app.getVersion()};
    const tag=String(release.tag_name||'').replace(/^print-agent-v/i,'');
    return {ok:true,available:isNewer(tag,app.getVersion()),latest:tag,url:release.html_url||'',current:app.getVersion()};
  }catch(error){return {ok:false,error:String(error.message||error),current:app.getVersion()}}
}
function registerIpc(){
  ipcMain.handle('agent:snapshot',()=>agent.getSnapshot());
  ipcMain.handle('agent:printers',()=>agent.listPrinters());
  ipcMain.handle('agent:jobs',(_e,limit)=>agent.getJobs(limit));
  ipcMain.handle('agent:logs',(_e,limit)=>agent.recentLogs(limit));
  ipcMain.handle('agent:retry',(_e,id)=>agent.retryJob(String(id||'')));
  ipcMain.handle('agent:test',(_e,args)=>agent.createTestJob(args||{}));
  ipcMain.handle('agent:restart',()=>restartAgent());
  ipcMain.handle('agent:open-data',()=>shell.openPath(agent.dataDir));
  ipcMain.handle('app:dashboard',()=>shell.openExternal(DASHBOARD_URL));
  ipcMain.handle('app:settings',()=>({version:app.getVersion(),startWithWindows:desktopConfig.startWithWindows,packaged:app.isPackaged,logoUrl:pathToFileURL(resourcePath('logo.png')).href}));
  ipcMain.handle('app:set-startup',(_e,value)=>setStartWithWindows(value));
  ipcMain.handle('app:check-update',()=>checkUpdates());
  ipcMain.handle('app:open-external',(_e,url)=>{
    const target=String(url||'');
    if(/^https:\/\/github\.com\/atendimentoxburguer-arch\/xburguer-central\//.test(target))return shell.openExternal(target);
    return false;
  });
}
async function bootstrap(){
  if(!app.requestSingleInstanceLock()){app.quit();return}
  app.on('second-instance',()=>showWindow());
  app.setAppUserModelId('com.xburguer.printagent');
  cleanupLegacyStartupShortcut();
  agent=createPrintAgent({version:app.getVersion(),rawPrintScript:rawPrintPath(),printerProvider:nativePrinterProvider});
  try{await agent.start()}
  catch(error){
    console.error(error);
    const portBusy=error?.code==='EADDRINUSE'||String(error.message||'').includes('EADDRINUSE');
    dialog.showErrorBox(
      portBusy?'Print Agent já está em execução':'Falha ao iniciar Print Agent',
      portBusy
        ?'A porta local 17871 já está sendo usada. Feche uma versão antiga do X Burguer Print Agent ou reinicie o Windows e abra o aplicativo novamente.'
        :String(error.message||error)
    );
    app.quit();return;
  }
  loadDesktopConfig();applyStartupPreference();
  registerIpc();createTray();createWindow({show:!process.argv.includes('--hidden')});
  setInterval(refreshTray,3000).unref?.();
}
app.whenReady().then(bootstrap).catch(error=>{
  console.error(error);
  dialog.showErrorBox('Falha ao iniciar X Burguer Print Agent',String(error.message||error));
  app.quit();
});
app.on('before-quit',()=>{quitting=true});
app.on('window-all-closed',()=>{});
app.on('activate',()=>showWindow());
