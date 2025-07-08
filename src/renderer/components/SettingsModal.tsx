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
  const [configPath, setConfigPath] = useState<string>('');

  // 設定ファイルパスを取得
  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getConfigPath().then(path => {
        setConfigPath(path);
      });
    }
  }, [isOpen]);

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
            <div className="setting-item">
              <div className="setting-item-content">
                <div className="setting-item-label">
                  <span className="setting-item-name">保存場所</span>
                  <p className="setting-item-description">
                    electron-storeによりローカルに永続化されます
                  </p>
                </div>
              </div>
            </div>
            
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