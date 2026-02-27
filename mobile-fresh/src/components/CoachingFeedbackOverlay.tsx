/**
 * TrueReact - Coaching Feedback Overlay Component
 * 
 * Displays real-time coaching feedback overlays during sessions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type FeedbackCategory = 'expression' | 'voice' | 'posture' | 'general';
type FeedbackUrgency = 'low' | 'normal' | 'high';

type CoachingFeedback = {
  category: FeedbackCategory;
  observation: string;
  suggestion: string;
  urgency: FeedbackUrgency;
  timestamp: number;
};

type Props = {
  feedback: CoachingFeedback;
  animatedValue: Animated.Value;
};

const CATEGORY_CONFIG: Record<FeedbackCategory, { 
  icon: keyof typeof Ionicons.glyphMap; 
  color: string;
  label: string;
}> = {
  expression: { icon: 'happy-outline', color: '#e94560', label: 'Expression' },
  voice: { icon: 'mic-outline', color: '#60a5fa', label: 'Voice' },
  posture: { icon: 'body-outline', color: '#4ade80', label: 'Posture' },
  general: { icon: 'bulb-outline', color: '#fbbf24', label: 'Tip' },
};

const URGENCY_COLORS: Record<FeedbackUrgency, string[]> = {
  low: ['rgba(74, 222, 128, 0.9)', 'rgba(74, 222, 128, 0.7)'],
  normal: ['rgba(96, 165, 250, 0.9)', 'rgba(96, 165, 250, 0.7)'],
  high: ['rgba(233, 69, 96, 0.9)', 'rgba(233, 69, 96, 0.7)'],
};

export default function CoachingFeedbackOverlay({ feedback, animatedValue }: Props) {
  const config = CATEGORY_CONFIG[feedback.category];
  const urgencyColors = URGENCY_COLORS[feedback.urgency];

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(26, 26, 46, 0.95)', 'rgba(22, 33, 62, 0.95)']}
        style={styles.feedbackCard}
      >
        {/* Urgency Indicator */}
        <View style={[styles.urgencyBar, { backgroundColor: urgencyColors[0] }]} />
        
        {/* Category Badge */}
        <View style={styles.header}>
          <View style={[styles.categoryBadge, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon} size={16} color={config.color} />
            <Text style={[styles.categoryText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Observation */}
        {feedback.observation && (
          <View style={styles.observationContainer}>
            <Ionicons name="eye-outline" size={16} color="#8b8b8b" />
            <Text style={styles.observationText}>{feedback.observation}</Text>
          </View>
        )}

        {/* Suggestion */}
        <View style={styles.suggestionContainer}>
          <Ionicons name="arrow-forward-circle" size={20} color={config.color} />
          <Text style={styles.suggestionText}>{feedback.suggestion}</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['100%', '0%'],
                }),
                backgroundColor: config.color,
              },
            ]}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 16,
  },
  feedbackCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  urgencyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  observationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 4,
  },
  observationText: {
    fontSize: 14,
    color: '#8b8b8b',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  suggestionText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  progressContainer: {
    marginTop: 16,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});
