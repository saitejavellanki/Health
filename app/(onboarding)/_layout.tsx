import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="allergies" />
    </Stack>
  );
}