import React from 'react';

interface TimeClockHistoryProps {
  todayTimeClocks: any[];
}

export const TimeClockHistory: React.FC<TimeClockHistoryProps> = ({ todayTimeClocks }) => {
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

  return (
    <>
      <style>{`
        .history-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .history-tables {
          display: flex;
          gap: 8px;
          margin-top: 24px;
        }

        .history-table-section {
          flex: 1;
        }

        .history-table-wrapper {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .history-table {
          width: 100%;
        }

        .history-table thead tr {
          background-color: #2563eb;
          color: white;
        }

        .history-table th {
          padding: 8px 16px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
        }

        .history-table th.number-column {
          width: 64px;
        }

        .history-table tbody tr {
          transition: background-color 0.2s;
        }

        .history-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .history-table tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }

        .history-table td {
          padding: 8px 16px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 600;
        }

        .status-badge.clock-in {
          background-color: #f0fdf4;
          color: #15803d;
          border: 1px solid #86efac;
        }

        .status-badge.clock-out {
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }

        .status-badge.number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
          justify-content: center;
        }

        .time-text {
          color: #374151;
          font-weight: 500;
          font-size: 14px;
        }

        .empty-text {
          color: #9ca3af;
          font-size: 14px;
        }
      `}</style>
      <div className="history-container">
        <div className="history-tables">
          {/* 勤務開始終了セクション */}
          <div className="history-table-section">
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>出勤</th>
                    <th>退勤</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {clockIn ? (
                        <span className="status-badge clock-in">
                          {formatTime(clockIn.datetime)}
                        </span>
                      ) : (
                        <span className="empty-text">未打刻</span>
                      )}
                    </td>
                    <td>
                      {clockOut ? (
                        <span className="status-badge clock-out">
                          {formatTime(clockOut.datetime)}
                        </span>
                      ) : (
                        <span className="empty-text">未打刻</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 休憩セクション */}
          <div className="history-table-section">
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th className="number-column">No</th>
                    <th>開始</th>
                    <th>終了</th>
                  </tr>
                </thead>
                <tbody>
                  {breakSessions.map((session, index) => (
                    <tr key={session.no}>
                      <td>
                        <span className="status-badge number">
                          {session.no}
                        </span>
                      </td>
                      <td>
                        {session.begin ? (
                          <span className="time-text">{formatTime(session.begin.datetime)}</span>
                        ) : (
                          <span className="empty-text">--:--</span>
                        )}
                      </td>
                      <td>
                        {session.end ? (
                          <span className="time-text">{formatTime(session.end.datetime)}</span>
                        ) : (
                          <span className="empty-text">--:--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};