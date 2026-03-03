/**
 * TrueReact - Technique Bookmarks Service
 * 
 * Save and manage favorite CBT/DBT techniques for quick access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_STORAGE_KEY = '@truereact_technique_bookmarks';
const RECENT_TECHNIQUES_KEY = '@truereact_recent_techniques';

export type TechniqueType = {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
};

export type BookmarkedTechnique = {
  technique: TechniqueType;
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
export async function getBookmarks(): Promise<BookmarkedTechnique[]> {
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
  const bookmarks = await getBookmarks();
  return bookmarks.some(b => b.technique.id === techniqueId);
}

/**
 * Add a technique to bookmarks
 */
export async function addBookmark(
  technique: TechniqueType,
  notes?: string
): Promise<BookmarkedTechnique[]> {
  try {
    const bookmarks = await getBookmarks();
    
    // Check if already bookmarked
    if (bookmarks.some(b => b.technique.id === technique.id)) {
      return bookmarks;
    }

    const newBookmark: BookmarkedTechnique = {
      technique,
      bookmarkedAt: new Date().toISOString(),
      notes,
      usageCount: 0,
    };

    bookmarks.push(newBookmark);
    await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    return bookmarks;
  } catch (error) {
    console.error('Failed to add bookmark:', error);
    throw error;
  }
}

/**
 * Remove a technique from bookmarks
 */
export async function removeBookmark(techniqueId: string): Promise<BookmarkedTechnique[]> {
  try {
    const bookmarks = await getBookmarks();
    const filtered = bookmarks.filter(b => b.technique.id !== techniqueId);
    await AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Failed to remove bookmark:', error);
    throw error;
  }
}

/**
 * Toggle bookmark status, returns updated bookmarks list
 */
export async function toggleBookmark(
  technique: TechniqueType
): Promise<BookmarkedTechnique[]> {
  const bookmarked = await isBookmarked(technique.id);
  
  if (bookmarked) {
    return removeBookmark(technique.id);
  } else {
    return addBookmark(technique);
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
    const bookmarks = await getBookmarks();
    const index = bookmarks.findIndex(b => b.technique.id === techniqueId);
    
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
    const bookmarks = await getBookmarks();
    const bookmarkIndex = bookmarks.findIndex(b => b.technique.id === techniqueId);
    
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
export async function getRecentlyUsedTechniques(): Promise<RecentTechnique[]> {
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
export async function getMostUsedTechniques(limit: number = 5): Promise<BookmarkedTechnique[]> {
  const bookmarks = await getBookmarks();
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
  const bookmarks = await getBookmarks();
  return JSON.stringify(bookmarks, null, 2);
}

/**
 * Import bookmarks data
 */
export async function importBookmarksData(jsonData: string): Promise<number> {
  try {
    const imported: BookmarkedTechnique[] = JSON.parse(jsonData);
    const existing = await getBookmarks();
    
    // Merge, avoiding duplicates
    const merged = [...existing];
    let addedCount = 0;
    
    for (const bookmark of imported) {
      if (!merged.some(b => b.technique.id === bookmark.technique.id)) {
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
  getBookmarks,
  isBookmarked,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  updateBookmarkNotes,
  recordTechniqueUsage,
  getRecentlyUsedTechniques,
  getMostUsedTechniques,
  clearAllBookmarks,
  exportBookmarksData,
  importBookmarksData,
};
