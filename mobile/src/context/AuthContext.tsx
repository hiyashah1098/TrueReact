/**
 * TrueReact - Auth Context
 * 
 * Provides authentication state and methods across the app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  signInWithEmail,
  signUpWithEmail,
  signOut as firebaseSignOut,
  subscribeToAuthChanges,
  getUserProfile,
  createUserProfile,
  UserProfile,
} from '../services/firebase';

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
};

type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

const initialState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        // User is signed in
        try {
          let profile = await getUserProfile(user.uid);
          
          // Create profile if it doesn't exist
          if (!profile) {
            await createUserProfile(user);
            profile = await getUserProfile(user.uid);
          }
          
          setState({
            user,
            profile,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setState({
            user,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            error: 'Failed to load profile',
          });
        }
      } else {
        // User is signed out
        setState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await signInWithEmail(email, password);
      // Auth state listener will handle the rest
    } catch (error: any) {
      let errorMessage = 'Failed to sign in';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      }
      
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await signUpWithEmail(email, password);
      // Auth state listener will handle the rest
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await firebaseSignOut();
      // Auth state listener will handle the rest
    } catch (error) {
      console.error('Error signing out:', error);
      setState(prev => ({ ...prev, isLoading: false, error: 'Failed to sign out' }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    
    try {
      const profile = await getUserProfile(state.user.uid);
      setState(prev => ({ ...prev, profile }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [state.user]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
