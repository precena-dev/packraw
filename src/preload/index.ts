import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (newConfig: any) => ipcRenderer.invoke('update-config', newConfig),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  setApiConfig: (apiConfig: any) => ipcRenderer.invoke('set-api-config', apiConfig),
  
  // freee API
  freeeApi: {
    init: () => ipcRenderer.invoke('freee-api-init'),
    authorize: () => ipcRenderer.invoke('freee-api-authorize'),
    getEmployeeInfo: () => ipcRenderer.invoke('freee-api-get-employee-info'),
    timeClock: (type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => 
      ipcRenderer.invoke('freee-api-time-clock', type),
    getTodayWorkRecord: () => ipcRenderer.invoke('freee-api-get-today-work-record'),
    getCompanies: () => ipcRenderer.invoke('freee-api-get-companies'),
    getTimeClockButtonStates: () => ipcRenderer.invoke('freee-api-get-time-clock-button-states'),
    getLastTimeClockType: () => ipcRenderer.invoke('freee-api-get-last-time-clock-type'),
    getTimeClocks: (fromDate?: string, toDate?: string) => ipcRenderer.invoke('freee-api-get-time-clocks', fromDate, toDate),
  },
  
  // PowerMonitor API
  powerMonitor: {
    start: () => ipcRenderer.invoke('powerMonitor:start'),
    stop: () => ipcRenderer.invoke('powerMonitor:stop'),
    isMonitoring: () => ipcRenderer.invoke('powerMonitor:isMonitoring'),
    onEvent: (callback: (eventType: string) => void) => {
      ipcRenderer.on('power-monitor-event', (_, eventType) => callback(eventType));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('power-monitor-event');
    }
  }
});