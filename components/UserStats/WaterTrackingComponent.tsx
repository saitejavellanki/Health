import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../components/firebase/Firebase';

const WaterTrackingComponent = () => {
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8); // Default 8 glasses
  const [userId, setUserId] = useState(null);
  const [lastUpdatedDate, setLastUpdatedDate] = useState('');
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bubbleAnim1 = useRef(new Animated.Value(0)).current;
  const bubbleAnim2 = useRef(new Animated.Value(0)).current;

  // Local cache to reduce Firestore reads
  const waterDataRef = useRef({
    intake: 0,
    goal: 8,
    lastUpdated: '',
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
        if (
          userData.waterTracking &&
          userData.waterTracking.lastUpdated === today
        ) {
          // Use today's data
          waterDataRef.current = userData.waterTracking;
          setWaterIntake(userData.waterTracking.intake);
          setWaterGoal(userData.waterTracking.goal || 8);
        } else {
          // It's a new day, reset the water intake but keep the goal
          const newWaterData = {
            intake: 0,
            goal: userData.waterTracking?.goal || 8,
            lastUpdated: today,
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
          lastUpdated: today,
        };

        await setDoc(userDocRef, {
          waterTracking: newWaterData,
          createdAt: new Date(),
        });

        waterDataRef.current = newWaterData;
      }

      // Set up real-time listener for changes (only during active sessions)
      unsubscribeRef.current = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          // Only update state if data is different to avoid unnecessary renders
          if (
            userData.waterTracking &&
            (userData.waterTracking.intake !== waterDataRef.current.intake ||
              userData.waterTracking.goal !== waterDataRef.current.goal)
          ) {
            waterDataRef.current = userData.waterTracking;
            setWaterIntake(userData.waterTracking.intake);
            setWaterGoal(userData.waterTracking.goal || 8);
          }
        }
      });
    } catch (error) {
      console.error('Error fetching water data:', error);
    }

    // Start animations
    startWaveAnimation();
    startBubbleAnimations();
  };

  // Enhanced animation effects
  useEffect(() => {
    // Trigger wave and scale animation when water intake changes
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.elastic(1),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.bounce,
      }),
    ]).start();
  }, [waterIntake]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.sin,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.sin,
        }),
      ])
    ).start();
  };

  const startBubbleAnimations = () => {
    // Animate first bubble
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(bubbleAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate second bubble with delay
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bubbleAnim2, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(bubbleAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1500);
  };

  // Debounce timer to batch Firestore updates
  const updateTimerRef = useRef(null);

  const updateWaterIntake = (amount) => {
    if (!userId) return;

    // Trigger vibration when button is pressed
    Vibration.vibrate(20); // Short vibration for tactile feedback

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
        lastUpdated: today,
      };

      updateFirestore(newWaterData);
      return;
    }

    // Calculate new intake value with bounds
    const newIntake = Math.max(
      0,
      Math.min(waterGoal + 2, waterIntake + amount)
    );

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
        lastUpdated: today,
      };

      updateFirestore(waterData);
    }, 1000); // Reduced debounce to 1 second for better responsiveness
  };

  // Function to update Firestore with minimal writes
  const updateFirestore = async (waterData) => {
    try {
      // Only update if data has changed
      if (
        waterDataRef.current.intake !== waterData.intake ||
        waterDataRef.current.goal !== waterData.goal ||
        waterDataRef.current.lastUpdated !== waterData.lastUpdated
      ) {
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
  const waterPercentage = Math.min(
    Math.round((waterIntake / waterGoal) * 100),
    100
  );

  // Enhanced motivational messages based on percentage
  const getMessage = () => {
    if (waterPercentage < 25) return 'Stay hydrated!';
    if (waterPercentage < 50) return 'Keep it up!';
    if (waterPercentage < 75) return 'More than halfway!';
    if (waterPercentage < 100) return 'Almost there!';
    return 'Goal achieved! 💦';
  };

  // Enhanced color gradient based on percentage
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
    outputRange: [-30, 30], // Wider wave movement
  });

  // Bubble animations
  const bubble1TranslateY = bubbleAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const bubble2TranslateY = bubbleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });

  const bubble1Scale = bubbleAnim1.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.7, 1, 0.5],
  });

  const bubble2Scale = bubbleAnim2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.8, 0.3],
  });

  const bubble1Opacity = bubbleAnim1.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.7, 0.5, 0],
  });

  const bubble2Opacity = bubbleAnim2.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.5, 0.3, 0],
  });

  // Create icons with clean, professional look
  const renderIcon = (iconName, size, color) => {
    switch (iconName) {
      case 'droplet':
        return (
          <View style={[styles.iconDroplet, { borderColor: color }]}>
            <View
              style={[styles.iconDropletFill, { backgroundColor: color }]}
            />
          </View>
        );
      case 'minus':
        return <View style={[styles.iconBar, { backgroundColor: color }]} />;
      case 'plus':
        return (
          <View style={styles.iconPlusContainer}>
            <View style={[styles.iconBar, { backgroundColor: color }]} />
            <View
              style={[styles.iconBarVertical, { backgroundColor: color }]}
            />
          </View>
        );
      default:
        return <Text style={{ fontSize: size, color: color }}>•</Text>;
    }
  };

  // Calculate the water height percentage for the bottle
  const waveHeight = `${Math.max(5, waterPercentage)}%`;

  // Calculate progress percentage for display
  const progressText = `${Math.round((waterIntake / waterGoal) * 100)}%`;

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, { backgroundColor: '#f0f9ff' }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <View style={styles.iconWrapper}>
              {renderIcon('droplet', 20, primaryColor)}
            </View>
            <Text style={[styles.title, { color: primaryColor }]}>
              Hydration Tracker
            </Text>
          </View>
          <Text style={[styles.progressText, { color: primaryColor }]}>
            {progressText}
          </Text>
        </View>

        <View style={styles.waterTracker}>
          <Animated.View
            style={[
              styles.bottleContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.bottle}>
              <View
                style={[
                  styles.bottleInner,
                  { height: waveHeight, backgroundColor: primaryColor },
                ]}
              >
                <Animated.View
                  style={[
                    styles.waveContainer,
                    { transform: [{ translateX }] },
                  ]}
                >
                  <View
                    style={[styles.wave, { backgroundColor: primaryColor }]}
                  />
                </Animated.View>
              </View>

              {/* Enhanced animated bubbles */}
              {waterPercentage > 0 && (
                <Animated.View
                  style={[
                    styles.bubble,
                    {
                      left: '30%',
                      bottom: '20%',
                      transform: [
                        { translateY: bubble1TranslateY },
                        { scale: bubble1Scale },
                      ],
                      opacity: bubble1Opacity,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    },
                  ]}
                />
              )}

              {waterPercentage > 0 && (
                <Animated.View
                  style={[
                    styles.bubble,
                    {
                      left: '55%',
                      bottom: '35%',
                      width: 8,
                      height: 8,
                      transform: [
                        { translateY: bubble2TranslateY },
                        { scale: bubble2Scale },
                      ],
                      opacity: bubble2Opacity,
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.markings}>
              {[...Array(5).keys()].map((i) => (
                <View key={i} style={styles.marking}>
                  <Text
                    style={[
                      styles.markingText,
                      {
                        color:
                          waterIntake >= waterGoal - i * 2
                            ? primaryColor
                            : '#64748b',
                        fontWeight:
                          waterIntake >= waterGoal - i * 2 ? '700' : '500',
                      },
                    ]}
                  >
                    {waterGoal - i * 2}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View
                style={[styles.stat, { backgroundColor: `${primaryColor}20` }]}
              >
                <Text style={[styles.statValue, { color: primaryColor }]}>
                  {waterIntake}
                </Text>
                <Text style={styles.statLabel}>
                  {waterIntake === 1 ? 'Glass' : 'Glasses'}
                </Text>
              </View>
              <View
                style={[styles.stat, { backgroundColor: `${primaryColor}10` }]}
              >
                <Text style={[styles.statValue, { color: primaryColor }]}>
                  {waterGoal}
                </Text>
                <Text style={styles.statLabel}>Daily Goal</Text>
              </View>
            </View>

            <View style={styles.messageContainer}>
              <Text style={[styles.message, { color: primaryColor }]}>
                {getMessage()}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.minusButton,
                  {
                    borderColor: primaryColor,
                    backgroundColor: pressed
                      ? `${primaryColor}10`
                      : 'transparent',
                    opacity: waterIntake > 0 ? 1 : 0.5,
                  },
                ]}
                onPress={() => updateWaterIntake(-1)}
                disabled={waterIntake <= 0}
              >
                {renderIcon('minus', 20, primaryColor)}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.plusButton,
                  {
                    backgroundColor: pressed
                      ? `${primaryColor}80`
                      : primaryColor,
                    opacity: waterIntake < waterGoal + 2 ? 1 : 0.5,
                  },
                ]}
                onPress={() => updateWaterIntake(1)}
                disabled={waterIntake >= waterGoal + 2}
              >
                {renderIcon('plus', 20, '#ffffff')}
              </Pressable>
            </View>
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
    width: '95%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDroplet: {
    width: 14,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  iconDropletFill: {
    width: 8,
    height: 12,
    borderRadius: 6,
  },
  iconBar: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  iconBarVertical: {
    width: 2,
    height: 12,
    borderRadius: 1,
    position: 'absolute',
  },
  iconPlusContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
  },
  waterTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 220,
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
    borderRadius: 28,
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
    width: 140,
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
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    width: '56%',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    width: '48%',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  bubble: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default WaterTrackingComponent;
