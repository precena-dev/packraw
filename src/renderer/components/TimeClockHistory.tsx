import React, { useState } from 'react';

interface TimeClockHistoryProps {
  todayTimeClocks: any[];
  onEditBreak?: (breakBegin: any, breakEnd: any) => void;
  onAddBreak?: () => void;
  onDeleteBreak?: (breakBegin: any, breakEnd: any) => void;
  onEditClockIn?: (clockIn: any) => void;
  onEditClockOut?: (clockOut: any) => void;
  loading?: boolean;
  nextSchedule?: { type: string; time: Date } | null;
  showScheduleIndicator?: boolean;
  isPowerMonitorEnabled?: boolean;
}

export const TimeClockHistory: React.FC<TimeClockHistoryProps> = ({ todayTimeClocks, onEditBreak, onAddBreak, onDeleteBreak, onEditClockIn, onEditClockOut, loading = false, nextSchedule, showScheduleIndicator = false, isPowerMonitorEnabled = false }) => {
  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // 打刻データを整理
  const clockIn = todayTimeClocks.find(tc => tc.type === 'clock_in');
  const clockOut = todayTimeClocks.find(tc => tc.type === 'clock_out');
  
  // 休憩データを時系列でペアリング
  const breakBegins = todayTimeClocks.filter(tc => tc.type === 'break_begin').sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  const breakEnds = todayTimeClocks.filter(tc => tc.type === 'break_end').sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  
  // 休憩セッションを作成（開始と終了をペアにする）
  const breakSessions = [];
  const maxBreaks = Math.max(breakBegins.length, breakEnds.length, 1); // 最低1行は表示
  
  for (let i = 0; i < maxBreaks; i++) {
    breakSessions.push({
      no: i + 1,
      begin: breakBegins[i] || null,
      end: breakEnds[i] || null
    });
  }

  // ローディング中の表示
  if (loading) {
    return (
      <div className="time-table">
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          minHeight: '200px'
        }}>
          <div className="spinner" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-table">
      <div className="time-row">
        <div className="time-label-row">
          <svg className="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          出勤
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`time-value ${!clockIn ? 'empty' : ''}`}>
            {clockIn ? formatTime(clockIn.datetime) : '--:--'}
          </div>
          {clockIn && onEditClockIn && (
            <button
              onClick={() => clockOut && onEditClockIn(clockIn)}
              className="edit-button"
              title={clockOut ? "出勤時刻を修正" : "退勤打刻後に修正が可能になります"}
              disabled={!clockOut}
              style={{ opacity: clockOut ? 1 : 0.5, cursor: clockOut ? 'pointer' : 'not-allowed' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="time-row">
        <div className="time-label-row">
          <svg className="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          退勤
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`time-value ${!clockOut ? 'empty' : ''}`}>
            {clockOut ? formatTime(clockOut.datetime) : '--:--'}
          </div>
          {clockOut && onEditClockOut && (
            <button
              onClick={() => onEditClockOut(clockOut)}
              className="edit-button"
              title="退勤時刻を修正"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="break-section">
        <div className="break-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg className="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12"></polyline>
            </svg>
            <span>休憩履歴</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPowerMonitorEnabled && (
              <div className="power-monitor-indicator">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: '16px', height: '16px' }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
            )}
            {showScheduleIndicator && nextSchedule && (
              <div
                className="schedule-indicator"
                title={`次の予約: ${nextSchedule.time ? new Date(nextSchedule.time).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Tokyo'
                }) : ''} ${nextSchedule.type}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            )}
            {onAddBreak && (
              <button
                onClick={() => clockOut && onAddBreak()}
                className="add-break-button"
                title={clockOut ? "休憩時間を追加" : "退勤打刻後に追加が可能になります"}
                disabled={!clockOut}
                style={{ opacity: clockOut ? 1 : 0.5, cursor: clockOut ? 'pointer' : 'not-allowed' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="break-list">
          {breakSessions.length > 0 && breakSessions.some(s => s.begin || s.end) ? (
            breakSessions.map((session) => (
              session.begin || session.end ? (
                <div key={session.no} className="break-item">
                  <div className="break-times">
                    <span>{session.begin ? formatTime(session.begin.datetime) : '--:--'}</span>
                    <span className="break-arrow">→</span>
                    <span>{session.end ? formatTime(session.end.datetime) : '休憩中...'}</span>
                    {session.begin && session.end && (
                      <span className="break-duration">
                        ({Math.floor((new Date(session.end.datetime).getTime() - new Date(session.begin.datetime).getTime()) / 60000)}分)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(session.begin || session.end) && onEditBreak && (
                      <button
                        onClick={() => clockOut && onEditBreak(session.begin, session.end)}
                        className="edit-button"
                        title={clockOut ? "休憩時間を修正" : "退勤打刻後に修正が可能になります"}
                        disabled={!clockOut}
                        style={{ opacity: clockOut ? 1 : 0.5, cursor: clockOut ? 'pointer' : 'not-allowed' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="edit-icon">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    )}
                    {(session.begin || session.end) && onDeleteBreak && (
                      <button
                        onClick={() => clockOut && onDeleteBreak(session.begin, session.end)}
                        className="delete-button"
                        title={clockOut ? "休憩時間を削除" : "退勤打刻後に削除が可能になります"}
                        disabled={!clockOut}
                        style={{ opacity: clockOut ? 1 : 0.5, cursor: clockOut ? 'pointer' : 'not-allowed' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="delete-icon">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            ))
          ) : (
            <div className="break-empty">
              休憩記録なし
            </div>
          )}
        </div>
      </div>
    </div>
  );
};