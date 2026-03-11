/**
 * TrueReact - Voice Journal Screen
 * 
 * Full-featured voice journaling with recording,
 * transcription display, emotion analysis, and history.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useVoiceJournal } from '../hooks/useVoiceJournal';
import {
  getJournalEntries,
  deleteJournalEntry,
  toggleFavorite,
  getJournalStats,
  formatEntryAsText,
  JournalEntry,
  JournalStats,
} from '../services/voiceJournal';

const { width } = Dimensions.get('window');

type ViewMode = 'record' | 'history' | 'stats';

export function VoiceJournalScreen({ navigation }: { navigation: any }) {
  const [viewMode, setViewMode] = useState<ViewMode>('record');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showEntryDetail, setShowEntryDetail] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  const pulseAnim = useState(new Animated.Value(1))[0];

  const {
    state,
    duration,
    transcription,
    currentEntry,
    isRecording,
    isPaused,
    isProcessing,
    audioLevels,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    reset,
  } = useVoiceJournal({
    onEntryComplete: (entry) => {
      loadData();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  // Pulse animation when recording
  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, pulseAnim]);

  // Load data on mount and view change
  const loadData = useCallback(async () => {
    const [entriesData, statsData] = await Promise.all([
      getJournalEntries(),
      getJournalStats(),
    ]);
    setEntries(entriesData);
    setStats(statsData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteJournalEntry(entry.id);
            loadData();
            setShowEntryDetail(false);
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (entry: JournalEntry) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleFavorite(entry.id);
    loadData();
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry({ ...entry, isFavorite: !entry.isFavorite });
    }
  };

  const handlePlayAudio = async (entry: JournalEntry) => {
    if (!entry.audioUri) return;

    try {
      if (isPlaying && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: entry.audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      anxious: '#F5A623',
      sad: '#6B8DD6',
      angry: '#E85A5A',
      happy: '#7BC67E',
      calm: '#4ECDC4',
      confused: '#C4B0E0',
      hopeful: '#FFD166',
      tired: '#8B7E8E',
    };
    return colors[emotion] || '#9B7EC6';
  };

  const renderRecordView = () => (
    <View style={styles.recordContainer}>
      {/* Waveform Visualizer */}
      <View style={styles.waveformContainer}>
        {audioLevels.length > 0 ? (
          <View style={styles.waveform}>
            {audioLevels.map((level, index) => (
              <View
                key={index}
                style={[
                  styles.waveformBar,
                  { height: 20 + level * 60 },
                ]}
              />
            ))}
          </View>
        ) : (
          <MaterialCommunityIcons
            name="microphone-outline"
            size={80}
            color="#7A7290"
          />
        )}
      </View>

      {/* Timer */}
      <Text style={styles.timerText}>{formatDuration(duration)}</Text>
      <Text style={styles.timerSubtext}>
        {state === 'idle' && 'Tap to start recording'}
        {isRecording && 'Recording...'}
        {isPaused && 'Paused'}
        {isProcessing && 'Processing...'}
        {state === 'complete' && 'Entry saved!'}
      </Text>

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        {state === 'idle' && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={['#E85A5A', '#C44545']}
                style={styles.recordButtonInner}
              >
                <Ionicons name="mic" size={40} color="#FFF" />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        )}

        {(isRecording || isPaused) && (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={cancelRecording}
            >
              <Ionicons name="close" size={28} color="#E85A5A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recordButton}
              onPress={isPaused ? resumeRecording : pauseRecording}
            >
              <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                <LinearGradient
                  colors={isRecording ? ['#E85A5A', '#C44545'] : ['#F5A623', '#D4901C']}
                  style={styles.recordButtonInner}
                >
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={36}
                    color="#FFF"
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={stopRecording}
            >
              <Ionicons name="checkmark" size={28} color="#7BC67E" />
            </TouchableOpacity>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={48}
              color="#9B7EC6"
            />
            <Text style={styles.processingText}>Analyzing your journal...</Text>
          </View>
        )}

        {state === 'complete' && currentEntry && (
          <View style={styles.completeContainer}>
            <View style={styles.emotionTags}>
              {currentEntry.emotions.map((emotion, index) => (
                <View
                  key={index}
                  style={[
                    styles.emotionTag,
                    { backgroundColor: `${getEmotionColor(emotion.primary)}30` },
                  ]}
                >
                  <Text
                    style={[
                      styles.emotionTagText,
                      { color: getEmotionColor(emotion.primary) },
                    ]}
                  >
                    {emotion.primary}
                  </Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.transcriptionPreview} numberOfLines={4}>
              {currentEntry.transcription}
            </Text>

            <TouchableOpacity
              style={styles.newEntryButton}
              onPress={reset}
            >
              <Ionicons name="add" size={20} color="#F5F0E8" />
              <Text style={styles.newEntryText}>New Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: JournalEntry }) => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => {
          setSelectedEntry(item);
          setShowEntryDetail(true);
        }}
      >
        <View style={styles.historyItemHeader}>
          <View style={styles.historyDate}>
            <Text style={styles.historyDateText}>{formattedDate}</Text>
            <Text style={styles.historyTimeText}>{formattedTime}</Text>
          </View>
          
          <View style={styles.historyMeta}>
            <Text style={styles.historyDuration}>
              {formatDuration(item.audioDuration)}
            </Text>
            <TouchableOpacity onPress={() => handleToggleFavorite(item)}>
              <Ionicons
                name={item.isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={item.isFavorite ? '#E85A5A' : '#7A7290'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.historyTranscription} numberOfLines={2}>
          {item.transcription || 'Processing...'}
        </Text>

        {item.emotions.length > 0 && (
          <View style={styles.historyEmotions}>
            {item.emotions.slice(0, 3).map((emotion, index) => (
              <View
                key={index}
                style={[
                  styles.historyEmotionTag,
                  { backgroundColor: `${getEmotionColor(emotion.primary)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.historyEmotionText,
                    { color: getEmotionColor(emotion.primary) },
                  ]}
                >
                  {emotion.primary}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHistoryView = () => (
    <View style={styles.historyContainer}>
      <FlatList
        data={entries}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.historyList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="book-open-outline"
              size={64}
              color="#7A7290"
            />
            <Text style={styles.emptyText}>No journal entries yet</Text>
            <Text style={styles.emptySubtext}>
              Start recording to create your first entry
            </Text>
          </View>
        )}
      />
    </View>
  );

  const renderStatsView = () => (
    <ScrollView style={styles.statsContainer} showsVerticalScrollIndicator={false}>
      {stats && (
        <>
          {/* Summary Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="book-multiple" size={28} color="#9B7EC6" />
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="clock-outline" size={28} color="#4ECDC4" />
              <Text style={styles.statValue}>
                {Math.round(stats.totalDuration / 60)}
              </Text>
              <Text style={styles.statLabel}>Minutes Recorded</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="fire" size={28} color="#F5A623" />
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="trophy" size={28} color="#FFD166" />
              <Text style={styles.statValue}>{stats.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>

          {/* Weekly Activity */}
          <View style={styles.weeklySection}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.weeklyChart}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <View key={index} style={styles.weeklyDay}>
                  <View style={styles.weeklyBarContainer}>
                    <View
                      style={[
                        styles.weeklyBar,
                        {
                          height: stats.weeklyCount[index] > 0
                            ? Math.min(stats.weeklyCount[index] * 20, 60)
                            : 4,
                          backgroundColor: stats.weeklyCount[index] > 0
                            ? '#9B7EC6'
                            : '#3A3550',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.weeklyDayLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Emotion Breakdown */}
          {Object.keys(stats.emotionBreakdown).length > 0 && (
            <View style={styles.emotionSection}>
              <Text style={styles.sectionTitle}>Emotion Patterns</Text>
              {Object.entries(stats.emotionBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([emotion, count]) => (
                  <View key={emotion} style={styles.emotionRow}>
                    <View
                      style={[
                        styles.emotionDot,
                        { backgroundColor: getEmotionColor(emotion) },
                      ]}
                    />
                    <Text style={styles.emotionName}>{emotion}</Text>
                    <View style={styles.emotionBarContainer}>
                      <View
                        style={[
                          styles.emotionBar,
                          {
                            width: `${(count / stats.totalEntries) * 100}%`,
                            backgroundColor: getEmotionColor(emotion),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.emotionCount}>{count}</Text>
                  </View>
                ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderEntryDetailModal = () => (
    <Modal
      visible={showEntryDetail}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEntryDetail(false)}
    >
      <View style={styles.modalContainer}>
        <LinearGradient colors={['#2D2845', '#1A1625']} style={styles.modalGradient}>
          {selectedEntry && (
            <>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowEntryDetail(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#F5F0E8" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Journal Entry</Text>
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(selectedEntry)}
                >
                  <Ionicons
                    name={selectedEntry.isFavorite ? 'heart' : 'heart-outline'}
                    size={24}
                    color={selectedEntry.isFavorite ? '#E85A5A' : '#7A7290'}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Date & Duration */}
                <View style={styles.entryMeta}>
                  <Text style={styles.entryDate}>
                    {new Date(selectedEntry.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.entryDuration}>
                    {formatDuration(selectedEntry.audioDuration)}
                  </Text>
                </View>

                {/* Play Button */}
                {selectedEntry.audioUri && (
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlayAudio(selectedEntry)}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={24}
                      color="#F5F0E8"
                    />
                    <Text style={styles.playButtonText}>
                      {isPlaying ? 'Pause' : 'Play Recording'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Emotions */}
                {selectedEntry.emotions.length > 0 && (
                  <View style={styles.entryEmotions}>
                    <Text style={styles.entrySectionTitle}>Emotions Detected</Text>
                    <View style={styles.emotionTagsLarge}>
                      {selectedEntry.emotions.map((emotion, index) => (
                        <View
                          key={index}
                          style={[
                            styles.emotionTagLarge,
                            { backgroundColor: `${getEmotionColor(emotion.primary)}25` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.emotionTagLargeText,
                              { color: getEmotionColor(emotion.primary) },
                            ]}
                          >
                            {emotion.primary}
                          </Text>
                          <View style={styles.emotionIntensity}>
                            {[1, 2, 3, 4, 5].map((level) => (
                              <View
                                key={level}
                                style={[
                                  styles.intensityDot,
                                  {
                                    backgroundColor:
                                      level <= Math.round(emotion.intensity * 5)
                                        ? getEmotionColor(emotion.primary)
                                        : '#3A3550',
                                  },
                                ]}
                              />
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Transcription */}
                <View style={styles.transcriptionSection}>
                  <Text style={styles.entrySectionTitle}>Transcription</Text>
                  <Text style={styles.transcriptionText}>
                    {selectedEntry.transcription || 'Processing...'}
                  </Text>
                </View>

                {/* Insights */}
                {selectedEntry.insights && selectedEntry.insights.length > 0 && (
                  <View style={styles.insightsSection}>
                    <Text style={styles.entrySectionTitle}>
                      <MaterialCommunityIcons name="lightbulb" size={16} color="#F5A623" />
                      {' '}Insights
                    </Text>
                    {selectedEntry.insights.map((insight, index) => (
                      <View key={index} style={styles.insightItem}>
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEntry(selectedEntry)}
                >
                  <Ionicons name="trash-outline" size={18} color="#E85A5A" />
                  <Text style={styles.deleteButtonText}>Delete Entry</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2D2845', '#1A1625']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#F5F0E8" />
          </TouchableOpacity>
          <Text style={styles.title}>Voice Journal</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* View Tabs */}
        <View style={styles.tabContainer}>
          {(['record', 'history', 'stats'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.tab, viewMode === mode && styles.activeTab]}
              onPress={() => setViewMode(mode)}
            >
              <Ionicons
                name={
                  mode === 'record'
                    ? 'mic'
                    : mode === 'history'
                    ? 'list'
                    : 'bar-chart'
                }
                size={18}
                color={viewMode === mode ? '#F5F0E8' : '#7A7290'}
              />
              <Text
                style={[styles.tabText, viewMode === mode && styles.activeTabText]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {viewMode === 'record' && renderRecordView()}
        {viewMode === 'history' && renderHistoryView()}
        {viewMode === 'stats' && renderStatsView()}

        {/* Entry Detail Modal */}
        {renderEntryDetailModal()}
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7A7290',
  },
  activeTabText: {
    color: '#F5F0E8',
  },

  // Record View
  recordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  waveformContainer: {
    width: width - 80,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 80,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#9B7EC6',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '200',
    color: '#F5F0E8',
    fontVariant: ['tabular-nums'],
  },
  timerSubtext: {
    fontSize: 14,
    color: '#7A7290',
    marginTop: 8,
    marginBottom: 40,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
  },
  recordButtonInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(45, 40, 69, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(155, 126, 198, 0.2)',
  },
  processingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    fontSize: 16,
    color: '#B8B0C8',
  },
  completeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  emotionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emotionTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  emotionTagText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  transcriptionPreview: {
    fontSize: 14,
    lineHeight: 22,
    color: '#B8B0C8',
    textAlign: 'center',
    marginBottom: 24,
  },
  newEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    borderRadius: 20,
  },
  newEntryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F0E8',
  },

  // History View
  historyContainer: {
    flex: 1,
    paddingTop: 16,
  },
  historyList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  historyItem: {
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.1)',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  historyDate: {},
  historyDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F0E8',
  },
  historyTimeText: {
    fontSize: 12,
    color: '#7A7290',
    marginTop: 2,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyDuration: {
    fontSize: 12,
    color: '#7A7290',
  },
  historyTranscription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B8B0C8',
  },
  historyEmotions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  historyEmotionTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyEmotionText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F0E8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7A7290',
    marginTop: 8,
  },

  // Stats View
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F5F0E8',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7A7290',
    marginTop: 4,
  },
  weeklySection: {
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F0E8',
    marginBottom: 16,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  weeklyDay: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyBarContainer: {
    height: 60,
    justifyContent: 'flex-end',
  },
  weeklyBar: {
    width: 16,
    borderRadius: 4,
  },
  weeklyDayLabel: {
    fontSize: 11,
    color: '#7A7290',
    marginTop: 6,
  },
  emotionSection: {
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emotionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emotionName: {
    width: 80,
    fontSize: 13,
    color: '#B8B0C8',
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  emotionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#3A3550',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  emotionBar: {
    height: 8,
    borderRadius: 4,
  },
  emotionCount: {
    fontSize: 12,
    color: '#7A7290',
    width: 24,
    textAlign: 'right',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  entryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  entryDate: {
    fontSize: 15,
    color: '#B8B0C8',
  },
  entryDuration: {
    fontSize: 14,
    color: '#7A7290',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F5F0E8',
  },
  entryEmotions: {
    marginBottom: 24,
  },
  entrySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7290',
    marginBottom: 12,
  },
  emotionTagsLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionTagLarge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emotionTagLargeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emotionIntensity: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
  intensityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transcriptionSection: {
    marginBottom: 24,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#F5F0E8',
  },
  insightsSection: {
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  insightItem: {
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#F5F0E8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 90, 90, 0.3)',
    marginBottom: 32,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#E85A5A',
  },
});

export default VoiceJournalScreen;
