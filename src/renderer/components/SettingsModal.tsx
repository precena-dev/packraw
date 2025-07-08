import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPowerMonitorEnabled: boolean;
  onTogglePowerMonitor: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isPowerMonitorEnabled,
  onTogglePowerMonitor
}) => {
  const [isLoading, setIsLoading] = useState(false);

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
          <div className="setting-section">
            <h3 className="setting-section-title">自動休憩機能</h3>
            <div className="setting-item">
              <div className="setting-item-content">
                <div className="setting-item-label">
                  <span className="setting-item-name">自動休憩モード</span>
                  <p className="setting-item-description">
                    画面ロックやシステムサスペンド時に自動で休憩開始/終了の打刻を行います
                  </p>
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
                  <strong>休憩開始:</strong> 画面ロック時、システムサスペンド時
                </li>
                <li>
                  <strong>休憩終了:</strong> 画面アンロック時、システムレジューム時
                </li>
              </ul>
              <p className="setting-detail-note">
                ※ 現在はテスト用にコンソールログのみ出力されます
              </p>
            </div>
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