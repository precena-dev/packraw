export {};

interface AppConfig {
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
    freee: {
      url: string;
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
  };
}

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getConfig: () => Promise<AppConfig>;
      updateConfig: (newConfig: Partial<AppConfig>) => Promise<AppConfig>;
      openAuth: () => Promise<void>;
      setAuthCookies: (cookies: any[]) => Promise<boolean>;
      reloadWebview: () => Promise<void>;
      onReloadWebview: (callback: () => void) => void;
      freeeApi: {
        init: () => Promise<boolean>;
        authorize: () => Promise<string>;
        getEmployeeInfo: () => Promise<any>;
        timeClock: (type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => Promise<any>;
        getTodayWorkRecord: () => Promise<any>;
      };
    };
  }
}