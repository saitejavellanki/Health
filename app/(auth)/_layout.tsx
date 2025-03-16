import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext'; // Adjust path as needed
import { View, ActivityIndicator } from 'react-native';

export default function AuthLayout() {
  const { isLoading, user } = useAuth();

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // The redirect logic is now handled in the AuthContext
  // This ensures we only show auth screens when appropriate
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}