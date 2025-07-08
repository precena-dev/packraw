import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ConfigManager } from './config';
import { FreeeApiService } from './freeeApi';
import { PowerMonitorService } from './powerMonitor';

let mainWindow: BrowserWindow | null = null;
const configManager = new ConfigManager();
let freeeApiService: FreeeApiService | null = null;
let powerMonitorService: PowerMonitorService | null = null;

function createWindow() {
  const windowConfig = configManager.getWindowConfig();
  
  mainWindow = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    resizable: true,
    alwaysOnTop: windowConfig.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 }
  });

  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 開発者ツールをデフォルトで開く
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // PowerMonitorService を初期化
  powerMonitorService = new PowerMonitorService();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

// 設定情報を取得
ipcMain.handle('get-config', () => {
  return configManager.getConfig();
});

// 設定情報を更新
ipcMain.handle('update-config', (_event, newConfig) => {
  configManager.updateConfig(newConfig);
  return configManager.getConfig();
});


// freee API関連のハンドラー
ipcMain.handle('freee-api-init', () => {
  const config = configManager.getConfig();
  if (config.api) {
    freeeApiService = new FreeeApiService({
      clientId: config.api.clientId,
      clientSecret: config.api.clientSecret,
      redirectUri: config.api.redirectUri,
      accessToken: config.api.accessToken,
      refreshToken: config.api.refreshToken,
      refreshTokenExpiresAt: config.api.refreshTokenExpiresAt,
      companyId: config.api.companyId,
      employeeId: config.api.employeeId,
    });
    
    // PowerMonitorService に FreeeApiService を設定
    if (powerMonitorService) {
      powerMonitorService.setFreeeApiService(freeeApiService);
    }
    
    return true;
  }
  return false;
});

ipcMain.handle('freee-api-authorize', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  const result = await freeeApiService.authorize();
  
  // 認証成功後、トークンを設定ファイルに保存
  const apiConfig = freeeApiService.getConfig();
  configManager.updateConfig({
    ...configManager.getConfig(),
    api: {
      ...configManager.getConfig().api!,
      accessToken: apiConfig.accessToken,
      refreshToken: apiConfig.refreshToken,
      refreshTokenExpiresAt: apiConfig.refreshTokenExpiresAt,
    }
  });
  
  return result;
});

ipcMain.handle('freee-api-get-employee-info', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  
  try {
    const info = await freeeApiService.getEmployeeInfo();
    
    // 最新のトークン情報を保存（リフレッシュされた可能性があるため）
    const apiConfig = freeeApiService.getConfig();
    const currentConfig = configManager.getConfig();
    
    const updatedConfig = {
      ...currentConfig,
      api: {
        ...currentConfig.api!,
        accessToken: apiConfig.accessToken,
        refreshToken: apiConfig.refreshToken,
        refreshTokenExpiresAt: apiConfig.refreshTokenExpiresAt,
      }
    };
    
    // 従業員IDを設定ファイルに保存
    if (info.employee?.id) {
      updatedConfig.api.employeeId = info.employee.id;
      freeeApiService.updateConfig({ employeeId: info.employee.id });
    }
    
    configManager.updateConfig(updatedConfig);
    
    return info;
  } catch (error) {
    // エラーでも最新のトークン情報は保存する
    const apiConfig = freeeApiService.getConfig();
    const currentConfig = configManager.getConfig();
    
    configManager.updateConfig({
      ...currentConfig,
      api: {
        ...currentConfig.api!,
        accessToken: apiConfig.accessToken,
        refreshToken: apiConfig.refreshToken,
        refreshTokenExpiresAt: apiConfig.refreshTokenExpiresAt,
      }
    });
    
    throw error;
  }
});

ipcMain.handle('freee-api-time-clock', async (_event, type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.timeClock(type);
});

ipcMain.handle('freee-api-get-today-work-record', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.getTodayWorkRecord();
});

ipcMain.handle('freee-api-get-companies', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.getCompanies();
});

ipcMain.handle('freee-api-get-time-clock-button-states', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.getTimeClockButtonStates();
});

ipcMain.handle('freee-api-get-last-time-clock-type', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.getLastTimeClockType();
});

ipcMain.handle('freee-api-get-time-clocks', async (_event, fromDate?: string, toDate?: string) => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.getTimeClocks(fromDate, toDate);
});