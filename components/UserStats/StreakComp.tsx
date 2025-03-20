import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../components/firebase/Firebase'; // Adjust the import path as needed

const StreakComp = () => {
  // State to store the streak value
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dailyMealsTracked, setDailyMealsTracked] = useState(0);
  const [calorieGoalMet, setCalorieGoalMet] = useState(false);

  // Animation values
  const flameSize = useRef(new Animated.Value(1.5)).current;
  const flamePosition = useRef(new Animated.Value(0)).current;
  const flameOpacity = useRef(new Animated.Value(0.85)).current;

  // Fetch streak data from Firebase on component mount
  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.log('No user is signed in');
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStreak(userData.streak || 0);
          setLastUpdated(userData.lastStreakUpdate?.toDate() || null);
          
          // Check if we need to validate yesterday's streak
          await validatePreviousDay(currentUser.uid, userData);
        } else {
          console.log('No user document found');
        }
      } catch (error) {
        console.error('Error fetching streak data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();

    // Set up a daily streak check
    const interval = setInterval(() => {
      checkAndUpdateStreak();
    }, 3600000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  // Validate the previous day's conditions for streak
  const validatePreviousDay = async (userId, userData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If lastUpdated is null or not from yesterday, skip validation
    if (!userData.lastStreakUpdate) return;
    
    const lastUpdateDate = userData.lastStreakUpdate.toDate();
    lastUpdateDate.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if the last update was before yesterday
    if (lastUpdateDate < yesterday) {
      console.log('Streak broken - No check-in for consecutive days');
      await resetStreak(userId);
      return;
    }
    
    // Skip validation if already done today
    if (lastUpdateDate.getTime() === today.getTime()) return;
    
    // Check yesterday's meal count and calorie goal
    const yesterdayStart = new Date(yesterday);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    await validateStreakConditions(
      userId, 
      Timestamp.fromDate(yesterdayStart), 
      Timestamp.fromDate(yesterdayEnd),
      userData.targetCalories || 2000
    );
  };
  
  // Check if user met the streak conditions
  const validateStreakConditions = async (userId, startTime, endTime, targetCalories) => {
    try {
      // Get meals for the specified time period
      const mealsRef = collection(db, 'meals');
      const q = query(
        mealsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', startTime),
        where('timestamp', '<=', endTime)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Count meals and total calories
      let mealCount = querySnapshot.size;
      let totalCalories = 0;
      
      querySnapshot.forEach((doc) => {
        const mealData = doc.data();
        totalCalories += mealData.calories || 0;
      });
      
      setDailyMealsTracked(mealCount);
      setCalorieGoalMet(totalCalories >= targetCalories);
      
      const userDocRef = doc(db, 'users', userId);
      
      // Check if both conditions are met
      if (mealCount >= 2 && totalCalories >= targetCalories) {
        // Conditions met, update streak if needed
        await updateDoc(userDocRef, {
          lastStreakUpdate: Timestamp.now()
        });
      } else {
        // Conditions not met, reset streak
        console.log('Streak broken - Conditions not met', {
          mealsTracked: mealCount,
          totalCalories,
          targetCalories
        });
        await resetStreak(userId);
      }
    } catch (error) {
      console.error('Error validating streak conditions:', error);
    }
  };

  // Reset streak to 0
  const resetStreak = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        streak: 0,
        lastStreakUpdate: Timestamp.now()
      });
      setStreak(0);
    } catch (error) {
      console.error('Error resetting streak:', error);
    }
  };

  // Check and update streak
  const checkAndUpdateStreak = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const userId = currentUser.uid;
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      const lastUpdate = userData.lastStreakUpdate?.toDate() || null;
      
      if (!lastUpdate) {
        // First time tracking
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastUpdateDate = new Date(lastUpdate);
      lastUpdateDate.setHours(0, 0, 0, 0);
      
      // If last update was from yesterday, check today's conditions
      if (lastUpdateDate.getTime() === today.getTime()) {
        // Already checked today
        return;
      }
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastUpdateDate.getTime() === yesterday.getTime()) {
        // Check today's conditions to extend streak
        const todayStart = new Date(today);
        const todayEnd = new Date();
        
        await validateStreakConditions(
          userId, 
          Timestamp.fromDate(todayStart), 
          Timestamp.fromDate(todayEnd),
          userData.targetCalories || 2000
        );
        
        // If conditions are met, increment streak
        if (dailyMealsTracked >= 2 && calorieGoalMet) {
          const newStreak = (userData.streak || 0) + 1;
          await updateDoc(userDocRef, {
            streak: newStreak,
            lastStreakUpdate: Timestamp.now()
          });
          setStreak(newStreak);
        }
      } else if (lastUpdateDate < yesterday) {
        // Missed a day, reset streak
        await resetStreak(userId);
      }
    } catch (error) {
      console.error('Error checking streak:', error);
    }
  };

  // Determine the flame size and color based on streak
  const getFlameProperties = () => {
    if (streak < 3) return { size: 24, color: '#FF9800' };
    if (streak < 7) return { size: 32, color: '#FF5722' };
    if (streak < 14) return { size: 40, color: '#F44336' };
    return { size: 48, color: '#E91E63' };
  };

  const { size, color } = getFlameProperties();

  // Animation logic
  useEffect(() => {
    const animateFlame = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flameSize, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(flameSize, {
            toValue: 1,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(flamePosition, {
            toValue: -3,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(flamePosition, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(flameOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(flameOpacity, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        animateFlame();
      });
    };

    animateFlame();

    return () => {
      flameSize.stopAnimation();
      flamePosition.stopAnimation();
      flameOpacity.stopAnimation();
    };
  }, []);

  // Get streak description
  const getStreakDescription = () => {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return 'First day!';
    if (streak < 3) return 'Just getting started!';
    if (streak < 7) return 'Keep it up!';
    if (streak < 14) return "You're on fire!";
    if (streak < 30) return 'Blazing hot!';
    return 'Unstoppable!';
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(255,62,0,0.1)', 'rgba(255,62,0,0.05)', 'transparent']}
          style={styles.gradientBackground}
        >
          <Text style={styles.loadingText}>Loading streak data...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,62,0,0.15)', 'rgba(255,62,0,0.05)', 'transparent']}
        style={styles.gradientBackground}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={styles.streakInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.streakLabel}>STREAK</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setInfoModalVisible(true)}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color="#FF7043"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.streakValueContainer}>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakUnit}>days</Text>
          </View>
          <Text style={styles.streakDescription}>{getStreakDescription()}</Text>
        </View>

        <View style={styles.flameContainer}>
          <Animated.View
            style={[
              styles.flame,
              {
                transform: [
                  { translateY: flamePosition },
                  { scale: flameSize },
                ],
                opacity: flameOpacity,
              },
            ]}
          >
            <MaterialCommunityIcons name="fire" size={size} color={color} />
          </Animated.View>

          {streak >= 7 && (
            <View style={styles.sparksContainer}>
              {[...Array(3)].map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.spark,
                    {
                      left: 10 + index * 15,
                      transform: [
                        { translateY: Animated.multiply(flamePosition, 1.5) },
                        { scale: Animated.multiply(flameSize, 0.7) },
                      ],
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="star"
                    size={10}
                    color="#FFEB3B"
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Maintain Your Streak</Text>
              <TouchableOpacity 
                style={styles.closeIcon}
                onPress={() => setInfoModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#FF5722"
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.infoSection}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="scan-helper"
                    size={28}
                    color="#FF5722"
                  />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Condition 1</Text>
                  <Text style={styles.infoText}>
                    Log at least two meals daily using the scanner.
                  </Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="food-apple"
                    size={28}
                    color="#FF5722"
                  />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Condition 2</Text>
                  <Text style={styles.infoText}>
                    Meet your daily calorie goal.
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoNoteContainer}>
                <Text style={styles.infoText2}>
                  Both conditions must be satisfied each day to keep your streak
                  alive!
                </Text>
              </View>
              
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Today's Progress</Text>
                <View style={styles.progressRow}>
                  <MaterialCommunityIcons
                    name={dailyMealsTracked >= 2 ? "check-circle" : "alert-circle-outline"}
                    size={20}
                    color={dailyMealsTracked >= 2 ? "#4CAF50" : "#FF9800"}
                  />
                  <Text style={styles.progressDetail}>
                    {dailyMealsTracked}/2 meals tracked today
                  </Text>
                </View>
                <View style={styles.progressRow}>
                  <MaterialCommunityIcons
                    name={calorieGoalMet ? "check-circle" : "alert-circle-outline"}
                    size={20}
                    color={calorieGoalMet ? "#4CAF50" : "#FF9800"}
                  />
                  <Text style={styles.progressDetail}>
                    {calorieGoalMet ? "Calorie goal met" : "Calorie goal not yet met"}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setInfoModalVisible(false)}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={styles.closeButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 4 : 3,
    backgroundColor: '#FFF',
  },
  gradientBackground: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
  },
  streakInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF7043',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoButton: {
    marginLeft: 8,
    padding: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,112,67,0.08)',
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakValue: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FF5722',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  streakUnit: {
    fontSize: 16,
    color: '#FF5722',
    marginLeft: 5,
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  streakDescription: {
    fontSize: 14,
    color: '#FF7043',
    marginTop: 5,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  flameContainer: {
    position: 'relative',
    height: 70,
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,112,67,0.08)',
    borderRadius: 35,
  },
  flame: {
    position: 'absolute',
  },
  sparksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  spark: {
    position: 'absolute',
    top: 0,
  },
  loadingText: {
    fontSize: 14,
    color: '#FF7043',
    textAlign: 'center',
    flex: 1,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 30 : 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: Platform.OS === 'android' ? 8 : 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  closeIcon: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,87,34,0.08)',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
    padding: 5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,87,34,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  infoNoteContainer: {
    backgroundColor: 'rgba(255,87,34,0.05)',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  infoText2: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
    fontWeight: '500',
  },
  progressSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  progressDetail: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#FF5722',
    padding: Platform.OS === 'android' ? 16 : 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
    letterSpacing: 0.5,
  },
});

export default StreakComp;