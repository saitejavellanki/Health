import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_200ExtraLight,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../components/firebase/Firebase';

export default function Welcome() {
  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_Bold: Poppins_700Bold,
    Poppins_ExtraLight: Poppins_200ExtraLight,
  });

  const handleSkip = async () => {
    try {
      const uid = auth.currentUser?.uid;
      // if (uid) {
      //   const userRef = doc(db, 'users', uid);
      //   await updateDoc(userRef, {
      //     onboarded: false
      //   });
      // }
      router.push('/(tabs)/subscription');
    } catch (error) {
      console.error('Error updating onboarded status:', error);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.crunchxContainer}>
          <Text style={styles.titleText}>Crunch</Text>
          <Text style={styles.titleXText}>X</Text>
        </View>
        {/* <Text style={styles.aiText}>AI</Text> */}
      </View>

      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=1000&auto=format&fit=crop',
        }}
        style={styles.image}
      />

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Meal planning and grocery shopping, simplified.
        </Text>

        <View style={styles.bottom_footer}>
          <Pressable
            style={styles.button}
            onPress={() => router.push('/height')}
            // onPress={() => router.push('/plan')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <ArrowRight size={20} color="#fff" />
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 80,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  crunchxContainer: {
    flexDirection: 'row',
  },
  titleText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 36,
    color: '#272727',
  },
  titleXText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 36,
    color: '#FF0000',
  },
  aiText: {
    fontFamily: 'Poppins_ExtraLight',
    fontSize: 32,
    color: '#272727',
    marginLeft: 6,
    alignSelf: 'flex-end',
  },
  image: {
    width: '85%',
    height: '45%',
    resizeMode: 'cover',
    borderRadius: 30,
    marginBottom: 24,
  },
  content: {
    flex: 1,
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  bottom_footer: {
    marginTop: 'auto',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  subtitle: {
    fontFamily: 'Poppins_Regular',
    fontSize: 18,
    textAlign: 'center',
    color: '#999999',
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '80%',
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Poppins_Bold',
    fontSize: 18,
    color: '#fff',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontFamily: 'Poppins_Regular',
    fontSize: 16,
    color: '#666666',
    textDecorationLine: 'underline',
  },
});
