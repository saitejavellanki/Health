import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';

export default function Welcome() {
  const [fontsLoaded] = useFonts({
    Poppins_Regular: Poppins_400Regular,
    Poppins_Bold: Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null; // Prevent rendering until fonts are loaded
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{'Hey, there!  👋'}</Text>
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=1000&auto=format&fit=crop',
        }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Your personalized meal planning and grocery shopping assistant!
        </Text>

        <View style={styles.bottom_footer}>
          <Pressable
            style={styles.button}
            onPress={() => router.push('/height')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <ArrowRight size={20} color="#fff" />
          </Pressable>
          <Text style={[styles.subtitle2, { fontStyle: 'italic' }]}>
            The onboarding process takes less than 3 minutes and it is a
            one-time process!
          </Text>
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
  image: {
    width: '80%',
    height: '50%',
    margin: 30,
    resizeMode: 'cover',
    borderRadius: 30,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Regular',
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 16,
    color: '#272727',
  },
  bottom_footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins_Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    color: '#999999',
    paddingHorizontal: 24,
  },
  subtitle2: {
    fontFamily: 'Poppins_Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
    color: '#999999',
    paddingHorizontal: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
});
