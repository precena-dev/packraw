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
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayDateString = this.getJSTDateString();

    const nextBreak = this.todaySchedule.find(
      schedule => !schedule.executed && schedule.scheduledTime > now
    );

    if (!nextBreak) {
      return null;
    }

    // 予約時刻が当日かチェック
    const scheduleJST = new Date(nextBreak.scheduledTime.getTime() + 9 * 60 * 60 * 1000);
    const scheduleDateString = scheduleJST.toISOString().split('T')[0];

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
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    // 休憩開始時刻
    const breakStartTime = this.parseTimeWithRandomOffset(
      this.config.breakStartTime,
      this.config.randomOffsetMinutes
    );
    breakStartTime.setFullYear(jstNow.getFullYear());
    breakStartTime.setMonth(jstNow.getMonth());
    breakStartTime.setDate(jstNow.getDate());

    // 休憩終了時刻
    const breakEndTime = this.parseTimeWithRandomOffset(
      this.config.breakEndTime,
      this.config.randomOffsetMinutes
    );
    breakEndTime.setFullYear(jstNow.getFullYear());
    breakEndTime.setMonth(jstNow.getMonth());
    breakEndTime.setDate(jstNow.getDate());

    this.todaySchedule = [
      {
        type: 'break_begin',
        scheduledTime: breakStartTime,
        executed: false
      },
      {
        type: 'break_end',
        scheduledTime: breakEndTime,
        executed: false
      }
    ];

    console.log('[BreakScheduler] Today\'s schedule generated:', {
      breakStart: breakStartTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      breakEnd: breakEndTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    });
  }

  /**
   * 時刻文字列をパースしてランダム誤差を加える
   */
  private parseTimeWithRandomOffset(timeString: string, offsetMinutes: number): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();

    // 日本時間で時刻を設定
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    jstDate.setHours(hours, minutes, 0, 0);

    // ランダム誤差を追加（-offsetMinutes 〜 +offsetMinutes）
    const randomOffset = Math.floor(Math.random() * (offsetMinutes * 2 + 1)) - offsetMinutes;
    jstDate.setMinutes(jstDate.getMinutes() + randomOffset);

    return jstDate;
  }

  /**
   * スケジュールをチェックして実行
   */
  private async checkAndExecute(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const today = this.getJSTDateString();

    // 日付が変わったら新しいスケジュールを生成
    if (this.lastCheckedDate !== today) {
      this.generateTodaySchedule();
    }

    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    for (const schedule of this.todaySchedule) {
      if (schedule.executed) {
        continue;
      }

      // 予定時刻を過ぎているかチェック
      if (jstNow >= schedule.scheduledTime) {
        console.log(`[BreakScheduler] Executing ${schedule.type} at ${jstNow.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);

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
   * 日本時間での今日の日付を取得（YYYY-MM-DD）
   */
  private getJSTDateString(): string {
    const now = new Date();
    const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().split('T')[0];
  }
}
