import React, { useState, useEffect } from 'react';
import { WorkTimeSection } from './WorkTimeSection';
import { WorkingTimeDisplay } from './WorkingTimeDisplay';
import { TimeClockHistory } from './TimeClockHistory';
import { SettingsModal } from './SettingsModal';
import { EditBreakModal } from './EditBreakModal';

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
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD形式
  const [isToday, setIsToday] = useState(true);
  const [isPowerMonitorEnabled, setIsPowerMonitorEnabled] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditBreakModalOpen, setIsEditBreakModalOpen] = useState(false);
  const [editingBreak, setEditingBreak] = useState<{ begin: any; end: any } | null>(null);

  // 日本時間での今日の日付を取得するヘルパー関数
  const getJSTDateString = (date: Date = new Date()): string => {
    const jstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jstTime.toISOString().split('T')[0];
  };

  useEffect(() => {
    // 今日の日付を初期値として設定
    const today = getJSTDateString();
    setSelectedDate(today);
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

  const updateTimeClocks = async (date: string) => {
    try {
      if (isAuthorized) {
        // work_records APIを使用して修正後の時刻を取得
        const timeClocks = await window.electronAPI.freeeApi.getTimeClocksFromWorkRecord(date);
        console.log(`Time clocks from work record for ${date}:`, timeClocks);
        setTodayTimeClocks(timeClocks);
      }
    } catch (error) {
      console.error(`Failed to get time clocks from work record for ${date}:`, error);
      setTodayTimeClocks([]);
    }
  };

  // 日付変更ハンドラー
  const handleDateChange = (direction: 'prev' | 'next') => {
    console.log('handleDateChange called:', direction, 'current selectedDate:', selectedDate);

    // YYYY-MM-DD形式の文字列から年月日を分解
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day); // monthは0-indexedなので-1

    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 新しい日付をYYYY-MM-DD形式に変換
    const newYear = currentDate.getFullYear();
    const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const newDay = String(currentDate.getDate()).padStart(2, '0');
    const newDateString = `${newYear}-${newMonth}-${newDay}`;

    console.log('New date calculated:', newDateString);

    const today = getJSTDateString();

    // 未来日への遷移は不可
    if (direction === 'next' && newDateString > today) {
      console.log('Future date blocked:', newDateString, '>', today);
      return;
    }

    // setSelectedDateするとuseEffectが発火してupdateTimeClocksが呼ばれる
    setSelectedDate(newDateString);
    setIsToday(newDateString === today);
    // updateTimeClocks(newDateString); を削除（useEffectで自動実行される）
  };

  // 認証後にボタン状態と打刻履歴を更新
  useEffect(() => {
    if (isAuthorized && selectedDate) {
      updateButtonStates();
      updateTimeClocks(selectedDate);
    }
  }, [isAuthorized, selectedDate]);

  // PowerMonitor 状態を初期化
  useEffect(() => {
    const initSettings = async () => {
      try {
        // PowerMonitor状態の初期化
        const isMonitoring = await window.electronAPI.powerMonitor.isMonitoring();
        setIsPowerMonitorEnabled(isMonitoring);
        console.log('PowerMonitor status initialized:', isMonitoring);
        
      } catch (error) {
        console.error('Failed to check settings status:', error);
      }
    };

    if (isAuthorized) {
      initSettings();
    }
  }, [isAuthorized]);

  // 5分ごとの自動更新（今日の場合のみ）
  useEffect(() => {
    if (!isAuthorized || !isToday) {
      return;
    }

    console.log('Setting up 5-minute auto-refresh for today\'s data');
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing time clocks and button states...');
      updateButtonStates();
      updateTimeClocks(selectedDate);
    }, 5 * 60 * 1000); // 5分 = 300,000ms

    return () => {
      console.log('Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [isAuthorized, isToday, selectedDate]);

  // PowerMonitorイベントの監視
  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    const handlePowerMonitorEvent = (eventType: string) => {
      console.log('PowerMonitor event received:', eventType);
      
      // 画面をリフレッシュ（ボタン状態と打刻履歴を更新）
      updateButtonStates();
      updateTimeClocks(selectedDate);
      
      // 勤務記録も更新
      if (isToday) {
        try {
          window.electronAPI.freeeApi.getTodayWorkRecord().then(record => {
            console.log('Updated work record after PowerMonitor event:', record);
          });
        } catch (error) {
          console.log('Could not fetch updated work record after PowerMonitor event:', error);
        }
      }
    };

    // PowerMonitorイベントリスナーを設定
    window.electronAPI.powerMonitor.onEvent(handlePowerMonitorEvent);

    return () => {
      // クリーンアップ
      window.electronAPI.powerMonitor.removeAllListeners();
    };
  }, [isAuthorized, selectedDate, isToday]);

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
      await updateTimeClocks(selectedDate);
      
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

  // PowerMonitor の開始/停止を制御
  const togglePowerMonitor = async () => {
    try {
      if (isPowerMonitorEnabled) {
        const stopped = await window.electronAPI.powerMonitor.stop();
        if (stopped) {
          setIsPowerMonitorEnabled(false);
          console.log('PowerMonitor stopped');
        }
      } else {
        const started = await window.electronAPI.powerMonitor.start();
        if (started) {
          setIsPowerMonitorEnabled(true);
          console.log('PowerMonitor started');
        }
      }
    } catch (error) {
      console.error('Failed to toggle PowerMonitor:', error);
      setError('自動休憩機能の切り替えに失敗しました');
    }
  };

  // 休憩時間の編集を開始
  const handleEditBreak = (breakBegin: any, breakEnd: any) => {
    setEditingBreak({ begin: breakBegin, end: breakEnd });
    setIsEditBreakModalOpen(true);
  };

  // 休憩時間の更新を保存
  const handleSaveBreak = async (beginTime: string, endTime: string) => {
    if (!editingBreak) return;

    setLoading(true);
    setError(null);

    try {
      // 日付を取得（編集中の休憩開始時刻から）
      const baseDate = editingBreak.begin?.datetime || editingBreak.end?.datetime;
      if (!baseDate) {
        throw new Error('基準日時が見つかりません');
      }

      const date = new Date(baseDate);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD形式

      // 時刻を解析して日本時間（JST）のISO 8601形式に変換
      const [beginHour, beginMinute] = beginTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      // YYYY-MM-DD形式の日付文字列と時刻から日本時間のISO 8601文字列を生成
      const formatToJSTISO = (dateStr: string, hour: number, minute: number): string => {
        // 日本時間として日時を構築（タイムゾーン +09:00）
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(5, 7);
        const day = dateStr.substring(8, 10);
        const hourStr = String(hour).padStart(2, '0');
        const minuteStr = String(minute).padStart(2, '0');
        return `${year}-${month}-${day}T${hourStr}:${minuteStr}:00.000+09:00`;
      };

      const beginDateTimeISO = formatToJSTISO(dateString, beginHour, beginMinute);
      const endDateTimeISO = formatToJSTISO(dateString, endHour, endMinute);

      // 現在の勤怠記録から休憩データを取得（修正後の時刻を取得）
      const currentWorkRecord = await window.electronAPI.freeeApi.getTodayWorkRecord();
      if (!currentWorkRecord || !currentWorkRecord.breakRecords) {
        throw new Error('勤怠記録が取得できませんでした');
      }

      // 現在の打刻履歴から編集対象のインデックスを特定
      const allTimeClocks = todayTimeClocks;
      const breakBegins = allTimeClocks.filter(tc => tc.type === 'break_begin').sort((a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      const breakEnds = allTimeClocks.filter(tc => tc.type === 'break_end').sort((a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );

      // 編集対象の休憩セッションのインデックスを特定
      let targetIndex = -1;
      if (editingBreak.begin) {
        targetIndex = breakBegins.findIndex(b => b.id === editingBreak.begin.id);
      } else if (editingBreak.end) {
        targetIndex = breakEnds.findIndex(b => b.id === editingBreak.end.id);
      }

      // work_recordsから既存の休憩記録を取得し、編集対象のみ更新
      const breakRecords = currentWorkRecord.breakRecords.map((record: any, index: number) => {
        if (index === targetIndex) {
          // 編集対象の休憩時間を更新
          return {
            clock_in_at: beginDateTimeISO,
            clock_out_at: endDateTimeISO,
          };
        } else {
          // 既存の休憩時間をそのまま保持
          return {
            clock_in_at: record.clockInAt,
            clock_out_at: record.clockOutAt,
          };
        }
      });

      // work_recordsを更新
      await window.electronAPI.freeeApi.updateWorkRecord(dateString, breakRecords);

      // 画面全体をリフレッシュ（打刻履歴、ボタン状態、勤務記録を全て再取得）
      await updateTimeClocks(selectedDate);
      await updateButtonStates();

      // 勤務記録も再取得
      try {
        const updatedRecord = await window.electronAPI.freeeApi.getTodayWorkRecord();
        console.log('Updated work record after break edit:', updatedRecord);
      } catch (recordError) {
        console.log('Could not fetch updated work record:', recordError);
      }

      // モーダルを閉じる
      setIsEditBreakModalOpen(false);
      setEditingBreak(null);
    } catch (err: any) {
      console.error('Failed to update break time:', err);
      setError(err.message || '休憩時間の更新に失敗しました');
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
    <div className="app-window">
      <div className="relative">
        <WorkingTimeDisplay
          employeeInfo={employeeInfo}
          todayTimeClocks={todayTimeClocks}
          selectedDate={selectedDate}
          isToday={isToday}
          onDateChange={handleDateChange}
        />
        {/* 設定ボタン */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="settings-button-overlay"
          title="設定"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg className="settings-icon" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
      
      {isToday && (
        <WorkTimeSection
          loading={loading}
          buttonStates={buttonStates}
          onTimeClock={handleTimeClock}
        />
      )}

      <TimeClockHistory
        todayTimeClocks={todayTimeClocks}
        onEditBreak={handleEditBreak}
      />

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isPowerMonitorEnabled={isPowerMonitorEnabled}
        onTogglePowerMonitor={togglePowerMonitor}
      />

      {/* 休憩時間編集モーダル */}
      {isEditBreakModalOpen && editingBreak && (
        <EditBreakModal
          breakBegin={editingBreak.begin}
          breakEnd={editingBreak.end}
          onSave={handleSaveBreak}
          onCancel={() => {
            setIsEditBreakModalOpen(false);
            setEditingBreak(null);
          }}
        />
      )}
    </div>
  );
};