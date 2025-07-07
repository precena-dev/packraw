import fs from 'fs';
import path from 'path';

export interface AppConfig {
  user: {
    email: string;
    profile: string;
  };
  app: {
    window: {
      width: number;
      height: number;
      alwaysOnTop: boolean;
    };
  };
  api?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    companyId?: number;
    employeeId?: number;
    accessToken?: string;
    refreshToken?: string;
    refreshTokenExpiresAt?: string;
  };
}

const defaultConfig: AppConfig = {
  user: {
    email: "user@example.com",
    profile: "user@example.com"
  },
  app: {
    window: {
      width: 500,
      height: 500,
      alwaysOnTop: true
    }
  }
};

export class ConfigManager {
  private config: AppConfig = defaultConfig;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = { ...defaultConfig, ...JSON.parse(configData) };
      } else {
        this.saveConfig();
      }
    } catch (error) {
      console.error('設定ファイル読み込みエラー:', error);
      this.config = defaultConfig;
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('設定ファイル保存エラー:', error);
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }


  getWindowConfig() {
    return this.config.app.window;
  }
}