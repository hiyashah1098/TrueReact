/**
 * TrueReact - Session History Service
 * 
 * Stores and retrieves past coaching sessions with
 * emotion timeline, coaching insights, and techniques used.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_HISTORY_KEY = '@truereact_session_history';

export type EmotionTimestamp = {
  time: number; // seconds from session start
  emotion: string;
  intensity: number; // 0-1
  confidence: number; // 0-1
  trigger?: string;
};

export type CoachingMoment = {
  time: number;
  type: 'suggestion' | 'intervention' | 'praise' | 'technique' | 'reframe';
  content: string;
  techniqueId?: string;
  techniqueName?: string;
};

export type SessionInsight = {
  type: 'pattern' | 'progress' | 'suggestion' | 'highlight';
  title: string;
  description: string;
  icon: string;
  color: string;
};

export type SessionSummary = {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  type: 'coaching' | 'calibration' | 'check-in';
  
  // Emotion data
  dominantEmotion: string;
  emotionTimeline: EmotionTimestamp[];
  startEmotion: string;
  endEmotion: string;
  emotionShift: number; // -1 to 1, negative = worse, positive = better
  
  // Coaching data
  coachingMoments: CoachingMoment[];
  techniquesUsed: string[];
  
  // Insights
  insights: SessionInsight[];
  
  // Tags & notes
  tags: string[];
  userNotes?: string;
  
  // Rating
  userRating?: number; // 1-5
  
  // Flags
  isBookmarked: boolean;
  hasBreakthrough: boolean;
}

export type SessionFilter = {
  startDate?: Date;
  endDate?: Date;
  emotions?: string[];
  types?: ('coaching' | 'calibration' | 'check-in')[];
  minDuration?: number;
  bookmarkedOnly?: boolean;
  hasBreakthroughOnly?: boolean;
};

// Load all sessions
export async function getSessionHistory(): Promise<SessionSummary[]> {
  try {
    const data = await AsyncStorage.getItem(SESSION_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load session history:', error);
    return [];
  }
}

// Save sessions
async function saveSessionHistory(sessions: SessionSummary[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save session history:', error);
  }
}

// Generate unique ID
function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new session summary
export async function createSessionSummary(params: {
  type: 'coaching' | 'calibration' | 'check-in';
  startTime: Date;
  endTime: Date;
  emotionTimeline: EmotionTimestamp[];
  coachingMoments: CoachingMoment[];
}): Promise<SessionSummary> {
  const { type, startTime, endTime, emotionTimeline, coachingMoments } = params;
  
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  
  // Calculate dominant emotion
  const emotionCounts: Record<string, number> = {};
  emotionTimeline.forEach(e => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });
  const dominantEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  
  // Get start/end emotions
  const startEmotion = emotionTimeline[0]?.emotion || 'neutral';
  const endEmotion = emotionTimeline[emotionTimeline.length - 1]?.emotion || 'neutral';
  
  // Calculate emotion shift
  const emotionValence: Record<string, number> = {
    happy: 1, calm: 0.8, hopeful: 0.7, content: 0.6, neutral: 0,
    confused: -0.3, anxious: -0.5, sad: -0.6, angry: -0.7, distressed: -0.9,
  };
  const startValence = emotionValence[startEmotion] ?? 0;
  const endValence = emotionValence[endEmotion] ?? 0;
  const emotionShift = endValence - startValence;
  
  // Extract techniques used
  const techniquesUsed = [...new Set(
    coachingMoments
      .filter(m => m.techniqueId)
      .map(m => m.techniqueName || m.techniqueId!)
  )];
  
  // Generate insights
  const insights = generateInsights({
    emotionTimeline,
    coachingMoments,
    emotionShift,
    duration,
    dominantEmotion,
  });
  
  // Detect breakthrough
  const hasBreakthrough = emotionShift > 0.5 || 
    (startEmotion === 'distressed' && ['calm', 'happy', 'hopeful'].includes(endEmotion));
  
  const session: SessionSummary = {
    id: generateId(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration,
    type,
    dominantEmotion,
    emotionTimeline,
    startEmotion,
    endEmotion,
    emotionShift,
    coachingMoments,
    techniquesUsed,
    insights,
    tags: [],
    isBookmarked: false,
    hasBreakthrough,
  };
  
  const sessions = await getSessionHistory();
  sessions.unshift(session);
  await saveSessionHistory(sessions.slice(0, 200)); // Keep last 200 sessions
  
  return session;
}

// Generate session insights
function generateInsights(params: {
  emotionTimeline: EmotionTimestamp[];
  coachingMoments: CoachingMoment[];
  emotionShift: number;
  duration: number;
  dominantEmotion: string;
}): SessionInsight[] {
  const { emotionTimeline, coachingMoments, emotionShift, duration, dominantEmotion } = params;
  const insights: SessionInsight[] = [];
  
  // Emotion shift insight
  if (emotionShift > 0.3) {
    insights.push({
      type: 'progress',
      title: 'Positive Shift',
      description: 'Your emotional state improved significantly during this session.',
      icon: 'trending-up',
      color: '#7BC67E',
    });
  } else if (emotionShift < -0.3) {
    insights.push({
      type: 'pattern',
      title: 'Emotional Challenge',
      description: 'This session touched on difficult emotions. That takes courage.',
      icon: 'heart',
      color: '#9B7EC6',
    });
  }
  
  // Technique effectiveness
  const techniqueCount = coachingMoments.filter(m => m.type === 'technique').length;
  if (techniqueCount > 0 && emotionShift > 0) {
    insights.push({
      type: 'highlight',
      title: 'Techniques Helped',
      description: `You practiced ${techniqueCount} technique${techniqueCount > 1 ? 's' : ''} and showed improvement.`,
      icon: 'lightbulb',
      color: '#F5A623',
    });
  }
  
  // Session duration insight
  if (duration > 600) { // 10+ minutes
    insights.push({
      type: 'progress',
      title: 'Deep Session',
      description: 'You took time for a thorough session. Consistency builds resilience.',
      icon: 'clock',
      color: '#6B8DD6',
    });
  }
  
  // Emotion pattern insight
  const emotionChanges = emotionTimeline.filter((e, i) => 
    i > 0 && e.emotion !== emotionTimeline[i - 1].emotion
  ).length;
  
  if (emotionChanges > 5) {
    insights.push({
      type: 'pattern',
      title: 'Emotional Fluidity',
      description: 'Your emotions shifted multiple times. This is normal and healthy.',
      icon: 'wave',
      color: '#4ECDC4',
    });
  } else if (emotionChanges === 0 && emotionTimeline.length > 3) {
    insights.push({
      type: 'pattern',
      title: 'Stable State',
      description: `You maintained a ${dominantEmotion} state throughout.`,
      icon: 'equals',
      color: '#B8B0C8',
    });
  }
  
  // Coaching engagement
  if (coachingMoments.length > 5) {
    insights.push({
      type: 'highlight',
      title: 'Active Engagement',
      description: 'You actively engaged with coaching suggestions.',
      icon: 'message',
      color: '#9B7EC6',
    });
  }
  
  return insights.slice(0, 4); // Max 4 insights
}

// Update session
export async function updateSession(
  id: string,
  updates: Partial<SessionSummary>
): Promise<SessionSummary | null> {
  const sessions = await getSessionHistory();
  const index = sessions.findIndex(s => s.id === id);
  
  if (index === -1) return null;
  
  sessions[index] = { ...sessions[index], ...updates };
  await saveSessionHistory(sessions);
  return sessions[index];
}

// Toggle bookmark
export async function toggleSessionBookmark(id: string): Promise<boolean> {
  const sessions = await getSessionHistory();
  const session = sessions.find(s => s.id === id);
  
  if (!session) return false;
  
  await updateSession(id, { isBookmarked: !session.isBookmarked });
  return !session.isBookmarked;
}

// Add rating
export async function rateSession(id: string, rating: number): Promise<void> {
  await updateSession(id, { userRating: Math.max(1, Math.min(5, rating)) });
}

// Add note
export async function addSessionNote(id: string, note: string): Promise<void> {
  await updateSession(id, { userNotes: note });
}

// Delete session
export async function deleteSession(id: string): Promise<boolean> {
  const sessions = await getSessionHistory();
  const filtered = sessions.filter(s => s.id !== id);
  
  if (filtered.length === sessions.length) return false;
  
  await saveSessionHistory(filtered);
  return true;
}

// Filter sessions
export async function filterSessions(filter: SessionFilter): Promise<SessionSummary[]> {
  let sessions = await getSessionHistory();
  
  if (filter.startDate) {
    sessions = sessions.filter(s => new Date(s.startTime) >= filter.startDate!);
  }
  
  if (filter.endDate) {
    sessions = sessions.filter(s => new Date(s.startTime) <= filter.endDate!);
  }
  
  if (filter.emotions && filter.emotions.length > 0) {
    sessions = sessions.filter(s => filter.emotions!.includes(s.dominantEmotion));
  }
  
  if (filter.types && filter.types.length > 0) {
    sessions = sessions.filter(s => filter.types!.includes(s.type));
  }
  
  if (filter.minDuration) {
    sessions = sessions.filter(s => s.duration >= filter.minDuration!);
  }
  
  if (filter.bookmarkedOnly) {
    sessions = sessions.filter(s => s.isBookmarked);
  }
  
  if (filter.hasBreakthroughOnly) {
    sessions = sessions.filter(s => s.hasBreakthrough);
  }
  
  return sessions;
}

// Get session statistics
export async function getSessionStats(): Promise<{
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  breakthroughCount: number;
  mostUsedTechniques: { name: string; count: number }[];
  emotionDistribution: Record<string, number>;
  weeklyProgress: { date: string; sessions: number; avgShift: number }[];
}> {
  const sessions = await getSessionHistory();
  
  const totalSessions = sessions.length;
  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);
  const averageDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  const breakthroughCount = sessions.filter(s => s.hasBreakthrough).length;
  
  // Technique usage
  const techniqueCounts: Record<string, number> = {};
  sessions.forEach(s => {
    s.techniquesUsed.forEach(t => {
      techniqueCounts[t] = (techniqueCounts[t] || 0) + 1;
    });
  });
  const mostUsedTechniques = Object.entries(techniqueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  
  // Emotion distribution
  const emotionDistribution: Record<string, number> = {};
  sessions.forEach(s => {
    emotionDistribution[s.dominantEmotion] = (emotionDistribution[s.dominantEmotion] || 0) + 1;
  });
  
  // Weekly progress (last 4 weeks)
  const weeklyProgress: { date: string; sessions: number; avgShift: number }[] = [];
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(fourWeeksAgo);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekSessions = sessions.filter(s => {
      const date = new Date(s.startTime);
      return date >= weekStart && date < weekEnd;
    });
    
    const avgShift = weekSessions.length > 0
      ? weekSessions.reduce((sum, s) => sum + s.emotionShift, 0) / weekSessions.length
      : 0;
    
    weeklyProgress.push({
      date: weekStart.toISOString().split('T')[0],
      sessions: weekSessions.length,
      avgShift: Math.round(avgShift * 100) / 100,
    });
  }
  
  return {
    totalSessions,
    totalMinutes,
    averageDuration,
    breakthroughCount,
    mostUsedTechniques,
    emotionDistribution,
    weeklyProgress,
  };
}

// Get recent sessions
export async function getRecentSessions(limit: number = 5): Promise<SessionSummary[]> {
  const sessions = await getSessionHistory();
  return sessions.slice(0, limit);
}
