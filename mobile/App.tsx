/**
 * TrueReact - Main Application Entry Point
 * 
 * Real-time multimodal social-emotional coaching app.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, ActivityIndicator, View } from 'react-native';

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

// Context Providers
import { SessionProvider } from './src/context/SessionContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Calibration: undefined;
  Session: { sessionId?: string };
  Settings: undefined;
  SafeState: { resources?: any };
  History: undefined;
  Techniques: undefined;
  Help: undefined;
  Community: undefined;
  Chat: { conversationId: string; otherUserId: string; displayName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation component that uses auth state
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#1a1a2e',
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
          // App screens
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'TrueReact' }}
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
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
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
});
