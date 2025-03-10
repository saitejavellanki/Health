import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Check } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed

const ALLERGIES = [
  { id: 'dairy', label: 'Dairy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'fish', label: 'Fish' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'tree-nuts', label: 'Tree Nuts' },
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'soy', label: 'Soy' },
  { id: 'none', label: 'No Allergies' },
];

export default function Allergies() {
  const [selected, setSelected] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const toggleAllergy = (id) => {
    const newSelected = new Set(selected);
    if (id === 'none') {
      setSelected(new Set(['none']));
    } else {
      newSelected.delete('none');
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelected(newSelected);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save allergies');
        return;
      }
      
      // Convert Set to Array for storage
      const allergiesArray = Array.from(selected);
      
      // Update user document with allergies and mark as onboarded
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        'preferences.allergies': allergiesArray,
        onboarded: true // Mark user as completed onboarding
      });
      
      // Navigate to the plan page instead of tabs
      router.replace('/plan');
    } catch (error) {
      console.error('Error saving allergies:', error);
      Alert.alert('Error', 'Failed to save your allergies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Any food allergies?</Text>
        <Text style={styles.subtitle}>
          Select all that apply. This helps us ensure your meal plans are safe for you.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {ALLERGIES.map((allergy) => (
          <Pressable
            key={allergy.id}
            style={[
              styles.option,
              selected.has(allergy.id) && styles.optionSelected,
            ]}
            onPress={() => toggleAllergy(allergy.id)}>
            <Text style={[
              styles.optionText,
              selected.has(allergy.id) && styles.optionTextSelected
            ]}>
              {allergy.label}
            </Text>
            {selected.has(allergy.id) && (
              <Check size={24} color="#22c55e" />
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonLoading]}
          disabled={isLoading}
          onPress={handleComplete}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Saving...' : 'Complete Setup'}
          </Text>
          {!isLoading && <ArrowRight size={20} color="#fff" />}
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
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
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
    padding: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  optionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  optionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    color: '#1a1a1a',
  },
  optionTextSelected: {
    color: '#15803d',
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
  buttonLoading: {
    backgroundColor: '#84cc16',
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
});