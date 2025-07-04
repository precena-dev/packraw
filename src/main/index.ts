import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { AuthManager } from './auth';
import { ConfigManager } from './config';

let mainWindow: BrowserWindow | null = null;
const authManager = new AuthManager();
const configManager = new ConfigManager();

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
ipcMain.handle('update-config', (event, newConfig) => {
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
ipcMain.handle('set-auth-cookies', async (event, cookies: any[]) => {
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