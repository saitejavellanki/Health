import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase';

export default function Weight() {
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressAnimation] = useState(new Animated.Value(0));

  const totalSteps = 9;
  const currentStep = 2;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: currentStep / totalSteps,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  const handleContinue = async () => {
    if (!weight) {
      Alert.alert('Error', 'Please enter your weight.');
      return;
    }

    try {
      setIsLoading(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to save your weight.');
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        weight: parseInt(weight),
        updatedAt: new Date(),
      });

      console.log(`Weight saved: ${weight} kgs`);
      router.push('/gender');
    } catch (error) {
      console.error('Error saving weight:', error);
      Alert.alert('Error', 'Failed to save your weight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumericInput = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setWeight(numericValue);
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/height')}
        >
          <ChevronLeft size={24} color="#000" />
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
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

        <Text style={styles.title}>Enter your weight</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={handleNumericInput}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.unitText}>kgs</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button,
            !weight && styles.buttonDisabled,
            isLoading && styles.buttonLoading,
          ]}
          disabled={!weight || isLoading}
          onPress={handleContinue}
        >
          <Text
            style={[styles.buttonText, !weight && styles.buttonTextDisabled]}
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
          {!isLoading && (
            <ArrowRight size={20} color={!weight ? '#94a3b8' : '#fff'} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 20,
  },
  stepProgressContainer: {
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 40,
    width: '80%',
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
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    width: 140,
    height: 60,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
  unitText: {
    fontFamily: 'Inter-Medium',
    fontSize: 28,
    color: '#1a1a1a',
    marginLeft: 12,
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
