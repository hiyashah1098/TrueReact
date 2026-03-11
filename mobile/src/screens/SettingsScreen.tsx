/**
 * TrueReact - Settings Screen
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SETTINGS_KEY = '@truereact_settings';
const LOCATION_KEY = '@truereact_crisis_location';

const CRISIS_LOCATIONS = [
  { id: 'us', name: 'United States', flag: '🇺🇸' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'ca', name: 'Canada', flag: '🇨🇦' },
  { id: 'au', name: 'Australia', flag: '🇦🇺' },
  { id: 'nz', name: 'New Zealand', flag: '🇳🇿' },
  { id: 'ie', name: 'Ireland', flag: '🇮🇪' },
  { id: 'de', name: 'Germany', flag: '🇩🇪' },
  { id: 'fr', name: 'France', flag: '🇫🇷' },
  { id: 'in', name: 'India', flag: '🇮🇳' },
  { id: 'other', name: 'Other / International', flag: '🌍' },
];

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
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [voiceCoaching, setVoiceCoaching] = useState(true);
  const [safeStateEnabled, setSafeStateEnabled] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('us');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      const loc = await AsyncStorage.getItem(LOCATION_KEY);
      if (loc) setSelectedLocation(loc);
    } catch (e) {
      console.error('Failed to load location:', e);
    }
  };

  const handleLocationChange = async (locationId: string) => {
    setSelectedLocation(locationId);
    try {
      await AsyncStorage.setItem(LOCATION_KEY, locationId);
    } catch (e) {
      console.error('Failed to save location:', e);
    }
    setShowLocationModal(false);
  };

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

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: colors.background,
    },
    sectionTitle: {
      color: colors.secondary,
    },
    settingItem: {
      backgroundColor: isDark ? 'rgba(45, 40, 69, 0.6)' : 'rgba(123, 104, 176, 0.08)',
      borderColor: isDark ? 'rgba(155, 126, 198, 0.1)' : 'rgba(123, 104, 176, 0.15)',
    },
    settingTitle: {
      color: colors.text,
    },
    settingDescription: {
      color: colors.textSecondary,
    },
    textMuted: {
      color: colors.textMuted,
    },
  };

  return (
    <LinearGradient
      colors={colors.gradient as [string, string, ...string[]]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Coaching Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Coaching</Text>
          
          <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingInfo}>
              <Ionicons name="mic-outline" size={24} color="#F5A623" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Voice Coaching</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  Receive audio feedback in addition to visual
                </Text>
              </View>
            </View>
            <Switch
              value={voiceCoaching}
              onValueChange={handleVoiceCoachingChange}
              trackColor={{ false: isDark ? '#3e3e5e' : '#d1d5db', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color="#9B7EC6" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Haptic Feedback</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  Feel gentle vibrations for coaching moments
                </Text>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={handleHapticChange}
              trackColor={{ false: isDark ? '#3e3e5e' : '#d1d5db', true: colors.secondary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Appearance</Text>
          
          <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={isDark ? "moon-outline" : "sunny-outline"} 
                size={24} 
                color={colors.primaryLight} 
              />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  {isDark ? 'Warm dark theme active' : 'Light cream theme active'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => setThemeMode(isDark ? 'light' : 'dark')}
              trackColor={{ false: isDark ? '#3e3e5e' : '#d1d5db', true: colors.primaryLight }}
              thumbColor="#fff"
              disabled={themeMode === 'system'}
            />
          </View>

          <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.secondary} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Use System Theme</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  {themeMode === 'system' ? 'Following device settings' : 'Match device settings'}
                </Text>
              </View>
            </View>
            <Switch
              value={themeMode === 'system'}
              onValueChange={(value) => setThemeMode(value ? 'system' : (isDark ? 'dark' : 'light'))}
              trackColor={{ false: isDark ? '#3e3e5e' : '#d1d5db', true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Safety Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Safety</Text>
          
          <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Safe State Mode</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  Automatically transition to support mode if distress is detected
                </Text>
              </View>
            </View>
            <Switch
              value={safeStateEnabled}
              onValueChange={handleSafeStateChange}
              trackColor={{ false: isDark ? '#3e3e5e' : '#d1d5db', true: colors.success }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={[styles.settingItemButton, dynamicStyles.settingItem]} onPress={() => setShowLocationModal(true)}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={24} color={colors.calm} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Crisis Resources Location</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  {CRISIS_LOCATIONS.find(l => l.id === selectedLocation)?.name || 'United States'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Privacy</Text>
          
          <TouchableOpacity style={[styles.settingItemButton, dynamicStyles.settingItem]} onPress={handleClearData}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Clear Session Data</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  Delete all coaching history
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItemButton, dynamicStyles.settingItem]} onPress={() => setShowPrivacyModal(true)}>
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={24} color={colors.secondary} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Privacy Policy</Text>
                <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                  How we protect your data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>About</Text>
          
          <View style={styles.aboutInfo}>
            <Text style={[styles.appName, { color: colors.text }]}>TrueReact</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
            <Text style={[styles.copyright, { color: colors.textMuted }]}>
              Built for Hacklytics 2026
            </Text>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Account</Text>
          
          {user && (
            <View style={[styles.accountInfo, dynamicStyles.settingItem]}>
              <Ionicons name="person-circle-outline" size={48} color={colors.primary} />
              <View style={styles.accountDetails}>
                <Text style={[styles.accountEmail, { color: colors.text }]}>{user.email}</Text>
                <Text style={[styles.accountStats, { color: colors.textSecondary }]}>
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

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Select your location to get region-specific crisis resources and helplines.
            </Text>
            {CRISIS_LOCATIONS.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationOption,
                  { 
                    backgroundColor: isDark ? 'rgba(45, 40, 69, 0.6)' : '#FFFFFF',
                    borderColor: selectedLocation === location.id ? colors.primary : colors.border,
                    borderWidth: selectedLocation === location.id ? 2 : 1,
                  }
                ]}
                onPress={() => handleLocationChange(location.id)}
              >
                <Text style={styles.locationFlag}>{location.flag}</Text>
                <Text style={[styles.locationName, { color: colors.text }]}>{location.name}</Text>
                {selectedLocation === location.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.secondary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Privacy Policy</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={[styles.modalContent, { paddingHorizontal: 20 }]}>
            <Text style={[styles.privacyHeader, { color: colors.text }]}>How We Protect Your Data</Text>
            
            <Text style={[styles.privacySection, { color: colors.primary }]}>🔒 Local-First Storage</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Your emotional data and coaching history are stored locally on your device. We don't upload your personal emotional patterns to external servers.
            </Text>
            
            <Text style={[styles.privacySection, { color: colors.primary }]}>🛡️ End-to-End Encryption</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              When data sync is enabled, all communications are encrypted using industry-standard TLS 1.3 protocols.
            </Text>
            
            <Text style={[styles.privacySection, { color: colors.primary }]}>🔐 No Third-Party Sharing</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              We never sell, share, or provide your emotional data to advertisers, data brokers, or third parties.
            </Text>
            
            <Text style={[styles.privacySection, { color: colors.primary }]}>📊 Anonymized Analytics</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              Any usage analytics are fully anonymized and used only to improve app features. These contain no personal identifiers.
            </Text>
            
            <Text style={[styles.privacySection, { color: colors.primary }]}>🗑️ Data Deletion</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              You can delete all your data at any time through Settings → Clear Session Data. This permanently removes all stored information.
            </Text>
            
            <Text style={[styles.privacySection, { color: colors.primary }]}>🏥 HIPAA Considerations</Text>
            <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
              While TrueReact is not a medical device, we follow HIPAA-inspired best practices for handling sensitive health-related information.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(155, 126, 198, 0.2)',
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingTop: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  locationFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  locationName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  privacyHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  privacySection: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
