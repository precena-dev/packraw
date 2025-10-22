import React, { useState, useEffect } from 'react';

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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPowerMonitorEnabled: boolean;
  onTogglePowerMonitor: () => Promise<void>;
  breakScheduleConfig?: BreakScheduleConfig;
  onUpdateBreakSchedule?: (config: Partial<BreakScheduleConfig>) => Promise<void>;
  autoTimeClockConfig?: AutoTimeClockConfig;
  onUpdateAutoTimeClock?: (config: Partial<AutoTimeClockConfig>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isPowerMonitorEnabled,
  onTogglePowerMonitor,
  breakScheduleConfig,
  onUpdateBreakSchedule,
  autoTimeClockConfig,
  onUpdateAutoTimeClock
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [configPath, setConfigPath] = useState<string>('');

  // 休憩予約設定のローカルステート
  const [breakEnabled, setBreakEnabled] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState('12:00');
  const [breakEndTime, setBreakEndTime] = useState('13:00');
  const [randomOffset, setRandomOffset] = useState(5);
  const [isSavingBreak, setIsSavingBreak] = useState(false);

  // 自動出勤・退勤設定のローカルステート
  const [autoClockInOnStartup, setAutoClockInOnStartup] = useState(false);
  const [autoClockOutOnShutdown, setAutoClockOutOnShutdown] = useState(false);

  // 設定ファイルパスを取得
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getConfigPath().then(path => {
        setConfigPath(path);
      });
    }
  }, [isOpen]);

  // 休憩予約設定の初期化
  useEffect(() => {
    if (isOpen && breakScheduleConfig) {
      setBreakEnabled(breakScheduleConfig.enabled);
      setBreakStartTime(breakScheduleConfig.breakStartTime);
      setBreakEndTime(breakScheduleConfig.breakEndTime);
      setRandomOffset(breakScheduleConfig.randomOffsetMinutes);
    }
  }, [isOpen, breakScheduleConfig]);

  // 自動出勤・退勤設定の初期化
  useEffect(() => {
    if (isOpen && autoTimeClockConfig) {
      setAutoClockInOnStartup(autoTimeClockConfig.autoClockInOnStartup);
      setAutoClockOutOnShutdown(autoTimeClockConfig.autoClockOutOnShutdown);
    }
  }, [isOpen, autoTimeClockConfig]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleTogglePowerMonitor = async () => {
    setIsLoading(true);
    try {
      await onTogglePowerMonitor();
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBreakSchedule = async () => {
    if (!onUpdateBreakSchedule) return;

    setIsSavingBreak(true);
    try {
      await onUpdateBreakSchedule({ enabled: !breakEnabled });
      setBreakEnabled(!breakEnabled);
    } finally {
      setIsSavingBreak(false);
    }
  };

  const handleSaveBreakSchedule = async () => {
    if (!onUpdateBreakSchedule) return;

    setIsSavingBreak(true);
    try {
      await onUpdateBreakSchedule({
        breakStartTime,
        breakEndTime,
        randomOffsetMinutes: randomOffset
      });
    } finally {
      setIsSavingBreak(false);
    }
  };

  const handleToggleAutoClockInOnStartup = async () => {
    if (!onUpdateAutoTimeClock) return;

    try {
      await onUpdateAutoTimeClock({ autoClockInOnStartup: !autoClockInOnStartup });
      setAutoClockInOnStartup(!autoClockInOnStartup);
    } catch (error) {
      console.error('Failed to toggle auto clock-in on startup:', error);
    }
  };

  const handleToggleAutoClockOutOnShutdown = async () => {
    if (!onUpdateAutoTimeClock) return;

    try {
      await onUpdateAutoTimeClock({ autoClockOutOnShutdown: !autoClockOutOnShutdown });
      setAutoClockOutOnShutdown(!autoClockOutOnShutdown);
    } catch (error) {
      console.error('Failed to toggle auto clock-out on shutdown:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* ヘッダー */}
        <div className="modal-header">
          <h2 className="modal-title">設定</h2>
        </div>

        {/* コンテンツ */}
        <div className="modal-body">

          {/* 休憩打刻予約機能 */}
          <div className="setting-section">
            <h3 className="setting-section-title">休憩打刻予約設定</h3>
            <div className="setting-item">
              <div className="setting-item-content">
                <div className="setting-item-label">
                  <span className="setting-item-name">自動休憩打刻</span>
                  <p className="setting-item-description">
                    指定した時刻に自動で休憩開始・終了を打刻します
                  </p>
                </div>
                <div className="setting-item-control">
                  <button
                    onClick={handleToggleBreakSchedule}
                    disabled={isSavingBreak}
                    className={`setting-toggle ${breakEnabled ? 'enabled' : 'disabled'}`}
                  >
                    <div className="setting-toggle-track">
                      <div className="setting-toggle-thumb"></div>
                    </div>
                    <span className="setting-toggle-label">
                      {breakEnabled ? '有効' : '無効'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 時刻設定 */}
            <div className="setting-detail">
              <h4 className="setting-detail-title">時刻設定</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ minWidth: '100px', fontSize: '13px', color: !breakEnabled ? '#999' : 'inherit' }}>休憩開始:</label>
                  <input
                    type="time"
                    value={breakStartTime}
                    onChange={(e) => setBreakStartTime(e.target.value)}
                    disabled={!breakEnabled || isSavingBreak}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      opacity: !breakEnabled ? 0.5 : 1,
                      cursor: !breakEnabled ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ minWidth: '100px', fontSize: '13px', color: !breakEnabled ? '#999' : 'inherit' }}>休憩終了:</label>
                  <input
                    type="time"
                    value={breakEndTime}
                    onChange={(e) => setBreakEndTime(e.target.value)}
                    disabled={!breakEnabled || isSavingBreak}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      opacity: !breakEnabled ? 0.5 : 1,
                      cursor: !breakEnabled ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ minWidth: '100px', fontSize: '13px', color: !breakEnabled ? '#999' : 'inherit' }}>ランダム誤差:</label>
                  <input
                    type="number"
                    value={randomOffset}
                    onChange={(e) => setRandomOffset(Number(e.target.value))}
                    disabled={!breakEnabled || isSavingBreak}
                    min="0"
                    max="30"
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      width: '80px',
                      opacity: !breakEnabled ? 0.5 : 1,
                      cursor: !breakEnabled ? 'not-allowed' : 'text'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: !breakEnabled ? '#999' : '#666' }}>±分</span>
                </div>
                <button
                  onClick={handleSaveBreakSchedule}
                  disabled={!breakEnabled || isSavingBreak}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: !breakEnabled ? '#ccc' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: (!breakEnabled || isSavingBreak) ? 'not-allowed' : 'pointer',
                    opacity: (!breakEnabled || isSavingBreak) ? 0.6 : 1,
                    marginTop: '8px'
                  }}
                >
                  {isSavingBreak ? '保存中...' : '時刻設定を保存'}
                </button>
              </div>
              <p className="setting-detail-note" style={{ marginTop: '12px', fontSize: '12px', color: !breakEnabled ? '#999' : '#666' }}>
                ランダム誤差により、設定時刻の前後数分のランダムなタイミングで打刻されます
              </p>
            </div>
          </div>

          {/* 自動出勤・退勤機能 */}
          <div className="setting-section">
            <h3 className="setting-section-title">PC連動自動/出退勤打刻設定</h3>

            {/* アプリ起動時停止時の自動打刻 */}
            <div className="setting-item">
              <div className="setting-item-content">
                <div className="setting-item-label">
                  <span className="setting-item-name">アプリ起動時<br/>自動出勤</span>
                </div>
                <div className="setting-item-control">
                  <button
                    onClick={handleToggleAutoClockInOnStartup}
                    className={`setting-toggle ${autoClockInOnStartup ? 'enabled' : 'disabled'}`}
                  >
                    <div className="setting-toggle-track">
                      <div className="setting-toggle-thumb"></div>
                    </div>
                    <span className="setting-toggle-label">
                      {autoClockInOnStartup ? '有効' : '無効'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="setting-item-content">
                <div className="setting-item-label">
                  <span className="setting-item-name">PCシャットダウン時<br/>自動退勤</span>
                </div>
                <div className="setting-item-control">
                  <button
                    onClick={handleToggleAutoClockOutOnShutdown}
                    className={`setting-toggle ${autoClockOutOnShutdown ? 'enabled' : 'disabled'}`}
                  >
                    <div className="setting-toggle-track">
                      <div className="setting-toggle-thumb"></div>
                    </div>
                    <span className="setting-toggle-label">
                      {autoClockOutOnShutdown ? '有効' : '無効'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3 className="setting-section-title">PC連動自動/休憩設定</h3>
            <div className="setting-item">
              <div className="setting-item-content">
                <div className="setting-item-label">
                  <span className="setting-item-name">自動休憩モード</span>
                </div>
                <div className="setting-item-control">
                  <button
                    onClick={handleTogglePowerMonitor}
                    disabled={isLoading}
                    className={`setting-toggle ${isPowerMonitorEnabled ? 'enabled' : 'disabled'}`}
                  >
                    <div className="setting-toggle-track">
                      <div className="setting-toggle-thumb"></div>
                    </div>
                    <span className="setting-toggle-label">
                      {isPowerMonitorEnabled ? '有効' : '無効'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 機能詳細 */}
            <div className="setting-detail">
              <h4 className="setting-detail-title">自動休憩のトリガー</h4>
              <ul className="setting-detail-list">
                <li>
                  <strong>休憩開始:</strong> 画面ロック/システムサスペンド時
                </li>
                <li>
                  <strong>休憩終了:</strong> 画面アンロック/システムレジューム時
                </li>
              </ul>
            </div>
          </div>

          {/* 設定ファイル情報 */}
          <div className="setting-section">
            <h3 className="setting-section-title">設定ファイル情報</h3>
            {configPath && (
              <div className="setting-detail">
                <h4 className="setting-detail-title">ファイルパス</h4>
                <p className="setting-detail-note" style={{ wordBreak: 'break-all', fontSize: '11px' }}>
                  {configPath}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="modal-button modal-button-primary"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};