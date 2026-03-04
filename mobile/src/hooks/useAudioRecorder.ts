/**
 * TrueReact - Audio Recorder Hook
 * 
 * Custom hook for recording and streaming audio for voice analysis.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

type UseAudioRecorderReturn = {
  isRecording: boolean;
  audioData: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
};

// Audio recording configuration optimized for voice analysis
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

// Interval for capturing audio chunks (ms)
const CHUNK_INTERVAL = 1000;

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio session
  useEffect(() => {
    setupAudioSession();
    return () => {
      cleanup();
    };
  }, []);

  const setupAudioSession = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.error('Failed to setup audio session:', e);
      setError('Failed to initialize audio');
    }
  };

  const cleanup = () => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission not granted');
        return;
      }

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);

      // Start capturing chunks for real-time streaming
      startChunkCapture();

      console.log('🎙️ Recording started');
    } catch (e) {
      console.error('Failed to start recording:', e);
      setError('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      cleanup();
      
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);
      setAudioData(null);

      console.log('⏹️ Recording stopped');
    } catch (e) {
      console.error('Failed to stop recording:', e);
      setError('Failed to stop recording');
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.pauseAsync();
      cleanup();
      console.log('⏸️ Recording paused');
    } catch (e) {
      console.error('Failed to pause recording:', e);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.startAsync();
      startChunkCapture();
      console.log('▶️ Recording resumed');
    } catch (e) {
      console.error('Failed to resume recording:', e);
    }
  }, []);

  const startChunkCapture = () => {
    // Clear any existing interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
    }

    // Capture audio chunks at regular intervals
    chunkIntervalRef.current = setInterval(async () => {
      if (!recordingRef.current) return;

      try {
        const status = await recordingRef.current.getStatusAsync();
        
        if (status.isRecording) {
          // Get the current recording URI
          const uri = recordingRef.current.getURI();
          
          if (uri) {
            // Read the audio file as base64
            // In production, this would be optimized to stream chunks
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            });
            
            setAudioData(base64);
          }

          // Also capture metering data for visual feedback
          if (status.metering !== undefined) {
            // Metering is in dB, typically -160 to 0
            const normalizedLevel = (status.metering + 160) / 160;
            // Could emit this for visual feedback
          }
        }
      } catch (e) {
        // Silent fail for chunk capture errors
      }
    }, CHUNK_INTERVAL);
  };

  return {
    isRecording,
    audioData,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}

export default useAudioRecorder;
