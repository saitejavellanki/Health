import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function AllMeals() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse the JSON string back into an object
  const meals = params.meals ? JSON.parse(params.meals.toString()) : null;
  const day = params.day?.toString() || 'Today';
  
  // Calculate meal calories - in a real app, these would come from your database
  const mealCalories = {
    breakfast: 450,
    lunch: 650,
    dinner: 550,
    snack: 200
  };

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
        <Text style={styles.headerTitle}>All Meals for {day}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breakfast</Text>
          {meals.breakfast.map((meal, index) => (
            <View key={`breakfast-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <Text style={styles.calories}>{mealCalories.breakfast} calories</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch</Text>
          {meals.lunch.map((meal, index) => (
            <View key={`lunch-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <Text style={styles.calories}>{mealCalories.lunch} calories</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dinner</Text>
          {meals.dinner.map((meal, index) => (
            <View key={`dinner-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <Text style={styles.calories}>{mealCalories.dinner} calories</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snacks</Text>
          {meals.snack.map((meal, index) => (
            <View key={`snack-${index}`} style={styles.mealCard}>
              <Text style={styles.mealName}>{meal}</Text>
              <Text style={styles.calories}>{mealCalories.snack} calories</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.totalSection}>
          <Text style={styles.totalTitle}>Total Daily Calories</Text>
          <Text style={styles.totalCalories}>
            {mealCalories.breakfast + mealCalories.lunch + mealCalories.dinner + mealCalories.snack} calories
          </Text>
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
  totalSection: {
    padding: 24,
    backgroundColor: '#f0fdf4',
    margin: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  totalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#15803d',
    marginBottom: 8,
  },
  totalCalories: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#22c55e',
  },
});