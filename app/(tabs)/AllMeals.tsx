import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Calendar } from 'react-native-calendars';

export default function AllMeals() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [meals, setMeals] = useState(null);
  const [day, setDay] = useState('Today');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedDates, setMarkedDates] = useState({});

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
      const userPlanData = userPlanDoc.data();

      // Parse the full plan
      const parsedPlan = JSON.parse(userPlanData.parsedPlan);
      
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
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch</Text>
          {meals.lunch.map((meal, index) => (
            <View key={`lunch-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dinner</Text>
          {meals.dinner.map((meal, index) => (
            <View key={`dinner-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snacks</Text>
          {meals.snack.map((meal, index) => (
            <View key={`snack-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
});