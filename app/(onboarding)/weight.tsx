import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';

export default function Weight() {
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!weight) {
      Alert.alert('Error', 'Please enter your weight.');
      return;
    }

    try {
      setIsLoading(true);

      // Save weight data or navigate to the next step
      console.log(`Weight: ${weight} kgs`);

      // Navigate to the next screen
      router.push('/dob');
    } catch (error) {
      console.error('Error saving weight:', error);
      Alert.alert('Error', 'Failed to save your weight. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only allow integers
  const handleNumericInput = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setWeight(numericValue);
  };

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
    backgroundColor: '#8bc34a',
    paddingVertical: 16,
    borderRadius: 50,
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
