/**
 * TrueReact - Settings Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [hapticEnabled, setHapticEnabled] = React.useState(true);
  const [voiceCoaching, setVoiceCoaching] = React.useState(true);
  const [safeStateEnabled, setSafeStateEnabled] = React.useState(true);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Coaching Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coaching</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mic-outline" size={24} color="#e94560" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Voice Coaching</Text>
                <Text style={styles.settingDescription}>
                  Receive audio feedback in addition to visual
                </Text>
              </View>
            </View>
            <Switch
              value={voiceCoaching}
              onValueChange={setVoiceCoaching}
              trackColor={{ false: '#3e3e5e', true: '#e94560' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color="#e94560" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>
                  Feel gentle vibrations for coaching moments
                </Text>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: '#3e3e5e', true: '#e94560' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Safety Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4ade80" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Safe State Mode</Text>
                <Text style={styles.settingDescription}>
                  Automatically transition to support mode if distress is detected
                </Text>
              </View>
            </View>
            <Switch
              value={safeStateEnabled}
              onValueChange={setSafeStateEnabled}
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
          
          <TouchableOpacity style={styles.settingItemButton}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={24} color="#e94560" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Clear Session Data</Text>
                <Text style={styles.settingDescription}>
                  Delete all coaching history
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b8b8b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItemButton}>
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={24} color="#8b8b8b" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>
                  How we protect your data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b8b8b" />
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
    color: '#8b8b8b',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8b8b8b',
  },
  aboutInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: '#8b8b8b',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    color: '#8b8b8b',
  },
});
