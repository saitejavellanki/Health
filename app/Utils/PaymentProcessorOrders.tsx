import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = 'https://7989-49-206-60-211.ngrok-free.app';

export default function PaymentProcessor() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const insets = useSafeAreaInsets();
  
  const { plan, amount, orderId, returnUrl } = params;
  
  // Prepare payment request when component mounts
  useEffect(() => {
    const preparePayment = async () => {
      try {
        setLoading(true);
        
        // Make API call to your backend to initiate payment
        const response = await fetch(`${API_BASE_URL}/api/initiate-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            productInfo: plan,
            txnId: orderId,
            returnUrl
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to initiate payment');
        }
        
        // Set the payment URL received from your backend
        setPaymentUrl(data.paymentUrl);
      } catch (err) {
        console.error('Payment initiation error:', err);
        setError(err.message || 'Failed to initiate payment');
      } finally {
        setLoading(false);
      }
    };
    
    preparePayment();
    
    // Handle back button to prevent accidental navigation away
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Show alert or handle back press as needed
      return true; // Prevent default behavior
    });
    
    return () => backHandler.remove();
  }, [amount, plan, orderId]);
  
  // Handle navigation state changes in the WebView
  const handleNavigationStateChange = (navState) => {
    // Check if we've been redirected to success or failure URLs
    const { url } = navState;
    
    if (url.includes('/payment/success') || url.includes('/payment/failure')) {
      // Navigate back to the payment screen to handle the result
      router.replace({
        pathname: '/Screens/PaymentScreen',
        params: { paymentResult: url }
      });
    }
  };
  
  // Extract JavaScript code for PayU form submission
  const INJECTED_JAVASCRIPT = `
    (function() {
      // Auto-submit the PayU form if present
      const payuForm = document.querySelector('form[action*="payu"]');
      if (payuForm) {
        payuForm.submit();
      }
      true;
    })();
  `;
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Preparing secure payment gateway...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Payment Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text 
            style={styles.backButton}
            onPress={() => router.back()}>
            Go Back
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Secure Payment Gateway</Text>
      </View>
      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError(`WebView error: ${nativeEvent.description}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  webviewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
    padding: 12,
  }
});