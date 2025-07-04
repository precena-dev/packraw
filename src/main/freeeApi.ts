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

export class FreeeApiService {
  private axiosInstance: AxiosInstance;
  private config: FreeeConfig;
  private authWindow: BrowserWindow | null = null;

  constructor(config: FreeeConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.freee.co.jp',
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
        if (error.response?.status === 401 && this.config.refreshToken) {
          // リフレッシュトークンの有効期限をチェック
          if (this.isRefreshTokenExpired()) {
            // リフレッシュトークンが期限切れの場合は再認証が必要
            throw new Error('リフレッシュトークンの有効期限が切れています。再度ログインしてください。');
          }
          
          try {
            await this.refreshAccessToken();
            error.config.headers.Authorization = `Bearer ${this.config.accessToken}`;
            return this.axiosInstance(error.config);
          } catch (refreshError) {
            // リフレッシュトークンも無効な場合
            throw new Error('認証の更新に失敗しました。再度ログインしてください。');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private isRefreshTokenExpired(): boolean {
    if (!this.config.refreshTokenExpiresAt) {
      return false; // 有効期限が設定されていない場合は期限切れとみなさない
    }
    
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
      scope: 'hr:employees:me:read hr:employees:me:time_clocks:write hr:employees:me:work_records:read',
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
    const response = await axios.post('https://accounts.secure.freee.co.jp/public_api/token', {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    this.config.accessToken = response.data.access_token;
    this.config.refreshToken = response.data.refresh_token;
    
    // 新しいリフレッシュトークンの有効期限を設定（90日後）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);
    this.config.refreshTokenExpiresAt = expiresAt.toISOString();
  }

  async getEmployeeInfo(): Promise<any> {
    const response = await this.axiosInstance.get('/hr/api/v1/employees/me', {
      params: { company_id: this.config.companyId },
    });
    return response.data;
  }

  async timeClock(type: TimeClockType['type']): Promise<any> {
    const response = await this.axiosInstance.post(
      `/hr/api/v1/employees/${this.config.employeeId}/time_clocks`,
      {
        company_id: this.config.companyId,
        type,
        base_date: new Date().toISOString().split('T')[0],
        datetime: new Date().toISOString(),
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
      
      const data = response.data.employee_work_record;
      return {
        date: data.date,
        clockInAt: data.clock_in_at,
        clockOutAt: data.clock_out_at,
        breakRecords: data.break_records || [],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getTodayWorkRecord(): Promise<WorkRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getWorkRecord(today);
  }

  getConfig(): FreeeConfig {
    return this.config;
  }

  updateConfig(config: Partial<FreeeConfig>): void {
    Object.assign(this.config, config);
  }
  
  // リフレッシュトークンの残り有効日数を取得
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
}