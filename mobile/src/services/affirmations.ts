/**
 * TrueReact - Daily Affirmation Service
 * 
 * Provides personalized daily affirmations based on detected
 * emotion patterns and user progress.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const AFFIRMATION_STORAGE_KEY = '@truereact_affirmations';
const LAST_AFFIRMATION_KEY = '@truereact_last_affirmation';

export type AffirmationCategory = 
  | 'confidence'
  | 'calm'
  | 'connection'
  | 'self_compassion'
  | 'expression'
  | 'resilience'
  | 'authenticity'
  | 'general';

export type Affirmation = {
  id: string;
  text: string;
  category: AffirmationCategory;
  forEmotions?: string[]; // Relevant when these emotions detected
};

export type DailyAffirmationData = {
  affirmation: Affirmation;
  date: string;
  dismissed: boolean;
};

// Curated affirmations for neurodivergent-friendly coaching
const AFFIRMATIONS: Affirmation[] = [
  // Confidence
  {
    id: 'conf-1',
    text: "My unique way of experiencing the world is a strength, not a limitation.",
    category: 'confidence',
    forEmotions: ['anxious', 'nervous'],
  },
  {
    id: 'conf-2',
    text: "I communicate in my own way, and that's perfectly valid.",
    category: 'confidence',
    forEmotions: ['anxious', 'uncertain'],
  },
  {
    id: 'conf-3',
    text: "My voice matters, even when it sounds different to me.",
    category: 'confidence',
    forEmotions: ['neutral', 'calm'],
  },
  {
    id: 'conf-4',
    text: "I am learning to express myself more clearly each day.",
    category: 'confidence',
  },
  
  // Calm
  {
    id: 'calm-1',
    text: "I can take all the time I need to process my thoughts.",
    category: 'calm',
    forEmotions: ['anxious', 'stressed', 'overwhelmed'],
  },
  {
    id: 'calm-2',
    text: "It's okay to pause. Silence is not awkward, it's authentic.",
    category: 'calm',
    forEmotions: ['anxious', 'nervous'],
  },
  {
    id: 'calm-3',
    text: "I breathe in peace, I breathe out tension.",
    category: 'calm',
    forEmotions: ['stressed', 'overwhelmed'],
  },
  {
    id: 'calm-4',
    text: "This feeling will pass. I am safe in this moment.",
    category: 'calm',
    forEmotions: ['anxious', 'fearful'],
  },

  // Connection
  {
    id: 'conn-1',
    text: "I deserve connections that accept me as I truly am.",
    category: 'connection',
    forEmotions: ['sad', 'lonely'],
  },
  {
    id: 'conn-2',
    text: "People appreciate my genuine presence more than a performed version of me.",
    category: 'connection',
    forEmotions: ['neutral', 'calm'],
  },
  {
    id: 'conn-3',
    text: "Every interaction is practice, not a test.",
    category: 'connection',
    forEmotions: ['anxious', 'nervous'],
  },

  // Self-Compassion
  {
    id: 'comp-1',
    text: "I release the need to mask. My authentic self is enough.",
    category: 'self_compassion',
    forEmotions: ['tired', 'exhausted'],
  },
  {
    id: 'comp-2',
    text: "I am patient with myself as I learn and grow.",
    category: 'self_compassion',
    forEmotions: ['frustrated', 'disappointed'],
  },
  {
    id: 'comp-3',
    text: "My worth is not determined by how well I perform socially.",
    category: 'self_compassion',
    forEmotions: ['sad', 'ashamed'],
  },
  {
    id: 'comp-4',
    text: "I forgive myself for the times I didn't express what I meant.",
    category: 'self_compassion',
    forEmotions: ['regretful', 'frustrated'],
  },

  // Expression
  {
    id: 'expr-1',
    text: "My face doesn't have to match others' expectations. My feelings are still valid.",
    category: 'expression',
    forEmotions: ['neutral', 'calm'],
  },
  {
    id: 'expr-2',
    text: "I am learning to let my inner warmth show on the outside.",
    category: 'expression',
    forEmotions: ['happy', 'content'],
  },
  {
    id: 'expr-3',
    text: "My expressions are evolving, and that's a beautiful journey.",
    category: 'expression',
  },

  // Resilience
  {
    id: 'resi-1',
    text: "Each conversation makes me stronger, regardless of the outcome.",
    category: 'resilience',
    forEmotions: ['anxious', 'fearful'],
  },
  {
    id: 'resi-2',
    text: "Setbacks in communication are learning opportunities, not failures.",
    category: 'resilience',
    forEmotions: ['frustrated', 'disappointed'],
  },
  {
    id: 'resi-3',
    text: "I bounce back. I adapt. I grow.",
    category: 'resilience',
  },

  // Authenticity
  {
    id: 'auth-1',
    text: "Being true to myself is more important than fitting in.",
    category: 'authenticity',
  },
  {
    id: 'auth-2',
    text: "My authentic expression is what makes me uniquely me.",
    category: 'authenticity',
    forEmotions: ['calm', 'content'],
  },
  {
    id: 'auth-3',
    text: "I honor my true feelings while learning to share them more clearly.",
    category: 'authenticity',
  },

  // General
  {
    id: 'gen-1',
    text: "Today, I choose progress over perfection.",
    category: 'general',
  },
  {
    id: 'gen-2',
    text: "I am worthy of being understood.",
    category: 'general',
  },
  {
    id: 'gen-3',
    text: "My presence adds value to every room I enter.",
    category: 'general',
  },
  {
    id: 'gen-4',
    text: "I am becoming more comfortable in my own skin every day.",
    category: 'general',
  },
];

/**
 * Get today's date string for comparison
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Select an affirmation based on recent emotion patterns
 */
function selectAffirmation(recentEmotions?: string[]): Affirmation {
  let candidates = AFFIRMATIONS;

  // If we have recent emotions, prefer matching affirmations
  if (recentEmotions && recentEmotions.length > 0) {
    const emotionMatches = AFFIRMATIONS.filter(a => 
      a.forEmotions?.some(e => recentEmotions.includes(e))
    );
    
    if (emotionMatches.length > 0) {
      candidates = emotionMatches;
    }
  }

  // Random selection from candidates
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

/**
 * Get today's affirmation (cached for the day)
 */
export async function getDailyAffirmation(
  recentEmotions?: string[]
): Promise<DailyAffirmationData> {
  try {
    const stored = await AsyncStorage.getItem(LAST_AFFIRMATION_KEY);
    
    if (stored) {
      const data: DailyAffirmationData = JSON.parse(stored);
      
      // Return cached if same day and not dismissed
      if (data.date === getTodayString()) {
        return data;
      }
    }

    // Generate new affirmation for today
    const affirmation = selectAffirmation(recentEmotions);
    const newData: DailyAffirmationData = {
      affirmation,
      date: getTodayString(),
      dismissed: false,
    };

    await AsyncStorage.setItem(LAST_AFFIRMATION_KEY, JSON.stringify(newData));
    
    // Track in history
    await trackAffirmation(affirmation);

    return newData;
  } catch (error) {
    console.error('Failed to get daily affirmation:', error);
    // Return a default affirmation
    return {
      affirmation: AFFIRMATIONS[0],
      date: getTodayString(),
      dismissed: false,
    };
  }
}

/**
 * Dismiss today's affirmation
 */
export async function dismissDailyAffirmation(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LAST_AFFIRMATION_KEY);
    
    if (stored) {
      const data: DailyAffirmationData = JSON.parse(stored);
      data.dismissed = true;
      await AsyncStorage.setItem(LAST_AFFIRMATION_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error('Failed to dismiss affirmation:', error);
  }
}

/**
 * Get affirmations by category
 */
export function getAffirmationsByCategory(category: AffirmationCategory): Affirmation[] {
  return AFFIRMATIONS.filter(a => a.category === category);
}

/**
 * Get a random affirmation (not date-locked)
 */
export function getRandomAffirmation(category?: AffirmationCategory): Affirmation {
  const pool = category 
    ? AFFIRMATIONS.filter(a => a.category === category)
    : AFFIRMATIONS;
  
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Track viewed affirmations for history
 */
async function trackAffirmation(affirmation: Affirmation): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(AFFIRMATION_STORAGE_KEY);
    const history: { id: string; date: string }[] = stored ? JSON.parse(stored) : [];
    
    history.push({
      id: affirmation.id,
      date: getTodayString(),
    });

    // Keep last 30 days
    const recentHistory = history.slice(-30);
    
    await AsyncStorage.setItem(AFFIRMATION_STORAGE_KEY, JSON.stringify(recentHistory));
  } catch (error) {
    console.error('Failed to track affirmation:', error);
  }
}

/**
 * Get affirmation history
 */
export async function getAffirmationHistory(): Promise<{ id: string; date: string }[]> {
  try {
    const stored = await AsyncStorage.getItem(AFFIRMATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get affirmation history:', error);
    return [];
  }
}

export { AFFIRMATIONS };
export default {
  getDailyAffirmation,
  dismissDailyAffirmation,
  getAffirmationsByCategory,
  getRandomAffirmation,
  getAffirmationHistory,
  AFFIRMATIONS,
};
