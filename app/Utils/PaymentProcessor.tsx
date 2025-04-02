import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getAuth } from 'firebase/auth';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

const API_BASE_URL = 'https://7989-49-206-60-211.ngrok-free.app';
const PAYMENT_TIMEOUT = 60000; // 60 seconds timeout

const PaymentProcessor = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { plan, amount } = params;
  
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [formHtml, setFormHtml] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  
  const webViewRef = useRef(null);
  const timeoutRef = useRef(null);

  // Safe navigation function to handle navigation errors
  const safeNavigateBack = () => {
    try {
      router.back();
    } catch (error) {
      console.warn('Navigation back failed, redirecting to home:', error);
      // If back navigation fails, navigate to a known screen instead
      router.push('/(tabs)');  // Navigate to home or another appropriate screen
    }
  };

  useEffect(() => {
    // Set up deep link handling for payment callbacks
    const handleDeepLink = async (event) => {
      const { url } = event;
      
      if (url.includes('yourfitnessapp://payment/success')) {
        // Payment successful
        clearTimeout(timeoutRef.current);
        setProcessing(false);
        handlePaymentSuccess();
      } else if (url.includes('yourfitnessapp://payment/failure') || 
                 url.includes('yourfitnessapp://payment/error')) {
        // Payment failed
        clearTimeout(timeoutRef.current);
        setProcessing(false);
        const message = url.includes('message=') 
          ? decodeURIComponent(url.split('message=')[1]) 
          : 'Payment process failed';
        
        handlePaymentFailure(message);
      }
    };

    // Add deep link listener
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Set up back handler to prevent accidental navigation away
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (processing) {
        Alert.alert(
          'Payment in Progress',
          'A payment is currently being processed. Are you sure you want to go back?',
          [
            { text: 'Stay', onPress: () => null, style: 'cancel' },
            { text: 'Go Back', onPress: () => safeNavigateBack() }
          ]
        );
        return true;
      }
      return false;
    });

    // Initialize the payment
    initializePayment();

    // Clean up
    return () => {
      if (subscription?.remove) {
        subscription.remove();
      } else {
        Linking.removeAllListeners('url');
      }
      backHandler.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startPaymentTimeout = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set warning timeout at 70% of the total timeout
    setTimeout(() => {
      if (processing) {
        setTimeoutWarning(true);
      }
    }, PAYMENT_TIMEOUT * 0.7);
    
    // Set full timeout
    timeoutRef.current = setTimeout(() => {
      if (processing) {
        handlePaymentFailure('Payment request timed out. Please try again later.');
      }
    }, PAYMENT_TIMEOUT);
  };

  const handlePaymentSuccess = () => {
    Alert.alert(
      'Subscription Successful',
      'Welcome to Premium! You now have access to all premium features.',
      [{ 
        text: 'Great!', 
        onPress: () => {
          // Navigate to tabs route with refresh parameter
          router.replace({
            pathname: '/(tabs)',
            params: { refresh: Date.now() }  // Adding timestamp to ensure it's always a new value
          });
        }
      }]
    );
  };
  
  const handlePaymentFailure = (message) => {
    Alert.alert(
      'Payment Failed',
      message || 'There was an issue processing your payment. Please try again.',
      [{ text: 'OK', onPress: () => safeNavigateBack() }]
    );
  };

  const initializePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You need to be logged in to make a payment');
        safeNavigateBack();
        return;
      }
      
      // Convert amount to number if it's a string
      const paymentAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;
      
      const paymentDetails = {
        userId: currentUser.uid,
        amount: paymentAmount,
        subscriptionType: plan,
        email: currentUser.email || '',
        firstname: currentUser.displayName?.split(' ')[0] || 'User',
        phone: currentUser.phoneNumber || ''
      };
      
      console.log('Payment details:', paymentDetails);
      
      // Make API call to backend to initialize payment
      const response = await fetch(`${API_BASE_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentDetails),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }
      
      setPaymentUrl(data.paymentUrl);
      setPaymentData(data.paymentData);
      
      // Create improved HTML form for automatic submission
      const formFields = Object.keys(data.paymentData).map(key => 
        `<input type="hidden" name="${key}" value="${data.paymentData[key]}">`
      ).join('');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Processing Payment</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
              background-color: #f9f9f9;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .loader { 
              border: 5px solid #f3f3f3; 
              border-top: 5px solid #22c55e; 
              border-radius: 50%; 
              width: 50px; 
              height: 50px; 
              animation: spin 1s linear infinite; 
              margin: 20px auto; 
            }
            @keyframes spin { 
              0% { transform: rotate(0deg); } 
              100% { transform: rotate(360deg); } 
            }
            .message {
              font-size: 16px;
              color: #333;
              margin-top: 16px;
            }
            .safe-area {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
              padding-left: env(safe-area-inset-left);
              padding-right: env(safe-area-inset-right);
              width: 100%;
              height: 100%;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          <div class="safe-area">
            <div class="loader"></div>
            <p class="message">Redirecting to payment gateway...</p>
            <form id="payuForm" action="${data.paymentUrl}" method="post">
              ${formFields}
              <input type="submit" value="Proceed to Payment" style="display:none">
            </form>
          </div>
          <script>
            // Ensure the form submits even if automatic submission fails
            window.onload = function() {
              // Try to submit the form automatically
              setTimeout(function() {
                try {
                  document.getElementById('payuForm').submit();
                } catch (e) {
                  console.error('Auto-submit failed:', e);
                  // Show the submit button if automatic submission fails
                  document.querySelector('input[type="submit"]').style.display = 'block';
                }
              }, 1000);
            }
            
            // Post message to React Native WebView for debugging
            function postToRN(message) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(message));
              }
            }
            
            // Log navigation events for debugging
            window.addEventListener('load', function() {
              postToRN({type: 'PAGE_LOADED'});
            });
            
            // Handle form submission event
            document.getElementById('payuForm').addEventListener('submit', function() {
              postToRN({type: 'FORM_SUBMITTED'});
            });
          </script>
        </body>
        </html>
      `;
      
      setFormHtml(html);
      setLoading(false);
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      setError(error.message || 'Failed to initialize payment');
      setLoading(false);
      
      Alert.alert(
        'Payment Error', 
        error.message || 'Failed to initialize payment',
        [{ text: 'Go Back', onPress: () => safeNavigateBack() }]
      );
    }
  };

  const handleNavigationStateChange = (navState) => {
    console.log('WebView navigating to:', navState.url);
    
    // Check if the WebView is navigating to our success or failure URLs
    const { url } = navState;
    
    if (url.includes('/api/payment/success') || 
        url.includes('/api/payment/failure')) {
      setProcessing(true);
      startPaymentTimeout();
    }
    
    // Handle successful payment completions
    if (url.includes('/api/payment/success')) {
      clearTimeout(timeoutRef.current);
      setProcessing(false);
      handlePaymentSuccess();
    }
    
    // Handle payment failures
    if (url.includes('/api/payment/failure')) {
      clearTimeout(timeoutRef.current);
      setProcessing(false);
      handlePaymentFailure('Payment was declined or canceled.');
    }
    
    // Debug: Log when payment gateway loads
    if (url.includes('payu.in')) {
      console.log('Payment gateway loaded');
    }
  };
  
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', message);
    } catch (e) {
      console.log('Raw message from WebView:', event.nativeEvent.data);
    }
  };

  const retryPayment = () => {
    setError(null);
    initializePayment();
  };

  // Navigate to home page (or another appropriate screen)
  const navigateToHome = () => {
    try {
      router.push('/(tabs)');  // Replace with your home route or another appropriate screen
    } catch (error) {
      console.error('Navigation to home failed:', error);
      // As a last resort, try to close the current screen
      if (Platform.OS === 'ios') {
        // For iOS
        router.setParams({});
      } else {
        // For Android
        BackHandler.exitApp();
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Setting up payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <View style={styles.buttonContainer}>
            <Text style={styles.retryButton} onPress={retryPayment}>Retry</Text>
            <Text style={styles.backButton} onPress={navigateToHome}>Go to Home</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (processing) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Processing your payment...</Text>
          {timeoutWarning && (
            <Text style={styles.timeoutWarning}>
              This is taking longer than expected. Please wait...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Optional header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Complete Payment</Text>
        <Text style={styles.closeButton} onPress={navigateToHome}>✕</Text>
      </View>
      
      <WebView
        ref={webViewRef}
        source={{ html: formHtml }}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleWebViewMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        )}
        style={styles.webview}
        // These additional props help ensure the WebView works properly
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={false}
        incognito={true} // Use incognito mode to avoid cookie/cache issues
        onError={(error) => {
          console.error('WebView error:', error);
          setError(`WebView error: ${error.nativeEvent.description}`);
        }}
        onHttpError={(error) => {
          console.error('WebView HTTP error:', error.nativeEvent);
          if (error.nativeEvent.statusCode >= 400) {
            setError(`HTTP error: ${error.nativeEvent.statusCode}`);
          }
        }}
        // Handle rendering errors
        renderError={(errorName) => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load payment page</Text>
            <Text style={styles.errorDesc}>{errorName}</Text>
            <View style={styles.buttonContainer}>
              <Text style={styles.retryButton} onPress={() => webViewRef.current?.reload()}>
                Retry
              </Text>
              <Text style={styles.backButton} onPress={navigateToHome}>
                Cancel
              </Text>
            </View>
          </View>
        )}
        // Additional configuration for better performance and security
        mediaPlaybackRequiresUserAction={true}
        allowsInlineMediaPlayback={true}
        scalesPageToFit={true}
        decelerationRate="normal"
        scrollEnabled={true}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        geolocationEnabled={false}
        allowsBackForwardNavigationGestures={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  closeButton: {
    fontSize: 20,
    fontWeight: '400',
    color: '#666',
    padding: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    color: '#e53e3e',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  retryButton: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 10,
    overflow: 'hidden',
  },
  backButton: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    overflow: 'hidden',
  },
  timeoutWarning: {
    marginTop: 15,
    fontSize: 14,
    color: '#d97706',
    textAlign: 'center',
    maxWidth: '80%',
  },
});

export default PaymentProcessor;