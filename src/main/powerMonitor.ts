import { powerMonitor, ipcMain, BrowserWindow, app } from 'electron';
import { FreeeApiService } from './freeeApi';
import { ConfigManager } from './config';

export class PowerMonitorService {
  private freeeApiService: FreeeApiService | null = null;
  private isMonitoring = false;
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  private isShuttingDown = false;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.setupIpcHandlers();
    this.setupShutdownHandler();

    // 設定ファイルから初期状態を読み込み
    const powerMonitorConfig = this.configManager.getPowerMonitorConfig();
    if (powerMonitorConfig.enabled) {
    }
  }

  /**
   * 現在時刻が指定時刻以降かを判定
   */
  private isAfterSpecifiedTime(specifiedTime: string): boolean {
    const now = new Date();
    const [targetHours, targetMinutes] = specifiedTime.split(':').map(Number);

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();


    // 時間で比較
    if (currentHours > targetHours) {
      return true;
    } else if (currentHours === targetHours) {
      return currentMinutes >= targetMinutes;
    }
    return false;
  }

  /**
   * 時間帯別自動退勤を実行するかどうか判定
   */
  private async shouldAutoClockOutBasedOnTime(): Promise<boolean> {
    const config = this.configManager.getAutoTimeClockConfig();
    const afterTimeConfig = config.autoClockOutAfterTime;

    if (!afterTimeConfig || !afterTimeConfig.enabled) {
      return false;
    }

    // 指定時刻以降かチェック
    if (!this.isAfterSpecifiedTime(afterTimeConfig.time)) {
      return false;
    }

    // 最後の打刻タイプを確認
    if (!this.freeeApiService) {
      return false;
    }

    try {
      const lastType = await this.freeeApiService.getLastTimeClockType();
      const shouldClockOut = lastType !== 'clock_out' && lastType !== null;
      return shouldClockOut;
    } catch (error) {
      console.error('[PowerMonitor] Error checking last time clock type:', error);
      return false;
    }
  }

  /**
   * 休憩中かどうかを判定
   */
  private async isOnBreak(): Promise<boolean> {
    if (!this.freeeApiService) {
      return false;
    }

    try {
      const lastType = await this.freeeApiService.getLastTimeClockType();
      return lastType === 'break_begin';
    } catch (error) {
      console.error('[PowerMonitor] Error checking if on break:', error);
      return false;
    }
  }

  /**
   * 退勤処理（休憩中の場合は先に休憩終了）
   * 全ての退勤処理でこのメソッドを使用することで、統一的な処理を実現
   */
  private async executeClockOut(): Promise<void> {
    if (!this.freeeApiService) {
      throw new Error('FreeeApiService not available');
    }

    // 休憩中の場合は先に休憩終了
    if (await this.isOnBreak()) {
      await this.freeeApiService.timeClock('break_end');
    }

    // 退勤処理
    await this.freeeApiService.timeClock('clock_out');
  }

  /**
   * シャットダウン検知のセットアップ
   */
  private setupShutdownHandler() {
    // PCシャットダウン時の処理
    powerMonitor.on('shutdown' as any, async (event: any) => {

      // 通常の自動退勤設定をチェック（時間帯別は対象外）
      const config = this.configManager.getConfig();
      const autoClockOutEnabled = (config.app as any)?.autoTimeClock?.autoClockOutOnShutdown;

      if (!autoClockOutEnabled) {
        return;
      }

      if (!this.freeeApiService) {
        return;
      }

      // シャットダウンを一時的に防ぐ
      event.preventDefault();
      this.isShuttingDown = true;

      try {
        // 最後の打刻タイプを取得
        const lastType = await this.freeeApiService.getLastTimeClockType();

        // 退勤していない場合は自動退勤（統一的な退勤処理を使用）
        if (lastType !== 'clock_out' && lastType !== null) {
          await this.executeClockOut();
        } else {
        }
      } catch (error) {
        console.error('[PowerMonitor] Failed to auto clock-out:', error);
      } finally {
        // 処理完了後、アプリを終了
        this.isShuttingDown = false;
        app.quit();
      }
    });
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
      return false;
    }

    if (!this.freeeApiService) {
      console.error('FreeeApiService is not set');
      return false;
    }

    this.isMonitoring = true;

    // システムサスペンド時の統合処理
    powerMonitor.on('suspend', async () => {

      // 優先度1: 時間帯別自動退勤のチェック
      if (await this.shouldAutoClockOutBasedOnTime()) {
        try {
          await this.executeClockOut();
          this.notifyRenderer('auto_clock_out_time_based');
          return; // 退勤した場合は休憩開始処理をスキップ
        } catch (error) {
          console.error('[PowerMonitor] Failed to auto clock-out on suspend:', error);
        }
      }

      // 優先度2: 自動休憩機能（時間帯別自動退勤が実行されなかった場合のみ）
      try {
        await this.freeeApiService!.timeClock('break_begin');
        this.notifyRenderer('break_started');
      } catch (error) {
        console.error('[PowerMonitor] Failed to start break on system suspend:', error);
      }
    });

    // システムレジューム時 → 休憩終了
    powerMonitor.on('resume', async () => {
      try {
        await this.freeeApiService!.timeClock('break_end');
        this.notifyRenderer('break_ended');
      } catch (error) {
        console.error('[PowerMonitor] Failed to end break on system resume:', error);
      }
    });

    // スクリーンロック時の統合処理
    powerMonitor.on('lock-screen', async () => {

      // 優先度1: 時間帯別自動退勤のチェック
      if (await this.shouldAutoClockOutBasedOnTime()) {
        try {
          await this.executeClockOut();
          this.notifyRenderer('auto_clock_out_time_based');
          return; // 退勤した場合は休憩開始処理をスキップ
        } catch (error) {
          console.error('[PowerMonitor] Failed to auto clock-out on lock-screen:', error);
        }
      }

      // 優先度2: 自動休憩機能（時間帯別自動退勤が実行されなかった場合のみ）
      try {
        await this.freeeApiService!.timeClock('break_begin');
        this.notifyRenderer('break_started');
      } catch (error) {
        console.error('[PowerMonitor] Failed to start break on screen lock:', error);
      }
    });

    // スクリーンアンロック時 → 休憩終了
    powerMonitor.on('unlock-screen', async () => {
      try {
        await this.freeeApiService!.timeClock('break_end');
        this.notifyRenderer('break_ended');
      } catch (error) {
        console.error('[PowerMonitor] Failed to end break on screen unlock:', error);
      }
    });

    return true;
  }

  public stopMonitoring(): boolean {
    if (!this.isMonitoring) {
      return false;
    }

    
    // 全てのイベントリスナーを削除
    powerMonitor.removeAllListeners('suspend');
    powerMonitor.removeAllListeners('resume');
    powerMonitor.removeAllListeners('lock-screen');
    powerMonitor.removeAllListeners('unlock-screen');

    this.isMonitoring = false;
    return true;
  }

  public getStatus(): { isMonitoring: boolean; hasFreeeApi: boolean } {
    return {
      isMonitoring: this.isMonitoring,
      hasFreeeApi: this.freeeApiService !== null
    };
  }

  /**
   * アプリ起動時の自動出勤チェック
   */
  public async checkAutoClockInOnStartup(): Promise<void> {
    const config = this.configManager.getConfig();
    const autoClockInEnabled = (config.app as any)?.autoTimeClock?.autoClockInOnStartup;

    if (!autoClockInEnabled) {
      return;
    }

    // 土日チェック
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      const autoTimeClockConfig = this.configManager.getAutoTimeClockConfig();
      // disableWeekendsのデフォルト値はtrue（土日無効）
      const shouldDisableWeekends = autoTimeClockConfig.disableWeekends ?? true;

      if (shouldDisableWeekends) {
        return;
      }
    }

    if (!this.freeeApiService) {
      return;
    }

    try {
      // 最後の打刻タイプを取得
      const lastType = await this.freeeApiService.getLastTimeClockType();

      // 出勤していない場合は自動出勤
      if (lastType === null) {
        await this.freeeApiService.timeClock('clock_in');

        // レンダラープロセスに通知
        this.notifyRenderer('auto_clock_in');
      } else {
      }
    } catch (error) {
      console.error('[PowerMonitor] Failed to auto clock-in on startup:', error);
    }
  }
}