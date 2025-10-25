import React, { useState } from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  date?: string; // YYYY-MM-DD形式の日付
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, errorMessage, date, onClose }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (!isOpen) return null;

  // 日付をYYYY/MM/DD形式にフォーマット
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}/${month}/${day}`;
  };

  const formattedDate = formatDate(date);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">エラー</h2>
        </div>

        <div className="modal-body">
          <div className="modal-error-icon-wrapper">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="modal-error-icon"
            >
              <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
              <text
                x="12"
                y="18"
                fontSize="16"
                fontWeight="bold"
                textAnchor="middle"
                fill="white"
              >
                !
              </text>
            </svg>
          </div>
          <p className="modal-error-text">
            {formattedDate && <>{formattedDate}<br/>
            お手数ですがこの日の勤怠登録は<br/></>}
            freeeのweb画面から実施して下さい。
          </p>

          {/* エラー詳細のアコーディオン */}
          {errorMessage && (
            <div className="error-detail-accordion">
              <button
                className="error-detail-toggle"
                onClick={() => setIsDetailOpen(!isDetailOpen)}
              >
                <span className="error-detail-label">詳細を表示</span>
                <svg
                  className={`error-detail-chevron ${isDetailOpen ? 'open' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isDetailOpen && (
                <div className="error-detail-content">
                  <p className="error-detail-message">{errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="modal-button modal-button-primary"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
