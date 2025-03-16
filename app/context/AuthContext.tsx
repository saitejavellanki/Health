import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';

type AuthContextType = {
  user: any;
  isLoading: boolean;
  isNewUser: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isNewUser: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Store more comprehensive user data
  const storeUserData = async (firebaseUser) => {
    if (!firebaseUser) return;
    
    try {
      // Store full user data (but be careful not to store sensitive info)
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        // Don't store tokens or sensitive authentication details
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      console.log('User data stored in AsyncStorage');
      
      // Ensure user document exists in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          createdAt: new Date(),
          onboardingCompleted: false,
        });
      }
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const checkAuthState = async () => {
      try {
        // First, check if we have stored user data
        const storedUserData = await AsyncStorage.getItem('userData');
        
        if (storedUserData && !user) {
          const userData = JSON.parse(storedUserData);
          console.log('Found stored user data for:', userData.email);
          
          // We'll still wait for Firebase's onAuthStateChanged to confirm
          // But this lets us know a user should be logged in
        }
      } catch (error) {
        console.error('Error checking stored auth state:', error);
      }
    };
    
    checkAuthState();

    // Set up Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? `logged in as ${firebaseUser.email}` : "logged out");
      
      if (!isMounted) return;
      
      if (firebaseUser) {
        setUser(firebaseUser);
        await storeUserData(firebaseUser);
        
        try {
          // Check onboarding status
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const needsOnboarding = !userDoc.exists() || !userDoc.data().onboardingCompleted;
          setIsNewUser(needsOnboarding);
          
          // Navigate accordingly
          if (needsOnboarding) {
            router.replace('/(onboarding)');
          } else {
            router.replace('/(tabs)');
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setIsNewUser(true);
          router.replace('/(onboarding)');
        }
      } else {
        // Try to restore from AsyncStorage before giving up
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            console.log('Found stored user data but Firebase reports logged out. User may need to re-authenticate.');
            
            // We could try to re-authenticate here in some cases
            // But for now, we'll just clear the stored data and redirect to login
            await AsyncStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('Error checking backup auth data:', error);
        }
        
        setUser(null);
        setIsNewUser(false);
        router.replace('/(auth)/login');
      }
      
      setIsLoading(false);
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
    <AuthContext.Provider value={{ user, isLoading, isNewUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);