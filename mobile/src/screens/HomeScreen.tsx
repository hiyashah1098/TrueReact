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
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, TabParamList } from '../../App';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type HomeScreenProps = {
  navigation?: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation: propNavigation }: HomeScreenProps) {
  const navHook = useNavigation<HomeScreenNavigationProp>();
  const navigation = propNavigation || navHook;
  const { colors, isDark } = useTheme();
  
  return (
    <LinearGradient
      colors={colors.gradient as [string, string, ...string[]]}
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
              <MaterialCommunityIcons name="infinity" size={24} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>TrueReact</Text>
            </View>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.greeting, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your authentic self, expressed clearly</Text>
          </View>

          {/* Main CTA - Start Session */}
          <TouchableOpacity
            style={[styles.mainCTA, { shadowColor: colors.primary }]}
            onPress={() => navigation.navigate('Calibration')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.mainCTAGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.mainCTAContent}>
                <View style={styles.mainCTALeft}>
                  <MaterialCommunityIcons name="infinity" size={28} color="#fff" />
                </View>
                <View style={styles.mainCTAText}>
                  <Text style={styles.mainCTATitle}>Begin Coaching Session</Text>
                  <Text style={styles.mainCTASubtitle}>Real-time emotional guidance</Text>
                </View>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Actions Section */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Actions</Text>
          
          {/* Feature Cards */}
          <FeatureCard
            icon="time-outline"
            title="Session History"
            description="Review past sessions and track progress"
            color={colors.secondary}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('History')}
          />
          
          <FeatureCard
            icon="book-outline"
            title="Techniques Library"
            description="CBT/DBT exercises & grounding tools"
            color={colors.accent}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('Techniques')}
          />
          
          <FeatureCard
            icon="mic-outline"
            title="Voice Journal"
            description="Record and reflect on emotions"
            color={colors.success}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('VoiceJournal')}
          />
          
          <FeatureCard
            icon="leaf-outline"
            title="Meditation"
            description="Guided relaxation sessions"
            color={colors.accent}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('Meditation')}
          />
          
          <FeatureCard
            icon="albums-outline"
            title="Session Replay"
            description="Emotion timeline & insights"
            color={colors.calm}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('SessionReplay')}
          />
          
          <FeatureCard
            icon="people-outline"
            title="Community"
            description="Connect with others"
            color={colors.primaryLight}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('Community')}
          />

          {/* Bottom Padding */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type FeatureCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  colors: any;
  isDark: boolean;
  onPress: () => void;
};

function FeatureCard({ icon, title, description, color, colors, isDark, onPress }: FeatureCardProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.featureCard,
        {
          backgroundColor: isDark ? 'rgba(45, 40, 69, 0.6)' : 'rgba(123, 104, 176, 0.08)',
          borderColor: isDark ? 'rgba(155, 126, 198, 0.15)' : 'rgba(123, 104, 176, 0.15)',
        }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.featureCardIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureCardContent}>
        <Text style={[styles.featureCardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureCardDescription, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  mainCTA: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 24,
  },
  mainCTAGradient: {
    padding: 20,
  },
  mainCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainCTALeft: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  mainCTAText: {
    flex: 1,
  },
  mainCTATitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  mainCTASubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  featureCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureCardDescription: {
    fontSize: 13,
  },
});
