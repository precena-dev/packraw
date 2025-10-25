/**
 * 自動休憩打刻スケジューラーサービス
 *
 * 設定された時刻に自動的に休憩開始・終了の打刻を行う
 * ランダム誤差機能により、毎日異なるタイミングで打刻
 */

import { FreeeApiService } from './freeeApi';
import { ConfigManager } from './config';

export interface BreakScheduleConfig {
  enabled: boolean;
  breakStartTime: string; // "HH:MM" format
  breakEndTime: string;   // "HH:MM" format
  randomOffsetMinutes: number; // ±minutes
}

interface ScheduledBreak {
  type: 'break_begin' | 'break_end';
  scheduledTime: Date;
  executed: boolean;
}

export class BreakScheduler {
  private config: BreakScheduleConfig;
  private configManager: ConfigManager;
  private freeeApi: FreeeApiService;
  private checkInterval: NodeJS.Timeout | null = null;
  private todaySchedule: ScheduledBreak[] = [];
  private lastCheckedDate: string = '';
  private isStopping: boolean = false; // 停止処理中フラグ

  constructor(configManager: ConfigManager, freeeApi: FreeeApiService) {
    this.configManager = configManager;
    this.freeeApi = freeeApi;

    // 設定を読み込み、デフォルト値を設定
    const appConfig = this.configManager.getConfig().app as any;
    this.config = appConfig?.breakSchedule || {
      enabled: false,
      breakStartTime: '12:00',
      breakEndTime: '13:00',
      randomOffsetMinutes: 5
    };
  }

  /**
   * スケジューラーを開始
   */
  start(): void {
    if (this.checkInterval) {
      return; // 既に起動中
    }

    console.log('[BreakScheduler] Starting scheduler');
    this.isStopping = false; // 停止フラグをリセット

    // 初回の今日のスケジュールを生成
    this.generateTodaySchedule();

    // 1分ごとにチェック
    this.checkInterval = setInterval(() => {
      this.checkAndExecute();
    }, 60 * 1000); // 1分

    // 起動時に即座にチェック
    this.checkAndExecute();
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    console.log('[BreakScheduler] Stopping scheduler...');
    this.isStopping = true; // 停止処理中フラグを立てる

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[BreakScheduler] Scheduler stopped');
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<BreakScheduleConfig>): void {
    this.config = { ...this.config, ...config };

    // 設定ファイルに永続化
    const currentConfig = this.configManager.getConfig();
    const updatedConfig = {
      ...currentConfig,
      app: {
        ...(currentConfig.app || {}),
        breakSchedule: this.config
      }
    };
    this.configManager.updateConfig(updatedConfig);

    console.log('[BreakScheduler] Config updated:', this.config);

    // スケジュールを再生成
    this.generateTodaySchedule();

    // 有効/無効に応じてスケジューラーを制御
    if (this.config.enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): BreakScheduleConfig {
    return { ...this.config };
  }

  /**
   * 次回予約情報を取得（当日のみ）
   */
  getNextSchedule(): { type: string; time: Date } | null {
    if (!this.config.enabled) {
      return null;
    }

    const now = new Date();
    const todayDateString = this.getJSTDateString();

    const nextBreak = this.todaySchedule.find(
      schedule => !schedule.executed && schedule.scheduledTime > now
    );

    if (!nextBreak) {
      return null;
    }

    // 予約時刻が当日かチェック
    const scheduleDateString = this.formatDateToYYYYMMDD(nextBreak.scheduledTime);

    // 当日の予約のみ返す
    if (scheduleDateString !== todayDateString) {
      return null;
    }

    return {
      type: nextBreak.type === 'break_begin' ? '休憩開始' : '休憩終了',
      time: nextBreak.scheduledTime
    };
  }

  /**
   * 今日のスケジュールを生成（ランダム誤差を含む）
   */
  private generateTodaySchedule(): void {
    const today = this.getJSTDateString();

    // 日付が変わったらスケジュールをリセット
    if (this.lastCheckedDate !== today) {
      this.todaySchedule = [];
      this.lastCheckedDate = today;
    }

    if (this.todaySchedule.length > 0) {
      return; // 既に生成済み
    }

    const now = new Date();

    // 休憩開始時刻
    const breakStartTime = this.parseTimeWithRandomOffset(
      this.config.breakStartTime,
      this.config.randomOffsetMinutes
    );
    breakStartTime.setFullYear(now.getFullYear());
    breakStartTime.setMonth(now.getMonth());
    breakStartTime.setDate(now.getDate());

    // 休憩終了時刻
    const breakEndTime = this.parseTimeWithRandomOffset(
      this.config.breakEndTime,
      this.config.randomOffsetMinutes
    );
    breakEndTime.setFullYear(now.getFullYear());
    breakEndTime.setMonth(now.getMonth());
    breakEndTime.setDate(now.getDate());

    // スケジュール生成時に既に予定時刻を過ぎている場合は、executed = true にする
    const breakStartExecuted = now > breakStartTime;
    const breakEndExecuted = now > breakEndTime;

    this.todaySchedule = [
      {
        type: 'break_begin',
        scheduledTime: breakStartTime,
        executed: breakStartExecuted
      },
      {
        type: 'break_end',
        scheduledTime: breakEndTime,
        executed: breakEndExecuted
      }
    ];

    console.log('[BreakScheduler] Today\'s schedule generated:', {
      breakStart: breakStartTime.toLocaleString('ja-JP') + (breakStartExecuted ? ' (already passed)' : ''),
      breakEnd: breakEndTime.toLocaleString('ja-JP') + (breakEndExecuted ? ' (already passed)' : '')
    });
  }

  /**
   * 時刻文字列をパースしてランダム誤差を加える
   */
  private parseTimeWithRandomOffset(timeString: string, offsetMinutes: number): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();

    // システム時刻（JST）で時刻を設定
    date.setHours(hours, minutes, 0, 0);

    // ランダム誤差を追加（-offsetMinutes 〜 +offsetMinutes）
    const randomOffset = Math.floor(Math.random() * (offsetMinutes * 2 + 1)) - offsetMinutes;
    date.setMinutes(date.getMinutes() + randomOffset);

    return date;
  }

  /**
   * スケジュールをチェックして実行
   */
  private async checkAndExecute(): Promise<void> {
    // 停止処理中は実行しない
    if (this.isStopping) {
      console.log('[BreakScheduler] Scheduler is stopping, skipping execution');
      return;
    }

    // 土日チェック（FreeeApiServiceのtimeClockで土日チェックされるが、ここでも事前チェック）
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('[BreakScheduler] Weekend detected, skipping auto break');
      return;
    }

    if (!this.config.enabled) {
      return;
    }

    const today = this.getJSTDateString();

    // 日付が変わったら新しいスケジュールを生成
    if (this.lastCheckedDate !== today) {
      this.generateTodaySchedule();
    }

    for (const schedule of this.todaySchedule) {
      if (schedule.executed) {
        continue;
      }

      // 予定時刻を過ぎているかチェック
      if (now >= schedule.scheduledTime) {
        // 打刻実行前に再度停止フラグをチェック
        if (this.isStopping) {
          console.log('[BreakScheduler] Scheduler stopped during execution, aborting time clock');
          return;
        }

        // 現在の勤務状態を確認して、実行可能かチェック
        const canExecute = await this.canExecuteTimeClock(schedule.type);
        if (!canExecute) {
          console.log(`[BreakScheduler] ${schedule.type} cannot be executed in current state, skipping`);
          schedule.executed = true;
          continue;
        }

        console.log(`[BreakScheduler] Executing ${schedule.type} at ${now.toLocaleString('ja-JP')}`);

        try {
          await this.freeeApi.timeClock(schedule.type);
          schedule.executed = true;
          console.log(`[BreakScheduler] ${schedule.type} executed successfully`);
        } catch (error) {
          console.error(`[BreakScheduler] Failed to execute ${schedule.type}:`, error);
          // エラーが発生してもexecutedフラグは立てる（何度も実行されないように）
          schedule.executed = true;
        }
      }
    }
  }

  /**
   * 現在の勤務状態で指定された打刻が実行可能かチェック
   */
  private async canExecuteTimeClock(type: 'break_begin' | 'break_end'): Promise<boolean> {
    try {
      const buttonStates = await this.freeeApi.getTimeClockButtonStates();

      if (type === 'break_begin') {
        // 休憩開始は、休憩開始ボタンが有効な場合のみ実行可能
        return buttonStates.breakBegin === true;
      } else if (type === 'break_end') {
        // 休憩終了は、休憩終了ボタンが有効な場合のみ実行可能
        if (!buttonStates.breakEnd) {
          return false;
        }

        // 最後の休憩打刻から1分以上経過しているかチェック
        const lastBreakTime = await this.getLastBreakBeginTime();
        if (lastBreakTime) {
          const now = new Date();
          const timeSinceLastBreak = now.getTime() - lastBreakTime.getTime();
          const minutesSinceLastBreak = timeSinceLastBreak / (60 * 1000);

          if (minutesSinceLastBreak < 1) {
            console.log(`[BreakScheduler] break_end skipped - only ${minutesSinceLastBreak.toFixed(1)} minutes since last break_begin`);
            return false;
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('[BreakScheduler] Failed to check button states:', error);
      // エラー時は安全のため、実行不可として扱う
      return false;
    }
  }

  /**
   * 今日の最後の休憩開始時刻を取得
   */
  private async getLastBreakBeginTime(): Promise<Date | null> {
    try {
      const today = this.getJSTDateString();
      const timeClocks = await this.freeeApi.getTimeClocks(today, today);

      // 休憩開始（break_begin）の打刻を探す
      const breakBegins = timeClocks.filter(clock => clock.type === 'break_begin');
      if (breakBegins.length === 0) {
        return null;
      }

      // 最新の休憩開始時刻を取得
      const sortedBreaks = breakBegins.sort((a, b) =>
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      );

      return new Date(sortedBreaks[0].datetime);
    } catch (error) {
      console.error('[BreakScheduler] Failed to get last break begin time:', error);
      return null;
    }
  }

  /**
   * 日本時間での今日の日付を取得（YYYY-MM-DD）
   */
  private getJSTDateString(): string {
    const now = new Date();
    return this.formatDateToYYYYMMDD(now);
  }

  /**
   * Date オブジェクトを YYYY-MM-DD 形式にフォーマット
   */
  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
