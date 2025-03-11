import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';

export default function Gender() {
  const [selectedGender, setSelectedGender] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    setIsLoading(true);
    // Here will be the logic of saving the gender into Firebase
    router.push('/dob');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/weight')}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>

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
                {/* 👤 Prefer Not to Say */}
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
    padding: 20,
    // alignItems:"center",
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
    marginTop: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // alignContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    fontWeight: '600',
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
    width: '50%', // Adjusted for two options in a row
    marginLeft: 7,
    marginRight: 7,
  },
  preferNotSayOption: {
    width: '90%', // Full width for "Prefer Not to Say" option
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  optionText: {
    fontSize: 18,
    color: '#999999',
    // padding: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#22c55e',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
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
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
});
