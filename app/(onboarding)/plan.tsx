import React, { useState, useEffect } from 'react';
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
} from 'react-native';
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
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../components/firebase/Firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

// Same API configuration
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Enhanced parsing function (unchanged)
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

  // Split by lines and process
  const lines = planText.split('\n');

  let currentDay = null;
  let currentPlan = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check if this line starts a new day - look for exact day names at the start of line
    const dayMatch = days.find(
      (day) =>
        trimmedLine.startsWith(day) ||
        trimmedLine.startsWith(`**${day}**`) ||
        trimmedLine.startsWith(`# ${day}`)
    );

    if (dayMatch) {
      // If we already have a day, save it before starting new one
      if (currentDay && currentPlan) {
        dailyPlans.push({
          day: currentDay,
          sections: currentPlan,
        });
      }

      // Start new day
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
    }
    // Determine what section this line belongs to
    else if (currentDay && currentPlan) {
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
        // If we can't determine the section, add to overview
        currentPlan.overview.push(trimmedLine);
      }
    }
  }

  // Add the last day if exists
  if (currentDay && currentPlan) {
    dailyPlans.push({
      day: currentDay,
      sections: currentPlan,
    });
  }

  // If parsing failed, create a fallback with some structure
  if (dailyPlans.length === 0) {
    const weekdayIndex = new Date().getDay();
    const startDayIndex = weekdayIndex === 0 ? 6 : weekdayIndex - 1; // Convert to 0=Monday format

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

// Modified prompt (unchanged)
// Modified prompt to use the new database structure
const createPrompt = (userData) => {
  const goal = userData.goals && userData.goals.length > 0
    ? userData.goals[0]?.title
    : 'health improvement';
  
  const targetWeight = userData.goals && userData.goals.length > 0 && userData.goals[0]?.targetWeight
    ? userData.goals[0]?.targetWeight
    : null;
  
  const weightGoalText = targetWeight 
    ? `with a target weight of ${targetWeight}kg` 
    : '';
  
  const diet = userData.preferences?.diet || 'balanced';
  const allergies = userData.preferences?.allergies?.join(',') || 'none';
  const state = userData.preferences?.state || 'general South Indian';
  const currentWeight = userData.weight || null;
  
  const weightContext = currentWeight && targetWeight
    ? `Current weight: ${currentWeight}kg, target: ${targetWeight}kg. `
    : '';

  return `Create a 7-day wellness plan for ${goal} ${weightGoalText}. ${weightContext}Diet preference: ${diet} with Indian food specific to ${state} region. Allergies: ${allergies}.

For each day (Monday-Sunday), structure as follows with EXACTLY these section headings:
- Start with just the day name (e.g., "Monday")
- Exercise: [brief workout plan]
- Breakfast: [${state}-style South Indian meal suggestion]
- Lunch: [${state}-style South Indian meal suggestion]
- Dinner: [${state}-style South Indian meal suggestion]
- Snack: [1-2 healthy ${state}-style South Indian options]
- Tracking: [simple tip for monitoring progress]

Keep each section brief - 1-2 sentences maximum. Focus on actionable items. All meals should be authentic ${state}-style South Indian cuisine options that are commonly prepared in that region.`;
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

  // User data fetching useEffect (unchanged)
  useEffect(() => {
    const fetchUserData = async () => {
      if (propUserData) {
        setUserData(propUserData);
        return;
      }

      setLoadingUserData(true);
      try {
        // Get the current user
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

  // Process plan when rawPlan changes (unchanged)
  useEffect(() => {
    if (rawPlan) {
      try {
        console.log('Parsing raw plan...');
        const parsedDays = parseDailyPlan(rawPlan);
        console.log(`Parsed ${parsedDays.length} days from the plan`);
        setDailyPlans(parsedDays);

        // Set the selected day to today (if available)
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        const todayIndex = today === 0 ? 6 : today - 1; // Convert to 0 = Monday format
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

  // Generate plan function (unchanged)
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
        } catch (e) {
          // Not JSON, use the text response... }

          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          } else {
            throw new Error(
              `API responded with status: ${response.status} - ${errorDetails}`
            );
          }
        }
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const generatedText = data.candidates[0].content.parts[0].text;
        console.log(
          'Successfully generated plan, first 100 chars:',
          generatedText.substring(0, 100)
        );

        // Store the raw plan
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

  // Save plan to Firebase function (unchanged)
  const savePlanToFirebase = async () => {
    if (!rawPlan || !userData?.uid) {
      setErrorMessage('No plan to save or user not authenticated.');
      return;
    }

    setSavingPlan(true);
    try {
      // Create a new document in the userplans collection
      const userPlanRef = collection(db, 'userplans');
      await addDoc(userPlanRef, {
        userId: userData.uid,
        plan: rawPlan,
        parsedPlan: JSON.stringify(dailyPlans), // Store the parsed plan as well
        createdAt: new Date().toISOString(),
        goal:
          userData.goals && userData.goals.length > 0
            ? userData.goals[0]?.title
            : 'health improvement',
      });

      Alert.alert('Success', 'Your plan has been saved successfully!');
    } catch (error) {
      console.error('Error saving plan to Firebase:', error);
      setErrorMessage('Failed to save your plan. Please try again.');
    } finally {
      setSavingPlan(false);
    }
  };

  // Regenerate plan (unchanged)
  const handleRegenerate = () => {
    setRawPlan(null);
    setDailyPlans([]);
    setErrorMessage(null);
    generatePlan();
  };

  // Helper function to get the right icon for each section (updated with better icons)
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

  // Helper function to get a nice title for each section (unchanged)
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

  // Render error message (redesigned)
  const renderError = () => {
    if (!errorMessage) return null;

    return (
      <View style={styles.errorBanner}>
        <AlertCircle size={20} color="#fff" />
        <Text style={styles.errorBannerText}>{errorMessage}</Text>
      </View>
    );
  };

  if (loadingUserData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <AlertCircle size={48} color="#fff" />
          </View>
          <Text style={styles.errorTitle}>Unable to load profile</Text>
          <Text style={styles.errorText}>
            We couldn't retrieve your information at this time.
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              // Implement retry
              window.location.reload();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render day picker tabs (redesigned with pill-shaped tabs)
  const renderDayTabs = () => {
    if (!dailyPlans || dailyPlans.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabsContainer} // Use style instead of contentContainerStyle
      >
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
              {day.day}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  const renderDayPlan = () => {
    if (!dailyPlans || dailyPlans.length === 0) {
      return (
        <View style={styles.noPlanContainer}>
          <View style={styles.noPlanIconContainer}>
            <Calendar size={56} color="#22c55e" />
          </View>
          <Text style={styles.noPlanTitle}>Wellness Plan Awaits</Text>
          <Text style={styles.noPlanText}>
            Personalize your journey by generating a plan tailored to you!
          </Text>
          <Pressable
            style={styles.generateButton}
            onPress={generatePlan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Create My Plan</Text>
            )}
          </Pressable>
        </View>
      );
    }

    const selectedDay = dailyPlans[selectedDayIndex];

    if (!selectedDay) {
      return (
        <View style={styles.noPlanContainer}>
          <Text style={styles.noPlanText}>
            Plan not available for this day.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.dayPlanContainer}
        contentContainerStyle={styles.dayPlanContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(selectedDay.sections).map(
          ([sectionKey, sectionItems], index) => {
            if (
              !sectionItems ||
              sectionItems.length === 0 ||
              (sectionKey === 'overview' && sectionItems.length <= 1)
            ) {
              return null;
            }

            return (
              <View key={index} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  {getSectionIcon(sectionKey)}
                  <Text style={styles.sectionTitle}>
                    {getSectionTitle(sectionKey)}
                  </Text>
                </View>
                {sectionItems.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.sectionItemWrapper}>
                    <Text style={styles.sectionItem}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          }
        )}

        <View style={styles.actionButtonsContainer}>
          <Pressable
            style={[styles.actionButton, styles.regenerateButton]}
            onPress={handleRegenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Regenerate</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.saveButton]}
            onPress={async () => {
              await savePlanToFirebase();
              router.replace('/(tabs)');
            }}
            disabled={savingPlan || loading || !rawPlan}
          >
            {savingPlan ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Save Plan</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/allergies')}
          >
            <ChevronLeft size={24} color="#22c55e" />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Your Wellness Plan</Text>
            {userData?.goals && userData.goals.length > 0 && (
              <Text style={styles.subTitle}>
                For {userData.goals[0]?.title || 'health improvement'}
              </Text>
            )}
          </View>

          {dailyPlans && dailyPlans.length > 0 && (
            <Pressable
              style={styles.headerButton}
              onPress={handleRegenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <RefreshCw size={22} color="#22c55e" />
              )}
            </Pressable>
          )}
        </View>

        {renderError()}
        {renderDayTabs()}
        {renderDayPlan()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fff4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    letterSpacing: 0.3,
  },
  subTitle: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fff4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  errorBannerText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f7f9fc',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 24,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dayTabsContainer: {
    height: 50,
    flexGrow: 0,
    flexShrink: 1,
  },
  dayTabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  dayTabText: {
    fontSize: 16,
    color: '#666',
  },
  activeDayTab: {
    backgroundColor: '#22c55e',
  },
  activeDayTabText: {
    color: '#fff',
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPlanIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fff4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noPlanTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noPlanText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  generateButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  dayPlanContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  dayPlanContentContainer: {
    paddingBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  sectionItemWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionItem: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  regenerateButton: {
    backgroundColor: '#3b82f6',
  },
  saveButton: {
    backgroundColor: '#22c55e',
  },
});

export default PlanScreen;
