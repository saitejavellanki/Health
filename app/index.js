// app/index.js
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../components/firebase/Firebase';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || !userDoc.data().onboardingCompleted) {
              // User needs to complete onboarding
              console.log('hi');
            } else {
              // User is authenticated and has completed onboarding
              router.replace('/(tabs)');
            }
          } catch (error) {
            console.error('Error checking user status:', error);
            // Default to onboarding on error
            console.log("onboard");
          }
        } else {
          // User is not authenticated, go to login
          router.replace('/(auth)/login');
        }
      });

      // Clean up subscription
      return () => unsubscribe();
    };

    checkAuthAndNavigate();
  }, []);

  // Show loading indicator while checking auth state
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#22c55e" />
    </View>
  );
}
