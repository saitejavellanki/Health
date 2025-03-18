import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import CrunchXLogo from '../Utils/Logo';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  Dumbbell,
  Coffee,
  Utensils,
  Moon,
  Save,
  Info,
  ChevronLeft,
} from 'lucide-react-native';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../components/firebase/Firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Checkbox } from 'expo-checkbox';
// import { doc, updateDoc } from 'firebase/firestore';
// import { auth, db } from '../../components/firebase/Firebase';

const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const parseDailyPlan = (planText) => {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const dailyPlans = [];

  const lines = planText.split('\n');

  let currentDay = null;
  let currentPlan = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const dayMatch = days.find(
      (day) =>
        trimmedLine.startsWith(day) ||
        trimmedLine.startsWith(`**${day}**`) ||
        trimmedLine.startsWith(`# ${day}`)
    );

    if (dayMatch) {
      if (currentDay && currentPlan) {
        dailyPlans.push({
          day: currentDay,
          sections: currentPlan,
        });
      }

      currentDay = dayMatch.replace(/[*#]/g, '').trim();
      currentPlan = {
        overview: [],
        exercise: [],
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
        tracking: [],
      };
    } else if (currentDay && currentPlan) {
      if (
        /^[-•*]?\s*(Exercise|Workout|Physical Activity|Fitness):/i.test(
          trimmedLine
        )
      ) {
        currentPlan.exercise.push(
          trimmedLine
            .replace(
              /^[-•*]?\s*(Exercise|Workout|Physical Activity|Fitness):/i,
              ''
            )
            .trim()
        );
      } else if (/^[-•*]?\s*(Breakfast|Morning):/i.test(trimmedLine)) {
        currentPlan.breakfast.push(
          trimmedLine.replace(/^[-•*]?\s*(Breakfast|Morning):/i, '').trim()
        );
      } else if (/^[-•*]?\s*(Lunch|Midday):/i.test(trimmedLine)) {
        currentPlan.lunch.push(
          trimmedLine.replace(/^[-•*]?\s*(Lunch|Midday):/i, '').trim()
        );
      } else if (/^[-•*]?\s*(Dinner|Evening):/i.test(trimmedLine)) {
        currentPlan.dinner.push(
          trimmedLine.replace(/^[-•*]?\s*(Dinner|Evening):/i, '').trim()
        );
      } else if (/^[-•*]?\s*(Snack|Snacks):/i.test(trimmedLine)) {
        currentPlan.snack.push(
          trimmedLine.replace(/^[-•*]?\s*(Snack|Snacks):/i, '').trim()
        );
      } else if (
        /^[-•*]?\s*(Tracking|Monitoring|Progress|Tips|Mindfulness|Self-care):/i.test(
          trimmedLine
        )
      ) {
        currentPlan.tracking.push(
          trimmedLine
            .replace(
              /^[-•*]?\s*(Tracking|Monitoring|Progress|Tips|Mindfulness|Self-care):/i,
              ''
            )
            .trim()
        );
      } else {
        currentPlan.overview.push(trimmedLine);
      }
    }
  }

  if (currentDay && currentPlan) {
    dailyPlans.push({
      day: currentDay,
      sections: currentPlan,
    });
  }

  if (dailyPlans.length === 0) {
    const weekdayIndex = new Date().getDay();
    const startDayIndex = weekdayIndex === 0 ? 6 : weekdayIndex - 1;

    return days.map((day, index) => ({
      day,
      sections: {
        overview: [index === startDayIndex ? "Today's plan" : 'Plan details'],
        exercise: ['Details not available'],
        breakfast: ['Details not available'],
        lunch: ['Details not available'],
        dinner: ['Details not available'],
        snack: ['Details not available'],
        tracking: ['Details not available'],
      },
    }));
  }

  return dailyPlans;
};

const createPrompt = (userData) => {
  const goal =
    userData.goals && userData.goals.length > 0
      ? userData.goals[0]?.title
      : 'health improvement';

  const targetWeight =
    userData.goals &&
    userData.goals.length > 0 &&
    userData.goals[0]?.targetWeight
      ? userData.goals[0]?.targetWeight
      : null;

  const weightGoalText = targetWeight
    ? `with a target weight of ${targetWeight}kg`
    : '';

  const diet = userData.preferences?.diet || 'balanced';
  const allergies = userData.preferences?.allergies?.join(',') || 'none';
  const state = userData.preferences?.state || 'general South Indian';
  const currentWeight = userData.weight || null;

  const weightContext =
    currentWeight && targetWeight
      ? `Current weight: ${currentWeight}kg, target: ${targetWeight}kg. `
      : '';

  let bmr = 0;
  if (userData.gender === 'female') {
    bmr =
      655.1 +
      9.563 * userData.weight +
      1.85 * userData.height['totalInches'] * 2.54 -
      4.676 * userData.dateOfBirth['age'];
  } else {
    bmr =
      66.47 +
      13.75 * userData.weight +
      5.003 * userData.height['totalInches'] * 2.54 -
      6.755 * userData.dateOfBirth['age'];
  }

  let act_fac = 0;
  if (userData.workoutFrequency === 'none') {
    act_fac += 1.2;
  } else if (userData.workoutFrequency === 'light') {
    act_fac = 1.375;
  } else if (userData.workoutFrequency === 'moderate') {
    act_fac = 1.55;
  } else if (userData.workoutFrequency === 'active') {
    act_fac = 1.725;
  } else if (userData.workoutFrequency === 'intense') {
    act_fac = 1.9;
  }

  let tdde = bmr * act_fac;
  let new_tdde = 0;
  if (userData.goals[0]['title'] === 'Weight Gain') {
    new_tdde = tdde + 200;
  } else if (userData.goals[0]['title'] === 'Weight Gain') {
    new_tdde = tdde - 500;
    if (new_tdde < 1500 && userData.gender === 'male') {
      new_tdde = 1500;
    } else if (new_tdde < 1200 && userData.gender === 'female') {
      new_tdde = 1200;
    }
  }
  console.log('tdde: ' + tdde);
  console.log('new_tdde: ' + new_tdde);

  // updateDoc(useRef,{
  //   tdde:new_tdde,
  // });
//check if this new_tdde is getting updated to firebase.
  // const currentUser = auth.currentUser;

  // const userRef = doc(db, 'users', currentUser.uid);
  // await updateDoc(userRef, {
  //   tdde: tdde,
  // });

  return `Suggest a meal-plan for ${goal} ${weightGoalText}. ${weightContext} Diet preference: ${diet} with Indian food specific to ${state} region. Allergies: ${allergies}. Calorie intake target per day should be almost equal to: ${new_tdde}. Monthly budget: ${userData.budget.amount} INR. 

DO NOT include ragi, jowar, or quinoa in any meal suggestions.

For each day (Monday-Sunday), structure as follows with EXACTLY these section headings:

Start with just the day name (e.g., "Monday")
Exercise: [brief workout plan]
Breakfast: [suggest additional food items to take along with breakfast, specifying how many calories (kcal) they provide at the end of the line]
Snack: [suggest food items to take as snacks, specifying how many calories (kcal) they provide at the end of the line]
Lunch: [suggest food items for lunch, specifying how many calories (kcal) they provide at the end of the line]
Dinner: [suggest additional food items to take along with dinner, specifying how many calories (kcal) they provide at the end of the line]
Tracking: [simple tip for monitoring progress]

Keep each section brief - 1-2 sentences maximum. Focus on actionable items. All suggestions should be familiar, common, and easy-to-eat ${state}-style South Indian cuisine options that locals regularly consume. Only include dishes and ingredients that are widely available and commonly prepared in households in the ${state} region, tailored to the user's diet and allergies.

The food items should be very common that every person in ${state} would recognize and know how to prepare or easily obtain. Ensure calorie intake aligns with ${tdde}, and all recommendations fit within the monthly budget (${userData.budget.amount}), though no pricing information should be included in the output.`;
};

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const PlanScreen = ({ userData: propUserData, route }) => {
  const [userData, setUserData] = useState(null);
  const [rawPlan, setRawPlan] = useState(null);
  const [dailyPlans, setDailyPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isChecked, setChecked] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (propUserData) {
        setUserData(propUserData);
        return;
      }

      setLoadingUserData(true);
      try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserData({
                ...userData,
                uid: user.uid,
              });
            } else {
              console.error('No user document found');
              setErrorMessage('User profile not found');
            }
          } else {
            console.error('No authenticated user');
            setErrorMessage('Not authenticated');
          }
          setLoadingUserData(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoadingUserData(false);
        setErrorMessage('Failed to load your profile');
      }
    };

    fetchUserData();
  }, [propUserData]);

  useEffect(() => {
    if (rawPlan) {
      try {
        console.log('Parsing raw plan...');
        const parsedDays = parseDailyPlan(rawPlan);
        console.log(`Parsed ${parsedDays.length} days from the plan`);
        setDailyPlans(parsedDays);

        const today = new Date().getDay();
        const todayIndex = today === 0 ? 6 : today - 1;
        if (todayIndex < parsedDays.length) {
          setSelectedDayIndex(todayIndex);
        }
      } catch (error) {
        console.error('Error parsing plan:', error);
        setErrorMessage('Error parsing the generated plan');
      }
    } else {
      setDailyPlans([]);
    }
  }, [rawPlan]);

  const generatePlan = async () => {
    if (!userData) {
      setErrorMessage('User data not available. Please try again later.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    console.log('Starting plan generation with user data');

    try {
      const prompt = createPrompt(userData);

      console.log('Sending optimized prompt to Gemini API');

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          'API response not OK:',
          response.status,
          response.statusText,
          errorText
        );

        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails =
            errorJson.error?.message || errorJson.error || errorText;
        } catch (e) {}

        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(
            `API responded with status: ${response.status} - ${errorDetails}`
          );
        }
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const generatedText = data.candidates[0].content.parts[0].text;
        console.log(
          'Successfully generated plan, first 100 chars:',
          generatedText.substring(0, 100)
        );

        setRawPlan(generatedText);
      } else {
        console.error('Invalid response structure:', JSON.stringify(data));

        if (data.error) {
          console.error('API error details:', JSON.stringify(data.error));
          throw new Error(
            `API error: ${data.error.message || JSON.stringify(data.error)}`
          );
        }

        throw new Error('Failed to generate plan: Invalid response structure');
      }
    } catch (error) {
      console.error('Error generating plan:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);

      setErrorMessage(`We couldn't connect to our AI service. ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const savePlanToFirebase = async () => {
    if (!rawPlan || !userData?.uid) {
      setErrorMessage('No plan to save or user not authenticated.');
      return;
    }

    setSavingPlan(true);
    try {
      const userPlanRef = collection(db, 'userplans');
      await addDoc(userPlanRef, {
        userId: userData.uid,
        plan: rawPlan,
        parsedPlan: JSON.stringify(dailyPlans),
        createdAt: new Date().toISOString(),
        goal:
          userData.goals && userData.goals.length > 0
            ? userData.goals[0]?.title
            : 'health improvement',
      });

      Alert.alert('Success', 'Your plan has been saved successfully!');
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error saving plan to Firebase:', error);
      setErrorMessage('Failed to save your plan. Please try again.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleRegenerate = () => {
    setRawPlan(null);
    setDailyPlans([]);
    setErrorMessage(null);
    generatePlan();
  };

  const getSectionIcon = (sectionKey) => {
    switch (sectionKey) {
      case 'exercise':
        return <Dumbbell size={20} color="#22c55e" />;
      case 'breakfast':
        return <Coffee size={20} color="#22c55e" />;
      case 'lunch':
        return <Utensils size={20} color="#22c55e" />;
      case 'dinner':
        return <Moon size={20} color="#22c55e" />;
      case 'snack':
        return <Coffee size={20} color="#22c55e" />;
      case 'tracking':
        return <CheckCircle size={20} color="#22c55e" />;
      default:
        return null;
    }
  };

  const getSectionTitle = (sectionKey) => {
    switch (sectionKey) {
      case 'exercise':
        return 'Exercise';
      case 'breakfast':
        return 'Breakfast';
      case 'lunch':
        return 'Lunch';
      case 'dinner':
        return 'Dinner';
      case 'snack':
        return 'Snacks';
      case 'tracking':
        return 'Daily Tracking';
      case 'overview':
        return '';
      default:
        return sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
    }
  };

  const renderError = () => {
    if (!errorMessage) return null;

    return (
      <View style={styles.errorBanner}>
        <AlertCircle size={20} color="#fff" />
        <Text style={styles.errorBannerText}>{errorMessage}</Text>
      </View>
    );
  };

  const renderDayTabs = () => {
    if (!dailyPlans || dailyPlans.length === 0) return null;

    return (
      <View style={styles.dayTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dailyPlans.map((day, index) => (
            <Pressable
              key={index}
              style={[
                styles.dayTab,
                selectedDayIndex === index && styles.activeDayTab,
              ]}
              onPress={() => setSelectedDayIndex(index)}
            >
              <Text
                style={[
                  styles.dayTabText,
                  selectedDayIndex === index && styles.activeDayTabText,
                ]}
              >
                {day.day.substring(0, 3).toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDayPlan = () => {
    if (!dailyPlans || dailyPlans.length === 0) {
      return (
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
          }}
        >
          <View style={styles.noPlanContainer}>
            <Calendar size={60} color="#22c55e" />
            <Text style={styles.noPlanTitle}>Your Wellness Plan Awaits</Text>
            <Text style={styles.noPlanSubtitle}>
              Generate a personalized 7-day meal and exercise plan based on your
              fitness goals and preferences.
            </Text>

            <View style={styles.checkboxContainer}>
              <Checkbox
                style={styles.checkbox}
                value={isChecked}
                onValueChange={setChecked}
                color={isChecked ? '#22c55e' : undefined}
              />
              <Text style={styles.termsText}>
                I accept CrunchX AI's Terms of Service and Privacy Policy.
              </Text>
            </View>

            <Pressable
              style={[
                styles.generateButton,
                (!isChecked || loading) && styles.generateButtonDisabled,
              ]}
              onPress={generatePlan}
              disabled={loading || !isChecked}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>Create My Plan</Text>
              )}
            </Pressable>
          </View>
          <View style={styles.bottomLogo}>
            <CrunchXLogo />
          </View>
        </View>
      );
    }

    const selectedDay = dailyPlans[selectedDayIndex];
    if (!selectedDay) return null;

    return (
      <View style={styles.dayPlanContainer}>
        <View style={styles.dayHeaderContainer}>
          <Text style={styles.dayHeader}>{selectedDay.day}</Text>
          <View style={styles.actionButtonsContainer}>
            <Pressable
              style={styles.actionButton}
              onPress={handleRegenerate}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                color={loading ? '#c1c1c1' : '#22c55e'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  loading && styles.actionButtonTextDisabled,
                ]}
              >
                Regenerate
              </Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={savePlanToFirebase}
              disabled={savingPlan}
            >
              <Save
                size={16}
                color={savingPlan ? '#c1c1c1' : '#22c55e'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  savingPlan && styles.actionButtonTextDisabled,
                ]}
              >
                {savingPlan ? 'Saving...' : 'Save Plan'}
              </Text>
            </Pressable>
          </View>
        </View>

        {selectedDay.sections.overview.length > 0 && (
          <View style={styles.overviewSection}>
            <Text style={styles.overviewText}>
              {selectedDay.sections.overview.join('\n')}
            </Text>
          </View>
        )}

        {Object.entries(selectedDay.sections)
          .filter(([key]) => key !== 'overview')
          .map(([key, items]) => (
            <View key={key} style={styles.planSection}>
              <View style={styles.sectionHeader}>
                {getSectionIcon(key)}
                <Text style={styles.sectionTitle}>{getSectionTitle(key)}</Text>
              </View>
              {items.map((item, index) => (
                <Text key={index} style={styles.sectionItem}>
                  {item}
                </Text>
              ))}
            </View>
          ))}
      </View>
    );
  };

  if (loadingUserData && !userData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#ffffff', '#f9fafb']} style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/(tabs)')}
          >
            <ChevronLeft size={22} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.headerTitle}>Your Wellness Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        {renderError()}
        {renderDayTabs()}

        <ScrollView
          style={styles.contentScrollView}
          showsVerticalScrollIndicator={false}
        >
          {renderDayPlan()}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 10,
    margin: 10,
    borderRadius: 8,
  },
  bottomLogo: {
    marginTop: 'auto',
    bottom: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    // backgroundColor:"red",
  },
  errorBannerText: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  dayTabsWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  activeDayTab: {
    backgroundColor: '#22c55e',
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeDayTabText: {
    color: '#fff',
  },
  contentScrollView: {
    flex: 1,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  noPlanContainer: {
    flexDirection: 'column',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: '100%', // Use percentage instead of fixed height
  },

  noPlanTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  noPlanSubtitle: {
    fontSize: isMobile ? 16 : 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: isMobile ? 14 : 16,
    color: '#333333',
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
  },
  generateButtonDisabled: {
    backgroundColor: '#a8e2c0',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dayPlanContainer: {
    padding: 16,
  },
  dayHeaderContainer: {
    marginBottom: 16,
  },
  dayHeader: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
  actionButtonTextDisabled: {
    color: '#c1c1c1',
  },
  overviewSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  overviewText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  planSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  sectionItem: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 28,
  },
});

export default PlanScreen;
