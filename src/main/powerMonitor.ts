import { powerMonitor, ipcMain, BrowserWindow } from 'electron';
import { FreeeApiService } from './freeeApi';
import { ConfigManager } from './config';

export class PowerMonitorService {
  private freeeApiService: FreeeApiService | null = null;
  private isMonitoring = false;
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  
  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.setupIpcHandlers();
    
    // 設定ファイルから初期状態を読み込み
    const powerMonitorConfig = this.configManager.getPowerMonitorConfig();
    if (powerMonitorConfig.enabled) {
      console.log('PowerMonitor auto-start enabled from config');
    }
  }

  private setupIpcHandlers() {
    // レンダラープロセスから監視開始/停止を制御
    ipcMain.handle('powerMonitor:start', () => {
      const result = this.startMonitoring();
      if (result) {
        this.configManager.setPowerMonitorEnabled(true);
      }
      return result;
    });

    ipcMain.handle('powerMonitor:stop', () => {
      const result = this.stopMonitoring();
      if (result) {
        this.configManager.setPowerMonitorEnabled(false);
      }
      return result;
    });

    ipcMain.handle('powerMonitor:isMonitoring', () => {
      return this.isMonitoring;
    });
  }

  public setFreeeApiService(service: FreeeApiService) {
    this.freeeApiService = service;
    
    // freeeApiServiceが設定されたら、設定ファイルで有効になっている場合は自動開始
    const powerMonitorConfig = this.configManager.getPowerMonitorConfig();
    if (powerMonitorConfig.enabled && !this.isMonitoring) {
      console.log('Auto-starting PowerMonitor based on saved config');
      this.startMonitoring();
    }
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private notifyRenderer(eventType: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('power-monitor-event', eventType);
    }
  }

  public startMonitoring(): boolean {
    if (this.isMonitoring) {
      console.log('PowerMonitor is already running');
      return false;
    }

    if (!this.freeeApiService) {
      console.error('FreeeApiService is not set');
      return false;
    }

    console.log('Starting PowerMonitor service...');
    this.isMonitoring = true;

    // システムサスペンド時 → 休憩開始
    powerMonitor.on('suspend', async () => {
      console.log('System suspend detected - starting break');
      try {
        await this.freeeApiService!.timeClock('break_begin');
        console.log('Break started successfully due to system suspend');
        this.notifyRenderer('break_started');
      } catch (error) {
        console.error('Failed to start break on system suspend:', error);
      }
    });

    // システムレジューム時 → 休憩終了
    powerMonitor.on('resume', async () => {
      console.log('System resume detected - ending break');
      try {
        await this.freeeApiService!.timeClock('break_end');
        console.log('Break ended successfully due to system resume');
        this.notifyRenderer('break_ended');
      } catch (error) {
        console.error('Failed to end break on system resume:', error);
      }
    });

    // スクリーンロック時 → 休憩開始
    powerMonitor.on('lock-screen', async () => {
      console.log('Screen lock detected - starting break');
      try {
        await this.freeeApiService!.timeClock('break_begin');
        console.log('Break started successfully due to screen lock');
        this.notifyRenderer('break_started');
      } catch (error) {
        console.error('Failed to start break on screen lock:', error);
      }
    });

    // スクリーンアンロック時 → 休憩終了
    powerMonitor.on('unlock-screen', async () => {
      console.log('Screen unlock detected - ending break');
      try {
        await this.freeeApiService!.timeClock('break_end');
        console.log('Break ended successfully due to screen unlock');
        this.notifyRenderer('break_ended');
      } catch (error) {
        console.error('Failed to end break on screen unlock:', error);
      }
    });

    console.log('PowerMonitor service started successfully');
    return true;
  }

  public stopMonitoring(): boolean {
    if (!this.isMonitoring) {
      console.log('PowerMonitor is not running');
      return false;
    }

    console.log('Stopping PowerMonitor service...');
    
    // 全てのイベントリスナーを削除
    powerMonitor.removeAllListeners('suspend');
    powerMonitor.removeAllListeners('resume');
    powerMonitor.removeAllListeners('lock-screen');
    powerMonitor.removeAllListeners('unlock-screen');

    this.isMonitoring = false;
    console.log('PowerMonitor service stopped successfully');
    return true;
  }

  public getStatus(): { isMonitoring: boolean; hasFreeeApi: boolean } {
    return {
      isMonitoring: this.isMonitoring,
      hasFreeeApi: this.freeeApiService !== null
    };
  }
}