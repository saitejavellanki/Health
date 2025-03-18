import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../components/firebase/Firebase'; 
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';

type AuthContextType = {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Store user data in AsyncStorage for persistence
  const storeUserData = async (firebaseUser: User) => {
    if (!firebaseUser) return;
    
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
        // Add timestamp to track when this was stored
        storedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  };

  // Retrieve stored user data from AsyncStorage
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

  // Check if user needs onboarding
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
      // Check if onboarding is completed
      const onboardingCompleted = 
        userData.onboardingCompleted === true || 
        userData.onboarded === true;
      
      console.log("Onboarding status:", onboardingCompleted ? "completed" : "not completed");
      return !onboardingCompleted; // Return TRUE if needs onboarding
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return true; // Default to needing onboarding on error
    }
  };

  // Handle user sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('userData');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // First try to load user from AsyncStorage for faster initial render
    const initializeFromStorage = async () => {
      try {
        const storedUser = await getStoredUser();
        if (storedUser && isMounted) {
          // Set initial user state from storage
          // This will be overridden by the Firebase auth state
          setUser(storedUser as unknown as User);
          console.log('Initialized from stored user data:', storedUser.email || storedUser.uid);
        }
      } catch (error) {
        console.error('Error initializing from storage:', error);
      }
    };
    
    initializeFromStorage();

    // Set up Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? 
        `logged in as ${firebaseUser.email || firebaseUser.uid}` : 
        "logged out");
      
      if (!isMounted) return;
      
      // Update user state
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Prevent multiple navigations
        if (isNavigating) return;
        setIsNavigating(true);
        
        try {
          // Store user data for persistence
          await storeUserData(firebaseUser);
          
          // Check if user needs onboarding
          const needsOnboarding = await checkUserOnboardingStatus(firebaseUser.uid);
          
          // Navigate based on onboarding status
          if (needsOnboarding) {
            router.replace('/(onboarding)');
          } else {
            router.replace('/(tabs)');
          }
        } catch (error) {
          console.error("Error handling authenticated user:", error);
          // Default to tabs on error
          router.replace('/(tabs)');
        } finally {
          // Reset navigation lock and loading state
          setTimeout(() => {
            setIsNavigating(false);
            setIsLoading(false);
          }, 500);
        }
      } else {
        // User is signed out
        await AsyncStorage.removeItem('userData');
        setIsNewUser(false);
        setIsLoading(false);
        
        // Only navigate to login if not already on auth stack
        const currentPath = router.getCurrentPath();
        if (!currentPath.includes('/(auth)')) {
          router.replace('/(auth)/login');
        }
        
        setIsNavigating(false);
      }
    });
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log("Auth timeout reached, forcing load completion");
        setIsLoading(false);
      }
    }, 5000);
    
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
