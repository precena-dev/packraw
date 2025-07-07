import React, { useState, useEffect } from 'react';

interface ControlPanelProps {
  onClockIn: (type: 'start' | 'end' | 'break-start' | 'break-end') => void;
}

interface TimeClockButtonState {
  clockIn: boolean;
  clockOut: boolean;
  breakBegin: boolean;
  breakEnd: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onClockIn }) => {
  const [buttonStates, setButtonStates] = useState<TimeClockButtonState>({
    clockIn: true,
    clockOut: false,
    breakBegin: false,
    breakEnd: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    updateButtonStates();
  }, []);

  const updateButtonStates = async () => {
    try {
      // APIモードでのみボタン状態を取得
      if (window.electronAPI?.freeeApi?.getTimeClockButtonStates) {
        // まずAPI初期化状態をチェック
        const isInitialized = await window.electronAPI.freeeApi.init();
        if (isInitialized) {
          const states = await window.electronAPI.freeeApi.getTimeClockButtonStates();
          setButtonStates(states);
        } else {
          // APIが初期化されていない場合はWebViewモードとして動作
          console.log('API not initialized, using WebView mode');
        }
      } else {
        // freeeApi機能がない場合もWebViewモードとして動作
        console.log('freeeApi not available, using WebView mode');
      }
    } catch (error: any) {
      // APIエラーはコンソールに記録するが、UIには影響しない
      console.log('Button state update skipped:', error?.message || error);
      // WebViewモードでは全ボタンを有効にする
      setButtonStates({
        clockIn: true,
        clockOut: true,
        breakBegin: true,
        breakEnd: true
      });
    }
  };

  const handleClick = async (type: 'start' | 'end' | 'break-start' | 'break-end') => {
    setLoading(true);
    try {
      onClockIn(type);
      // 打刻後にボタン状態を更新
      setTimeout(() => {
        updateButtonStates();
      }, 1000); // 1秒後に状態を更新（API反映待ち）
    } catch (error) {
      console.error('Time clock failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getButtonClassName = (baseColor: string, enabled: boolean) => {
    const baseClass = "relative overflow-hidden font-medium py-3 px-6 rounded-lg shadow-sm transition-all duration-200 transform";
    
    if (!enabled || loading) {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }
    
    return `${baseClass} ${baseColor} text-white hover:shadow-md hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2`;
  };

  const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white border-t border-gray-200 shadow-lg">
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleClick('start')}
            disabled={!buttonStates.clockIn || loading}
            className={getButtonClassName(
              "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 focus:ring-emerald-500",
              buttonStates.clockIn
            )}
          >
            {loading && <LoadingSpinner />}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">🏢</span>
              <span>勤務開始</span>
            </div>
          </button>
          
          <button
            onClick={() => handleClick('end')}
            disabled={!buttonStates.clockOut || loading}
            className={getButtonClassName(
              "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 focus:ring-red-500",
              buttonStates.clockOut
            )}
          >
            {loading && <LoadingSpinner />}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">🏠</span>
              <span>勤務終了</span>
            </div>
          </button>
          
          <button
            onClick={() => handleClick('break-start')}
            disabled={!buttonStates.breakBegin || loading}
            className={getButtonClassName(
              "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 focus:ring-amber-500",
              buttonStates.breakBegin
            )}
          >
            {loading && <LoadingSpinner />}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">☕</span>
              <span>休憩開始</span>
            </div>
          </button>
          
          <button
            onClick={() => handleClick('break-end')}
            disabled={!buttonStates.breakEnd || loading}
            className={getButtonClassName(
              "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500",
              buttonStates.breakEnd
            )}
          >
            {loading && <LoadingSpinner />}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">💼</span>
              <span>休憩終了</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};