export {};

interface TimeClockButtonState {
  clockIn: boolean;
  clockOut: boolean;
  breakBegin: boolean;
  breakEnd: boolean;
}

interface BreakScheduleConfig {
  enabled: boolean;
  breakStartTime: string;
  breakEndTime: string;
  randomOffsetMinutes: number;
}

interface AutoTimeClockConfig {
  autoClockInOnStartup: boolean;
  autoClockOutOnShutdown: boolean;
}

interface AutoUpdateConfig {
  enabled: boolean;
}

interface AppConfig {
  app: {
    window: {
      width: number;
      height: number;
      alwaysOnTop: boolean;
    };
    powerMonitor?: {
      enabled: boolean;
    };
    breakSchedule?: BreakScheduleConfig;
    autoTimeClock?: AutoTimeClockConfig;
    autoUpdate?: AutoUpdateConfig;
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

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getConfig: () => Promise<AppConfig>;
      updateConfig: (newConfig: Partial<AppConfig>) => Promise<AppConfig>;
      getConfigPath: () => Promise<string>;
      setApiConfig: (apiConfig: AppConfig['api']) => Promise<AppConfig>;
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
        getWorkRecord: (date: string) => Promise<any>;
        getCompanies: () => Promise<any>;
        getTimeClockButtonStates: () => Promise<TimeClockButtonState>;
        getLastTimeClockType: () => Promise<string | null>;
        getTimeClocks: (fromDate?: string, toDate?: string) => Promise<any[]>;
        getTimeClocksFromWorkRecord: (date: string) => Promise<any[]>;
        updateWorkRecord: (date: string, breakRecords: Array<{ clock_in_at: string; clock_out_at: string }>, clockInAt?: string, clockOutAt?: string | null) => Promise<any>;
        deleteWorkRecord: (date: string) => Promise<any>;
      };
      powerMonitor: {
        start: () => Promise<boolean>;
        stop: () => Promise<boolean>;
        isMonitoring: () => Promise<boolean>;
        onEvent: (callback: (eventType: string) => void) => void;
        removeAllListeners: () => void;
      };
      breakScheduler: {
        getConfig: () => Promise<BreakScheduleConfig>;
        updateConfig: (config: Partial<BreakScheduleConfig>) => Promise<BreakScheduleConfig>;
        getNextSchedule: () => Promise<{ type: string; time: Date } | null>;
      };
      autoTimeClock: {
        getConfig: () => Promise<AutoTimeClockConfig>;
        updateConfig: (config: Partial<AutoTimeClockConfig>) => Promise<AutoTimeClockConfig>;
      };
      autoUpdate: {
        getConfig: () => Promise<AutoUpdateConfig>;
        setEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
      };
      app: {
        getVersion: () => Promise<string>;
      };
    };
  }
}