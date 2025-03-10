// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack, SplashScreen, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../components/firebase/Firebase'; // Adjust path as needed

// Keep the splash screen visible while we check authentication
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Always declare all hooks at the top level
  const [user, setUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  
  useFrameworkReady();
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if user has completed onboarding
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          // If user document doesn't exist or onboarding not completed, mark as new user
          if (!userDoc.exists() || !userDoc.data().onboardingCompleted) {
            setIsNewUser(true);
          } else {
            setIsNewUser(false);
          }
        } catch (error) {
          console.error("Error checking user onboarding status:", error);
          // Default to showing onboarding if we can't verify status
          setIsNewUser(true);
        }
      }
      
      setAuthInitialized(true);
    });
    
    return unsubscribe;
  }, []);

  // Handle initialization and navigation
  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (authInitialized) {
        SplashScreen.hideAsync();
        setIsReady(true);
        
        if (!user) {
          router.replace('/(auth)/login');
        }
        }
    }
  }, [fontsLoaded, fontError, authInitialized, user, isNewUser, router]);

  // Always return the same JSX structure
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'flip' }} />
        <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}