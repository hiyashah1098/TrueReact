/**
 * TrueReact - Daily Affirmation Card
 * 
 * Displays the daily personalized affirmation with
 * dismiss and refresh functionality.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { 
  getDailyAffirmation, 
  dismissDailyAffirmation, 
  getRandomAffirmation,
  DailyAffirmationData,
  Affirmation,
} from '../services/affirmations';

type AffirmationCardProps = {
  recentEmotions?: string[];
  onDismiss?: () => void;
  compact?: boolean;
};

export function AffirmationCard({ 
  recentEmotions, 
  onDismiss,
  compact = false,
}: AffirmationCardProps) {
  const [affirmationData, setAffirmationData] = useState<DailyAffirmationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRefreshHint, setShowRefreshHint] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  useEffect(() => {
    loadAffirmation();
  }, []);

  const loadAffirmation = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyAffirmation(recentEmotions);
      setAffirmationData(data);
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to load affirmation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await dismissDailyAffirmation();
      onDismiss?.();
    });
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Quick fade out
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(async () => {
      // Get a new random affirmation
      const newAffirmation = getRandomAffirmation();
      setAffirmationData(prev => prev ? {
        ...prev,
        affirmation: newAffirmation,
      } : null);
      
      // Fade back in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    
    setShowRefreshHint(true);
    setTimeout(() => setShowRefreshHint(false), 3000);
  };

  if (isLoading || !affirmationData || affirmationData.dismissed) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      confidence: '#F5A623',
      calm: '#4ECDC4',
      connection: '#9B7EC6',
      self_compassion: '#FFD166',
      expression: '#7BC67E',
      resilience: '#6B8DD6',
      authenticity: '#C4B0E0',
      general: '#B8B0C8',
    };
    return colors[category] || '#F5A623';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
      confidence: 'shield-star',
      calm: 'meditation',
      connection: 'heart-multiple',
      self_compassion: 'hand-heart',
      expression: 'emoticon-happy',
      resilience: 'weight-lifter',
      authenticity: 'star-face',
      general: 'lightbulb',
    };
    return icons[category] || 'lightbulb';
  };

  const { affirmation } = affirmationData;
  const categoryColor = getCategoryColor(affirmation.category);

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <MaterialCommunityIcons 
          name="format-quote-open" 
          size={16} 
          color={categoryColor} 
        />
        <Text style={styles.compactText} numberOfLines={2}>
          {affirmation.text}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[`${categoryColor}20`, `${categoryColor}10`, 'rgba(45, 40, 69, 0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons 
              name={getCategoryIcon(affirmation.category)} 
              size={16} 
              color={categoryColor} 
            />
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              Daily Affirmation
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#7A7290" />
          </TouchableOpacity>
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <MaterialCommunityIcons 
            name="format-quote-open" 
            size={24} 
            color={categoryColor}
            style={styles.quoteIcon}
          />
          <Text style={styles.affirmationText}>
            {affirmation.text}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={16} color="#B8B0C8" />
            <Text style={styles.refreshText}>
              {showRefreshHint ? 'New affirmation!' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.15)',
  },
  gradient: {
    padding: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    color: '#F5F0E8',
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: 4,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quoteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  affirmationText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
    color: '#F5F0E8',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(155, 126, 198, 0.1)',
    borderRadius: 12,
  },
  refreshText: {
    fontSize: 12,
    color: '#B8B0C8',
  },
});

export default AffirmationCard;
