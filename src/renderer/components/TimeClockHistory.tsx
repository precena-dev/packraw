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
                {breakSessions.map((session) => (
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
  );
};