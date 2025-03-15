import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const NoPlanScreen = () => {
  const router = useRouter();

  const handleStartOnboarding = () => {
    router.push('/(onboarding)');
  };
  
  const handleDiscoverSubscription = () => {
    router.push('/(tabs)/subscription');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>Crunch<Text style={styles.logoAccent}>X</Text></Text>
        </View>
        
        <View style={styles.contentContainer}>
          <LinearGradient
            colors={['rgba(72, 187, 120, 0.1)', 'rgba(72, 187, 120, 0.05)']}
            style={styles.gradientBackground}
          />
          
          <Ionicons name="calendar-outline" size={84} color="#48bb78" style={styles.icon} />
          
          <Text style={styles.title}>No Plan Available</Text>
          
          <Text style={styles.description}>
            Track your calories and create custom meal plans to achieve your fitness goals.
          </Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleStartOnboarding}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Start Tracking Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionContent}>
            <View style={styles.subscriptionIconContainer}>
              <Ionicons name="basket-outline" size={28} color="#ffffff" />
            </View>
            
            <View style={styles.subscriptionTextContainer}>
              <Text style={styles.subscriptionTitle}>Healthy Snacks Delivery</Text>
              <Text style={styles.subscriptionDescription}>
                Order cut fruits and nutritious snacks delivered to your door
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.discoverButton}
            onPress={handleDiscoverSubscription}
          >
            <Text style={styles.discoverButtonText}>Discover</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.tipText}>
          Tracking your daily calories can help you make better food choices!
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2d3748',
  },
  logoAccent: {
    color: '#e53e3e',
    fontWeight: '900',
  },
  contentContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(72, 187, 120, 0.2)',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#48bb78',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  subscriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(72, 187, 120, 0.2)',
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subscriptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#48bb78',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionTextContainer: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 18,
  },
  discoverButton: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: '#48bb78',
    fontSize: 14,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
});

export default NoPlanScreen;