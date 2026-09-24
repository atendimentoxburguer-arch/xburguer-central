const { contextBridge, ipcRenderer }=require('electron');

contextBridge.exposeInMainWorld('xbPrintDesktop',{
  request:payload=>ipcRenderer.invoke('central:agent-request',payload||{}),
  info:()=>ipcRenderer.invoke('central:agent-info')
});
