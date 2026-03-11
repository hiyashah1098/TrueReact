import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export interface EmotionDataPoint {
  emotion: string;
  intensity: number;
  timestamp: number;
}

interface EmotionTrendGraphProps {
  data: EmotionDataPoint[];
  height?: number;
  showLabels?: boolean;
  title?: string;
}

// Emotion colors
const EMOTION_COLORS: Record<string, string> = {
  neutral: '#8E8E93',
  happy: '#34C759',
  sad: '#5856D6',
  angry: '#FF3B30',
  fearful: '#FF9500',
  surprised: '#AF52DE',
  disgusted: '#8B4513',
  anxious: '#FF6B6B',
  stressed: '#FF4757',
  confused: '#747D8C',
};

export default function EmotionTrendGraph({
  data,
  height = 150,
  showLabels = true,
  title = 'Emotion Trend',
}: EmotionTrendGraphProps) {
  const { colors, isDark } = useTheme();
  const animatedValues = useRef<Animated.Value[]>([]);
  
  // Initialize animated values
  useEffect(() => {
    animatedValues.current = data.map(() => new Animated.Value(0));
    
    // Animate bars in sequence
    const animations = animatedValues.current.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    );
    
    Animated.parallel(animations).start();
  }, [data]);
  
  // Calculate graph dimensions
  const graphWidth = width - 64;
  const barWidth = Math.min(30, (graphWidth - 16) / Math.max(data.length, 1));
  const barSpacing = 4;
  
  // Format time labels
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { minute: '2-digit', second: '2-digit' });
  };

  if (data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={[styles.emptyState, { height }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Collecting emotion data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
      {showLabels && (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      )}
      
      <View style={[styles.graphContainer, { height }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={[styles.yLabel, { color: colors.textSecondary }]}>High</Text>
          <Text style={[styles.yLabel, { color: colors.textSecondary }]}>Med</Text>
          <Text style={[styles.yLabel, { color: colors.textSecondary }]}>Low</Text>
        </View>
        
        {/* Graph area */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.barsContainer}>
            {/* Grid lines */}
            <View style={[styles.gridLine, { top: 0, borderColor: colors.textSecondary }]} />
            <View style={[styles.gridLine, { top: height / 3, borderColor: colors.textSecondary }]} />
            <View style={[styles.gridLine, { top: (2 * height) / 3, borderColor: colors.textSecondary }]} />
            
            {/* Bars */}
            {data.map((point, index) => {
              const barHeight = point.intensity * (height - 30);
              const color = EMOTION_COLORS[point.emotion] || EMOTION_COLORS.neutral;
              
              const animatedStyle = {
                transform: [
                  {
                    scaleY: animatedValues.current[index] || new Animated.Value(1),
                  },
                ],
              };
              
              return (
                <React.Fragment key={`${point.timestamp}-${index}`}>
                  <View
                    style={[
                      styles.barWrapper,
                      { width: barWidth + barSpacing },
                    ]}
                  >
                    <View style={[styles.barBackground, { height: height - 30, backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                      <Animated.View
                        style={[
                          styles.bar,
                          {
                            height: barHeight,
                            backgroundColor: color,
                            width: barWidth,
                          },
                          animatedStyle,
                        ]}
                      />
                    </View>
                    
                    {/* Emotion emoji indicator */}
                    <Text style={styles.barEmoji}>
                      {getEmotionEmoji(point.emotion)}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        {getUniqueEmotions(data).map((emotion) => (
          <React.Fragment key={emotion}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                {capitalizeFirst(emotion)}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      
      {/* Summary stats */}
      <View style={styles.statsContainer}>
        <StatItem
          label="Avg Intensity"
          value={`${Math.round(getAverageIntensity(data) * 100)}%`}
          color={colors}
        />
        <StatItem
          label="Dominant"
          value={capitalizeFirst(getDominantEmotion(data))}
          color={colors}
        />
        <StatItem
          label="Trend"
          value={getTrendLabel(data)}
          color={colors}
        />
      </View>
    </View>
  );
}

// Helper components
function StatItem({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: string; 
  color: any;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: color.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color.text }]}>{value}</Text>
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

function getUniqueEmotions(data: EmotionDataPoint[]): string[] {
  return [...new Set(data.map(d => d.emotion))].slice(0, 4); // Max 4 for legend
}

function getAverageIntensity(data: EmotionDataPoint[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d.intensity, 0) / data.length;
}

function getDominantEmotion(data: EmotionDataPoint[]): string {
  if (data.length === 0) return 'neutral';
  
  const counts: Record<string, number> = {};
  data.forEach(d => {
    counts[d.emotion] = (counts[d.emotion] || 0) + 1;
  });
  
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
}

function getTrendLabel(data: EmotionDataPoint[]): string {
  if (data.length < 3) return 'Analyzing...';
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const firstAvg = getAverageIntensity(firstHalf);
  const secondAvg = getAverageIntensity(secondHalf);
  
  if (secondAvg > firstAvg + 0.1) return '↑ Escalating';
  if (secondAvg < firstAvg - 0.1) return '↓ Calming';
  return '→ Stable';
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  graphContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 36,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yLabel: {
    fontSize: 10,
  },
  scrollContent: {
    paddingRight: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    paddingBottom: 20,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderWidth: 0.5,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barBackground: {
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 4,
  },
  barEmoji: {
    fontSize: 10,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
