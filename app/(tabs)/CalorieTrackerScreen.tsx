import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

export default function CalorieTrackerScreen() {
  // Use useEffect to automatically redirect when this screen is accessed
  useEffect(() => {
    // Redirect to the onboarding flow
    router.replace('/(onboarding)/CalorieTrackerScreen');
  }, []);
  
  // Return an empty view while redirecting
  return <View />;
}