/**
 * TrueReact - Session Timer Hook
 * 
 * Pomodoro-style session timer with automatic break reminders
 * and breathing exercise prompts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';

export type TimerState = 'idle' | 'session' | 'break' | 'breathing';

export type TimerSettings = {
  sessionDuration: number; // minutes
  breakDuration: number; // minutes
  breathingDuration: number; // seconds
  autoStartBreaks: boolean;
  hapticAlerts: boolean;
};

export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

const DEFAULT_SETTINGS: TimerSettings = {
  sessionDuration: 15, // 15 minute sessions
  breakDuration: 3, // 3 minute breaks
  breathingDuration: 60, // 1 minute breathing
  autoStartBreaks: true,
  hapticAlerts: true,
};

// 4-7-8 breathing pattern
const BREATHING_PATTERN = {
  inhale: 4,
  hold: 7,
  exhale: 8,
  rest: 1,
};

export function useSessionTimer(customSettings?: Partial<TimerSettings>) {
  const settings = { ...DEFAULT_SETTINGS, ...customSettings };
  
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(settings.sessionDuration * 60);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [breaksTaken, setBreaksTaken] = useState(0);
  
  // Breathing exercise state
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase>('inhale');
  const [breathingSeconds, setBreathingSeconds] = useState(BREATHING_PATTERN.inhale);
  const [breathingCycles, setBreathingCycles] = useState(0);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    };
  }, []);

  // Main timer logic
  useEffect(() => {
    if (timerState === 'session' || timerState === 'break') {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          
          // Track total session time
          if (timerState === 'session') {
            setTotalSessionTime(t => t + 1);
          }
          
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  // Breathing exercise logic
  useEffect(() => {
    if (timerState === 'breathing') {
      breathingIntervalRef.current = setInterval(() => {
        setBreathingSeconds(prev => {
          if (prev <= 1) {
            // Move to next phase
            transitionBreathingPhase();
            return getNextPhaseDuration();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (breathingIntervalRef.current) {
        clearInterval(breathingIntervalRef.current);
        breathingIntervalRef.current = null;
      }
    }

    return () => {
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    };
  }, [timerState, breathingPhase]);

  const transitionBreathingPhase = useCallback(() => {
    const phases: BreathingPhase[] = ['inhale', 'hold', 'exhale', 'rest'];
    setBreathingPhase(current => {
      const currentIndex = phases.indexOf(current);
      const nextIndex = (currentIndex + 1) % phases.length;
      
      // Haptic feedback on phase change
      if (settings.hapticAlerts) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Track cycles (one cycle = inhale -> hold -> exhale -> rest)
      if (nextIndex === 0) {
        setBreathingCycles(c => c + 1);
        
        // End after ~1 minute (3-4 cycles of 4-7-8-1 = 20s each)
        if (breathingCycles >= 2) {
          endBreathingExercise();
        }
      }
      
      return phases[nextIndex];
    });
  }, [breathingCycles, settings.hapticAlerts]);

  const getNextPhaseDuration = useCallback(() => {
    const phases: BreathingPhase[] = ['inhale', 'hold', 'exhale', 'rest'];
    const currentIndex = phases.indexOf(breathingPhase);
    const nextPhase = phases[(currentIndex + 1) % phases.length];
    return BREATHING_PATTERN[nextPhase];
  }, [breathingPhase]);

  const handleTimerComplete = useCallback(() => {
    if (settings.hapticAlerts) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (timerState === 'session') {
      // Session complete, prompt for break
      if (settings.autoStartBreaks) {
        startBreak();
      } else {
        setTimerState('idle');
      }
    } else if (timerState === 'break') {
      // Break complete, ready for next session
      setBreaksTaken(b => b + 1);
      startSession();
    }
  }, [timerState, settings]);

  const startSession = useCallback(() => {
    setTimerState('session');
    setSecondsRemaining(settings.sessionDuration * 60);
  }, [settings.sessionDuration]);

  const startBreak = useCallback(() => {
    setTimerState('break');
    setSecondsRemaining(settings.breakDuration * 60);
  }, [settings.breakDuration]);

  const startBreathingExercise = useCallback(() => {
    setTimerState('breathing');
    setBreathingPhase('inhale');
    setBreathingSeconds(BREATHING_PATTERN.inhale);
    setBreathingCycles(0);
    
    if (settings.hapticAlerts) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [settings.hapticAlerts]);

  const endBreathingExercise = useCallback(() => {
    setTimerState('idle');
    setBreathingPhase('inhale');
    setBreathingSeconds(BREATHING_PATTERN.inhale);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState('idle');
  }, []);

  const resumeTimer = useCallback(() => {
    // Resume in the state we were in
    if (secondsRemaining > 0) {
      setTimerState('session');
    }
  }, [secondsRemaining]);

  const resetTimer = useCallback(() => {
    setTimerState('idle');
    setSecondsRemaining(settings.sessionDuration * 60);
    setTotalSessionTime(0);
    setBreaksTaken(0);
  }, [settings.sessionDuration]);

  const skipBreak = useCallback(() => {
    startSession();
  }, [startSession]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Progress percentage (0-1)
  const progress = useCallback(() => {
    const total = timerState === 'session' 
      ? settings.sessionDuration * 60 
      : settings.breakDuration * 60;
    return 1 - (secondsRemaining / total);
  }, [timerState, secondsRemaining, settings]);

  return {
    // State
    timerState,
    secondsRemaining,
    totalSessionTime,
    breaksTaken,
    
    // Breathing
    breathingPhase,
    breathingSeconds,
    breathingCycles,
    
    // Computed
    formattedTime: formatTime(secondsRemaining),
    formattedTotalTime: formatTime(totalSessionTime),
    progress: progress(),
    
    // Actions
    startSession,
    startBreak,
    startBreathingExercise,
    endBreathingExercise,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipBreak,
    
    // Utils
    formatTime,
  };
}

export default useSessionTimer;
