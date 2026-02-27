/**
 * TrueReact - Home Screen
 * 
 * Main entry point with neurodivergent-friendly design.
 * Features gold (autism acceptance) and violet (neurodiversity) colors.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

// Neurodivergent-friendly colors
const COLORS = {
  background: '#1A1625',
  surface: '#252136',
  surfaceElevated: '#2D2845',
  gold: '#F5A623',
  goldLight: '#FFD166',
  violet: '#9B7EC6',
  violetLight: '#C4B0E0',
  teal: '#4ECDC4',
  text: '#F5F0E8',
  textSecondary: '#B8B0C8',
  textMuted: '#7A7290',
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface, COLORS.surfaceElevated]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Infinity Symbol - Neurodiversity */}
              <MaterialCommunityIcons name="infinity" size={24} color={COLORS.gold} />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Logo/Title with Infinity */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="infinity" size={52} color={COLORS.gold} />
              </View>
              <Text style={styles.title}>TrueReact</Text>
              <Text style={styles.subtitle}>
                Your authentic self, expressed clearly
              </Text>
              <View style={styles.tagline}>
                <View style={styles.tagDot} />
                <Text style={styles.tagText}>Neurodivergent-friendly coaching</Text>
              </View>
            </View>

            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <LinearGradient
                colors={['rgba(245, 166, 35, 0.15)', 'rgba(155, 126, 198, 0.1)']}
                style={styles.welcomeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.welcomeTitle}>Social-Emotional Coaching</Text>
                <Text style={styles.welcomeText}>
                  Align your internal intent with your external expression using 
                  real-time, evidence-based feedback.
                </Text>
              </LinearGradient>
            </View>

            {/* Features */}
            <View style={styles.features}>
              <FeatureItem
                icon="eye-outline"
                title="Visual Calibration"
                description="Gentle monitoring of expressions"
                color={COLORS.gold}
              />
              <FeatureItem
                icon="mic-outline"
                title="Vocal Awareness"
                description="Pace, tone & affect guidance"
                color={COLORS.violet}
              />
              <FeatureItem
                icon="hand-left-outline"
                title="Barge-in Support"
                description="Interrupt anytime to ask"
                color={COLORS.teal}
              />
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('Calibration')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.gold, '#D4920D']}
                style={styles.startButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="infinity" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.startButtonText}>Begin Session</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <QuickAction
                icon="time-outline"
                label="History"
                color={COLORS.violet}
                onPress={() => navigation.navigate('History')}
              />
              <QuickAction
                icon="book-outline"
                label="Techniques"
                color={COLORS.teal}
                onPress={() => navigation.navigate('Techniques')}
              />
              <QuickAction
                icon="people-outline"
                label="Community"
                color={COLORS.goldLight}
                onPress={() => navigation.navigate('Community')}
              />
              <QuickAction
                icon="heart-outline"
                label="Calm Space"
                color={COLORS.violetLight}
                onPress={() => navigation.navigate('Help')}
              />
            </View>

            {/* Safety Note */}
            <View style={styles.safetyNote}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.teal} />
              <Text style={styles.safetyText}>
                Safe-state mode activates automatically if needed
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type FeatureItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
};

function FeatureItem({ icon, title, description, color }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
};

function QuickAction({ icon, label, color, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: 'rgba(155, 126, 198, 0.1)',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  tagline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 126, 198, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.violet,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.violetLight,
    fontWeight: '500',
  },
  welcomeCard: {
    marginTop: 28,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.2)',
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gold,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  features: {
    marginTop: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(45, 40, 69, 0.6)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 198, 0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  startButton: {
    marginTop: 28,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingHorizontal: 4,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    borderRadius: 10,
  },
  safetyText: {
    fontSize: 12,
    color: COLORS.teal,
    marginLeft: 8,
  },
});
