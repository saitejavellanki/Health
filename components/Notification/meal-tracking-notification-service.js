import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/Firebase';
import { sendPushNotification } from './notification-service';
import { getOrCreateDeviceId, saveDeviceTokenToFirebase } from './notification-firebase-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Task names
const MORNING_REMINDER_TASK = 'MORNING_REMINDER_TASK';
const AFTERNOON_REMINDER_TASK = 'AFTERNOON_REMINDER_TASK';

// Define the morning and afternoon hours in 24-hour format
const MORNING_HOUR = 9; // 9 AM
const AFTERNOON_HOUR = 19; // 3 PM

/**
 * Register background tasks for meal tracking reminders
 */
export const registerMealTrackingTasks = async () => {
  try {
    // Register the morning reminder task
    await registerMorningReminderTask();
    
    // Register the afternoon reminder task
    await registerAfternoonReminderTask();
    
    console.log('Meal tracking notification tasks registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering meal tracking tasks:', error);
    return false;
  }
};

/**
 * Register the morning reminder task
 */
const registerMorningReminderTask = async () => {
  // Define the task
  TaskManager.defineTask(MORNING_REMINDER_TASK, async () => {
    try {
      const shouldSendNotification = await shouldSendMorningReminder();
      
      if (shouldSendNotification) {
        const token = await AsyncStorage.getItem('expoPushToken');
        if (!token) {
          console.log('No push token available for morning reminder');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }
        
        await sendPushNotification(token, {
          title: '🍽️ Time to track your meals!',
          body: 'Start your day right by tracking your meals to maintain your streak!',
          data: { screen: 'MealTracker' }
        });
        
        // Store the timestamp of when we sent this notification
        await AsyncStorage.setItem('lastMorningNotification', new Date().toISOString());
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('Error in morning reminder task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
  
  // Register the background fetch
  await BackgroundFetch.registerTaskAsync(MORNING_REMINDER_TASK, {
    minimumInterval: 60 * 60, // 1 hour in seconds
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

/**
 * Register the afternoon reminder task
 */
const registerAfternoonReminderTask = async () => {
  // Define the task
  TaskManager.defineTask(AFTERNOON_REMINDER_TASK, async () => {
    try {
      const mealTrackingData = await checkMealsTrackedToday();
      
      if (mealTrackingData.shouldSendNotification) {
        const token = await AsyncStorage.getItem('expoPushToken');
        if (!token) {
          console.log('No push token available for afternoon reminder');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }
        
        // Customize message based on the number of meals tracked
        let title, body;
        
        if (mealTrackingData.mealsTracked === 0) {
          title = '⚠️ No meals tracked today!';
          body = 'Track at least 2 meals today to maintain your streak!';
        } else if (mealTrackingData.mealsTracked === 1) {
          title = '🔔 Just one more meal to go!';
          body = 'You\'ve tracked 1 meal today. Track 1 more to maintain your streak!';
        } else {
          title = '👏 Great job tracking your meals!';
          body = `You've tracked ${mealTrackingData.mealsTracked} meals today.`;
        }
        
        await sendPushNotification(token, {
          title,
          body,
          data: { screen: 'MealTracker' }
        });
        
        // Store the timestamp of when we sent this notification
        await AsyncStorage.setItem('lastAfternoonNotification', new Date().toISOString());
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('Error in afternoon reminder task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
  
  // Register the background fetch
  await BackgroundFetch.registerTaskAsync(AFTERNOON_REMINDER_TASK, {
    minimumInterval: 60 * 60, // 1 hour in seconds
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

/**
 * Check if we should send a morning reminder notification
 */
const shouldSendMorningReminder = async () => {
  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  
  // Only send notifications in the morning hour
  if (currentHour !== MORNING_HOUR) {
    return false;
  }
  
  // Check if we've already sent a notification today
  const lastNotification = await AsyncStorage.getItem('lastMorningNotification');
  if (lastNotification) {
    const lastNotificationDate = new Date(lastNotification);
    if (
      lastNotificationDate.getDate() === now.getDate() &&
      lastNotificationDate.getMonth() === now.getMonth() &&
      lastNotificationDate.getFullYear() === now.getFullYear()
    ) {
      // Already sent a notification today
      return false;
    }
  }
  
  // Check if user is logged in
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }
  
  // Check if the user has any meals tracked today already
  const mealsData = await checkMealsTrackedToday();
  if (mealsData.mealsTracked > 0) {
    // User has already started tracking meals today
    return false;
  }
  
  return true;
};

/**
 * Check if we should send an afternoon reminder notification
 */
const shouldSendAfternoonReminder = async () => {
  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  
  // Only send notifications in the afternoon hour
  if (currentHour !== AFTERNOON_HOUR) {
    return false;
  }
  
  // Check if we've already sent a notification today
  const lastNotification = await AsyncStorage.getItem('lastAfternoonNotification');
  if (lastNotification) {
    const lastNotificationDate = new Date(lastNotification);
    if (
      lastNotificationDate.getDate() === now.getDate() &&
      lastNotificationDate.getMonth() === now.getMonth() &&
      lastNotificationDate.getFullYear() === now.getFullYear()
    ) {
      // Already sent a notification today
      return false;
    }
  }
  
  // Check if user is logged in
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }
  
  // Always return true for the afternoon check - we'll determine the exact message content 
  // based on the number of meals in the checkMealsTrackedToday function
  return true;
};

/**
 * Check how many meals the user has tracked today
 */
export const checkMealsTrackedToday = async () => {
  try {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { 
        mealsTracked: 0, 
        shouldSendNotification: false 
      };
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
    const mealsTracked = mealsSnapshot.size;
    
    // Determine if we should send a notification based on the afternoon time and meals tracked
    const now = new Date();
    const currentHour = now.getHours();
    const shouldSendNotification = currentHour === AFTERNOON_HOUR && mealsTracked < 2;
    
    return { 
      mealsTracked,
      shouldSendNotification
    };
  } catch (error) {
    console.error('Error checking meals tracked today:', error);
    return { 
      mealsTracked: 0,
      shouldSendNotification: false
    };
  }
};

/**
 * Manually check and send meal tracking notifications
 * This can be called from app startup for testing
 */
export const checkAndSendMealNotifications = async () => {
  try {
    // Check if we should send morning notification
    const shouldSendMorning = await shouldSendMorningReminder();
    if (shouldSendMorning) {
      const token = await AsyncStorage.getItem('expoPushToken');
      if (token) {
        await sendPushNotification(token, {
          title: '🍽️ Time to track your meals!',
          body: 'Start your day right by tracking your meals to maintain your streak!',
          data: { screen: 'MealTracker' }
        });
        
        await AsyncStorage.setItem('lastMorningNotification', new Date().toISOString());
        console.log('Morning meal notification sent');
      }
    }
    
    // Check if we should send afternoon notification
    const shouldSendAfternoon = await shouldSendAfternoonReminder();
    if (shouldSendAfternoon) {
      const mealTrackingData = await checkMealsTrackedToday();
      const token = await AsyncStorage.getItem('expoPushToken');
      
      if (token) {
        // Customize message based on the number of meals tracked
        let title, body;
        
        if (mealTrackingData.mealsTracked === 0) {
          title = '⚠️ No meals tracked today!';
          body = 'Track at least 2 meals today to maintain your streak!';
        } else if (mealTrackingData.mealsTracked === 1) {
          title = '🔔 Just one more meal to go!';
          body = 'You\'ve tracked 1 meal today. Track 1 more to maintain your streak!';
        } else {
          title = '👏 Great job tracking your meals!';
          body = `You've tracked ${mealTrackingData.mealsTracked} meals today.`;
        }
        
        await sendPushNotification(token, {
          title,
          body,
          data: { screen: 'MealTracker' }
        });
        
        await AsyncStorage.setItem('lastAfternoonNotification', new Date().toISOString());
        console.log('Afternoon meal notification sent');
      }
    }
    
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
    const token = await AsyncStorage.getItem('expoPushToken');
    if (!token) {
      console.error('No push token available for test notification');
      return false;
    }
    
    if (type === 'morning') {
      await sendPushNotification(token, {
        title: '[TEST] 🍽️ Time to track your meals!',
        body: 'Start your day right by tracking your meals to maintain your streak!',
        data: { screen: 'MealTracker' }
      });
    } else {
      const mealTrackingData = await checkMealsTrackedToday();
      let title, body;
      
      if (mealTrackingData.mealsTracked === 0) {
        title = '[TEST] ⚠️ No meals tracked today!';
        body = 'Track at least 2 meals today to maintain your streak!';
      } else if (mealTrackingData.mealsTracked === 1) {
        title = '[TEST] 🔔 Just one more meal to go!';
        body = 'You\'ve tracked 1 meal today. Track 1 more to maintain your streak!';
      } else {
        title = '[TEST] 👏 Great job tracking your meals!';
        body = `You've tracked ${mealTrackingData.mealsTracked} meals today.`;
      }
      
      await sendPushNotification(token, {
        title,
        body,
        data: { screen: 'MealTracker' }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending test meal notification:', error);
    return false;
  }
};