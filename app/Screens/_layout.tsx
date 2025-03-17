import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalorieTrackerScreen" />
      <Stack.Screen name="payments"/>
      <Stack.Screen name="MemoryGalleryScreen"/>
      
      
    </Stack>
  );
}