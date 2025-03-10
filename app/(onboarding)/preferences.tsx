import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Check } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed

const DIETARY_PREFERENCES = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'keto', label: 'Ketogenic' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'none', label: 'No Specific Diet' },
];

export default function DietaryPreferences() {
  const [selected, setSelected] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    
    try {
      setIsLoading(true);
      
      // Get current user
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save preferences');
        return;
      }
      
      // Update the user's preferences in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        'preferences.diet': selected
      });
      
      // Navigate to the next screen
      router.push('/goals');
    } catch (error) {
      console.error('Error saving preference:', error);
      Alert.alert('Error', 'Failed to save your preference. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What's your dietary preference?</Text>
        <Text style={styles.subtitle}>
          This helps us customize your meal plans and recommendations
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {DIETARY_PREFERENCES.map((preference) => (
          <Pressable
            key={preference.id}
            style={[
              styles.option,
              selected === preference.id && styles.optionSelected,
            ]}
            onPress={() => setSelected(preference.id)}>
            <Text style={[
              styles.optionText,
              selected === preference.id && styles.optionTextSelected
            ]}>
              {preference.label}
            </Text>
            {selected === preference.id && (
              <Check size={24} color="#22c55e" />
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button, 
            !selected && styles.buttonDisabled,
            isLoading && styles.buttonLoading
          ]}
          disabled={!selected || isLoading}
          onPress={handleContinue}>
          <Text 
            style={[
              styles.buttonText, 
              !selected && styles.buttonTextDisabled
            ]}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
          {!isLoading && <ArrowRight size={20} color={selected ? '#fff' : '#94a3b8'} />}
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