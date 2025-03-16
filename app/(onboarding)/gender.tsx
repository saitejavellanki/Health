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
import { auth, db } from '../../components/firebase/Firebase';

export default function Gender() {
  const [selectedGender, setSelectedGender] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to save your gender.');
        return;
      }

      // Update the user document in the users collection
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        gender: selectedGender,
        updatedAt: new Date(),
      });

      console.log(`Gender saved: ${selectedGender}`);

      // Navigate to the next screen
      router.push('/dob');
    } catch (error) {
      console.error('Error saving gender:', error);
      Alert.alert('Error', 'Failed to save your gender. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push('/weight')}
          >
            <ChevronLeft size={24} color="#000" />
          </Pressable>
          <Text style={styles.stepCounter}>Step 3/8</Text>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>What's your gender?</Text>

          <View style={styles.optionsContainer}>
            <View style={styles.rowContainer}>
              <Pressable
                style={[
                  styles.option,
                  selectedGender === 'male' && styles.optionSelected,
                ]}
                onPress={() => setSelectedGender('male')}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGender === 'male' && styles.optionTextSelected,
                  ]}
                >
                  {'🚹  Male'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.option,
                  selectedGender === 'female' && styles.optionSelected,
                ]}
                onPress={() => setSelectedGender('female')}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGender === 'female' && styles.optionTextSelected,
                  ]}
                >
                  {'🚺  Female'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.option,
                styles.preferNotSayOption,
                selectedGender === 'prefer_not_say' && styles.optionSelected,
              ]}
              onPress={() => setSelectedGender('prefer_not_say')}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedGender === 'prefer_not_say' &&
                    styles.optionTextSelected,
                ]}
              >
                Prefer Not to Say
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.button,
              !selectedGender && styles.buttonDisabled,
              isLoading && styles.buttonLoading,
            ]}
            disabled={!selectedGender || isLoading}
            onPress={handleContinue}
          >
            <Text
              style={[
                styles.buttonText,
                !selectedGender && styles.buttonTextDisabled,
              ]}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
            {!isLoading && (
              <ArrowRight
                size={20}
                color={selectedGender ? '#fff' : '#94a3b8'}
              />
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCounter: {
    fontFamily: 'Inter-Bold',
    fontSize: 25,
    color: '#64748b',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    width: '45%',
    marginHorizontal: 7,
  },
  preferNotSayOption: {
    width: '90%',
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  optionText: {
    fontSize: 18,
    color: '#999999',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#22c55e',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  buttonLoading: {
    backgroundColor: '#84cc16',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
});