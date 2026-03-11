/**
 * TrueReact - Session Screen
 * 
 * Main coaching session interface with real-time video/audio streaming,
 * emotion visualization, coaching feedback overlays, and barge-in interrupt capability.
 * Supports both mobile and web platforms.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../App';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAuth } from '../context/AuthContext';
import { saveSession, CoachingFeedbackEntry } from '../services/firebase';
import { createSessionSummary, EmotionTimestamp, CoachingMoment } from '../services/sessionHistory';
import CoachingFeedbackOverlay from '../components/CoachingFeedbackOverlay';
import InterruptModal from '../components/InterruptModal';
import EmotionVisualizer, { EmotionState } from '../components/EmotionVisualizer';
import EmotionTrendGraph, { EmotionDataPoint } from '../components/EmotionTrendGraph';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

type SessionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Session'>;
};

type CoachingFeedback = {
  category: 'expression' | 'voice' | 'posture' | 'general';
  observation: string;
  suggestion: string;
  urgency: 'low' | 'normal' | 'high';
  timestamp: number;
};

type SessionState = 'connecting' | 'active' | 'paused' | 'safe_state' | 'ended';

export default function SessionScreen({ navigation }: SessionScreenProps) {
  const { user } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [sessionState, setSessionState] = useState<SessionState>('connecting');
  const [currentFeedback, setCurrentFeedback] = useState<CoachingFeedback | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<CoachingFeedback[]>([]);
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [interruptQuestion, setInterruptQuestion] = useState('');
  const [interruptResponse, setInterruptResponse] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const [safeStateTriggered, setSafeStateTriggered] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Emotion visualization state
  const [emotionState, setEmotionState] = useState<EmotionState>({
    primaryEmotion: 'neutral',
    intensity: 0.5,
    confidence: 0.5,
    congruenceScore: 1.0,
    maskingDetected: false,
  });
  const [emotionHistory, setEmotionHistory] = useState<EmotionDataPoint[]>([]);
  const [showEmotionPanel, setShowEmotionPanel] = useState(true);
  
  const cameraRef = useRef<CameraView>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const processingAnim = useRef(new Animated.Value(0)).current;
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WebSocket connection
  const { 
    isConnected, 
    error: wsError,
    sendMessage, 
    lastMessage,
    connect,
    disconnect 
  } = useWebSocket();

  // Audio recorder for voice analysis
  const { 
    isRecording, 
    startRecording, 
    stopRecording,
    audioData 
  } = useAudioRecorder();

  // Initialize session
  useEffect(() => {
    initializeSession();
    return () => {
      cleanupSession();
    };
  }, []);

  // Handle incoming messages from backend
  useEffect(() => {
    if (lastMessage) {
      handleBackendMessage(lastMessage);
    }
  }, [lastMessage]);

  // Session timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (sessionState === 'active') {
      timer = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sessionState]);

  // Send audio data when available
  useEffect(() => {
    if (audioData && isConnected) {
      sendMessage({
        type: 'audio_frame',
        audio_data: audioData,
        timestamp: Date.now(),
      });
    }
  }, [audioData]);

  // Processing animation
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(processingAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(processingAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      processingAnim.setValue(0);
    }
  }, [isProcessing]);

  const initializeSession = async () => {
    try {
      // Request permissions first (especially important for web)
      if (isWeb) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          stream.getTracks().forEach(track => track.stop());
        } catch (err: any) {
          console.error('Web permission error:', err);
          setPermissionError(err.name === 'NotAllowedError' 
            ? 'Camera/microphone access denied. Please enable in browser settings.' 
            : 'Unable to access camera/microphone.');
          setSessionState('ended');
          return;
        }
      }
      
      // Try to connect to backend (will enter demo mode if unavailable)
      await connect();
      
      // Start audio recording (non-blocking - session can continue without it)
      try {
        await startRecording();
      } catch (recordingError) {
        console.warn('Audio recording failed to start, continuing without audio:', recordingError);
      }
      
      // Start video frame capture
      startVideoCapture();
      
      setSessionState('active');
      
      // If in demo mode, start demo feedback
      // Note: isDemoMode will be true if backend connection failed
    } catch (error) {
      console.error('Failed to initialize session:', error);
      // Still allow session to start in demo mode
      setSessionState('active');
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
  };

  const cleanupSession = async () => {
    // Clear video capture interval
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    await stopRecording();
    disconnect();
    setSessionState('ended');
  };

  const startVideoCapture = () => {
    // Clear any existing interval
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
    }
    
    // Capture video frames at regular intervals
    const captureFrame = async () => {
      if (cameraRef.current && sessionState === 'active') {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.3,
            base64: true,
            skipProcessing: true,
          });
          
          if (photo?.base64 && isConnected) {
            sendMessage({
              type: 'video_frame',
              video_data: photo.base64,
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          // Silent fail for frame capture
        }
      }
    };

    // Capture every 500ms
    videoIntervalRef.current = setInterval(captureFrame, 500);
  };

  const handleBackendMessage = (message: any) => {
    switch (message.type) {
      case 'coaching_feedback':
        handleCoachingFeedback(message);
        break;
      case 'interrupt_response':
        handleInterruptResponse(message);
        break;
      case 'emotion_update':
        handleEmotionUpdate(message);
        break;
      case 'safe_state_activated':
        handleSafeState(message);
        break;
      case 'session_ended':
        handleSessionEnded(message);
        break;
    }
  };
  
  const handleEmotionUpdate = (message: any) => {
    // Update current emotion state
    const newEmotionState: EmotionState = {
      primaryEmotion: message.emotion?.primary_emotion || 'neutral',
      intensity: message.emotion?.intensity || 0.5,
      confidence: message.emotion?.confidence || 0.5,
      congruenceScore: message.congruenceScore || message.emotion?.congruence_score || 1.0,
      maskingDetected: message.maskingDetected || message.emotion?.masking_detected || false,
      trend: message.trend ? {
        trend: message.trend.trend || 'stable',
        dominantEmotion: message.trend.dominant_emotion || 'neutral',
        averageIntensity: message.trend.average_intensity || 0.5,
      } : undefined,
    };
    
    setEmotionState(newEmotionState);
    
    // Add to history for trend graph
    const dataPoint: EmotionDataPoint = {
      emotion: newEmotionState.primaryEmotion,
      intensity: newEmotionState.intensity,
      timestamp: Date.now(),
    };
    
    setEmotionHistory(prev => {
      const updated = [...prev, dataPoint];
      // Keep last 30 data points for trend graph
      return updated.slice(-30);
    });
    
    // Haptic feedback for significant changes (mobile only)
    if (!isWeb && newEmotionState.maskingDetected) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!isWeb && newEmotionState.congruenceScore < 0.6) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSafeState = (message: any) => {
    setSessionState('safe_state');
    setSafeStateTriggered(true);
    navigation.replace('SafeState', { resources: message.resources });
  };

  const handleSessionEnded = (message: any) => {
    setSessionState('ended');
  };

  const handleCoachingFeedback = (message: any) => {
    const feedback: CoachingFeedback = {
      category: message.category || 'general',
      observation: message.observation || '',
      suggestion: message.suggestion || '',
      urgency: message.urgency || 'normal',
      timestamp: Date.now(),
    };

    setCurrentFeedback(feedback);
    setFeedbackHistory(prev => [...prev, feedback]);

    // Haptic feedback based on urgency (mobile only)
    if (!isWeb) {
      if (feedback.urgency === 'high') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    // Animate feedback in
    // Note: useNativeDriver: false because CoachingFeedbackOverlay animates width
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.delay(5000),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setCurrentFeedback(null);
    });
  };

  const handleInterruptResponse = (message: any) => {
    setInterruptResponse(message.analysis);
    setIsProcessing(false);
  };

  const handleBargeIn = () => {
    setShowInterruptModal(true);
    if (!isWeb) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const submitInterrupt = async () => {
    if (!interruptQuestion.trim()) return;

    setIsProcessing(true);
    setInterruptResponse(null);

    if (!isConnected) {
      // Cannot submit without connection
      setInterruptResponse('Unable to process - please ensure you are connected to the backend server.');
      setIsProcessing(false);
    } else {
      sendMessage({
        type: 'interrupt',
        question: interruptQuestion,
        timestamp: Date.now(),
      });
    }
  };

  const togglePause = () => {
    if (sessionState === 'active') {
      setSessionState('paused');
      sendMessage({ type: 'pause' });
      stopRecording();
    } else if (sessionState === 'paused') {
      setSessionState('active');
      sendMessage({ type: 'resume' });
      startRecording();
    }
  };

  const endSession = async () => {
    sendMessage({ type: 'end' });
    cleanupSession();
    
    const endTime = new Date();
    
    // Save session to local storage for replay
    try {
      // Convert emotionHistory to EmotionTimestamp format
      const emotionTimeline: EmotionTimestamp[] = emotionHistory.map((e, index) => ({
        time: Math.floor((e.timestamp - sessionStartTime.getTime()) / 1000),
        emotion: e.emotion,
        intensity: e.intensity,
        confidence: 0.8, // Default confidence
      }));
      
      // Convert feedbackHistory to CoachingMoment format
      const coachingMoments: CoachingMoment[] = feedbackHistory.map(f => ({
        time: Math.floor((f.timestamp - sessionStartTime.getTime()) / 1000),
        type: f.category === 'general' ? 'suggestion' : 'intervention' as const,
        content: f.suggestion,
      }));
      
      await createSessionSummary({
        type: 'coaching',
        startTime: sessionStartTime,
        endTime: endTime,
        emotionTimeline,
        coachingMoments,
      });
      console.log('Session saved to local storage');
    } catch (error) {
      console.error('Failed to save session to local storage:', error);
    }
    
    // Save session to Firestore
    if (user && feedbackHistory.length > 0) {
      try {
        const sessionData = {
          odId: user.uid,
          startedAt: sessionStartTime,
          endedAt: endTime,
          duration: sessionDuration,
          feedbackCount: feedbackHistory.length,
          feedback: feedbackHistory.map(f => ({
            timestamp: new Date(f.timestamp),
            category: f.category,
            observation: f.observation,
            suggestion: f.suggestion,
            urgency: f.urgency,
          })) as CoachingFeedbackEntry[],
          calibrationMetrics: null,
          safeStateTriggered,
        };
        await saveSession(user.uid, sessionData);
        console.log('Session saved to Firestore');
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
    
    navigation.goBack();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Permission error state for web
  if (permissionError) {
    return (
      <LinearGradient colors={['#1A1625', '#252136']} style={styles.container}>
        <View style={styles.permissionErrorContainer}>
          <Ionicons name="warning-outline" size={64} color="#E94560" />
          <Text style={styles.permissionErrorTitle}>Permission Error</Text>
          <Text style={styles.permissionErrorText}>{permissionError}</Text>
          {isWeb && (
            <Text style={[styles.permissionErrorText, { marginTop: 12, fontSize: 13 }]}>
              Click the camera icon in your browser's address bar to manage permissions.
            </Text>
          )}
          <TouchableOpacity 
            style={styles.permissionRetryButton} 
            onPress={() => {
              setPermissionError(null);
              initializeSession();
            }}
          >
            <Text style={styles.permissionRetryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.permissionRetryButton, { backgroundColor: '#4A5568', marginTop: 12 }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.permissionRetryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View - no children to avoid deprecation warning */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onCameraReady={handleCameraReady}
      />

      {/* All overlays positioned absolutely on top of camera */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Loading overlay while camera initializes */}
        {!cameraReady && (
          <View style={styles.cameraLoadingOverlay}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={{ color: '#fff', marginTop: 12 }}>Starting camera...</Text>
          </View>
        )}
        {/* Top Bar */}
        <LinearGradient
          colors={['rgba(26, 26, 46, 0.8)', 'transparent']}
          style={styles.topBar}
        >
          <View style={styles.sessionInfo}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: sessionState === 'active' ? '#4ade80' : '#fbbf24' }
              ]} />
              <Text style={styles.statusText}>
                {sessionState === 'active' ? 'Live' : 'Paused'}
              </Text>
            </View>
            <Text style={styles.duration}>{formatDuration(sessionDuration)}</Text>
          </View>
          
          <TouchableOpacity style={styles.endButton} onPress={endSession}>
            <Ionicons name="close" size={24} color="#E07C7C" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Processing Indicator */}
        {isConnected && (
          <Animated.View 
            style={[
              styles.processingIndicator,
              { opacity: processingAnim }
            ]}
          >
            <View style={styles.processingDot} />
            <Text style={styles.processingText}>Analyzing...</Text>
          </Animated.View>
        )}

        {/* Emotion Visualizer Overlay */}
        {showEmotionPanel && sessionState === 'active' && (
          <TouchableOpacity 
            style={styles.emotionOverlay}
            onPress={() => setShowEmotionPanel(!showEmotionPanel)}
            activeOpacity={0.9}
          >
            <EmotionVisualizer 
              emotionState={emotionState}
              showDetails={true}
              size="medium"
            />
          </TouchableOpacity>
        )}

        {/* Coaching Feedback Overlay */}
        {currentFeedback && (
          <CoachingFeedbackOverlay
            feedback={currentFeedback}
            animatedValue={feedbackAnim}
          />
        )}

        {/* Bottom Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(26, 22, 37, 0.95)']}
          style={styles.bottomBar}
        >
          {/* Barge-in Button */}
          <TouchableOpacity
            style={styles.bargeInButton}
            onPress={handleBargeIn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#9B7EC6', '#7B68B0']}
              style={styles.bargeInGradient}
            >
              <Ionicons name="hand-left" size={24} color="#fff" />
              <Text style={styles.bargeInText}>Wait, stop!</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Control Buttons */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={togglePause}>
              <Ionicons 
                name={sessionState === 'active' ? 'pause' : 'play'} 
                size={28} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setShowInterruptModal(true)}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Feedback History Peek */}
          {feedbackHistory.length > 0 && (
            <TouchableOpacity style={styles.historyPeek}>
              <Text style={styles.historyPeekText}>
                {feedbackHistory.length} coaching moments
              </Text>
              <Ionicons name="chevron-up" size={16} color="#8b8b8b" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Interrupt Modal */}
      <InterruptModal
        visible={showInterruptModal}
        onClose={() => {
          setShowInterruptModal(false);
          setInterruptQuestion('');
          setInterruptResponse(null);
        }}
        question={interruptQuestion}
        onQuestionChange={setInterruptQuestion}
        onSubmit={submitInterrupt}
        response={interruptResponse}
        isProcessing={isProcessing}
      />
    </View>
  );
}

// Neurodivergent-friendly colors
const COLORS = {
  background: '#1A1625',
  surface: '#252136',
  gold: '#F5A623',
  goldLight: '#FFD166',
  violet: '#9B7EC6',
  teal: '#4ECDC4',
  text: '#F5F0E8',
  textSecondary: '#B8B0C8',
  error: '#E07C7C',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 22, 37, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  permissionErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionErrorTitle: {
    color: '#F5F0E8',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionErrorText: {
    color: '#B8B0C8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionRetryButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionRetryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 60,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  demoBadge: {
    backgroundColor: 'rgba(245, 166, 35, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  demoBadgeText: {
    color: '#F5A623',
    fontSize: 10,
    fontWeight: '600',
  },
  duration: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  endButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 124, 124, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5A623',
    marginRight: 8,
  },
  processingText: {
    color: '#fff',
    fontSize: 12,
  },
  emotionOverlay: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: 'rgba(26, 22, 37, 0.75)',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.3)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 48,
  },
  bargeInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  bargeInGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  bargeInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  historyPeek: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPeekText: {
    color: '#B8B0C8',
    fontSize: 14,
    marginRight: 4,
  },
});
