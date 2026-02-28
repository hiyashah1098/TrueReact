/**
 * TrueReact - Voice Journal Service
 * 
 * Manages voice journal entries with transcription,
 * emotion analysis, and storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const JOURNAL_STORAGE_KEY = '@truereact_voice_journal';
const JOURNAL_DIRECTORY = `${FileSystem.documentDirectory}journals/`;

export type EmotionData = {
  primary: string;
  secondary?: string;
  intensity: number; // 0-1
  confidence: number; // 0-1
};

export type JournalEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  audioUri?: string;
  audioDuration: number; // seconds
  transcription: string;
  emotions: EmotionData[];
  tags: string[];
  insights?: string[];
  isProcessing: boolean;
  isFavorite: boolean;
};

export type JournalFilter = {
  startDate?: Date;
  endDate?: Date;
  emotions?: string[];
  tags?: string[];
  searchQuery?: string;
  favoritesOnly?: boolean;
};

export type JournalStats = {
  totalEntries: number;
  totalDuration: number; // seconds
  avgDuration: number;
  emotionBreakdown: Record<string, number>;
  tagBreakdown: Record<string, number>;
  weeklyCount: number[];
  currentStreak: number;
  longestStreak: number;
};

// Ensure journal directory exists
async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(JOURNAL_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(JOURNAL_DIRECTORY, { intermediates: true });
  }
}

// Generate unique ID
function generateId(): string {
  return `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load all journal entries
export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    const data = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load journal entries:', error);
  }
  return [];
}

// Save journal entries
async function saveJournalEntries(entries: JournalEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save journal entries:', error);
    throw error;
  }
}

// Create a new journal entry
export async function createJournalEntry(params: {
  audioUri?: string;
  audioDuration: number;
  transcription?: string;
}): Promise<JournalEntry> {
  await ensureDirectoryExists();
  
  const id = generateId();
  let savedAudioUri = params.audioUri;
  
  // Copy audio to permanent storage
  if (params.audioUri) {
    const fileName = `${id}.m4a`;
    const destination = `${JOURNAL_DIRECTORY}${fileName}`;
    await FileSystem.copyAsync({
      from: params.audioUri,
      to: destination,
    });
    savedAudioUri = destination;
  }
  
  const entry: JournalEntry = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    audioUri: savedAudioUri,
    audioDuration: params.audioDuration,
    transcription: params.transcription || '',
    emotions: [],
    tags: [],
    isProcessing: true,
    isFavorite: false,
  };
  
  const entries = await getJournalEntries();
  entries.unshift(entry);
  await saveJournalEntries(entries);
  
  return entry;
}

// Update journal entry with transcription and emotions
export async function updateJournalEntry(
  id: string,
  updates: Partial<JournalEntry>
): Promise<JournalEntry | null> {
  const entries = await getJournalEntries();
  const index = entries.findIndex(e => e.id === id);
  
  if (index === -1) return null;
  
  entries[index] = {
    ...entries[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await saveJournalEntries(entries);
  return entries[index];
}

// Delete journal entry
export async function deleteJournalEntry(id: string): Promise<boolean> {
  const entries = await getJournalEntries();
  const entry = entries.find(e => e.id === id);
  
  if (!entry) return false;
  
  // Delete audio file if exists
  if (entry.audioUri) {
    try {
      await FileSystem.deleteAsync(entry.audioUri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete audio file:', error);
    }
  }
  
  const filtered = entries.filter(e => e.id !== id);
  await saveJournalEntries(filtered);
  return true;
}

// Toggle favorite status
export async function toggleFavorite(id: string): Promise<JournalEntry | null> {
  const entries = await getJournalEntries();
  const entry = entries.find(e => e.id === id);
  
  if (!entry) return null;
  
  return updateJournalEntry(id, { isFavorite: !entry.isFavorite });
}

// Add tags to entry
export async function addTags(id: string, newTags: string[]): Promise<JournalEntry | null> {
  const entries = await getJournalEntries();
  const entry = entries.find(e => e.id === id);
  
  if (!entry) return null;
  
  const uniqueTags = [...new Set([...entry.tags, ...newTags])];
  return updateJournalEntry(id, { tags: uniqueTags });
}

// Remove tag from entry
export async function removeTag(id: string, tag: string): Promise<JournalEntry | null> {
  const entries = await getJournalEntries();
  const entry = entries.find(e => e.id === id);
  
  if (!entry) return null;
  
  return updateJournalEntry(id, { tags: entry.tags.filter(t => t !== tag) });
}

// Filter journal entries
export async function filterJournalEntries(
  filter: JournalFilter
): Promise<JournalEntry[]> {
  let entries = await getJournalEntries();
  
  if (filter.startDate) {
    entries = entries.filter(e => new Date(e.createdAt) >= filter.startDate!);
  }
  
  if (filter.endDate) {
    entries = entries.filter(e => new Date(e.createdAt) <= filter.endDate!);
  }
  
  if (filter.emotions && filter.emotions.length > 0) {
    entries = entries.filter(e => 
      e.emotions.some(em => filter.emotions!.includes(em.primary))
    );
  }
  
  if (filter.tags && filter.tags.length > 0) {
    entries = entries.filter(e => 
      e.tags.some(t => filter.tags!.includes(t))
    );
  }
  
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    entries = entries.filter(e => 
      e.transcription.toLowerCase().includes(query) ||
      e.title?.toLowerCase().includes(query) ||
      e.tags.some(t => t.toLowerCase().includes(query))
    );
  }
  
  if (filter.favoritesOnly) {
    entries = entries.filter(e => e.isFavorite);
  }
  
  return entries;
}

// Get all unique tags
export async function getAllTags(): Promise<string[]> {
  const entries = await getJournalEntries();
  const allTags = entries.flatMap(e => e.tags);
  return [...new Set(allTags)].sort();
}

// Calculate journal statistics
export async function getJournalStats(): Promise<JournalStats> {
  const entries = await getJournalEntries();
  
  const totalEntries = entries.length;
  const totalDuration = entries.reduce((sum, e) => sum + e.audioDuration, 0);
  const avgDuration = totalEntries > 0 ? totalDuration / totalEntries : 0;
  
  // Emotion breakdown
  const emotionBreakdown: Record<string, number> = {};
  entries.forEach(entry => {
    entry.emotions.forEach(em => {
      emotionBreakdown[em.primary] = (emotionBreakdown[em.primary] || 0) + 1;
    });
  });
  
  // Tag breakdown
  const tagBreakdown: Record<string, number> = {};
  entries.forEach(entry => {
    entry.tags.forEach(tag => {
      tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
    });
  });
  
  // Weekly count (last 7 days)
  const weeklyCount: number[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const count = entries.filter(e => {
      const entryDate = new Date(e.createdAt);
      return entryDate >= dayStart && entryDate <= dayEnd;
    }).length;
    
    weeklyCount.push(count);
  }
  
  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(entries);
  
  return {
    totalEntries,
    totalDuration,
    avgDuration,
    emotionBreakdown,
    tagBreakdown,
    weeklyCount,
    currentStreak,
    longestStreak,
  };
}

// Calculate journaling streaks
function calculateStreaks(entries: JournalEntry[]): { currentStreak: number; longestStreak: number } {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }
  
  // Get unique dates with entries
  const entryDates = entries.map(e => {
    const date = new Date(e.createdAt);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  });
  const uniqueDates = [...new Set(entryDates)].sort().reverse();
  
  // Current streak
  let currentStreak = 0;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  
  if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
    currentStreak = 1;
    let checkDate = new Date(uniqueDates[0] === todayStr ? today : yesterday);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      
      if (uniqueDates[i] === checkStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }
  
  // Longest streak
  let longestStreak = currentStreak;
  let streak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevParts = uniqueDates[i - 1].split('-').map(Number);
    const currParts = uniqueDates[i].split('-').map(Number);
    
    const prevDate = new Date(prevParts[0], prevParts[1], prevParts[2]);
    const currDate = new Date(currParts[0], currParts[1], currParts[2]);
    
    const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }
  
  return { currentStreak, longestStreak };
}

// Analyze emotions from transcription text (local heuristic)
export function analyzeEmotionsLocally(text: string): EmotionData[] {
  const emotionKeywords: Record<string, string[]> = {
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'panic', 'fear', 'afraid'],
    sad: ['sad', 'down', 'depressed', 'unhappy', 'lonely', 'hopeless', 'crying', 'tears'],
    angry: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'furious', 'rage'],
    happy: ['happy', 'joy', 'excited', 'grateful', 'thankful', 'good', 'great', 'amazing'],
    calm: ['calm', 'peaceful', 'relaxed', 'serene', 'content', 'comfortable'],
    confused: ['confused', 'uncertain', 'unsure', 'lost', 'overwhelmed', 'stuck'],
    hopeful: ['hopeful', 'optimistic', 'looking forward', 'better', 'improving'],
    tired: ['tired', 'exhausted', 'drained', 'fatigued', 'sleepy', 'worn out'],
  };
  
  const lowerText = text.toLowerCase();
  const emotions: EmotionData[] = [];
  
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    const matches = keywords.filter(kw => lowerText.includes(kw));
    if (matches.length > 0) {
      emotions.push({
        primary: emotion,
        intensity: Math.min(matches.length * 0.3, 1),
        confidence: 0.6 + (matches.length * 0.1),
      });
    }
  }
  
  // Sort by intensity
  emotions.sort((a, b) => b.intensity - a.intensity);
  
  // Return top 3 emotions
  return emotions.slice(0, 3);
}

// Get recent entries for display
export async function getRecentEntries(limit: number = 5): Promise<JournalEntry[]> {
  const entries = await getJournalEntries();
  return entries.slice(0, limit);
}

// Export journal entry as text
export function formatEntryAsText(entry: JournalEntry): string {
  const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const duration = Math.round(entry.audioDuration / 60);
  const emotions = entry.emotions.map(e => e.primary).join(', ');
  const tags = entry.tags.length > 0 ? `Tags: ${entry.tags.join(', ')}` : '';
  
  return `
📅 ${date}
⏱️ ${duration} minute${duration !== 1 ? 's' : ''}
${emotions ? `💭 Emotions: ${emotions}` : ''}
${tags}

${entry.transcription}

${entry.insights && entry.insights.length > 0 ? `
💡 Insights:
${entry.insights.map(i => `• ${i}`).join('\n')}
` : ''}
`.trim();
}
