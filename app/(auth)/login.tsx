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

import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { Link, router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { auth, db } from '../../components/firebase/Firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
  Mail,
  Lock,
  ArrowRight,
} from 'lucide-react-native';

// Import Google Sign In
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { maybeCompleteAuthSession } from 'expo-web-browser';

// Import the AuthContext
import { useAuth } from '../context/AuthContext';

// Ensure auth session is completed
maybeCompleteAuthSession();

export default function Login() {
  // Use the AuthContext
  const { user, isLoading: authLoading, checkUserOnboardingStatus } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Configure Google Sign In
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      // Get these values from your Firebase project settings
      expoClientId: 'YOUR_EXPO_CLIENT_ID',
      iosClientId: 'YOUR_IOS_CLIENT_ID',
      androidClientId: 'YOUR_ANDROID_CLIENT_ID',
      webClientId: 'YOUR_WEB_CLIENT_ID',
    });

  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_Bold: Poppins_700Bold,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      handleGoogleCredential(id_token);
    }
  }, [googleResponse]);

  // Handle navigation after successful authentication
  useEffect(() => {
    // Only need to check if user exists - AuthContext will handle navigation
    // if (user && !authLoading) {
    //   console.log("User authenticated, letting AuthContext handle navigation");
    // }
  }, [user, authLoading]);

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
      
      // Sign in with Firebase
      await signInWithEmailAndPassword(auth, email, password);
      
      // Don't navigate here - let the AuthContext handle it
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
      Alert.alert('Login Error', err.message);
    } finally {
      setLoading(false);
    }
  };
  

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await googlePromptAsync();
    } catch (error) {
      Alert.alert('Google Sign In Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    try {
      setLoading(true);
      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in with credential - AuthContext will handle the state
      await signInWithCredential(auth, googleCredential);
      
      // Navigation will be handled by the useEffect
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create an OAuthProvider credential
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
      });

      // Sign in with credential - AuthContext will handle the state
      await signInWithCredential(auth, credential);
      
      // Navigation will be handled by the useEffect
    } catch (error) {
      // Ignore cancel errors
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Apple Sign In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
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
            disabled={loading || authLoading}
          >
            {loading || authLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <ArrowRight size={20} color="#fff" />
              </>
            )}
          </Pressable>

          {/* <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignIn}
              disabled={loading || authLoading}
            >
              <Image
                source={require('../../assets/images/google-logo.png')}
                style={styles.socialIcon}
              />
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={loading || authLoading}
              >
                <Image
                  source={require('../../assets/images/apple-logo.png')}
                  style={styles.socialIcon}
                />
              </TouchableOpacity>
            )}
          </View> */}

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
});
