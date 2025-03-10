import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ChevronRight, ShoppingCart, Utensils } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { router } from 'expo-router';

export default function Home() {
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userGoal, setUserGoal] = useState('');
  const [fullPlanData, setFullPlanData] = useState(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        // Get current user
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error("No user is logged in");
          setLoading(false);
          return;
        }

        // Initialize Firestore
        const db = getFirestore();
        
        // Query userplans collection for the current user's plan
        const userPlansRef = collection(db, "userplans");
        const q = query(userPlansRef, where("userId", "==", currentUser.uid));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.error("No user plan found for this user");
          setLoading(false);
          return;
        }
        
        // Get the first matching plan
        const userPlanDoc = querySnapshot.docs[0];
        const userPlanData = userPlanDoc.data();
        
        // Set user goal
        setUserGoal(userPlanData.goal || "");
        
        // Parse the plan data
        const parsedPlan = JSON.parse(userPlanData.parsedPlan);
        
        // Save the full plan data for shopping list generation
        setFullPlanData(parsedPlan);
        
        // Get current day of the week
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const dayName = days[today.getDay()];
        
        // Find today's plan
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

  const calculateTotalCalories = () => {
    // In a real app, you would calculate this based on the actual meals
    // This is a placeholder value
    return 1850;
  };

  const navigateToAllMeals = () => {
    if (todaysPlan && todaysPlan.sections) {
      // Navigate to the AllMeals screen in the (onboarding) group
      router.push({
        pathname: '/(onboarding)/AllMeals',
        params: {
          meals: JSON.stringify(todaysPlan.sections), // Need to stringify objects for URL params
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

  // Calculate the current meal based on time of day
  const getCurrentMeal = () => {
    if (!todaysPlan || !todaysPlan.sections) return { type: 'No meal', name: 'No meal data available', calories: 0 };
    
    const hour = new Date().getHours();
    
    if (hour < 11) return { type: 'Breakfast', name: todaysPlan.sections.breakfast[0], calories: 450 };
    if (hour < 15) return { type: 'Lunch', name: todaysPlan.sections.lunch[0], calories: 650 };
    if (hour < 19) return { type: 'Dinner', name: todaysPlan.sections.dinner[0], calories: 550 };
    return { type: 'Snack', name: todaysPlan.sections.snack[0], calories: 200 };
  };

  // Navigate to recipe for current meal
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, User!</Text>
        <Text style={styles.subtitle}>Here's your nutrition plan for {todaysPlan.day}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        <View style={styles.card}>
          <Text style={styles.mealTime}>{currentMeal.type}</Text>
          <Text style={styles.mealName}>{currentMeal.name}</Text>
          <Text style={styles.calories}>{currentMeal.calories} calories</Text>
        </View>
        <View style={styles.buttonContainer}>
          <Pressable style={styles.viewAllButton} onPress={navigateToAllMeals}>
            <Text style={styles.viewAllText}>View all meals</Text>
            <ChevronRight size={20} color="#22c55e" />
          </Pressable>
          <Pressable style={styles.actionButton} onPress={navigateToRecipe}>
            <Utensils size={20} color="#22c55e" style={styles.buttonIcon} />
            <Text style={styles.viewAllText}>View recipe</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={navigateToShoppingList}>
            <ShoppingCart size={20} color="#22c55e" style={styles.buttonIcon} />
            <Text style={styles.viewAllText}>Generate shopping list</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Exercise</Text>
        <View style={styles.card}>
          <Text style={styles.exerciseText}>{todaysPlan.sections.exercise[0]}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Goals</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calculateTotalCalories()}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>120g</Text>
            <Text style={styles.statLabel}>Protein</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>45g</Text>
            <Text style={styles.statLabel}>Fat</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Tracking</Text>
        <View style={styles.card}>
          <Text style={styles.trackingText}>{todaysPlan.sections.tracking[0]}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{userGoal} Goal</Text>
        <View style={styles.goalCard}>
          <Text style={styles.goalText}>You're on track with your {userGoal.toLowerCase()} plan!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
  },
  greeting: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
  },
  section: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mealTime: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  mealName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  calories: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#22c55e',
  },
  exerciseText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1a1a1a',
  },
  trackingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1a1a1a',
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewAllText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#22c55e',
    marginRight: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  goalCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  goalText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#15803d',
  },
});