const { contextBridge, ipcRenderer }=require('electron');

contextBridge.exposeInMainWorld('xbAgent',{
  snapshot:()=>ipcRenderer.invoke('agent:snapshot'),
  printers:()=>ipcRenderer.invoke('agent:printers'),
  jobs:(limit=50)=>ipcRenderer.invoke('agent:jobs',limit),
  logs:(limit=40)=>ipcRenderer.invoke('agent:logs',limit),
  retry:id=>ipcRenderer.invoke('agent:retry',id),
  test:args=>ipcRenderer.invoke('agent:test',args),
  restart:()=>ipcRenderer.invoke('agent:restart'),
  openData:()=>ipcRenderer.invoke('agent:open-data'),
  openDashboard:()=>ipcRenderer.invoke('app:dashboard'),
  settings:()=>ipcRenderer.invoke('app:settings'),
  setStartup:value=>ipcRenderer.invoke('app:set-startup',Boolean(value)),
  checkUpdate:()=>ipcRenderer.invoke('app:check-update'),
  openExternal:url=>ipcRenderer.invoke('app:open-external',url),
  onChanged:callback=>{
    if(typeof callback!=='function')return;
    const handler=()=>callback();
    ipcRenderer.on('agent:changed',handler);
  }
});