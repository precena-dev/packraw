import React, { useState, useEffect } from 'react';

interface WorkingTimeDisplayProps {
  employeeInfo: any;
  todayTimeClocks: any[];
}

export const WorkingTimeDisplay: React.FC<WorkingTimeDisplayProps> = ({ 
  employeeInfo,
  todayTimeClocks
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

  // 今日の日付を取得してフォーマット
  const formatTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 0-indexedなので+1
    const day = today.getDate();
    
    // 曜日を取得
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[today.getDay()];
    
    return `${year}年${month}月${day}日（${dayOfWeek}）`;
  };

  return (
    <div className="bg-white border-b p-6" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">freee勤怠管理</h2>
        <div className="text-lg text-gray-600">
          {employeeInfo?.display_name}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1"></div>
        <div className="flex-1 text-center">
          <span style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
            {formatTodayDate()}
          </span>
        </div>
        <div className="flex-1 text-right">
          <span className="text-lg text-gray-600">
            （勤務時間：{calculatedWorkingTime}）
          </span>
        </div>
      </div>
    </div>
  );
};