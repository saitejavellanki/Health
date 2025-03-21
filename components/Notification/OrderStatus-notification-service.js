import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/Firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Status sequences and helper functions
const STATUS_SEQUENCE = ['pending', 'processing', 'shipped', 'out_for_delivery', 'completed'];

// Track last notified status to prevent duplicates
const lastNotifiedStatuses = new Map();

const getStatusText = (status) => {
  switch (status) {
    case 'pending': return 'Order Received';
    case 'processing': return 'Preparing';
    case 'shipped': return 'On The Way';
    case 'out_for_delivery': return 'Almost There';
    case 'completed': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return 'Unknown Status';
  }
};

const getDeliveryMessage = (status) => {
  switch (status) {
    case 'pending':
      return 'We\'ve received your order and are assigning a delivery agent.';
    case 'processing':
      return 'Your order is being processed and packed. Delivery in 15 minutes.';
    case 'shipped':
      return 'Great news! Your order has been picked up and is on its way.';
    case 'out_for_delivery':
      return 'Your order is out for delivery and should arrive within 10 minutes.';
    case 'completed':
      return 'Your order has been delivered. Thank you for shopping with us!';
    case 'cancelled':
      return 'This order has been cancelled.';
    default:
      return 'Status unknown';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending': return 'clock';
    case 'processing': return 'loader';
    case 'shipped': return 'package';
    case 'out_for_delivery': return 'truck';
    case 'completed': return 'check-circle';
    case 'cancelled': return 'x-circle';
    default: return 'help-circle';
  }
};

/**
 * Send a push notification
 * 
 * @param {string} token - Expo push token
 * @param {object} notification - Notification content
 * @returns {Promise<boolean>} - Success status
 */
const sendPushNotification = async (token, notification) => {
  if (!token) {
    console.error('No push token provided');
    return false;
  }

  const message = {
    to: token,
    sound: 'default',
    title: notification.title || 'New Notification',
    body: notification.body || 'You have a new notification',
    data: notification.data || {},
    priority: 'high',
    channelId: notification.channelId || 'default',
    // For Android progress indicators
    ...(notification.progress && Platform.OS === 'android' ? {
      android: {
        channelId: 'order_updates',
        ongoing: !notification.isCompleted,
        autoCancel: notification.isCompleted,
        progress: notification.isCompleted ? undefined : {
          max: 100,
          current: notification.progress
        }
      }
    } : {})
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
      console.log('Push notification sent successfully');
      return true;
    } else {
      console.error('Push notification failed:', responseData);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

/**
 * Create or update an order status notification
 * 
 * @param {string} userId - User ID
 * @param {object} orderDetails - Order details
 * @returns {Promise<boolean>} - Success status
 */
export const updateOrderStatusNotification = async (userId, orderDetails) => {
  try {
    // Get current status
    const currentStatus = orderDetails.deliveryStatus || orderDetails.status || 'pending';
    const orderId = orderDetails.id || orderDetails.orderId;
    
    // Check if we've already notified for this status
    const lastStatus = lastNotifiedStatuses.get(orderId);
    if (lastStatus === currentStatus) {
      console.log(`Already notified for order ${orderId} status: ${currentStatus}`);
      return false;
    }
    
    // Get user push token
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
    
    // Create Android notification channel if needed
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('order_updates', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
      });
    }
    
    // Calculate progress percentage (0-100)
    const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
    const isCompleted = currentStatus === 'completed';
    const isCancelled = currentStatus === 'cancelled';
    
    const max = STATUS_SEQUENCE.length - 1;
    const current = currentIndex >= 0 ? currentIndex : 0;
    const progressPercentage = Math.round((current / max) * 100);
    
    // Create notification content
    const notification = {
      title: `Order #${orderDetails.orderId?.slice(-6) || 'N/A'} - ${getStatusText(currentStatus)}`,
      body: getDeliveryMessage(currentStatus),
      channelId: 'order_updates',
      progress: progressPercentage,
      isCompleted: isCompleted || isCancelled,
      data: {
        screen: 'OrderDetails',
        orderId: orderDetails.orderId,
        type: 'orderStatus',
        status: currentStatus,
        icon: getStatusIcon(currentStatus)
      }
    };
    
    // Send the notification
    const result = await sendPushNotification(userToken, notification);
    
    // If notification was sent successfully, update the last notified status
    if (result) {
      lastNotifiedStatuses.set(orderId, currentStatus);
    }
    
    return result;
  } catch (error) {
    console.error('Error updating order status notification:', error);
    return false;
  }
};

/**
 * Set up a real-time listener for order status changes
 * 
 * @param {string} orderId - Order ID to track
 * @param {string} userId - User ID
 * @returns {function} - Unsubscribe function
 */
export const setupOrderStatusListener = (orderId, userId) => {
  if (!orderId || !userId) {
    console.warn('Cannot setup order status listener: Missing orderId or userId');
    return () => {};
  }
  
  // Reference to the order document
  const orderRef = doc(db, 'orders', orderId);
  
  // Set up real-time listener
  const unsubscribe = onSnapshot(orderRef, async (docSnapshot) => {
    if (docSnapshot.exists()) {
      const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Update the notification with new status
      await updateOrderStatusNotification(userId, orderData);
      
      // If order is completed or cancelled, we can stop listening
      if (orderData.deliveryStatus === 'completed' || orderData.deliveryStatus === 'cancelled') {
        unsubscribe();
      }
    }
  }, (error) => {
    console.error('Error listening to order updates:', error);
  });
  
  return unsubscribe;
};

/**
 * Set up listeners for all active orders
 * 
 * @param {Array} activeOrders - List of active orders
 * @returns {Array} - Array of unsubscribe functions
 */
export const setupActiveOrderNotifications = (activeOrders) => {
  const unsubscribers = [];
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.warn('No authenticated user found');
    return [];
  }
  
  // Set up listeners for each active order
  activeOrders.forEach(order => {
    if (order.id) {
      // Only set up the listener, don't send initial notification
      const unsubscribe = setupOrderStatusListener(order.id, currentUser.uid);
      unsubscribers.push(unsubscribe);
    }
  });
  
  return unsubscribers;
};

export default {
  updateOrderStatusNotification,
  setupOrderStatusListener,
  setupActiveOrderNotifications
};
