import Store from 'electron-store';

export interface AppConfig {
  app: {
    window: {
      width: number;
      height: number;
      alwaysOnTop: boolean;
    };
    powerMonitor?: {
      enabled: boolean;
    };
    developer?: {
      showDevTools: boolean;
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
  app: {
    window: {
      width: 500,
      height: 500,
      alwaysOnTop: true
    },
    powerMonitor: {
      enabled: false
    },
    developer: {
      showDevTools: false
    }
  }
};

export class ConfigManager {
  private store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: defaultConfig,
      name: 'freee-app-config'
    });
  }

  getConfig(): AppConfig {
    return (this.store as any).store as AppConfig;
  }

  updateConfig(newConfig: Partial<AppConfig>): void {
    // 深いマージを行う
    const currentConfig = this.getConfig();
    const mergedConfig = this.deepMerge(currentConfig, newConfig);
    
    // 各プロパティを個別に設定
    Object.keys(mergedConfig).forEach(key => {
      (this.store as any).set(key as keyof AppConfig, mergedConfig[key as keyof AppConfig]);
    });
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  getWindowConfig() {
    return (this.store as any).get('app.window', defaultConfig.app.window);
  }

  // 特定のAPIプロパティを取得/設定するヘルパーメソッド
  getApiConfig() {
    return (this.store as any).get('api');
  }

  setApiConfig(apiConfig: AppConfig['api']) {
    (this.store as any).set('api', apiConfig);
  }

  // 設定をリセットする
  resetConfig() {
    (this.store as any).clear();
    (this.store as any).store = { ...defaultConfig };
  }

  // 設定ファイルの場所を取得
  getConfigPath(): string {
    return (this.store as any).path;
  }

  // 初期API設定を手動で設定（開発用）
  setInitialApiConfig(apiConfig: AppConfig['api']) {
    console.log('Setting initial API config:', apiConfig);
    (this.store as any).set('api', apiConfig);
    console.log('API config set. Current config:', this.getConfig());
  }

  // PowerMonitor設定を取得
  getPowerMonitorConfig() {
    return (this.store as any).get('app.powerMonitor', defaultConfig.app.powerMonitor);
  }

  // PowerMonitor設定を更新
  setPowerMonitorEnabled(enabled: boolean) {
    (this.store as any).set('app.powerMonitor.enabled', enabled);
    console.log('PowerMonitor enabled set to:', enabled);
  }


  // Developer設定を取得
  getDeveloperConfig() {
    return (this.store as any).get('app.developer', defaultConfig.app.developer);
  }

  // Developer設定を更新
  setShowDevTools(enabled: boolean) {
    (this.store as any).set('app.developer.showDevTools', enabled);
    console.log('ShowDevTools enabled set to:', enabled);
  }

  // AutoTimeClock設定を取得
  getAutoTimeClockConfig() {
    const config = (this.store as any).get('app.autoTimeClock', {
      autoClockInOnStartup: false,
      autoClockOutOnShutdown: false,
      autoClockOutAfterTime: {
        enabled: false,
        time: '17:00'  // デフォルト17:00
      }
    });

    // disableWeekendsが未設定の場合はtrueをデフォルトとする（設定ファイルには保存しない）
    if (config.disableWeekends === undefined) {
      config.disableWeekends = true;
    }

    return config;
  }

  // AutoTimeClock設定を更新
  updateAutoTimeClockConfig(config: {
    autoClockInOnStartup?: boolean;
    autoClockOutOnShutdown?: boolean;
    autoClockOutAfterTime?: {
      enabled?: boolean;
      time?: string;
    };
    disableWeekends?: boolean;
  }) {
    const currentConfig = this.getAutoTimeClockConfig();
    const newConfig = { ...currentConfig, ...config };

    // autoClockOutAfterTimeがある場合は深いマージを行う
    if (config.autoClockOutAfterTime) {
      newConfig.autoClockOutAfterTime = {
        ...currentConfig.autoClockOutAfterTime,
        ...config.autoClockOutAfterTime
      };
    }

    (this.store as any).set('app.autoTimeClock', newConfig);
    console.log('AutoTimeClock config updated:', newConfig);
    return newConfig;
  }
}