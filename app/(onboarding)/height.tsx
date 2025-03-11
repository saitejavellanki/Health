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

export default function Height() {
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!heightFeet || !heightInches) {
      Alert.alert('Error', 'Please enter your height in both fields.');
      return;
    }

    try {
      setIsLoading(true);

      // Save height data or navigate to the next step
      console.log(`Height: ${heightFeet} ft ${heightInches} in`);

      // Navigate to the next screen (adjust route as needed)
      router.push('/weight');
    } catch (error) {
      console.error('Error saving height:', error);
      Alert.alert('Error', 'Failed to save your height. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only allow integers
  const handleNumericInput = (text, setter) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setter(numericValue);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.backButtonContainer}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/(onboarding)')}
        >
          <ChevronLeft size={24} color="#000" />
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Enter your height</Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={heightFeet}
              onChangeText={(text) => handleNumericInput(text, setHeightFeet)}
              keyboardType="number-pad"
              maxLength={1}
            />
            <Text style={styles.unitText}>ft</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={heightInches}
              onChangeText={(text) => handleNumericInput(text, setHeightInches)}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.unitText}>in</Text>
          </View>
        </View>

        <Text style={styles.helperText}>
          *Enter feet in first box and inches in second box. (Ex: 5 ft 7 in for
          "5'7")
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button,
            (!heightFeet || !heightInches) && styles.buttonDisabled,
            isLoading && styles.buttonLoading,
          ]}
          disabled={!heightFeet || !heightInches || isLoading}
          onPress={handleContinue}
        >
          <Text
            style={[
              styles.buttonText,
              (!heightFeet || !heightInches) && styles.buttonTextDisabled,
            ]}
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
          {!isLoading && (
            <ArrowRight
              size={20}
              color={!heightFeet || !heightInches ? '#94a3b8' : '#fff'}
            />
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
  backButtonContainer: {
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
    width: '100%',
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: 80,
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
    fontSize: 18,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 20,
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
