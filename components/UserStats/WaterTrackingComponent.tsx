import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../components/firebase/Firebase';

// Simplified version with Firebase integration
const WaterTrackingComponent = () => {
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8); // Default 8 glasses
  const [userId, setUserId] = useState(null);
  const [lastUpdatedDate, setLastUpdatedDate] = useState('');
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Local cache to reduce Firestore reads
  const waterDataRef = useRef({
    intake: 0,
    goal: 8,
    lastUpdated: ''
  });
  
  // Unsubscribe reference for cleanup
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserId(currentUser.uid);
      
      // Get today's date in YYYY-MM-DD format for date comparison
      const today = new Date().toISOString().split('T')[0];
      setLastUpdatedDate(today);
      
      // Initial fetch of water data from Firestore
      fetchWaterData(currentUser.uid, today);
    }
    
    return () => {
      // Clean up listener when component unmounts
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Fetch water tracking data and set up listener for the current day only
  const fetchWaterData = async (uid, today) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if water tracking data exists and if it's from today
        if (userData.waterTracking && userData.waterTracking.lastUpdated === today) {
          // Use today's data
          waterDataRef.current = userData.waterTracking;
          setWaterIntake(userData.waterTracking.intake);
          setWaterGoal(userData.waterTracking.goal || 8);
        } else {
          // It's a new day, reset the water intake but keep the goal
          const newWaterData = {
            intake: 0,
            goal: userData.waterTracking?.goal || 8,
            lastUpdated: today
          };
          
          // Update Firestore with the reset data for new day
          await updateDoc(userDocRef, { waterTracking: newWaterData });
          waterDataRef.current = newWaterData;
          setWaterIntake(0);
          setWaterGoal(newWaterData.goal);
        }
      } else {
        // Create new user document with default water tracking data
        const newWaterData = {
          intake: 0,
          goal: 8,
          lastUpdated: today
        };
        
        await setDoc(userDocRef, { 
          waterTracking: newWaterData,
          createdAt: new Date()
        });
        
        waterDataRef.current = newWaterData;
      }
      
      // Set up real-time listener for changes (only during active sessions)
      // This is useful if the user has multiple devices
      unsubscribeRef.current = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          // Only update state if data is different to avoid unnecessary renders
          if (userData.waterTracking && 
              (userData.waterTracking.intake !== waterDataRef.current.intake ||
               userData.waterTracking.goal !== waterDataRef.current.goal)) {
            waterDataRef.current = userData.waterTracking;
            setWaterIntake(userData.waterTracking.intake);
            setWaterGoal(userData.waterTracking.goal || 8);
          }
        }
      });
      
    } catch (error) {
      console.error('Error fetching water data:', error);
    }
    
    // Start animation regardless of data fetch result
    startWaveAnimation();
  };

  useEffect(() => {
    // Trigger wave and scale animation when water intake changes
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
    ]).start();
  }, [waterIntake]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.sin,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.sin,
        }),
      ])
    ).start();
  };

  // Debounce timer to batch Firestore updates
  const updateTimerRef = useRef(null);
  
  const updateWaterIntake = (amount) => {
    if (!userId) return;
    
    // Get today's date to check if we need to reset
    const today = new Date().toISOString().split('T')[0];
    
    // Check if the date has changed since last update
    if (lastUpdatedDate !== today) {
      // It's a new day, reset the intake
      setWaterIntake(amount > 0 ? amount : 0);
      setLastUpdatedDate(today);
      
      // Update Firestore with reset data
      const newWaterData = {
        intake: amount > 0 ? amount : 0,
        goal: waterGoal,
        lastUpdated: today
      };
      
      updateFirestore(newWaterData);
      return;
    }
    
    // Calculate new intake value with bounds
    const newIntake = Math.max(0, Math.min(waterGoal + 2, waterIntake + amount));
    
    // Update local state immediately for UI responsiveness
    setWaterIntake(newIntake);
    
    // Batch Firestore updates using debounce pattern
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    updateTimerRef.current = setTimeout(() => {
      // Update Firestore after a delay to batch frequent updates
      const waterData = {
        intake: newIntake,
        goal: waterGoal,
        lastUpdated: today
      };
      
      updateFirestore(waterData);
    }, 1500); // Debounce for 1.5 seconds
  };
  
  // Function to update Firestore with minimal writes
  const updateFirestore = async (waterData) => {
    try {
      // Only update if data has changed
      if (waterDataRef.current.intake !== waterData.intake || 
          waterDataRef.current.goal !== waterData.goal ||
          waterDataRef.current.lastUpdated !== waterData.lastUpdated) {
        
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { waterTracking: waterData });
        
        // Update local cache
        waterDataRef.current = waterData;
        console.log('Water intake updated in Firestore:', waterData);
      }
    } catch (error) {
      console.error('Error updating water data:', error);
    }
  };

  // Calculate water percentage
  const waterPercentage = Math.min(Math.round((waterIntake / waterGoal) * 100), 100);
  
  // Determine message based on percentage
  const getMessage = () => {
    if (waterPercentage < 25) return "Stay hydrated!";
    if (waterPercentage < 50) return "Keep drinking!";
    if (waterPercentage < 75) return "Halfway there!";
    if (waterPercentage < 100) return "Almost there!";
    return "Goal reached!";
  };

  // Get color theme based on percentage
  const getColors = () => {
    if (waterPercentage < 25) return ['#93c5fd', '#3b82f6'];
    if (waterPercentage < 50) return ['#7dd3fc', '#0ea5e9'];
    if (waterPercentage < 75) return ['#67e8f9', '#06b6d4'];
    if (waterPercentage < 100) return ['#5eead4', '#14b8a6'];
    return ['#86efac', '#22c55e'];
  };

  const primaryColor = getColors()[1];
  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  // Create a function to render mock icons (without emojis)
  const renderIcon = (iconName, size, color) => {
    // Basic icon replacements using text
    const icons = {
      'droplet': '●', // Using a filled circle instead of 'O'
      'minus': '-',
      'plus': '+',
      'zap': 'Z',
    };
    
    return (
      <Text style={{fontSize: size, color: color}}>{icons[iconName] || '•'}</Text>
    );
  };

  // Calculate the water height percentage for the bottle
  const waveHeight = `${waterPercentage}%`;

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, {backgroundColor: '#f0f9ff'}]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Animated.View 
              style={{opacity: 1}}
            >
              {renderIcon('droplet', 20, primaryColor)}
            </Animated.View>
            <Text style={[styles.title, { color: primaryColor }]}>Water Tracker</Text>
          </View>
        </View>

        <View style={styles.waterTracker}>
          <Animated.View 
            style={[
              styles.bottleContainer,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <View style={styles.bottle}>
              <View style={[styles.bottleInner, { height: waveHeight, backgroundColor: primaryColor }]}>
                <Animated.View
                  style={[
                    styles.waveContainer,
                    { transform: [{ translateX }] }
                  ]}
                >
                  <View
                    style={[styles.wave, {backgroundColor: primaryColor}]}
                  />
                </Animated.View>
              </View>
              
              {/* Simple animated bubble replacement */}
              {waterPercentage > 20 && (
                <Animated.View 
                  style={[
                    styles.bubble, 
                    { left: '20%', bottom: '20%', opacity: 0.7 }
                  ]}
                />
              )}
              
              {waterPercentage > 40 && (
                <Animated.View 
                  style={[
                    styles.bubble, 
                    { left: '60%', bottom: '40%', width: 8, height: 8, opacity: 0.5 }
                  ]}
                />
              )}
            </View>
            <View style={styles.markings}>
              {[...Array(5).keys()].map((i) => (
                <View key={i} style={styles.marking}>
                  <Text style={styles.markingText}>{waterGoal - i * 2}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={styles.statsContainer}>
            <Animated.View
              style={[styles.statsRow, {opacity: 1}]}
            >
              <View style={[styles.stat, { backgroundColor: `${primaryColor}20` }]}>
                <Text style={[styles.statValue, { color: primaryColor }]}>{waterIntake}</Text>
                <Text style={[styles.statLabel, styles.fixedHeight]}>Glass</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: `${primaryColor}10` }]}>
                <Text style={[styles.statValue, { color: primaryColor }]}>{waterGoal}</Text>
                <Text style={[styles.statLabel, styles.fixedHeight]}>Goal</Text>
              </View>
            </Animated.View>
            
            <Animated.View style={{opacity: 1}}>
              <Text style={[styles.message, { color: primaryColor }]}>
                {getMessage()}
              </Text>
            </Animated.View>
            
            <Animated.View
              style={[styles.buttonContainer, {opacity: 1}]}
            >
              <Pressable
                style={[styles.button, styles.minusButton, { borderColor: primaryColor }]}
                onPress={() => updateWaterIntake(-1)}
              >
                {renderIcon('minus', 20, primaryColor)}
              </Pressable>
              
              <Pressable
                style={[styles.button, styles.plusButton, { backgroundColor: primaryColor }]}
                onPress={() => updateWaterIntake(1)}
              >
                {renderIcon('plus', 20, '#ffffff')}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 20,
    width: '98%', // Made wider
    alignSelf: 'center',
  },
  container: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  waterTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
  },
  bottleContainer: {
    width: '40%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottle: {
    width: '70%',
    height: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  bottleInner: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  waveContainer: {
    height: '100%',
    width: 140, // Make it wider than the container to allow for animation
  },
  wave: {
    height: '100%',
    width: '100%',
  },
  markings: {
    height: '100%',
    width: '30%',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  marking: {
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    alignItems: 'flex-start',
  },
  markingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    width: '56%',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    width: '45%',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  fixedHeight: {
    height: 20, // Fixed height to ensure alignment
    lineHeight: 20, // Makes the text vertically centered in the fixed height
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  plusButton: {
    // Shadow removed
  },
  bubble: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});

export default WaterTrackingComponent;