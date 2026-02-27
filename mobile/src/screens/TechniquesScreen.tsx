/**
 * TrueReact - Techniques Library Screen
 * 
 * CBT and DBT techniques for emotional regulation and social communication.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface TechniquesScreenProps {
  navigation: any;
}

type TechniqueCategory = 'cbt' | 'dbt' | 'mindfulness' | 'communication';

interface Technique {
  id: string;
  name: string;
  category: TechniqueCategory;
  shortDescription: string;
  fullDescription: string;
  steps: string[];
  whenToUse: string[];
  example?: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const techniques: Technique[] = [
  // CBT Techniques
  {
    id: 'cbt-1',
    name: 'Cognitive Restructuring',
    category: 'cbt',
    shortDescription: 'Identify and challenge negative thought patterns',
    fullDescription: 'Cognitive restructuring helps you identify automatic negative thoughts and replace them with more balanced, realistic perspectives. This technique is fundamental to CBT and helps break cycles of negative thinking.',
    steps: [
      'Notice when you have a strong negative emotion',
      'Identify the automatic thought that triggered it',
      'Examine the evidence for and against this thought',
      'Generate alternative, more balanced thoughts',
      'Notice how your emotions shift with the new perspective',
    ],
    whenToUse: [
      'Before important social situations',
      'When feeling anxious about how others perceive you',
      'After receiving criticism',
      'When catastrophizing about outcomes',
    ],
    example: 'Instead of "Everyone will think I\'m awkward," try "Some people may notice my nervousness, but most are focused on their own concerns."',
    duration: '5-10 minutes',
    difficulty: 'intermediate',
  },
  {
    id: 'cbt-2',
    name: 'Behavioral Activation',
    category: 'cbt',
    shortDescription: 'Engage in activities that align with your values',
    fullDescription: 'Behavioral activation helps combat avoidance and withdrawal by scheduling meaningful activities. Even when motivation is low, taking action can improve mood and build momentum.',
    steps: [
      'List activities you used to enjoy or that align with your values',
      'Start with small, achievable activities',
      'Schedule specific times for these activities',
      'Track your mood before and after each activity',
      'Gradually increase activity level over time',
    ],
    whenToUse: [
      'When feeling withdrawn or isolated',
      'When avoiding social situations',
      'When lacking motivation',
      'When depression affects daily functioning',
    ],
    example: 'Schedule a brief coffee meeting with a friend, even if you don\'t feel like socializing.',
    duration: 'Ongoing practice',
    difficulty: 'beginner',
  },
  {
    id: 'cbt-3',
    name: 'Thought Records',
    category: 'cbt',
    shortDescription: 'Document and analyze your thinking patterns',
    fullDescription: 'Thought records help you systematically track situations, thoughts, emotions, and behaviors. This written exercise reveals patterns and helps develop more helpful thinking habits over time.',
    steps: [
      'Describe the situation briefly',
      'Rate your emotion intensity (0-100%)',
      'Write down automatic thoughts',
      'Identify cognitive distortions present',
      'Create balanced alternative thoughts',
      'Re-rate your emotion intensity',
    ],
    whenToUse: [
      'After challenging social interactions',
      'When emotions feel overwhelming',
      'During weekly self-reflection',
      'When preparing for difficult conversations',
    ],
    duration: '10-15 minutes',
    difficulty: 'intermediate',
  },
  {
    id: 'cbt-4',
    name: 'Exposure Hierarchy',
    category: 'cbt',
    shortDescription: 'Gradually face feared situations',
    fullDescription: 'Exposure therapy involves systematically confronting feared situations in a gradual, controlled way. This helps reduce anxiety and builds confidence through repeated successful experiences.',
    steps: [
      'List situations that cause anxiety (social or otherwise)',
      'Rate each situation on a fear scale (0-100)',
      'Order situations from least to most anxiety-provoking',
      'Start with the lowest-rated situation',
      'Practice repeatedly until anxiety decreases',
      'Move to the next level when comfortable',
    ],
    whenToUse: [
      'When avoiding specific social situations',
      'To build confidence in challenging areas',
      'When anxiety limits daily activities',
    ],
    duration: 'Weeks to months',
    difficulty: 'advanced',
  },

  // DBT Techniques
  {
    id: 'dbt-1',
    name: 'STOP Skill',
    category: 'dbt',
    shortDescription: 'Pause before reacting impulsively',
    fullDescription: 'STOP is a distress tolerance skill that helps you pause before acting on strong emotions. It creates space between stimulus and response, allowing for more thoughtful choices.',
    steps: [
      'Stop - Freeze, don\'t react',
      'Take a step back - Remove yourself mentally or physically',
      'Observe - Notice what\'s happening inside and outside',
      'Proceed mindfully - Consider your options and values',
    ],
    whenToUse: [
      'When feeling intense anger or frustration',
      'Before sending an emotional message',
      'During heated conversations',
      'When urge to react is strong',
    ],
    example: 'When you feel defensive during feedback, STOP before responding. Take a breath, observe your emotions, then respond thoughtfully.',
    duration: '30 seconds - 2 minutes',
    difficulty: 'beginner',
  },
  {
    id: 'dbt-2',
    name: 'TIPP',
    category: 'dbt',
    shortDescription: 'Change body chemistry to reduce intense emotions',
    fullDescription: 'TIPP uses physiological interventions to quickly calm the nervous system. These techniques are especially helpful when emotions are too intense for cognitive strategies.',
    steps: [
      'Temperature - Apply cold to face (ice water, cold pack)',
      'Intense exercise - Brief, vigorous physical activity',
      'Paced breathing - Slow exhale longer than inhale',
      'Paired muscle relaxation - Tense and release muscles',
    ],
    whenToUse: [
      'During panic or extreme anxiety',
      'When emotions feel unbearable',
      'Before entering stressful situations',
      'When other techniques aren\'t enough',
    ],
    example: 'Hold cold water on your face for 30 seconds, then do 20 jumping jacks, then practice slow breathing.',
    duration: '5-10 minutes',
    difficulty: 'beginner',
  },
  {
    id: 'dbt-3',
    name: 'DEAR MAN',
    category: 'dbt',
    shortDescription: 'Effectively communicate needs and boundaries',
    fullDescription: 'DEAR MAN is an interpersonal effectiveness skill for asking for what you need or saying no while maintaining relationships and self-respect.',
    steps: [
      'Describe - State facts without judgment',
      'Express - Share your feelings using "I" statements',
      'Assert - Clearly state what you want or need',
      'Reinforce - Explain positive outcomes of cooperation',
      'Mindful - Stay focused on your goal',
      'Appear confident - Use confident body language',
      'Negotiate - Be willing to give to get',
    ],
    whenToUse: [
      'When making important requests',
      'When setting boundaries',
      'During difficult conversations',
      'When advocating for yourself',
    ],
    example: '"I noticed I\'ve been working overtime frequently (Describe). I feel overwhelmed (Express). I need to reduce my hours this month (Assert). This will help me deliver better quality work (Reinforce)."',
    duration: 'Variable',
    difficulty: 'intermediate',
  },
  {
    id: 'dbt-4',
    name: 'Radical Acceptance',
    category: 'dbt',
    shortDescription: 'Accept reality as it is, not as you want it to be',
    fullDescription: 'Radical acceptance means fully accepting reality without judgment, even when it\'s painful. This doesn\'t mean approval — it means letting go of fighting against what is.',
    steps: [
      'Acknowledge the present moment reality',
      'Notice when you\'re fighting against reality',
      'Remind yourself that this moment is the result of many causes',
      'Practice turning the mind toward acceptance repeatedly',
      'Use half-smile and willing hands to embody acceptance',
    ],
    whenToUse: [
      'When you can\'t change a situation',
      'When pain comes from non-acceptance',
      'When expectations don\'t match reality',
      'When grieving losses',
    ],
    example: '"This conversation didn\'t go as I hoped. I accept that it happened this way, and I can learn from it."',
    duration: 'Ongoing practice',
    difficulty: 'advanced',
  },
  {
    id: 'dbt-5',
    name: 'Opposite Action',
    category: 'dbt',
    shortDescription: 'Act opposite to unhelpful emotional urges',
    fullDescription: 'When emotions are unjustified or unhelpful, acting opposite to what the emotion urges can change the emotion itself. This technique uses the body-mind connection.',
    steps: [
      'Identify the emotion and its action urge',
      'Check if acting on the urge is helpful',
      'If not helpful, identify the opposite action',
      'Throw yourself fully into the opposite action',
      'Repeat until the emotion shifts',
    ],
    whenToUse: [
      'When feeling like avoiding (approach instead)',
      'When feeling like attacking (be gentle instead)',
      'When feeling like withdrawing (engage instead)',
      'When emotions don\'t fit the facts',
    ],
    example: 'When anxiety urges you to cancel plans, show up anyway and engage fully.',
    duration: 'Variable',
    difficulty: 'intermediate',
  },

  // Mindfulness Techniques
  {
    id: 'mind-1',
    name: '5-4-3-2-1 Grounding',
    category: 'mindfulness',
    shortDescription: 'Use senses to anchor to the present moment',
    fullDescription: 'This grounding technique uses your five senses to bring attention back to the present moment, helping reduce anxiety and dissociation.',
    steps: [
      'Notice 5 things you can SEE',
      'Notice 4 things you can TOUCH',
      'Notice 3 things you can HEAR',
      'Notice 2 things you can SMELL',
      'Notice 1 thing you can TASTE',
    ],
    whenToUse: [
      'During anxiety or panic',
      'When feeling disconnected',
      'Before important conversations',
      'When overwhelmed by thoughts',
    ],
    duration: '2-5 minutes',
    difficulty: 'beginner',
  },
  {
    id: 'mind-2',
    name: 'Body Scan',
    category: 'mindfulness',
    shortDescription: 'Systematically notice sensations throughout your body',
    fullDescription: 'Body scanning develops awareness of physical sensations and helps release tension. It builds the skill of observing without reacting.',
    steps: [
      'Find a comfortable position',
      'Close your eyes and take slow breaths',
      'Starting at your feet, notice any sensations',
      'Slowly move attention up through each body part',
      'Notice without trying to change anything',
      'End with awareness of the whole body',
    ],
    whenToUse: [
      'Daily mindfulness practice',
      'When feeling tense or stressed',
      'Before sleep',
      'After stressful situations',
    ],
    duration: '10-20 minutes',
    difficulty: 'beginner',
  },
  {
    id: 'mind-3',
    name: 'Box Breathing',
    category: 'mindfulness',
    shortDescription: 'Structured breathing pattern for calm',
    fullDescription: 'Box breathing is a simple yet powerful technique used by Navy SEALs to maintain calm under pressure. The equal timing creates a sense of balance and control.',
    steps: [
      'Inhale slowly for 4 counts',
      'Hold your breath for 4 counts',
      'Exhale slowly for 4 counts',
      'Hold empty for 4 counts',
      'Repeat for 4-8 cycles',
    ],
    whenToUse: [
      'Before presentations or meetings',
      'During moments of acute stress',
      'When needing to focus',
      'As a daily calming practice',
    ],
    duration: '2-5 minutes',
    difficulty: 'beginner',
  },

  // Communication Techniques
  {
    id: 'comm-1',
    name: 'Active Listening',
    category: 'communication',
    shortDescription: 'Fully engage and respond to the speaker',
    fullDescription: 'Active listening involves fully concentrating on what someone is saying, understanding their message, and responding thoughtfully. It builds trust and improves communication.',
    steps: [
      'Face the speaker and maintain eye contact',
      'Put away distractions',
      'Notice non-verbal cues',
      'Don\'t interrupt or plan your response',
      'Ask clarifying questions',
      'Reflect back what you heard',
      'Validate their perspective',
    ],
    whenToUse: [
      'In all important conversations',
      'When someone is sharing emotions',
      'During conflicts or disagreements',
      'When building relationships',
    ],
    duration: 'Ongoing skill',
    difficulty: 'intermediate',
  },
  {
    id: 'comm-2',
    name: 'I-Statements',
    category: 'communication',
    shortDescription: 'Express feelings without blame',
    fullDescription: 'I-statements help you express your feelings and needs without putting others on the defensive. They focus on your experience rather than criticizing others.',
    steps: [
      'Start with "I feel..."',
      'Name the specific emotion',
      'Describe the situation objectively',
      'Explain the impact on you',
      'State what you need or request',
    ],
    whenToUse: [
      'When expressing difficult emotions',
      'During conflicts',
      'When making requests',
      'When giving feedback',
    ],
    example: '"I feel frustrated when meetings run late because I have other commitments. I need us to stick to the scheduled end time."',
    duration: 'Variable',
    difficulty: 'beginner',
  },
  {
    id: 'comm-3',
    name: 'Mirroring',
    category: 'communication',
    shortDescription: 'Build rapport through subtle matching',
    fullDescription: 'Mirroring involves subtly matching another person\'s body language, tone, and energy. This creates unconscious rapport and helps people feel understood.',
    steps: [
      'Observe the other person\'s posture',
      'Subtly adopt a similar posture',
      'Match their speaking pace and volume',
      'Reflect their energy level',
      'Keep it natural, not obvious',
    ],
    whenToUse: [
      'When building new relationships',
      'In professional settings',
      'When someone seems uncomfortable',
      'During negotiations',
    ],
    duration: 'During conversations',
    difficulty: 'intermediate',
  },
];

const categoryInfo: Record<TechniqueCategory, { label: string; color: string; icon: string }> = {
  cbt: { label: 'CBT', color: '#3b82f6', icon: 'bulb-outline' },
  dbt: { label: 'DBT', color: '#8b5cf6', icon: 'flash-outline' },
  mindfulness: { label: 'Mindfulness', color: '#10b981', icon: 'leaf-outline' },
  communication: { label: 'Communication', color: '#f59e0b', icon: 'chatbubbles-outline' },
};

export default function TechniquesScreen({ navigation }: TechniquesScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<TechniqueCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredTechniques = techniques.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openTechniqueDetail = (technique: Technique) => {
    setSelectedTechnique(technique);
    setShowDetailModal(true);
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return '#22c55e';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#8b8b8b';
    }
  };

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryContainer}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          selectedCategory === 'all' && styles.categoryChipActive
        ]}
        onPress={() => setSelectedCategory('all')}
      >
        <Ionicons 
          name="apps-outline" 
          size={16} 
          color={selectedCategory === 'all' ? '#fff' : '#8b8b8b'} 
        />
        <Text style={[
          styles.categoryChipText,
          selectedCategory === 'all' && styles.categoryChipTextActive
        ]}>All</Text>
      </TouchableOpacity>

      {(Object.keys(categoryInfo) as TechniqueCategory[]).map(cat => (
        <TouchableOpacity
          key={cat}
          style={[
            styles.categoryChip,
            selectedCategory === cat && { backgroundColor: categoryInfo[cat].color }
          ]}
          onPress={() => setSelectedCategory(cat)}
        >
          <Ionicons 
            name={categoryInfo[cat].icon as any} 
            size={16} 
            color={selectedCategory === cat ? '#fff' : '#8b8b8b'} 
          />
          <Text style={[
            styles.categoryChipText,
            selectedCategory === cat && styles.categoryChipTextActive
          ]}>{categoryInfo[cat].label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTechniqueItem = ({ item }: { item: Technique }) => (
    <TouchableOpacity
      style={styles.techniqueCard}
      onPress={() => openTechniqueDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.techniqueHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryInfo[item.category].color + '20' }]}>
          <Ionicons 
            name={categoryInfo[item.category].icon as any} 
            size={14} 
            color={categoryInfo[item.category].color} 
          />
          <Text style={[styles.categoryBadgeText, { color: categoryInfo[item.category].color }]}>
            {categoryInfo[item.category].label}
          </Text>
        </View>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
          <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty) }]}>
            {item.difficulty}
          </Text>
        </View>
      </View>

      <Text style={styles.techniqueName}>{item.name}</Text>
      <Text style={styles.techniqueDescription}>{item.shortDescription}</Text>

      <View style={styles.techniqueFooter}>
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={14} color="#8b8b8b" />
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
        <View style={styles.learnMore}>
          <Text style={styles.learnMoreText}>Learn more</Text>
          <Ionicons name="chevron-forward" size={14} color="#F5A623" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <LinearGradient colors={['#1A1625', '#252136']} style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowDetailModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {selectedTechnique?.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {selectedTechnique && (
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Category & Difficulty */}
            <View style={styles.detailBadges}>
              <View style={[styles.categoryBadgeLarge, { backgroundColor: categoryInfo[selectedTechnique.category].color + '20' }]}>
                <Ionicons 
                  name={categoryInfo[selectedTechnique.category].icon as any} 
                  size={18} 
                  color={categoryInfo[selectedTechnique.category].color} 
                />
                <Text style={[styles.categoryBadgeTextLarge, { color: categoryInfo[selectedTechnique.category].color }]}>
                  {categoryInfo[selectedTechnique.category].label}
                </Text>
              </View>
              <View style={[styles.difficultyBadgeLarge, { backgroundColor: getDifficultyColor(selectedTechnique.difficulty) + '20' }]}>
                <Text style={[styles.difficultyTextLarge, { color: getDifficultyColor(selectedTechnique.difficulty) }]}>
                  {selectedTechnique.difficulty.charAt(0).toUpperCase() + selectedTechnique.difficulty.slice(1)}
                </Text>
              </View>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={16} color="#8b8b8b" />
                <Text style={styles.durationBadgeText}>{selectedTechnique.duration}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Overview</Text>
              <Text style={styles.detailText}>{selectedTechnique.fullDescription}</Text>
            </View>

            {/* Steps */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Steps</Text>
              {selectedTechnique.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* When to Use */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>When to Use</Text>
              {selectedTechnique.whenToUse.map((use, index) => (
                <View key={index} style={styles.useItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text style={styles.useText}>{use}</Text>
                </View>
              ))}
            </View>

            {/* Example */}
            {selectedTechnique.example && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Example</Text>
                <View style={styles.exampleBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#9B7EC6" />
                  <Text style={styles.exampleText}>{selectedTechnique.example}</Text>
                </View>
              </View>
            )}

            {/* Practice Button */}
            <TouchableOpacity style={styles.practiceButton}>
              <LinearGradient
                colors={['#F5A623', '#D4920D']}
                style={styles.practiceButtonGradient}
              >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.practiceButtonText}>Practice This Technique</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}
      </LinearGradient>
    </Modal>
  );

  return (
    <LinearGradient colors={['#1A1625', '#252136']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Techniques Library</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8b8b8b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search techniques..."
          placeholderTextColor="#8b8b8b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8b8b8b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      {renderCategoryFilter()}

      {/* Techniques List */}
      <FlatList
        data={filteredTechniques}
        renderItem={renderTechniqueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No techniques found</Text>
          </View>
        }
      />

      {renderDetailModal()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  categoryScroll: {
    maxHeight: 48,
    marginTop: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#F5A623',
  },
  categoryChipText: {
    color: '#B8B0C8',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  techniqueCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  techniqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  techniqueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  techniqueDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  techniqueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 13,
    color: '#8b8b8b',
    marginLeft: 4,
  },
  learnMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnMoreText: {
    fontSize: 14,
    color: '#F5A623',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#8b8b8b',
    fontSize: 16,
    marginTop: 12,
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
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  detailBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryBadgeTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  difficultyBadgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  difficultyTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  durationBadgeText: {
    fontSize: 14,
    color: '#8b8b8b',
    marginLeft: 6,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 24,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9B7EC6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
    paddingTop: 3,
  },
  useItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  useText: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
    marginLeft: 10,
  },
  exampleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(155, 126, 198, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#9B7EC6',
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  practiceButton: {
    marginTop: 8,
  },
  practiceButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  practiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
