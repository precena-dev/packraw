import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { ConfigManager } from './config';
import { FreeeApiService } from './freeeApi';
import { PowerMonitorService } from './powerMonitor';
import { BreakScheduler } from './breakScheduler';
import { UpdaterService } from './updater';

// アプリ名を早期設定（Dockに表示される名前）
app.setName('PackRaw');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const configManager = new ConfigManager();
let freeeApiService: FreeeApiService | null = null;
let powerMonitorService: PowerMonitorService | null = null;
let breakScheduler: BreakScheduler | null = null;
let updaterService: UpdaterService | null = null;
let isQuitting = false; // アプリが終了中かどうかのフラグ


function createWindow() {
  const windowConfig = configManager.getWindowConfig();
  
  mainWindow = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    resizable: true,
    alwaysOnTop: windowConfig.alwaysOnTop,
    autoHideMenuBar: true,
    title: 'PackRaw',
    icon: app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon_base.png')
      : path.join(__dirname, '../../src/images/icon_base.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 },
    show: true
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

  // ウィンドウを閉じた時はトレイに隠す（macOSの慣例）
  // ただし、明示的に終了する場合（Cmd+Q、メニューからQuit、Dockから終了）は終了させる
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // 開発環境または設定で有効にされた場合は開発者ツールを開く
  const developerConfig = configManager.getDeveloperConfig();
  if (developerConfig.showDevTools) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  // icon_base.pngからトレイアイコンを作成
  // 開発環境とビルド環境の両方で動作するパス
  let iconPath: string;
  if (app.isPackaged) {
    // パッケージ化された環境: resourcesディレクトリ内のアイコンを使用
    iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon_base.png');
  } else {
    // 開発環境: srcディレクトリ内のアイコンを使用
    iconPath = path.join(__dirname, '../../src/images/icon_base.png');
  }
  
  const icon = nativeImage.createFromPath(iconPath);
  
  // macOS用の16x16アイコンサイズに調整
  const resizedIcon = icon.resize({ width: 16, height: 16 });
  resizedIcon.setTemplateImage(true);
  
  tray = new Tray(resizedIcon);
  
  // トレイメニューを作成
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ウィンドウを表示',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'アプリを終了',
      click: forceQuitApp
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('パクロー');
  
  // トレイアイコンをクリックした時の動作
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

// アプリを強制終了する関数
function forceQuitApp() {
  console.log('Force quitting application...');

  // ウィンドウを明示的に閉じる
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }

  // トレイを削除
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // PowerMonitorサービスを停止
  if (powerMonitorService) {
    powerMonitorService.stopMonitoring();
  }

  // BreakSchedulerを停止（休憩打刻予約を確実にキャンセル）
  if (breakScheduler) {
    console.log('Stopping BreakScheduler before quit...');
    breakScheduler.stop();
  }

  // 強制的にアプリを終了
  app.quit();

  // 念のため強制終了
  setTimeout(() => {
    console.log('Force exiting process...');
    process.exit(0);
  }, 1000);
}


app.whenReady().then(() => {
  // アプリ名を設定（Dockに表示される名前）
  app.setName('PackRaw');
  
  // macOSのDockメニューをカスタマイズ
  if (process.platform === 'darwin') {
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'ウィンドウを表示',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'アプリを終了',
        click: forceQuitApp
      }
    ]);
    app.dock?.setMenu(dockMenu);
  }
  
  createWindow();
  createTray();

  // PowerMonitorService を初期化
  powerMonitorService = new PowerMonitorService(configManager);
  if (mainWindow) {
    powerMonitorService.setMainWindow(mainWindow);
  }

  // UpdaterService を初期化（自動更新）
  if (mainWindow) {
    updaterService = new UpdaterService(mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // macOSでは全ウィンドウが閉じられてもトレイに残る
  // ただし、トレイが削除されている場合（強制終了）はアプリも終了
  if (process.platform !== 'darwin' || !tray) {
    app.quit();
  }
});

app.on('before-quit', () => {
  // アプリが終了することを示すフラグを立てる
  isQuitting = true;

  // アプリ終了時はトレイも削除
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // PowerMonitorサービスも停止
  if (powerMonitorService) {
    powerMonitorService.stopMonitoring();
  }

  // BreakSchedulerも停止
  if (breakScheduler) {
    breakScheduler.stop();
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

// 設定ファイルパスを取得
ipcMain.handle('get-config-path', () => {
  return configManager.getConfigPath();
});

// API設定を手動で設定（開発用）
ipcMain.handle('set-api-config', (_event, apiConfig) => {
  configManager.setInitialApiConfig(apiConfig);
  return configManager.getConfig();
});


// freee API関連のハンドラー
ipcMain.handle('freee-api-init', () => {
  const config = configManager.getConfig();
  console.log('ConfigManager.getConfig():', JSON.stringify(config, null, 2));
  console.log('Config file path:', configManager.getConfigPath());
  
  if (config.api) {
    console.log('API config found, initializing FreeeApiService...');
    freeeApiService = new FreeeApiService({
      clientId: config.api.clientId,
      clientSecret: config.api.clientSecret,
      redirectUri: config.api.redirectUri,
      accessToken: config.api.accessToken,
      refreshToken: config.api.refreshToken,
      refreshTokenExpiresAt: config.api.refreshTokenExpiresAt,
      companyId: config.api.companyId,
      employeeId: config.api.employeeId,
    }, configManager);
    
    // PowerMonitorService に FreeeApiService を設定
    if (powerMonitorService) {
      powerMonitorService.setFreeeApiService(freeeApiService);

      // アプリ起動時の自動出勤チェック（非同期で実行、エラーは無視）
      powerMonitorService.checkAutoClockInOnStartup().catch(error => {
        console.error('[Main] Auto clock-in on startup failed:', error);
      });
    }

    // BreakScheduler を初期化
    breakScheduler = new BreakScheduler(configManager, freeeApiService);
    const breakConfig = breakScheduler.getConfig();
    if (breakConfig.enabled) {
      breakScheduler.start();
    }

    return true;
  } else {
    console.log('No API config found in config');
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

// トークン情報を設定ファイルに保存する共通処理
function saveTokensToConfig() {
  if (!freeeApiService) return;

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
}

ipcMain.handle('freee-api-time-clock', async (_event, type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.timeClock(type);
    // API呼び出し後にトークンを保存（リフレッシュされた可能性があるため）
    saveTokensToConfig();
    return result;
  } catch (error) {
    // エラー時もトークンを保存（リフレッシュは成功している可能性があるため）
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-today-work-record', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getTodayWorkRecord();
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-work-record', async (_event, date: string) => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getWorkRecord(date);
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-companies', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getCompanies();
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-time-clock-button-states', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getTimeClockButtonStates();
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-last-time-clock-type', async () => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getLastTimeClockType();
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-time-clocks', async (_event, fromDate?: string, toDate?: string) => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getTimeClocks(fromDate, toDate);
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-get-time-clocks-from-work-record', async (_event, date: string) => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.getTimeClocksFromWorkRecord(date);
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-update-work-record', async (_event, date: string, breakRecords: Array<{ clock_in_at: string; clock_out_at: string }>, clockInAt?: string, clockOutAt?: string | null) => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.updateWorkRecord(date, breakRecords, clockInAt, clockOutAt);
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

ipcMain.handle('freee-api-delete-work-record', async (_event, date: string) => {
  if (!freeeApiService) throw new Error('API service not initialized');
  try {
    const result = await freeeApiService.deleteWorkRecord(date);
    saveTokensToConfig();
    return result;
  } catch (error) {
    saveTokensToConfig();
    throw error;
  }
});

// BreakScheduler関連のハンドラー
ipcMain.handle('break-scheduler-get-config', () => {
  if (!breakScheduler) throw new Error('Break scheduler not initialized');
  return breakScheduler.getConfig();
});

ipcMain.handle('break-scheduler-update-config', (_event, config) => {
  if (!breakScheduler) throw new Error('Break scheduler not initialized');
  breakScheduler.updateConfig(config);
  return breakScheduler.getConfig();
});

ipcMain.handle('break-scheduler-get-next-schedule', () => {
  if (!breakScheduler) throw new Error('Break scheduler not initialized');
  return breakScheduler.getNextSchedule();
});

// AutoTimeClock関連のハンドラー
ipcMain.handle('auto-time-clock-get-config', () => {
  return configManager.getAutoTimeClockConfig();
});

ipcMain.handle('auto-time-clock-update-config', (_event, config) => {
  return configManager.updateAutoTimeClockConfig(config);
});

// 自動更新関連のハンドラー
ipcMain.handle('check-for-updates', () => {
  if (!updaterService) throw new Error('Updater service not initialized');
  updaterService.checkForUpdates();
});
