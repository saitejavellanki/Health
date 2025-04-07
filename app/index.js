// app/index.js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../components/firebase/Firebase';

export default function Index() {
  const router = useRouter();
  const [isDelayComplete, setIsDelayComplete] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const loaderFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run the animation sequence with Apple-like timing and easing
    Animated.sequence([
      // Logo animation with subtle spring effect
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bezier(0.2, 0.65, 0.3, 0.99), // Apple-like cubic bezier
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8, // Higher friction for smoother landing
          tension: 40, // Lower tension for more natural feel
          useNativeDriver: true,
        }),
      ]),
      // Delayed loader fade-in
      Animated.timing(loaderFade, {
        toValue: 1,
        duration: 600,
        delay: 400,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }),
    ]).start();

    // Set a slightly longer delay for a more polished feel
    const delayTimer = setTimeout(() => {
      setIsDelayComplete(true);
    }, 3500); // 3.5 seconds for a more polished experience

    // Check authentication state
    const checkAuthAndNavigate = () => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        // Wait for both auth check and delay timer to complete
        if (!isDelayComplete) return;

        // Prepare exit animation
        const exitAnimation = Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
            useNativeDriver: true,
          }),
          Animated.timing(loaderFade, {
            toValue: 0,
            duration: 200,
            easing: Easing.bezier(0.42, 0, 0.58, 1),
            useNativeDriver: true,
          }),
        ]);

        // Run exit animation then navigate
        exitAnimation.start(() => {
          if (user) {
            // Use a separate async function to handle the Firebase operations
            const checkUserStatus = async () => {
              try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
    
                if (!userDoc.exists() || !userDoc.data().onboardingCompleted) {
                  // User needs to complete onboarding
                  console.log('hi');
                  // router.replace('/(onboarding)');
                } else {
                  // User is authenticated and has completed onboarding
                  router.replace('/(tabs)');
                }
              } catch (error) {
                console.error('Error checking user status:', error);
                console.log("onboard");
                // router.replace('/(onboarding)');
              }
            };
            
            // Call the async function
            checkUserStatus();
          } else {
            // User is not authenticated, go to login
            router.replace('/(auth)/login');
          }
        });
      });

      // Return the unsubscribe function
      return unsubscribe;
    };

    const unsubscribe = checkAuthAndNavigate();

    // Clean up the timer and auth subscription on unmount
    return () => {
      clearTimeout(delayTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [isDelayComplete, router, fadeAnim, scaleAnim]);

  // Show only the CrunchX text, removing tagline
  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.logoContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}>
        <Text style={styles.logoText}>
          <Text style={styles.crunchText}>Crunch</Text>
          <Text style={styles.xText}>X</Text>
        </Text>
      </Animated.View>
      
      <Animated.View style={[
        styles.loaderContainer,
        { opacity: loaderFade }
      ]}>
        <ActivityIndicator size="small" color="#22c55e" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 52,
    fontWeight: '600', // Slightly lighter for Apple-like feel
    letterSpacing: -0.5, // Tighter letter spacing like Apple's typography
  },
  crunchText: {
    color: '#000000',
  },
  xText: {
    color: '#FF0000',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 80,
  }
});