import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';

export default function CalorieTrackerScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    const redirectToOnboarding = () => {
      try {
        // Primary approach using Expo Router
        router.replace('/Screens/CalorieTrackerScreen');
      } catch (error) {
        console.error('Router replace failed:', error);
        
        // Fallback using navigation API
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: '../Screens/CalorieTrackerScreen.tsx' }],
          });
        }, 100);
      }
    };

    // Small delay for component to mount properly
    const redirectTimer = setTimeout(redirectToOnboarding, 50);
    
    return () => clearTimeout(redirectTimer);
  }, [router, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}