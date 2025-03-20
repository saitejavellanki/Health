import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { router } from 'expo-router';
import { styles } from '../Utils/HomePageStyles';
import StreakComp from '@/components/UserStats/StreakComp';
import NoPlanScreen from '../Utils/NoPlanScreen';
import CrunchXLogo from '../Utils/Logo';
import ActiveOrders from '@/components/ActiveOrders/activeOrders';

// API configuration for Gemini
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default function Home() {
  const [todaysPlan, setTodaysPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userGoal, setUserGoal] = useState('');
  const [fullPlanData, setFullPlanData] = useState(null);
  const [userName, setUserName] = useState('User');
  const [nutritionData, setNutritionData] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbohydrates: 0,
  });
  const [targetCalories, setTargetCalories] = useState(2000); // Default value
  const [calorieProgress, setCalorieProgress] = useState(0);
  const [userPlanDocId, setUserPlanDocId] = useState(null);
  const [nutritionOnlyMode, setNutritionOnlyMode] = useState(false); // Toggle state for nutrition-only mode

  // Function to get personalized calorie recommendations from Gemini AI
  const getPersonalizedCalories = async (userData) => {
    try {
      // Construct a prompt with the user's data
      const prompt = `
        Calculate daily calorie target for a person with the following details:
        Goal: ${userData.goal}
        Gender: ${userData.gender || 'Not specified'}
        Age: ${userData.age || 'Not specified'}
        Weight: ${userData.weight || 'Not specified'} ${
        userData.weightUnit || 'kg'
      }
        Height: ${userData.height || 'Not specified'} ${
        userData.heightUnit || 'cm'
      }
        Activity level: ${userData.activityLevel || 'Moderate'}
        
        Please respond with only a number representing the recommended daily calorie intake. And also dont add items that include ragi, brown rice, johar.
      `;

      console.log('Sending request to Gemini API with prompt:', prompt);

      // Make API call to Gemini
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 100,
          },
        }),
      });

      const data = await response.json();
      console.log('Gemini API response:', data);

      // Extract the recommended calories from the response
      if (data.candidates && data.candidates[0]?.content?.parts) {
        const responseText = data.candidates[0].content.parts[0].text.trim();
        console.log('Raw response text:', responseText);

        // Try to extract just the number from the response
        const matches = responseText.match(/\b\d{3,4}\b/); // Match 3-4 digit numbers
        const recommendedCalories = matches
          ? parseInt(matches[0])
          : parseInt(responseText);

        console.log('Parsed calorie value:', recommendedCalories);

        if (!isNaN(recommendedCalories) && recommendedCalories > 0) {
          return recommendedCalories;
        }
      }

      // Fallback to default calculation if the API doesn't return a valid number
      console.log('Falling back to default calorie calculation');
      return getDefaultCaloriesForGoal(userData.goal);
    } catch (error) {
      console.error('Error getting personalized calories:', error);
      return getDefaultCaloriesForGoal(userData.goal);
    }
  };

  useEffect(() => {
    console.log('Home screen mounted, checking user plan');
    const fetchUserPlan = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.error('No user is logged in');
          setNutritionOnlyMode(true); // Set nutrition-only mode to true when no user
          setLoading(false);
          return;
        }

        // Set user's name if available
        if (currentUser.displayName) {
          setUserName(currentUser.displayName.split(' ')[0]);
        }

        const db = getFirestore();
        
        // First, fetch the user document to get targetCalories
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          
          // Check if targetCalories exists in the user document
          if (userData.targetCalories) {
            console.log('Using target calories from user collection:', userData.targetCalories);
            setTargetCalories(userData.targetCalories);
          } else {
            console.log('No targetCalories found in user document, will calculate later');
          }
        } else {
          console.log('User document not found');
        }

        const userPlansRef = collection(db, 'userplans');
        const q = query(userPlansRef, where('userId', '==', currentUser.uid));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error('No user plan found for this user');
          setNutritionOnlyMode(true); // Set nutrition-only mode to true when no plan found
          setLoading(false);
          return;
        }

        const userPlanDoc = querySnapshot.docs[0];
        const userPlanData = userPlanDoc.data();

        setUserPlanDocId(userPlanDoc.id);
        setUserGoal(userPlanData.goal || '');

        // If targetCalories wasn't found in the user document, calculate it
        if (!userDocSnap.exists() || !userDocSnap.data().targetCalories) {
          // Get or set target calories
          if (userPlanData.targetCalories) {
            console.log(
              'Using existing target calories from userplan:',
              userPlanData.targetCalories
            );
            setTargetCalories(userPlanData.targetCalories);
          } else {
            try {
              console.log('Getting personalized calorie recommendation');
              // Get personalized calorie recommendation
              const personalizedCalories = await getPersonalizedCalories({
                goal: userPlanData.goal,
                gender: userPlanData.gender,
                age: userPlanData.age,
                weight: userPlanData.weight,
                weightUnit: userPlanData.weightUnit,
                height: userPlanData.height,
                heightUnit: userPlanData.heightUnit,
                activityLevel: userPlanData.activityLevel || 'Moderate',
              });

              console.log(
                'Personalized calories recommended:',
                personalizedCalories
              );
              setTargetCalories(personalizedCalories);

              // Update the user document with personalized target calories
              try {
                await updateDoc(userDocRef, {
                  targetCalories: personalizedCalories,
                });
                console.log(
                  'Updated user document with personalized target calories'
                );
              } catch (error) {
                console.error('Error updating target calories in user document:', error);
              }
            } catch (error) {
              // Fallback to default calculation
              console.error(
                'Error in personalized calorie calculation, falling back to default:',
                error
              );
              const goalBasedCalories = getDefaultCaloriesForGoal(
                userPlanData.goal
              );
              setTargetCalories(goalBasedCalories);

              // Update user document with default values
              try {
                await updateDoc(userDocRef, {
                  targetCalories: goalBasedCalories,
                });
                console.log('Updated user document with default target calories');
              } catch (error) {
                console.error('Error updating target calories in user document:', error);
              }
            }
          }
        }

        const parsedPlan = JSON.parse(userPlanData.parsedPlan);
        setFullPlanData(parsedPlan);

        const days = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
        const today = new Date();
        const dayName = days[today.getDay()];

        const todaysPlan = parsedPlan.find((plan) => plan.day === dayName);

        if (!todaysPlan) {
          console.error(`No plan found for ${dayName}`);
          setNutritionOnlyMode(true); // Set nutrition-only mode to true when no plan for today
          setLoading(false);
          return;
        }

        setTodaysPlan(todaysPlan);

        // Fetch nutrition data from the meals collection
        await fetchTodaysNutritionData(currentUser.uid);
      } catch (error) {
        console.error('Error fetching user plan:', error);
        Alert.alert(
          'Error',
          'Could not load your nutrition plan. Please try again later.'
        );
        setNutritionOnlyMode(true); // Set nutrition-only mode to true when error occurs
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, []);

  // Function to get default calories based on user goal
  const getDefaultCaloriesForGoal = (goal) => {
    if (!goal) return 2000;

    switch (goal.toLowerCase()) {
      case 'weight loss':
        return 1800;
      case 'muscle gain':
        return 2500;
      case 'maintenance':
        return 2200;
      default:
        return 2000;
    }
  };

  const fetchTodaysNutritionData = async (userId) => {
    try {
      const db = getFirestore();
      const mealsRef = collection(db, 'meals');

      // Get the start and end of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = Timestamp.fromDate(today);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfDay = Timestamp.fromDate(tomorrow);

      // Query meals for the current user from today
      const q = query(
        mealsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<', endOfDay),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);

      // Calculate total nutrition values
      let totalCalories = 0;
      let totalProtein = 0;
      let totalFat = 0;
      let totalCarbs = 0;

      querySnapshot.forEach((doc) => {
        const mealData = doc.data();
        totalCalories += mealData.calories || 0;
        totalProtein += mealData.protein || 0;
        totalFat += mealData.fat || 0;
        totalCarbs += mealData.carbohydrates || 0;
      });

      setNutritionData({
        calories: totalCalories,
        protein: totalProtein,
        fat: totalFat,
        carbohydrates: totalCarbs,
      });

      // Calculate progress percentage
      const progress = Math.min(
        Math.round((totalCalories / targetCalories) * 100),
        100
      );
      setCalorieProgress(progress);

      // Update progress in userplans collection
      if (userPlanDocId) {
        try {
          const db = getFirestore();
          await updateDoc(doc(db, 'userplans', userPlanDocId), {
            currentCalories: totalCalories,
            calorieProgress: progress,
            lastUpdated: Timestamp.now(),
          });
        } catch (error) {
          console.error('Error updating progress:', error);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      setLoading(false);
    }
  };

  const getCurrentMeal = () => {
    if (!todaysPlan || !todaysPlan.sections)
      return { type: 'No meal', name: 'No meal data available', calories: 0 };

    const hour = new Date().getHours();

    if (hour < 11)
      return {
        type: 'Breakfast',
        name: todaysPlan.sections.breakfast[0],
        calories: 450,
      };
    if (hour < 15)
      return {
        type: 'Lunch',
        name: todaysPlan.sections.lunch[0],
        calories: 650,
      };
    if (hour < 19)
      return {
        type: 'Dinner',
        name: todaysPlan.sections.dinner[0],
        calories: 550,
      };
    return { type: 'Snack', name: todaysPlan.sections.snack[0], calories: 200 };
  };

  const navigateToRecipe = () => {
    const currentMeal = getCurrentMeal();
    if (currentMeal && currentMeal.name && todaysPlan) {
      router.push({
        pathname: '/Screens/Recipe',
        params: {
          mealType: currentMeal.type.toLowerCase(),
          mealName: currentMeal.name,
          calories: currentMeal.calories.toString(),
        },
      });
    }
  };

  const navigateToTracker = () => {
    router.push({
      pathname: '/Screens/CalorieTrackerScreen',
      params: {
        calories: nutritionData.calories.toString(),
        protein: nutritionData.protein.toString(),
        fat: nutritionData.fat.toString(),
        carbohydrates: nutritionData.carbohydrates.toString(),
        targetCalories: targetCalories.toString(),
      },
    });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const toggleNutritionMode = () => {
    setNutritionOnlyMode(!nutritionOnlyMode);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your nutrition plan...</Text>
      </View>
    );
  }

  if (!todaysPlan && !nutritionOnlyMode) {
    return <NoPlanScreen onToggleNutritionMode={toggleNutritionMode} />;
  }

  const currentMeal = getCurrentMeal();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              Good {getTimeOfDay()}, {userName}!
            </Text>
            <View style={styles.goalRow}>
              <Text style={styles.subtitle}>
                {nutritionOnlyMode
                  ? 'Nutrition Tracking'
                  : `${todaysPlan.day}'s Plan`}
              </Text>
              {!nutritionOnlyMode && (
                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>{userGoal}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}></Text>
            <Switch
              value={nutritionOnlyMode}
              onValueChange={toggleNutritionMode}
              trackColor={{ false: '#e5e7eb', true: '#dcfce7' }}
              thumbColor={nutritionOnlyMode ? '#22c55e' : '#9ca3af'}
            />
          </View>
        </View>
        <StreakComp />
      </View>

      <ActiveOrders />

      {/* Current Meal Card - Only show when not in nutrition-only mode */}
      {!nutritionOnlyMode && (
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
      )}

      {/* Nutrition Stats */}
      <Pressable
        style={[
          styles.statsContainer,
          nutritionOnlyMode && styles.statsContainerExpanded,
        ]}
        onPress={navigateToTracker}
        android_ripple={{ color: '#f3f4f6' }}
      >
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Calories</Text>
          <Text style={styles.statValue}>
            {nutritionData.calories}{' '}
            <Text style={styles.statTarget}>/ {targetCalories}</Text>
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Protein</Text>
          <Text style={styles.statValue}>{nutritionData.protein}g</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Fat</Text>
          <Text style={styles.statValue}>{nutritionData.fat}g</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Carbs</Text>
          <Text style={styles.statValue}>{nutritionData.carbohydrates}g</Text>
        </View>
      </Pressable>

      {/* Track Button */}
      <View style={styles.trackButtonContainer}>
        <Pressable
          style={[styles.trackButton, { width: '75%' }]}
          onPress={navigateToTracker}
          android_ripple={{ color: '#e6f7ef' }}
        >
          <Feather
            name="bar-chart-2"
            size={18}
            color="#ffffff"
            style={styles.trackButtonIcon}
          />
          <Text style={styles.trackButtonText}>Scan meal</Text>
        </Pressable>

        <Pressable
          style={[styles.trackButton, { width: '22%' }]}
          onPress={() => router.push('/Screens/MemoryGalleryScreen')}
          android_ripple={{ color: '#e6f7ef' }}
        >
          <Feather name="image" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {/* Tracking Section - Always show regardless of mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracking Focus</Text>

        {!nutritionOnlyMode && (
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <Feather name="file-text" size={20} color="#22c55e" />
              <Text style={styles.trackingHeaderText}>Today's Focus</Text>
            </View>
            <Text style={styles.trackingText}>
              {todaysPlan.sections.tracking[0]}
            </Text>
          </View>
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelContainer}>
            <Text style={styles.progressLabel}>Calorie goal progress</Text>
            <Text style={styles.progressPercentage}>{calorieProgress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${calorieProgress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {nutritionData.calories} / {targetCalories} calories consumed
          </Text>
        </View>
      </View>

      <CrunchXLogo />
      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}