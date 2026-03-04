/**
 * TrueReact - Achievements Screen
 * 
 * Displays progress, streaks, badges, and gamification stats.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getGamificationData,
  getGamificationSummary,
  getPointsForNextLevel,
  GamificationData,
  GamificationSummary,
  Badge,
} from '../services/gamification';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const BADGE_SIZE = (width - 64) / 3;

type BadgeCategory = 'all' | 'streak' | 'milestone' | 'engagement' | 'mastery' | 'special';

export function AchievementsScreen() {
  const { colors, isDark } = useTheme();
  const [data, setData] = useState<GamificationData | null>(null);
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showBadgeDetail, setShowBadgeDetail] = useState(false);
  
  const levelProgressAnim = useState(new Animated.Value(0))[0];
  const streakAnim = useState(new Animated.Value(1))[0];

  const loadData = useCallback(async () => {
    const [gamificationData, summaryData] = await Promise.all([
      getGamificationData(),
      getGamificationSummary(),
    ]);
    setData(gamificationData);
    setSummary(summaryData);
    
    // Animate level progress
    Animated.timing(levelProgressAnim, {
      toValue: summaryData.nextLevelProgress,
      duration: 800,
      useNativeDriver: false,
    }).start();
    
    // Pulse streak if active
    if (summaryData.currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(streakAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(streakAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [levelProgressAnim, streakAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBadgePress = (badge: Badge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBadge(badge);
    setShowBadgeDetail(true);
  };

  const getCategoryBadges = (): Badge[] => {
    if (!data) return [];
    if (selectedCategory === 'all') return data.badges;
    return data.badges.filter(b => b.category === selectedCategory);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      streak: '#F5A623',
      milestone: '#9B7EC6',
      engagement: '#6B8DD6',
      mastery: '#4ECDC4',
      special: '#FFD166',
    };
    return colors[category] || '#9B7EC6';
  };

  const getLevelTitle = (level: number): string => {
    const titles = [
      'Beginner',
      'Explorer',
      'Practitioner',
      'Achiever',
      'Dedicated',
      'Expert',
      'Master',
      'Champion',
      'Legend',
      'Transcendent',
    ];
    if (level <= 0) return 'Beginner';
    if (level > 10) return `Transcendent ${level - 9}`;
    return titles[level - 1];
  };

  const categories: { id: BadgeCategory; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { id: 'all', label: 'All', icon: 'view-grid' },
    { id: 'streak', label: 'Streaks', icon: 'fire' },
    { id: 'milestone', label: 'Milestones', icon: 'flag-checkered' },
    { id: 'engagement', label: 'Engagement', icon: 'heart' },
    { id: 'mastery', label: 'Mastery', icon: 'star' },
    { id: 'special', label: 'Special', icon: 'diamond-stone' },
  ];

  const renderBadge = (badge: Badge) => {
    const isUnlocked = !!badge.unlockedAt;
    const progress = badge.progress || 0;
    
    return (
      <TouchableOpacity
        key={badge.id}
        style={styles.badgeContainer}
        onPress={() => handleBadgePress(badge)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.badgeCircle,
            isUnlocked && { backgroundColor: `${badge.color}20` },
          ]}
        >
          {/* Progress ring for locked badges */}
          {!isUnlocked && progress > 0 && (
            <View style={styles.progressRing}>
              <View
                style={[
                  styles.progressArc,
                  {
                    borderColor: badge.color,
                    transform: [{ rotate: `${progress * 360}deg` }],
                  },
                ]}
              />
            </View>
          )}
          
          <MaterialCommunityIcons
            name={badge.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={32}
            color={isUnlocked ? badge.color : '#4A4560'}
          />
          
          {/* Lock icon overlay */}
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <MaterialCommunityIcons
                name="lock"
                size={12}
                color="#7A7290"
              />
            </View>
          )}
        </View>
        
        <Text
          style={[
            styles.badgeName,
            !isUnlocked && styles.badgeNameLocked,
          ]}
          numberOfLines={2}
        >
          {badge.name}
        </Text>
        
        {!isUnlocked && progress > 0 && (
          <Text style={styles.badgeProgress}>
            {Math.round(progress * 100)}%
          </Text>
        )}
        
        {isUnlocked && (
          <View style={[styles.pointsBadge, { backgroundColor: `${badge.color}30` }]}>
            <Text style={[styles.pointsText, { color: badge.color }]}>
              +{badge.points}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderBadgeDetailModal = () => (
    <Modal
      visible={showBadgeDetail}
      animationType="fade"
      transparent
      onRequestClose={() => setShowBadgeDetail(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowBadgeDetail(false)}
      >
        <View style={styles.badgeDetailCard}>
          {selectedBadge && (
            <>
              <View
                style={[
                  styles.badgeDetailIcon,
                  { backgroundColor: `${selectedBadge.color}20` },
                ]}
              >
                <MaterialCommunityIcons
                  name={selectedBadge.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={56}
                  color={selectedBadge.unlockedAt ? selectedBadge.color : '#4A4560'}
                />
              </View>
              
              <Text style={styles.badgeDetailName}>{selectedBadge.name}</Text>
              <Text style={styles.badgeDetailDescription}>
                {selectedBadge.description}
              </Text>
              
              <View style={styles.badgeDetailMeta}>
                <View style={[styles.categoryTag, { backgroundColor: `${getCategoryColor(selectedBadge.category)}20` }]}>
                  <Text style={[styles.categoryTagText, { color: getCategoryColor(selectedBadge.category) }]}>
                    {selectedBadge.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.badgeDetailPoints}>
                  {selectedBadge.points} points
                </Text>
              </View>
              
              {selectedBadge.unlockedAt ? (
                <View style={styles.unlockedInfo}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#7BC67E"
                  />
                  <Text style={styles.unlockedText}>
                    Unlocked {new Date(selectedBadge.unlockedAt).toLocaleDateString()}
                  </Text>
                </View>
              ) : (
                <View style={styles.lockedInfo}>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(selectedBadge.progress || 0) * 100}%`,
                          backgroundColor: selectedBadge.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.lockedText}>
                    {Math.round((selectedBadge.progress || 0) * 100)}% complete
                  </Text>
                  <Text style={styles.requirementText}>
                    Requires: {selectedBadge.requirement}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (!data || !summary) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.gradient as [string, string, ...string[]]} style={styles.gradient}>
          <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={48}
              color={colors.secondary}
            />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading achievements...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const levelProgress = getPointsForNextLevel(summary.totalPoints);
  const categoryBadges = getCategoryBadges();
  const unlockedInCategory = categoryBadges.filter(b => b.unlockedAt).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradient as [string, string, ...string[]]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
          </View>

          {/* Level Card */}
          <View style={[styles.levelCard, { backgroundColor: isDark ? 'rgba(45, 40, 69, 0.6)' : 'rgba(123, 104, 176, 0.08)' }]}>
            <LinearGradient
              colors={isDark ? ['rgba(155, 126, 198, 0.3)', 'rgba(107, 141, 214, 0.2)'] : ['rgba(155, 126, 198, 0.15)', 'rgba(107, 141, 214, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelGradient}
            >
              <View style={styles.levelHeader}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelNumber}>{summary.level}</Text>
                </View>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelTitle}>{getLevelTitle(summary.level)}</Text>
                  <Text style={styles.levelPoints}>
                    {summary.totalPoints.toLocaleString()} total points
                  </Text>
                </View>
              </View>
              
              <View style={styles.levelProgressContainer}>
                <View style={styles.levelProgressBar}>
                  <Animated.View
                    style={[
                      styles.levelProgressFill,
                      {
                        width: levelProgressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.levelProgressText}>
                  {levelProgress.current} / {levelProgress.required} XP to Level {summary.level + 1}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Streak Card */}
          <View style={styles.statsRow}>
            <Animated.View
              style={[
                styles.streakCard,
                { transform: [{ scale: streakAnim }] },
              ]}
            >
              <MaterialCommunityIcons
                name="fire"
                size={32}
                color={summary.currentStreak > 0 ? '#F5A623' : '#4A4560'}
              />
              <Text style={styles.streakNumber}>{summary.currentStreak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </Animated.View>
            
            <View style={styles.statCard}>
              <MaterialCommunityIcons
                name="trophy"
                size={32}
                color="#FFD166"
              />
              <Text style={styles.statNumber}>{summary.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialCommunityIcons
                name="medal"
                size={32}
                color="#9B7EC6"
              />
              <Text style={styles.statNumber}>
                {summary.badgesUnlocked}/{summary.totalBadges}
              </Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map(cat => (
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

          {/* Badge Count */}
          <View style={styles.badgeCountRow}>
            <Text style={styles.badgeCountText}>
              {unlockedInCategory} of {categoryBadges.length} unlocked
            </Text>
          </View>

          {/* Badges Grid */}
          <View style={styles.badgesGrid}>
            {categoryBadges.map(renderBadge)}
          </View>

          {/* Activity Stats */}
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Activity Summary</Text>
            <View style={styles.activityGrid}>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{data.sessionsCompleted}</Text>
                <Text style={styles.activityLabel}>Sessions</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{data.journalEntries}</Text>
                <Text style={styles.activityLabel}>Journals</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{data.breathingExercises}</Text>
                <Text style={styles.activityLabel}>Breathing</Text>
              </View>
              <View style={styles.activityItem}>
                <Text style={styles.activityValue}>{data.moodCheckins}</Text>
                <Text style={styles.activityLabel}>Check-ins</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {renderBadgeDetailModal()}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7A7290',
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F0E8',
  },

  // Level Card
  levelCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  levelGradient: {
    padding: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F5F0E8',
  },
  levelInfo: {
    marginLeft: 16,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  levelPoints: {
    fontSize: 14,
    color: '#B8B0C8',
    marginTop: 2,
  },
  levelProgressContainer: {
    marginTop: 8,
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: 8,
    backgroundColor: '#F5F0E8',
    borderRadius: 4,
  },
  levelProgressText: {
    fontSize: 12,
    color: '#B8B0C8',
    marginTop: 8,
    textAlign: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.2)',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F0E8',
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 11,
    color: '#B8B0C8',
    marginTop: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F0E8',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#7A7290',
    marginTop: 2,
  },

  // Category Filter
  categoryScroll: {
    marginBottom: 8,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(155, 126, 198, 0.3)',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A7290',
  },
  categoryChipTextActive: {
    color: '#F5F0E8',
  },

  // Badge Count
  badgeCountRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  badgeCountText: {
    fontSize: 13,
    color: '#7A7290',
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  badgeContainer: {
    width: BADGE_SIZE,
    alignItems: 'center',
    paddingVertical: 12,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(45, 40, 69, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  progressArc: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2D2845',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F5F0E8',
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeNameLocked: {
    color: '#7A7290',
  },
  badgeProgress: {
    fontSize: 10,
    color: '#7A7290',
    marginTop: 2,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Activity Section
  activitySection: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F0E8',
    marginBottom: 16,
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityItem: {
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  activityLabel: {
    fontSize: 11,
    color: '#7A7290',
    marginTop: 4,
  },

  // Badge Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  badgeDetailCard: {
    backgroundColor: '#2D2845',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  badgeDetailIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeDetailName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F0E8',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDetailDescription: {
    fontSize: 14,
    color: '#B8B0C8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  badgeDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeDetailPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5A623',
  },
  unlockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(123, 198, 126, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  unlockedText: {
    fontSize: 14,
    color: '#7BC67E',
  },
  lockedInfo: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(122, 114, 144, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  lockedText: {
    fontSize: 13,
    color: '#7A7290',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#B8B0C8',
    fontStyle: 'italic',
  },
});

export default AchievementsScreen;
