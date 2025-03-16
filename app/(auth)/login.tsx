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
  Image,
  Alert,
  Pressable,
  StatusBar,
  ScrollView,
} from 'react-native';

// Import Expo Font Loader
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { Link, router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth, db } from '../../components/firebase/Firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
  Mail,
  Lock,
  ArrowRight,
  Phone,
} from 'lucide-react-native';

import { maybeCompleteAuthSession } from 'expo-web-browser';

// For Phone Authentication
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

// Ensure auth session is completed
maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Phone authentication states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  // Reference to recaptcha verifier
  const recaptchaVerifier = React.useRef(null);

  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_Bold: Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null; // Prevent rendering until fonts are loaded
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
      Alert.alert('Login Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    try {
      // Validate phone number
      if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
        setError('Please enter a valid phone number with country code');
        return;
      }
      
      setLoading(true);
      setError('');
      
      // Format phone number if needed
      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
      
      // Get verify phone number with Firebase
      const phoneProvider = new PhoneAuthProvider(auth);
      
      // Request verification code using the reCAPTCHA verifier
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhoneNumber, 
        recaptchaVerifier.current
      );
      
      setVerificationId(verificationId);
      setShowOtpInput(true);
      Alert.alert('Success', 'Verification code has been sent to your phone');
    } catch (error) {
      setError(`Phone authentication failed: ${error.message}`);
      Alert.alert('Error', error.message);
      console.error("Phone auth error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const confirmCode = async () => {
    try {
      if (!verificationCode.trim()) {
        setError('Please enter the verification code');
        return;
      }
      
      setLoading(true);
      setError('');
      
      // Create credential with verification ID and code
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      
      // Sign in with credential
      const userCredential = await signInWithCredential(auth, credential);
      
      // Get user ID
      const userId = userCredential.user.uid;
      
      // Get user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Update existing user document with phone
        await setDoc(userRef, { 
          phone: phoneNumber 
        }, { merge: true });
      } else {
        // Create new user document with phone and explicitly set onboarded to false
        await setDoc(userRef, {
          phone: phoneNumber,
          onboarded: false,
          createdAt: new Date()
        });
      }
      
      // Now fetch the updated user document
      const updatedUserDoc = await getDoc(userRef);
      const userData = updatedUserDoc.data();
      
      // Check onboarded status and redirect
      if (!updatedUserDoc.exists() || userData.onboarded === false) {
        // Redirect to onboarding
        router.replace('/(onboarding)');
      } else {
        // User is already onboarded, go to tabs
        router.replace('/(tabs)');
      }
    } catch (error) {
      setError(`Code verification failed: ${error.message}`);
      Alert.alert('Verification Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Firebase reCAPTCHA Verifier */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        // Change title if needed
        title="Prove you're human!"
        cancelLabel="Close"
      />
      
      <View style={styles.header}>
        <Image
          source={{
            uri: 'https://res.cloudinary.com/dzlvcxhuo/image/upload/v1741947741/IMG_1539_kehx9d.jpg',
          }}
          style={styles.headerImage}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Authentication Method Toggle */}
          <View style={styles.authToggle}>
            <Pressable
              style={[
                styles.authToggleButton,
                !showPhoneAuth && styles.authToggleButtonActive
              ]}
              onPress={() => {
                setShowPhoneAuth(false);
                setShowOtpInput(false);
              }}
            >
              <Text style={!showPhoneAuth ? styles.authToggleTextActive : styles.authToggleText}>
                Email
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.authToggleButton,
                showPhoneAuth && styles.authToggleButtonActive
              ]}
              onPress={() => {
                setShowPhoneAuth(true);
                setShowOtpInput(false);
              }}
            >
              <Text style={showPhoneAuth ? styles.authToggleTextActive : styles.authToggleText}>
                Phone
              </Text>
            </Pressable>
          </View>

          {!showPhoneAuth ? (
            // Email Login Form
            <>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </Link>

              <Pressable
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </Pressable>
            </>
          ) : (
            // Phone Login Form
            <>
              {!showOtpInput ? (
                <>
                  <View style={styles.inputContainer}>
                    <Phone size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone Number with country code"
                      placeholderTextColor="#888"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Include country code (e.g. +91 for India)
                  </Text>
                </>
              ) : (
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor="#888"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                  />
                </View>
              )}

              <Pressable
                style={styles.button}
                onPress={!showOtpInput ? handlePhoneAuth : confirmCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {!showOtpInput ? "Send Verification Code" : "Verify & Sign In"}
                    </Text>
                    <ArrowRight size={20} color="#fff" />
                  </>
                )}
              </Pressable>
            </>
          )}

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#fff',
  },
  header: {
    height: '35%', // Reduced height to allow more space for form
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  formContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40, // Extra padding at bottom to ensure visibility
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
    fontFamily: 'Poppins_Bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24, // Reduced spacing
    color: '#666',
    fontFamily: 'Poppins_Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins_Regular',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins_Bold',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
    fontFamily: 'Poppins_Regular',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Poppins_Regular',
  },
  registerLink: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Poppins_Bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#666',
    fontFamily: 'Poppins_Regular',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  socialButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
  },
  socialIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  authToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    padding: 4,
  },
  authToggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  authToggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  authToggleText: {
    color: '#666',
    fontFamily: 'Poppins_Regular',
    fontSize: 14,
  },
  authToggleTextActive: {
    color: '#22c55e',
    fontFamily: 'Poppins_Bold',
    fontSize: 14,
  },
});
