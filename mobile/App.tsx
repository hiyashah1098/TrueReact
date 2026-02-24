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
import { StyleSheet } from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SessionScreen from './src/screens/SessionScreen';
import CalibrationScreen from './src/screens/CalibrationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SafeStateScreen from './src/screens/SafeStateScreen';

// Context Providers
import { SessionProvider } from './src/context/SessionContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Types
export type RootStackParamList = {
  Home: undefined;
  Calibration: undefined;
  Session: { sessionId?: string };
  Settings: undefined;
  SafeState: { resources?: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <NavigationContainer>
              <StatusBar style="light" />
              <Stack.Navigator
                initialRouteName="Home"
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
              </Stack.Navigator>
            </NavigationContainer>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
