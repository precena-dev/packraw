import { powerMonitor, ipcMain } from 'electron';
import { FreeeApiService } from './freeeApi';

export class PowerMonitorService {
  private freeeApiService: FreeeApiService | null = null;
  private isMonitoring = false;
  
  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    // レンダラープロセスから監視開始/停止を制御
    ipcMain.handle('powerMonitor:start', () => {
      return this.startMonitoring();
    });

    ipcMain.handle('powerMonitor:stop', () => {
      return this.stopMonitoring();
    });

    ipcMain.handle('powerMonitor:isMonitoring', () => {
      return this.isMonitoring;
    });
  }

  public setFreeeApiService(service: FreeeApiService) {
    this.freeeApiService = service;
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
        // await this.freeeApiService!.timeClock('break_begin');
        console.log('Break started successfully due to system suspend (API call disabled for testing)');
      } catch (error) {
        console.error('Failed to start break on system suspend:', error);
      }
    });

    // システムレジューム時 → 休憩終了
    powerMonitor.on('resume', async () => {
      console.log('System resume detected - ending break');
      try {
        // await this.freeeApiService!.timeClock('break_end');
        console.log('Break ended successfully due to system resume (API call disabled for testing)');
      } catch (error) {
        console.error('Failed to end break on system resume:', error);
      }
    });

    // スクリーンロック時 → 休憩開始
    powerMonitor.on('lock-screen', async () => {
      console.log('Screen lock detected - starting break');
      try {
        // await this.freeeApiService!.timeClock('break_begin');
        console.log('Break started successfully due to screen lock (API call disabled for testing)');
      } catch (error) {
        console.error('Failed to start break on screen lock:', error);
      }
    });

    // スクリーンアンロック時 → 休憩終了
    powerMonitor.on('unlock-screen', async () => {
      console.log('Screen unlock detected - ending break');
      try {
        // await this.freeeApiService!.timeClock('break_end');
        console.log('Break ended successfully due to screen unlock (API call disabled for testing)');
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