import { useState, useEffect } from "react";

export function useTimer() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getRemainingTime = (startTime: Date, duration: number) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
    const remaining = duration - elapsed;
    
    if (remaining <= 0) {
      return {
        minutes: Math.abs(remaining),
        isOverdue: true,
        formatted: `-${Math.abs(remaining)}m`,
      };
    }

    return {
      minutes: remaining,
      isOverdue: false,
      formatted: `${remaining}m`,
    };
  };

  return {
    currentTime,
    formatTime,
    getRemainingTime,
  };
}
