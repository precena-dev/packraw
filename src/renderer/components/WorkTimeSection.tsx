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


  const LoadingSpinner = () => (
    <div className="loading-spinner">
      <div className="loading-spinner__circle" />
    </div>
  );

  return (
    <div className="control-panel">
      <button
        onClick={() => onTimeClock('clock_in')}
        disabled={loading || !buttonStates.clockIn}
        className={`clock-button ${!buttonStates.clockIn ? 'disabled' : 'btn-start'}`}
      >
        {loading && <LoadingSpinner />}
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        勤務開始
      </button>

      <button
        onClick={() => onTimeClock('clock_out')}
        disabled={loading || !buttonStates.clockOut}
        className={`clock-button ${!buttonStates.clockOut ? 'disabled' : 'btn-end'}`}
      >
        {loading && <LoadingSpinner />}
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        勤務終了
      </button>

      <button
        onClick={() => onTimeClock('break_begin')}
        disabled={loading || !buttonStates.breakBegin}
        className={`clock-button ${!buttonStates.breakBegin ? 'disabled' : 'btn-break-start'}`}
      >
        {loading && <LoadingSpinner />}
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        休憩開始
      </button>

      <button
        onClick={() => onTimeClock('break_end')}
        disabled={loading || !buttonStates.breakEnd}
        className={`clock-button ${!buttonStates.breakEnd ? 'disabled' : 'btn-break-end'}`}
      >
        {loading && <LoadingSpinner />}
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        休憩終了
      </button>
    </div>
  );
};