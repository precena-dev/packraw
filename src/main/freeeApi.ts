import axios, { AxiosInstance } from 'axios';
import { BrowserWindow } from 'electron';

export interface FreeeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string; 
  companyId?: number;
  employeeId?: number;
}

export interface TimeClockType {
  type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end';
  datetime?: string;
}

export interface WorkRecord {
  date: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  breakRecords: {
    clockInAt: string;
    clockOutAt: string | null;
  }[];
}

export interface TimeClock {
  id: number;
  type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end';
  date: string;
  datetime: string;
  original_datetime: string;
  note: string;
}

export interface TimeClockButtonState {
  clockIn: boolean;
  clockOut: boolean;
  breakBegin: boolean;
  breakEnd: boolean;
}

export class FreeeApiService {
  private axiosInstance: AxiosInstance;
  private config: FreeeConfig;
  private authWindow: BrowserWindow | null = null;
  private refreshAttempts: number = 0;

  constructor(config: FreeeConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.freee.co.jp/',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      if (this.config.accessToken) {
        config.headers.Authorization = `Bearer ${this.config.accessToken}`;
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // 既にリトライ済みの場合はエラーを返す
        if (originalRequest._retry) {
          return Promise.reject(error);
        }
        
        if (error.response?.status === 401 && this.config.refreshToken) {
          // 無限ループを防ぐため、リフレッシュ試行回数を制限
          if (this.refreshAttempts >= 2) {
            console.error('Token refresh limit exceeded. Please re-authenticate.');
            this.refreshAttempts = 0;
            throw new Error('認証に失敗しました。再度ログインしてください。');
          }
          
          // リフレッシュトークンの有効期限をチェック
          if (this.isRefreshTokenExpired()) {
            throw new Error('リフレッシュトークンの有効期限が切れています。再度ログインしてください。');
          }
          
          originalRequest._retry = true;
          
          try {
            this.refreshAttempts++;
            await this.refreshAccessToken();
            // 元のリクエストを再試行
            originalRequest.headers.Authorization = `Bearer ${this.config.accessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('認証の更新に失敗しました。再度ログインしてください。');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 日本時間での日付を取得
   * @param date 基準となる日時（省略時は現在時刻）
   * @returns YYYY-MM-DD形式の日付文字列
   */
  private getJSTDate(date: Date = new Date()): string {
    // UTCから日本時間（UTC+9）への変換
    const utcTime = date.getTime();
    const jstTime = new Date(utcTime + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().split('T')[0];
  }


  private isRefreshTokenExpired(): boolean {
    // 有効期限が設定されていない場合は期限切れとみなさない
    if (!this.config.refreshTokenExpiresAt) {
      return false;     }
    
    const expiresAt = new Date(this.config.refreshTokenExpiresAt);
    const now = new Date();
    
    // 有効期限の3日前から警告を出すために、余裕を持たせる
    const warningThreshold = new Date(expiresAt);
    warningThreshold.setDate(warningThreshold.getDate() - 3);
    
    return now >= warningThreshold;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'hr:employees:me:read hr:employees:me:time_clocks:write hr:employees:me:work_records:read hr:employees:me:work_records:write',
    });
    return `https://accounts.secure.freee.co.jp/public_api/authorize?${params.toString()}`;
  }

  async authorize(): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = this.getAuthorizationUrl();
      
      this.authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      this.authWindow.loadURL(authUrl);

      this.authWindow.webContents.on('will-redirect', async (event, url) => {
        if (url.startsWith(this.config.redirectUri)) {
          event.preventDefault();
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            try {
              await this.exchangeCodeForToken(code);
              this.authWindow?.close();
              resolve('Authorization successful');
            } catch (error) {
              this.authWindow?.close();
              reject(error);
            }
          } else {
            this.authWindow?.close();
            reject(new Error('Authorization code not found'));
          }
        }
      });

      this.authWindow.on('closed', () => {
        this.authWindow = null;
        reject(new Error('Authorization window closed'));
      });
    });
  }

  private async exchangeCodeForToken(code: string): Promise<void> {
    const response = await axios.post('https://accounts.secure.freee.co.jp/public_api/token', {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });

    this.config.accessToken = response.data.access_token;
    this.config.refreshToken = response.data.refresh_token;
    
    // リフレッシュトークンの有効期限を設定（90日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);
    this.config.refreshTokenExpiresAt = expiresAt.toISOString();
  }

  private async refreshAccessToken(): Promise<void> {
    console.log('Refreshing access token...');
    const response = await axios.post('https://accounts.secure.freee.co.jp/public_api/token', {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    console.log('Token refresh successful');
    this.config.accessToken = response.data.access_token;
    this.config.refreshToken = response.data.refresh_token;
    
    // 新しいリフレッシュトークンの有効期限を設定（90日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);
    this.config.refreshTokenExpiresAt = expiresAt.toISOString();
    
    // リフレッシュが成功したらカウンターをリセット
    this.refreshAttempts = 0;
    
    console.log('New access token:', this.config.accessToken?.substring(0, 10) + '...');
  }

  async getEmployeeInfo(): Promise<any> {
    console.log('Getting employee info with company_id:', this.config.companyId);
    if (!this.config.companyId) {
      throw new Error('Company ID is required. Please get companies list first.');
    }
    const response = await this.axiosInstance.get('/hr/api/v1/users/me', {
      params: { company_id: this.config.companyId },
    });
    console.log('Employee info response:', response.data);
    
    // レスポンス構造を整形
    const userData = response.data;
    const currentCompany = userData.companies?.find((c: any) => c.id === this.config.companyId);
    
    return {
      user: userData,
      employee: currentCompany ? {
        id: currentCompany.employee_id,
        name: currentCompany.display_name,
        display_name: currentCompany.display_name,
        company_name: currentCompany.name,
        company_id: currentCompany.id
      } : null
    };
  }

  async timeClock(type: TimeClockType['type']): Promise<any> {
    const now = new Date();
    
    const response = await this.axiosInstance.post(
      `/hr/api/v1/employees/${this.config.employeeId}/time_clocks`,
      {
        company_id: this.config.companyId,
        type,
        base_date: this.getJSTDate(now),
      }
    );
    return response.data;
  }

  async getWorkRecord(date: string): Promise<WorkRecord | null> {
    try {
      const response = await this.axiosInstance.get(
        `/hr/api/v1/employees/${this.config.employeeId}/work_records/${date}`,
        {
          params: { company_id: this.config.companyId },
        }
      );

      console.log('Work record API response:', response.data);

      // レスポンス構造を確認
      if (!response.data) {
        console.log('No work record found for date:', date);
        return null;
      }

      const data = response.data;

      // break_recordsをキャメルケースに変換
      const breakRecords = (data.break_records || []).map((record: any) => ({
        clockInAt: record.clock_in_at,
        clockOutAt: record.clock_out_at,
      }));

      console.log('Converted break_records:', breakRecords);

      return {
        date: data.date || date,
        clockInAt: data.clock_in_at || null,
        clockOutAt: data.clock_out_at || null,
        breakRecords: breakRecords,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('Work record API error:', error.response?.status, error.response?.data);
        if (error.response?.status === 404) {
          console.log('No work record found for date:', date);
          return null;
        }
      }
      console.error('Error fetching work record:', error);
      throw error;
    }
  }

  /**
   * work_recordsのデータをtime_clocks形式に変換
   * 修正後の時刻を反映するため、work_records APIのデータを使用
   */
  async getTimeClocksFromWorkRecord(date: string): Promise<TimeClock[]> {
    try {
      const workRecord = await this.getWorkRecord(date);
      if (!workRecord) {
        return [];
      }

      const timeClocks: TimeClock[] = [];
      let idCounter = 1;

      // clock_in
      if (workRecord.clockInAt) {
        timeClocks.push({
          id: idCounter++,
          type: 'clock_in',
          date: date,
          datetime: workRecord.clockInAt,
          original_datetime: workRecord.clockInAt,
          note: '',
        });
      }

      // break_records
      if (workRecord.breakRecords && workRecord.breakRecords.length > 0) {
        for (const breakRecord of workRecord.breakRecords) {
          if (breakRecord.clockInAt) {
            timeClocks.push({
              id: idCounter++,
              type: 'break_begin',
              date: date,
              datetime: breakRecord.clockInAt,
              original_datetime: breakRecord.clockInAt,
              note: '',
            });
          }
          if (breakRecord.clockOutAt) {
            timeClocks.push({
              id: idCounter++,
              type: 'break_end',
              date: date,
              datetime: breakRecord.clockOutAt,
              original_datetime: breakRecord.clockOutAt,
              note: '',
            });
          }
        }
      }

      // clock_out
      if (workRecord.clockOutAt) {
        timeClocks.push({
          id: idCounter++,
          type: 'clock_out',
          date: date,
          datetime: workRecord.clockOutAt,
          original_datetime: workRecord.clockOutAt,
          note: '',
        });
      }

      // 時系列でソート
      timeClocks.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

      console.log('Time clocks converted from work record:', timeClocks);
      return timeClocks;
    } catch (error) {
      console.error('Error getting time clocks from work record:', error);
      return [];
    }
  }

  async getTodayWorkRecord(): Promise<WorkRecord | null> {
    const today = this.getJSTDate();
    return this.getWorkRecord(today);
  }

  getConfig(): FreeeConfig {
    return this.config;
  }

  updateConfig(config: Partial<FreeeConfig>): void {
    Object.assign(this.config, config);
  }
  
  // リフレッシュトークンの残り有効日数を取得
  async getCompanies(): Promise<any> {
    console.log('Getting companies list...');
    const response = await this.axiosInstance.get('/api/1/companies');
    console.log('Companies response:', response.data);
    return response.data;
  }

  getRefreshTokenRemainingDays(): number | null {
    if (!this.config.refreshTokenExpiresAt) {
      return null;
    }
    
    const expiresAt = new Date(this.config.refreshTokenExpiresAt);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  async getTimeClocks(fromDate?: string, toDate?: string): Promise<TimeClock[]> {
    console.log('Getting time clocks...');
    
    const params: any = {
      company_id: this.config.companyId,
    };
    
    if (fromDate) {
      params.from_date = fromDate;
    }
    
    if (toDate) {
      params.to_date = toDate;
    }
    
    const response = await this.axiosInstance.get(
      `/hr/api/v1/employees/${this.config.employeeId}/time_clocks`,
      { params }
    );
    
    console.log('Time clocks response:', response.data);
    return response.data; // レスポンスは直接TimeClock[]の配列
  }

  async getLastTimeClockType(): Promise<string | null> {
    console.log('Getting last time clock type...');
    
    try {
      const today = this.getJSTDate();
      const timeClocks = await this.getTimeClocks(today, today);
      
      if (!timeClocks || timeClocks.length === 0) {
        console.log('No time clocks found for today');
        return null;
      }
      
      // 最新の打刻を取得（datetimeでソート）
      const sortedClocks = timeClocks.sort((a, b) => 
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      );
      
      const lastClock = sortedClocks[0];
      console.log('Last time clock:', lastClock);
      
      return lastClock.type;
    } catch (error) {
      console.error('Error getting last time clock type:', error);
      throw error;
    }
  }

  async getAvailableTimeClockTypes(): Promise<string[]> {
    console.log('Getting available time clock types...');
    
    try {
      const lastType = await this.getLastTimeClockType();
      
      switch (lastType) {
        case null: // 未打刻
          return ['clock_in'];
        case 'clock_in': // 勤務開始済み
          return ['clock_out', 'break_begin'];
        case 'break_begin': // 休憩中
          return ['break_end'];
        case 'break_end': // 休憩終了
          return ['clock_out', 'break_begin'];
        case 'clock_out': // 勤務終了済み
          return []; // 当日勤務終了
        default:
          console.warn('Unknown time clock type:', lastType);
          return [];
      }
    } catch (error) {
      console.error('Error getting available time clock types:', error);
      return []; // エラー時は全て無効
    }
  }

  async getTimeClockButtonStates(): Promise<TimeClockButtonState> {
    console.log('Getting time clock button states...');
    
    try {
      const availableTypes = await this.getAvailableTimeClockTypes();
      
      return {
        clockIn: availableTypes.includes('clock_in'),
        clockOut: availableTypes.includes('clock_out'),
        breakBegin: availableTypes.includes('break_begin'),
        breakEnd: availableTypes.includes('break_end')
      };
    } catch (error) {
      console.error('Error getting time clock button states:', error);
      // エラー時は全て無効にする
      return {
        clockIn: false,
        clockOut: false,
        breakBegin: false,
        breakEnd: false
      };
    }
  }

  isTimeClockTypeAvailable(type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end'): Promise<boolean> {
    return this.getAvailableTimeClockTypes().then(types => types.includes(type));
  }

  /**
   * ISO時刻文字列を"YYYY-MM-DD HH:mm:ss"形式に変換
   * @param isoTime ISO形式の時刻文字列 (例: "2025-01-01T09:00:00+09:00")
   * @returns "YYYY-MM-DD HH:mm:ss"形式の時刻文字列 (例: "2025-01-01 09:00:00")
   */
  private formatTimeToHHmm(isoTime: string): string {
    const date = new Date(isoTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 勤怠記録を更新する（休憩時間、出勤・退勤時刻の修正用）
   * @param date 対象日付 (YYYY-MM-DD形式)
   * @param breakRecords 休憩記録の配列
   * @param clockInAt 出勤時刻（オプション、指定しない場合は現在の値を使用）
   * @param clockOutAt 退勤時刻（オプション、指定しない場合は現在の値を使用）
   */
  async updateWorkRecord(
    date: string,
    breakRecords: Array<{ clock_in_at: string; clock_out_at: string }>,
    clockInAt?: string,
    clockOutAt?: string | null
  ): Promise<any> {
    console.log('Updating work record:', { date, breakRecords, clockInAt, clockOutAt });

    // 現在の勤怠記録を取得
    const currentRecord = await this.getWorkRecord(date);
    if (!currentRecord) {
      throw new Error('勤怠記録が見つかりません');
    }

    if (!currentRecord.clockInAt && !clockInAt) {
      throw new Error('出勤時刻が記録されていないため、休憩時間を更新できません');
    }

    // break_records内の時刻も"HH:mm"形式に変換
    const formattedBreakRecords = breakRecords.map(record => ({
      clock_in_at: this.formatTimeToHHmm(record.clock_in_at),
      clock_out_at: this.formatTimeToHHmm(record.clock_out_at),
    }));

    // リクエストボディを構築（時刻をHH:mm形式に変換）
    const requestBody: any = {
      company_id: this.config.companyId,
      break_records: formattedBreakRecords,
      // clockInAtが指定されていればそれを使用、なければ現在の値を使用
      clock_in_at: clockInAt
        ? this.formatTimeToHHmm(clockInAt)
        : this.formatTimeToHHmm(currentRecord.clockInAt!),
    };

    // clockOutAtが指定されている場合
    if (clockOutAt !== undefined) {
      // nullの場合は含めない（退勤時刻を削除）
      if (clockOutAt !== null) {
        requestBody.clock_out_at = this.formatTimeToHHmm(clockOutAt);
      }
    } else if (currentRecord.clockOutAt) {
      // 指定されていない場合は現在の値を使用
      requestBody.clock_out_at = this.formatTimeToHHmm(currentRecord.clockOutAt);
    }

    console.log('PUT request body:', JSON.stringify(requestBody, null, 2));

    // 勤怠記録を更新
    const response = await this.axiosInstance.put(
      `/hr/api/v1/employees/${this.config.employeeId}/work_records/${date}`,
      requestBody
    );

    console.log('Work record updated:', response.data);
    return response.data;
  }
}