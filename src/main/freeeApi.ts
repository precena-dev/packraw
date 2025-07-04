import axios, { AxiosInstance } from 'axios';
import { BrowserWindow } from 'electron';

export interface FreeeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
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
          await this.refreshAccessToken();
          error.config.headers.Authorization = `Bearer ${this.config.accessToken}`;
          return this.axiosInstance(error.config);
        }
        return Promise.reject(error);
      }
    );
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
}