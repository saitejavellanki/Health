import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Pressable,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  MapPin,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  
  // Field-specific error states
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    state: '',
    general: '',
  });
  
  // Touched states to track if fields have been interacted with
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    state: false,
  });

  // Mark a field as touched when user interacts with it
  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate each field when its value changes
  useEffect(() => {
    if (touched.name) {
      setErrors(prev => ({...prev, name: name ? '' : 'Name is required'}));
    }
  }, [name, touched.name]);

  useEffect(() => {
    if (touched.email) {
      if (!email) {
        setErrors(prev => ({...prev, email: 'Email is required'}));
      } else if (!validateEmail(email)) {
        setErrors(prev => ({...prev, email: 'Please enter a valid email address'}));
      } else {
        setErrors(prev => ({...prev, email: ''}));
      }
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) {
      if (!password) {
        setErrors(prev => ({...prev, password: 'Password is required'}));
      } else if (password.length < 6) {
        setErrors(prev => ({...prev, password: 'Password must be at least 6 characters long'}));
      } else {
        setErrors(prev => ({...prev, password: ''}));
      }
    }
  }, [password, touched.password]);

  useEffect(() => {
    if (touched.confirmPassword) {
      if (!confirmPassword) {
        setErrors(prev => ({...prev, confirmPassword: 'Please confirm your password'}));
      } else if (password !== confirmPassword) {
        setErrors(prev => ({...prev, confirmPassword: 'Passwords do not match'}));
      } else {
        setErrors(prev => ({...prev, confirmPassword: ''}));
      }
    }
  }, [confirmPassword, password, touched.confirmPassword]);

  useEffect(() => {
    if (touched.state) {
      setErrors(prev => ({...prev, state: state ? '' : 'Please select your state'}));
    }
  }, [state, touched.state]);

  const handleRegister = async () => {
    // Mark all fields as touched to show all errors
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      state: true,
    });

    
    // Validate all fields
    const newErrors = {
      name: name ? '' : 'Name is required',
      email: !email ? 'Email is required' : !validateEmail(email) ? 'Please enter a valid email address' : '',
      password: !password ? 'Password is required' : password.length < 6 ? 'Password must be at least 6 characters long' : '',
      confirmPassword: !confirmPassword ? 'Please confirm your password' : password !== confirmPassword ? 'Passwords do not match' : '',
      state: state ? '' : 'Please select your state',
      general: '',
    };

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    if (hasErrors) {
      return;
    }

    try {
      setLoading(true);
      setErrors(prev => ({ ...prev, general: '' }));

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update profile with name
      await updateProfile(user, {
        displayName: name,
      });

      // Store additional user data in Firestore with onboarded field set to false
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        state,
        createdAt: new Date(),
        preferences: {},
        goals: [],
        onboarded: false,
      });

      // Check onboarded status and redirect accordingly
      router.replace('/(onboarding)');
    } catch (err) {
      // Handle Firebase specific errors with user-friendly messages
      let errorMessage = 'Failed to register. Please try again.';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        setErrors(prev => ({ ...prev, email: errorMessage, general: '' }));
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'The email address is not valid.';
        setErrors(prev => ({ ...prev, email: errorMessage, general: '' }));
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please use a stronger password.';
        setErrors(prev => ({ ...prev, password: errorMessage, general: '' }));
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
        setErrors(prev => ({ ...prev, general: errorMessage }));
      } else {
        // For other errors, set a general error message
        setErrors(prev => ({ ...prev, general: errorMessage }));
      }
      
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine input container style based on error state
  const getInputContainerStyle = (fieldName) => {
    if (!touched[fieldName]) return styles.inputContainer;
    return errors[fieldName] 
      ? [styles.inputContainer, styles.inputContainerError]
      : touched[fieldName] && !errors[fieldName] 
        ? [styles.inputContainer, styles.inputContainerSuccess]
        : styles.inputContainer;
  };

  // Helper function to render error message for a field
  const renderErrorMessage = (fieldName) => {
    if (!touched[fieldName] || !errors[fieldName]) return null;
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={14} color="#ef4444" style={styles.errorIcon} />
        <Text style={styles.errorText}>{errors[fieldName]}</Text>
      </View>
    );
  };

  // Helper function to render success icon for a valid field
  const renderValidIndicator = (fieldName) => {
    if (touched[fieldName] && !errors[fieldName] && fieldName !== 'state') {
      return <CheckCircle size={20} color="#22c55e" />;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
              }}
              style={styles.headerImage}
            />
            <View style={styles.logoContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
                }}
                style={styles.logoImage}
              />
            </View>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start your fitness journey today
            </Text>

            {errors.general ? (
              <View style={styles.generalErrorContainer}>
                <AlertCircle size={18} color="#fff" style={styles.generalErrorIcon} />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* Name Input */}
            <View style={getInputContainerStyle('name')}>
              <User size={20} color={errors.name && touched.name ? "#ef4444" : "#666"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
                onBlur={() => handleBlur('name')}
              />
              {renderValidIndicator('name')}
            </View>
            {renderErrorMessage('name')}

            {/* Email Input */}
            <View style={getInputContainerStyle('email')}>
              <Mail size={20} color={errors.email && touched.email ? "#ef4444" : "#666"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {renderValidIndicator('email')}
            </View>
            {renderErrorMessage('email')}

            {/* State Dropdown */}
            <TouchableOpacity
              style={getInputContainerStyle('state')}
              onPress={() => {
                setStateModalVisible(true);
                handleBlur('state');
              }}
            >
              <MapPin size={20} color={errors.state && touched.state ? "#ef4444" : "#666"} style={styles.inputIcon} />
              <Text style={[styles.input, !state && { color: '#888' }]}>
                {state || 'Select your state'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
            {renderErrorMessage('state')}

            {/* Password Input */}
            <View style={getInputContainerStyle('password')}>
              <Lock size={20} color={errors.password && touched.password ? "#ef4444" : "#666"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                onBlur={() => handleBlur('password')}
                secureTextEntry
              />
              {renderValidIndicator('password')}
            </View>
            {renderErrorMessage('password')}

            {/* Confirm Password Input */}
            <View style={getInputContainerStyle('confirmPassword')}>
              <Lock size={20} color={errors.confirmPassword && touched.confirmPassword ? "#ef4444" : "#666"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => handleBlur('confirmPassword')}
                secureTextEntry
              />
              {renderValidIndicator('confirmPassword')}
            </View>
            {renderErrorMessage('confirmPassword')}

            <Pressable
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <ArrowRight size={20} color="#fff" />
                </>
              )}
            </Pressable>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for state selection */}
      <Modal
        visible={stateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={indianStates}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.stateItem}
                  onPress={() => {
                    setState(item);
                    setStateModalVisible(false);
                  }}
                >
                  <Text style={styles.stateItemText}>{item}</Text>
                  {state === item && (
                    <Text style={styles.selectedIndicator}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  formContainer: {
    padding: 24,
    backgroundColor: '#fff',
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainerError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputContainerSuccess: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    marginTop: -4,
  },
  errorIcon: {
    marginRight: 6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  generalErrorIcon: {
    marginRight: 8,
  },
  generalErrorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginLink: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stateItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedIndicator: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

const indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];