/**
 * TrueReact - Gamification Service
 * 
 * Manages progress streaks, badges, achievements,
 * and milestone tracking for user engagement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GAMIFICATION_STORAGE_KEY = '@truereact_gamification';
const ACTIVITY_LOG_KEY = '@truereact_activity_log';

// Badge definitions
export type BadgeId = 
  | 'first_session'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'streak_100'
  | 'sessions_5'
  | 'sessions_10'
  | 'sessions_25'
  | 'sessions_50'
  | 'sessions_100'
  | 'journal_first'
  | 'journal_10'
  | 'technique_master'
  | 'breathing_pro'
  | 'mindfulness_guru'
  | 'emotion_explorer'
  | 'night_owl'
  | 'early_bird'
  | 'weekend_warrior'
  | 'consistent_week'
  | 'mood_tracker'
  | 'calibration_king'
  | 'comeback_kid'
  | 'zen_master'
  | 'community_member';

export type Badge = {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  category: 'streak' | 'milestone' | 'engagement' | 'mastery' | 'special';
  requirement: string;
  points: number;
  unlockedAt?: string;
  progress?: number; // 0-1 for in-progress badges
};

export type ActivityType = 
  | 'session_complete'
  | 'journal_entry'
  | 'technique_used'
  | 'breathing_exercise'
  | 'mood_checkin'
  | 'calibration'
  | 'app_open';

export type ActivityLog = {
  type: ActivityType;
  timestamp: string;
  metadata?: Record<string, any>;
};

export type GamificationData = {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  badges: Badge[];
  level: number;
  sessionsCompleted: number;
  journalEntries: number;
  techniquesUsed: number;
  breathingExercises: number;
  moodCheckins: number;
  calibrations: number;
};

// All available badges
const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt' | 'progress'>[] = [
  // Streak badges
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Maintain a 3-day streak',
    icon: 'fire',
    color: '#F5A623',
    category: 'streak',
    requirement: '3-day streak',
    points: 50,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: 'fire',
    color: '#FF7F50',
    category: 'streak',
    requirement: '7-day streak',
    points: 100,
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day streak',
    icon: 'fire',
    color: '#FF6347',
    category: 'streak',
    requirement: '14-day streak',
    points: 200,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: 'fire',
    color: '#FF4500',
    category: 'streak',
    requirement: '30-day streak',
    points: 500,
  },
  {
    id: 'streak_100',
    name: 'Century Champion',
    description: 'Maintain a 100-day streak',
    icon: 'trophy-award',
    color: '#FFD700',
    category: 'streak',
    requirement: '100-day streak',
    points: 2000,
  },

  // Session milestones
  {
    id: 'first_session',
    name: 'First Step',
    description: 'Complete your first coaching session',
    icon: 'star',
    color: '#9B7EC6',
    category: 'milestone',
    requirement: '1 session',
    points: 25,
  },
  {
    id: 'sessions_5',
    name: 'Getting Comfortable',
    description: 'Complete 5 coaching sessions',
    icon: 'numeric-5-circle',
    color: '#6B8DD6',
    category: 'milestone',
    requirement: '5 sessions',
    points: 75,
  },
  {
    id: 'sessions_10',
    name: 'Double Digits',
    description: 'Complete 10 coaching sessions',
    icon: 'numeric-10-circle',
    color: '#4ECDC4',
    category: 'milestone',
    requirement: '10 sessions',
    points: 150,
  },
  {
    id: 'sessions_25',
    name: 'Quarter Century',
    description: 'Complete 25 coaching sessions',
    icon: 'medal',
    color: '#7BC67E',
    category: 'milestone',
    requirement: '25 sessions',
    points: 300,
  },
  {
    id: 'sessions_50',
    name: 'Half Century',
    description: 'Complete 50 coaching sessions',
    icon: 'medal-outline',
    color: '#C0C0C0',
    category: 'milestone',
    requirement: '50 sessions',
    points: 500,
  },
  {
    id: 'sessions_100',
    name: 'Centurion',
    description: 'Complete 100 coaching sessions',
    icon: 'trophy',
    color: '#FFD700',
    category: 'milestone',
    requirement: '100 sessions',
    points: 1000,
  },

  // Journal badges
  {
    id: 'journal_first',
    name: 'Dear Diary',
    description: 'Create your first voice journal entry',
    icon: 'book-open-page-variant',
    color: '#9B7EC6',
    category: 'engagement',
    requirement: '1 journal entry',
    points: 25,
  },
  {
    id: 'journal_10',
    name: 'Reflective Writer',
    description: 'Create 10 voice journal entries',
    icon: 'notebook-multiple',
    color: '#6B8DD6',
    category: 'engagement',
    requirement: '10 journal entries',
    points: 150,
  },

  // Mastery badges
  {
    id: 'technique_master',
    name: 'Technique Master',
    description: 'Use 10 different CBT/DBT techniques',
    icon: 'brain',
    color: '#9B7EC6',
    category: 'mastery',
    requirement: '10 unique techniques',
    points: 200,
  },
  {
    id: 'breathing_pro',
    name: 'Breathing Pro',
    description: 'Complete 20 breathing exercises',
    icon: 'weather-windy',
    color: '#4ECDC4',
    category: 'mastery',
    requirement: '20 breathing exercises',
    points: 150,
  },
  {
    id: 'mindfulness_guru',
    name: 'Mindfulness Guru',
    description: 'Spend 5 hours total in sessions',
    icon: 'meditation',
    color: '#7BC67E',
    category: 'mastery',
    requirement: '5 hours of practice',
    points: 300,
  },
  {
    id: 'emotion_explorer',
    name: 'Emotion Explorer',
    description: 'Identify 8 different emotions across sessions',
    icon: 'emoticon-outline',
    color: '#FFD166',
    category: 'mastery',
    requirement: '8 unique emotions',
    points: 100,
  },

  // Special badges
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a session after 10 PM',
    icon: 'owl',
    color: '#5D4E7A',
    category: 'special',
    requirement: 'Session after 10 PM',
    points: 30,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a session before 7 AM',
    icon: 'weather-sunset-up',
    color: '#F5A623',
    category: 'special',
    requirement: 'Session before 7 AM',
    points: 30,
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete sessions on both Saturday and Sunday',
    icon: 'calendar-weekend',
    color: '#6B8DD6',
    category: 'special',
    requirement: 'Both weekend days',
    points: 50,
  },
  {
    id: 'consistent_week',
    name: 'Perfect Week',
    description: 'Use the app every day for a full week',
    icon: 'calendar-check',
    color: '#7BC67E',
    category: 'special',
    requirement: '7 consecutive days',
    points: 150,
  },
  {
    id: 'mood_tracker',
    name: 'Mood Tracker',
    description: 'Complete 10 mood check-ins',
    icon: 'chart-line',
    color: '#9B7EC6',
    category: 'engagement',
    requirement: '10 mood check-ins',
    points: 75,
  },
  {
    id: 'calibration_king',
    name: 'Calibration King',
    description: 'Complete 5 calibration sessions',
    icon: 'tune-vertical',
    color: '#4ECDC4',
    category: 'engagement',
    requirement: '5 calibrations',
    points: 100,
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Return after 7+ days away',
    icon: 'redo-variant',
    color: '#F5A623',
    category: 'special',
    requirement: 'Return after break',
    points: 50,
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    description: 'Reach calm state from anxious in a single session',
    icon: 'peace',
    color: '#4ECDC4',
    category: 'mastery',
    requirement: 'Anxious to calm transition',
    points: 100,
  },
  {
    id: 'community_member',
    name: 'Community Member',
    description: 'Visit the community section',
    icon: 'account-group',
    color: '#9B7EC6',
    category: 'engagement',
    requirement: 'Visit community',
    points: 15,
  },
];

// Calculate level from points
function calculateLevel(points: number): number {
  // Levels require exponentially more points
  // Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 500, etc.
  if (points < 100) return 1;
  if (points < 250) return 2;
  if (points < 500) return 3;
  if (points < 1000) return 4;
  if (points < 2000) return 5;
  if (points < 3500) return 6;
  if (points < 5500) return 7;
  if (points < 8000) return 8;
  if (points < 11000) return 9;
  return 10 + Math.floor((points - 11000) / 5000);
}

// Points needed for next level
export function getPointsForNextLevel(currentPoints: number): { current: number; required: number; progress: number } {
  const levels = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000];
  const currentLevel = calculateLevel(currentPoints);
  
  if (currentLevel >= 10) {
    const basePoints = 11000;
    const levelInTier = currentLevel - 10;
    const tierStart = basePoints + (levelInTier * 5000);
    const tierEnd = tierStart + 5000;
    return {
      current: currentPoints - tierStart,
      required: 5000,
      progress: (currentPoints - tierStart) / 5000,
    };
  }
  
  const currentLevelPoints = levels[currentLevel - 1];
  const nextLevelPoints = levels[currentLevel];
  
  return {
    current: currentPoints - currentLevelPoints,
    required: nextLevelPoints - currentLevelPoints,
    progress: (currentPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints),
  };
}

// Initialize with default data
function getDefaultData(): GamificationData {
  return {
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    badges: BADGE_DEFINITIONS.map(b => ({ ...b, progress: 0 })),
    level: 1,
    sessionsCompleted: 0,
    journalEntries: 0,
    techniquesUsed: 0,
    breathingExercises: 0,
    moodCheckins: 0,
    calibrations: 0,
  };
}

// Load gamification data
export async function getGamificationData(): Promise<GamificationData> {
  try {
    const data = await AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Merge with default badges to handle new badges added
      const existingBadgeIds = parsed.badges.map((b: Badge) => b.id);
      const newBadges = BADGE_DEFINITIONS.filter(b => !existingBadgeIds.includes(b.id));
      return {
        ...parsed,
        badges: [...parsed.badges, ...newBadges.map(b => ({ ...b, progress: 0 }))],
      };
    }
  } catch (error) {
    console.error('Failed to load gamification data:', error);
  }
  return getDefaultData();
}

// Save gamification data
async function saveGamificationData(data: GamificationData): Promise<void> {
  try {
    await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save gamification data:', error);
  }
}

// Log activity
export async function logActivity(type: ActivityType, metadata?: Record<string, any>): Promise<void> {
  try {
    const logData = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
    const logs: ActivityLog[] = logData ? JSON.parse(logData) : [];
    
    logs.push({
      type,
      timestamp: new Date().toISOString(),
      metadata,
    });
    
    // Keep only last 1000 activities
    const trimmedLogs = logs.slice(-1000);
    await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmedLogs));
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Get activity logs
export async function getActivityLogs(limit?: number): Promise<ActivityLog[]> {
  try {
    const data = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
    if (data) {
      const logs: ActivityLog[] = JSON.parse(data);
      return limit ? logs.slice(-limit) : logs;
    }
  } catch (error) {
    console.error('Failed to get activity logs:', error);
  }
  return [];
}

// Update streak based on activity
function updateStreak(data: GamificationData): GamificationData {
  const today = new Date().toDateString();
  const lastActivity = data.lastActivityDate ? new Date(data.lastActivityDate).toDateString() : null;
  
  if (!lastActivity) {
    // First activity ever
    return {
      ...data,
      currentStreak: 1,
      longestStreak: Math.max(1, data.longestStreak),
      lastActivityDate: new Date().toISOString(),
    };
  }
  
  if (lastActivity === today) {
    // Already logged activity today
    return data;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  if (lastActivity === yesterdayStr) {
    // Consecutive day - increment streak
    const newStreak = data.currentStreak + 1;
    return {
      ...data,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, data.longestStreak),
      lastActivityDate: new Date().toISOString(),
    };
  }
  
  // Streak broken - check for comeback badge
  const lastDate = new Date(data.lastActivityDate!);
  const daysSinceLastActivity = Math.floor(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return {
    ...data,
    currentStreak: 1,
    lastActivityDate: new Date().toISOString(),
    // Flag for comeback badge check
    _daysSinceLastActivity: daysSinceLastActivity,
  } as GamificationData & { _daysSinceLastActivity: number };
}

// Check and unlock badges
type UnlockResult = { newlyUnlocked: Badge[]; data: GamificationData };

function checkBadges(data: GamificationData): UnlockResult {
  const newlyUnlocked: Badge[] = [];
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  
  const updatedBadges = data.badges.map(badge => {
    // Skip already unlocked badges
    if (badge.unlockedAt) return badge;
    
    let shouldUnlock = false;
    let progress = 0;

    switch (badge.id) {
      // Streak badges
      case 'streak_3':
        progress = Math.min(data.currentStreak / 3, 1);
        shouldUnlock = data.currentStreak >= 3;
        break;
      case 'streak_7':
        progress = Math.min(data.currentStreak / 7, 1);
        shouldUnlock = data.currentStreak >= 7;
        break;
      case 'streak_14':
        progress = Math.min(data.currentStreak / 14, 1);
        shouldUnlock = data.currentStreak >= 14;
        break;
      case 'streak_30':
        progress = Math.min(data.currentStreak / 30, 1);
        shouldUnlock = data.currentStreak >= 30;
        break;
      case 'streak_100':
        progress = Math.min(data.currentStreak / 100, 1);
        shouldUnlock = data.currentStreak >= 100;
        break;
        
      // Session milestones
      case 'first_session':
        shouldUnlock = data.sessionsCompleted >= 1;
        progress = Math.min(data.sessionsCompleted / 1, 1);
        break;
      case 'sessions_5':
        progress = Math.min(data.sessionsCompleted / 5, 1);
        shouldUnlock = data.sessionsCompleted >= 5;
        break;
      case 'sessions_10':
        progress = Math.min(data.sessionsCompleted / 10, 1);
        shouldUnlock = data.sessionsCompleted >= 10;
        break;
      case 'sessions_25':
        progress = Math.min(data.sessionsCompleted / 25, 1);
        shouldUnlock = data.sessionsCompleted >= 25;
        break;
      case 'sessions_50':
        progress = Math.min(data.sessionsCompleted / 50, 1);
        shouldUnlock = data.sessionsCompleted >= 50;
        break;
      case 'sessions_100':
        progress = Math.min(data.sessionsCompleted / 100, 1);
        shouldUnlock = data.sessionsCompleted >= 100;
        break;
        
      // Journal badges
      case 'journal_first':
        shouldUnlock = data.journalEntries >= 1;
        progress = Math.min(data.journalEntries / 1, 1);
        break;
      case 'journal_10':
        progress = Math.min(data.journalEntries / 10, 1);
        shouldUnlock = data.journalEntries >= 10;
        break;
        
      // Engagement badges
      case 'breathing_pro':
        progress = Math.min(data.breathingExercises / 20, 1);
        shouldUnlock = data.breathingExercises >= 20;
        break;
      case 'mood_tracker':
        progress = Math.min(data.moodCheckins / 10, 1);
        shouldUnlock = data.moodCheckins >= 10;
        break;
      case 'calibration_king':
        progress = Math.min(data.calibrations / 5, 1);
        shouldUnlock = data.calibrations >= 5;
        break;
        
      // Time-based badges
      case 'night_owl':
        // Check if current session is after 10 PM
        shouldUnlock = hour >= 22;
        break;
      case 'early_bird':
        // Check if current session is before 7 AM
        shouldUnlock = hour < 7;
        break;
        
      // Comeback badge
      case 'comeback_kid':
        const daysSince = (data as any)._daysSinceLastActivity;
        shouldUnlock = daysSince !== undefined && daysSince >= 7;
        break;
        
      default:
        // Handle other badges that need more context
        break;
    }

    if (shouldUnlock) {
      const unlockedBadge = {
        ...badge,
        unlockedAt: new Date().toISOString(),
        progress: 1,
      };
      newlyUnlocked.push(unlockedBadge);
      return unlockedBadge;
    }

    return { ...badge, progress };
  });

  // Calculate new points
  const pointsEarned = newlyUnlocked.reduce((sum, badge) => sum + badge.points, 0);
  const newTotalPoints = data.totalPoints + pointsEarned;

  return {
    newlyUnlocked,
    data: {
      ...data,
      badges: updatedBadges,
      totalPoints: newTotalPoints,
      level: calculateLevel(newTotalPoints),
    },
  };
}

// Record activity and check for badge unlocks
export async function recordActivity(
  type: ActivityType,
  metadata?: Record<string, any>
): Promise<{ newBadges: Badge[]; data: GamificationData }> {
  await logActivity(type, metadata);
  
  let data = await getGamificationData();
  
  // Update counters based on activity type
  switch (type) {
    case 'session_complete':
      data.sessionsCompleted += 1;
      break;
    case 'journal_entry':
      data.journalEntries += 1;
      break;
    case 'technique_used':
      data.techniquesUsed += 1;
      break;
    case 'breathing_exercise':
      data.breathingExercises += 1;
      break;
    case 'mood_checkin':
      data.moodCheckins += 1;
      break;
    case 'calibration':
      data.calibrations += 1;
      break;
  }
  
  // Update streak
  data = updateStreak(data);
  
  // Check badges
  const { newlyUnlocked, data: updatedData } = checkBadges(data);
  
  // Clean up temporary fields
  delete (updatedData as any)._daysSinceLastActivity;
  
  await saveGamificationData(updatedData);
  
  return {
    newBadges: newlyUnlocked,
    data: updatedData,
  };
}

// Get unlocked badges
export async function getUnlockedBadges(): Promise<Badge[]> {
  const data = await getGamificationData();
  return data.badges.filter(b => b.unlockedAt);
}

// Get locked badges with progress
export async function getLockedBadges(): Promise<Badge[]> {
  const data = await getGamificationData();
  return data.badges.filter(b => !b.unlockedAt).sort((a, b) => (b.progress || 0) - (a.progress || 0));
}

// Get badges by category
export async function getBadgesByCategory(category: Badge['category']): Promise<Badge[]> {
  const data = await getGamificationData();
  return data.badges.filter(b => b.category === category);
}

// Get summary stats for display
export type GamificationSummary = {
  level: number;
  totalPoints: number;
  nextLevelProgress: number;
  pointsToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  badgesUnlocked: number;
  totalBadges: number;
  recentBadges: Badge[];
};

export async function getGamificationSummary(): Promise<GamificationSummary> {
  const data = await getGamificationData();
  const unlockedBadges = data.badges.filter(b => b.unlockedAt);
  const levelProgress = getPointsForNextLevel(data.totalPoints);
  
  // Sort by unlock date, most recent first
  const sortedBadges = unlockedBadges.sort((a, b) => 
    new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
  );
  
  return {
    level: data.level,
    totalPoints: data.totalPoints,
    nextLevelProgress: levelProgress.progress,
    pointsToNextLevel: levelProgress.required - levelProgress.current,
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    badgesUnlocked: unlockedBadges.length,
    totalBadges: data.badges.length,
    recentBadges: sortedBadges.slice(0, 3),
  };
}

// Reset all gamification data (for testing)
export async function resetGamification(): Promise<void> {
  await AsyncStorage.removeItem(GAMIFICATION_STORAGE_KEY);
  await AsyncStorage.removeItem(ACTIVITY_LOG_KEY);
}
