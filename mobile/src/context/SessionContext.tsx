/**
 * TrueReact - Session Context
 * 
 * Provides session state management across the app.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type SessionState = 'idle' | 'calibrating' | 'active' | 'paused' | 'safe_state' | 'ended';

type SessionData = {
  sessionId: string | null;
  state: SessionState;
  startedAt: Date | null;
  duration: number;
  feedbackCount: number;
  baselineMetrics: BaselineMetrics | null;
};

type BaselineMetrics = {
  neutralExpression: any;
  speechRate: number;
  pitchBaseline: number;
  energyBaseline: number;
};

type SessionContextType = {
  session: SessionData;
  startSession: () => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  setBaselineMetrics: (metrics: BaselineMetrics) => void;
  incrementFeedbackCount: () => void;
  activateSafeState: () => void;
};

const initialSession: SessionData = {
  sessionId: null,
  state: 'idle',
  startedAt: null,
  duration: 0,
  feedbackCount: 0,
  baselineMetrics: null,
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>(initialSession);

  const startSession = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSession({
      ...initialSession,
      sessionId,
      state: 'calibrating',
      startedAt: new Date(),
    });
  }, []);

  const endSession = useCallback(() => {
    setSession(prev => ({
      ...prev,
      state: 'ended',
    }));
  }, []);

  const pauseSession = useCallback(() => {
    setSession(prev => ({
      ...prev,
      state: 'paused',
    }));
  }, []);

  const resumeSession = useCallback(() => {
    setSession(prev => ({
      ...prev,
      state: 'active',
    }));
  }, []);

  const setBaselineMetrics = useCallback((metrics: BaselineMetrics) => {
    setSession(prev => ({
      ...prev,
      baselineMetrics: metrics,
      state: 'active',
    }));
  }, []);

  const incrementFeedbackCount = useCallback(() => {
    setSession(prev => ({
      ...prev,
      feedbackCount: prev.feedbackCount + 1,
    }));
  }, []);

  const activateSafeState = useCallback(() => {
    setSession(prev => ({
      ...prev,
      state: 'safe_state',
    }));
  }, []);

  const value: SessionContextType = {
    session,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    setBaselineMetrics,
    incrementFeedbackCount,
    activateSafeState,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
