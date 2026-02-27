/**
 * TrueReact - Safe State Screen
 * 
 * Support screen shown when distress markers are detected.
 * Provides crisis resources and supportive messaging.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type SafeStateScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SafeState'>;
  route: RouteProp<RootStackParamList, 'SafeState'>;
};

export default function SafeStateScreen({ navigation, route }: SafeStateScreenProps) {
  const resources = route.params?.resources || {
    resources: {
      suicide_prevention: '988 Suicide and Crisis Lifeline',
      crisis_text: 'Text HOME to 741741',
      emergency: '911',
    },
    message: "You're not alone. Help is available.",
  };

  const handleCallCrisisLine = () => {
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    Linking.openURL('sms:741741?body=HOME');
  };

  const handleCallEmergency = () => {
    Linking.openURL('tel:911');
  };

  const handleContinueCoaching = () => {
    navigation.replace('Session', {});
  };

  const handleEndSession = () => {
    navigation.navigate('Home');
  };

  return (
    <LinearGradient
      colors={['#1A1625', '#252136', '#2D2845']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Heart Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['rgba(78, 205, 196, 0.2)', 'rgba(78, 205, 196, 0.1)']}
            style={styles.iconGradient}
          >
            <Ionicons name="heart" size={48} color="#4ECDC4" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>I'm Here for You</Text>
        <Text style={styles.subtitle}>
          {resources.message}
        </Text>

        {/* Supportive Message */}
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            I noticed you might be going through a difficult moment. That's okay—what 
            matters is that you're here, and support is available whenever you need it.
          </Text>
        </View>

        {/* Crisis Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Immediate Support</Text>
          
          <TouchableOpacity 
            style={styles.resourceCard}
            onPress={handleCallCrisisLine}
            activeOpacity={0.8}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="call" size={24} color="#4ECDC4" />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>988 Suicide & Crisis Lifeline</Text>
              <Text style={styles.resourceDescription}>
                Free, 24/7 support for anyone in emotional distress
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b8b8b" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceCard}
            onPress={handleTextCrisisLine}
            activeOpacity={0.8}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#60a5fa" />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Crisis Text Line</Text>
              <Text style={styles.resourceDescription}>
                Text HOME to 741741 to reach a counselor
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b8b8b" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.resourceCard, styles.emergencyCard]}
            onPress={handleCallEmergency}
            activeOpacity={0.8}
          >
            <View style={[styles.resourceIcon, styles.emergencyIcon]}>
              <Ionicons name="warning" size={24} color="#FFB347" />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Emergency Services</Text>
              <Text style={styles.resourceDescription}>
                Call 911 if you're in immediate danger
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b8b8b" />
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>What Would You Like to Do?</Text>

          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="pause-circle-outline" size={24} color="#fff" />
            <Text style={styles.optionText}>Take a quiet break with me</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="leaf-outline" size={24} color="#fff" />
            <Text style={styles.optionText}>Try a breathing exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleContinueCoaching}
          >
            <Ionicons name="arrow-forward-circle-outline" size={24} color="#fff" />
            <Text style={styles.optionText}>Continue with gentle coaching</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionButton, styles.secondaryOption]}
            onPress={handleEndSession}
          >
            <Ionicons name="home-outline" size={24} color="#8b8b8b" />
            <Text style={[styles.optionText, styles.secondaryOptionText]}>
              End session and go home
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Message */}
        <Text style={styles.footerMessage}>
          Remember: Reaching out for help is a sign of strength, not weakness. 
          You matter, and your well-being matters. 💚
        </Text>
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
    paddingTop: 80,
    paddingBottom: 48,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b8b8b',
    textAlign: 'center',
    marginBottom: 24,
  },
  messageCard: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    marginBottom: 32,
  },
  messageText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
  },
  resourcesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emergencyCard: {
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emergencyIcon: {
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#8b8b8b',
  },
  optionsSection: {
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  secondaryOption: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 12,
  },
  secondaryOptionText: {
    color: '#8b8b8b',
  },
  footerMessage: {
    fontSize: 14,
    color: '#8b8b8b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
