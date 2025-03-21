import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { registerMealTrackingTasks, checkMealsTrackedToday, checkAndSendMealNotifications, forceTestMealNotification } from './meal-tracking-notification-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MealNotificationManager = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [mealsTracked, setMealsTracked] = useState(0);
  const [lastMorningNotification, setLastMorningNotification] = useState(null);
  const [lastAfternoonNotification, setLastAfternoonNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize the notification manager on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Register background tasks
        const success = await registerMealTrackingTasks();
        setIsInitialized(success);
        
        // Check meals tracked today
        const mealsData = await checkMealsTrackedToday();
        setMealsTracked(mealsData.mealsTracked);
        
        // Get last notification timestamps
        const morningTimestamp = await AsyncStorage.getItem('lastMorningNotification');
        const afternoonTimestamp = await AsyncStorage.getItem('lastAfternoonNotification');
        
        if (morningTimestamp) {
          setLastMorningNotification(new Date(morningTimestamp));
        }
        
        if (afternoonTimestamp) {
          setLastAfternoonNotification(new Date(afternoonTimestamp));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing meal notification manager:', error);
        setLoading(false);
      }
    };
    
    initialize();
    
    // Set up an interval to refresh the meals tracked count
    const interval = setInterval(async () => {
      const mealsData = await checkMealsTrackedToday();
      setMealsTracked(mealsData.mealsTracked);
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  // Handler for manually checking notifications
  const handleCheckNotifications = async () => {
    try {
      setLoading(true);
      await checkAndSendMealNotifications();
      
      // Refresh data
      const mealsData = await checkMealsTrackedToday();
      setMealsTracked(mealsData.mealsTracked);
      
      const morningTimestamp = await AsyncStorage.getItem('lastMorningNotification');
      const afternoonTimestamp = await AsyncStorage.getItem('lastAfternoonNotification');
      
      if (morningTimestamp) {
        setLastMorningNotification(new Date(morningTimestamp));
      }
      
      if (afternoonTimestamp) {
        setLastAfternoonNotification(new Date(afternoonTimestamp));
      }
      
      setLoading(false);
      Alert.alert('Success', 'Notification check completed');
    } catch (error) {
      console.error('Error checking notifications:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to check notifications');
    }
  };

  // Handler for testing notifications
  const handleTestNotification = async (type) => {
    try {
      setLoading(true);
      await forceTestMealNotification(type);
      setLoading(false);
      Alert.alert('Success', `Test ${type} notification sent`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading notification manager...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Notification Manager</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.statusValue, { color: isInitialized ? '#4CAF50' : '#F44336' }]}>
          {isInitialized ? 'Initialized' : 'Not Initialized'}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Meals Tracked Today:</Text>
        <Text style={[
          styles.statusValue, 
          { color: mealsTracked >= 2 ? '#4CAF50' : mealsTracked >= 1 ? '#FFC107' : '#F44336' }
        ]}>
          {mealsTracked}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Last Morning Notification:</Text>
        <Text style={styles.statusValue}>
          {lastMorningNotification 
            ? lastMorningNotification.toLocaleString() 
            : 'None'}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Last Afternoon Notification:</Text>
        <Text style={styles.statusValue}>
          {lastAfternoonNotification 
            ? lastAfternoonNotification.toLocaleString() 
            : 'None'}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Check Notifications" 
          onPress={handleCheckNotifications} 
          disabled={loading}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test Morning Notification" 
          onPress={() => handleTestNotification('morning')} 
          disabled={loading}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test Afternoon Notification" 
          onPress={() => handleTestNotification('afternoon')} 
          disabled={loading}
        />
      </View>
      
      <Text style={styles.note}>
        Note: This component is for testing and debugging purposes. The actual notification service will run in the background even when the app is not open.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statusLabel: {
    fontWeight: 'bold',
    width: 180,
  },
  statusValue: {
    flex: 1,
  },
  buttonContainer: {
    marginVertical: 8,
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
  },
});

export default MealNotificationManager;