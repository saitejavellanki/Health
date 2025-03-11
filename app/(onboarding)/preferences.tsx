import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed

const DIETARY_PREFERENCES = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'non-vegetarian', label: 'Non-Vegetarian' },
  { id: 'keto', label: 'Ketogenic' },
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
        'preferences.diet': selected,
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
    <SafeAreaView style={styles.container}>
      <View style={styles.backButtonContainer}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/doesworkout')}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>What's your dietary preference?</Text>
        </View>

        <View style={styles.optionsContainer}>
          {DIETARY_PREFERENCES.map((preference) => (
            <Pressable
              key={preference.id}
              style={[
                styles.option,
                selected === preference.id && styles.optionSelected,
              ]}
              onPress={() => setSelected(preference.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selected === preference.id && styles.optionTextSelected,
                ]}
              >
                {preference.label}
              </Text>
              {selected === preference.id && (
                <Check size={24} color="#22c55e" />
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.subtitleContainer}>
          <Text style={[styles.subtitle, { fontStyle: 'italic' }]}>
            *This helps us customize your meal plans and recommendations
          </Text>
        </View>
      </View>

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
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginTop:25,
    marginLeft:10,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  titleContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 40,
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
    width: '100%',
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
  subtitleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#999999',
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    // padding: 24,
    // borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems:'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width:'80%',
    marginBottom:12,
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
