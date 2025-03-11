import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
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

  const handleContinue = async () => {
    if (!selected) return;

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

      // Update the user's goals in Firestore
      // Using arrayUnion to add the goal to the goals array
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        goals: arrayUnion({
          id: selectedGoal.id,
          title: selectedGoal.title,
          createdAt: new Date(),
        }),
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/preferences')}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.title}>What's your primary goal?</Text>
        <Text style={styles.subtitle}>
          We'll customize your meal plans to help you achieve your fitness goals
        </Text>
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
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
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
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
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
});
