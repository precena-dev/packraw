import { powerMonitor, ipcMain, BrowserWindow, app } from 'electron';
import log from 'electron-log';
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
    this.setupShutdownHandler();
    this.setupSystemEventListeners(); // システムイベントリスナーを常に登録

    // 設定ファイルから初期状態を読み込み
    const powerMonitorConfig = this.configManager.getPowerMonitorConfig();
    this.isMonitoring = powerMonitorConfig.enabled;
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
    // macOS/Linux用: PCシャットダウン時の処理
    powerMonitor.on('shutdown' as any, async (event: any) => {
      log.info('[PowerMonitor] Shutdown event detected (macOS/Linux)');
      await this.handleShutdown(event);
    });
  }

  /**
   * シャットダウン時の共通処理
   * macOS/LinuxのshutdownイベントとWindowsのbefore-quitで使用
   */
  public async handleShutdown(event: any): Promise<void> {
    // 通常の自動退勤設定をチェック（時間帯別は対象外）
    const config = this.configManager.getConfig();
    const autoClockOutEnabled = (config.app as any)?.autoTimeClock?.autoClockOutOnShutdown;

    if (!autoClockOutEnabled) {
      log.info('[PowerMonitor] Auto clock-out on shutdown is disabled');
      return;
    }

    if (!this.freeeApiService) {
      log.warn('[PowerMonitor] FreeeApiService not available');
      return;
    }

    // シャットダウンを一時的に防ぐ
    event.preventDefault();

    try {
      // 最後の打刻タイプを取得
      const lastType = await this.freeeApiService.getLastTimeClockType();
      log.info(`[PowerMonitor] Last time clock type: ${lastType}`);

      // 退勤していない場合は自動退勤（統一的な退勤処理を使用）
      if (lastType !== 'clock_out' && lastType !== null) {
        log.info('[PowerMonitor] Executing auto clock-out on shutdown');
        await this.executeClockOut();
        log.info('[PowerMonitor] Auto clock-out completed successfully');
      } else {
        log.info('[PowerMonitor] Already clocked out, skipping auto clock-out');
      }
    } catch (error) {
      log.error('[PowerMonitor] Failed to auto clock-out on shutdown:', error);
    } finally {
      // 処理完了後、アプリを終了
      log.info('[PowerMonitor] Quitting application');
      app.quit();
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
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private notifyRenderer(eventType: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('power-monitor-event', eventType);
    }
  }

  /**
   * システムイベントリスナーのセットアップ（常に登録）
   */
  private setupSystemEventListeners() {
    // システムサスペンド時の統合処理
    powerMonitor.on('suspend', async () => {
      log.info('[PowerMonitor] System suspend event detected');

      if (!this.freeeApiService) {
        log.warn('[PowerMonitor] FreeeApiService not available');
        return;
      }

      // 優先度1: 時間帯別自動退勤のチェック
      if (await this.shouldAutoClockOutBasedOnTime()) {
        try {
          log.info('[PowerMonitor] Executing time-based auto clock-out on suspend');
          await this.executeClockOut();
          this.notifyRenderer('auto_clock_out_time_based');
          log.info('[PowerMonitor] Time-based auto clock-out completed');
          return; // 退勤した場合は休憩開始処理をスキップ
        } catch (error) {
          console.error('[PowerMonitor] Failed to auto clock-out on suspend:', error);
        }
      }

      // 優先度2: 自動休憩機能（自動休憩モードが有効な場合のみ）
      if (!this.isMonitoring) {
        log.info('[PowerMonitor] Auto break monitoring is disabled, skipping break start');
        return;
      }

      try {
        log.info('[PowerMonitor] Starting break on system suspend');
        await this.freeeApiService.timeClock('break_begin');
        this.notifyRenderer('break_started');
        log.info('[PowerMonitor] Break started successfully');
      } catch (error) {
        console.error('[PowerMonitor] Failed to start break on system suspend:', error);
      }
    });

    // システムレジューム時 → 休憩終了
    powerMonitor.on('resume', async () => {
      log.info('[PowerMonitor] System resume event detected');

      if (!this.freeeApiService) {
        log.warn('[PowerMonitor] FreeeApiService not available');
        return;
      }

      // 自動休憩モードが有効な場合のみ休憩終了
      if (!this.isMonitoring) {
        log.info('[PowerMonitor] Auto break monitoring is disabled, skipping break end');
        return;
      }

      try {
        log.info('[PowerMonitor] Ending break on system resume');
        await this.freeeApiService.timeClock('break_end');
        this.notifyRenderer('break_ended');
        log.info('[PowerMonitor] Break ended successfully');
      } catch (error) {
        console.error('[PowerMonitor] Failed to end break on system resume:', error);
      }
    });

    // スクリーンロック時の統合処理
    powerMonitor.on('lock-screen', async () => {
      log.info('[PowerMonitor] Screen lock event detected');

      if (!this.freeeApiService) {
        log.warn('[PowerMonitor] FreeeApiService not available');
        return;
      }

      // 優先度1: 時間帯別自動退勤のチェック
      if (await this.shouldAutoClockOutBasedOnTime()) {
        try {
          log.info('[PowerMonitor] Executing time-based auto clock-out on screen lock');
          await this.executeClockOut();
          this.notifyRenderer('auto_clock_out_time_based');
          log.info('[PowerMonitor] Time-based auto clock-out completed');
          return; // 退勤した場合は休憩開始処理をスキップ
        } catch (error) {
          console.error('[PowerMonitor] Failed to auto clock-out on lock-screen:', error);
        }
      }

      // 優先度2: 自動休憩機能（自動休憩モードが有効な場合のみ）
      if (!this.isMonitoring) {
        log.info('[PowerMonitor] Auto break monitoring is disabled, skipping break start');
        return;
      }

      try {
        log.info('[PowerMonitor] Starting break on screen lock');
        await this.freeeApiService.timeClock('break_begin');
        this.notifyRenderer('break_started');
        log.info('[PowerMonitor] Break started successfully');
      } catch (error) {
        console.error('[PowerMonitor] Failed to start break on screen lock:', error);
      }
    });

    // スクリーンアンロック時 → 休憩終了
    powerMonitor.on('unlock-screen', async () => {
      log.info('[PowerMonitor] Screen unlock event detected');

      if (!this.freeeApiService) {
        log.warn('[PowerMonitor] FreeeApiService not available');
        return;
      }

      // 自動休憩モードが有効な場合のみ休憩終了
      if (!this.isMonitoring) {
        log.info('[PowerMonitor] Auto break monitoring is disabled, skipping break end');
        return;
      }

      try {
        log.info('[PowerMonitor] Ending break on screen unlock');
        await this.freeeApiService.timeClock('break_end');
        this.notifyRenderer('break_ended');
        log.info('[PowerMonitor] Break ended successfully');
      } catch (error) {
        console.error('[PowerMonitor] Failed to end break on screen unlock:', error);
      }
    });
  }

  public startMonitoring(): boolean {
    if (this.isMonitoring) {
      return false;
    }

    this.isMonitoring = true;
    return true;
  }

  public stopMonitoring(): boolean {
    if (!this.isMonitoring) {
      return false;
    }

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
    log.info('[PowerMonitor] Checking auto clock-in on startup');

    const config = this.configManager.getConfig();
    const autoClockInEnabled = (config.app as any)?.autoTimeClock?.autoClockInOnStartup;

    if (!autoClockInEnabled) {
      log.info('[PowerMonitor] Auto clock-in on startup is disabled');
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
        log.info('[PowerMonitor] Weekend clock-in is disabled, skipping auto clock-in');
        return;
      }
    }

    if (!this.freeeApiService) {
      log.warn('[PowerMonitor] FreeeApiService not available');
      return;
    }

    try {
      // 最後の打刻タイプを取得
      const lastType = await this.freeeApiService.getLastTimeClockType();
      log.info(`[PowerMonitor] Last time clock type: ${lastType}`);

      // 出勤していない場合は自動出勤
      if (lastType === null) {
        log.info('[PowerMonitor] Executing auto clock-in on startup');
        await this.freeeApiService.timeClock('clock_in');
        this.notifyRenderer('auto_clock_in');
        log.info('[PowerMonitor] Auto clock-in completed successfully');
      } else {
        log.info('[PowerMonitor] Already has time clock record, skipping auto clock-in');
      }
    } catch (error) {
      console.error('[PowerMonitor] Failed to auto clock-in on startup:', error);
    }
  }
}