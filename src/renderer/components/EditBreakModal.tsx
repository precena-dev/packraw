import React, { useState, useEffect } from 'react';

interface EditBreakModalProps {
  breakBegin: any;
  breakEnd: any;
  onSave: (beginTime: string, endTime: string) => void;
  onCancel: () => void;
}

export const EditBreakModal: React.FC<EditBreakModalProps> = ({
  breakBegin,
  breakEnd,
  onSave,
  onCancel,
}) => {
  // 時刻を HH:MM 形式で抽出
  const extractTime = (datetime: string | null) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [beginTime, setBeginTime] = useState(extractTime(breakBegin?.datetime));
  const [endTime, setEndTime] = useState(extractTime(breakEnd?.datetime));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBeginTime(extractTime(breakBegin?.datetime));
    setEndTime(extractTime(breakEnd?.datetime));
    setError('');
  }, [breakBegin, breakEnd]);

  const handleSave = () => {
    // 既に保存中の場合は処理しない
    if (saving) return;

    // バリデーション
    if (!beginTime) {
      setError('休憩開始時刻を入力してください');
      return;
    }

    if (!endTime) {
      setError('休憩終了時刻を入力してください');
      return;
    }

    // 時刻の妥当性チェック
    const beginParts = beginTime.split(':');
    const endParts = endTime.split(':');

    if (beginParts.length !== 2 || endParts.length !== 2) {
      setError('正しい時刻形式で入力してください (HH:MM)');
      return;
    }

    const beginHour = parseInt(beginParts[0], 10);
    const beginMinute = parseInt(beginParts[1], 10);
    const endHour = parseInt(endParts[0], 10);
    const endMinute = parseInt(endParts[1], 10);

    if (
      isNaN(beginHour) || isNaN(beginMinute) || isNaN(endHour) || isNaN(endMinute) ||
      beginHour < 0 || beginHour > 23 || endHour < 0 || endHour > 23 ||
      beginMinute < 0 || beginMinute > 59 || endMinute < 0 || endMinute > 59
    ) {
      setError('正しい時刻を入力してください');
      return;
    }

    // 開始時刻 < 終了時刻のチェック
    const beginTimeValue = beginHour * 60 + beginMinute;
    const endTimeValue = endHour * 60 + endMinute;

    if (beginTimeValue >= endTimeValue) {
      setError('終了時刻は開始時刻より後にしてください');
      return;
    }

    setSaving(true);
    onSave(beginTime, endTime);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">休憩時間を修正</h2>
        </div>

        <div className="modal-body">
          <div className="time-edit-section">
            <label className="time-edit-label">
              <span className="time-edit-label-text">休憩開始</span>
              <input
                type="time"
                className="time-edit-input"
                value={beginTime}
                onChange={(e) => {
                  setBeginTime(e.target.value);
                  setError('');
                }}
              />
            </label>
          </div>

          <div className="time-edit-section">
            <label className="time-edit-label">
              <span className="time-edit-label-text">休憩終了</span>
              <input
                type="time"
                className="time-edit-input"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setError('');
                }}
              />
            </label>
          </div>

          {error && (
            <div className="modal-error-message">
              {error}
            </div>
          )}

          <div className="modal-info">
            <p className="modal-info-text">
              休憩時間の打刻時刻を修正できます。修正後の時刻で打刻が更新されます。
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="modal-button modal-button-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            キャンセル
          </button>
          <button
            className="modal-button modal-button-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
