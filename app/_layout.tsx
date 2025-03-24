import { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from './context/AuthContext';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../components/Notification/notification-service';
import { saveTokenToFirebase, getOrCreateDeviceId, saveDeviceTokenToFirebase } from '../components/Notification/notification-firebase-service';
import { registerMealTrackingTasks, resetNotificationFlagsIfNewDay } from '../components/Notification/meal-tracking-notification-service';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../components/firebase/Firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { app } from '../components/firebase/Firebase';

import * as Notifications from 'expo-notifications';
import { View, Text, StyleSheet } from 'react-native';

console.log("Firebase app initialized status:", !!app);
// Prevent auto-hiding the splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [tokenGenerationStatus, setTokenGenerationStatus] = useState('Initializing...');
  const [showTokenDebug, setShowTokenDebug] = useState(true); // Set to true to show debug overlay
  const [deviceId, setDeviceId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [mealNotificationsInitialized, setMealNotificationsInitialized] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Get or create device ID
  useEffect(() => {
    const getDeviceId = async () => {
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
    };
    
    getDeviceId();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // If we have a token and the user changes, update Firebase
      if (expoPushToken && user) {
        saveTokenToFirebase(expoPushToken, user.uid);
        if (deviceId) {
          saveDeviceTokenToFirebase(expoPushToken, deviceId, user.uid);
        }
        
        // Only initialize meal notifications once
        if (!mealNotificationsInitialized) {
          initializeMealNotifications();
        }
      }
    });
    
    return unsubscribe;
  }, [expoPushToken, deviceId, mealNotificationsInitialized]);

  // Initialize meal tracking notifications (only once)
  const initializeMealNotifications = async () => {
    try {
      // Check if notifications already initialized
      const initialized = await AsyncStorage.getItem('mealNotificationsInitialized');
      if (initialized === 'true') {
        console.log('Meal notifications were already initialized, skipping');
        setMealNotificationsInitialized(true);
        return;
      }
      
      // Register the meal tracking notification tasks
      const success = await registerMealTrackingTasks();
      setMealNotificationsInitialized(success);
      
      if (success) {
        // Mark as initialized to prevent duplicate initialization
        await AsyncStorage.setItem('mealNotificationsInitialized', 'true');
        console.log('Meal tracking notifications initialized successfully');
      } else {
        console.error('Failed to initialize meal tracking notifications');
      }
    } catch (error) {
      console.error('Error initializing meal tracking notifications:', error);
    }
  };

  // Set up notifications
  useEffect(() => {
    // Register for push notifications
    setTokenGenerationStatus('Requesting token...');
    
    registerForPushNotificationsAsync()
      .then(token => {
        console.log("PUSH TOKEN GENERATED:", token);
        setExpoPushToken(token);
        
        // Save token to AsyncStorage for background tasks to use
        if (token) {
          AsyncStorage.setItem('expoPushToken', token);
        }
        
        if (token) {
          setTokenGenerationStatus('Token generated successfully!');
          
          // Save token to Firebase if user is logged in
          if (currentUser) {
            saveTokenToFirebase(token)
              .then(success => {
                if (success) {
                  setTokenGenerationStatus('Token saved to Firebase!');
                  
                  // Only initialize meal notifications once
                  if (!mealNotificationsInitialized) {
                    initializeMealNotifications();
                  }
                }
              });
            
            // If we have a device ID, save the token associated with this device
            if (deviceId) {
              saveDeviceTokenToFirebase(token, deviceId);
            }
          } else {
            setTokenGenerationStatus('Token generated (waiting for login to save)');
          }
        } else {
          setTokenGenerationStatus('Failed to generate token.');
        }
        
        // Auto-hide debug overlay after 10 seconds
        setTimeout(() => {
          setShowTokenDebug(false);
        }, 10000);
      })
      .catch(error => {
        console.error("Error generating push token:", error);
        setTokenGenerationStatus(`Error: ${error.message}`);
      });

    // Set up notification listeners and get cleanup function
    const cleanupListeners = setupNotificationListeners(
      // Handler for received notifications (when app is in foreground)
      notification => {
        console.log("Received notification in foreground:", notification);
        // You can update app state or show an in-app alert here
      },
      // Handler for when user taps on a notification
      response => {
        console.log("User tapped notification:", response);
        // You can extract data from the notification and navigate
        // const screen = response.notification.request.content.data.screen;
        // router.push(screen);
      }
    );

    // Reset notification flags (important to prevent multiple notifications)
    const resetFlags = async () => {
      try {
        await AsyncStorage.removeItem('lastMorningNotification');
        await AsyncStorage.removeItem('lastAfternoonNotification');
      } catch (error) {
        console.error('Error resetting notification flags:', error);
      }
    };
    
    resetFlags();

    // Clean up listeners when component unmounts
    return () => {
      cleanupListeners();
    };
  }, [currentUser, deviceId]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors when hiding splash screen
      });
    }
  }, [fontsLoaded, fontError]);

  // If fonts aren't loaded yet, return null to keep splash screen
  if (!fontsLoaded) {
    return null; // This keeps the splash screen visible
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'flip' }} />
        <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
      
      {/* Debug overlay to show token status - will auto-hide after 10 seconds
      {showTokenDebug && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugTitle}>Push Notification Token Status:</Text>
          <Text style={styles.debugStatus}>{tokenGenerationStatus}</Text>
          {expoPushToken ? (
            <Text style={styles.debugToken}>{expoPushToken}</Text>
          ) : (
            <Text style={styles.debugNoToken}>No token yet</Text>
          )}
          {deviceId && (
            <Text style={styles.debugDeviceId}>Device ID: {deviceId}</Text>
          )}
          <Text style={styles.debugMealNotifications}>
            Meal Notifications: {mealNotificationsInitialized ? 'Initialized' : 'Not Initialized'}
          </Text>
        </View>
      )} */}
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  debugOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugStatus: {
    color: '#4CAF50',
    marginBottom: 2,
  },
  debugToken: {
    color: '#2196F3',
    fontSize: 10,
    marginVertical: 2,
  },
  debugNoToken: {
    color: '#FF9800',
    fontStyle: 'italic',
  },
  debugDeviceId: {
    color: '#E91E63',
    fontSize: 10,
    marginTop: 2,
  },
  debugMealNotifications: {
    color: '#00BCD4',
    marginTop: 2,
  }
});