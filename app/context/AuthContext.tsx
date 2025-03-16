import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../components/firebase/Firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';

type AuthContextType = {
  user: any;
  isLoading: boolean;
  isNewUser: boolean;
  signOut: () => Promise<void>;
  checkUserOnboardingStatus: (userId: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isNewUser: false,
  signOut: async () => {},
  checkUserOnboardingStatus: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Store user data in background without blocking UI
  const storeUserData = async (firebaseUser) => {
    if (!firebaseUser) return;
    
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
      };
      
      // Don't await this - let it happen in the background
      AsyncStorage.setItem('userData', JSON.stringify(userData))
        .catch(err => console.error('Background AsyncStorage error:', err));
    } catch (error) {
      console.error('Error in storeUserData:', error);
    }
  };

  // Check if user needs onboarding and return result
  const checkUserOnboardingStatus = async (userId: string): Promise<boolean> => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      // Check if user document exists and has completed onboarding
      if (!userDoc.exists()) {
        return true; // New user needs onboarding
      }
      
      const userData = userDoc.data();
      // Check both possible field names for onboarding status
      const needsOnboarding = 
        (userData.onboardingCompleted === undefined && userData.onboarded === undefined) || 
        (userData.onboardingCompleted === false && userData.onboarded === false);
      
      return needsOnboarding;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return true; // Default to needing onboarding on error
    }
  };

  // Handle user sign out
  const signOut = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('userData');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Pre-check AsyncStorage for faster initial load
    const checkStoredUser = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData && isMounted) {
          // We have a stored user, but we'll still wait for Firebase to confirm
          // This just speeds up the initial state setup
          const userData = JSON.parse(storedUserData);
          console.log('Found stored user data for:', userData.email || userData.phoneNumber || userData.uid);
        }
      } catch (error) {
        console.error('Error checking stored auth state:', error);
      } finally {
        if (isMounted) {
          setInitialCheckDone(true);
        }
      }
    };
    
    checkStoredUser();

    // Set up Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? `logged in as ${firebaseUser.email || firebaseUser.phoneNumber || firebaseUser.uid}` : "logged out");
      
      if (!isMounted) return;
      
      // First, immediately update user state
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Store user data in background
        storeUserData(firebaseUser);
        
        // We don't automatically navigate here - the login page handles that
        setIsLoading(false);
      } else {
        // Clear any stored user data
        AsyncStorage.removeItem('userData').catch(err => 
          console.error('Error removing user data:', err)
        );
        
        setIsNewUser(false);
        setIsLoading(false);
        
        // Only navigate to login if we're not already on the auth stack
        const currentPath = router.getCurrentPath();
        if (!currentPath.includes('/(auth)')) {
          router.replace('/(auth)/login');
        }
      }
    });
    
    // Safety timeout - shorter now since we're handling UI faster
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log("Auth timeout reached, forcing load completion");
        setIsLoading(false);
      }
    }, 3000); // 3 second timeout

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isNewUser, 
      signOut,
      checkUserOnboardingStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);