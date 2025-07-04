import React from 'react';

interface ControlPanelProps {
  onClockIn: (type: 'start' | 'end' | 'break-start' | 'break-end') => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onClockIn }) => {
  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onClockIn('start')}
          className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          勤務開始
        </button>
        <button
          onClick={() => onClockIn('end')}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          勤務終了
        </button>
        <button
          onClick={() => onClockIn('break-start')}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          休憩開始
        </button>
        <button
          onClick={() => onClockIn('break-end')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          休憩終了
        </button>
      </div>
    </div>
  );
};