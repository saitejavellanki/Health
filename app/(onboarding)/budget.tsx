import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, ArrowRight, ChevronDown } from 'lucide-react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Update this path

export default function Budget() {
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('INR'); // Set default to INR
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing budget data if available
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().budget) {
            setBudget(userDoc.data().budget.amount || '');
            setCurrency(userDoc.data().budget.currency || 'INR');
          }
        } catch (error) {
          console.error('Error fetching budget data:', error);
        }
      }
    };
    
    fetchBudgetData();
  }, []);

  const handleBudgetChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue.length <= 5) {
      setBudget(numericValue);
    }
  };

  const handleContinue = async () => {
    if (!budget) {
      Alert.alert('Budget Required', 'Please enter your monthly budget.');
      return;
    }

    setIsLoading(true);
    
    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        
        // Get existing user data first
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Update only the budget field, preserving other user data
        await setDoc(userDocRef, {
          ...userData,
          budget: {
            amount: budget,
            currency: currency,
            updatedAt: new Date().toISOString()
          }
        }, { merge: true });
        
        router.push('/plan');
      } else {
        Alert.alert('Error', 'You must be signed in to continue.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save your budget. Please try again.');
      setIsLoading(false);
    }
  };

  const toggleCurrencyModal = () => {
    setCurrencyModalVisible(!isCurrencyModalVisible);
  };

  const selectCurrency = (itemValue) => {
    setCurrency(itemValue);
    toggleCurrencyModal();
  };

  const currencyOptions = [
    { label: 'INR', value: 'INR', symbol: '🇮🇳' },
    { label: 'USD', value: 'USD', symbol: '🇺🇸' },
  ];

  const renderCurrencyItem = ({ item }) => (
    <Pressable
      style={styles.currencyItem}
      onPress={() => selectCurrency(item.value)}
    >
      <Text style={styles.currencyText}>
        {item.symbol} {item.label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.backButtonContainer}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.push('/allergies')}
            >
              <ChevronLeft size={24} color="#000" />
            </Pressable>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.title}>
              What is your maximum monthly budget?
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.currencyContainer}>
                <Pressable
                  onPress={toggleCurrencyModal}
                  style={styles.selectedCurrency}
                >
                  <Text style={styles.selectedCurrencyText}>
                    {
                      currencyOptions.find(
                        (option) => option.value === currency
                      )?.symbol
                    }{' '}
                    {currency}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.budgetContainer}>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Maximum monthly budget"
                  placeholderTextColor="#a0aec0"
                  keyboardType="number-pad"
                  value={budget}
                  onChangeText={handleBudgetChange}
                  maxLength={5}
                  editable={true}
                  returnKeyType="done"
                />
              </View>
            </View>

            <Text style={styles.disclaimer}>
              *This represents the maximum budget and may not be fully utilized
              in the curated diet plan.
            </Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, isLoading && styles.buttonLoading]}
              disabled={isLoading}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Processing...' : 'Continue'}
              </Text>
              {!isLoading && <ArrowRight size={20} color="#fff" />}
            </Pressable>
          </View>

          <Modal
            visible={isCurrencyModalVisible}
            transparent={true}
            animationType="slide"
          >
            <TouchableWithoutFeedback onPress={toggleCurrencyModal}>
              <View style={styles.modalContainer}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <FlatList
                      data={currencyOptions}
                      renderItem={renderCurrencyItem}
                      keyExtractor={(item) => item.value}
                      ListHeaderComponent={() => (
                        <Text style={styles.modalTitle}>Select Currency</Text>
                      )}
                      ListFooterComponent={() => (
                        <Pressable
                          style={styles.closeButton}
                          onPress={toggleCurrencyModal}
                        >
                          <Text style={styles.closeButtonText}>Close</Text>
                        </Pressable>
                      )}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-between', // Distribute space evenly
  },
  backButtonContainer: {
    marginTop: 20, // Push the back button down
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
  },
  currencyContainer: {
    width: '25%',
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedCurrency: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  selectedCurrencyText: {
    fontSize: 16,
    color: '#334155',
  },
  budgetContainer: {
    width: '75%',
  },
  budgetInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#334155',
    height: 50,
  },
  disclaimer: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  footer: {
    marginBottom: 20, // Push the continue button up
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8cc63f',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  buttonLoading: {
    backgroundColor: '#a9d178',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
  },
  currencyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyText: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#8cc63f',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 20,
    textAlign: 'center',
  },
});