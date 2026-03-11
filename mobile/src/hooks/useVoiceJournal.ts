/**
 * TrueReact - Voice Journal Hook
 * 
 * Handles audio recording, transcription via Speech-to-Text,
 * and journal entry creation. Supports both mobile and web platforms.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
  createJournalEntry,
  updateJournalEntry,
  analyzeEmotionsLocally,
  JournalEntry,
} from '../services/voiceJournal';

const isWeb = Platform.OS === 'web';

// Safe haptics that doesn't error on web
const safeHaptics = {
  impactAsync: async (style: any) => {
    if (!isWeb) {
      await Haptics.impactAsync(style);
    }
  },
  notificationAsync: async (type: any) => {
    if (!isWeb) {
      await Haptics.notificationAsync(type);
    }
  },
};

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'complete';

export type UseVoiceJournalOptions = {
  onTranscriptionUpdate?: (text: string) => void;
  onEntryComplete?: (entry: JournalEntry) => void;
  onError?: (error: Error) => void;
  maxDuration?: number; // seconds, default 600 (10 min)
};

export type UseVoiceJournalReturn = {
  state: RecordingState;
  duration: number;
  transcription: string;
  currentEntry: JournalEntry | null;
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  audioLevels: number[];
  startRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<JournalEntry | null>;
  cancelRecording: () => Promise<void>;
  reset: () => void;
};

export function useVoiceJournal(options: UseVoiceJournalOptions = {}): UseVoiceJournalReturn {
  const {
    onTranscriptionUpdate,
    onEntryComplete,
    onError,
    maxDuration = 600,
  } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (levelIntervalRef.current) {
        clearInterval(levelIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // Start duration tracking
  const startDurationTracking = useCallback(() => {
    startTimeRef.current = Date.now() - (pausedDurationRef.current * 1000);
    
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
      
      // Auto-stop at max duration
      if (elapsed >= maxDuration) {
        stopRecording();
      }
    }, 100);
  }, [maxDuration]);

  // Stop duration tracking
  const stopDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    pausedDurationRef.current = duration;
  }, [duration]);

  // Start audio level tracking
  const startLevelTracking = useCallback(() => {
    levelIntervalRef.current = setInterval(async () => {
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // Normalize metering from dB (-160 to 0) to 0-1
            const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            setAudioLevels((prev: number[]) =>  {
              const newLevels = [...prev, normalized];
              // Keep last 50 levels
              return newLevels.slice(-50);
            });
          }
        } catch {
          // Ignore errors during level checking
        }
      }
    }, 100);
  }, []);

  // Stop audio level tracking
  const stopLevelTracking = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Clean up any existing recording first
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // Ignore cleanup errors
        }
        recordingRef.current = null;
      }
      stopDurationTracking();
      stopLevelTracking();

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Set audio mode (mobile-specific settings)
      if (!isWeb) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        100 // Update interval for metering
      );

      recordingRef.current = recording;
      setState('recording');
      setDuration(0);
      setTranscription('');
      setAudioLevels([]);
      pausedDurationRef.current = 0;
      
      startDurationTracking();
      startLevelTracking();
      
      safeHaptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Reset state on failure
      recordingRef.current = null;
      setState('idle');
      onError?.(error as Error);
    }
  }, [onError, startDurationTracking, startLevelTracking, stopDurationTracking, stopLevelTracking]);

  const pauseRecording = useCallback(async () => {
    if (recordingRef.current && state === 'recording') {
      try {
        await recordingRef.current.pauseAsync();
        setState('paused');
        stopDurationTracking();
        stopLevelTracking();
        safeHaptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Failed to pause recording:', error);
        onError?.(error as Error);
      }
    }
  }, [state, onError, stopDurationTracking, stopLevelTracking]);

  const resumeRecording = useCallback(async () => {
    if (recordingRef.current && state === 'paused') {
      try {
        await recordingRef.current.startAsync();
        setState('recording');
        startDurationTracking();
        startLevelTracking();
        safeHaptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Failed to resume recording:', error);
        onError?.(error as Error);
      }
    }
  }, [state, onError, startDurationTracking, startLevelTracking]);

  const stopRecording = useCallback(async (): Promise<JournalEntry | null> => {
    if (!recordingRef.current) return null;

    try {
      setState('processing');
      stopDurationTracking();
      stopLevelTracking();
      safeHaptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Stop and get URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode (mobile only)
      if (!isWeb) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }

      if (!uri) {
        throw new Error('Recording URI not available');
      }

      // Create journal entry
      const entry = await createJournalEntry({
        audioUri: uri,
        audioDuration: duration,
      });

      setCurrentEntry(entry);

      // Simulate transcription (in production, use Whisper API or Google Speech-to-Text)
      // For now, we'll use a placeholder that indicates processing
      const simulatedTranscription = await simulateTranscription(duration);
      setTranscription(simulatedTranscription);
      onTranscriptionUpdate?.(simulatedTranscription);

      // Analyze emotions locally
      const emotions = analyzeEmotionsLocally(simulatedTranscription);

      // Generate insights
      const insights = generateInsights(simulatedTranscription, emotions);

      // Update entry with transcription and emotions
      const updatedEntry = await updateJournalEntry(entry.id, {
        transcription: simulatedTranscription,
        emotions,
        insights,
        isProcessing: false,
      });

      setCurrentEntry(updatedEntry);
      setState('complete');
      
      if (updatedEntry) {
        onEntryComplete?.(updatedEntry);
      }

      return updatedEntry;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState('idle');
      onError?.(error as Error);
      return null;
    }
  }, [duration, onError, onTranscriptionUpdate, onEntryComplete, stopDurationTracking, stopLevelTracking]);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        stopDurationTracking();
        stopLevelTracking();
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch {
        // Ignore errors during cancel
      }
    }
    
    reset();
  }, [stopDurationTracking, stopLevelTracking]);

  const reset = useCallback(() => {
    setState('idle');
    setDuration(0);
    setTranscription('');
    setCurrentEntry(null);
    setAudioLevels([]);
    pausedDurationRef.current = 0;
  }, []);

  return {
    state,
    duration,
    transcription,
    currentEntry,
    isRecording: state === 'recording',
    isPaused: state === 'paused',
    isProcessing: state === 'processing',
    audioLevels,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}

// Simulate transcription (placeholder for actual Speech-to-Text)
async function simulateTranscription(durationSeconds: number): Promise<string> {
  // Quick processing - max 500ms
  await new Promise<void>(resolve => setTimeout(resolve, Math.min(durationSeconds * 20, 500)));
  
  // NOTE: In production, integrate Google Cloud Speech-to-Text or OpenAI Whisper
  // For now, return empty string - user can manually enter their thoughts
  return '';
}

// Generate insights from transcription
function generateInsights(text: string, emotions: { primary: string }[]): string[] {
  // If no text provided, return default insight
  if (!text || text.trim().length === 0) {
    return ['Add your thoughts above to receive personalized insights.'];
  }
  
  const insights: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Pattern-based insights
  if (lowerText.includes('grateful') || lowerText.includes('thankful')) {
    insights.push('You practiced gratitude - this is linked to improved well-being');
  }
  
  if (lowerText.includes('breathing') || lowerText.includes('meditation')) {
    insights.push('You mentioned using coping techniques - keep utilizing these tools');
  }
  
  if (lowerText.includes('support') || lowerText.includes('friend') || lowerText.includes('team')) {
    insights.push('Social connections appear in your reflection - nurture these relationships');
  }
  
  if (lowerText.includes('routine') || lowerText.includes('morning')) {
    insights.push('Routines are important to you - consistency supports emotional stability');
  }
  
  if (emotions.some(e => e.primary === 'anxious')) {
    insights.push('You expressed anxiety - consider what you can control vs what you cannot');
  }
  
  if (emotions.some(e => e.primary === 'happy') || emotions.some(e => e.primary === 'calm')) {
    insights.push('Positive emotions were present - take note of what contributed to this');
  }
  
  // Default insight if none matched
  if (insights.length === 0) {
    insights.push('Keep journaling regularly - self-reflection builds emotional awareness');
  }
  
  // Limit to 3 insights
  return insights.slice(0, 3);
}

export default useVoiceJournal;
