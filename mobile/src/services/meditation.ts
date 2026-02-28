/**
 * TrueReact - Guided Meditation Service
 * 
 * Pre-built meditation sessions with audio guidance,
 * breathing visuals, and progress tracking.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDITATION_HISTORY_KEY = '@truereact_meditation_history';
const MEDITATION_FAVORITES_KEY = '@truereact_meditation_favorites';

export type MeditationCategory = 
  | 'anxiety'
  | 'sleep'
  | 'focus'
  | 'calm'
  | 'stress'
  | 'gratitude'
  | 'self-compassion'
  | 'morning'
  | 'energy'
  | 'quick';

export type MeditationDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type BreathingPattern = {
  inhale: number;
  hold?: number;
  exhale: number;
  holdAfterExhale?: number;
  name: string;
};

export type MeditationStep = {
  type: 'intro' | 'breathing' | 'body-scan' | 'visualization' | 'affirmation' | 'silence' | 'outro';
  duration: number; // seconds
  instruction: string;
  audioText?: string; // Text for TTS
  breathingPattern?: BreathingPattern;
  visualizationPrompt?: string;
};

export type Meditation = {
  id: string;
  title: string;
  description: string;
  category: MeditationCategory;
  difficulty: MeditationDifficulty;
  duration: number; // total seconds
  icon: string; // MaterialCommunityIcons name
  color: string;
  steps: MeditationStep[];
  benefits: string[];
  tags: string[];
};

export type MeditationSession = {
  meditationId: string;
  startedAt: string;
  completedAt?: string;
  completed: boolean;
  duration: number; // actual time spent
};

// Breathing patterns
export const BREATHING_PATTERNS: Record<string, BreathingPattern> = {
  relaxing: {
    inhale: 4,
    hold: 7,
    exhale: 8,
    name: '4-7-8 Relaxing Breath',
  },
  box: {
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfterExhale: 4,
    name: 'Box Breathing',
  },
  calming: {
    inhale: 4,
    exhale: 6,
    name: 'Calming Breath',
  },
  energizing: {
    inhale: 4,
    exhale: 4,
    name: 'Balanced Breath',
  },
  deep: {
    inhale: 5,
    hold: 2,
    exhale: 7,
    name: 'Deep Relaxation',
  },
};

// Meditation library
export const MEDITATIONS: Meditation[] = [
  // Quick Meditations (1-5 min)
  {
    id: 'quick_calm_1',
    title: '1-Minute Calm',
    description: 'A rapid reset for busy moments. Just 60 seconds to find your center.',
    category: 'quick',
    difficulty: 'beginner',
    duration: 60,
    icon: 'timer-sand',
    color: '#4ECDC4',
    benefits: ['Instant stress relief', 'Mental reset', 'Focus restoration'],
    tags: ['quick', 'anytime', 'stress'],
    steps: [
      {
        type: 'intro',
        duration: 10,
        instruction: 'Close your eyes and take a deep breath.',
        audioText: 'Welcome. Close your eyes. Let\'s take one minute to reset.',
      },
      {
        type: 'breathing',
        duration: 40,
        instruction: 'Follow the calming breath pattern.',
        breathingPattern: BREATHING_PATTERNS.calming,
      },
      {
        type: 'outro',
        duration: 10,
        instruction: 'Gently open your eyes when ready.',
        audioText: 'Well done. Carry this calm with you.',
      },
    ],
  },
  {
    id: 'quick_breathing_3',
    title: '3-Minute Breathwork',
    description: 'Reset your nervous system with focused breathing exercises.',
    category: 'quick',
    difficulty: 'beginner',
    duration: 180,
    icon: 'weather-windy',
    color: '#6B8DD6',
    benefits: ['Nervous system regulation', 'Anxiety relief', 'Mental clarity'],
    tags: ['quick', 'breathing', 'anxiety'],
    steps: [
      {
        type: 'intro',
        duration: 15,
        instruction: 'Find a comfortable position and soften your shoulders.',
        audioText: 'Take a comfortable position. Soften your shoulders. Release any tension.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Begin with calming breaths.',
        breathingPattern: BREATHING_PATTERNS.calming,
      },
      {
        type: 'breathing',
        duration: 90,
        instruction: 'Now transition to box breathing.',
        breathingPattern: BREATHING_PATTERNS.box,
      },
      {
        type: 'outro',
        duration: 15,
        instruction: 'Return to natural breathing.',
        audioText: 'Beautiful. Let your breath return to its natural rhythm.',
      },
    ],
  },
  
  // Anxiety Meditations
  {
    id: 'anxiety_relief_5',
    title: 'Anxiety Release',
    description: 'A gentle practice to calm anxious thoughts and find peace.',
    category: 'anxiety',
    difficulty: 'beginner',
    duration: 300,
    icon: 'heart-outline',
    color: '#9B7EC6',
    benefits: ['Reduced anxiety', 'Calm mind', 'Grounding'],
    tags: ['anxiety', 'calm', 'grounding'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Settle into a comfortable position.',
        audioText: 'Welcome. Find a comfortable position. You\'re safe here.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Begin with slow, deep breaths.',
        breathingPattern: BREATHING_PATTERNS.relaxing,
      },
      {
        type: 'body-scan',
        duration: 60,
        instruction: 'Notice any tension in your body. Breathe into it.',
        audioText: 'Notice where you hold tension. Your jaw... shoulders... chest. Breathe into these areas.',
      },
      {
        type: 'visualization',
        duration: 90,
        instruction: 'Imagine anxiety as clouds passing through the sky.',
        visualizationPrompt: 'See your anxious thoughts as clouds. They come, they go. You are the vast sky.',
      },
      {
        type: 'affirmation',
        duration: 30,
        instruction: 'Repeat: "I am safe. I am calm. This will pass."',
        audioText: 'Repeat silently: I am safe. I am calm. This will pass.',
      },
      {
        type: 'outro',
        duration: 30,
        instruction: 'Return to the present moment.',
        audioText: 'Gently return your awareness to this moment. You did beautifully.',
      },
    ],
  },
  {
    id: 'anxiety_grounding_10',
    title: 'Grounding Practice',
    description: 'Use your senses to anchor yourself in the present moment.',
    category: 'anxiety',
    difficulty: 'beginner',
    duration: 600,
    icon: 'foot-print',
    color: '#7BC67E',
    benefits: ['Present-moment awareness', 'Reduced overthinking', 'Emotional regulation'],
    tags: ['grounding', 'anxiety', 'mindfulness'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Find a comfortable seated position.',
        audioText: 'Find a comfortable seat. Feel your connection to the ground beneath you.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Take several deep breaths to settle.',
        breathingPattern: BREATHING_PATTERNS.calming,
      },
      {
        type: 'body-scan',
        duration: 90,
        instruction: 'Feel your feet on the floor. Your body supported.',
        audioText: 'Notice the sensation of your feet on the floor. Feel where your body makes contact with the chair or cushion.',
      },
      {
        type: 'visualization',
        duration: 120,
        instruction: '5-4-3-2-1 Senses exercise.',
        audioText: 'Notice 5 things you can see... 4 things you can touch... 3 things you can hear... 2 things you can smell... 1 thing you can taste.',
      },
      {
        type: 'breathing',
        duration: 90,
        instruction: 'Continue breathing while staying grounded.',
        breathingPattern: BREATHING_PATTERNS.deep,
      },
      {
        type: 'silence',
        duration: 180,
        instruction: 'Rest in this grounded awareness.',
      },
      {
        type: 'outro',
        duration: 30,
        instruction: 'Carry this grounded feeling with you.',
        audioText: 'When you\'re ready, open your eyes. Carry this grounded feeling into your day.',
      },
    ],
  },

  // Calm & Stress Relief
  {
    id: 'calm_lake_10',
    title: 'Peaceful Lake',
    description: 'Visualize a calm lake to find inner stillness.',
    category: 'calm',
    difficulty: 'intermediate',
    duration: 600,
    icon: 'water',
    color: '#4ECDC4',
    benefits: ['Deep relaxation', 'Mental clarity', 'Stress release'],
    tags: ['visualization', 'calm', 'nature'],
    steps: [
      {
        type: 'intro',
        duration: 45,
        instruction: 'Close your eyes and relax.',
        audioText: 'Close your eyes. Let your body relax. Release any effort.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Breathe deeply and slowly.',
        breathingPattern: BREATHING_PATTERNS.deep,
      },
      {
        type: 'visualization',
        duration: 240,
        instruction: 'Imagine a peaceful mountain lake at dawn.',
        visualizationPrompt: 'Picture a crystal-clear lake surrounded by mountains. The surface is perfectly still, reflecting the sky. You sit at its edge, breathing the fresh morning air.',
      },
      {
        type: 'silence',
        duration: 180,
        instruction: 'Rest by the lake in silence.',
      },
      {
        type: 'outro',
        duration: 75,
        instruction: 'Slowly return, carrying the lake\'s peace within.',
        audioText: 'The peace of this lake lives within you. Whenever you need it, you can return here.',
      },
    ],
  },
  {
    id: 'stress_release_15',
    title: 'Stress Melt Away',
    description: 'Release accumulated stress from body and mind.',
    category: 'stress',
    difficulty: 'intermediate',
    duration: 900,
    icon: 'water-check',
    color: '#6B8DD6',
    benefits: ['Muscle relaxation', 'Mental relief', 'Emotional release'],
    tags: ['stress', 'body-scan', 'release'],
    steps: [
      {
        type: 'intro',
        duration: 45,
        instruction: 'Lie down or sit comfortably.',
        audioText: 'Find a position where your body is fully supported. You have nowhere to be but here.',
      },
      {
        type: 'breathing',
        duration: 90,
        instruction: 'Deep relaxing breaths.',
        breathingPattern: BREATHING_PATTERNS.relaxing,
      },
      {
        type: 'body-scan',
        duration: 300,
        instruction: 'Scan from head to toe, releasing tension.',
        audioText: 'Start at the top of your head. Notice any tension... and let it melt away. Move down through your face... your jaw... your neck and shoulders... down your arms to your fingertips... through your chest and belly... your lower back and hips... down your legs... to the tips of your toes.',
      },
      {
        type: 'visualization',
        duration: 180,
        instruction: 'See stress dissolving into light.',
        visualizationPrompt: 'Imagine stress as gray fog. With each exhale, this fog turns into golden light and floats away.',
      },
      {
        type: 'silence',
        duration: 180,
        instruction: 'Rest in lightness.',
      },
      {
        type: 'affirmation',
        duration: 45,
        instruction: 'I release what no longer serves me.',
        audioText: 'Silently affirm: I release what no longer serves me. I welcome peace.',
      },
      {
        type: 'outro',
        duration: 60,
        instruction: 'Gently return.',
        audioText: 'When you\'re ready, wiggle your fingers and toes. Open your eyes softly.',
      },
    ],
  },

  // Sleep Meditations
  {
    id: 'sleep_prepare_10',
    title: 'Sleep Preparation',
    description: 'Wind down and prepare your body and mind for restful sleep.',
    category: 'sleep',
    difficulty: 'beginner',
    duration: 600,
    icon: 'moon-waning-crescent',
    color: '#5D4E7A',
    benefits: ['Better sleep', 'Relaxation', 'Mind quieting'],
    tags: ['sleep', 'night', 'relaxation'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Lie in bed, comfortable and ready for sleep.',
        audioText: 'Settle into your bed. Let your body sink into the mattress.',
      },
      {
        type: 'breathing',
        duration: 90,
        instruction: 'Slow, sleep-inducing breaths.',
        breathingPattern: BREATHING_PATTERNS.relaxing,
      },
      {
        type: 'body-scan',
        duration: 180,
        instruction: 'Relax each body part progressively.',
        audioText: 'Feel your feet becoming heavy... your legs... your hips... your stomach... your chest... your arms... your hands... your neck... your face... completely relaxed.',
      },
      {
        type: 'visualization',
        duration: 180,
        instruction: 'Float on a cloud in a starlit sky.',
        visualizationPrompt: 'You\'re floating gently on a soft cloud. Stars twinkle above. You\'re safe, warm, and drifting peacefully.',
      },
      {
        type: 'silence',
        duration: 120,
        instruction: 'Drift into peaceful rest.',
      },
    ],
  },

  // Morning & Energy
  {
    id: 'morning_energize_7',
    title: 'Morning Energizer',
    description: 'Start your day with clarity, intention, and vitality.',
    category: 'morning',
    difficulty: 'beginner',
    duration: 420,
    icon: 'weather-sunny',
    color: '#F5A623',
    benefits: ['Energized start', 'Positive mindset', 'Clear intentions'],
    tags: ['morning', 'energy', 'intention'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Sit up tall. Welcome the new day.',
        audioText: 'Good morning. Sit up tall. Today is full of possibility.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Energizing breaths to wake up.',
        breathingPattern: BREATHING_PATTERNS.energizing,
      },
      {
        type: 'visualization',
        duration: 120,
        instruction: 'Imagine golden sunlight filling your body.',
        visualizationPrompt: 'Picture warm sunlight entering through the top of your head. It fills your chest with warmth, spreads to your arms and legs, energizing every cell.',
      },
      {
        type: 'affirmation',
        duration: 60,
        instruction: 'Set a positive intention for today.',
        audioText: 'State your intention: Today I choose to... fill this with what matters to you.',
      },
      {
        type: 'breathing',
        duration: 90,
        instruction: 'Continue energizing breaths.',
        breathingPattern: BREATHING_PATTERNS.energizing,
      },
      {
        type: 'outro',
        duration: 60,
        instruction: 'Open your eyes with a smile.',
        audioText: 'Open your eyes with a gentle smile. You\'re ready for this day.',
      },
    ],
  },

  // Focus
  {
    id: 'focus_deep_10',
    title: 'Deep Focus',
    description: 'Sharpen concentration and clear mental fog.',
    category: 'focus',
    difficulty: 'intermediate',
    duration: 600,
    icon: 'target',
    color: '#E85A5A',
    benefits: ['Enhanced focus', 'Mental clarity', 'Productivity boost'],
    tags: ['focus', 'productivity', 'clarity'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Sit with an alert, upright posture.',
        audioText: 'Sit with a straight spine. Alert but relaxed.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Box breathing for focus.',
        breathingPattern: BREATHING_PATTERNS.box,
      },
      {
        type: 'visualization',
        duration: 90,
        instruction: 'Clear your mental space like wiping a whiteboard.',
        visualizationPrompt: 'Imagine your mind as a whiteboard full of scribbles. See yourself gently erasing everything until it\'s perfectly clean and clear.',
      },
      {
        type: 'breathing',
        duration: 120,
        instruction: 'Continue box breathing with single-pointed focus.',
        breathingPattern: BREATHING_PATTERNS.box,
      },
      {
        type: 'silence',
        duration: 240,
        instruction: 'Hold attention on the breath. Return when distracted.',
      },
      {
        type: 'outro',
        duration: 60,
        instruction: 'Carry this focused attention forward.',
        audioText: 'You\'re focused and ready. Bring this clarity to your next task.',
      },
    ],
  },

  // Self-Compassion & Gratitude
  {
    id: 'self_compassion_10',
    title: 'Self-Compassion',
    description: 'Offer yourself the kindness you deserve.',
    category: 'self-compassion',
    difficulty: 'intermediate',
    duration: 600,
    icon: 'hand-heart',
    color: '#FFD166',
    benefits: ['Self-acceptance', 'Emotional healing', 'Inner peace'],
    tags: ['self-compassion', 'kindness', 'healing'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Place a hand on your heart.',
        audioText: 'Place a hand gently on your heart. Feel its warmth.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Breathe warmth into your heart.',
        breathingPattern: BREATHING_PATTERNS.calming,
      },
      {
        type: 'visualization',
        duration: 120,
        instruction: 'Send love to yourself as you would a dear friend.',
        visualizationPrompt: 'Think of how you would comfort a friend who was struggling. Now offer that same compassion to yourself.',
      },
      {
        type: 'affirmation',
        duration: 60,
        instruction: 'Loving-kindness phrases for yourself.',
        audioText: 'Repeat: May I be happy. May I be healthy. May I be at peace. May I be safe.',
      },
      {
        type: 'silence',
        duration: 180,
        instruction: 'Rest in self-compassion.',
      },
      {
        type: 'affirmation',
        duration: 90,
        instruction: 'I am worthy of love and kindness.',
        audioText: 'Know this deeply: You are worthy of love. You are worthy of kindness. Exactly as you are.',
      },
      {
        type: 'outro',
        duration: 60,
        instruction: 'Carry this kindness with you.',
        audioText: 'Carry this self-compassion into your day. You deserve it.',
      },
    ],
  },
  {
    id: 'gratitude_practice_7',
    title: 'Gratitude Meditation',
    description: 'Cultivate appreciation and positive emotions.',
    category: 'gratitude',
    difficulty: 'beginner',
    duration: 420,
    icon: 'gift-outline',
    color: '#7BC67E',
    benefits: ['Positive mindset', 'Emotional uplift', 'Connection'],
    tags: ['gratitude', 'positive', 'appreciation'],
    steps: [
      {
        type: 'intro',
        duration: 30,
        instruction: 'Settle in with a gentle smile.',
        audioText: 'Close your eyes. Let a gentle smile form on your face.',
      },
      {
        type: 'breathing',
        duration: 60,
        instruction: 'Soft, appreciative breaths.',
        breathingPattern: BREATHING_PATTERNS.calming,
      },
      {
        type: 'visualization',
        duration: 180,
        instruction: 'Think of three things you\'re grateful for today.',
        visualizationPrompt: 'Bring to mind three things you\'re grateful for. They can be big or small. Feel the warmth of appreciation for each one.',
      },
      {
        type: 'affirmation',
        duration: 60,
        instruction: 'Thank you for this moment. Thank you for this breath.',
        audioText: 'Thank you for this moment. Thank you for this breath. Thank you for this life.',
      },
      {
        type: 'silence',
        duration: 60,
        instruction: 'Rest in gratitude.',
      },
      {
        type: 'outro',
        duration: 30,
        instruction: 'Open your eyes with appreciation.',
        audioText: 'Open your eyes, seeing the world with fresh appreciation.',
      },
    ],
  },
];

// Load meditation history
export async function getMeditationHistory(): Promise<MeditationSession[]> {
  try {
    const data = await AsyncStorage.getItem(MEDITATION_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load meditation history:', error);
    return [];
  }
}

// Save meditation session
export async function saveMeditationSession(session: MeditationSession): Promise<void> {
  try {
    const history = await getMeditationHistory();
    history.unshift(session);
    // Keep last 100 sessions
    await AsyncStorage.setItem(
      MEDITATION_HISTORY_KEY,
      JSON.stringify(history.slice(0, 100))
    );
  } catch (error) {
    console.error('Failed to save meditation session:', error);
  }
}

// Get favorite meditations
export async function getFavoriteMeditations(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(MEDITATION_FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load favorites:', error);
    return [];
  }
}

// Toggle favorite
export async function toggleMeditationFavorite(meditationId: string): Promise<boolean> {
  try {
    const favorites = await getFavoriteMeditations();
    const index = favorites.indexOf(meditationId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(meditationId);
    }
    
    await AsyncStorage.setItem(MEDITATION_FAVORITES_KEY, JSON.stringify(favorites));
    return index === -1; // Returns true if newly favorited
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return false;
  }
}

// Get meditation stats
export async function getMeditationStats(): Promise<{
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  favoriteCategory: string | null;
}> {
  const history = await getMeditationHistory();
  
  const totalSessions = history.filter(s => s.completed).length;
  const totalMinutes = Math.round(
    history.reduce((sum, s) => sum + (s.completed ? s.duration : 0), 0) / 60
  );
  
  // Calculate streak
  let currentStreak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  const completedDates = history
    .filter(s => s.completed && s.completedAt)
    .map(s => new Date(s.completedAt!).toDateString());
  
  const uniqueDates = [...new Set(completedDates)];
  
  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1;
    let checkDate = new Date(uniqueDates[0]);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      if (uniqueDates[i] === checkDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Find favorite category
  const categoryCount: Record<string, number> = {};
  history.forEach(s => {
    const meditation = MEDITATIONS.find(m => m.id === s.meditationId);
    if (meditation && s.completed) {
      categoryCount[meditation.category] = (categoryCount[meditation.category] || 0) + 1;
    }
  });
  
  const favoriteCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  return {
    totalSessions,
    totalMinutes,
    currentStreak,
    favoriteCategory,
  };
}

// Get meditations by category
export function getMeditationsByCategory(category: MeditationCategory): Meditation[] {
  return MEDITATIONS.filter(m => m.category === category);
}

// Get recommended meditation based on user state
export function getRecommendedMeditation(
  mood?: string,
  timeAvailable?: number, // minutes
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
): Meditation {
  let filtered = [...MEDITATIONS];
  
  // Filter by time
  if (timeAvailable) {
    const maxDuration = timeAvailable * 60;
    filtered = filtered.filter(m => m.duration <= maxDuration);
  }
  
  // Filter by mood/need
  if (mood) {
    const moodCategoryMap: Record<string, MeditationCategory[]> = {
      anxious: ['anxiety', 'calm', 'quick'],
      stressed: ['stress', 'calm', 'quick'],
      tired: ['energy', 'morning'],
      sad: ['self-compassion', 'gratitude'],
      unfocused: ['focus', 'quick'],
      neutral: ['gratitude', 'focus'],
    };
    
    const categories = moodCategoryMap[mood.toLowerCase()] || ['calm'];
    const categoryMatches = filtered.filter(m => categories.includes(m.category));
    if (categoryMatches.length > 0) filtered = categoryMatches;
  }
  
  // Filter by time of day
  if (timeOfDay) {
    const timeCategories: Record<string, MeditationCategory[]> = {
      morning: ['morning', 'energy', 'focus'],
      afternoon: ['focus', 'stress', 'quick'],
      evening: ['calm', 'gratitude', 'self-compassion'],
      night: ['sleep', 'calm'],
    };
    
    const categories = timeCategories[timeOfDay];
    const timeMatches = filtered.filter(m => categories.includes(m.category));
    if (timeMatches.length > 0) filtered = timeMatches;
  }
  
  // Return random from filtered
  return filtered[Math.floor(Math.random() * filtered.length)];
}
