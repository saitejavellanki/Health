import { Platform } from 'react-native';
// Import Firebase app first
import { app } from '../firebase/Firebase';
// Then import Firebase services
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/Firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure how notifications behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ensureFirebaseInitialized = () => {
  if (!app) {
    console.error('Firebase app not initialized');
    return false;
  }
  return true;
};

/**
 * Save an Expo push notification token to Firebase Firestore
 * 
 * @param {string} token - The Expo push notification token
 * @param {string} userId - Optional user ID (if not provided, will use current authenticated user)
 * @returns {Promise<boolean>} - Success status of the operation
 */
export const saveTokenToFirebase = async (token, userId = null) => {
  try {
    // Get current user ID if none provided
    if (!ensureFirebaseInitialized()) return false;
    const currentUserId = userId || auth.currentUser?.uid;
    
    // If no user is authenticated and no userId provided, we can't save the token
    if (!currentUserId) {
      console.warn('Cannot save token: No user ID available');
      return false;
    }
    
    // Reference to the user document
    const userRef = doc(db, 'users', currentUserId);
    
    // Check if user document exists
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // User document exists, update it with the token
      await updateDoc(userRef, {
        expoPushToken: token,
        tokenUpdatedAt: new Date().toISOString(),
        notificationsEnabled: true,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        }
      });
    } else {
      // User document doesn't exist, create it
      await setDoc(userRef, {
        expoPushToken: token,
        tokenUpdatedAt: new Date().toISOString(),
        notificationsEnabled: true,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        createdAt: new Date().toISOString()
      });
    }
    
    console.log('Push token saved to Firebase for user:', currentUserId);
    return true;
  } catch (error) {
    console.error('Error saving push token to Firebase:', error);
    return false;
  }
};

/**
 * Save the user's notification preference to Firebase
 * 
 * @param {boolean} enabled - Whether notifications are enabled
 * @param {string} userId - Optional user ID (if not provided, will use current authenticated user)
 * @returns {Promise<boolean>} - Success status of the operation
 */
export const saveNotificationPreferenceToFirebase = async (enabled, userId = null) => {
  try {
    if (!ensureFirebaseInitialized()) return false;
    const currentUserId = userId || auth.currentUser?.uid;
    
    // If no user is authenticated and no userId provided, we can't save the preference
    if (!currentUserId) {
      console.warn('Cannot save notification preference: No user ID available');
      return false;
    }
    
    // Reference to the user document
    const userRef = doc(db, 'users', currentUserId);
    
    // Check if user document exists
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // User document exists, update it with the notification preference
      await updateDoc(userRef, {
        notificationsEnabled: enabled,
        notificationStatusUpdatedAt: new Date().toISOString()
      });
    } else {
      // User document doesn't exist, create it
      await setDoc(userRef, {
        notificationsEnabled: enabled,
        notificationStatusUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    }
    
    console.log('Notification preference saved to Firebase for user:', currentUserId);
    return true;
  } catch (error) {
    console.error('Error saving notification preference to Firebase:', error);
    return false;
  }
};

/**
 * Save a device-specific token to Firestore (useful for users with multiple devices)
 * 
 * @param {string} token - The Expo push notification token
 * @param {string} deviceId - Unique device identifier
 * @param {string} userId - Optional user ID (if not provided, will use current authenticated user)
 * @returns {Promise<boolean>} - Success status of the operation
 */
export const saveDeviceTokenToFirebase = async (token, deviceId, userId = null) => {
  try {
    // Get current user ID if none provided
    if (!ensureFirebaseInitialized()) return false;
    const currentUserId = userId || auth.currentUser?.uid;
    
    // If no user is authenticated and no userId provided, we can't save the token
    if (!currentUserId) {
      console.warn('Cannot save token: No user ID available');
      return false;
    }
    
    // Reference to the user's devices collection
    const deviceRef = doc(db, 'users', currentUserId, 'devices', deviceId);
    
    // Save the device token
    await setDoc(deviceRef, {
      expoPushToken: token,
      tokenUpdatedAt: new Date().toISOString(),
      notificationsEnabled: true,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      },
      lastActive: new Date().toISOString()
    }, { merge: true });
    
    console.log('Push token saved to Firebase for device:', deviceId);
    return true;
  } catch (error) {
    console.error('Error saving device push token to Firebase:', error);
    return false;
  }
};

/**
 * Get a unique device ID or generate one if it doesn't exist
 * 
 * @returns {Promise<string>} - The device ID
 */
export const getOrCreateDeviceId = async () => {
  try {
    // Try to get existing device ID from AsyncStorage
    const deviceId = await AsyncStorage.getItem('deviceId');
    
    if (deviceId) {
      return deviceId;
    }
    
    // Generate a new device ID if none exists
    const newDeviceId = 'device_' + Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem('deviceId', newDeviceId);
    
    return newDeviceId;
  } catch (error) {
    console.error('Error managing device ID:', error);
    // Fallback device ID in case of storage error
    return 'device_' + Math.random().toString(36).substring(2, 15);
  }
};

/**
 * Send a push notification to a specific device
 * 
 * @param {string} expoPushToken - The Expo push notification token
 * @param {object} notification - Notification details
 * @returns {Promise<boolean>} - Success status of the operation
 */
export async function sendPushNotification(expoPushToken, notification) {
  // Basic validation
  if (!expoPushToken) {
    console.error('No push token provided');
    return false;
  }
  
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: notification.title || 'New Notification',
    body: notification.body || 'You have a new notification',
    data: notification.data || {},
    priority: 'high',
  };
  
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const responseData = await response.json();
    
    if (responseData.data && responseData.data.status === 'ok') {
      console.log('Push notification sent successfully:', responseData);
      return true;
    } else {
      console.error('Push notification failed:', responseData);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Register for push notifications and handle permission status
 * 
 * @returns {Promise<object>} - Object containing status and token
 */
export async function registerForPushNotificationsAsync() {
  let token;
  let permissionStatus = 'denied'; // Default to denied

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Save the notification preference to Firebase regardless of permission status
    permissionStatus = finalStatus;
    await saveNotificationPreferenceToFirebase(finalStatus === 'granted');
    
    if (finalStatus !== 'granted') {
      console.log('Push notification permissions denied');
      return { status: 'denied', token: null };
    }
    
    // Get the Expo push token if permission granted
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return { status: 'error', token: null };
    }
  } else {
    console.log('Must use physical device for Push Notifications');
    return { status: 'device_not_supported', token: null };
  }

  return { status: permissionStatus, token };
}

/**
 * Schedule a local notification (for testing)
 * 
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
export async function schedulePushNotification(title = "Test Notification", body = "This is a test notification", data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: { seconds: 2 },
  });
}

/**
 * Set up notification listeners
 * 
 * @param {function} onNotificationReceived - Callback for received notifications
 * @param {function} onNotificationResponse - Callback for notification responses
 * @returns {function} - Function to remove listeners
 */
export function setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
  const notificationListener = Notifications.addNotificationReceivedListener(
    onNotificationReceived || (notification => console.log('Notification received:', notification))
  );
  
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    onNotificationResponse || (response => console.log('Notification response:', response))
  );
  
  // Return function to remove listeners
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Initialize notifications for the app
 * This handles the entire setup process
 */
export async function initializeNotifications() {
  try {
    // Register for push notifications
    const { status, token } = await registerForPushNotificationsAsync();
    
    if (status === 'granted' && token) {
      // User granted permission and we got a token
      const deviceId = await getOrCreateDeviceId();
      await saveDeviceTokenToFirebase(token, deviceId);
      
      // Set up notification listeners
      const removeListeners = setupNotificationListeners();
      
      return { 
        success: true, 
        status, 
        token,
        deviceId,
        cleanup: removeListeners
      };
    } else {
      // User denied permission or there was an issue
      console.log('Notification permission status:', status);
      // No alert is shown here
      return { 
        success: false, 
        status, 
        reason: status === 'denied' ? 'permission_denied' : 'token_not_available' 
      };
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return {
      success: false,
      status: 'error',
      error
    };
  }
}