/**
 * TrueReact - Theme Context
 * 
 * Neurodivergent-friendly theming with colors that represent:
 * - Gold/Amber: Autism acceptance (gold infinity symbol)
 * - Soft Violet: Neurodiversity awareness
 * - Teal: Mental health & wellness
 * - Warm backgrounds: Sensory-friendly, low-contrast
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeColors = {
  // Core backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Primary colors (Gold - Autism Acceptance)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Secondary (Violet - Neurodiversity)
  secondary: string;
  secondaryLight: string;
  
  // Accent (Teal - Mental Health)
  accent: string;
  accentLight: string;
  
  // Semantic
  success: string;
  warning: string;
  error: string;
  calm: string;
  
  // UI Elements
  border: string;
  cardBackground: string;
  overlay: string;
  
  // Special
  infinity: string; // For infinity symbol motifs
  gradient: string[];
};

// Dark theme - Warm, calming dark tones
const darkColors: ThemeColors = {
  // Warm dark backgrounds (not pure black - sensory friendly)
  background: '#1A1625',      // Deep warm purple-black
  surface: '#252136',         // Soft purple-gray
  surfaceElevated: '#2D2845', // Elevated surface
  
  // Text with warm undertones
  text: '#F5F0E8',            // Warm white
  textSecondary: '#B8B0C8',   // Soft lavender gray
  textMuted: '#7A7290',       // Muted purple-gray
  
  // Gold - Autism Acceptance (primary)
  primary: '#F5A623',         // Warm gold
  primaryLight: '#FFD166',    // Light gold
  primaryDark: '#D4920D',     // Deep gold
  
  // Violet - Neurodiversity (secondary)
  secondary: '#9B7EC6',       // Soft violet
  secondaryLight: '#C4B0E0',  // Light lavender
  
  // Teal - Mental Health (accent)
  accent: '#4ECDC4',          // Calming teal
  accentLight: '#7EDDD6',     // Light teal
  
  // Semantic colors (softer versions)
  success: '#7BC67E',         // Soft green
  warning: '#FFB347',         // Warm amber
  error: '#E07C7C',           // Soft coral (less alarming than red)
  calm: '#6B8DD6',            // Calming blue
  
  // UI Elements
  border: 'rgba(155, 126, 198, 0.2)',    // Soft violet border
  cardBackground: 'rgba(45, 40, 69, 0.8)', // Semi-transparent surface
  overlay: 'rgba(26, 22, 37, 0.9)',       // Dark overlay
  
  // Special
  infinity: '#F5A623',        // Gold for infinity symbols
  gradient: ['#1A1625', '#252136', '#2D2845'],
};

// Light theme - Warm cream tones (not harsh white)
const lightColors: ThemeColors = {
  // Warm cream backgrounds (sensory friendly)
  background: '#FAF8F5',      // Warm cream
  surface: '#F5F3EF',         // Soft beige
  surfaceElevated: '#FFFFFF', // White for elevated
  
  // Text with warm undertones
  text: '#2D2845',            // Warm dark purple
  textSecondary: '#5C5478',   // Medium purple-gray
  textMuted: '#8A8299',       // Muted purple
  
  // Gold - Autism Acceptance (primary)
  primary: '#E09915',         // Rich gold (slightly darker for light mode)
  primaryLight: '#FFD166',    // Light gold
  primaryDark: '#C4820A',     // Deep gold
  
  // Violet - Neurodiversity (secondary)
  secondary: '#7B68B0',       // Deeper violet for contrast
  secondaryLight: '#A99CD0',  // Medium lavender
  
  // Teal - Mental Health (accent)
  accent: '#3DBDB5',          // Teal (slightly darker)
  accentLight: '#6DD5CF',     // Light teal
  
  // Semantic colors
  success: '#5DB361',         // Soft green
  warning: '#E09915',         // Amber
  error: '#D06666',           // Soft coral
  calm: '#5A7BC2',            // Calming blue
  
  // UI Elements
  border: 'rgba(123, 104, 176, 0.15)',   // Soft violet border
  cardBackground: 'rgba(255, 255, 255, 0.9)', // White cards
  overlay: 'rgba(250, 248, 245, 0.95)',  // Light overlay
  
  // Special
  infinity: '#E09915',        // Gold for infinity symbols
  gradient: ['#FAF8F5', '#F5F3EF', '#EDE9E3'],
};

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark'); // Default to dark for this app

  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const value: ThemeContextType = {
    themeMode,
    isDark,
    colors,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
