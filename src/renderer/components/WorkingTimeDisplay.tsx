import React, { useState, useEffect } from 'react';
import { CalendarModal } from './CalendarModal';

interface WorkingTimeDisplayProps {
  employeeInfo: any;
  todayTimeClocks: any[];
  selectedDate: string;
  isToday: boolean;
  onDateChange: (direction: 'prev' | 'next') => void;
  onDateSelect: (date: string) => void;
  datesWithRecords?: string[];
}

export const WorkingTimeDisplay: React.FC<WorkingTimeDisplayProps> = ({
  employeeInfo,
  todayTimeClocks,
  selectedDate,
  isToday,
  onDateChange,
  onDateSelect,
  datesWithRecords = []
}) => {
  const [calculatedWorkingTime, setCalculatedWorkingTime] = useState('00:00');
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 勤務時間を計算する関数
  const calculateWorkingTime = () => {
    if (!todayTimeClocks || todayTimeClocks.length === 0) {
      return { workingTime: '00:00', isWorking: false };
    }

    const clockIn = todayTimeClocks.find(tc => tc.type === 'clock_in');
    const clockOut = todayTimeClocks.find(tc => tc.type === 'clock_out');
    
    if (!clockIn) {
      return { workingTime: '00:00', isWorking: false };
    }

    // 勤務開始時刻
    const startTime = new Date(clockIn.datetime);
    
    // 勤務終了時刻（退勤していない場合は現在時刻）
    const endTime = clockOut ? new Date(clockOut.datetime) : new Date();
    
    // 総勤務時間（ミリ秒）
    let totalWorkingMs = endTime.getTime() - startTime.getTime();
    
    // 休憩時間を計算して除外
    let totalBreakMs = calculateTotalBreakDuration();
    
    // 実際の勤務時間 = 総勤務時間 - 休憩時間
    const actualWorkingMs = Math.max(0, totalWorkingMs - totalBreakMs);
    
    // 時分に変換
    const hours = Math.floor(actualWorkingMs / (1000 * 60 * 60));
    const minutes = Math.floor((actualWorkingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const workingTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // 勤務中かどうかの判定
    const isWorking = !clockOut && clockIn;
    
    return { workingTime, isWorking };

    // 総休憩時間(ミリ秒):AIにロジック考えてもらった。
    function calculateTotalBreakDuration() {
      const breakBegins = todayTimeClocks.filter(tc => tc.type === 'break_begin').sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
      const breakEnds = todayTimeClocks.filter(tc => tc.type === 'break_end').sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

      let totalBreakMs = 0;

      for (let i = 0; i < breakBegins.length; i++) {
        const breakStart = new Date(breakBegins[i].datetime);
        const breakEnd = breakEnds[i] ? new Date(breakEnds[i].datetime) : (!clockOut ? new Date() : null);

        if (breakEnd) {
          totalBreakMs += breakEnd.getTime() - breakStart.getTime();
        }
      }
      return totalBreakMs;
    }
  };

  // 1分ごとに勤務時間を更新
  useEffect(() => {
    const updateWorkingTime = () => {
      const { workingTime, isWorking } = calculateWorkingTime();
      setCalculatedWorkingTime(workingTime);
      setIsCurrentlyWorking(isWorking);
    };

    // 初回計算
    updateWorkingTime();

    // 1分ごとに更新（勤務中の場合のみ）
    const interval = setInterval(() => {
      const { isWorking } = calculateWorkingTime();
      if (isWorking) {
        updateWorkingTime();
      }
    }, 60000); // 1分 = 60000ms

    return () => clearInterval(interval);
  }, [todayTimeClocks]);

  // todayTimeClocksが変更されたら即座に再計算
  useEffect(() => {
    const { workingTime, isWorking } = calculateWorkingTime();
    setCalculatedWorkingTime(workingTime);
    setIsCurrentlyWorking(isWorking);
  }, [todayTimeClocks]);

  // 選択された日付をフォーマット
  const formatSelectedDate = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 0-indexedなので+1
    const day = date.getDate();
    
    // 曜日を取得
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[date.getDay()];
    
    return `${year}年${month}月${day}日（${dayOfWeek}）`;
  };


  return (
    <div>
      {/* Title Bar */}
      <div className="title-bar" style={{ WebkitAppRegion: 'drag' } as any}>
        <div></div>
        <div className="user-info-right">
          <span className="user-name">{employeeInfo?.display_name}</span>
        </div>
      </div>

      {/* Working Time Section */}
      <div className="working-time">
        <div className="date-navigation">
          <button 
            className="nav-button" 
            onClick={() => onDateChange('prev')}
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div
            className="date-info"
            onClick={() => setIsCalendarOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <div className="date-label">
              <span>{formatSelectedDate()}</span>
              {isToday && <span className="today-indicator">今日</span>}
            </div>
            <div className="time-display">
              <span className="time-label">勤務時間</span>
              <span className="time-value">{calculatedWorkingTime}</span>
            </div>
          </div>
          {!isToday ? (
            <button 
              className="nav-button" 
              onClick={() => onDateChange('next')}
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ) : (
            <button className="nav-button" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* カレンダーモーダル */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        datesWithRecords={datesWithRecords}
      />
    </div>
  );
};