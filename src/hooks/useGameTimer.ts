/**
 * useGameTimer - Game Timer with Callbacks
 * จัดการ countdown timer พร้อม callbacks สำหรับ warning และ completion
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface UseGameTimerOptions {
  duration: number; // seconds
  onTick?: (remaining: number) => void;
  onWarning?: () => void; // Called when entering warning zone (last 5 seconds)
  onComplete?: () => void;
  warningThreshold?: number; // seconds before end to trigger warning
  autoStart?: boolean;
}

interface UseGameTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  isWarning: boolean;
  progress: number; // 0-1, 1 = full time, 0 = done
  start: () => void;
  pause: () => void;
  reset: () => void;
  restart: () => void;
}

export function useGameTimer({
  duration,
  onTick,
  onWarning,
  onComplete,
  warningThreshold = 5,
  autoStart = true,
}: UseGameTimerOptions): UseGameTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [hasTriggeredWarning, setHasTriggeredWarning] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onWarningRef = useRef(onWarning);
  const onTickRef = useRef(onTick);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onWarningRef.current = onWarning;
    onTickRef.current = onTick;
  }, [onComplete, onWarning, onTick]);

  // Main timer effect
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;

        // Trigger tick callback
        if (onTickRef.current) {
          onTickRef.current(next);
        }

        // Check for warning threshold
        if (next <= warningThreshold && next > 0 && !hasTriggeredWarning) {
          setHasTriggeredWarning(true);
          if (onWarningRef.current) {
            onWarningRef.current();
          }
        }

        // Timer complete
        if (next <= 0) {
          setIsRunning(false);
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          }, 0);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, warningThreshold, hasTriggeredWarning]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(duration);
    setHasTriggeredWarning(false);
  }, [duration]);

  const restart = useCallback(() => {
    setTimeRemaining(duration);
    setHasTriggeredWarning(false);
    setIsRunning(true);
  }, [duration]);

  return {
    timeRemaining,
    isRunning,
    isWarning: timeRemaining <= warningThreshold && timeRemaining > 0,
    progress: timeRemaining / duration,
    start,
    pause,
    reset,
    restart,
  };
}

export default useGameTimer;
