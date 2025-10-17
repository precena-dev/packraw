import React, { useState } from 'react';

interface TimeClockHistoryProps {
  todayTimeClocks: any[];
  onEditBreak?: (breakBegin: any, breakEnd: any) => void;
  loading?: boolean;
}

export const TimeClockHistory: React.FC<TimeClockHistoryProps> = ({ todayTimeClocks, onEditBreak, loading = false }) => {
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
        <div className={`time-value ${!clockIn ? 'empty' : ''}`}>
          {clockIn ? formatTime(clockIn.datetime) : '--:--'}
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
        <div className={`time-value ${!clockOut ? 'empty' : ''}`}>
          {clockOut ? formatTime(clockOut.datetime) : '--:--'}
        </div>
      </div>

      <div className="break-section">
        <div className="break-header">
          <svg className="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12"></polyline>
          </svg>
          <span>休憩履歴</span>
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
                  {(session.begin || session.end) && onEditBreak && (
                    <button
                      onClick={() => onEditBreak(session.begin, session.end)}
                      className="edit-button"
                      title="休憩時間を修正"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="edit-icon">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  )}
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