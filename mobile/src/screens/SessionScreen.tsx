/**
 * TrueReact - Session Screen
 * 
 * Main coaching session interface with real-time video/audio streaming,
 * emotion visualization, coaching feedback overlays, and barge-in interrupt capability.
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
import CoachingFeedbackOverlay from '../components/CoachingFeedbackOverlay';
import InterruptModal from '../components/InterruptModal';
import EmotionVisualizer, { EmotionState } from '../components/EmotionVisualizer';
import EmotionTrendGraph, { EmotionDataPoint } from '../components/EmotionTrendGraph';
const AnimatedView = Animated.View as unknown as React.ComponentType<any>;
const { width, height } = Dimensions.get('window');

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
  const [cameraPermission] = useCameraPermissions();
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
    isDemoMode,
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
        setSessionDuration((prev: number) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sessionState]);

  // Demo mode feedback
  useEffect(() => {
    let demoTimer: ReturnType<typeof setTimeout> | null = null;
    let demoInterval: ReturnType<typeof setInterval> | null = null;
    let emotionInterval: ReturnType<typeof setInterval> | null = null;

    // Demo emotions for variety
    const demoEmotions = ['happy', 'neutral', 'excited', 'calm', 'anxious', 'focused'];
    
    if (isDemoMode && sessionState === 'active') {
      // Initial feedback after 5 seconds
      demoTimer = setTimeout(() => {
        const randomFeedback = demoFeedback[Math.floor(Math.random() * demoFeedback.length)];
        handleCoachingFeedback({ ...randomFeedback, timestamp: Date.now() });
      }, 5000);

      // Recurring feedback every 10 seconds
      demoInterval = setInterval(() => {
        const randomFeedback = demoFeedback[Math.floor(Math.random() * demoFeedback.length)];
        handleCoachingFeedback({ ...randomFeedback, timestamp: Date.now() });
      }, 10000);

      // Simulate emotion updates every 3 seconds
      emotionInterval = setInterval(() => {
        const randomEmotion = demoEmotions[Math.floor(Math.random() * demoEmotions.length)];
        const intensity = 0.3 + Math.random() * 0.6; // 0.3 - 0.9
        const congruence = 0.5 + Math.random() * 0.5; // 0.5 - 1.0
        
        handleEmotionUpdate({
          emotion: {
            primary_emotion: randomEmotion,
            intensity: intensity,
            confidence: 0.7 + Math.random() * 0.25,
            congruence_score: congruence,
            masking_detected: Math.random() < 0.1, // 10% chance
          },
          trend: {
            trend: Math.random() > 0.5 ? 'increasing' : 'stable',
            dominant_emotion: randomEmotion,
            average_intensity: intensity,
          },
        });
      }, 3000);
    }

    return () => {
      if (demoTimer) clearTimeout(demoTimer);
      if (demoInterval) clearInterval(demoInterval);
      if (emotionInterval) clearInterval(emotionInterval);
    };
  }, [isDemoMode, sessionState]);

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

  // Demo mode feedback samples
  const demoFeedback: CoachingFeedback[] = [
    {
      category: 'expression',
      observation: 'Your eyebrows appear slightly raised',
      suggestion: 'Try relaxing your forehead to appear more at ease',
      urgency: 'low',
      timestamp: Date.now(),
    },
    {
      category: 'voice',
      observation: 'Your speech pace seems a bit fast',
      suggestion: 'Take a breath between sentences to slow down naturally',
      urgency: 'normal',
      timestamp: Date.now(),
    },
    {
      category: 'general',
      observation: 'Great eye contact!',
      suggestion: 'Keep maintaining this natural connection',
      urgency: 'low',
      timestamp: Date.now(),
    },
    {
      category: 'posture',
      observation: 'Shoulders appear tense',
      suggestion: 'Roll your shoulders back and relax',
      urgency: 'normal',
      timestamp: Date.now(),
    },
  ];

  const startDemoFeedback = () => {
    // Provide demo feedback every 8-12 seconds
    const provideDemoFeedback = () => {
      if (sessionState === 'active') {
        const randomFeedback = demoFeedback[Math.floor(Math.random() * demoFeedback.length)];
        handleCoachingFeedback({ ...randomFeedback, timestamp: Date.now() });
      }
    };

    // Initial feedback after 5 seconds
    setTimeout(provideDemoFeedback, 5000);
    
    // Recurring feedback
    const interval = setInterval(() => {
      if (sessionState === 'active') {
        provideDemoFeedback();
      }
    }, 10000);

    return () => clearInterval(interval);
  };

  const initializeSession = async () => {
    try {
      // Try to connect to backend (will enter demo mode if unavailable)
      await connect();
      
      // Start audio recording
      await startRecording();
      
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
    
    setEmotionHistory((prev: EmotionDataPoint[]) => {
      const updated = [...prev, dataPoint];
      // Keep last 30 data points for trend graph
      return updated.slice(-30);
    });
    
    // Haptic feedback for significant changes
    if (newEmotionState.maskingDetected) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (newEmotionState.congruenceScore < 0.6) {
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
    setFeedbackHistory((prev: CoachingFeedback[]) => [...prev, feedback]);

    // Haptic feedback based on urgency
    if (feedback.urgency === 'high') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate feedback in
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5000),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const submitInterrupt = async () => {
    if (!interruptQuestion.trim()) return;

    setIsProcessing(true);
    setInterruptResponse(null);

    if (isDemoMode) {
      // Simulate response in demo mode
      setTimeout(() => {
        const demoResponses: Record<string, string> = {
          'Did that sound sarcastic?': 'Based on your tone and expression, your delivery appeared sincere. Your eyebrows were relaxed and your voice had a warm quality.',
          'Was I speaking too fast?': 'Your pace was moderate - about 140 words per minute, which is comfortable for conversation. You could slow down slightly for emphasis on key points.',
          'Did my expression match my words?': 'Your facial expression aligned well with your message. I noticed genuine micro-expressions around your eyes that matched your verbal content.',
          'How\'s my eye contact?': 'Your eye contact has been steady and natural - you\'re looking at the camera about 70% of the time, which creates good connection without being intense.',
        };
        const response = demoResponses[interruptQuestion] || 
          'In demo mode, I can see you\'re practicing your social signals. Your expression appears engaged and your posture is open. Keep up the great work!';
        setInterruptResponse(response);
        setIsProcessing(false);
      }, 1500);
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
    
    // Save session to Firestore
    if (user && feedbackHistory.length > 0) {
      try {
        const sessionData = {
          odId: user.uid,
          startedAt: sessionStartTime,
          endedAt: new Date(),
          duration: sessionDuration,
          feedbackCount: feedbackHistory.length,
          feedback: feedbackHistory.map((f: CoachingFeedback) => ({
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

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
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
                {sessionState === 'active' ? (isDemoMode ? 'Demo' : 'Live') : 'Paused'}
              </Text>
            </View>
            {isDemoMode && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>Offline Mode</Text>
              </View>
            )}
            <Text style={styles.duration}>{formatDuration(sessionDuration)}</Text>
          </View>
          
          <TouchableOpacity style={styles.endButton} onPress={endSession}>
            <Ionicons name="close" size={24} color="#E07C7C" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Processing Indicator */}
        {isConnected && (
          <AnimatedView style={[styles.processingIndicator, { opacity: processingAnim }]}>
          <View style={styles.processingDot} />
          <Text style={styles.processingText}>Analyzing...</Text>
        </AnimatedView>
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
      </CameraView>

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
