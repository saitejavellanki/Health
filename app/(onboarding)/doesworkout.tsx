import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Update this path to point to your firebase config file

export default function WorkoutFrequency() {
  const [selectedFrequency, setSelectedFrequency] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const workoutOptions = [
    {
      id: 'none',
      title: 'No workout',
      description: 'Currently not exercising regularly',
    },
    {
      id: 'light',
      title: 'Light (1-2 times/week)',
      description: 'Occasional light exercise or walking',
    },
    {
      id: 'moderate',
      title: 'Moderate (3-4 times/week)',
      description: 'Regular moderate intensity workouts',
    },
    {
      id: 'active',
      title: 'Active (4+ times/week)',
      description: 'Frequent high-intensity workouts',
    },
    {
      id: 'intense',
      title: 'Intense (Daily workouts)',
      description: 'Daily intense training sessions',
    },
  ];

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          'Error',
          'You must be logged in to save your workout frequency.'
        );
        return;
      }

      const doesWorkout = selectedFrequency !== 'none';
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        workoutFrequency: selectedFrequency,
        doesWorkout: doesWorkout,
        updatedAt: new Date(),
      });

      console.log(
        `Workout frequency saved: ${selectedFrequency}, Does workout: ${doesWorkout}`
      );
      router.push('/preferences');
    } catch (error) {
      console.error('Error saving workout frequency:', error);
      Alert.alert(
        'Error',
        'Failed to save your workout frequency. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dob');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="#1a1a1a" />
          </Pressable>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>How much workout do you do?</Text>

          <View style={styles.optionsContainer}>
            {workoutOptions.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.optionCard,
                  selectedFrequency === option.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedFrequency(option.id)}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.checkCircle,
                      selectedFrequency === option.id && styles.checkedCircle,
                    ]}
                  >
                    {selectedFrequency === option.id && (
                      <View style={styles.innerCircle} />
                    )}
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    {option.description && (
                      <Text style={styles.optionDescription}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.button,
              !selectedFrequency && styles.buttonDisabled,
              isLoading && styles.buttonLoading,
            ]}
            disabled={!selectedFrequency || isLoading}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
            {!isLoading && <ArrowRight size={20} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  headerContainer: { width: '100%', height: 50, zIndex: 10 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: 24,
    marginLeft: 10,
  },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: { width: '100%', maxWidth: 400 },
  optionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  selectedCard: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  optionContent: { flexDirection: 'row', alignItems: 'center' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCircle: { borderColor: '#22c55e' },
  innerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  optionDescription: { fontSize: 14, color: '#64748b', marginTop: 4 },
  footer: { paddingVertical: 20, alignItems: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 8,
    width: '90%',
  },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  buttonLoading: { backgroundColor: '#84cc16' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
