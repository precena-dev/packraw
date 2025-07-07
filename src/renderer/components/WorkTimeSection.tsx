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
    <>
      <style>{`
        .button-container {
          display: flex;
          gap: 8px;
          max-width: 600px;
          width: 100%;
          font-family: 'Meiryo', 'Hiragino Sans', 'ヒラギノ角ゴシック', sans-serif;
        }

        .button-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }

        .button-column h3 {
          margin-bottom: 4px;
          color:rgb(70, 73, 77); 
        }

        .button-column button {
          margin-bottom: 16px;
        }

        .button-column button:last-child {
          margin-bottom: 0;
        }

        .work-button {
          position: relative;
          overflow: hidden;
          padding: 16px 32px;
          border-radius: 6px;
          transition: all 0.15s ease;
          font-weight: 500;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          border: none;
        }

        .work-button--green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.1);
          cursor: pointer;
        }

        .work-button--green:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.4), 0 10px 10px -5px rgba(16, 185, 129, 0.2);
          transform: translateY(-1px);
        }

        .work-button--green:active {
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.1);
          transform: translateY(0);
        }

        .work-button--green:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
        }

        .work-button--red {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.1);
          cursor: pointer;
        }

        .work-button--red:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.4), 0 10px 10px -5px rgba(239, 68, 68, 0.2);
          transform: translateY(-1px);
        }

        .work-button--red:active {
          box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3), 0 2px 4px -1px rgba(239, 68, 68, 0.1);
          transform: translateY(0);
        }

        .work-button--red:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
        }

        .work-button--blue {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.1);
          cursor: pointer;
        }

        .work-button--blue:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
        }

        .work-button--blue:active {
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.1);
          transform: translateY(0);
        }

        .work-button--blue:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .work-button--disabled {
          background-color: #e5e7eb;
          color: #9ca3af;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          cursor: not-allowed;
        }

        .button-text {
          font-weight: 500;
        }

        .loading-spinner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 6px;
        }

        .loading-spinner__circle {
          width: 20px;
          height: 20px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      {/* 打刻ボタンセクション */}
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
    </>
  );
};