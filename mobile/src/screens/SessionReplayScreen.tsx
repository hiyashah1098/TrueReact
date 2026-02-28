/**
 * TrueReact - Session Replay Screen
 * 
 * Browse past coaching sessions and view timestamped
 * emotion data with coaching insights.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SessionSummary,
  SessionFilter,
  getSessionHistory,
  filterSessions,
  getSessionStats,
  toggleSessionBookmark,
  rateSession,
  addSessionNote,
  deleteSession,
  getRecentSessions,
  generateDemoSession,
} from '../services/sessionHistory';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'history' | 'stats';

const EMOTION_COLORS: Record<string, string> = {
  happy: '#7BC67E',
  calm: '#4ECDC4',
  hopeful: '#6B8DD6',
  content: '#98D8C8',
  neutral: '#B8B0C8',
  confused: '#F5A623',
  anxious: '#E67E22',
  sad: '#8E8E8E',
  angry: '#E74C3C',
  distressed: '#9B59B6',
};

const EMOTION_ICONS: Record<string, string> = {
  happy: '😊', calm: '😌', hopeful: '🌟', content: '☺️', neutral: '😐',
  confused: '😕', anxious: '😰', sad: '😢', angry: '😠', distressed: '😫',
};

export default function SessionReplayScreen({ navigation }: any) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [filter, setFilter] = useState<SessionFilter>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  const loadData = useCallback(async () => {
    try {
      const [sessionsData, statsData] = await Promise.all([
        Object.keys(filter).length > 0 ? filterSessions(filter) : getSessionHistory(),
        getSessionStats(),
      ]);
      setSessions(sessionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load session data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleToggleBookmark = async (id: string) => {
    await toggleSessionBookmark(id);
    loadData();
  };
  
  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    setSelectedSession(null);
    loadData();
  };
  
  const handleGenerateDemo = async () => {
    await generateDemoSession();
    loadData();
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  const renderEmotionShift = (shift: number) => {
    const color = shift > 0 ? '#7BC67E' : shift < 0 ? '#E67E22' : '#B8B0C8';
    const icon = shift > 0 ? 'trending-up' : shift < 0 ? 'trending-down' : 'remove';
    const label = shift > 0 ? `+${(shift * 100).toFixed(0)}%` : `${(shift * 100).toFixed(0)}%`;
    
    return (
      <View style={[styles.shiftBadge, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
        <Text style={[styles.shiftText, { color }]}>{label}</Text>
      </View>
    );
  };
  
  const renderSessionCard = (session: SessionSummary) => (
    <TouchableOpacity
      key={session.id}
      style={styles.sessionCard}
      onPress={() => setSelectedSession(session)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.sessionDate}>{formatDate(session.startTime)}</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={12} color="#9B7EC6" />
            <Text style={styles.durationText}>{formatDuration(session.duration)}</Text>
          </View>
        </View>
        
        <View style={styles.cardHeaderRight}>
          {session.hasBreakthrough && (
            <View style={styles.breakthroughBadge}>
              <Ionicons name="star" size={12} color="#F5A623" />
            </View>
          )}
          {session.isBookmarked && (
            <Ionicons name="bookmark" size={16} color="#9B7EC6" />
          )}
        </View>
      </View>
      
      {/* Emotion Journey */}
      <View style={styles.emotionJourney}>
        <View style={styles.emotionPoint}>
          <Text style={styles.emotionEmoji}>
            {EMOTION_ICONS[session.startEmotion] || '😐'}
          </Text>
          <Text style={styles.emotionLabel}>{session.startEmotion}</Text>
        </View>
        
        <View style={styles.journeyArrow}>
          <View style={styles.journeyLine} />
          {renderEmotionShift(session.emotionShift)}
          <View style={styles.journeyLine} />
        </View>
        
        <View style={styles.emotionPoint}>
          <Text style={styles.emotionEmoji}>
            {EMOTION_ICONS[session.endEmotion] || '😐'}
          </Text>
          <Text style={styles.emotionLabel}>{session.endEmotion}</Text>
        </View>
      </View>
      
      {/* Techniques used */}
      {session.techniquesUsed.length > 0 && (
        <View style={styles.techniquesList}>
          {session.techniquesUsed.slice(0, 3).map((tech, i) => (
            <View key={i} style={styles.techniquePill}>
              <Text style={styles.techniquePillText}>{tech}</Text>
            </View>
          ))}
          {session.techniquesUsed.length > 3 && (
            <Text style={styles.moreText}>+{session.techniquesUsed.length - 3}</Text>
          )}
        </View>
      )}
      
      {/* Preview insight */}
      {session.insights.length > 0 && (
        <View style={styles.insightPreview}>
          <Ionicons 
            name={session.insights[0].icon as any} 
            size={14} 
            color={session.insights[0].color} 
          />
          <Text style={styles.insightPreviewText} numberOfLines={1}>
            {session.insights[0].description}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
  
  const renderStatsView = () => {
    if (!stats) return null;
    
    return (
      <ScrollView style={styles.statsContainer}>
        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.breakthroughCount}</Text>
            <Text style={styles.statLabel}>Breakthroughs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.averageDuration}</Text>
            <Text style={styles.statLabel}>Avg Minutes</Text>
          </View>
        </View>
        
        {/* Emotion Distribution */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Emotion Distribution</Text>
          <View style={styles.emotionBars}>
            {Object.entries(stats.emotionDistribution)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 5)
              .map(([emotion, count]) => {
                const total = Object.values(stats.emotionDistribution)
                  .reduce((sum: number, c) => sum + (c as number), 0);
                const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                
                return (
                  <View key={emotion} style={styles.emotionBar}>
                    <View style={styles.emotionBarLabel}>
                      <Text style={styles.emotionBarEmoji}>
                        {EMOTION_ICONS[emotion] || '😐'}
                      </Text>
                      <Text style={styles.emotionBarText}>{emotion}</Text>
                    </View>
                    <View style={styles.barContainer}>
                      <View 
                        style={[
                          styles.barFill,
                          { 
                            width: `${percentage}%`,
                            backgroundColor: EMOTION_COLORS[emotion] || '#B8B0C8',
                          },
                        ]} 
                      />
                    </View>
                    <Text style={styles.barCount}>{count as number}</Text>
                  </View>
                );
              })}
          </View>
        </View>
        
        {/* Most Used Techniques */}
        {stats.mostUsedTechniques.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Top Techniques</Text>
            {stats.mostUsedTechniques.map((tech: any, i: number) => (
              <View key={i} style={styles.techniqueRow}>
                <View style={styles.techniqueRank}>
                  <Text style={styles.rankNumber}>{i + 1}</Text>
                </View>
                <Text style={styles.techniqueName}>{tech.name}</Text>
                <Text style={styles.techniqueCount}>{tech.count}x</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Weekly Progress */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Weekly Progress</Text>
          <View style={styles.weeklyChart}>
            {stats.weeklyProgress.map((week: any, i: number) => (
              <View key={i} style={styles.weekBar}>
                <View 
                  style={[
                    styles.weekBarFill,
                    { 
                      height: Math.max(4, week.sessions * 15),
                      backgroundColor: week.avgShift > 0 ? '#7BC67E' : '#B8B0C8',
                    },
                  ]}
                />
                <Text style={styles.weekLabel}>W{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };
  
  const renderDetailModal = () => {
    if (!selectedSession) return null;
    
    return (
      <Modal
        visible={!!selectedSession}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSession(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedSession(null)}>
              <Ionicons name="close" size={24} color="#2D2D44" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Session Details</Text>
            <TouchableOpacity onPress={() => handleToggleBookmark(selectedSession.id)}>
              <Ionicons 
                name={selectedSession.isBookmarked ? 'bookmark' : 'bookmark-outline'} 
                size={24} 
                color="#9B7EC6" 
              />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Session Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailDate}>
                {new Date(selectedSession.startTime).toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.detailTime}>
                {new Date(selectedSession.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })} - {formatDuration(selectedSession.duration)}
              </Text>
              
              {selectedSession.hasBreakthrough && (
                <View style={styles.breakthroughBanner}>
                  <Ionicons name="star" size={20} color="#F5A623" />
                  <Text style={styles.breakthroughText}>Breakthrough Session!</Text>
                </View>
              )}
            </View>
            
            {/* Emotion Timeline */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Emotion Journey</Text>
              <View style={styles.timelineContainer}>
                {selectedSession.emotionTimeline.map((point, i) => {
                  const isFirst = i === 0;
                  const isLast = i === selectedSession.emotionTimeline.length - 1;
                  const showLabel = isFirst || isLast || 
                    (i > 0 && point.emotion !== selectedSession.emotionTimeline[i - 1].emotion);
                  
                  if (!showLabel) return null;
                  
                  return (
                    <View key={i} style={styles.timelinePoint}>
                      <View style={styles.timelineTime}>
                        <Text style={styles.timelineTimeText}>
                          {formatDuration(point.time)}
                        </Text>
                      </View>
                      <View style={styles.timelineDot}>
                        <View 
                          style={[
                            styles.dot,
                            { backgroundColor: EMOTION_COLORS[point.emotion] },
                          ]} 
                        />
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineEmoji}>
                          {EMOTION_ICONS[point.emotion]}
                        </Text>
                        <Text style={styles.timelineEmotion}>{point.emotion}</Text>
                        <Text style={styles.timelineIntensity}>
                          {(point.intensity * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            
            {/* Coaching Moments */}
            {selectedSession.coachingMoments.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Coaching Moments</Text>
                {selectedSession.coachingMoments.map((moment, i) => (
                  <View key={i} style={styles.coachingMoment}>
                    <View style={styles.momentHeader}>
                      <Ionicons 
                        name={
                          moment.type === 'technique' ? 'bulb-outline' :
                          moment.type === 'suggestion' ? 'chatbubble-outline' :
                          moment.type === 'intervention' ? 'alert-circle-outline' :
                          moment.type === 'praise' ? 'heart-outline' :
                          'refresh-outline'
                        } 
                        size={16} 
                        color="#9B7EC6" 
                      />
                      <Text style={styles.momentTime}>{formatDuration(moment.time)}</Text>
                    </View>
                    <Text style={styles.momentContent}>{moment.content}</Text>
                    {moment.techniqueName && (
                      <View style={styles.momentTechnique}>
                        <Text style={styles.momentTechniqueText}>{moment.techniqueName}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Insights */}
            {selectedSession.insights.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Session Insights</Text>
                {selectedSession.insights.map((insight, i) => (
                  <View key={i} style={styles.insightCard}>
                    <View 
                      style={[
                        styles.insightIcon,
                        { backgroundColor: insight.color + '20' },
                      ]}
                    >
                      <Ionicons 
                        name={insight.icon as any} 
                        size={20} 
                        color={insight.color} 
                      />
                    </View>
                    <View style={styles.insightContent}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightDescription}>{insight.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* User Rating */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Rate This Session</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => rateSession(selectedSession.id, star).then(loadData)}
                  >
                    <Ionicons
                      name={(selectedSession.userRating || 0) >= star ? 'star' : 'star-outline'}
                      size={32}
                      color="#F5A623"
                      style={styles.ratingStar}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Delete Button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSession(selectedSession.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#E74C3C" />
              <Text style={styles.deleteText}>Delete Session</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="hourglass-outline" size={48} color="#9B7EC6" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }
  
  return (
    <LinearGradient colors={['#F8F7FC', '#EDE9F8']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2D2D44" />
          </TouchableOpacity>
          <Text style={styles.title}>Session Replay</Text>
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <Ionicons name="filter-outline" size={24} color="#9B7EC6" />
          </TouchableOpacity>
        </View>
        
        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'history' && styles.toggleActive]}
            onPress={() => setViewMode('history')}
          >
            <Ionicons 
              name="list-outline" 
              size={18} 
              color={viewMode === 'history' ? '#FFFFFF' : '#9B7EC6'} 
            />
            <Text style={[styles.toggleText, viewMode === 'history' && styles.toggleTextActive]}>
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'stats' && styles.toggleActive]}
            onPress={() => setViewMode('stats')}
          >
            <Ionicons 
              name="analytics-outline" 
              size={18} 
              color={viewMode === 'stats' ? '#FFFFFF' : '#9B7EC6'} 
            />
            <Text style={[styles.toggleText, viewMode === 'stats' && styles.toggleTextActive]}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>
        
        {viewMode === 'history' ? (
          <ScrollView
            style={styles.sessionsContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="albums-outline" size={64} color="#B8B0C8" />
                <Text style={styles.emptyTitle}>No Sessions Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Complete a coaching session to see it here
                </Text>
                <TouchableOpacity style={styles.demoButton} onPress={handleGenerateDemo}>
                  <Ionicons name="add-circle-outline" size={20} color="#9B7EC6" />
                  <Text style={styles.demoButtonText}>Generate Demo Session</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {sessions.map(renderSessionCard)}
                <View style={styles.bottomPadding} />
              </>
            )}
          </ScrollView>
        ) : (
          renderStatsView()
        )}
        
        {renderDetailModal()}
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
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: '#9B7EC6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  sessionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sessionCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D44',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#9B7EC6',
    fontWeight: '500',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakthroughBadge: {
    backgroundColor: '#FFF5E5',
    padding: 4,
    borderRadius: 8,
  },
  emotionJourney: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emotionPoint: {
    alignItems: 'center',
    width: 80,
  },
  emotionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 12,
    color: '#6B6B80',
    textTransform: 'capitalize',
  },
  journeyArrow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  journeyLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 4,
  },
  shiftText: {
    fontSize: 12,
    fontWeight: '600',
  },
  techniquesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  techniquePill: {
    backgroundColor: '#F0ECF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  techniquePillText: {
    fontSize: 12,
    color: '#9B7EC6',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#6B6B80',
    alignSelf: 'center',
  },
  insightPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  insightPreviewText: {
    flex: 1,
    fontSize: 13,
    color: '#6B6B80',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D44',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B6B80',
    textAlign: 'center',
    marginTop: 8,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  bottomPadding: {
    height: 40,
  },
  
  // Stats View
  statsContainer: {
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
    flex: 1,
    minWidth: (SCREEN_WIDTH - 52) / 2,
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
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
    marginBottom: 16,
  },
  emotionBars: {
    gap: 12,
  },
  emotionBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: 8,
  },
  emotionBarEmoji: {
    fontSize: 18,
  },
  emotionBarText: {
    fontSize: 13,
    color: '#2D2D44',
    textTransform: 'capitalize',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 12,
    color: '#6B6B80',
  },
  techniqueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  techniqueRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0ECF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  techniqueName: {
    flex: 1,
    fontSize: 14,
    color: '#2D2D44',
  },
  techniqueCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EC6',
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingTop: 20,
  },
  weekBar: {
    alignItems: 'center',
    width: 40,
  },
  weekBarFill: {
    width: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  weekLabel: {
    fontSize: 12,
    color: '#6B6B80',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D44',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D44',
  },
  detailTime: {
    fontSize: 14,
    color: '#6B6B80',
    marginTop: 4,
  },
  breakthroughBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5E5',
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  breakthroughText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5A623',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B80',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelinePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineTime: {
    width: 50,
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  timelineTimeText: {
    fontSize: 12,
    color: '#6B6B80',
    fontFamily: 'monospace',
  },
  timelineDot: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
    minHeight: 20,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingBottom: 16,
    gap: 8,
  },
  timelineEmoji: {
    fontSize: 18,
  },
  timelineEmotion: {
    fontSize: 14,
    color: '#2D2D44',
    textTransform: 'capitalize',
    flex: 1,
  },
  timelineIntensity: {
    fontSize: 12,
    color: '#6B6B80',
  },
  coachingMoment: {
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  momentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  momentTime: {
    fontSize: 12,
    color: '#9B7EC6',
    fontFamily: 'monospace',
  },
  momentContent: {
    fontSize: 14,
    color: '#2D2D44',
    lineHeight: 20,
  },
  momentTechnique: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  momentTechniqueText: {
    fontSize: 12,
    color: '#9B7EC6',
    fontWeight: '500',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D44',
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 13,
    color: '#6B6B80',
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ratingStar: {
    marginHorizontal: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 40,
  },
  deleteText: {
    fontSize: 14,
    color: '#E74C3C',
    fontWeight: '500',
  },
});
