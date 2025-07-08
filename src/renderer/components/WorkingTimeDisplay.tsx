import React, { useState, useEffect } from 'react';

interface WorkingTimeDisplayProps {
  employeeInfo: any;
  todayTimeClocks: any[];
  selectedDate: string;
  isToday: boolean;
  onDateChange: (direction: 'prev' | 'next') => void;
}

export const WorkingTimeDisplay: React.FC<WorkingTimeDisplayProps> = ({ 
  employeeInfo,
  todayTimeClocks,
  selectedDate,
  isToday,
  onDateChange
}) => {
  const [calculatedWorkingTime, setCalculatedWorkingTime] = useState('00:00');
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);

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
    
    // 実際の勤務時間 = 総勤務時間 - 休憩時間
    const actualWorkingMs = Math.max(0, totalWorkingMs - totalBreakMs);
    
    // 時分に変換
    const hours = Math.floor(actualWorkingMs / (1000 * 60 * 60));
    const minutes = Math.floor((actualWorkingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const workingTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // 勤務中かどうかの判定
    const isWorking = !clockOut && clockIn;
    
    return { workingTime, isWorking };
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
    <div className="bg-white border-b p-3" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="flex items-center justify-end mb-2">
        <div className="text-lg text-gray-600 employee-name">
          {employeeInfo?.display_name}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <span className="text-lg text-gray-600 working-time-display">
            （勤務時間：{calculatedWorkingTime}）
          </span>
        </div>
        <div className="date-nav-container">
          <button
            onClick={() => onDateChange('prev')}
            className="date-nav-button"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <span className="date-nav-button-icon">‹</span>
          </button>
          <span style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', whiteSpace: 'nowrap' }}>
            {formatSelectedDate()}
          </span>
          {!isToday ? (
            <button
              onClick={() => onDateChange('next')}
              className="date-nav-button"
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              <span className="date-nav-button-icon">›</span>
            </button>
          ) : (
            <div className="w-7 h-7">{/* 今日の場合はスペースを確保 */}</div>
          )}
        </div>
        <div className="flex-1"></div>
      </div>
    </div>
  );
};