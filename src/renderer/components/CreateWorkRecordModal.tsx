import React, { useState } from 'react';

interface BreakTime {
  id: string;
  start: string;
  end: string;
}

interface CreateWorkRecordModalProps {
  date: string;
  onSave: (clockIn: string, clockOut: string, breakTimes: { start: string; end: string }[]) => Promise<void>;
  onCancel: () => void;
}

export const CreateWorkRecordModal: React.FC<CreateWorkRecordModalProps> = ({ date, onSave, onCancel }) => {
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([
    { id: '1', start: '12:00', end: '13:00' }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 休憩時間を追加
  const addBreakTime = () => {
    const newId = String(Date.now());
    setBreakTimes([...breakTimes, { id: newId, start: '', end: '' }]);
  };

  // 休憩時間を削除
  const removeBreakTime = (id: string) => {
    setBreakTimes(breakTimes.filter(bt => bt.id !== id));
  };

  // 休憩時間を更新
  const updateBreakTime = (id: string, field: 'start' | 'end', value: string) => {
    setBreakTimes(breakTimes.map(bt =>
      bt.id === id ? { ...bt, [field]: value } : bt
    ));
  };

  // 入力値の検証
  const validate = (): boolean => {
    // 時刻フォーマットの検証
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!clockIn || !timeRegex.test(clockIn)) {
      setError('出勤時刻を正しく入力してください（例: 09:00）');
      return false;
    }

    if (!clockOut || !timeRegex.test(clockOut)) {
      setError('退勤時刻を正しく入力してください（例: 18:00）');
      return false;
    }

    // 出勤時刻 < 退勤時刻のチェック
    if (clockIn >= clockOut) {
      setError('退勤時刻は出勤時刻より後である必要があります');
      return false;
    }

    // 休憩時間の検証
    for (const breakTime of breakTimes) {
      if (breakTime.start && !timeRegex.test(breakTime.start)) {
        setError('休憩開始時刻を正しく入力してください');
        return false;
      }
      if (breakTime.end && !timeRegex.test(breakTime.end)) {
        setError('休憩終了時刻を正しく入力してください');
        return false;
      }
      if (breakTime.start && breakTime.end && breakTime.start >= breakTime.end) {
        setError('休憩終了時刻は休憩開始時刻より後である必要があります');
        return false;
      }
      // 勤務時間内の休憩かチェック
      if (breakTime.start && breakTime.end) {
        if (breakTime.start < clockIn || breakTime.end > clockOut) {
          setError('休憩時間は勤務時間内である必要があります');
          return false;
        }
      }
    }

    return true;
  };

  // 保存処理
  const handleSave = async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      // 空でない休憩時間のみを送信
      const validBreakTimes = breakTimes
        .filter(bt => bt.start && bt.end)
        .map(bt => ({ start: bt.start, end: bt.end }));

      await onSave(clockIn, clockOut, validBreakTimes);
    } catch (error: any) {
      setError(error.message || '保存中にエラーが発生しました');
      setSaving(false);
    }
  };

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
          <h2 className="modal-title">勤怠記録を作成</h2>
        </div>

        <div className="modal-body">
          <div className="modal-info">
            <p className="modal-info-text">
              {formatDate(date)}の勤怠記録を作成します
            </p>
          </div>

          <div className="time-edit-section">
            <label className="time-edit-label">
              <span className="time-edit-label-text">出勤時刻</span>
              <input
                type="time"
                className="time-edit-input"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                disabled={saving}
                required
              />
            </label>

            <label className="time-edit-label" style={{ marginTop: '12px' }}>
              <span className="time-edit-label-text">退勤時刻</span>
              <input
                type="time"
                className="time-edit-input"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                disabled={saving}
                required
              />
            </label>
          </div>

          <div className="time-edit-section" style={{ marginTop: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span className="time-edit-label-text">休憩時間</span>
              <button
                type="button"
                onClick={addBreakTime}
                className="modal-add-break-button"
                disabled={saving}
                title="休憩時間を追加"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="modal-add-icon">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>

            {breakTimes.length === 0 ? (
              <div className="empty-break-message-compact">
                休憩時間はありません
              </div>
            ) : (
              <div className="break-records-list-compact">
                {breakTimes.map((breakTime, index) => (
                  <div key={breakTime.id} className="break-record-item-compact">
                    <span className="break-number-compact">{index + 1}.</span>
                    <div className="break-time-inputs-compact">
                      <input
                        type="time"
                        className="time-edit-input-compact"
                        value={breakTime.start}
                        onChange={(e) => updateBreakTime(breakTime.id, 'start', e.target.value)}
                        placeholder="開始"
                        disabled={saving}
                      />
                      <span className="time-separator-compact">〜</span>
                      <input
                        type="time"
                        className="time-edit-input-compact"
                        value={breakTime.end}
                        onChange={(e) => updateBreakTime(breakTime.id, 'end', e.target.value)}
                        placeholder="終了"
                        disabled={saving}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBreakTime(breakTime.id)}
                      className="break-delete-button"
                      disabled={saving}
                      title="削除"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="break-delete-icon">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="modal-error-message">
              {error}
            </div>
          )}
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