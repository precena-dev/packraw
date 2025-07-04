import React from 'react';

interface WorkingTimeDisplayProps {
  workingTime: string;
  isWorking: boolean;
}

export const WorkingTimeDisplay: React.FC<WorkingTimeDisplayProps> = ({ 
  workingTime, 
  isWorking 
}) => {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">本日の勤務時間</span>
        <div className="flex items-center">
          <span className="text-lg font-bold text-blue-600">{workingTime}</span>
          {isWorking && (
            <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
        </div>
      </div>
    </div>
  );
};