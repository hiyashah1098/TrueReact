/**
 * TrueReact - Technique Bookmarks Component
 * 
 * Displays bookmarked CBT/DBT techniques with
 * quick access and usage tracking.
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
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  TechniqueType,
  BookmarkedTechnique,
  getBookmarks,
  toggleBookmark,
  recordTechniqueUsage,
  getMostUsedTechniques,
  getRecentlyUsedTechniques,
} from '../services/techniqueBookmarks';

// Common CBT/DBT techniques
const TECHNIQUE_DATABASE: TechniqueType[] = [
  // CBT Techniques
  { id: 'cbt_cognitive_restructuring', name: 'Cognitive Restructuring', type: 'cbt', category: 'thought', description: 'Identify and challenge negative thought patterns by examining evidence and considering alternative perspectives.' },
  { id: 'cbt_thought_record', name: 'Thought Record', type: 'cbt', category: 'thought', description: 'Document situations, emotions, automatic thoughts, and balanced responses to track patterns.' },
  { id: 'cbt_decatastrophizing', name: 'Decatastrophizing', type: 'cbt', category: 'thought', description: 'Challenge worst-case thinking by evaluating realistic probabilities and coping strategies.' },
  { id: 'cbt_behavioral_activation', name: 'Behavioral Activation', type: 'cbt', category: 'behavior', description: 'Schedule enjoyable activities to improve mood and break cycles of avoidance.' },
  { id: 'cbt_exposure', name: 'Gradual Exposure', type: 'cbt', category: 'behavior', description: 'Face feared situations in small steps to reduce anxiety over time.' },
  { id: 'cbt_problem_solving', name: 'Problem Solving', type: 'cbt', category: 'behavior', description: 'Break down problems systematically: define, brainstorm, evaluate, implement, review.' },
  
  // DBT Techniques
  { id: 'dbt_mindfulness', name: 'Mindful Awareness', type: 'dbt', category: 'mindfulness', description: 'Observe and describe experiences without judgment, participating fully in the moment.' },
  { id: 'dbt_wise_mind', name: 'Wise Mind', type: 'dbt', category: 'mindfulness', description: 'Access the balanced state between emotional mind and reasonable mind.' },
  { id: 'dbt_tipp', name: 'TIPP Skills', type: 'dbt', category: 'distress', description: 'Temperature, Intense exercise, Paced breathing, Progressive relaxation for immediate relief.' },
  { id: 'dbt_stop', name: 'STOP Skill', type: 'dbt', category: 'distress', description: 'Stop, Take a step back, Observe, Proceed mindfully in crisis moments.' },
  { id: 'dbt_accepts', name: 'ACCEPTS', type: 'dbt', category: 'distress', description: 'Activities, Contributing, Comparisons, Emotions, Push away, Thoughts, Sensations for distraction.' },
  { id: 'dbt_self_soothe', name: 'Self-Soothe', type: 'dbt', category: 'distress', description: 'Use five senses to calm: sight, sound, smell, taste, touch.' },
  { id: 'dbt_opposite_action', name: 'Opposite Action', type: 'dbt', category: 'emotion', description: 'Act opposite to emotional urges when emotions aren\'t justified by the situation.' },
  { id: 'dbt_check_facts', name: 'Check the Facts', type: 'dbt', category: 'emotion', description: 'Examine if emotional responses match the actual situation and facts.' },
  { id: 'dbt_dear_man', name: 'DEAR MAN', type: 'dbt', category: 'interpersonal', description: 'Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate for effective communication.' },
  { id: 'dbt_give', name: 'GIVE Skills', type: 'dbt', category: 'interpersonal', description: 'Gentle, Interested, Validate, Easy manner for maintaining relationships.' },
  { id: 'dbt_fast', name: 'FAST Skills', type: 'dbt', category: 'interpersonal', description: 'Fair, Apologies (limit), Stick to values, Truthful for self-respect.' },
  
  // Breathing Techniques
  { id: 'breathing_478', name: '4-7-8 Breathing', type: 'breathing', category: 'calm', description: 'Inhale 4 seconds, hold 7 seconds, exhale 8 seconds. Activates parasympathetic nervous system.' },
  { id: 'breathing_box', name: 'Box Breathing', type: 'breathing', category: 'calm', description: 'Inhale, hold, exhale, hold - each for 4 seconds. Used by Navy SEALs for stress.' },
  { id: 'breathing_diaphragmatic', name: 'Belly Breathing', type: 'breathing', category: 'calm', description: 'Deep diaphragmatic breathing with hand on belly, feeling it rise and fall.' },
  
  // Grounding Techniques
  { id: 'grounding_54321', name: '5-4-3-2-1 Grounding', type: 'grounding', category: 'present', description: 'Notice 5 things you see, 4 hear, 3 can touch, 2 smell, 1 taste.' },
  { id: 'grounding_body_scan', name: 'Body Scan', type: 'grounding', category: 'present', description: 'Progressively notice sensations from head to toe without changing them.' },
  { id: 'grounding_anchoring', name: 'Anchoring', type: 'grounding', category: 'present', description: 'Feel feet on ground, hands on surface. Notice weight and pressure sensations.' },
];

type ViewMode = 'bookmarks' | 'browse' | 'search';
type SortMode = 'name' | 'recent' | 'usage';

type TechniqueBookmarksProps = {
  visible: boolean;
  onClose: () => void;
  onSelectTechnique?: (technique: TechniqueType) => void;
};

export function TechniqueBookmarks({ 
  visible, 
  onClose,
  onSelectTechnique,
}: TechniqueBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkedTechnique[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('bookmarks');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBookmarks();
      setBookmarks(data);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadBookmarks();
    }
  }, [visible, loadBookmarks]);

  const handleToggleBookmark = async (technique: TechniqueType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await toggleBookmark(technique);
    setBookmarks(updated);
  };

  const handleSelectTechnique = async (technique: TechniqueType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await recordTechniqueUsage(technique.id);
    await loadBookmarks(); // Refresh to update usage stats
    onSelectTechnique?.(technique);
  };

  const isBookmarked = (id: string) => {
    return bookmarks.some(b => b.technique.id === id);
  };

  const getFilteredTechniques = () => {
    let techniques = viewMode === 'bookmarks' 
      ? bookmarks.map(b => ({ ...b.technique, usageCount: b.usageCount, lastUsed: b.lastUsed }))
      : TECHNIQUE_DATABASE;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      techniques = techniques.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      techniques = techniques.filter(t => t.type === selectedCategory);
    }

    // Sort
    if (viewMode === 'bookmarks') {
      if (sortMode === 'recent') {
        techniques.sort((a: any, b: any) => 
          new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime()
        );
      } else if (sortMode === 'usage') {
        techniques.sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0));
      } else {
        techniques.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return techniques;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      cbt: '#6B8DD6',
      dbt: '#9B7EC6',
      breathing: '#4ECDC4',
      grounding: '#7BC67E',
    };
    return colors[type] || '#B8B0C8';
  };

  const getTypeIcon = (type: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
      cbt: 'brain',
      dbt: 'heart-pulse',
      breathing: 'weather-windy',
      grounding: 'foot-print',
    };
    return icons[type] || 'lightbulb';
  };

  const categories = [
    { id: null, label: 'All' },
    { id: 'cbt', label: 'CBT' },
    { id: 'dbt', label: 'DBT' },
    { id: 'breathing', label: 'Breathing' },
    { id: 'grounding', label: 'Grounding' },
  ];

  const renderTechniqueCard = ({ item }: { item: TechniqueType & { usageCount?: number } }) => {
    const typeColor = getTypeColor(item.type);
    const bookmarked = isBookmarked(item.id);

    return (
      <TouchableOpacity
        style={styles.techniqueCard}
        onPress={() => handleSelectTechnique(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
            <MaterialCommunityIcons 
              name={getTypeIcon(item.type)} 
              size={14} 
              color={typeColor} 
            />
            <Text style={[styles.typeLabel, { color: typeColor }]}>
              {item.type.toUpperCase()}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={() => handleToggleBookmark(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={bookmarked ? 'bookmark' : 'bookmark-outline'} 
              size={20} 
              color={bookmarked ? '#F5A623' : '#7A7290'} 
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.techniqueName}>{item.name}</Text>
        <Text style={styles.techniqueDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {item.usageCount !== undefined && item.usageCount > 0 && (
          <View style={styles.usageInfo}>
            <Ionicons name="time-outline" size={12} color="#7A7290" />
            <Text style={styles.usageText}>
              Used {item.usageCount} time{item.usageCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredTechniques = getFilteredTechniques();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#2D2845', '#1A1625']}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#F5F0E8" />
            </TouchableOpacity>
            <Text style={styles.title}>Techniques</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* View Mode Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, viewMode === 'bookmarks' && styles.activeTab]}
              onPress={() => setViewMode('bookmarks')}
            >
              <Ionicons 
                name="bookmark" 
                size={16} 
                color={viewMode === 'bookmarks' ? '#F5A623' : '#7A7290'} 
              />
              <Text style={[
                styles.tabText, 
                viewMode === 'bookmarks' && styles.activeTabText
              ]}>
                Saved ({bookmarks.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, viewMode === 'browse' && styles.activeTab]}
              onPress={() => setViewMode('browse')}
            >
              <Ionicons 
                name="library" 
                size={16} 
                color={viewMode === 'browse' ? '#F5A623' : '#7A7290'} 
              />
              <Text style={[
                styles.tabText, 
                viewMode === 'browse' && styles.activeTabText
              ]}>
                Browse All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#7A7290" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search techniques..."
              placeholderTextColor="#7A7290"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#7A7290" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id || 'all'}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort Options (for bookmarks view) */}
          {viewMode === 'bookmarks' && (
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              {(['recent', 'usage', 'name'] as SortMode[]).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.sortOption, sortMode === mode && styles.sortOptionActive]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortMode === mode && styles.sortOptionTextActive,
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Technique List */}
          <FlatList
            data={filteredTechniques}
            renderItem={renderTechniqueCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name={viewMode === 'bookmarks' ? 'bookmark-outline' : 'magnify'} 
                  size={48} 
                  color="#7A7290" 
                />
                <Text style={styles.emptyText}>
                  {viewMode === 'bookmarks' 
                    ? 'No saved techniques yet.\nBrowse and bookmark techniques to see them here.'
                    : 'No techniques match your search.'}
                </Text>
              </View>
            )}
          />
        </LinearGradient>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F5F0E8',
  },
  categoryScroll: {
    maxHeight: 44,
    marginTop: 12,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
    borderColor: '#9B7EC6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A7290',
  },
  categoryChipTextActive: {
    color: '#F5F0E8',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    color: '#7A7290',
  },
  sortOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(155, 126, 198, 0.2)',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#7A7290',
  },
  sortOptionTextActive: {
    color: '#F5F0E8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  techniqueCard: {
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bookmarkButton: {
    padding: 4,
  },
  techniqueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F0E8',
    marginBottom: 6,
  },
  techniqueDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B8B0C8',
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  usageText: {
    fontSize: 11,
    color: '#7A7290',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#7A7290',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
});

export default TechniqueBookmarks;
