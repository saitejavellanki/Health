import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;
  
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
    
    if (finalStatus !== 'granted') {
      // alert('Failed to get push token for push notification!');
      return;
    }
    
    // Get the Expo push token
    // For Expo SDK 48+, use the projectId
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    console.log('Push token:', token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Schedule a local notification (for testing)
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

// Set up notification listeners
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