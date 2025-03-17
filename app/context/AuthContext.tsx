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
  const [isNavigating, setIsNavigating] = useState(false);

  // Store user data in background without blocking UI
  const storeUserData = (firebaseUser) => {
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

  const getStoredUser = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        return JSON.parse(storedUserData);
      }
    } catch (error) {
      console.error('Error retrieving stored user:', error);
    }
    return null;
  };

  // Check if user needs onboarding and return result
  const checkUserOnboardingStatus = async (userId: string): Promise<boolean> => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      // If document doesn't exist, user needs onboarding
      if (!userDoc.exists()) {
        console.log("User document doesn't exist, needs onboarding");
        return true;
      }
      
      const userData = userDoc.data();
      // Be more explicit about checking onboarding status
      const onboardingCompleted = 
        userData.onboardingCompleted === true || userData.onboarded === true;
      
      console.log("Onboarding status check:", onboardingCompleted ? "completed" : "not completed");
      return !onboardingCompleted; // Return TRUE if needs onboarding (not completed)
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
    // In AuthContext.tsx, modify the onAuthStateChanged callback
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? `logged in as ${firebaseUser.email || firebaseUser.phoneNumber || firebaseUser.uid}` : "logged out");
      
      if (!isMounted) return;
      
      // Check if we're already navigating to prevent duplicate navigation
      if (isNavigating) {
        console.log("Navigation already in progress, skipping");
        return;
      }
      
      // First, immediately update user state
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Set navigating lock immediately
        setIsNavigating(true);
        
        // Use a separate async function since we can't make the callback async
        const handleUserNavigation = async () => {
          try {
            // Store user data in background - don't await this
            storeUserData(firebaseUser);
            
            // Try to get cached user data first for faster navigation
            const storedUser = await getStoredUser();
            
            // If we have stored user data with onboarding info, use it
            if (storedUser && storedUser.onboardingChecked) {
              console.log("Using cached onboarding status:", !storedUser.needsOnboarding);
              
              if (storedUser.needsOnboarding) {
                router.replace('/(onboarding)');
              } else {
                router.replace('/(tabs)');
              }
              
              // Update in background
              checkUserOnboardingStatus(firebaseUser.uid).then(needsOnboarding => {
                // Update cache for next time
                storeUserData({...firebaseUser, onboardingChecked: true, needsOnboarding});
              });
            } else {
              // No cache, check onboarding status
              const needsOnboarding = await checkUserOnboardingStatus(firebaseUser.uid);
              
              // Store for next time
              storeUserData({...firebaseUser, onboardingChecked: true, needsOnboarding});
              
              if (needsOnboarding) {
                router.replace('/(onboarding)');
              } else {
                router.replace('/(tabs)');
              }
            }
          } catch (error) {
            console.error("Navigation error:", error);
            // Default to tabs on error
            router.replace('/(tabs)');
          } finally {
            // Allow navigation again after a short delay
            setTimeout(() => {
              setIsNavigating(false);
              setIsLoading(false);
            }, 500);
          }
        };
        
        // Call the async function
        handleUserNavigation();
      } else {
        // Clear any stored user data - don't await this
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
        
        // Reset navigation lock
        setIsNavigating(false);
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