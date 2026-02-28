/**
 * TrueReact - Settings Screen
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SETTINGS_KEY = '@truereact_settings';

type Settings = {
  hapticEnabled: boolean;
  voiceCoaching: boolean;
  safeStateEnabled: boolean;
};

const defaultSettings: Settings = {
  hapticEnabled: true,
  voiceCoaching: true,
  safeStateEnabled: true,
};

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const { isDark, themeMode, setThemeMode, colors } = useTheme();
  const [hapticEnabled, setHapticEnabled] = React.useState(true);
  const [voiceCoaching, setVoiceCoaching] = React.useState(true);
  const [safeStateEnabled, setSafeStateEnabled] = React.useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings: Settings = JSON.parse(stored);
        setHapticEnabled(settings.hapticEnabled);
        setVoiceCoaching(settings.voiceCoaching);
        setSafeStateEnabled(settings.safeStateEnabled);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      const current: Settings = {
        hapticEnabled,
        voiceCoaching,
        safeStateEnabled,
        ...newSettings,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [hapticEnabled, voiceCoaching, safeStateEnabled]);

  const handleHapticChange = (value: boolean) => {
    setHapticEnabled(value);
    saveSettings({ hapticEnabled: value });
  };

  const handleVoiceCoachingChange = (value: boolean) => {
    setVoiceCoaching(value);
    saveSettings({ voiceCoaching: value });
  };

  const handleSafeStateChange = (value: boolean) => {
    setSafeStateEnabled(value);
    saveSettings({ safeStateEnabled: value });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Session Data',
      'Are you sure you want to delete all coaching history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@truereact_history');
              Alert.alert('Done', 'All session data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#1A1625', '#252136']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Coaching Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coaching</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mic-outline" size={24} color="#F5A623" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Voice Coaching</Text>
                <Text style={styles.settingDescription}>
                  Receive audio feedback in addition to visual
                </Text>
              </View>
            </View>
            <Switch
              value={voiceCoaching}
              onValueChange={handleVoiceCoachingChange}
              trackColor={{ false: '#3e3e5e', true: '#F5A623' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color="#9B7EC6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>
                  Feel gentle vibrations for coaching moments
                </Text>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={handleHapticChange}
              trackColor={{ false: '#3e3e5e', true: '#9B7EC6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={isDark ? "moon-outline" : "sunny-outline"} 
                size={24} 
                color="#FFD166" 
              />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  {isDark ? 'Warm dark theme active' : 'Light cream theme active'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => setThemeMode(isDark ? 'light' : 'dark')}
              trackColor={{ false: '#3e3e5e', true: '#FFD166' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItemButton}
            onPress={() => setThemeMode('system')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color="#9B7EC6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Use System Theme</Text>
                <Text style={styles.settingDescription}>
                  {themeMode === 'system' ? '✓ Active' : 'Match device settings'}
                </Text>
              </View>
            </View>
            <Ionicons 
              name={themeMode === 'system' ? "checkmark-circle" : "chevron-forward"} 
              size={20} 
              color={themeMode === 'system' ? "#4ECDC4" : "#7A7290"} 
            />
          </TouchableOpacity>
        </View>

        {/* Safety Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4ECDC4" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Safe State Mode</Text>
                <Text style={styles.settingDescription}>
                  Automatically transition to support mode if distress is detected
                </Text>
              </View>
            </View>
            <Switch
              value={safeStateEnabled}
              onValueChange={handleSafeStateChange}
              trackColor={{ false: '#3e3e5e', true: '#4ade80' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={styles.settingItemButton}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={24} color="#60a5fa" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Crisis Resources Location</Text>
                <Text style={styles.settingDescription}>
                  United States
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b8b8b" />
          </TouchableOpacity>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <TouchableOpacity style={styles.settingItemButton} onPress={handleClearData}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={24} color="#E07C7C" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Clear Session Data</Text>
                <Text style={styles.settingDescription}>
                  Delete all coaching history
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7A7290" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItemButton}>
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={24} color="#9B7EC6" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>
                  How we protect your data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7A7290" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutInfo}>
            <Text style={styles.appName}>TrueReact</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.copyright}>
              Built for Hacklytics 2026
            </Text>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {user && (
            <View style={styles.accountInfo}>
              <Ionicons name="person-circle-outline" size={48} color="#F5A623" />
              <View style={styles.accountDetails}>
                <Text style={styles.accountEmail}>{user.email}</Text>
                <Text style={styles.accountStats}>
                  {profile?.stats?.totalSessions || 0} sessions • {profile?.stats?.totalCoachingMoments || 0} coaching moments
                </Text>
              </View>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut },
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B7EC6',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.1)',
  },
  settingItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5F0E8',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#B8B0C8',
  },
  aboutInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5F0E8',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: '#B8B0C8',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: '#7A7290',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.1)',
  },
  accountDetails: {
    marginLeft: 16,
    flex: 1,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F0E8',
    marginBottom: 4,
  },
  accountStats: {
    fontSize: 13,
    color: '#B8B0C8',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(224, 124, 124, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(224, 124, 124, 0.3)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E07C7C',
    marginLeft: 8,
  },
});
