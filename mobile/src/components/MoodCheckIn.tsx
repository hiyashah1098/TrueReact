/**
 * TrueReact - Quick Mood Check-in Component
 * 
 * A 5-second pre-session mood rating modal for tracking
 * emotional state before coaching sessions.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const MOOD_HISTORY_KEY = '@truereact_mood_history';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type MoodEntry = {
  level: MoodLevel;
  timestamp: string;
  context: 'pre_session' | 'post_session' | 'check_in';
  note?: string;
};

export type MoodOption = {
  level: MoodLevel;
  emoji: string;
  label: string;
  color: string;
  description: string;
};

const MOOD_OPTIONS: MoodOption[] = [
  {
    level: 1,
    emoji: '😔',
    label: 'Low',
    color: '#7B8CDE',
    description: 'Struggling today',
  },
  {
    level: 2,
    emoji: '😕',
    label: 'Meh',
    color: '#9B7EC6',
    description: 'Not my best',
  },
  {
    level: 3,
    emoji: '😐',
    label: 'Okay',
    color: '#B8B0C8',
    description: 'Neutral',
  },
  {
    level: 4,
    emoji: '🙂',
    label: 'Good',
    color: '#7BC67E',
    description: 'Feeling positive',
  },
  {
    level: 5,
    emoji: '😊',
    label: 'Great',
    color: '#F5A623',
    description: 'Feeling great!',
  },
];

type MoodCheckInProps = {
  visible: boolean;
  onComplete: (mood: MoodEntry) => void;
  onSkip: () => void;
  context?: 'pre_session' | 'post_session' | 'check_in';
  showSkip?: boolean;
};

export function MoodCheckIn({
  visible,
  onComplete,
  onSkip,
  context = 'pre_session',
  showSkip = true,
}: MoodCheckInProps) {
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnims] = useState(
    MOOD_OPTIONS.map(() => new Animated.Value(1))
  );

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
      setSelectedMood(null);
    }
  }, [visible]);

  const handleMoodSelect = async (mood: MoodOption, index: number) => {
    setSelectedMood(mood.level);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Create mood entry
    const entry: MoodEntry = {
      level: mood.level,
      timestamp: new Date().toISOString(),
      context,
    };

    // Save to history
    await saveMoodEntry(entry);

    // Delay slightly for visual feedback
    setTimeout(() => {
      onComplete(entry);
    }, 400);
  };

  const getContextTitle = () => {
    switch (context) {
      case 'pre_session':
        return 'Before we begin...';
      case 'post_session':
        return 'How are you feeling now?';
      case 'check_in':
        return 'Quick check-in';
      default:
        return 'How are you feeling?';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['rgba(26, 22, 37, 0.95)', 'rgba(37, 33, 54, 0.98)']}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons 
              name="heart-pulse" 
              size={32} 
              color="#F5A623" 
            />
            <Text style={styles.title}>{getContextTitle()}</Text>
            <Text style={styles.subtitle}>
              Tap how you're feeling right now
            </Text>
          </View>

          {/* Mood Options */}
          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map((mood, index) => (
              <Animated.View
                key={mood.level}
                style={[
                  styles.moodOptionWrapper,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.moodOption,
                    selectedMood === mood.level && styles.moodOptionSelected,
                    selectedMood === mood.level && { borderColor: mood.color },
                  ]}
                  onPress={() => handleMoodSelect(mood, index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text 
                    style={[
                      styles.moodLabel,
                      selectedMood === mood.level && { color: mood.color },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* Selected mood description */}
          {selectedMood && (
            <Animated.View style={styles.selectedInfo}>
              <Text style={styles.selectedDescription}>
                {MOOD_OPTIONS.find(m => m.level === selectedMood)?.description}
              </Text>
            </Animated.View>
          )}

          {/* Skip button */}
          {showSkip && !selectedMood && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}

          {/* Privacy note */}
          <Text style={styles.privacyNote}>
            <Ionicons name="lock-closed" size={12} color="#7A7290" />
            {' '}Your mood data stays on your device
          </Text>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

/**
 * Save mood entry to history
 */
async function saveMoodEntry(entry: MoodEntry): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(MOOD_HISTORY_KEY);
    const history: MoodEntry[] = stored ? JSON.parse(stored) : [];
    
    history.push(entry);
    
    // Keep last 90 days of mood data
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const filtered = history.filter(
      h => new Date(h.timestamp) > ninetyDaysAgo
    );
    
    await AsyncStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save mood entry:', error);
  }
}

/**
 * Get mood history
 */
export async function getMoodHistory(
  days: number = 30
): Promise<MoodEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(MOOD_HISTORY_KEY);
    if (!stored) return [];
    
    const history: MoodEntry[] = JSON.parse(stored);
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return history.filter(h => new Date(h.timestamp) > cutoff);
  } catch (error) {
    console.error('Failed to get mood history:', error);
    return [];
  }
}

/**
 * Get average mood for a time period
 */
export async function getAverageMood(days: number = 7): Promise<number | null> {
  const history = await getMoodHistory(days);
  
  if (history.length === 0) return null;
  
  const sum = history.reduce((acc, entry) => acc + entry.level, 0);
  return sum / history.length;
}

/**
 * Get mood trend (improving, stable, declining)
 */
export async function getMoodTrend(): Promise<'improving' | 'stable' | 'declining' | null> {
  const recentWeek = await getMoodHistory(7);
  const previousWeek = await getMoodHistory(14);
  
  if (recentWeek.length < 3 || previousWeek.length < 6) {
    return null; // Not enough data
  }
  
  const recentAvg = recentWeek.reduce((acc, e) => acc + e.level, 0) / recentWeek.length;
  
  // Previous week only (days 7-14)
  const prevWeekOnly = previousWeek.filter(e => {
    const date = new Date(e.timestamp);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return date < sevenDaysAgo;
  });
  
  if (prevWeekOnly.length === 0) return 'stable';
  
  const prevAvg = prevWeekOnly.reduce((acc, e) => acc + e.level, 0) / prevWeekOnly.length;
  
  const diff = recentAvg - prevAvg;
  
  if (diff > 0.3) return 'improving';
  if (diff < -0.3) return 'declining';
  return 'stable';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: width - 48,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.2)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F5F0E8',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#B8B0C8',
    textAlign: 'center',
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  moodOptionWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  moodOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    minWidth: 54,
  },
  moodOptionSelected: {
    backgroundColor: 'rgba(45, 40, 69, 0.9)',
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    color: '#B8B0C8',
    fontWeight: '500',
  },
  selectedInfo: {
    marginBottom: 16,
  },
  selectedDescription: {
    fontSize: 14,
    color: '#F5A623',
    fontStyle: 'italic',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    color: '#7A7290',
  },
  privacyNote: {
    fontSize: 11,
    color: '#7A7290',
    marginTop: 16,
  },
});

export default MoodCheckIn;
