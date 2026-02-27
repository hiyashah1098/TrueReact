/**
 * TrueReact - Session History Screen
 * 
 * Displays a list of past coaching sessions with details
 * and the ability to view individual session feedback.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getSessionHistory, CoachingSession, CoachingFeedbackEntry } from '../services/firebase';

interface HistoryScreenProps {
  navigation: any;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    
    try {
      const history = await getSessionHistory(user.uid, 50);
      setSessions(history);
    } catch (error) {
      console.error('Error fetching session history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSessions();
  }, [fetchSessions]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today at ' + date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return 'Yesterday at ' + date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'expression': return 'happy-outline';
      case 'voice': return 'mic-outline';
      case 'posture': return 'body-outline';
      default: return 'chatbubble-outline';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'expression': return '#f59e0b';
      case 'voice': return '#8b5cf6';
      case 'posture': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'high': return '#ef4444';
      case 'normal': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const openSessionDetail = (session: CoachingSession) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  const renderSessionItem = ({ item }: { item: CoachingSession }) => (
    <TouchableOpacity 
      style={styles.sessionCard}
      onPress={() => openSessionDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionDateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#8b8b8b" />
          <Text style={styles.sessionDate}>{formatDate(item.startedAt)}</Text>
        </View>
        {item.safeStateTriggered && (
          <View style={styles.safeStateBadge}>
            <Ionicons name="pause-circle" size={14} color="#f59e0b" />
            <Text style={styles.safeStateText}>Paused</Text>
          </View>
        )}
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={20} color="#e94560" />
          <Text style={styles.statValue}>{formatDuration(item.duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="chatbubbles-outline" size={20} color="#e94560" />
          <Text style={styles.statValue}>{item.feedbackCount}</Text>
          <Text style={styles.statLabel}>Coaching Tips</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="analytics-outline" size={20} color="#e94560" />
          <Text style={styles.statValue}>
            {item.feedback.filter(f => f.urgency === 'high').length}
          </Text>
          <Text style={styles.statLabel}>Key Moments</Text>
        </View>
      </View>

      {item.feedback.length > 0 && (
        <View style={styles.previewFeedback}>
          <View style={styles.feedbackPreviewItem}>
            <Ionicons 
              name={getCategoryIcon(item.feedback[0].category) as any} 
              size={14} 
              color={getCategoryColor(item.feedback[0].category)} 
            />
            <Text style={styles.feedbackPreviewText} numberOfLines={1}>
              {item.feedback[0].observation}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.viewDetails}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Ionicons name="chevron-forward" size={16} color="#e94560" />
      </View>
    </TouchableOpacity>
  );

  const renderFeedbackItem = (feedback: CoachingFeedbackEntry, index: number) => (
    <View key={index} style={styles.feedbackItem}>
      <View style={[styles.feedbackIcon, { backgroundColor: getCategoryColor(feedback.category) + '20' }]}>
        <Ionicons 
          name={getCategoryIcon(feedback.category) as any} 
          size={20} 
          color={getCategoryColor(feedback.category)} 
        />
      </View>
      <View style={styles.feedbackContent}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.feedbackCategory}>
            {feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1)}
          </Text>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(feedback.urgency) + '20' }]}>
            <Text style={[styles.urgencyText, { color: getUrgencyColor(feedback.urgency) }]}>
              {feedback.urgency}
            </Text>
          </View>
        </View>
        <Text style={styles.feedbackObservation}>{feedback.observation}</Text>
        <Text style={styles.feedbackSuggestion}>💡 {feedback.suggestion}</Text>
        <Text style={styles.feedbackTime}>
          {feedback.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#444" />
      <Text style={styles.emptyTitle}>No Sessions Yet</Text>
      <Text style={styles.emptyText}>
        Complete your first coaching session to see your history here.
      </Text>
      <TouchableOpacity 
        style={styles.startSessionButton}
        onPress={() => navigation.navigate('Calibration')}
      >
        <Text style={styles.startSessionText}>Start a Session</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <View style={styles.headerRight}>
          <Text style={styles.sessionCount}>{sessions.length} sessions</Text>
        </View>
      </View>

      {/* Session List */}
      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id || item.startedAt.toISOString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#e94560"
            colors={['#e94560']}
          />
        }
        ListEmptyComponent={renderEmpty}
      />

      {/* Session Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Session Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedSession && (
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Session Overview */}
              <View style={styles.overviewCard}>
                <Text style={styles.overviewDate}>
                  {formatDate(selectedSession.startedAt)}
                </Text>
                
                <View style={styles.overviewStats}>
                  <View style={styles.overviewStatItem}>
                    <Ionicons name="time" size={24} color="#e94560" />
                    <Text style={styles.overviewStatValue}>
                      {formatDuration(selectedSession.duration)}
                    </Text>
                    <Text style={styles.overviewStatLabel}>Duration</Text>
                  </View>

                  <View style={styles.overviewStatItem}>
                    <Ionicons name="chatbubbles" size={24} color="#e94560" />
                    <Text style={styles.overviewStatValue}>
                      {selectedSession.feedbackCount}
                    </Text>
                    <Text style={styles.overviewStatLabel}>Tips</Text>
                  </View>

                  <View style={styles.overviewStatItem}>
                    <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                    <Text style={styles.overviewStatValue}>
                      {selectedSession.feedback.filter(f => f.urgency === 'high').length}
                    </Text>
                    <Text style={styles.overviewStatLabel}>Priority</Text>
                  </View>
                </View>

                {selectedSession.safeStateTriggered && (
                  <View style={styles.safeStateNote}>
                    <Ionicons name="information-circle" size={20} color="#f59e0b" />
                    <Text style={styles.safeStateNoteText}>
                      Safe state was triggered during this session
                    </Text>
                  </View>
                )}
              </View>

              {/* Feedback Timeline */}
              <Text style={styles.sectionTitle}>Coaching Feedback</Text>
              
              {selectedSession.feedback.length > 0 ? (
                <View style={styles.feedbackList}>
                  {selectedSession.feedback.map((feedback, index) => 
                    renderFeedbackItem(feedback, index)
                  )}
                </View>
              ) : (
                <View style={styles.noFeedback}>
                  <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                  <Text style={styles.noFeedbackText}>
                    Great job! No coaching interventions were needed.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b8b8b',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  sessionCount: {
    color: '#8b8b8b',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  safeStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safeStateText: {
    color: '#f59e0b',
    fontSize: 12,
    marginLeft: 4,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: '#8b8b8b',
    fontSize: 11,
    marginTop: 2,
  },
  previewFeedback: {
    marginTop: 12,
  },
  feedbackPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 8,
  },
  feedbackPreviewText: {
    color: '#ccc',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  viewDetailsText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyText: {
    color: '#8b8b8b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  startSessionButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  startSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  overviewDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStatItem: {
    alignItems: 'center',
  },
  overviewStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  overviewStatLabel: {
    color: '#8b8b8b',
    fontSize: 12,
    marginTop: 4,
  },
  safeStateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  safeStateNoteText: {
    color: '#f59e0b',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  feedbackList: {
    gap: 12,
  },
  feedbackItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  feedbackIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackCategory: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  feedbackObservation: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackSuggestion: {
    color: '#e94560',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  feedbackTime: {
    color: '#666',
    fontSize: 11,
  },
  noFeedback: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  noFeedbackText: {
    color: '#8b8b8b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
