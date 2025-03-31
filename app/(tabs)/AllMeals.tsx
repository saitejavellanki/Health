import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { ArrowLeft, Calendar as CalendarIcon, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Calendar } from 'react-native-calendars';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default function AllMeals() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [meals, setMeals] = useState(null);
  const [day, setDay] = useState('Today');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedDates, setMarkedDates] = useState({});
  const [userPlanDocId, setUserPlanDocId] = useState(null);
  const [parsedFullPlan, setParsedFullPlan] = useState(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [replacingMeal, setReplacingMeal] = useState(null);
  const [replacingMealType, setReplacingMealType] = useState(null);
  const [replacingMealIndex, setReplacingMealIndex] = useState(null);
  const [userPreferences, setUserPreferences] = useState('');
  const [generatingMeal, setGeneratingMeal] = useState(false);

  // Format date for calendar
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch meal data when component mounts or date changes
  useEffect(() => {
    fetchMealData();
  }, [selectedDate]);

  const fetchMealData = async () => {
    try {
      setIsLoading(true);
      
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error('No user is logged in');
        setIsLoading(false);
        return;
      }

      // Get the day of the week for the selected date
      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const dayName = days[selectedDate.getDay()];
      
      // Format the date for display
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      const formattedDate = selectedDate.toLocaleDateString('en-US', options);
      setDay(formattedDate);

      // Fetch user's meal plan from Firestore
      const db = getFirestore();
      const userPlansRef = collection(db, 'userplans');
      const q = query(userPlansRef, where('userId', '==', currentUser.uid));
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error('No user plan found for this user');
        setIsLoading(false);
        return;
      }

      const userPlanDoc = querySnapshot.docs[0];
      setUserPlanDocId(userPlanDoc.id);
      const userPlanData = userPlanDoc.data();

      // Parse the full plan
      const parsedPlan = JSON.parse(userPlanData.parsedPlan);
      setParsedFullPlan(parsedPlan);
      
      // Find the plan for the selected day of the week
      const dayPlan = parsedPlan.find((plan) => plan.day === dayName);
      
      if (!dayPlan || !dayPlan.sections) {
        console.error(`No plan found for ${dayName}`);
        setIsLoading(false);
        return;
      }

      // Set the meal data
      setMeals(dayPlan.sections);

      // Mark the selected date in the calendar
      const formattedSelectedDate = formatDate(selectedDate);
      setMarkedDates({
        [formattedSelectedDate]: {
          selected: true,
          selectedColor: '#22c55e',
        },
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch meal data:', error);
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    const selectedDate = new Date(date.dateString);
    setSelectedDate(selectedDate);
    setShowCalendar(false);
  };

  const handleReplaceMeal = (mealType, meal, index) => {
    setReplacingMeal(meal);
    setReplacingMealType(mealType);
    setReplacingMealIndex(index);
    setModalVisible(true);
  };

  const generateNewMeal = async () => {
    try {
      setGeneratingMeal(true);
      
      // Construct the prompt for Gemini
      const prompt = `I need a replacement for this ${replacingMealType} meal: "${replacingMeal}".
      Additional preferences: ${userPreferences || "Make it healthy and nutritious"}.
      Please provide only the name of the meal as a single sentence, no additional commentary or explanation.`;
      
      // Call Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          }
        }),
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const newMeal = data.candidates[0].content.parts[0].text.trim();
        updateMealInPlan(newMeal);
      } else {
        throw new Error('Failed to generate a new meal suggestion');
      }
    } catch (error) {
      console.error('Error generating meal with AI:', error);
      Alert.alert('Error', 'Failed to generate a new meal. Please try again.');
      setGeneratingMeal(false);
    }
  };

  const updateMealInPlan = async (newMeal) => {
    try {
      // Get the day of the week for the selected date
      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const dayName = days[selectedDate.getDay()];
      
      // Find the day in the full plan and update the specific meal
      const updatedPlan = [...parsedFullPlan];
      const dayIndex = updatedPlan.findIndex(plan => plan.day === dayName);
      
      if (dayIndex !== -1) {
        // Update the specific meal in the day's plan
        updatedPlan[dayIndex].sections[replacingMealType][replacingMealIndex] = newMeal;
        
        // Update local state
        setMeals({...meals, [replacingMealType]: [...meals[replacingMealType].map((meal, idx) => 
          idx === replacingMealIndex ? newMeal : meal
        )]});
        
        // Update the document in Firestore
        const db = getFirestore();
        const userPlanRef = doc(db, 'userplans', userPlanDocId);
        
        await updateDoc(userPlanRef, {
          parsedPlan: JSON.stringify(updatedPlan)
        });
        
        // Close modal and reset states
        setModalVisible(false);
        setGeneratingMeal(false);
        setUserPreferences('');
        
        Alert.alert('Success', 'Your meal has been updated successfully!');
      } else {
        throw new Error('Day not found in plan');
      }
    } catch (error) {
      console.error('Error updating meal in plan:', error);
      Alert.alert('Error', 'Failed to update your meal plan. Please try again.');
      setGeneratingMeal(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  if (!meals) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>No meal data available</Text>
        </View>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            We couldn't find your meal plan. Please make sure you have created a meal plan first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Plan</Text>
      </View>

      <View style={styles.dateSelector}>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{day}</Text>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <CalendarIcon size={20} color="#22c55e" />
          </TouchableOpacity>
        </View>
        
        {showCalendar && (
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={markedDates}
              theme={{
                todayTextColor: '#22c55e',
                selectedDayBackgroundColor: '#22c55e',
                arrowColor: '#22c55e',
              }}
            />
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breakfast</Text>
          {meals.breakfast.map((meal, index) => (
            <View key={`breakfast-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <TouchableOpacity
                style={styles.replaceMealButton}
                onPress={() => handleReplaceMeal('breakfast', meal, index)}
              >
                <RefreshCw size={16} color="#22c55e" />
                <Text style={styles.replaceMealButtonText}>Replace</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch</Text>
          {meals.lunch.map((meal, index) => (
            <View key={`lunch-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <TouchableOpacity
                style={styles.replaceMealButton}
                onPress={() => handleReplaceMeal('lunch', meal, index)}
              >
                <RefreshCw size={16} color="#22c55e" />
                <Text style={styles.replaceMealButtonText}>Replace</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dinner</Text>
          {meals.dinner.map((meal, index) => (
            <View key={`dinner-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <TouchableOpacity
                style={styles.replaceMealButton}
                onPress={() => handleReplaceMeal('dinner', meal, index)}
              >
                <RefreshCw size={16} color="#22c55e" />
                <Text style={styles.replaceMealButtonText}>Replace</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snacks</Text>
          {meals.snack.map((meal, index) => (
            <View key={`snack-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <TouchableOpacity
                style={styles.replaceMealButton}
                onPress={() => handleReplaceMeal('snack', meal, index)}
              >
                <RefreshCw size={16} color="#22c55e" />
                <Text style={styles.replaceMealButtonText}>Replace</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal for replacing meals */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Replace {replacingMealType}</Text>
            <Text style={styles.modalSubtitle}>Current meal: {replacingMeal}</Text>
            
            <Text style={styles.inputLabel}>Any preferences? (optional)</Text>
            <TextInput
              style={styles.preferenceInput}
              placeholder="e.g. vegetarian, gluten-free, higher protein..."
              value={userPreferences}
              onChangeText={setUserPreferences}
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setUserPreferences('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.generateButton, generatingMeal && styles.disabledButton]}
                onPress={generateNewMeal}
                disabled={generatingMeal}
              >
                {generatingMeal ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.generateButtonText}>Generate New Meal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4b5563',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
    marginLeft: 16,
  },
  dateSelector: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#15803d',
  },
  calendarButton: {
    padding: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
  },
  calendarContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mealName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  replaceMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  replaceMealButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#16a34a',
    marginLeft: 6,
  },
  emptyStateContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  preferenceInput: {
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#4b5563',
  },
  generateButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    flex: 2,
    alignItems: 'center',
  },
  generateButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#86efac',
  },
});