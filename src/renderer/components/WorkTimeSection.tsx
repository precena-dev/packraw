import React from 'react';

interface TimeClockButtonState {
  clockIn: boolean;
  clockOut: boolean;
  breakBegin: boolean;
  breakEnd: boolean;
}

interface WorkTimeSectionProps {
  loading: boolean;
  buttonStates: TimeClockButtonState;
  onTimeClock: (type: 'clock_in' | 'clock_out' | 'break_begin' | 'break_end') => Promise<void>;
}

export const WorkTimeSection: React.FC<WorkTimeSectionProps> = ({
  loading,
  buttonStates,
  onTimeClock
}) => {

  const getButtonClassName = (isDisabled: boolean, buttonType: string) => {
    if (isDisabled) {
      return 'work-button work-button--disabled';
    }
    
    switch (buttonType) {
      case 'clock_in':
        return 'work-button work-button--green';
      case 'clock_out':
        return 'work-button work-button--red';
      default:
        return 'work-button work-button--blue';
    }
  };

  const LoadingSpinner = () => (
    <div className="loading-spinner">
      <div className="loading-spinner__circle" />
    </div>
  );

  return (
    <div className="flex items-center justify-center px-4 py-2">
      <div className="button-container">
        {/* 勤務開始終了ボタン列 */}
        <div className="button-column">
          <h3 className="text-sm font-medium flex items-center">
            💼 出勤・退勤
          </h3>
          <button
            onClick={() => onTimeClock('clock_in')}
            disabled={loading || !buttonStates.clockIn}
            className={getButtonClassName(loading || !buttonStates.clockIn, 'clock_in')}
          >
            {loading && <LoadingSpinner />}
            <div className="button-text">出勤</div>
          </button>

          <button
            onClick={() => onTimeClock('clock_out')}
            disabled={loading || !buttonStates.clockOut}
            className={getButtonClassName(loading || !buttonStates.clockOut, 'clock_out')}
          >
            {loading && <LoadingSpinner />}
            <div className="button-text">退勤</div>
          </button>
        </div>

        {/* 休憩開始終了ボタン列 */}
        <div className="button-column">
          <h3 className="text-sm font-medium flex items-center">
            ☕ 休憩
          </h3>
          <button
            onClick={() => onTimeClock('break_begin')}
            disabled={loading || !buttonStates.breakBegin}
            className={getButtonClassName(loading || !buttonStates.breakBegin, 'break_begin')}
          >
            {loading && <LoadingSpinner />}
            <div className="button-text">休憩開始</div>
          </button>

          <button
            onClick={() => onTimeClock('break_end')}
            disabled={loading || !buttonStates.breakEnd}
            className={getButtonClassName(loading || !buttonStates.breakEnd, 'break_end')}
          >
            {loading && <LoadingSpinner />}
            <div className="button-text">休憩終了</div>
          </button>
        </div>
      </div>
    </div>
  );
};