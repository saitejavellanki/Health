import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  TextInput,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed

const GOALS = [
  {
    id: 'weight-loss',
    title: 'Weight Loss',
    description:
      'Healthy and sustainable weight loss through balanced nutrition',
    image:
      'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=800&auto=format&fit=crop',
    requiresTarget: true,
  },
  {
    id: 'weight-gain',
    title: 'Weight Gain',
    description: 'Healthy weight gain with nutrient-dense meal plans',
    image:
      'https://images.unsplash.com/photo-1507120878965-54b2d3939100?q=80&w=800&auto=format&fit=crop',
    requiresTarget: true,
  },
  {
    id: 'muscle-gain',
    title: 'Muscle Gain',
    description: 'Build lean muscle mass with protein-rich meal plans',
    image:
      'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'maintenance',
    title: 'Maintain Shape',
    description: 'Keep your current weight while improving overall nutrition',
    image:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'performance',
    title: 'Athletic Performance',
    description: 'Optimize your nutrition for better athletic performance',
    image:
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
  },
];

export default function FitnessGoals() {
  const [selected, setSelected] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [progressAnimation] = useState(new Animated.Value(0));

  const totalSteps = 9;
  const currentStep = 7; // Adjust based on your app flow

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: currentStep / totalSteps,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handleContinue = async () => {
    if (!selected) return;

    // Check if the selected goal requires a target weight
    const selectedGoal = GOALS.find((goal) => goal.id === selected);

    if (selectedGoal?.requiresTarget && !targetWeight) {
      setShowTargetModal(true);
      return;
    }

    saveGoal();
  };

  const saveGoal = async () => {
    try {
      setIsLoading(true);

      // Get current user
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'You must be logged in to save goals');
        return;
      }

      // Find the complete goal object that was selected
      const selectedGoal = GOALS.find((goal) => goal.id === selected);

      if (!selectedGoal) {
        throw new Error('Selected goal not found');
      }

      // Create the goal object with optional target weight
      const goalToSave = {
        id: selectedGoal.id,
        title: selectedGoal.title,
        createdAt: new Date(),
      };

      // Add targetWeight if it exists
      if (targetWeight) {
        goalToSave.targetWeight = parseFloat(targetWeight);
      }

      // Update the user's goals in Firestore
      // Using arrayUnion to add the goal to the goals array
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        goals: arrayUnion(goalToSave),
      });

      // Navigate to the next screen
      router.push('/allergies');
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save your goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTargetWeightSubmit = () => {
    if (!targetWeight || isNaN(parseFloat(targetWeight))) {
      Alert.alert('Error', 'Please enter a valid target weight');
      return;
    }

    setShowTargetModal(false);
    saveGoal();
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showTargetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTargetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selected === 'weight-loss'
                ? 'Target Weight (kg)'
                : 'Goal Weight (kg)'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selected === 'weight-loss'
                ? 'What weight would you like to achieve?'
                : 'What weight would you like to gain to?'}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="Enter weight in kg"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowTargetModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSubmitButton}
                onPress={handleTargetWeightSubmit}
              >
                <Text style={styles.modalSubmitText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/preferences')}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <View style={styles.progressParent}>
          <View style={styles.stepProgressContainer}>
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[styles.progressBar, { width: progressWidth }]}
              />
            </View>
            <Text style={styles.stepText}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>
        </View>
        <View>
          <Text style={styles.title}>What's your primary goal?</Text>
          <Text style={styles.subtitle}>
            We'll customize your meal plans to help you achieve your fitness
            goals
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {GOALS.map((goal) => (
          <Pressable
            key={goal.id}
            style={[styles.card, selected === goal.id && styles.cardSelected]}
            onPress={() => setSelected(goal.id)}
          >
            {/* <View style={styles.imageContainer}>
              <Image source={{ uri: goal.image }} style={styles.image} />
            </View> */}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{goal.title}</Text>
              <Text style={styles.cardDescription}>{goal.description}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button,
            !selected && styles.buttonDisabled,
            isLoading && styles.buttonLoading,
          ]}
          disabled={!selected || isLoading}
          onPress={handleContinue}
        >
          <Text
            style={[styles.buttonText, !selected && styles.buttonTextDisabled]}
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
          {!isLoading && (
            <ArrowRight size={20} color={selected ? '#fff' : '#94a3b8'} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 28,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    marginBottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  stepProgressContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '80%',
  },
  progressParent: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  stepText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign:"center",
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign:"center",
  },
  content: {
    flex: 1,
    padding: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    padding: 10,
  },
  cardSelected: {
    borderColor: '#22c55e',
  },
  imageContainer: {
    width: '100%',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '90%',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  buttonLoading: {
    backgroundColor: '#84cc16',
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  modalSubmitButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});
