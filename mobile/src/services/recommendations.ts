/**
 * TrueReact - Personalized Recommendations Service
 * 
 * ML-inspired recommendation engine that learns user preferences
 * and suggests techniques based on emotional state, past success,
 * and behavioral patterns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TECHNIQUE_HISTORY_KEY = '@truereact_technique_history';
const USER_PREFERENCES_KEY = '@truereact_user_preferences';
const RECOMMENDATION_CACHE_KEY = '@truereact_rec_cache';

// Technique definitions
export type TechniqueCategory = 
  | 'breathing' 
  | 'grounding' 
  | 'cognitive' 
  | 'mindfulness' 
  | 'physical' 
  | 'social' 
  | 'creative';

export type Technique = {
  id: string;
  name: string;
  category: TechniqueCategory;
  description: string;
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  bestFor: string[]; // emotions this helps with
  contraindicated: string[]; // emotions to avoid
  steps: string[];
  icon: string;
  color: string;
};

export type TechniqueUsage = {
  techniqueId: string;
  timestamp: string;
  emotionBefore: string;
  emotionAfter?: string;
  emotionShift: number; // -1 to 1
  completedFully: boolean;
  userRating?: number; // 1-5
  context?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number;
    sessionType: string;
  };
};

export type UserPreferences = {
  preferredDuration: 'short' | 'medium' | 'long';
  preferredCategories: TechniqueCategory[];
  avoidCategories: TechniqueCategory[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learnNewTechniques: boolean;
  lastUpdated: string;
};

export type RecommendationReason = 
  | 'high_success_rate'
  | 'good_for_emotion'
  | 'recently_effective'
  | 'user_favorite'
  | 'try_something_new'
  | 'time_appropriate'
  | 'category_match';

export type TechniqueRecommendation = {
  technique: Technique;
  score: number; // 0-100
  reasons: { type: RecommendationReason; description: string }[];
  successRate?: number;
  timesUsed?: number;
};

// Full technique library
export const TECHNIQUES: Technique[] = [
  // Breathing techniques
  {
    id: 'breathing_478',
    name: '4-7-8 Breathing',
    category: 'breathing',
    description: 'A calming breath pattern that activates your parasympathetic nervous system.',
    duration: 5,
    difficulty: 'beginner',
    bestFor: ['anxious', 'stressed', 'overwhelmed', 'panic'],
    contraindicated: [],
    steps: [
      'Find a comfortable position',
      'Breathe in through your nose for 4 seconds',
      'Hold your breath for 7 seconds',
      'Exhale slowly through your mouth for 8 seconds',
      'Repeat 4 times',
    ],
    icon: 'leaf-outline',
    color: '#4ECDC4',
  },
  {
    id: 'breathing_box',
    name: 'Box Breathing',
    category: 'breathing',
    description: 'Equal timing breath technique used by Navy SEALs for focus and calm.',
    duration: 5,
    difficulty: 'beginner',
    bestFor: ['anxious', 'stressed', 'unfocused', 'overwhelmed'],
    contraindicated: [],
    steps: [
      'Sit upright in a comfortable position',
      'Breathe in for 4 seconds',
      'Hold for 4 seconds',
      'Breathe out for 4 seconds',
      'Hold for 4 seconds',
      'Repeat for 4 rounds',
    ],
    icon: 'square-outline',
    color: '#6B8DD6',
  },
  {
    id: 'breathing_coherent',
    name: 'Coherent Breathing',
    category: 'breathing',
    description: '5 breaths per minute for heart-brain coherence.',
    duration: 10,
    difficulty: 'intermediate',
    bestFor: ['anxious', 'stressed', 'angry', 'frustrated'],
    contraindicated: [],
    steps: [
      'Breathe in slowly for 6 seconds',
      'Breathe out slowly for 6 seconds',
      'No pauses between breaths',
      'Continue for 10 minutes',
    ],
    icon: 'pulse-outline',
    color: '#9B7EC6',
  },
  
  // Grounding techniques
  {
    id: 'grounding_54321',
    name: '5-4-3-2-1 Grounding',
    category: 'grounding',
    description: 'Use your senses to anchor yourself in the present moment.',
    duration: 5,
    difficulty: 'beginner',
    bestFor: ['anxious', 'dissociated', 'panic', 'overwhelmed', 'flashback'],
    contraindicated: [],
    steps: [
      'Name 5 things you can SEE',
      'Name 4 things you can TOUCH',
      'Name 3 things you can HEAR',
      'Name 2 things you can SMELL',
      'Name 1 thing you can TASTE',
    ],
    icon: 'hand-left-outline',
    color: '#7BC67E',
  },
  {
    id: 'grounding_ice',
    name: 'Ice Cube Grounding',
    category: 'grounding',
    description: 'Use temperature sensation to bring yourself to the present.',
    duration: 3,
    difficulty: 'beginner',
    bestFor: ['dissociated', 'numb', 'panic', 'overwhelmed'],
    contraindicated: [],
    steps: [
      'Hold an ice cube in your hand',
      'Focus on the cold sensation',
      'Notice how it feels as it melts',
      'When grounded, release the ice',
    ],
    icon: 'snow-outline',
    color: '#45B7D1',
  },
  {
    id: 'grounding_feet',
    name: 'Feet on Ground',
    category: 'grounding',
    description: 'Connect with the earth through your feet.',
    duration: 3,
    difficulty: 'beginner',
    bestFor: ['anxious', 'floating', 'dissociated', 'unreal'],
    contraindicated: [],
    steps: [
      'Press your feet firmly into the floor',
      'Notice the pressure and texture',
      'Imagine roots growing from your feet',
      'Feel connected and stable',
    ],
    icon: 'footsteps-outline',
    color: '#8B7355',
  },
  
  // Cognitive techniques
  {
    id: 'cognitive_reframe',
    name: 'Cognitive Reframing',
    category: 'cognitive',
    description: 'Challenge and change unhelpful thought patterns.',
    duration: 10,
    difficulty: 'intermediate',
    bestFor: ['sad', 'hopeless', 'negative', 'self-critical'],
    contraindicated: ['crisis', 'acute_trauma'],
    steps: [
      'Identify the negative thought',
      'What evidence supports this thought?',
      'What evidence contradicts it?',
      'What would you tell a friend?',
      'Create a balanced alternative thought',
    ],
    icon: 'swap-horizontal-outline',
    color: '#F5A623',
  },
  {
    id: 'cognitive_thought_log',
    name: 'Thought Log',
    category: 'cognitive',
    description: 'Track and analyze your automatic thoughts.',
    duration: 15,
    difficulty: 'intermediate',
    bestFor: ['anxious', 'depressed', 'worried', 'ruminating'],
    contraindicated: [],
    steps: [
      'Write the situation that triggered the feeling',
      'Note your automatic thoughts',
      'Rate how much you believe each thought (0-100)',
      'Identify cognitive distortions',
      'Write a more balanced thought',
      'Re-rate belief in original thought',
    ],
    icon: 'document-text-outline',
    color: '#E67E22',
  },
  {
    id: 'cognitive_worry_time',
    name: 'Scheduled Worry Time',
    category: 'cognitive',
    description: 'Contain worries to a specific time period.',
    duration: 15,
    difficulty: 'advanced',
    bestFor: ['anxious', 'worried', 'ruminating', 'obsessive'],
    contraindicated: [],
    steps: [
      'Pick a 15-minute window each day',
      'When worries arise, write them down',
      'Tell yourself "I\'ll worry about this at worry time"',
      'During worry time, go through your list',
      'After 15 minutes, stop and do something else',
    ],
    icon: 'alarm-outline',
    color: '#9B59B6',
  },
  
  // Mindfulness techniques
  {
    id: 'mindful_body_scan',
    name: 'Body Scan',
    category: 'mindfulness',
    description: 'Systematically notice sensations throughout your body.',
    duration: 15,
    difficulty: 'beginner',
    bestFor: ['stressed', 'tense', 'anxious', 'disconnected'],
    contraindicated: ['acute_trauma'],
    steps: [
      'Lie down or sit comfortably',
      'Start with your toes, notice sensations',
      'Slowly move attention up through your body',
      'Notice without judging',
      'Release tension as you go',
      'End at the top of your head',
    ],
    icon: 'body-outline',
    color: '#4ECDC4',
  },
  {
    id: 'mindful_leaves',
    name: 'Leaves on a Stream',
    category: 'mindfulness',
    description: 'Visualize thoughts floating away on leaves.',
    duration: 10,
    difficulty: 'intermediate',
    bestFor: ['ruminating', 'anxious', 'stuck', 'overwhelmed'],
    contraindicated: [],
    steps: [
      'Imagine sitting by a peaceful stream',
      'See leaves floating past on the water',
      'When a thought comes, place it on a leaf',
      'Watch the leaf float downstream',
      'Don\'t try to stop thoughts, just observe',
      'Return attention to the stream',
    ],
    icon: 'water-outline',
    color: '#6B8DD6',
  },
  {
    id: 'mindful_observing',
    name: 'Mindful Observation',
    category: 'mindfulness',
    description: 'Practice present-moment awareness with an object.',
    duration: 5,
    difficulty: 'beginner',
    bestFor: ['distracted', 'anxious', 'racing_thoughts'],
    contraindicated: [],
    steps: [
      'Choose an object in front of you',
      'Observe it as if seeing it for the first time',
      'Notice every detail - color, texture, shape',
      'If your mind wanders, gently return',
      'Appreciate the object fully',
    ],
    icon: 'eye-outline',
    color: '#98D8C8',
  },
  
  // Physical techniques
  {
    id: 'physical_pmr',
    name: 'Progressive Muscle Relaxation',
    category: 'physical',
    description: 'Systematically tense and release muscle groups.',
    duration: 15,
    difficulty: 'beginner',
    bestFor: ['tense', 'stressed', 'anxious', 'angry'],
    contraindicated: ['injury', 'chronic_pain'],
    steps: [
      'Start with your feet - tense for 5 seconds',
      'Release and notice the relaxation',
      'Move to calves, thighs, stomach',
      'Continue to shoulders, arms, hands',
      'Finish with face and jaw',
      'Enjoy the full-body relaxation',
    ],
    icon: 'fitness-outline',
    color: '#E74C3C',
  },
  {
    id: 'physical_shake',
    name: 'Shake It Out',
    category: 'physical',
    description: 'Release tension through physical movement.',
    duration: 3,
    difficulty: 'beginner',
    bestFor: ['stressed', 'tense', 'frustrated', 'stuck'],
    contraindicated: ['injury'],
    steps: [
      'Start by shaking your hands',
      'Add arms, then shoulders',
      'Shake your legs and feet',
      'Shake your whole body',
      'Slow down gradually',
      'Stand still and notice the sensation',
    ],
    icon: 'flash-outline',
    color: '#F5A623',
  },
  {
    id: 'physical_walking',
    name: 'Mindful Walking',
    category: 'physical',
    description: 'Walking meditation for body-mind connection.',
    duration: 10,
    difficulty: 'beginner',
    bestFor: ['restless', 'anxious', 'stuck', 'low_energy'],
    contraindicated: [],
    steps: [
      'Walk slowly and deliberately',
      'Feel each foot as it touches the ground',
      'Notice the shift of weight',
      'Observe your surroundings',
      'Breathe naturally',
      'Stay present with each step',
    ],
    icon: 'walk-outline',
    color: '#7BC67E',
  },
  
  // Social techniques
  {
    id: 'social_reach_out',
    name: 'Reach Out to Someone',
    category: 'social',
    description: 'Connect with a supportive person.',
    duration: 10,
    difficulty: 'beginner',
    bestFor: ['lonely', 'isolated', 'sad', 'overwhelmed'],
    contraindicated: [],
    steps: [
      'Think of someone who cares about you',
      'Send a simple text or make a call',
      'You don\'t have to share problems',
      'Just connecting can help',
      'Let them know you thought of them',
    ],
    icon: 'people-outline',
    color: '#E91E63',
  },
  {
    id: 'social_kindness',
    name: 'Random Act of Kindness',
    category: 'social',
    description: 'Do something kind for someone else.',
    duration: 5,
    difficulty: 'beginner',
    bestFor: ['low_mood', 'disconnected', 'self-focused'],
    contraindicated: [],
    steps: [
      'Think of a small kind act',
      'It can be as simple as a compliment',
      'Do it without expecting anything back',
      'Notice how it feels',
    ],
    icon: 'heart-outline',
    color: '#FF6B6B',
  },
  
  // Creative techniques
  {
    id: 'creative_journaling',
    name: 'Expressive Journaling',
    category: 'creative',
    description: 'Write freely about your thoughts and feelings.',
    duration: 15,
    difficulty: 'beginner',
    bestFor: ['confused', 'bottled_up', 'processing', 'sad'],
    contraindicated: [],
    steps: [
      'Get paper and pen (or open a note)',
      'Write continuously for 15 minutes',
      'Don\'t worry about grammar or making sense',
      'If stuck, write "I don\'t know what to write"',
      'Let it flow without judgment',
    ],
    icon: 'create-outline',
    color: '#9B7EC6',
  },
  {
    id: 'creative_coloring',
    name: 'Meditative Coloring',
    category: 'creative',
    description: 'Focus on coloring to calm the mind.',
    duration: 20,
    difficulty: 'beginner',
    bestFor: ['anxious', 'restless', 'racing_thoughts', 'stressed'],
    contraindicated: [],
    steps: [
      'Choose a coloring page or mandala',
      'Select colors that appeal to you',
      'Color slowly and deliberately',
      'Focus on staying within lines',
      'Notice the colors and movements',
    ],
    icon: 'color-palette-outline',
    color: '#45B7D1',
  },
];

// Load technique usage history
async function getUsageHistory(): Promise<TechniqueUsage[]> {
  try {
    const data = await AsyncStorage.getItem(TECHNIQUE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load technique history:', error);
    return [];
  }
}

// Save technique usage
async function saveUsageHistory(history: TechniqueUsage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TECHNIQUE_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save technique history:', error);
  }
}

// Load user preferences
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    const data = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
  
  // Default preferences
  return {
    preferredDuration: 'medium',
    preferredCategories: [],
    avoidCategories: [],
    difficulty: 'beginner',
    learnNewTechniques: true,
    lastUpdated: new Date().toISOString(),
  };
}

// Save user preferences
export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify({
      ...prefs,
      lastUpdated: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

// Record technique usage
export async function recordTechniqueUsage(usage: Omit<TechniqueUsage, 'context'>): Promise<void> {
  const history = await getUsageHistory();
  const now = new Date();
  const hour = now.getHours();
  
  const fullUsage: TechniqueUsage = {
    ...usage,
    context: {
      timeOfDay: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening',
      dayOfWeek: now.getDay(),
      sessionType: 'standalone',
    },
  };
  
  history.unshift(fullUsage);
  await saveUsageHistory(history.slice(0, 500)); // Keep last 500 uses
}

// Get technique by ID
export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUES.find(t => t.id === id);
}

// Calculate success rate for a technique
async function getTechniqueStats(techniqueId: string): Promise<{
  timesUsed: number;
  successRate: number;
  avgRating: number;
  completionRate: number;
}> {
  const history = await getUsageHistory();
  const uses = history.filter(u => u.techniqueId === techniqueId);
  
  if (uses.length === 0) {
    return { timesUsed: 0, successRate: 0, avgRating: 0, completionRate: 0 };
  }
  
  const successfulUses = uses.filter(u => u.emotionShift > 0);
  const completedUses = uses.filter(u => u.completedFully);
  const ratedUses = uses.filter(u => u.userRating);
  
  return {
    timesUsed: uses.length,
    successRate: successfulUses.length / uses.length,
    avgRating: ratedUses.length > 0 
      ? ratedUses.reduce((sum, u) => sum + (u.userRating || 0), 0) / ratedUses.length 
      : 0,
    completionRate: completedUses.length / uses.length,
  };
}

// Get personalized recommendations
export async function getRecommendations(params: {
  currentEmotion: string;
  intensity?: number;
  maxResults?: number;
  excludeRecent?: boolean;
}): Promise<TechniqueRecommendation[]> {
  const { currentEmotion, intensity = 0.5, maxResults = 5, excludeRecent = false } = params;
  
  const history = await getUsageHistory();
  const preferences = await getUserPreferences();
  const now = new Date();
  const hour = now.getHours();
  
  // Get recent technique IDs to potentially exclude
  const recentTechniqueIds = new Set(
    history
      .slice(0, 3)
      .map(u => u.techniqueId)
  );
  
  const recommendations: TechniqueRecommendation[] = [];
  
  for (const technique of TECHNIQUES) {
    // Skip if excluded
    if (excludeRecent && recentTechniqueIds.has(technique.id)) continue;
    if (preferences.avoidCategories.includes(technique.category)) continue;
    
    let score = 50; // Base score
    const reasons: TechniqueRecommendation['reasons'] = [];
    
    // Factor 1: Good for current emotion
    if (technique.bestFor.includes(currentEmotion)) {
      score += 20;
      reasons.push({
        type: 'good_for_emotion',
        description: `Specifically helps with ${currentEmotion} feelings`,
      });
    }
    
    // Factor 2: Contraindicated emotions (strong negative)
    if (technique.contraindicated.includes(currentEmotion)) {
      score -= 50;
    }
    
    // Factor 3: Past success rate
    const stats = await getTechniqueStats(technique.id);
    if (stats.timesUsed > 0) {
      if (stats.successRate > 0.7) {
        score += 25;
        reasons.push({
          type: 'high_success_rate',
          description: `${Math.round(stats.successRate * 100)}% effective for you`,
        });
      } else if (stats.successRate > 0.5) {
        score += 10;
      }
      
      // Factor 4: User favorite (high ratings)
      if (stats.avgRating >= 4) {
        score += 15;
        reasons.push({
          type: 'user_favorite',
          description: 'One of your favorites',
        });
      }
    } else if (preferences.learnNewTechniques) {
      // Factor 5: Try something new
      score += 5;
      reasons.push({
        type: 'try_something_new',
        description: 'Try something new',
      });
    }
    
    // Factor 6: Preferred categories
    if (preferences.preferredCategories.includes(technique.category)) {
      score += 10;
      reasons.push({
        type: 'category_match',
        description: `Matches your ${technique.category} preference`,
      });
    }
    
    // Factor 7: Duration match
    const durationPref = preferences.preferredDuration;
    const isShort = technique.duration <= 5;
    const isMedium = technique.duration > 5 && technique.duration <= 15;
    const isLong = technique.duration > 15;
    
    if (
      (durationPref === 'short' && isShort) ||
      (durationPref === 'medium' && isMedium) ||
      (durationPref === 'long' && isLong)
    ) {
      score += 5;
    }
    
    // Factor 8: Difficulty match
    if (technique.difficulty === preferences.difficulty) {
      score += 5;
    }
    
    // Factor 9: Time-appropriate techniques
    if (hour >= 21 || hour < 6) {
      // Night time - calm techniques
      if (['breathing', 'mindfulness'].includes(technique.category)) {
        score += 5;
        reasons.push({
          type: 'time_appropriate',
          description: 'Good for nighttime',
        });
      }
    } else if (hour >= 6 && hour < 10) {
      // Morning - energizing techniques
      if (['physical', 'mindfulness'].includes(technique.category)) {
        score += 5;
        reasons.push({
          type: 'time_appropriate',
          description: 'Good for morning',
        });
      }
    }
    
    // Factor 10: Recently effective (used in last 7 days with good result)
    const recentSuccess = history.find(u => 
      u.techniqueId === technique.id &&
      u.emotionShift > 0.2 &&
      new Date(u.timestamp).getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    
    if (recentSuccess) {
      score += 10;
      reasons.push({
        type: 'recently_effective',
        description: 'Helped you recently',
      });
    }
    
    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));
    
    recommendations.push({
      technique,
      score,
      reasons: reasons.slice(0, 3),
      successRate: stats.timesUsed > 0 ? stats.successRate : undefined,
      timesUsed: stats.timesUsed,
    });
  }
  
  // Sort by score and return top results
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// Get quick recommendations for an emotion
export async function getQuickRecommendations(emotion: string): Promise<Technique[]> {
  const recs = await getRecommendations({ currentEmotion: emotion, maxResults: 3 });
  return recs.map(r => r.technique);
}

// Get techniques by category
export function getTechniquesByCategory(category: TechniqueCategory): Technique[] {
  return TECHNIQUES.filter(t => t.category === category);
}

// Get all categories with counts
export function getCategories(): { category: TechniqueCategory; count: number; icon: string; color: string }[] {
  const categoryMeta: Record<TechniqueCategory, { icon: string; color: string }> = {
    breathing: { icon: 'leaf-outline', color: '#4ECDC4' },
    grounding: { icon: 'hand-left-outline', color: '#7BC67E' },
    cognitive: { icon: 'bulb-outline', color: '#F5A623' },
    mindfulness: { icon: 'eye-outline', color: '#6B8DD6' },
    physical: { icon: 'fitness-outline', color: '#E74C3C' },
    social: { icon: 'people-outline', color: '#E91E63' },
    creative: { icon: 'color-palette-outline', color: '#9B7EC6' },
  };
  
  const counts: Record<TechniqueCategory, number> = {
    breathing: 0, grounding: 0, cognitive: 0, mindfulness: 0,
    physical: 0, social: 0, creative: 0,
  };
  
  TECHNIQUES.forEach(t => counts[t.category]++);
  
  return Object.entries(counts).map(([category, count]) => ({
    category: category as TechniqueCategory,
    count,
    ...categoryMeta[category as TechniqueCategory],
  }));
}

// Get usage stats for analytics
export async function getTechniqueAnalytics(): Promise<{
  totalUsed: number;
  uniqueTechniques: number;
  favoriteCategory: TechniqueCategory | null;
  avgSuccessRate: number;
  mostEffective: Technique[];
  recentTrend: 'improving' | 'stable' | 'declining';
}> {
  const history = await getUsageHistory();
  
  if (history.length === 0) {
    return {
      totalUsed: 0,
      uniqueTechniques: 0,
      favoriteCategory: null,
      avgSuccessRate: 0,
      mostEffective: [],
      recentTrend: 'stable',
    };
  }
  
  const uniqueIds = new Set(history.map(u => u.techniqueId));
  
  // Category counts
  const categoryCounts: Record<string, number> = {};
  history.forEach(u => {
    const technique = getTechnique(u.techniqueId);
    if (technique) {
      categoryCounts[technique.category] = (categoryCounts[technique.category] || 0) + 1;
    }
  });
  
  const favoriteCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as TechniqueCategory || null;
  
  // Average success rate
  const avgSuccessRate = history.reduce((sum, u) => sum + Math.max(0, u.emotionShift), 0) / history.length;
  
  // Most effective techniques
  const techniqueEffectiveness: Record<string, { total: number; positive: number }> = {};
  history.forEach(u => {
    if (!techniqueEffectiveness[u.techniqueId]) {
      techniqueEffectiveness[u.techniqueId] = { total: 0, positive: 0 };
    }
    techniqueEffectiveness[u.techniqueId].total++;
    if (u.emotionShift > 0) {
      techniqueEffectiveness[u.techniqueId].positive++;
    }
  });
  
  const mostEffective = Object.entries(techniqueEffectiveness)
    .filter(([_, stats]) => stats.total >= 2)
    .sort((a, b) => (b[1].positive / b[1].total) - (a[1].positive / a[1].total))
    .slice(0, 3)
    .map(([id]) => getTechnique(id))
    .filter((t): t is Technique => t !== undefined);
  
  // Recent trend (last 7 days vs previous 7 days)
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const recentUses = history.filter(u => new Date(u.timestamp) >= weekAgo);
  const previousUses = history.filter(u => {
    const date = new Date(u.timestamp);
    return date >= twoWeeksAgo && date < weekAgo;
  });
  
  const recentAvg = recentUses.length > 0 
    ? recentUses.reduce((sum, u) => sum + u.emotionShift, 0) / recentUses.length 
    : 0;
  const previousAvg = previousUses.length > 0 
    ? previousUses.reduce((sum, u) => sum + u.emotionShift, 0) / previousUses.length 
    : 0;
  
  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentAvg > previousAvg + 0.1) recentTrend = 'improving';
  else if (recentAvg < previousAvg - 0.1) recentTrend = 'declining';
  
  return {
    totalUsed: history.length,
    uniqueTechniques: uniqueIds.size,
    favoriteCategory,
    avgSuccessRate,
    mostEffective,
    recentTrend,
  };
}
