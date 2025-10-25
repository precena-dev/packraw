import React from 'react';

interface DeleteWorkRecordModalProps {
  date: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeleteWorkRecordModal: React.FC<DeleteWorkRecordModalProps> = ({
  date,
  onConfirm,
  onCancel,
  loading = false
}) => {
  // 日付を日本語形式で表示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00+09:00');
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">勤怠記録を削除</h2>
        </div>

        <div className="modal-body">
          <div className="modal-warning-message">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="warning-icon"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p className="warning-text">
              {formatDate(date)}の勤怠記録を削除しますか？
            </p>
          </div>

          <div className="modal-info">
            <p className="modal-info-text">
              この操作により、出勤・退勤・休憩時間のすべての記録が削除されます。
              削除後は元に戻すことができません。
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-button modal-button-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            className="modal-button modal-button-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '削除中...' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  );
};