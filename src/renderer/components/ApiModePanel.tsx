import React, { useState, useEffect } from 'react';
import { WorkTimeSection } from './WorkTimeSection';
import { WorkingTimeDisplay } from './WorkingTimeDisplay';
import { TimeClockHistory } from './TimeClockHistory';

interface TimeClockButtonState {
  clockIn: boolean;
  clockOut: boolean;
  breakBegin: boolean;
  breakEnd: boolean;
}

export const ApiModePanel: React.FC = () => {
  const [isApiInitialized, setIsApiInitialized] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonStates, setButtonStates] = useState<TimeClockButtonState>({
    clockIn: true,
    clockOut: false,
    breakBegin: false,
    breakEnd: false
  });
  const [todayTimeClocks, setTodayTimeClocks] = useState<any[]>([]);


  useEffect(() => {
    initializeApi();
  }, []);



  const initializeApi = async () => {
    try {
      const initialized = await window.electronAPI.freeeApi.init();
      setIsApiInitialized(initialized);
      
      if (initialized) {
        // config.jsonの状態を確認
        const config = await window.electronAPI.getConfig();
        
        // アクセストークンがない場合は認証が必要
        if (!config.api?.accessToken) {
          console.log('No access token found. Authorization required.');
          setIsAuthorized(false);
          return;
        }
        
        // 既存のトークンで従業員情報を取得してみる
        try {
          console.log('Attempting to get employee info...');
          const info = await window.electronAPI.freeeApi.getEmployeeInfo();
          console.log('Employee info received:', info);
          
          // 従業員IDが取得できた場合、設定ファイルに保存
          if (info.employee?.id) {
            console.log('Saving employee ID:', info.employee.id);
            const currentConfig = await window.electronAPI.getConfig();
            if (currentConfig.api) {
              await window.electronAPI.updateConfig({
                ...currentConfig,
                api: {
                  ...currentConfig.api,
                  employeeId: info.employee.id,
                }
              });
            }
          }
          
          setEmployeeInfo(info.employee);
          setIsAuthorized(true);
          
          // 今日の勤務記録を取得
          try {
            console.log('Attempting to get today work record...');
            const todayRecord = await window.electronAPI.freeeApi.getTodayWorkRecord();
            console.log('Today work record:', todayRecord);
          } catch (recordError) {
            console.log('Could not fetch today work record:', recordError);
            // 勤務記録が取得できなくても認証は成功している
          }
        } catch (err) {
          // 認証が必要
          console.error('API Error:', err);
          console.log('Authorization required');
          setIsAuthorized(false);
        }
      }
    } catch (err) {
      setError('APIの初期化に失敗しました');
    }
  };

  const updateButtonStates = async () => {
    try {
      if (isAuthorized) {
        const states = await window.electronAPI.freeeApi.getTimeClockButtonStates();
        console.log('Button states updated:', states);
        setButtonStates(states);
      }
    } catch (error) {
      console.error('Failed to get button states:', error);
      // エラー時はデフォルト状態を保持
    }
  };

  const updateTodayTimeClocks = async () => {
    try {
      if (isAuthorized) {
        // 日本時間での今日の日付を取得
        const now = new Date();
        const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const today = jstTime.toISOString().split('T')[0];
        const timeClocks = await window.electronAPI.freeeApi.getTimeClocks(today, today);
        console.log('Today time clocks:', timeClocks);
        setTodayTimeClocks(timeClocks);
      }
    } catch (error) {
      console.error('Failed to get today time clocks:', error);
      setTodayTimeClocks([]);
    }
  };

  // 認証後にボタン状態と打刻履歴を更新
  useEffect(() => {
    if (isAuthorized) {
      updateButtonStates();
      updateTodayTimeClocks();
    }
  }, [isAuthorized]);

  const handleAuthorize = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.freeeApi.authorize();
      const info = await window.electronAPI.freeeApi.getEmployeeInfo();
      setEmployeeInfo(info.employee);
      setIsAuthorized(true);
    } catch (err: any) {
      setError(err.message || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeClock = async (type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.freeeApi.timeClock(type);
      
      // 打刻後にボタン状態と打刻履歴を更新
      await updateButtonStates();
      await updateTodayTimeClocks();
      
      // 勤務記録を更新
      try {
        const todayRecord = await window.electronAPI.freeeApi.getTodayWorkRecord();
        console.log('Updated work record:', todayRecord);
      } catch (recordError) {
        console.log('Could not fetch updated work record:', recordError);
      }
    } catch (err: any) {
      setError(err.message || '打刻に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isApiInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
        <div className="text-center p-8">
          <h2 className="text-lg font-semibold mb-4">API設定が必要です</h2>
          <p className="text-sm text-gray-600 mb-4">
            config.jsonにfreee APIの認証情報を設定してください
          </p>
          <pre className="text-left bg-gray-100 p-4 rounded text-xs">
{`{
  "api": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "YOUR_REDIRECT_URI",
    "companyId": YOUR_COMPANY_ID
  }
}`}
          </pre>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
        <div className="text-center p-8">
          <h2 className="text-lg font-semibold mb-4">freee認証が必要です</h2>
          <button
            onClick={handleAuthorize}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '認証中...' : 'freeeにログイン'}
          </button>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-blue-50">
      <WorkingTimeDisplay
        employeeInfo={employeeInfo}
        todayTimeClocks={todayTimeClocks}
      />
      <WorkTimeSection
        loading={loading}
        buttonStates={buttonStates}
        onTimeClock={handleTimeClock}
      />

      {/* 打刻履歴表示 */}
      <div className="pb-4 px-4">
        <TimeClockHistory todayTimeClocks={todayTimeClocks} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};