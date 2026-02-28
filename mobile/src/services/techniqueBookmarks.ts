/**
 * TrueReact - Technique Bookmarks Service
 * 
 * Save and manage favorite CBT/DBT techniques for quick access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_STORAGE_KEY = '@truereact_technique_bookmarks';
const RECENT_TECHNIQUES_KEY = '@truereact_recent_techniques';

export type TechniqueBookmark = {
  techniqueId: string;
  bookmarkedAt: string;
  notes?: string;
  usageCount: number;
  lastUsed?: string;
};

export type RecentTechnique = {
  techniqueId: string;
  usedAt: string;
  context?: string; // What emotion triggered it
};

/**
 * Get all bookmarked techniques
 */
export async function getBookmarkedTechniques(): Promise<TechniqueBookmark[]> {
  try {
    const stored = await AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get bookmarks:', error);
    return [];
  }
}

/**
 * Check if a technique is bookmarked
 */
export async function isBookmarked(techniqueId: string): Promise<boolean> {
  const bookmarks = await getBookmarkedTechniques();
  return bookmarks.some(b => b.techniqueId === techniqueId);
}

/**
 * Add a technique to bookmarks
 */
export async function addBookmark(
  techniqueId: string, 
  notes?: string
): Promise<void> {
  try {
    const bookmarks = await getBookmarkedTechniques();
    
    // Check if already bookmarked
    if (bookmarks.some(b => b.techniqueId === techniqueId)) {
      return;
    }

    const newBookmark: TechniqueBookmark = {
      techniqueId,
      bookmarkedAt: new Date().toISOString(),
      notes,
      usageCount: 0,
    };

    bookmarks.push(newBookmark);
    await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Failed to add bookmark:', error);
    throw error;
  }
}

/**
 * Remove a technique from bookmarks
 */
export async function removeBookmark(techniqueId: string): Promise<void> {
  try {
    const bookmarks = await getBookmarkedTechniques();
    const filtered = bookmarks.filter(b => b.techniqueId !== techniqueId);
    await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove bookmark:', error);
    throw error;
  }
}

/**
 * Toggle bookmark status
 */
export async function toggleBookmark(
  techniqueId: string,
  notes?: string
): Promise<boolean> {
  const bookmarked = await isBookmarked(techniqueId);
  
  if (bookmarked) {
    await removeBookmark(techniqueId);
    return false;
  } else {
    await addBookmark(techniqueId, notes);
    return true;
  }
}

/**
 * Update bookmark notes
 */
export async function updateBookmarkNotes(
  techniqueId: string, 
  notes: string
): Promise<void> {
  try {
    const bookmarks = await getBookmarkedTechniques();
    const index = bookmarks.findIndex(b => b.techniqueId === techniqueId);
    
    if (index !== -1) {
      bookmarks[index].notes = notes;
      await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    }
  } catch (error) {
    console.error('Failed to update bookmark notes:', error);
    throw error;
  }
}

/**
 * Record technique usage (increases count and updates lastUsed)
 */
export async function recordTechniqueUsage(
  techniqueId: string,
  context?: string
): Promise<void> {
  try {
    // Update bookmark usage count if bookmarked
    const bookmarks = await getBookmarkedTechniques();
    const bookmarkIndex = bookmarks.findIndex(b => b.techniqueId === techniqueId);
    
    if (bookmarkIndex !== -1) {
      bookmarks[bookmarkIndex].usageCount += 1;
      bookmarks[bookmarkIndex].lastUsed = new Date().toISOString();
      await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    }

    // Add to recent techniques
    const recentStr = await AsyncStorage.getItem(RECENT_TECHNIQUES_KEY);
    const recent: RecentTechnique[] = recentStr ? JSON.parse(recentStr) : [];
    
    recent.unshift({
      techniqueId,
      usedAt: new Date().toISOString(),
      context,
    });

    // Keep only last 20 recent techniques
    const trimmed = recent.slice(0, 20);
    await AsyncStorage.setItem(RECENT_TECHNIQUES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to record technique usage:', error);
  }
}

/**
 * Get recently used techniques
 */
export async function getRecentTechniques(): Promise<RecentTechnique[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_TECHNIQUES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get recent techniques:', error);
    return [];
  }
}

/**
 * Get most used bookmarked techniques (sorted by usage)
 */
export async function getMostUsedTechniques(limit: number = 5): Promise<TechniqueBookmark[]> {
  const bookmarks = await getBookmarkedTechniques();
  return bookmarks
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Clear all bookmarks
 */
export async function clearAllBookmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear bookmarks:', error);
    throw error;
  }
}

/**
 * Export bookmarks data (for backup/sharing)
 */
export async function exportBookmarksData(): Promise<string> {
  const bookmarks = await getBookmarkedTechniques();
  return JSON.stringify(bookmarks, null, 2);
}

/**
 * Import bookmarks data
 */
export async function importBookmarksData(jsonData: string): Promise<number> {
  try {
    const imported: TechniqueBookmark[] = JSON.parse(jsonData);
    const existing = await getBookmarkedTechniques();
    
    // Merge, avoiding duplicates
    const merged = [...existing];
    let addedCount = 0;
    
    for (const bookmark of imported) {
      if (!merged.some(b => b.techniqueId === bookmark.techniqueId)) {
        merged.push(bookmark);
        addedCount++;
      }
    }

    await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(merged));
    return addedCount;
  } catch (error) {
    console.error('Failed to import bookmarks:', error);
    throw error;
  }
}

export default {
  getBookmarkedTechniques,
  isBookmarked,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  updateBookmarkNotes,
  recordTechniqueUsage,
  getRecentTechniques,
  getMostUsedTechniques,
  clearAllBookmarks,
  exportBookmarksData,
  importBookmarksData,
};
