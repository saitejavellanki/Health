import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/Firebase';
import { sendPushNotification } from './notification-service';
import { getOrCreateDeviceId, saveDeviceTokenToFirebase } from './notification-firebase-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Task names
const MORNING_REMINDER_TASK = 'MORNING_REMINDER_TASK';
const AFTERNOON_REMINDER_TASK = 'AFTERNOON_REMINDER_TASK';

// Define the morning and afternoon hours in 24-hour format
const MORNING_HOUR = 9; // 9 AM
const AFTERNOON_HOUR = 19; // 7 PM

// Keys for tracking notification status
const NOTIFICATION_DATE_KEY = 'lastNotificationDates';

/**
 * Check if notification permissions are granted
 */
const checkNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      return newStatus === 'granted';
    }
    return true;
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
};

/**
 * Get the current date string in YYYY-MM-DD format
 */
const getCurrentDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Get stored notification dates from AsyncStorage
 */
const getNotificationDates = async () => {
  try {
    const datesJson = await AsyncStorage.getItem(NOTIFICATION_DATE_KEY);
    return datesJson ? JSON.parse(datesJson) : {};
  } catch (error) {
    console.error('Error getting notification dates:', error);
    return {};
  }
};

/**
 * Check if we've already sent a notification today for the specified type
 * @param {string} type - 'morning' or 'afternoon'
 */
const hasAlreadySentNotificationToday = async (type) => {
  try {
    const dates = await getNotificationDates();
    const today = getCurrentDateString();
    return dates[type] === today;
  } catch (error) {
    console.error(`Error checking if ${type} notification was sent:`, error);
    return false; // Assume we haven't sent it if there's an error
  }
};

/**
 * Mark that we've sent a notification today for the specified type
 * @param {string} type - 'morning' or 'afternoon'
 */
const markNotificationSentToday = async (type) => {
  try {
    const dates = await getNotificationDates();
    const today = getCurrentDateString();
    dates[type] = today;
    await AsyncStorage.setItem(NOTIFICATION_DATE_KEY, JSON.stringify(dates));
    console.log(`Marked ${type} notification as sent for ${today}`);
  } catch (error) {
    console.error(`Error marking ${type} notification as sent:`, error);
  }
};

/**
 * Check how many meals the user has tracked today
 */
export const checkMealsTrackedToday = async () => {
  try {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { mealsTracked: 0 };
    }
    
    // Get today's start and end timestamps
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startTimestamp = Timestamp.fromDate(today);
    const endTimestamp = Timestamp.fromDate(tomorrow);
    
    // Query meals collection for the current user and today's date
    const mealsRef = collection(db, 'users', currentUser.uid, 'meals');
    const todayMealsQuery = query(
      mealsRef,
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<', endTimestamp)
    );
    
    const mealsSnapshot = await getDocs(todayMealsQuery);
    return { mealsTracked: mealsSnapshot.size };
  } catch (error) {
    console.error('Error checking meals tracked today:', error);
    return { mealsTracked: 0 };
  }
};

/**
 * Check if current hour is exactly at the target hour
 * @param {number} targetHour - The ideal hour to send notification
 */
const isAtNotificationHour = (targetHour) => {
  const now = new Date();
  const currentHour = now.getHours();
  // Only allow notification to trigger at the exact hour, not in a window
  return currentHour === targetHour;
};

/**
 * Create notification content based on type and meal data
 */
const createNotificationContent = async (type, mealsTracked = null) => {
  if (type === 'morning') {
    return {
      title: '🍽️ Time to track your meals!',
      body: 'Start your day right by tracking your meals to maintain your streak!',
      data: { screen: 'MealTracker' }
    };
  } else {
    // For afternoon notifications
    if (mealsTracked === null) {
      const { mealsTracked: meals } = await checkMealsTrackedToday();
      mealsTracked = meals;
    }
    
    if (mealsTracked === 0) {
      return {
        title: '⚠️ No meals tracked today!',
        body: 'Track at least 2 meals today to maintain your streak!',
        data: { screen: 'MealTracker' }
      };
    } else if (mealsTracked === 1) {
      return {
        title: '🔔 Just one more meal to go!',
        body: 'You\'ve tracked 1 meal today. Track 1 more to maintain your streak!',
        data: { screen: 'MealTracker' }
      };
    } else {
      return {
        title: '👏 Great job tracking your meals!',
        body: `You've tracked ${mealsTracked} meals today.`,
        data: { screen: 'MealTracker' }
      };
    }
  }
};

/**
 * Send a notification if all conditions are met
 * @param {string} type - 'morning' or 'afternoon'
 */
const sendNotificationIfNeeded = async (type) => {
  try {
    console.log(`${type} notification check executed at:`, new Date().toLocaleTimeString());
    
    // First check if we already sent this notification today
    const alreadySent = await hasAlreadySentNotificationToday(type);
    if (alreadySent) {
      console.log(`${type} notification already sent today, skipping.`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Check other conditions
    const hasPermission = await checkNotificationPermissions();
    const token = await AsyncStorage.getItem('expoPushToken');
    const currentUser = auth.currentUser;
    
    if (!hasPermission || !token || !currentUser) {
      console.log(`Skipping ${type} notification:`, 
        !hasPermission ? 'No permission' : 
        !token ? 'No token' : 
        'No user');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Check if it's the right time for notification
    const targetHour = type === 'morning' ? MORNING_HOUR : AFTERNOON_HOUR;
    if (!isAtNotificationHour(targetHour)) {
      console.log(`Current time not at ${type} notification hour (${targetHour}:00)`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // For afternoon notifications, check if we should send based on meals tracked
    if (type === 'afternoon') {
      const { mealsTracked } = await checkMealsTrackedToday();
      if (mealsTracked >= 2) {
        // Still mark as sent so we don't check again today
        await markNotificationSentToday(type);
        console.log('User already tracked enough meals today, marking as sent but not sending notification');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }
    
    // For morning notifications, check if user already tracked meals
    if (type === 'morning') {
      const { mealsTracked } = await checkMealsTrackedToday();
      if (mealsTracked > 0) {
        // Still mark as sent so we don't check again today
        await markNotificationSentToday(type);
        console.log('User already started tracking meals today, marking as sent but not sending notification');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }
    
    // All conditions met, send notification
    const { mealsTracked } = await checkMealsTrackedToday();
    const notificationContent = await createNotificationContent(type, mealsTracked);
    
    await sendPushNotification(token, notificationContent);
    await markNotificationSentToday(type);
    
    console.log(`${type} notification sent successfully`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error(`Error in ${type} notification process:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
};

/**
 * Register background tasks for meal tracking reminders
 */
export const registerMealTrackingTasks = async () => {
  try {
    // Check for notification permissions first
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
      return false;
    }
    
    // Define the morning reminder task
    TaskManager.defineTask(MORNING_REMINDER_TASK, async () => {
      return await sendNotificationIfNeeded('morning');
    });
    
    // Define the afternoon reminder task
    TaskManager.defineTask(AFTERNOON_REMINDER_TASK, async () => {
      return await sendNotificationIfNeeded('afternoon');
    });
    
    // Unregister existing tasks if any
    await BackgroundFetch.unregisterTaskAsync(MORNING_REMINDER_TASK).catch(() => {});
    await BackgroundFetch.unregisterTaskAsync(AFTERNOON_REMINDER_TASK).catch(() => {});
    
    // Register the tasks
    await BackgroundFetch.registerTaskAsync(MORNING_REMINDER_TASK, {
      minimumInterval: 60 * 60, // Check once per hour (in seconds)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    await BackgroundFetch.registerTaskAsync(AFTERNOON_REMINDER_TASK, {
      minimumInterval: 60 * 60, // Check once per hour (in seconds)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    // Reset notification flags on a new day
    await resetNotificationFlagsIfNewDay();
    
    console.log('Meal tracking notification tasks registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering meal tracking tasks:', error);
    return false;
  }
};

/**
 * Reset notification flags if it's a new day
 */
const resetNotificationFlagsIfNewDay = async () => {
  try {
    const dates = await getNotificationDates();
    const today = getCurrentDateString();
    let changed = false;
    
    // If date is different than today, clear the flags
    if (dates.morning && dates.morning !== today) {
      delete dates.morning;
      changed = true;
    }
    
    if (dates.afternoon && dates.afternoon !== today) {
      delete dates.afternoon;
      changed = true;
    }
    
    if (changed) {
      await AsyncStorage.setItem(NOTIFICATION_DATE_KEY, JSON.stringify(dates));
      console.log('Reset notification flags for new day');
    }
  } catch (error) {
    console.error('Error resetting notification flags:', error);
  }
};

/**
 * Manually check and send meal tracking notifications
 * This can be called from app startup for testing
 */
export const checkAndSendMealNotifications = async () => {
  try {
    // Reset notification flags first
    await resetNotificationFlagsIfNewDay();
    
    // Check permissions and token
    const hasPermission = await checkNotificationPermissions();
    const token = await AsyncStorage.getItem('expoPushToken');
    
    if (!hasPermission || !token) {
      console.log('Missing permission or token for notifications');
      return false;
    }
    
    // First check if morning notification should be sent
    await sendNotificationIfNeeded('morning');
    
    // Then check if afternoon notification should be sent
    await sendNotificationIfNeeded('afternoon');
    
    return true;
  } catch (error) {
    console.error('Error checking and sending meal notifications:', error);
    return false;
  }
};

/**
 * For testing purposes - force a notification no matter what time it is
 */
export const forceTestMealNotification = async (type = 'morning') => {
  try {
    // Check permissions first
    const hasPermission = await checkNotificationPermissions();
    const token = await AsyncStorage.getItem('expoPushToken');
    
    if (!hasPermission || !token) {
      console.log('Missing permission or token for test notification');
      return false;
    }
    
    console.log(`Sending forced ${type} test notification`);
    
    // Get current meal data if needed
    const { mealsTracked } = await checkMealsTrackedToday();
    
    // Prepare notification content
    let content = await createNotificationContent(type, mealsTracked);
    
    // Add [TEST] to title
    content.title = `[TEST] ${content.title}`;
    
    // Send notification
    await sendPushNotification(token, content);
    console.log(`Test ${type} notification sent`);
    
    return true;
  } catch (error) {
    console.error('Error sending test meal notification:', error);
    return false;
  }
};

/**
 * This function should be called when the app starts
 */
export const initializeNotifications = async () => {
  try {
    // Reset notification flags if it's a new day
    await resetNotificationFlagsIfNewDay();
    
    // Check permissions
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      console.log('Could not get notification permissions');
      return false;
    }
    
    // Ensure device token is registered
    const deviceId = await getOrCreateDeviceId();
    if (!deviceId) {
      console.log('Could not get or create device ID');
      return false;
    }
    
    // Get current user and save token if available
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await AsyncStorage.getItem('expoPushToken');
      if (token) {
        await saveDeviceTokenToFirebase(token);
      }
    }
    
    // Register background tasks
    await registerMealTrackingTasks();
    
    console.log('Notification system initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};

/**
 * Register tasks early
 */
export const registerTasksEarly = () => {
  if (!TaskManager.isTaskDefined(MORNING_REMINDER_TASK)) {
    TaskManager.defineTask(MORNING_REMINDER_TASK, async () => {
      console.log('Early morning task definition executed');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    });
  }
  
  if (!TaskManager.isTaskDefined(AFTERNOON_REMINDER_TASK)) {
    TaskManager.defineTask(AFTERNOON_REMINDER_TASK, async () => {
      console.log('Early afternoon task definition executed');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    });
  }
};