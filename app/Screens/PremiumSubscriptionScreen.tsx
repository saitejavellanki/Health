import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PremiumSubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'You need to be logged in to subscribe');
        setLoading(false);
        return;
      }

      // Set pricing based on plan
      const amount = selectedPlan === 'monthly' ? 1 : 3150;

      // Navigate to payment screen
      router.push({
        pathname: '/Utils/PaymentProcessor',
        params: {
          plan: selectedPlan,
          amount: amount,
        },
      });

      // Reset loading state after navigation
      setLoading(false);
    } catch (error) {
      console.error('Error initiating subscription:', error);
      Alert.alert(
        'Error',
        'Failed to start subscription process. Please try again.'
      );
      setLoading(false);
    }
  };

  const openDemoVideo = () => {
    // Replace this URL with your actual demo video URL
    Linking.openURL('https://www.youtube.com/watch?v=premium_demo');
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      }}
      style={styles.backgroundImage}
    >
      <StatusBar translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
        style={styles.overlay}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={[
              styles.container,
              {
                paddingTop: insets.top > 0 ? 20 : StatusBar.currentHeight + 20,
              },
            ]}
          >
            {/* Header with back button */}
            <View
              style={[
                styles.header,
                { paddingTop: insets.top > 0 ? 0 : insets.top },
              ]}
            >
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="arrow-left" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Premium logo and title */}
            <View style={styles.titleContainer}>
              <View style={styles.logoContainer}>
                <Feather name="award" size={40} color="#22c55e" />
              </View>
              <Text style={styles.title}>PREMIUM</Text>
              <Text style={styles.subtitle}>Elevate your fitness journey</Text>

              {/* Demo Video Button */}
              {/* <Pressable style={styles.demoVideoButton} onPress={openDemoVideo}>
                <Feather
                  name="play-circle"
                  size={18}
                  color="#fff"
                  style={styles.playIcon}
                />
                <Text style={styles.demoVideoText}>Watch Demo Video</Text>
              </Pressable> */}
            </View>

            {/* Plan selection */}
            <View style={styles.planContainer}>
              <Pressable
                style={[
                  styles.planOption,
                  selectedPlan === 'monthly' && styles.selectedPlan,
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text
                  style={[
                    styles.planType,
                    selectedPlan === 'monthly' && styles.selectedPlanText,
                  ]}
                >
                  Monthly
                </Text>
                <Text
                  style={[
                    styles.planPrice,
                    selectedPlan === 'monthly' && styles.selectedPlanText,
                  ]}
                >
                  ₹350
                </Text>
                <Text
                  style={[
                    styles.planDescription,
                    selectedPlan === 'monthly' && styles.selectedPlanText,
                  ]}
                >
                  per month
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.planOption,
                  selectedPlan === 'annual' && styles.selectedPlan,
                ]}
                onPress={() => setSelectedPlan('annual')}
              >
                <Text
                  style={[
                    styles.planType,
                    selectedPlan === 'annual' && styles.selectedPlanText,
                  ]}
                >
                  Annual
                </Text>
                <Text
                  style={[
                    styles.planPrice,
                    selectedPlan === 'annual' && styles.selectedPlanText,
                  ]}
                >
                  ₹3,150
                </Text>
                <Text
                  style={[
                    styles.planDescription,
                    selectedPlan === 'annual' && styles.selectedPlanText,
                  ]}
                >
                  ₹262/month · Save 25%
                </Text>
                <View style={styles.bestValueTag}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
              </Pressable>
            </View>

            {/* Features list */}
            <Text style={styles.featuresTitle}>Premium Features</Text>

            {/* Features content remains the same... */}
            {/* Feature 1 */}
            <View style={styles.featureContainer}>
              <View style={styles.featureContent}>
                <View style={styles.featureIconContainer}>
                  <Feather name="camera" size={20} color="#22c55e" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>
                    AI-powered food logging & calorie tracking
                  </Text>
                  <Text style={styles.featureDescription}>
                    Snap a photo of your meal and our AI will identify foods and
                    calculate calories automatically.
                  </Text>
                </View>
              </View>
            </View>

            {/* Feature 2 */}
            <View style={styles.featureContainer}>
              <View style={styles.featureContent}>
                <View style={styles.featureIconContainer}>
                  <Feather name="bar-chart-2" size={20} color="#22c55e" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>
                    Advanced fitness & nutrition analytics
                  </Text>
                  <Text style={styles.featureDescription}>
                    Get detailed insights on your progress with advanced charts
                    and personalized reports.
                  </Text>
                </View>
              </View>
            </View>

            {/* Feature 3 */}
            <View style={styles.featureContainer}>
              <View style={styles.featureContent}>
                <View style={styles.featureIconContainer}>
                  <Feather name="calendar" size={20} color="#22c55e" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>
                    Personalized meal plans for your goals
                  </Text>
                  <Text style={styles.featureDescription}>
                    Get weekly meal plans tailored to your dietary preferences
                    and fitness goals.
                  </Text>
                </View>
              </View>
            </View>

            {/* Feature 4 */}
            <View style={styles.featureContainer}>
              <View style={styles.featureContent}>
                <View style={styles.featureIconContainer}>
                  <Feather name="award" size={20} color="#22c55e" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>
                    AI Nutritionist-designed meal recommendations
                  </Text>
                  <Text style={styles.featureDescription}>
                    Get expert recommendations from AI nutritionists based on
                    your health data.
                  </Text>
                </View>
              </View>
            </View>

            {/* Subscribe button */}
            <Pressable
              style={[
                styles.subscribeButton,
                loading && styles.subscribeButtonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.subscribeButtonGradient}
              >
                <Text style={styles.subscribeButtonText}>
                  {loading
                    ? 'Processing...'
                    : selectedPlan === 'monthly'
                    ? 'Subscribe for ₹350/month'
                    : 'Subscribe for ₹3,150/year'}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Terms and conditions */}
            <Text style={styles.termsText}>
              By subscribing, you agree to our Terms of Service and Privacy
              Policy. You can cancel your subscription anytime.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Styles remain the same as in your original code
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    marginBottom: 20,
  },
  demoVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  playIcon: {
    marginRight: 8,
  },
  demoVideoText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  planContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  planOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedPlan: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22c55e',
  },
  planType: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  planDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 5,
    textAlign: 'center',
  },
  selectedPlanText: {
    color: '#fff',
  },
  bestValueTag: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
  },
  bestValueText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  featureContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  featureContent: {
    flexDirection: 'row',
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  subscribeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  subscribeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
