import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const goToTabs = () => {
    // Add haptic feedback when pressing buttons
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)');
  };
  
  // Start animations when component mounts
  useEffect(() => {
    // Staggered animations sequence
    Animated.sequence([
      // Check mark animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Text and buttons animation
      Animated.stagger(150, [
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Continuous pulse animation for the button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Back Button with SafeArea consideration */}
      <SafeAreaView style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goToTabs}
        >
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Success Icon with animation */}
        <Animated.View 
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <AntDesign name="checkcircle" size={80} color="#2ECC71" />
        </Animated.View>
        
        {/* Order Confirmation Text with animation */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          <Text style={styles.title}>Order Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your order has been placed and will be processed soon.
          </Text>
          <Text style={styles.orderNumber}>Order #38294</Text>
        </Animated.View>
        
        {/* Divider with animation */}
        <Animated.View 
          style={[
            styles.divider,
            {
              opacity: fadeAnim,
              transform: [{ scaleX: fadeAnim }]
            }
          ]} 
        />
        
        {/* Action Button with animation */}
        <Animated.View
          style={{
            width: '100%',
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: pulseAnim }
            ]
          }}
        >
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={goToTabs}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 16,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 32,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '80%',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});