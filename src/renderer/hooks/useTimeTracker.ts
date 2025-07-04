import { useState, useEffect, useCallback } from 'react';

export const useTimeTracker = () => {
  const [workingTime, setWorkingTime] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isWorking || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.getTime();
      setWorkingTime(Math.floor(elapsed / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorking, startTime]);

  const startWork = useCallback(() => {
    setStartTime(new Date());
    setIsWorking(true);
  }, []);

  const endWork = useCallback(() => {
    setIsWorking(false);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return { 
    workingTime: formatTime(workingTime), 
    isWorking, 
    startWork, 
    endWork 
  };
};