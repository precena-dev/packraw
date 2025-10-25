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
    this.setupSleepSuspendHandler();

    // 設定ファイルから初期状態を読み込み
    const powerMonitorConfig = this.configManager.getPowerMonitorConfig();
    if (powerMonitorConfig.enabled) {
      console.log('PowerMonitor auto-start enabled from config');
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

    console.log(`[PowerMonitor] Time check: Current ${currentHours}:${String(currentMinutes).padStart(2, '0')}, Target ${targetHours}:${String(targetMinutes).padStart(2, '0')}`);

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
      console.log(`[PowerMonitor] Current time is before ${afterTimeConfig.time}, skipping auto clock-out`);
      return false;
    }

    // 最後の打刻タイプを確認
    if (!this.freeeApiService) {
      console.log(`[PowerMonitor] FreeeApiService not available`);
      return false;
    }

    try {
      const lastType = await this.freeeApiService.getLastTimeClockType();
      const shouldClockOut = lastType !== 'clock_out' && lastType !== null;
      console.log(`[PowerMonitor] Last time clock type: ${lastType}, should clock out: ${shouldClockOut}`);
      return shouldClockOut;
    } catch (error) {
      console.error('[PowerMonitor] Error checking last time clock type:', error);
      return false;
    }
  }

  /**
   * スリープ・サスペンドイベントのハンドラーをセットアップ
   */
  private setupSleepSuspendHandler() {
    // システムサスペンド時の処理
    powerMonitor.on('suspend', async () => {
      console.log('[PowerMonitor] System suspend detected');

      // 時間帯別自動退勤のチェック
      if (await this.shouldAutoClockOutBasedOnTime()) {
        try {
          console.log('[PowerMonitor] Auto clocking out based on time configuration...');
          await this.freeeApiService!.timeClock('clock_out');
          console.log('[PowerMonitor] Clock-out successful on suspend');
          this.notifyRenderer('auto_clock_out_time_based');
        } catch (error) {
          console.error('[PowerMonitor] Failed to auto clock-out on suspend:', error);
        }
      }
    });

    // macOSでのスリープイベント検知（lock-screenで代用）
    powerMonitor.on('lock-screen', async () => {
      console.log('[PowerMonitor] Screen lock detected (may indicate sleep on macOS)');

      // 時間帯別自動退勤のチェック
      if (await this.shouldAutoClockOutBasedOnTime()) {
        try {
          console.log('[PowerMonitor] Auto clocking out based on time configuration...');
          await this.freeeApiService!.timeClock('clock_out');
          console.log('[PowerMonitor] Clock-out successful on lock-screen');
          this.notifyRenderer('auto_clock_out_time_based');
        } catch (error) {
          console.error('[PowerMonitor] Failed to auto clock-out on lock-screen:', error);
        }
      }
    });
  }

  /**
   * シャットダウン検知のセットアップ
   */
  private setupShutdownHandler() {
    // PCシャットダウン時の処理
    powerMonitor.on('shutdown' as any, async (event: any) => {
      console.log('[PowerMonitor] System shutdown detected');

      // 通常の自動退勤設定をチェック（時間帯別は対象外）
      const config = this.configManager.getConfig();
      const autoClockOutEnabled = (config.app as any)?.autoTimeClock?.autoClockOutOnShutdown;

      if (!autoClockOutEnabled) {
        console.log('[PowerMonitor] Auto clock-out on shutdown is disabled');
        return;
      }

      if (!this.freeeApiService) {
        console.log('[PowerMonitor] FreeeApiService not available');
        return;
      }

      // シャットダウンを一時的に防ぐ
      event.preventDefault();
      this.isShuttingDown = true;

      try {
        // 最後の打刻タイプを取得
        const lastType = await this.freeeApiService.getLastTimeClockType();
        console.log('[PowerMonitor] Last time clock type:', lastType);

        // 退勤していない場合は自動退勤
        if (lastType !== 'clock_out' && lastType !== null) {
          console.log('[PowerMonitor] Clocking out automatically before shutdown...');
          await this.freeeApiService.timeClock('clock_out');
          console.log('[PowerMonitor] Clock-out successful');
        } else {
          console.log('[PowerMonitor] Already clocked out or no clock-in record, no action needed');
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

  /**
   * アプリ起動時の自動出勤チェック
   */
  public async checkAutoClockInOnStartup(): Promise<void> {
    const config = this.configManager.getConfig();
    const autoClockInEnabled = (config.app as any)?.autoTimeClock?.autoClockInOnStartup;

    if (!autoClockInEnabled) {
      console.log('[PowerMonitor] Auto clock-in on startup is disabled');
      return;
    }

    // 土日チェック
    const now = new Date();
    const dayOfWeek = now.getDay();
    const autoTimeClockConfig = this.configManager.getAutoTimeClockConfig();
    // disableWeekendsが未定義またはtrueの場合は土日スキップ
    if (autoTimeClockConfig.disableWeekends !== false && (dayOfWeek === 0 || dayOfWeek === 6)) {
      console.log('[PowerMonitor] Weekend detected, skipping auto clock-in on startup');
      return;
    }

    if (!this.freeeApiService) {
      console.log('[PowerMonitor] FreeeApiService not available for auto clock-in');
      return;
    }

    try {
      // 最後の打刻タイプを取得
      const lastType = await this.freeeApiService.getLastTimeClockType();
      console.log('[PowerMonitor] Last time clock type on startup:', lastType);

      // 出勤していない場合は自動出勤
      if (lastType === null) {
        console.log('[PowerMonitor] Clocking in automatically on startup...');
        await this.freeeApiService.timeClock('clock_in');
        console.log('[PowerMonitor] Clock-in successful');

        // レンダラープロセスに通知
        this.notifyRenderer('auto_clock_in');
      } else {
        console.log('[PowerMonitor] Already clocked in, no action needed');
      }
    } catch (error) {
      console.error('[PowerMonitor] Failed to auto clock-in on startup:', error);
    }
  }
}