import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { router } from 'expo-router';

export default function Home() {
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userGoal, setUserGoal] = useState('');
  const [fullPlanData, setFullPlanData] = useState(null);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error("No user is logged in");
          setLoading(false);
          return;
        }

        // Set user's name if available
        if (currentUser.displayName) {
          setUserName(currentUser.displayName.split(' ')[0]);
        }

        const db = getFirestore();
        const userPlansRef = collection(db, "userplans");
        const q = query(userPlansRef, where("userId", "==", currentUser.uid));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.error("No user plan found for this user");
          setLoading(false);
          return;
        }
        
        const userPlanDoc = querySnapshot.docs[0];
        const userPlanData = userPlanDoc.data();
        
        setUserGoal(userPlanData.goal || "");
        
        const parsedPlan = JSON.parse(userPlanData.parsedPlan);
        setFullPlanData(parsedPlan);
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const dayName = days[today.getDay()];
        
        const todaysPlan = parsedPlan.find(plan => plan.day === dayName);
        
        if (!todaysPlan) {
          console.error(`No plan found for ${dayName}`);
          setLoading(false);
          return;
        }
        
        setTodaysPlan(todaysPlan);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user plan:", error);
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, []);

  const getCurrentMeal = () => {
    if (!todaysPlan || !todaysPlan.sections) return { type: 'No meal', name: 'No meal data available', calories: 0 };
    
    const hour = new Date().getHours();
    
    if (hour < 11) return { type: 'Breakfast', name: todaysPlan.sections.breakfast[0], calories: 450 };
    if (hour < 15) return { type: 'Lunch', name: todaysPlan.sections.lunch[0], calories: 650 };
    if (hour < 19) return { type: 'Dinner', name: todaysPlan.sections.dinner[0], calories: 550 };
    return { type: 'Snack', name: todaysPlan.sections.snack[0], calories: 200 };
  };

  const navigateToAllMeals = () => {
    if (todaysPlan && todaysPlan.sections) {
      router.push({
        pathname: '/(onboarding)/AllMeals',
        params: {
          meals: JSON.stringify(todaysPlan.sections),
          day: todaysPlan.day
        }
      });
    }
  };

  const navigateToShoppingList = () => {
    if (fullPlanData) {
      router.push({
        pathname: '/(onboarding)/ShoppingList',
        params: {
          fullPlan: JSON.stringify(fullPlanData)
        }
      });
    }
  };

  const navigateToRecipe = () => {
    const currentMeal = getCurrentMeal();
    if (currentMeal && currentMeal.name && todaysPlan) {
      router.push({
        pathname: '/(onboarding)/Recipe',
        params: {
          mealType: currentMeal.type.toLowerCase(),
          mealName: currentMeal.name,
          calories: currentMeal.calories.toString()
        }
      });
    }
  };

  const navigateToTracker = () => {
    router.push({
      pathname: '/(onboarding)/CalorieTrackerScreen',
      params: {
        calories: '1850',
        protein: '120',
        fat: '45'
      }
    });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your nutrition plan...</Text>
      </View>
    );
  }

  if (!todaysPlan) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No plan available for today. Please create a plan first.</Text>
      </View>
    );
  }

  const currentMeal = getCurrentMeal();
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()}, {userName}!</Text>
          <View style={styles.goalRow}>
            <Text style={styles.subtitle}>{todaysPlan.day}'s Plan</Text>
            <View style={styles.goalPill}>
              <Text style={styles.goalPillText}>{userGoal}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Current Meal Card */}
      <View style={styles.currentMealContainer}>
        <View style={styles.currentMealCard}>
          <View style={styles.mealInfoRow}>
            <View>
              <View style={styles.mealTypeContainer}>
                <Feather name="clock" size={14} color="#22c55e" />
                <Text style={styles.mealType}>{currentMeal.type}</Text>
              </View>
              <Text style={styles.mealName}>{currentMeal.name}</Text>
            </View>
            <Text style={styles.calories}>{currentMeal.calories} cal</Text>
          </View>
          
          <Pressable 
            style={styles.recipeButton} 
            onPress={navigateToRecipe}
            android_ripple={{ color: '#e6f7ef' }}
          >
            <Text style={styles.recipeButtonText}>View Recipe</Text>
          </Pressable>
        </View>
      </View>

      {/* Nutrition Stats */}
      <Pressable 
        style={styles.statsContainer} 
        onPress={navigateToTracker}
        android_ripple={{ color: '#f3f4f6' }}
      >
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Calories</Text>
          <Text style={styles.statValue}>1850</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Protein</Text>
          <Text style={styles.statValue}>120g</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Fat</Text>
          <Text style={styles.statValue}>45g</Text>
        </View>
      </Pressable>
      
      {/* Track Button */}
      <View style={styles.trackButtonContainer}>
        <Pressable 
          style={styles.trackButton} 
          onPress={navigateToTracker}
          android_ripple={{ color: '#e6f7ef' }}
        >
          <Feather name="bar-chart-2" size={18} color="#ffffff" style={styles.trackButtonIcon} />
          <Text style={styles.trackButtonText}>Track Nutrition</Text>
        </Pressable>
      </View>

      {/* Diet & Exercise Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Plan</Text>
        
        {/* Meals Card */}
        <Pressable 
          style={styles.actionCard} 
          onPress={navigateToAllMeals}
          android_ripple={{ color: '#f3f4f6' }}
        >
          <View style={styles.actionCardContent}>
            <View style={styles.actionIconContainer}>
              <Feather name="coffee" size={20} color="#22c55e" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>All Meals</Text>
              <Text style={styles.actionSubtitle}>View your full meal plan</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </Pressable>
        
        {/* Shopping List Card */}
        <Pressable 
          style={styles.actionCard} 
          onPress={navigateToShoppingList}
          android_ripple={{ color: '#f3f4f6' }}
        >
          <View style={styles.actionCardContent}>
            <View style={styles.actionIconContainer}>
              <Feather name="shopping-bag" size={20} color="#22c55e" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Shopping List</Text>
              <Text style={styles.actionSubtitle}>All ingredients you need</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#9ca3af" />
        </Pressable>
      </View>

      {/* Exercise Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exercise</Text>
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Feather name="activity" size={20} color="#22c55e" />
            <Text style={styles.exerciseHeaderText}>Today's Workout</Text>
          </View>
          <Text style={styles.exerciseText}>{todaysPlan.sections.exercise[0]}</Text>
        </View>
      </View>

      {/* Tracking Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracking Focus</Text>
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Feather name="file-text" size={20} color="#22c55e" />
            <Text style={styles.trackingHeaderText}>Today's Focus</Text>
          </View>
          <Text style={styles.trackingText}>{todaysPlan.sections.tracking[0]}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelContainer}>
            <Text style={styles.progressLabel}>Your progress</Text>
            <Text style={styles.progressPercentage}>75%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar} />
          </View>
          <Text style={styles.progressText}>You're on track with your {userGoal.toLowerCase()} plan!</Text>
        </View>
      </View>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    marginRight: 8,
  },
  goalPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  goalPillText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '600',
  },
  currentMealContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  currentMealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  mealInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealType: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 6,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    maxWidth: 220,
  },
  calories: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  recipeButton: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  recipeButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  trackButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  trackButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  trackButtonIcon: {
    marginRight: 8,
  },
  trackButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  exerciseText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  trackingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  trackingText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    width: '75%',
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#15803d',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 30,
  },
});