/**
 * TrueReact - Meditation Screen
 * 
 * Browse and play guided meditations with breathing visuals.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  MEDITATIONS,
  Meditation,
  MeditationCategory,
  MeditationStep,
  getMeditationStats,
  getMeditationHistory,
  getFavoriteMeditations,
  toggleMeditationFavorite,
  saveMeditationSession,
  getRecommendedMeditation,
  MeditationSession,
} from '../services/meditation';
import { recordActivity } from '../services/gamification';

const { width, height } = Dimensions.get('window');

type ViewMode = 'browse' | 'player';

const CATEGORIES: { id: MeditationCategory | 'all' | 'favorites'; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'view-grid' },
  { id: 'favorites', label: 'Favorites', icon: 'heart' },
  { id: 'quick', label: 'Quick', icon: 'timer-sand' },
  { id: 'anxiety', label: 'Anxiety', icon: 'heart-outline' },
  { id: 'calm', label: 'Calm', icon: 'water' },
  { id: 'stress', label: 'Stress', icon: 'water-check' },
  { id: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
  { id: 'morning', label: 'Morning', icon: 'weather-sunny' },
  { id: 'focus', label: 'Focus', icon: 'target' },
  { id: 'gratitude', label: 'Gratitude', icon: 'gift-outline' },
  { id: 'self-compassion', label: 'Self-Love', icon: 'hand-heart' },
];

export function MeditationScreen({ navigation }: { navigation: any }) {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedCategory, setSelectedCategory] = useState<MeditationCategory | 'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null);
  const [stats, setStats] = useState<{
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    favoriteCategory: string | null;
  } | null>(null);
  const [recommended, setRecommended] = useState<Meditation | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'holdAfter'>('inhale');
  const [breathCount, setBreathCount] = useState(0);

  const breathAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    const [favs, statsData] = await Promise.all([
      getFavoriteMeditations(),
      getMeditationStats(),
    ]);
    setFavorites(favs);
    setStats(statsData);
    
    // Get time-aware recommendation
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    setRecommended(getRecommendedMeditation(undefined, undefined, timeOfDay));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const handleToggleFavorite = async (meditation: Meditation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isFav = await toggleMeditationFavorite(meditation.id);
    setFavorites(prev => 
      isFav ? [...prev, meditation.id] : prev.filter(id => id !== meditation.id)
    );
  };

  const handleSelectMeditation = (meditation: Meditation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMeditation(meditation);
    setViewMode('player');
    setCurrentStepIndex(0);
    setStepProgress(0);
    setTotalElapsed(0);
    setIsPlaying(false);
    sessionStartRef.current = new Date();
  };

  const startBreathingAnimation = (step: MeditationStep) => {
    if (!step.breathingPattern) return;

    const { inhale, hold = 0, exhale, holdAfterExhale = 0 } = step.breathingPattern;
    const cycleDuration = (inhale + hold + exhale + holdAfterExhale) * 1000;

    const runCycle = () => {
      setBreathPhase('inhale');
      Animated.timing(breathAnim, {
        toValue: 1,
        duration: inhale * 1000,
        useNativeDriver: true,
      }).start(() => {
        if (hold > 0) {
          setBreathPhase('hold');
          setTimeout(() => {
            setBreathPhase('exhale');
            Animated.timing(breathAnim, {
              toValue: 0,
              duration: exhale * 1000,
              useNativeDriver: true,
            }).start(() => {
              if (holdAfterExhale > 0) {
                setBreathPhase('holdAfter');
                setTimeout(() => {
                  setBreathCount(prev => prev + 1);
                }, holdAfterExhale * 1000);
              } else {
                setBreathCount(prev => prev + 1);
              }
            });
          }, hold * 1000);
        } else {
          setBreathPhase('exhale');
          Animated.timing(breathAnim, {
            toValue: 0,
            duration: exhale * 1000,
            useNativeDriver: true,
          }).start(() => {
            setBreathCount(prev => prev + 1);
          });
        }
      });
    };

    runCycle();
    breathTimerRef.current = setInterval(runCycle, cycleDuration);
  };

  const stopBreathingAnimation = () => {
    if (breathTimerRef.current) {
      clearInterval(breathTimerRef.current);
      breathTimerRef.current = null;
    }
    breathAnim.setValue(0);
    setBreathPhase('inhale');
  };

  const handlePlay = () => {
    if (!selectedMeditation) return;
    
    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const currentStep = selectedMeditation.steps[currentStepIndex];
    if (currentStep.type === 'breathing' && currentStep.breathingPattern) {
      startBreathingAnimation(currentStep);
    }
    
    // Main timer
    timerRef.current = setInterval(() => {
      setStepProgress(prev => {
        const newProgress = prev + 1;
        const stepDuration = selectedMeditation.steps[currentStepIndex].duration;
        
        if (newProgress >= stepDuration) {
          // Move to next step
          const nextIndex = currentStepIndex + 1;
          if (nextIndex >= selectedMeditation.steps.length) {
            // Meditation complete
            handleComplete();
            return 0;
          }
          
          stopBreathingAnimation();
          setCurrentStepIndex(nextIndex);
          setStepProgress(0);
          setBreathCount(0);
          
          const nextStep = selectedMeditation.steps[nextIndex];
          if (nextStep.type === 'breathing' && nextStep.breathingPattern) {
            setTimeout(() => startBreathingAnimation(nextStep), 100);
          }
          
          return 0;
        }
        
        return newProgress;
      });
      
      setTotalElapsed(prev => prev + 1);
    }, 1000);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopBreathingAnimation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleComplete = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopBreathingAnimation();
    setIsPlaying(false);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (selectedMeditation && sessionStartRef.current) {
      // Save session
      const session: MeditationSession = {
        meditationId: selectedMeditation.id,
        startedAt: sessionStartRef.current.toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
        duration: totalElapsed,
      };
      await saveMeditationSession(session);
      
      // Record for gamification
      await recordActivity('session_complete', {
        type: 'meditation',
        meditationId: selectedMeditation.id,
        duration: totalElapsed,
      });
      
      // Refresh stats
      loadData();
    }
  };

  const handleClose = () => {
    if (isPlaying) handlePause();
    
    if (selectedMeditation && sessionStartRef.current && totalElapsed > 10) {
      // Save partial session
      const session: MeditationSession = {
        meditationId: selectedMeditation.id,
        startedAt: sessionStartRef.current.toISOString(),
        completed: false,
        duration: totalElapsed,
      };
      saveMeditationSession(session);
    }
    
    setViewMode('browse');
    setSelectedMeditation(null);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setTotalElapsed(0);
  };

  const getFilteredMeditations = (): Meditation[] => {
    if (selectedCategory === 'all') return MEDITATIONS;
    if (selectedCategory === 'favorites') {
      return MEDITATIONS.filter(m => favorites.includes(m.id));
    }
    return MEDITATIONS.filter(m => m.category === selectedCategory);
  };

  const renderMeditationCard = ({ item }: { item: Meditation }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <TouchableOpacity
        style={styles.meditationCard}
        onPress={() => handleSelectMeditation(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[`${item.color}20`, 'rgba(45, 40, 69, 0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${item.color}30` }]}>
              <MaterialCommunityIcons
                name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={item.color}
              />
            </View>
            <TouchableOpacity
              onPress={() => handleToggleFavorite(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#E85A5A' : '#7A7290'}
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.cardFooter}>
            <View style={styles.durationBadge}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#B8B0C8" />
              <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: `${item.color}20` }]}>
              <Text style={[styles.difficultyText, { color: item.color }]}>
                {item.difficulty}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderBrowseView = () => (
    <View style={styles.browseContainer}>
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      )}

      {/* Recommended */}
      {recommended && (
        <TouchableOpacity
          style={styles.recommendedCard}
          onPress={() => handleSelectMeditation(recommended)}
        >
          <LinearGradient
            colors={[`${recommended.color}30`, 'rgba(155, 126, 198, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.recommendedGradient}
          >
            <Text style={styles.recommendedLabel}>Recommended for You</Text>
            <View style={styles.recommendedContent}>
              <MaterialCommunityIcons
                name={recommended.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={32}
                color={recommended.color}
              />
              <View style={styles.recommendedText}>
                <Text style={styles.recommendedTitle}>{recommended.title}</Text>
                <Text style={styles.recommendedDuration}>
                  {formatDuration(recommended.duration)} • {recommended.category}
                </Text>
              </View>
              <Ionicons name="play-circle" size={36} color="#F5F0E8" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <MaterialCommunityIcons
              name={cat.icon}
              size={16}
              color={selectedCategory === cat.id ? '#F5F0E8' : '#7A7290'}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.id && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Meditations Grid */}
      <FlatList
        data={getFilteredMeditations()}
        renderItem={renderMeditationCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="meditation" size={48} color="#7A7290" />
            <Text style={styles.emptyText}>No meditations found</Text>
          </View>
        )}
      />
    </View>
  );

  const renderPlayer = () => {
    if (!selectedMeditation) return null;
    
    const currentStep = selectedMeditation.steps[currentStepIndex];
    const overallProgress = totalElapsed / selectedMeditation.duration;
    const stepProgressPercent = stepProgress / currentStep.duration;

    return (
      <View style={styles.playerContainer}>
        <LinearGradient
          colors={[`${selectedMeditation.color}20`, '#1A1625']}
          style={styles.playerGradient}
        >
          {/* Header */}
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#F5F0E8" />
            </TouchableOpacity>
            <Text style={styles.playerCategory}>
              {selectedMeditation.category.toUpperCase()}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            contentContainerStyle={styles.playerContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={styles.playerTitle}>{selectedMeditation.title}</Text>

            {/* Breathing Circle */}
            {currentStep.type === 'breathing' && currentStep.breathingPattern && (
              <View style={styles.breathingContainer}>
                <Animated.View
                  style={[
                    styles.breathingCircle,
                    {
                      backgroundColor: `${selectedMeditation.color}30`,
                      transform: [
                        {
                          scale: breathAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.breathPhaseText}>
                    {breathPhase === 'inhale' && 'Breathe In'}
                    {breathPhase === 'hold' && 'Hold'}
                    {breathPhase === 'exhale' && 'Breathe Out'}
                    {breathPhase === 'holdAfter' && 'Hold'}
                  </Text>
                  <Text style={styles.breathPatternName}>
                    {currentStep.breathingPattern.name}
                  </Text>
                </Animated.View>
                <Text style={styles.breathCount}>
                  Breath {breathCount + 1}
                </Text>
              </View>
            )}

            {/* Step Icon for non-breathing */}
            {currentStep.type !== 'breathing' && (
              <View style={styles.stepIconContainer}>
                <View
                  style={[
                    styles.stepIconCircle,
                    { backgroundColor: `${selectedMeditation.color}30` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      currentStep.type === 'visualization'
                        ? 'eye'
                        : currentStep.type === 'body-scan'
                        ? 'human'
                        : currentStep.type === 'affirmation'
                        ? 'heart'
                        : currentStep.type === 'silence'
                        ? 'peace'
                        : 'play'
                    }
                    size={48}
                    color={selectedMeditation.color}
                  />
                </View>
              </View>
            )}

            {/* Instruction */}
            <View style={styles.instructionContainer}>
              <Text style={styles.stepType}>
                {currentStep.type.replace('-', ' ').toUpperCase()}
              </Text>
              <Text style={styles.instruction}>
                {currentStep.visualizationPrompt || currentStep.instruction}
              </Text>
            </View>

            {/* Step Progress */}
            <View style={styles.stepProgressContainer}>
              <View style={styles.stepProgressBar}>
                <View
                  style={[
                    styles.stepProgressFill,
                    {
                      width: `${stepProgressPercent * 100}%`,
                      backgroundColor: selectedMeditation.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.stepTime}>
                {formatDuration(currentStep.duration - stepProgress)}
              </Text>
            </View>

            {/* Step Indicators */}
            <View style={styles.stepIndicators}>
              {selectedMeditation.steps.map((step, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    index === currentStepIndex && {
                      backgroundColor: selectedMeditation.color,
                      width: 20,
                    },
                    index < currentStepIndex && {
                      backgroundColor: selectedMeditation.color,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  if (currentStepIndex > 0) {
                    stopBreathingAnimation();
                    setCurrentStepIndex(prev => prev - 1);
                    setStepProgress(0);
                    setBreathCount(0);
                  }
                }}
                disabled={currentStepIndex === 0}
              >
                <Ionicons
                  name="play-back"
                  size={24}
                  color={currentStepIndex === 0 ? '#4A4560' : '#F5F0E8'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={isPlaying ? handlePause : handlePlay}
              >
                <LinearGradient
                  colors={[selectedMeditation.color, `${selectedMeditation.color}80`]}
                  style={styles.playButtonInner}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={36}
                    color="#FFF"
                  />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  if (currentStepIndex < selectedMeditation.steps.length - 1) {
                    stopBreathingAnimation();
                    setCurrentStepIndex(prev => prev + 1);
                    setStepProgress(0);
                    setBreathCount(0);
                  }
                }}
                disabled={currentStepIndex === selectedMeditation.steps.length - 1}
              >
                <Ionicons
                  name="play-forward"
                  size={24}
                  color={
                    currentStepIndex === selectedMeditation.steps.length - 1
                      ? '#4A4560'
                      : '#F5F0E8'
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Overall Progress */}
            <View style={styles.overallProgress}>
              <Text style={styles.timeText}>{formatDuration(totalElapsed)}</Text>
              <View style={styles.overallProgressBar}>
                <View
                  style={[
                    styles.overallProgressFill,
                    { width: `${overallProgress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.timeText}>
                {formatDuration(selectedMeditation.duration)}
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2D2845', '#1A1625']} style={styles.gradient}>
        {viewMode === 'browse' && (
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#F5F0E8" />
              </TouchableOpacity>
              <Text style={styles.title}>Meditate</Text>
              <View style={{ width: 40 }} />
            </View>
            {renderBrowseView()}
          </>
        )}
        {viewMode === 'player' && renderPlayer()}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F0E8',
  },

  // Browse View
  browseContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  statLabel: {
    fontSize: 11,
    color: '#7A7290',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
  },
  recommendedCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  recommendedGradient: {
    padding: 16,
  },
  recommendedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9B7EC6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  recommendedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendedText: {
    flex: 1,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  recommendedDuration: {
    fontSize: 12,
    color: '#B8B0C8',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  categoryScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(155, 126, 198, 0.3)',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7A7290',
  },
  categoryChipTextActive: {
    color: '#F5F0E8',
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  meditationCard: {
    width: (width - 36) / 2,
    marginHorizontal: 4,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 14,
    minHeight: 160,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F0E8',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    color: '#B8B0C8',
    lineHeight: 16,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: '#B8B0C8',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#7A7290',
    marginTop: 12,
  },

  // Player View
  playerContainer: {
    flex: 1,
  },
  playerGradient: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9B7EC6',
    letterSpacing: 1,
  },
  playerContent: {
    alignItems: 'center',
    padding: 24,
  },
  playerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F5F0E8',
    textAlign: 'center',
    marginBottom: 32,
  },
  breathingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  breathingCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathPhaseText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F0E8',
    textAlign: 'center',
  },
  breathPatternName: {
    fontSize: 12,
    color: '#B8B0C8',
    marginTop: 8,
  },
  breathCount: {
    fontSize: 13,
    color: '#7A7290',
    marginTop: 16,
  },
  stepIconContainer: {
    marginBottom: 32,
  },
  stepIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  stepType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A7290',
    letterSpacing: 1,
    marginBottom: 12,
  },
  instruction: {
    fontSize: 17,
    lineHeight: 26,
    color: '#F5F0E8',
    textAlign: 'center',
  },
  stepProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  stepProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  stepTime: {
    fontSize: 13,
    color: '#B8B0C8',
    width: 50,
    textAlign: 'right',
  },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 40,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(155, 126, 198, 0.3)',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    marginBottom: 32,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(45, 40, 69, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  playButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  timeText: {
    fontSize: 12,
    color: '#7A7290',
    width: 48,
  },
  overallProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: 4,
    backgroundColor: '#9B7EC6',
    borderRadius: 2,
  },
});

export default MeditationScreen;
