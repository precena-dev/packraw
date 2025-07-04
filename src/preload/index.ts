import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (newConfig: any) => ipcRenderer.invoke('update-config', newConfig),
  openAuth: () => ipcRenderer.invoke('open-auth'),
  setAuthCookies: (cookies: any[]) => ipcRenderer.invoke('set-auth-cookies', cookies),
  reloadWebview: () => ipcRenderer.invoke('reload-webview'),
  onReloadWebview: (callback: () => void) => {
    ipcRenderer.on('reload-webview', callback);
  },
});