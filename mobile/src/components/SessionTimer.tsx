/**
 * TrueReact - Session Timer Component
 * 
 * Visual timer display with break reminders and breathing exercise UI
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSessionTimer, TimerState, BreathingPhase } from '../hooks/useSessionTimer';

const { width } = Dimensions.get('window');

type SessionTimerProps = {
  onSessionComplete?: () => void;
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
  sessionDuration?: number; // minutes
  breakDuration?: number; // minutes
  compact?: boolean; // For inline display
};

export function SessionTimer({
  onSessionComplete,
  onBreakStart,
  onBreakEnd,
  sessionDuration = 15,
  breakDuration = 3,
  compact = false,
}: SessionTimerProps) {
  const {
    timerState,
    secondsRemaining,
    formattedTime,
    formattedTotalTime,
    breaksTaken,
    breathingPhase,
    breathingSeconds,
    progress,
    startSession,
    startBreak,
    startBreathingExercise,
    endBreathingExercise,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipBreak,
  } = useSessionTimer({
    sessionDuration,
    breakDuration,
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const breatheAnim = useRef(new Animated.Value(0.5)).current;

  // Pulse animation for active timer
  useEffect(() => {
    if (timerState === 'session') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timerState]);

  // Breathing animation
  useEffect(() => {
    if (timerState === 'breathing') {
      const targetValue = breathingPhase === 'inhale' || breathingPhase === 'hold' ? 1 : 0.5;
      const duration = breathingPhase === 'exhale' ? 8000 : 
                       breathingPhase === 'inhale' ? 4000 : 1000;
      
      Animated.timing(breatheAnim, {
        toValue: targetValue,
        duration,
        useNativeDriver: true,
      }).start();
    }
  }, [timerState, breathingPhase]);

  // Callbacks
  useEffect(() => {
    if (timerState === 'break') {
      onBreakStart?.();
    }
  }, [timerState]);

  const getTimerColor = () => {
    switch (timerState) {
      case 'session':
        return '#F5A623';
      case 'break':
        return '#4ECDC4';
      case 'breathing':
        return '#9B7EC6';
      default:
        return '#7A7290';
    }
  };

  const getStatusText = () => {
    switch (timerState) {
      case 'session':
        return 'Coaching Session';
      case 'break':
        return 'Taking a Break';
      case 'breathing':
        return 'Breathing Exercise';
      default:
        return 'Ready to Start';
    }
  };

  const getBreathingInstruction = () => {
    switch (breathingPhase) {
      case 'inhale':
        return 'Breathe in...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out slowly...';
      case 'rest':
        return 'Rest...';
      default:
        return '';
    }
  };

  // Compact display (for session screen)
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactTimer}>
          <Ionicons 
            name={timerState === 'break' ? 'cafe' : 'timer'} 
            size={16} 
            color={getTimerColor()} 
          />
          <Text style={[styles.compactTime, { color: getTimerColor() }]}>
            {formattedTime}
          </Text>
        </View>
        {timerState === 'session' && secondsRemaining <= 60 && (
          <Text style={styles.compactHint}>Break soon</Text>
        )}
      </View>
    );
  }

  // Full display
  return (
    <View style={styles.container}>
      {/* Timer Circle */}
      <Animated.View 
        style={[
          styles.timerCircle,
          { 
            transform: [{ scale: timerState === 'breathing' ? breatheAnim : pulseAnim }],
            borderColor: getTimerColor(),
          },
        ]}
      >
        <LinearGradient
          colors={[`${getTimerColor()}20`, `${getTimerColor()}10`]}
          style={styles.timerGradient}
        >
          {timerState === 'breathing' ? (
            <>
              <Text style={[styles.breathingInstruction, { color: getTimerColor() }]}>
                {getBreathingInstruction()}
              </Text>
              <Text style={styles.breathingCount}>{breathingSeconds}</Text>
            </>
          ) : (
            <>
              <Text style={styles.timerLabel}>{getStatusText()}</Text>
              <Text style={[styles.timerTime, { color: getTimerColor() }]}>
                {formattedTime}
              </Text>
              {timerState === 'session' && (
                <Text style={styles.totalTime}>
                  Total: {formattedTotalTime}
                </Text>
              )}
            </>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Progress bar */}
      {(timerState === 'session' || timerState === 'break') && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progress * 100}%`,
                  backgroundColor: getTimerColor(),
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {timerState === 'idle' && (
          <>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#F5A623' }]}
              onPress={startSession}
            >
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.buttonText}>Start Session</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={startBreathingExercise}
            >
              <MaterialCommunityIcons name="meditation" size={20} color="#9B7EC6" />
              <Text style={styles.secondaryButtonText}>Breathe First</Text>
            </TouchableOpacity>
          </>
        )}

        {timerState === 'session' && (
          <View style={styles.sessionControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={pauseTimer}
            >
              <Ionicons name="pause" size={24} color="#F5F0E8" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={startBreak}
            >
              <Ionicons name="cafe" size={24} color="#4ECDC4" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={resetTimer}
            >
              <Ionicons name="refresh" size={24} color="#E07C7C" />
            </TouchableOpacity>
          </View>
        )}

        {timerState === 'break' && (
          <View style={styles.breakControls}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={startBreathingExercise}
            >
              <MaterialCommunityIcons name="meditation" size={20} color="#9B7EC6" />
              <Text style={styles.secondaryButtonText}>Breathing Exercise</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#4ECDC4' }]}
              onPress={skipBreak}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.buttonText}>Resume Early</Text>
            </TouchableOpacity>
          </View>
        )}

        {timerState === 'breathing' && (
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={endBreathingExercise}
          >
            <Text style={styles.secondaryButtonText}>End Breathing</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{breaksTaken}</Text>
          <Text style={styles.statLabel}>Breaks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formattedTotalTime}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>
    </View>
  );
}

// Breathing Exercise Modal (standalone)
type BreathingModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function BreathingModal({ visible, onClose }: BreathingModalProps) {
  const {
    timerState,
    breathingPhase,
    breathingSeconds,
    startBreathingExercise,
    endBreathingExercise,
  } = useSessionTimer();

  const breatheScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible && timerState === 'idle') {
      startBreathingExercise();
    }
  }, [visible]);

  useEffect(() => {
    if (timerState === 'breathing') {
      const targetScale = breathingPhase === 'inhale' ? 1.2 : 
                          breathingPhase === 'hold' ? 1.2 : 0.6;
      const duration = breathingPhase === 'exhale' ? 8000 : 
                       breathingPhase === 'inhale' ? 4000 : 
                       breathingPhase === 'hold' ? 7000 : 1000;
      
      Animated.timing(breatheScale, {
        toValue: targetScale,
        duration,
        useNativeDriver: true,
      }).start();
    }
  }, [breathingPhase, timerState]);

  const getInstruction = () => {
    switch (breathingPhase) {
      case 'inhale': return 'Breathe In';
      case 'hold': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'rest': return 'Rest';
      default: return '';
    }
  };

  const handleClose = () => {
    endBreathingExercise();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['rgba(26, 22, 37, 0.98)', 'rgba(37, 33, 54, 0.98)']}
          style={styles.modalContent}
        >
          <Text style={styles.modalTitle}>4-7-8 Breathing</Text>
          <Text style={styles.modalSubtitle}>
            A calming technique to reduce anxiety
          </Text>

          <View style={styles.breathingContainer}>
            <Animated.View 
              style={[
                styles.breathingCircle,
                { transform: [{ scale: breatheScale }] }
              ]}
            >
              <LinearGradient
                colors={['#9B7EC6', '#7B68B0']}
                style={styles.breathingCircleInner}
              >
                <Text style={styles.breathingText}>{getInstruction()}</Text>
                <Text style={styles.breathingNumber}>{breathingSeconds}</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          <View style={styles.breathingGuide}>
            <Text style={styles.guideText}>
              Inhale 4s → Hold 7s → Exhale 8s
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 40, 69, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compactTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTime: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  compactHint: {
    fontSize: 11,
    color: '#4ECDC4',
    marginLeft: 8,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    overflow: 'hidden',
  },
  timerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: '#B8B0C8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  timerTime: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalTime: {
    fontSize: 12,
    color: '#7A7290',
    marginTop: 8,
  },
  breathingInstruction: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  breathingCount: {
    fontSize: 64,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  progressContainer: {
    width: '100%',
    marginTop: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controls: {
    marginTop: 32,
    alignItems: 'center',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(155, 126, 198, 0.15)',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#B8B0C8',
    fontWeight: '500',
  },
  sessionControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(45, 40, 69, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.2)',
  },
  breakControls: {
    alignItems: 'center',
    gap: 16,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 32,
    paddingHorizontal: 32,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F5F0E8',
  },
  statLabel: {
    fontSize: 12,
    color: '#7A7290',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    marginHorizontal: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: width - 48,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F5F0E8',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#B8B0C8',
    marginBottom: 32,
  },
  breathingContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  breathingCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  breathingCircleInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  breathingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  breathingGuide: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(155, 126, 198, 0.15)',
    borderRadius: 12,
    marginBottom: 24,
  },
  guideText: {
    fontSize: 12,
    color: '#B8B0C8',
  },
  closeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#9B7EC6',
    fontWeight: '600',
  },
});

export default SessionTimer;
