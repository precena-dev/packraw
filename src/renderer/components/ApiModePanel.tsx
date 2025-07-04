import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../hooks/useTimeTracker';

export const ApiModePanel: React.FC = () => {
  const [isApiInitialized, setIsApiInitialized] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { workingTime, isWorking, startWork, endWork } = useTimeTracker();

  useEffect(() => {
    initializeApi();
  }, []);

  const initializeApi = async () => {
    try {
      const initialized = await window.electronAPI.freeeApi.init();
      setIsApiInitialized(initialized);
      
      if (initialized) {
        // 既存のトークンで従業員情報を取得してみる
        try {
          const info = await window.electronAPI.freeeApi.getEmployeeInfo();
          setEmployeeInfo(info.employee);
          setIsAuthorized(true);
          
          // 今日の勤務記録を取得
          const todayRecord = await window.electronAPI.freeeApi.getTodayWorkRecord();
          if (todayRecord?.clockInAt) {
            startWork();
          }
        } catch (err) {
          // 認証が必要
          console.log('Authorization required');
        }
      }
    } catch (err) {
      setError('APIの初期化に失敗しました');
    }
  };

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
      
      if (type === 'clock_in') {
        startWork();
      } else if (type === 'clock_out') {
        endWork();
      }
      
      // 勤務記録を更新
      const todayRecord = await window.electronAPI.freeeApi.getTodayWorkRecord();
      console.log('Updated work record:', todayRecord);
    } catch (err: any) {
      setError(err.message || '打刻に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isApiInitialized) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
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
      <div className="h-full flex items-center justify-center bg-gray-50">
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
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">freee勤怠管理</h2>
          <div className="text-sm text-gray-600">
            {employeeInfo?.display_name || employeeInfo?.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">本日の勤務時間:</span>
          <span className="font-mono font-semibold">{workingTime}</span>
          <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="grid grid-cols-2 gap-4 max-w-md w-full">
          <button
            onClick={() => handleTimeClock('clock_in')}
            disabled={loading || isWorking}
            className="p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-semibold">勤務開始</div>
          </button>

          <button
            onClick={() => handleTimeClock('clock_out')}
            disabled={loading || !isWorking}
            className="p-6 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="text-2xl mb-2">🏠</div>
            <div className="font-semibold">勤務終了</div>
          </button>

          <button
            onClick={() => handleTimeClock('break_begin')}
            disabled={loading || !isWorking}
            className="p-6 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="text-2xl mb-2">☕</div>
            <div className="font-semibold">休憩開始</div>
          </button>

          <button
            onClick={() => handleTimeClock('break_end')}
            disabled={loading || !isWorking}
            className="p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="text-2xl mb-2">💼</div>
            <div className="font-semibold">休憩終了</div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};