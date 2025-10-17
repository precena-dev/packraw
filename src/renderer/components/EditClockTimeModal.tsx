import React, { useState, useEffect } from 'react';

interface EditClockTimeModalProps {
  clockData: any;
  type: 'clock_in' | 'clock_out';
  onSave: (time: string) => void;
  onCancel: () => void;
}

export const EditClockTimeModal: React.FC<EditClockTimeModalProps> = ({
  clockData,
  type,
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

  const [time, setTime] = useState(extractTime(clockData?.datetime));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTime(extractTime(clockData?.datetime));
    setError('');
  }, [clockData]);

  const handleSave = () => {
    // 既に保存中の場合は処理しない
    if (saving) return;

    // バリデーション
    if (!time) {
      setError('時刻を入力してください');
      return;
    }

    // 時刻の妥当性チェック
    const timeParts = time.split(':');

    if (timeParts.length !== 2) {
      setError('正しい時刻形式で入力してください (HH:MM)');
      return;
    }

    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);

    if (
      isNaN(hour) || isNaN(minute) ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59
    ) {
      setError('正しい時刻を入力してください');
      return;
    }

    setSaving(true);
    onSave(time);
  };

  const getTitle = () => {
    return type === 'clock_in' ? '出勤時刻を修正' : '退勤時刻を修正';
  };

  const getLabel = () => {
    return type === 'clock_in' ? '出勤時刻' : '退勤時刻';
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{getTitle()}</h2>
        </div>

        <div className="modal-body">
          <div className="time-edit-section">
            <label className="time-edit-label">
              <span className="time-edit-label-text">{getLabel()}</span>
              <input
                type="time"
                className="time-edit-input"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
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
              {type === 'clock_in' ? '出勤' : '退勤'}時刻を修正できます。修正後の時刻で記録が更新されます。
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
