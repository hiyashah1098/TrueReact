/**
 * TrueReact - Main Application Entry Point
 * 
 * Real-time multimodal social-emotional coaching app.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SessionScreen from './src/screens/SessionScreen';
import CalibrationScreen from './src/screens/CalibrationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SafeStateScreen from './src/screens/SafeStateScreen';
import LoginScreen from './src/screens/LoginScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TechniquesScreen from './src/screens/TechniquesScreen';
import HelpScreen from './src/screens/HelpScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ChatScreen from './src/screens/ChatScreen';

// New Feature Screens
import VoiceJournalScreen from './src/screens/VoiceJournalScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import MeditationScreen from './src/screens/MeditationScreen';
import SessionReplayScreen from './src/screens/SessionReplayScreen';
import PersonalizedTechniquesScreen from './src/screens/PersonalizedTechniquesScreen';
import SafetyScreen from './src/screens/SafetyScreen';

// Context Providers
import { SessionProvider } from './src/context/SessionContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Types
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Calibration: undefined;
  Session: { sessionId?: string };
  SafeState: { resources?: any };
  History: undefined;
  Techniques: undefined;
  Help: undefined;
  Community: undefined;
  Chat: { conversationId: string; otherUserId: string; displayName: string };
  VoiceJournal: undefined;
  Meditation: { meditationId?: string } | undefined;
  SessionReplay: { sessionId?: string } | undefined;
  PersonalizedTechniques: { emotion?: string } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  Progress: undefined;
  Safety: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Import useTheme inside a separate component since MainTabs is inside providers
import { useTheme } from './src/context/ThemeContext';

// Tab Navigator with dynamic theming
function MainTabs() {
  const { colors, isDark } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: isDark ? 'rgba(155, 126, 198, 0.2)' : 'rgba(123, 104, 176, 0.15)',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 25,
          height: 85,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Safety') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Explore" 
        component={PersonalizedTechniquesScreen}
        options={{ tabBarLabel: 'For You' }}
      />
      <Tab.Screen name="Progress" component={AchievementsScreen} />
      <Tab.Screen name="Safety" component={SafetyScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Navigation component that uses auth state
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // App screens with tabs
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Calibration" 
              component={CalibrationScreen}
              options={{ title: 'Calibration' }}
            />
            <Stack.Screen 
              name="Session" 
              component={SessionScreen}
              options={{ 
                title: 'Coaching Session',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="SafeState" 
              component={SafeStateScreen}
              options={{ 
                title: 'Support',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="History" 
              component={HistoryScreen}
              options={{ 
                title: 'Session History',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="Techniques" 
              component={TechniquesScreen}
              options={{ 
                title: 'Techniques',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="Help" 
              component={HelpScreen}
              options={{ 
                title: 'Help & Resources',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="Community" 
              component={CommunityScreen}
              options={{ 
                title: 'Community',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ 
                title: 'Chat',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="VoiceJournal" 
              component={VoiceJournalScreen}
              options={{ 
                title: 'Voice Journal',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="Meditation" 
              component={MeditationScreen}
              options={{ 
                title: 'Meditation',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="SessionReplay" 
              component={SessionReplayScreen}
              options={{ 
                title: 'Session Replay',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="PersonalizedTechniques" 
              component={PersonalizedTechniquesScreen}
              options={{ 
                title: 'For You',
                headerShown: false 
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Load Ionicons font for web compatibility
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B7EC6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <SessionProvider>
              <AppNavigator />
            </SessionProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#9B7EC6',
    marginTop: 12,
    fontSize: 16,
  },
});
