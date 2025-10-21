import React, { useState, useEffect } from 'react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  datesWithRecords?: string[]; // 勤怠記録がある日付のリスト
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  datesWithRecords = []
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(selectedDate));

  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(new Date(selectedDate));
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  // 月の最初の日と最後の日を取得
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // カレンダーの開始日（月曜日始まり）
  const startDate = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日を0として計算
  startDate.setDate(firstDay.getDate() - offset);

  // カレンダーの日付配列を生成（6週間分）
  const calendarDays: Date[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    calendarDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // 前月へ
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  // 次月へ
  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // 今日に戻る
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    const todayStr = formatDateToString(today);
    onDateSelect(todayStr);
    onClose();
  };

  // 日付をYYYY-MM-DD形式に変換
  const formatDateToString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 日付を選択
  const handleDateClick = (date: Date) => {
    const dateStr = formatDateToString(date);
    onDateSelect(dateStr);
    onClose();
  };

  // 日付が今日かどうか
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 日付が選択中かどうか
  const isSelected = (date: Date): boolean => {
    return formatDateToString(date) === selectedDate;
  };

  // 日付が現在の月かどうか
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month;
  };

  // 勤怠記録がある日付かどうか
  const hasRecord = (date: Date): boolean => {
    return datesWithRecords.includes(formatDateToString(date));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-header">
          <button className="calendar-nav-button" onClick={goToPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div className="calendar-title">
            {year}年{month + 1}月
          </div>
          <button className="calendar-nav-button" onClick={goToNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div className="calendar-weekdays">
          {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-days">
          {calendarDays.map((date, index) => (
            <button
              key={index}
              className={`calendar-day ${!isCurrentMonth(date) ? 'other-month' : ''} ${
                isToday(date) ? 'today' : ''
              } ${isSelected(date) ? 'selected' : ''} ${hasRecord(date) ? 'has-record' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              {date.getDate()}
            </button>
          ))}
        </div>

        <div className="calendar-footer">
          <button className="calendar-today-button" onClick={goToToday}>
            今日に戻る
          </button>
          <button className="calendar-close-button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
