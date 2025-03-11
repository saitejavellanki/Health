import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed

const ALLERGIES = [
  { id: 'none', label: 'No Allergies', icon: '😋' },
  { id: 'dairy', label: 'Dairy', icon: '🥛' },
  { id: 'eggs', label: 'Eggs', icon: '🥚' },
  { id: 'fish', label: 'Fish', icon: '🐟' },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { id: 'tree-nuts', label: 'Tree Nuts', icon: '🌰' },
  { id: 'peanuts', label: 'Peanuts', icon: '🥜' },
  { id: 'wheat', label: 'Wheat', icon: '🌾' },
  { id: 'soy', label: 'Soy', icon: '🫘' },
  { id: 'sesame', label: 'Sesame', icon: '🌱' },
  { id: 'corn', label: 'Corn', icon: '🌽' },
  { id: 'nightshades', label: 'Nightshades', icon: '🍅' },
  { id: 'sulfites', label: 'Sulfites', icon: '🍇' },
];

const { width } = Dimensions.get('window');
const itemWidth = (width - 72) / 2; // 2 items per row with padding

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
        onboarded: true, // Mark user as completed onboarding
      });

      // Navigate to the plan page instead of tabs
      router.replace('/budget');
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
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/goals')}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.title}>Any food allergies?</Text>
        <Text style={styles.subtitle}>
          Select all that apply. This helps us ensure your meal plans are safe
          for you.
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {ALLERGIES.map((allergy) => (
            <Pressable
              key={allergy.id}
              style={[
                styles.gridItem,
                selected.has(allergy.id) && styles.gridItemSelected,
                allergy.id === 'none' && styles.fullWidthItem,
              ]}
              onPress={() => toggleAllergy(allergy.id)}
            >
              <View style={styles.allergyContent}>
                <Text style={styles.allergyIcon}>{allergy.icon}</Text>
                <Text
                  style={[
                    styles.allergyText,
                    selected.has(allergy.id) && styles.allergyTextSelected,
                  ]}
                >
                  {allergy.label}
                </Text>
              </View>
              {selected.has(allergy.id) && (
                <View style={styles.checkContainer}>
                  <Check size={16} color="#fff" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonLoading]}
          disabled={isLoading}
          onPress={handleComplete}
        >
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
    paddingTop: 60,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#999999',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: itemWidth,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 16,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthItem: {
    width: '100%',
    backgroundColor: '#f8fafc',
  },
  gridItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  allergyContent: {
    alignItems: 'center',
  },
  allergyIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  allergyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  allergyTextSelected: {
    color: '#15803d',
  },
  checkContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
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
