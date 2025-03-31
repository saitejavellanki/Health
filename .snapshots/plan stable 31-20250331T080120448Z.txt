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
  TextInput,
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
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../components/firebase/Firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Checkbox } from 'expo-checkbox';

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
    let currentSection = 'overview';
  
    // Define sections to look for
    const sectionHeaders = {
      exercise: /^[-•*]?\s*Exercise\s*:/i,
      breakfast: /^[-•*]?\s*Breakfast\s*:/i,
      lunch: /^[-•*]?\s*Lunch\s*:/i,
      snack: /^[-•*]?\s*Snack\s*:/i,
      dinner: /^[-•*]?\s*Dinner\s*:/i,
      tracking: /^[-•*]?\s*Tracking\s*:/i,
    };
  
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
  
      // Check if line is a day header
      const dayMatch = days.find(
        (day) =>
          trimmedLine === day ||
          trimmedLine === `**${day}**` ||
          trimmedLine === `# ${day}` ||
          trimmedLine.match(new RegExp(`^${day}$`, 'i'))
      );
  
      if (dayMatch) {
        // Save the previous day plan if exists
        if (currentDay && currentPlan) {
          dailyPlans.push({
            day: currentDay,
            sections: currentPlan,
          });
        }
  
        // Start a new day
        currentDay = dayMatch;
        currentPlan = {
          overview: [],
          exercise: [],
          breakfast: [],
          lunch: [],
          snack: [],
          dinner: [],
          tracking: [],
        };
        currentSection = 'overview';
      } else if (currentDay && currentPlan) {
        // Check if line is a section header
        let sectionFound = false;
        for (const [section, pattern] of Object.entries(sectionHeaders)) {
          if (pattern.test(trimmedLine)) {
            currentSection = section;
            // Extract the content after the section header
            const content = trimmedLine.replace(pattern, '').trim();
            if (content) {
              currentPlan[currentSection].push(content);
            }
            sectionFound = true;
            break;
          }
        }
  
        // If no section header found, add to current section
        if (!sectionFound) {
          currentPlan[currentSection].push(trimmedLine);
        }
      }
    }
  
    // Don't forget to add the last day
    if (currentDay && currentPlan) {
      dailyPlans.push({
        day: currentDay,
        sections: currentPlan,
      });
    }
  
    // If no plans parsed, create default structure
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
          snack: ['Details not available'],
          dinner: ['Details not available'],
          tracking: ['Details not available'],
        },
      }));
    }
  
    return dailyPlans;
  };

const createPrompt = (userData, healthCondition = '') => {
  // Log the raw userData coming in
  console.log(
    'createPrompt received userData:',
    JSON.stringify(userData, null, 2)
  );

  // Default values for userData to prevent undefined errors
  const userDataDefaults = {
    goals: [],
    preferences: {
      diet: 'balanced',
      allergies: [],
      state: 'general South Indian',
    },
    weight: 70,
    height: { totalInches: 65 },
    dateOfBirth: { age: 30 },
    gender: 'male',
    workoutFrequency: 'moderate',
    budget: { amount: 5000 },
  };

  // Merge defaults with provided userData
  const safeUserData = {
    ...userDataDefaults,
    ...userData,
    preferences: {
      ...userDataDefaults.preferences,
      ...(userData?.preferences || {}),
    },
    height: {
      ...userDataDefaults.height,
      ...(userData?.height || {}),
    },
    dateOfBirth: {
      ...userDataDefaults.dateOfBirth,
      ...(userData?.dateOfBirth || {}),
    },
    budget: {
      ...userDataDefaults.budget,
      ...(userData?.budget || {}),
    },
  };

  // Log the processed safeUserData after defaults are applied
  console.log(
    'After applying defaults:',
    JSON.stringify(safeUserData, null, 2)
  );

  const goal =
    safeUserData.goals && safeUserData.goals.length > 0
      ? safeUserData.goals[0]?.title || 'health improvement'
      : 'health improvement';

  const targetWeight =
    safeUserData.goals &&
    safeUserData.goals.length > 0 &&
    safeUserData.goals[0]?.targetWeight
      ? safeUserData.goals[0]?.targetWeight
      : null;

  const weightGoalText = targetWeight
    ? `with a target weight of ${targetWeight}kg`
    : '';

  const diet = safeUserData.preferences?.diet || 'balanced';
  const allergies = safeUserData.preferences?.allergies?.join(',') || 'none';
  const state = safeUserData.preferences?.state || 'general South Indian';
  const currentWeight = safeUserData.weight || 70;

  const weightContext =
    currentWeight && targetWeight
      ? `Current weight: ${currentWeight}kg, target: ${targetWeight}kg. `
      : '';

  // Calculate BMR (Basal Metabolic Rate)
  let bmr = 0;
  if (safeUserData.gender === 'female') {
    bmr =
      655.1 +
      9.563 * currentWeight +
      1.85 * (safeUserData.height?.totalInches || 65) * 2.54 -
      4.676 * (safeUserData.dateOfBirth?.age || 30);
  } else {
    bmr =
      66.47 +
      13.75 * currentWeight +
      5.003 * (safeUserData.height?.totalInches || 65) * 2.54 -
      6.755 * (safeUserData.dateOfBirth?.age || 30);
  }

  // Activity factor based on workout frequency
  const activityFactors = {
    none: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    intense: 1.9,
  };

  const activityFactor = activityFactors[safeUserData.workoutFrequency] || 1.2;

  // Calculate TDEE (Total Daily Energy Expenditure)
  let tdee = bmr * activityFactor;
  let adjustedTdee = tdee;

  // After calculating adjustedTdee
  const updateUserCalories = async (userId, adjustedTdee) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        targetCalories: adjustedTdee,
      });
      console.log('Target calories updated successfully!');
    } catch (error) {
      console.error('Error updating target calories:', error);
    }
  };

  adjustedTdee = Math.round(adjustedTdee);
  // Update the user's targetCalories field

  console.log('Calculated TDEE:', tdee);
  console.log('Adjusted TDEE:', adjustedTdee);

  // Adjust TDEE based on goals
  if (safeUserData.goals && safeUserData.goals.length > 0) {
    console.log('Goal for TDEE adjustment:', safeUserData.goals[0].title);
    if (safeUserData.goals[0].title === 'Weight Gain') {
      adjustedTdee = tdee + 200;
    } else if (safeUserData.goals[0].title === 'Weight Loss') {
      adjustedTdee = tdee - 500;

      // Ensure minimum healthy calorie intake
      if (safeUserData.gender === 'male' && adjustedTdee < 1500) {
        adjustedTdee = 1500;
      } else if (safeUserData.gender === 'female' && adjustedTdee < 1200) {
        adjustedTdee = 1200;
      }
    }
  }

  // Round to nearest whole number for cleaner display
  adjustedTdee = Math.round(adjustedTdee);

  if (userData && userData.uid) {
    updateUserCalories(userData.uid, adjustedTdee);
  }

  console.log('Final adjusted TDEE:', adjustedTdee);

  // Add health condition to the prompt if provided
  const healthConditionText = healthCondition ? 
    `Health condition: ${healthCondition}. Please tailor recommendations to be appropriate for someone with this condition. ` : 
    '';

  const finalPrompt = `Suggest a meal-plan for ${goal} ${weightGoalText}. ${weightContext} Diet preference: ${diet} 
  with Indian food specific to ${state} region. Allergies: ${allergies}. 
  ${healthConditionText}
  Calorie intake target per day MUST be within 50 calories of ${adjustedTdee}. Ensure that the total calories from all meals and snacks add up to this target.
  Monthly budget: ${safeUserData.budget.amount} INR. 

DO NOT include ragi, jowar, quinoa, puttu or any foods that are not found/used much in metro cities, in any meal suggestions.

For each day (Monday-Sunday), structure as follows with EXACTLY these section headings:

Start with just the day name (e.g., "Monday")
Exercise: [brief workout plan that is appropriate for someone with ${healthCondition ? 'the mentioned health condition' : 'the user\'s profile'}]
Breakfast : [suggest additional food items to take along with breakfast, specifying how many calories (kcal) they provide at the end of the line]
Snack : [suggest food items to take as snacks, specifying how many calories (kcal) they provide at the end of the line]
Lunch : [suggest food items for lunch, specifying how many calories (kcal) they provide at the end of the line]
Dinner : [suggest additional food items to take along with dinner, specifying how many calories (kcal) they provide at the end of the line]
Tracking: [simple tip for monitoring progress]


Keep each section brief - 1-2 sentences maximum. Focus on actionable items. All suggestions should be familiar, common, and easy-to-eat ${state}-style South Indian cuisine options that locals regularly consume. Only include dishes and ingredients that are widely available and commonly prepared in households in the ${state} region, tailored to the user's diet and allergies.

The food items should be very common that every person in ${state} would recognize and know how to prepare or easily obtain. Ensure calorie intake aligns with ${adjustedTdee}, and all recommendations fit within the monthly budget (${safeUserData.budget.amount}), though no pricing information should be included in the output.

After the 7-day meal plan, include a "Weekly Summary" section that shows the total calories for each day and the average for the week, ensuring it aligns with the ${adjustedTdee} target.

Remember to adhere strictly to the specified diet preferences, allergies, and budget constraints while meeting the calorie target.`;

  console.log('Generated prompt:', finalPrompt);

  return finalPrompt;
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
  const [healthCondition, setHealthCondition] = useState('');

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
              console.log('Firebase user data:', JSON.stringify(userData));
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
    console.log('Generating plan with userData:', JSON.stringify(userData));

    if (!userData) {
      setErrorMessage('User data not available. Please try again later.');
      return;
    }

    if (!userData.goals || !userData.preferences) {
      setErrorMessage(
        'Your profile is incomplete. Please update your profile first.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    console.log('Starting plan generation with user data');

    try {
      const prompt = createPrompt(userData, healthCondition);

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
            ? userData.goals[0]?.title || 'health improvement'
            : 'health improvement',
        healthCondition: healthCondition || null,
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
      case 'snack':
        return <Coffee size={20} color="#22c55e" />;
      case 'dinner':
        return <Moon size={20} color="#22c55e" />;
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
      case 'snack':
        return 'Snacks';
      case 'dinner':
        return 'Dinner';
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

            <View style={styles.healthConditionContainer}>
              <Text style={styles.healthConditionLabel}>
                Do you have any health conditions? (Optional)
              </Text>
              <TextInput
                style={styles.healthConditionInput}
                placeholder="E.g., diabetes, hypertension, pregnancy"
                value={healthCondition}
                onChangeText={setHealthCondition}
                multiline={false}
              />
            </View>

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
  },
  errorBannerText: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  healthConditionContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',  // Center children horizontally
    justifyContent: 'center',
    maxWidth: 300,
    alignSelf: 'center',  // Center this container itself
  },
  healthConditionLabel: {
    fontSize: isMobile ? 14 : 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',  // Center the text
    width: '100%',
  },
  healthConditionInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#334155',
    width: '100%',  // Take full width of parent container
    height: 48,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    textAlign: 'center',  // Center the input text
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
