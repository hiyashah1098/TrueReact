import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export interface EmotionState {
  primaryEmotion: string;
  intensity: number;  // 0.0 to 1.0
  confidence: number;
  congruenceScore: number;
  maskingDetected: boolean;
  trend?: {
    trend: 'stable' | 'escalating' | 'de-escalating';
    dominantEmotion: string;
    averageIntensity: number;
  };
}

interface EmotionVisualizerProps {
  emotionState: EmotionState;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Emotion colors mapping - Neurodivergent-friendly, softer colors
// Using the gold/violet/teal palette with warm undertones
const EMOTION_COLORS: Record<string, { primary: string; secondary: string; }> = {
  neutral: { primary: '#9B7EC6', secondary: '#C4B0E0' },      // Soft violet
  happy: { primary: '#7BC67E', secondary: '#A8E6CF' },        // Soft green
  excited: { primary: '#F5A623', secondary: '#FFD166' },      // Gold (autism acceptance)
  calm: { primary: '#4ECDC4', secondary: '#7EDDD6' },         // Teal (mental health)
  sad: { primary: '#6B8DD6', secondary: '#9BB3E3' },          // Soft blue
  angry: { primary: '#E07C7C', secondary: '#F0A8A8' },        // Soft coral
  fearful: { primary: '#FFB347', secondary: '#FFCC80' },      // Warm amber
  surprised: { primary: '#C4B0E0', secondary: '#E4D8F4' },    // Light lavender
  disgusted: { primary: '#8B9A6B', secondary: '#B5C48E' },    // Muted sage
  anxious: { primary: '#FF9E7A', secondary: '#FFBFA0' },      // Soft peach
  stressed: { primary: '#D4920D', secondary: '#F5A623' },     // Deep gold
  confused: { primary: '#7A7290', secondary: '#A4A0B8' },     // Muted purple-gray
  focused: { primary: '#4ECDC4', secondary: '#7EDDD6' },      // Teal
};

export default function EmotionVisualizer({
  emotionState,
  showDetails = true,
  size = 'medium',
}: EmotionVisualizerProps) {
  const { colors, isDark } = useTheme();
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intensityAnim = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  
  const [displayIntensity, setDisplayIntensity] = useState(0);
  
  const emotionColors = EMOTION_COLORS[emotionState.primaryEmotion] || EMOTION_COLORS.neutral;
  
  // Size configurations
  const sizes = {
    small: { ring: 80, stroke: 4, fontSize: 12 },
    medium: { ring: 120, stroke: 6, fontSize: 16 },
    large: { ring: 180, stroke: 8, fontSize: 20 },
  };
  const config = sizes[size];
  
  // Pulse animation based on emotion intensity
  useEffect(() => {
    const pulseSpeed = 1500 - (emotionState.intensity * 500); // Faster when more intense
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1 + (emotionState.intensity * 0.15),
          duration: pulseSpeed / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulseSpeed / 2,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => pulseAnim.stopAnimation();
  }, [emotionState.intensity]);
  
  // Intensity ring animation
  useEffect(() => {
    Animated.timing(intensityAnim, {
      toValue: emotionState.intensity,
      duration: 800,
      useNativeDriver: false,
    }).start();
    
    // Animate display percentage
    const steps = 20;
    const stepDuration = 800 / steps;
    const startValue = displayIntensity;
    const endValue = Math.round(emotionState.intensity * 100);
    
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        setDisplayIntensity(
          Math.round(startValue + ((endValue - startValue) * (i / steps)))
        );
      }, stepDuration * i);
    }
  }, [emotionState.intensity]);
  
  // Wave animation for congruence visualization
  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  // Calculate ring progress
  const circumference = 2 * Math.PI * (config.ring / 2 - config.stroke);
  const progressOffset = intensityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });
  
  // Get trend indicator
  const getTrendIndicator = () => {
    if (!emotionState.trend) return null;
    
    const trendIcons = {
      escalating: '↑',
      'de-escalating': '↓',
      stable: '→',
    };
    
    const trendColors = {
      escalating: '#FF3B30',
      'de-escalating': '#34C759',
      stable: '#8E8E93',
    };
    
    return {
      icon: trendIcons[emotionState.trend.trend] || '→',
      color: trendColors[emotionState.trend.trend] || colors.textSecondary,
    };
  };
  
  const trend = getTrendIndicator();

  return (
    <View style={styles.container}>
      {/* Main emotion ring */}
      <Animated.View
        style={[
          styles.ringContainer,
          {
            width: config.ring,
            height: config.ring,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Background ring */}
        <View
          style={[
            styles.ringBackground,
            {
              width: config.ring,
              height: config.ring,
              borderRadius: config.ring / 2,
              borderWidth: config.stroke,
              borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
            },
          ]}
        />
        
        {/* Animated progress ring (using view-based approach for RN) */}
        <View
          style={[
            styles.progressRingOuter,
            {
              width: config.ring,
              height: config.ring,
              borderRadius: config.ring / 2,
            },
          ]}
        >
          {/* Progress indicator using conic gradient simulation */}
          <View
            style={[
              styles.progressFill,
              {
                width: config.ring - config.stroke * 2,
                height: config.ring - config.stroke * 2,
                borderRadius: (config.ring - config.stroke * 2) / 2,
                backgroundColor: emotionColors.secondary,
                opacity: 0.3,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.progressArc,
              {
                width: config.ring - config.stroke * 2,
                height: config.ring - config.stroke * 2,
                borderRadius: (config.ring - config.stroke * 2) / 2,
                borderWidth: config.stroke,
                borderColor: emotionColors.primary,
                opacity: intensityAnim,
              },
            ]}
          />
        </View>
        
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text
            style={[
              styles.emotionEmoji,
              { fontSize: config.fontSize * 1.5 },
            ]}
          >
            {getEmotionEmoji(emotionState.primaryEmotion)}
          </Text>
          <Text
            style={[
              styles.intensityText,
              { fontSize: config.fontSize, color: emotionColors.primary },
            ]}
          >
            {displayIntensity}%
          </Text>
        </View>
        
        {/* Masking indicator */}
        {emotionState.maskingDetected && (
          <View style={[styles.maskingBadge, { backgroundColor: '#FF9500' }]}>
            <Text style={styles.maskingText}>M</Text>
          </View>
        )}
      </Animated.View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          {/* Emotion label */}
          <Text style={[styles.emotionLabel, { color: colors.text }]}>
            {capitalizeFirst(emotionState.primaryEmotion)}
            {trend && (
              <Text style={{ color: trend.color }}> {trend.icon}</Text>
            )}
          </Text>
          
          {/* Congruence meter */}
          <View style={styles.congruenceContainer}>
            <Text style={[styles.congruenceLabel, { color: colors.textSecondary }]}>
              Face-Voice Alignment
            </Text>
            <View style={styles.congruenceMeter}>
              <View
                style={[
                  styles.congruenceBar,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              >
                <View
                  style={[
                    styles.congruenceFill,
                    {
                      width: `${emotionState.congruenceScore * 100}%`,
                      backgroundColor: getCongruenceColor(emotionState.congruenceScore),
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.congruenceValue,
                  { color: getCongruenceColor(emotionState.congruenceScore) },
                ]}
              >
                {Math.round(emotionState.congruenceScore * 100)}%
              </Text>
            </View>
          </View>
          
          {/* Confidence indicator */}
          <View style={styles.confidenceContainer}>
            <View
              style={[
                styles.confidenceDot,
                {
                  backgroundColor: emotionState.confidence > 0.7 ? '#34C759' :
                    emotionState.confidence > 0.4 ? '#FF9500' : '#FF3B30',
                },
              ]}
            />
            <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
              {emotionState.confidence > 0.7 ? 'High' :
                emotionState.confidence > 0.4 ? 'Medium' : 'Low'} confidence
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Helper functions
function getEmotionEmoji(emotion: string): string {
  const emojis: Record<string, string> = {
    neutral: '😐',
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    surprised: '😮',
    disgusted: '🤢',
    anxious: '😰',
    stressed: '😫',
    confused: '😕',
  };
  return emojis[emotion] || '😐';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCongruenceColor(score: number): string {
  if (score >= 0.8) return '#34C759'; // Green - well aligned
  if (score >= 0.6) return '#FFCC00'; // Yellow - minor mismatch
  if (score >= 0.4) return '#FF9500'; // Orange - noticeable mismatch
  return '#FF3B30'; // Red - significant incongruence
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringBackground: {
    position: 'absolute',
  },
  progressRingOuter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
  },
  progressArc: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionEmoji: {
    marginBottom: 4,
  },
  intensityText: {
    fontWeight: 'bold',
  },
  maskingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskingText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  emotionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  congruenceContainer: {
    width: width * 0.6,
    marginBottom: 12,
  },
  congruenceLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  congruenceMeter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  congruenceBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  congruenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  congruenceValue: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
  },
});
