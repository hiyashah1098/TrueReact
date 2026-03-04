/**
 * TrueReact - Session Screen
 * 
 * Main coaching session interface with real-time video/audio streaming,
 * coaching feedback overlays, and barge-in interrupt capability.
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
import CoachingFeedbackOverlay from '../components/CoachingFeedbackOverlay';
import InterruptModal from '../components/InterruptModal';

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
  const [cameraPermission] = useCameraPermissions();
  const [sessionState, setSessionState] = useState<SessionState>('connecting');
  const [currentFeedback, setCurrentFeedback] = useState<CoachingFeedback | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<CoachingFeedback[]>([]);
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [interruptQuestion, setInterruptQuestion] = useState('');
  const [interruptResponse, setInterruptResponse] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const processingAnim = useRef(new Animated.Value(0)).current;

  // WebSocket connection
  const { 
    isConnected, 
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
      // Connect to backend
      await connect();
      
      // Start audio recording
      await startRecording();
      
      // Start video frame capture
      startVideoCapture();
      
      setSessionState('active');
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const cleanupSession = async () => {
    await stopRecording();
    disconnect();
    setSessionState('ended');
  };

  const startVideoCapture = () => {
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
    const frameInterval = setInterval(captureFrame, 500);
    
    return () => clearInterval(frameInterval);
  };

  const handleBackendMessage = (message: any) => {
    switch (message.type) {
      case 'coaching_feedback':
        handleCoachingFeedback(message);
        break;
      case 'interrupt_response':
        handleInterruptResponse(message);
        break;
      case 'safe_state_activated':
        handleSafeState(message);
        break;
      case 'session_ended':
        handleSessionEnded(message);
        break;
    }
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

  const handleSafeState = (message: any) => {
    setSessionState('safe_state');
    navigation.replace('SafeState', { resources: message.resources });
  };

  const handleSessionEnded = (message: any) => {
    setSessionState('ended');
    // Navigate to summary
  };

  const handleBargeIn = () => {
    setShowInterruptModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const submitInterrupt = async () => {
    if (!interruptQuestion.trim()) return;

    setIsProcessing(true);
    setInterruptResponse(null);

    sendMessage({
      type: 'interrupt',
      question: interruptQuestion,
      timestamp: Date.now(),
    });
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

  const endSession = () => {
    sendMessage({ type: 'end' });
    cleanupSession();
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
                {sessionState === 'active' ? 'Live' : 'Paused'}
              </Text>
            </View>
            <Text style={styles.duration}>{formatDuration(sessionDuration)}</Text>
          </View>
          
          <TouchableOpacity style={styles.endButton} onPress={endSession}>
            <Ionicons name="close" size={24} color="#e94560" />
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

        {/* Coaching Feedback Overlay */}
        {currentFeedback && (
          <CoachingFeedbackOverlay
            feedback={currentFeedback}
            animatedValue={feedbackAnim}
          />
        )}

        {/* Bottom Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(26, 26, 46, 0.9)']}
          style={styles.bottomBar}
        >
          {/* Barge-in Button */}
          <TouchableOpacity
            style={styles.bargeInButton}
            onPress={handleBargeIn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e94560', '#c23a51']}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
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
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
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
    backgroundColor: '#e94560',
    marginRight: 8,
  },
  processingText: {
    color: '#fff',
    fontSize: 12,
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
    color: '#8b8b8b',
    fontSize: 14,
    marginRight: 4,
  },
});
