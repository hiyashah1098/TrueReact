/**
 * TrueReact - Theme Context
 * 
 * Provides theming and color scheme management.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  border: string;
};

const darkColors: ThemeColors = {
  background: '#1a1a2e',
  surface: '#16213e',
  text: '#ffffff',
  textSecondary: '#8b8b8b',
  primary: '#e94560',
  secondary: '#0f3460',
  accent: '#60a5fa',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#ef4444',
  border: 'rgba(255, 255, 255, 0.1)',
};

const lightColors: ThemeColors = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#1a1a2e',
  textSecondary: '#6b6b8b',
  primary: '#e94560',
  secondary: '#e8e8f0',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#dc2626',
  border: 'rgba(0, 0, 0, 0.1)',
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
