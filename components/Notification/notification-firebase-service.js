import { Platform } from 'react-native';
// Import Firebase app first
import { app } from '../firebase/Firebase';
// Then import Firebase services
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/Firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';


/**
 * Save an Expo push notification token to Firebase Firestore
 * 
 * @param {string} token - The Expo push notification token
 * @param {string} userId - Optional user ID (if not provided, will use current authenticated user)
 * @returns {Promise<boolean>} - Success status of the operation
 */

const ensureFirebaseInitialized = () => {
    if (!app) {
      console.error('Firebase app not initialized');
      return false;
    }
    return true;
  };

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