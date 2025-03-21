import { getFirestore, doc, getDoc } from "firebase/firestore";
import Constants from 'expo-constants';

/**
 * Send a push notification to a specific device
 * 
 * @param {string} token - The Expo push token of the recipient
 * @param {object} notification - The notification content
 * @returns {Promise<boolean>} - Success status of the operation
 */
const sendPushNotification = async (token, notification) => {
  try {
    const message = {
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result.data && result.data.status === 'ok';
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

/**
 * Send order confirmation notification to a user
 * 
 * @param {string} userId - The user ID who placed the order
 * @param {object} orderDetails - Details about the order (order number, items, etc.)
 * @returns {Promise<boolean>} - Success status of the operation
 */
export const sendOrderConfirmationNotification = async (userId, orderDetails) => {
  const db = getFirestore();
  
  try {
    // Reference to the user document to get their push token
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn('User not found for notification:', userId);
      return false;
    }
    
    const userData = userSnap.data();
    const userToken = userData.expoPushToken;
    
    if (!userToken) {
      console.warn('No push token found for user:', userId);
      return false;
    }
    
    // Create the notification content
    const notification = {
      title: 'Order Confirmed! 🎉',
      body: `Your order #${orderDetails.orderNumber} will be packed and delivered in 20-30 minutes.`,
      data: {
        screen: 'OrderDetails',
        orderId: orderDetails.orderId,
        type: 'orderConfirmation'
      }
    };
    
    // Send the notification
    return await sendPushNotification(userToken, notification);
    
  } catch (error) {
    console.error('Error sending order confirmation notification:', error);
    return false;
  }
};
