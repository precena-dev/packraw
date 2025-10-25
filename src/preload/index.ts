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
    getWorkRecord: (date: string) => ipcRenderer.invoke('freee-api-get-work-record', date),
    getCompanies: () => ipcRenderer.invoke('freee-api-get-companies'),
    getTimeClockButtonStates: () => ipcRenderer.invoke('freee-api-get-time-clock-button-states'),
    getLastTimeClockType: () => ipcRenderer.invoke('freee-api-get-last-time-clock-type'),
    getTimeClocks: (fromDate?: string, toDate?: string) => ipcRenderer.invoke('freee-api-get-time-clocks', fromDate, toDate),
    getTimeClocksFromWorkRecord: (date: string) => ipcRenderer.invoke('freee-api-get-time-clocks-from-work-record', date),
    updateWorkRecord: (date: string, breakRecords: Array<{ clock_in_at: string; clock_out_at: string }>, clockInAt?: string, clockOutAt?: string | null) =>
      ipcRenderer.invoke('freee-api-update-work-record', date, breakRecords, clockInAt, clockOutAt),
    deleteWorkRecord: (date: string) => ipcRenderer.invoke('freee-api-delete-work-record', date),
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
  },

  // BreakScheduler API
  breakScheduler: {
    getConfig: () => ipcRenderer.invoke('break-scheduler-get-config'),
    updateConfig: (config: any) => ipcRenderer.invoke('break-scheduler-update-config', config),
    getNextSchedule: () => ipcRenderer.invoke('break-scheduler-get-next-schedule'),
  },

  // AutoTimeClock API
  autoTimeClock: {
    getConfig: () => ipcRenderer.invoke('auto-time-clock-get-config'),
    updateConfig: (config: any) => ipcRenderer.invoke('auto-time-clock-update-config', config),
  }
});