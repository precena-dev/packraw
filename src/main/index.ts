import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { ConfigManager } from './config';
import { FreeeApiService } from './freeeApi';

let mainWindow: BrowserWindow | null = null;
const configManager = new ConfigManager();
let freeeApiService: FreeeApiService | null = null;

function createWindow() {
  const windowConfig = configManager.getWindowConfig();
  
  mainWindow = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    resizable: false,
    alwaysOnTop: windowConfig.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      webviewTag: true,
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
}

app.whenReady().then(() => {
  // セッション設定
  const partitionName = configManager.getPartitionName();
  const profileSession = session.fromPartition(partitionName);
  
  // Chrome風の設定
  profileSession.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Webセキュリティの設定
  profileSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: data: blob:']
      }
    });
  });

  createWindow();

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

// OAuth認証を外部ブラウザで開く
ipcMain.handle('open-auth', async () => {
  const authUrl = configManager.getFreeeUrl();
  await shell.openExternal(authUrl);
  return true;
});

// 認証成功後、Cookie情報を設定
ipcMain.handle('set-auth-cookies', async (_event, cookies: any[]) => {
  const partitionName = configManager.getPartitionName();
  const ses = session.fromPartition(partitionName);
  
  for (const cookie of cookies) {
    await ses.cookies.set({
      url: 'https://p.secure.freee.co.jp',
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      secure: cookie.secure || true,
      httpOnly: cookie.httpOnly || false,
      expirationDate: cookie.expirationDate
    });
  }
  
  return true;
});

// WebViewのセッションをリロード
ipcMain.handle('reload-webview', () => {
  if (mainWindow) {
    mainWindow.webContents.send('reload-webview');
  }
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
      companyId: config.api.companyId,
      employeeId: config.api.employeeId,
    });
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
  const info = await freeeApiService.getEmployeeInfo();
  
  // 従業員IDを設定ファイルに保存
  if (info.employee?.id) {
    configManager.updateConfig({
      ...configManager.getConfig(),
      api: {
        ...configManager.getConfig().api!,
        employeeId: info.employee.id,
      }
    });
    freeeApiService.updateConfig({ employeeId: info.employee.id });
  }
  
  return info;
});

ipcMain.handle('freee-api-time-clock', async (_event, type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.timeClock(type);
});

ipcMain.handle('freee-api-get-today-work-record', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  return await freeeApiService.getTodayWorkRecord();
});