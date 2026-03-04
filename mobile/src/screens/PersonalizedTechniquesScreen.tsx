/**
 * TrueReact - Personalized Techniques Screen
 * 
 * Browse techniques with personalized recommendations
 * based on emotional state and usage history.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TECHNIQUES,
  Technique,
  TechniqueCategory,
  TechniqueRecommendation,
  getRecommendations,
  getCategories,
  getTechniquesByCategory,
  getTechniqueAnalytics,
  recordTechniqueUsage,
  getUserPreferences,
  saveUserPreferences,
  UserPreferences,
} from '../services/recommendations';
import { recordActivity } from '../services/gamification';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMOTION_OPTIONS = [
  { id: 'anxious', label: 'Anxious', icon: '😰', color: '#E67E22' },
  { id: 'stressed', label: 'Stressed', icon: '😫', color: '#E74C3C' },
  { id: 'sad', label: 'Sad', icon: '😢', color: '#8E8E8E' },
  { id: 'angry', label: 'Angry', icon: '😠', color: '#C0392B' },
  { id: 'overwhelmed', label: 'Overwhelmed', icon: '🤯', color: '#9B59B6' },
  { id: 'restless', label: 'Restless', icon: '🌀', color: '#3498DB' },
  { id: 'low_energy', label: 'Low Energy', icon: '😴', color: '#95A5A6' },
  { id: 'confused', label: 'Confused', icon: '😕', color: '#F39C12' },
];

type ViewMode = 'recommendations' | 'browse' | 'analytics';

export default function TechniquesScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('recommendations');
  const [selectedEmotion, setSelectedEmotion] = useState('anxious');
  const [recommendations, setRecommendations] = useState<TechniqueRecommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TechniqueCategory | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [practiceStartTime, setPracticeStartTime] = useState<Date | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const categories = getCategories();
  
  const loadData = useCallback(async () => {
    try {
      const [recs, stats, prefs] = await Promise.all([
        getRecommendations({ currentEmotion: selectedEmotion, maxResults: 6 }),
        getTechniqueAnalytics(),
        getUserPreferences(),
      ]);
      setRecommendations(recs);
      setAnalytics(stats);
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedEmotion]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleEmotionChange = async (emotion: string) => {
    setSelectedEmotion(emotion);
    setLoading(true);
    const recs = await getRecommendations({ currentEmotion: emotion, maxResults: 6 });
    setRecommendations(recs);
    setLoading(false);
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const startPractice = (technique: Technique) => {
    setSelectedTechnique(technique);
    setIsPracticing(true);
    setCurrentStep(0);
    setPracticeStartTime(new Date());
  };
  
  const completePractice = async (emotionAfter: string) => {
    if (!selectedTechnique || !practiceStartTime) return;
    
    // Calculate emotion shift
    const emotionValence: Record<string, number> = {
      anxious: -0.7, stressed: -0.6, sad: -0.5, angry: -0.8, overwhelmed: -0.9,
      restless: -0.4, low_energy: -0.3, confused: -0.3,
      neutral: 0, calm: 0.6, hopeful: 0.7, happy: 0.8, energized: 0.5,
    };
    
    const emotionShift = (emotionValence[emotionAfter] ?? 0) - (emotionValence[selectedEmotion] ?? 0);
    
    await recordTechniqueUsage({
      techniqueId: selectedTechnique.id,
      timestamp: practiceStartTime.toISOString(),
      emotionBefore: selectedEmotion,
      emotionAfter,
      emotionShift,
      completedFully: currentStep >= selectedTechnique.steps.length - 1,
    });
    
    // Record gamification activity
    await recordActivity('technique_used');
    if (emotionShift > 0.2) {
      await recordActivity('technique_used'); // Records a successful technique use
    }
    
    setIsPracticing(false);
    setSelectedTechnique(null);
    setCurrentStep(0);
    setPracticeStartTime(null);
    
    // Refresh data
    loadData();
  };
  
  const savePrefs = async (newPrefs: UserPreferences) => {
    await saveUserPreferences(newPrefs);
    setPreferences(newPrefs);
    setShowPrefsModal(false);
    loadData();
  };
  
  const renderEmotionSelector = () => (
    <View style={styles.emotionSelector}>
      <Text style={styles.emotionLabel}>How are you feeling?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.emotionOptions}>
          {EMOTION_OPTIONS.map((emotion) => (
            <TouchableOpacity
              key={emotion.id}
              style={[
                styles.emotionOption,
                selectedEmotion === emotion.id && styles.emotionOptionSelected,
                selectedEmotion === emotion.id && { backgroundColor: emotion.color + '20' },
              ]}
              onPress={() => handleEmotionChange(emotion.id)}
            >
              <Text style={styles.emotionEmoji}>{emotion.icon}</Text>
              <Text style={[
                styles.emotionText,
                selectedEmotion === emotion.id && { color: emotion.color },
              ]}>
                {emotion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
  
  const renderRecommendationCard = (rec: TechniqueRecommendation) => (
    <TouchableOpacity
      key={rec.technique.id}
      style={styles.recCard}
      onPress={() => startPractice(rec.technique)}
      activeOpacity={0.8}
    >
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: rec.technique.color + '20' }]}>
          <Ionicons name={rec.technique.icon as any} size={24} color={rec.technique.color} />
        </View>
        <View style={styles.recMeta}>
          <Text style={styles.recName}>{rec.technique.name}</Text>
          <View style={styles.recTags}>
            <View style={styles.recTag}>
              <Ionicons name="time-outline" size={12} color="#6B6B80" />
              <Text style={styles.recTagText}>{rec.technique.duration} min</Text>
            </View>
            <View style={styles.recTag}>
              <Ionicons name="speedometer-outline" size={12} color="#6B6B80" />
              <Text style={styles.recTagText}>{rec.technique.difficulty}</Text>
            </View>
          </View>
        </View>
        <View style={styles.recScore}>
          <Text style={styles.recScoreText}>{rec.score}%</Text>
          <Text style={styles.recScoreLabel}>match</Text>
        </View>
      </View>
      
      <Text style={styles.recDescription} numberOfLines={2}>
        {rec.technique.description}
      </Text>
      
      {rec.reasons.length > 0 && (
        <View style={styles.recReasons}>
          {rec.reasons.map((reason, i) => (
            <View key={i} style={styles.reasonPill}>
              <Ionicons 
                name={
                  reason.type === 'high_success_rate' ? 'trending-up-outline' :
                  reason.type === 'good_for_emotion' ? 'heart-outline' :
                  reason.type === 'user_favorite' ? 'star-outline' :
                  reason.type === 'try_something_new' ? 'sparkles-outline' :
                  reason.type === 'time_appropriate' ? 'time-outline' :
                  'checkmark-outline'
                } 
                size={12} 
                color="#9B7EC6" 
              />
              <Text style={styles.reasonText}>{reason.description}</Text>
            </View>
          ))}
        </View>
      )}
      
      {rec.successRate !== undefined && rec.timesUsed! > 0 && (
        <View style={styles.recStats}>
          <Text style={styles.recStatText}>
            Used {rec.timesUsed}x • {Math.round(rec.successRate * 100)}% effective
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
  
  const renderBrowseView = () => (
    <ScrollView style={styles.browseContainer}>
      {/* Categories */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <View style={styles.categoriesGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.category}
            style={[
              styles.categoryCard,
              selectedCategory === cat.category && styles.categoryCardSelected,
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === cat.category ? null : cat.category
            )}
          >
            <Ionicons name={cat.icon as any} size={24} color={cat.color} />
            <Text style={styles.categoryName}>
              {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
            </Text>
            <Text style={styles.categoryCount}>{cat.count} techniques</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Techniques List */}
      <Text style={styles.sectionTitle}>
        {selectedCategory 
          ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Techniques`
          : 'All Techniques'
        }
      </Text>
      
      {(selectedCategory ? getTechniquesByCategory(selectedCategory) : TECHNIQUES)
        .map((technique) => (
          <TouchableOpacity
            key={technique.id}
            style={styles.techniqueListItem}
            onPress={() => startPractice(technique)}
          >
            <View style={[styles.techniqueIcon, { backgroundColor: technique.color + '20' }]}>
              <Ionicons name={technique.icon as any} size={20} color={technique.color} />
            </View>
            <View style={styles.techniqueInfo}>
              <Text style={styles.techniqueName}>{technique.name}</Text>
              <Text style={styles.techniqueMeta}>
                {technique.duration} min • {technique.difficulty}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B8B0C8" />
          </TouchableOpacity>
        ))}
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
  
  const renderAnalyticsView = () => {
    if (!analytics) return null;
    
    return (
      <ScrollView style={styles.analyticsContainer}>
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalUsed}</Text>
            <Text style={styles.statLabel}>Times Practiced</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.uniqueTechniques}</Text>
            <Text style={styles.statLabel}>Unique Techniques</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.round(analytics.avgSuccessRate * 100)}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.trendIndicator}>
              <Ionicons 
                name={
                  analytics.recentTrend === 'improving' ? 'trending-up' :
                  analytics.recentTrend === 'declining' ? 'trending-down' :
                  'remove'
                } 
                size={24} 
                color={
                  analytics.recentTrend === 'improving' ? '#7BC67E' :
                  analytics.recentTrend === 'declining' ? '#E74C3C' :
                  '#B8B0C8'
                } 
              />
            </View>
            <Text style={styles.statLabel}>Recent Trend</Text>
          </View>
        </View>
        
        {/* Favorite Category */}
        {analytics.favoriteCategory && (
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionTitle}>Favorite Category</Text>
            <View style={styles.favoriteCategoryCard}>
              <Ionicons 
                name={categories.find(c => c.category === analytics.favoriteCategory)?.icon as any} 
                size={32} 
                color={categories.find(c => c.category === analytics.favoriteCategory)?.color} 
              />
              <Text style={styles.favoriteCategoryName}>
                {analytics.favoriteCategory.charAt(0).toUpperCase() + analytics.favoriteCategory.slice(1)}
              </Text>
            </View>
          </View>
        )}
        
        {/* Most Effective */}
        {analytics.mostEffective.length > 0 && (
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionTitle}>Most Effective For You</Text>
            {analytics.mostEffective.map((technique: Technique) => (
              <TouchableOpacity
                key={technique.id}
                style={styles.effectiveTechnique}
                onPress={() => startPractice(technique)}
              >
                <View style={[styles.techniqueIcon, { backgroundColor: technique.color + '20' }]}>
                  <Ionicons name={technique.icon as any} size={20} color={technique.color} />
                </View>
                <Text style={styles.effectiveName}>{technique.name}</Text>
                <Ionicons name="star" size={16} color="#F5A623" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Preferences */}
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Preferences</Text>
            <TouchableOpacity onPress={() => setShowPrefsModal(true)}>
              <Ionicons name="settings-outline" size={20} color="#9B7EC6" />
            </TouchableOpacity>
          </View>
          
          {preferences && (
            <View style={styles.prefsCard}>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Preferred Duration</Text>
                <Text style={styles.prefValue}>{preferences.preferredDuration}</Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Difficulty Level</Text>
                <Text style={styles.prefValue}>{preferences.difficulty}</Text>
              </View>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Learn New Techniques</Text>
                <Text style={styles.prefValue}>{preferences.learnNewTechniques ? 'Yes' : 'No'}</Text>
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };
  
  const renderPracticeModal = () => {
    if (!selectedTechnique) return null;
    
    const steps = selectedTechnique.steps;
    const isLastStep = currentStep >= steps.length - 1;
    
    return (
      <Modal
        visible={isPracticing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPracticing(false)}
      >
        <LinearGradient
          colors={[selectedTechnique.color + '20', '#F8F7FC']}
          style={styles.practiceContainer}
        >
          <SafeAreaView style={styles.practiceSafeArea}>
            {/* Header */}
            <View style={styles.practiceHeader}>
              <TouchableOpacity onPress={() => setIsPracticing(false)}>
                <Ionicons name="close" size={24} color="#2D2D44" />
              </TouchableOpacity>
              <Text style={styles.practiceTitle}>{selectedTechnique.name}</Text>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepText}>{currentStep + 1}/{steps.length}</Text>
              </View>
            </View>
            
            {/* Progress */}
            <View style={styles.practiceProgress}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i <= currentStep && { backgroundColor: selectedTechnique.color },
                  ]}
                />
              ))}
            </View>
            
            {/* Current Step */}
            <View style={styles.stepContainer}>
              <View style={[styles.stepIconBig, { backgroundColor: selectedTechnique.color + '30' }]}>
                <Ionicons 
                  name={selectedTechnique.icon as any} 
                  size={48} 
                  color={selectedTechnique.color} 
                />
              </View>
              <Text style={styles.stepContent}>{steps[currentStep]}</Text>
            </View>
            
            {/* Navigation */}
            <View style={styles.practiceNav}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={styles.prevButton}
                  onPress={() => setCurrentStep(currentStep - 1)}
                >
                  <Ionicons name="chevron-back" size={20} color="#9B7EC6" />
                  <Text style={styles.prevText}>Previous</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: selectedTechnique.color }]}
                onPress={() => {
                  if (isLastStep) {
                    // Show emotion selection for completion
                    completePractice('calm');
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
              >
                <Text style={styles.nextText}>
                  {isLastStep ? 'Complete' : 'Next'}
                </Text>
                <Ionicons 
                  name={isLastStep ? 'checkmark' : 'chevron-forward'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    );
  };
  
  const renderPreferencesModal = () => {
    if (!preferences) return null;
    
    return (
      <Modal
        visible={showPrefsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrefsModal(false)}
      >
        <SafeAreaView style={styles.prefsModal}>
          <View style={styles.prefsHeader}>
            <TouchableOpacity onPress={() => setShowPrefsModal(false)}>
              <Ionicons name="close" size={24} color="#2D2D44" />
            </TouchableOpacity>
            <Text style={styles.prefsTitle}>Preferences</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.prefsContent}>
            {/* Duration Preference */}
            <Text style={styles.prefsLabel}>Preferred Session Duration</Text>
            <View style={styles.prefsOptions}>
              {(['short', 'medium', 'long'] as const).map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.prefsOption,
                    preferences.preferredDuration === duration && styles.prefsOptionSelected,
                  ]}
                  onPress={() => setPreferences({ ...preferences, preferredDuration: duration })}
                >
                  <Text style={[
                    styles.prefsOptionText,
                    preferences.preferredDuration === duration && styles.prefsOptionTextSelected,
                  ]}>
                    {duration === 'short' ? '< 5 min' : duration === 'medium' ? '5-15 min' : '15+ min'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Difficulty */}
            <Text style={styles.prefsLabel}>Difficulty Level</Text>
            <View style={styles.prefsOptions}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.prefsOption,
                    preferences.difficulty === diff && styles.prefsOptionSelected,
                  ]}
                  onPress={() => setPreferences({ ...preferences, difficulty: diff })}
                >
                  <Text style={[
                    styles.prefsOptionText,
                    preferences.difficulty === diff && styles.prefsOptionTextSelected,
                  ]}>
                    {diff}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Learn New */}
            <View style={styles.prefsToggle}>
              <Text style={styles.prefsLabel}>Suggest New Techniques</Text>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  preferences.learnNewTechniques && styles.toggleSwitchOn,
                ]}
                onPress={() => setPreferences({ 
                  ...preferences, 
                  learnNewTechniques: !preferences.learnNewTechniques 
                })}
              >
                <View style={[
                  styles.toggleKnob,
                  preferences.learnNewTechniques && styles.toggleKnobOn,
                ]} />
              </TouchableOpacity>
            </View>
            
            {/* Save Button */}
            <TouchableOpacity
              style={styles.savePrefsButton}
              onPress={() => savePrefs(preferences)}
            >
              <Text style={styles.savePrefsText}>Save Preferences</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="hourglass-outline" size={48} color={colors.secondary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Finding the best techniques...</Text>
      </View>
    );
  }
  
  // Dynamic card styling
  const cardBg = isDark ? 'rgba(45, 40, 69, 0.6)' : '#FFFFFF';
  
  return (
    <LinearGradient colors={colors.gradient as [string, string, ...string[]]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={[styles.title, { color: colors.text }]}>For You</Text>
          <TouchableOpacity onPress={() => setShowPrefsModal(true)}>
            <Ionicons name="options-outline" size={24} color={colors.secondary} />
          </TouchableOpacity>
        </View>
        
        {/* View Toggle */}
        <View style={[styles.viewToggle, { backgroundColor: isDark ? 'rgba(45, 40, 69, 0.6)' : 'rgba(155, 126, 198, 0.1)' }]}>
          {(['recommendations', 'browse', 'analytics'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleButton, viewMode === mode && styles.toggleActive]}
              onPress={() => setViewMode(mode)}
            >
              <Ionicons 
                name={
                  mode === 'recommendations' ? 'sparkles-outline' :
                  mode === 'browse' ? 'grid-outline' :
                  'analytics-outline'
                } 
                size={16} 
                color={viewMode === mode ? '#FFFFFF' : colors.secondary} 
              />
              <Text style={[styles.toggleText, { color: colors.secondary }, viewMode === mode && styles.toggleTextActive]}>
                {mode === 'recommendations' ? 'For You' : mode === 'browse' ? 'Browse' : 'Stats'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {viewMode === 'recommendations' && (
          <ScrollView 
            style={styles.recContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.secondary} />
            }
          >
            {renderEmotionSelector()}
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for You</Text>
            
            {recommendations.map(renderRecommendationCard)}
            
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}
        
        {viewMode === 'browse' && renderBrowseView()}
        {viewMode === 'analytics' && renderAnalyticsView()}
        
        {renderPracticeModal()}
        {renderPreferencesModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B6B80',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D44',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  toggleActive: {
    backgroundColor: '#9B7EC6',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  recContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emotionSelector: {
    marginBottom: 20,
  },
  emotionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B80',
    marginBottom: 12,
  },
  emotionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  emotionOption: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 70,
  },
  emotionOptionSelected: {
    borderWidth: 2,
    borderColor: '#9B7EC6',
  },
  emotionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  emotionText: {
    fontSize: 11,
    color: '#6B6B80',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
    marginBottom: 12,
  },
  recCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recMeta: {
    flex: 1,
    marginLeft: 12,
  },
  recName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
  },
  recTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  recTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recTagText: {
    fontSize: 12,
    color: '#6B6B80',
  },
  recScore: {
    alignItems: 'center',
    backgroundColor: '#F0ECF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  recScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9B7EC6',
  },
  recScoreLabel: {
    fontSize: 10,
    color: '#9B7EC6',
  },
  recDescription: {
    fontSize: 14,
    color: '#6B6B80',
    lineHeight: 20,
    marginBottom: 10,
  },
  recReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  reasonText: {
    fontSize: 11,
    color: '#9B7EC6',
  },
  recStats: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  recStatText: {
    fontSize: 12,
    color: '#6B6B80',
  },
  
  // Browse View
  browseContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: '#9B7EC6',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D44',
    marginTop: 8,
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B6B80',
    marginTop: 2,
  },
  techniqueListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  techniqueIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  techniqueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D44',
  },
  techniqueMeta: {
    fontSize: 12,
    color: '#6B6B80',
    marginTop: 2,
  },
  
  // Analytics View
  analyticsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9B7EC6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B6B80',
    marginTop: 4,
  },
  trendIndicator: {
    marginBottom: 4,
  },
  analyticsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  favoriteCategoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  favoriteCategoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D44',
    marginTop: 8,
  },
  effectiveTechnique: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  effectiveName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#2D2D44',
  },
  prefsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  prefLabel: {
    fontSize: 14,
    color: '#6B6B80',
  },
  prefValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D44',
    textTransform: 'capitalize',
  },
  
  // Practice Modal
  practiceContainer: {
    flex: 1,
  },
  practiceSafeArea: {
    flex: 1,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D44',
  },
  stepIndicator: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  practiceProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  stepIconBig: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  stepContent: {
    fontSize: 24,
    fontWeight: '500',
    color: '#2D2D44',
    textAlign: 'center',
    lineHeight: 34,
  },
  practiceNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 4,
  },
  prevText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Preferences Modal
  prefsModal: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  prefsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  prefsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D44',
  },
  prefsContent: {
    flex: 1,
    padding: 20,
  },
  prefsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D44',
    marginBottom: 12,
    marginTop: 8,
  },
  prefsOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  prefsOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prefsOptionSelected: {
    borderColor: '#9B7EC6',
    backgroundColor: '#F0ECF8',
  },
  prefsOptionText: {
    fontSize: 13,
    color: '#6B6B80',
    textTransform: 'capitalize',
  },
  prefsOptionTextSelected: {
    color: '#9B7EC6',
    fontWeight: '600',
  },
  prefsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    padding: 2,
  },
  toggleSwitchOn: {
    backgroundColor: '#9B7EC6',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    marginLeft: 22,
  },
  savePrefsButton: {
    backgroundColor: '#9B7EC6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  savePrefsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  bottomPadding: {
    height: 40,
  },
});
