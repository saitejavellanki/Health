import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Check, Shield, Lock, MapPin, Edit2, Phone } from 'lucide-react-native';
import { styles } from "../Utils/PaymentsStyles.tsx";
import { auth, db } from '../../components/firebase/Firebase.js';
import { collection, doc, getDoc, updateDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import WebView from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendOrderConfirmationNotification } from '../../components/Notification/order-notification-service.js';

// PayU configuration
const PAYU_CONFIG = {
  key: 'gSR07M',
  salt: 'RZdd32itbMYSKM7Kwo4teRkhUKCsWbnj',
  testMode: false,
  productionBaseUrl: 'https://secure.payu.in/_payment',
  testBaseUrl: 'https://test.payu.in/_payment',
};

// Hash generation function
const generateHash = async (input) => {
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA512, input);
  } catch (error) {
    console.error('Error generating hash:', error);
    throw error;
  }
};

export default function PaymentScreen() {
  // State variables
  const params = useLocalSearchParams();
  const [orderType, setOrderType] = useState(params.orderType || '');
  const [selectedFrequency, setSelectedFrequency] = useState(params.selectedFrequency || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(params.selectedTimeSlot || '');
  const [selectedDuration, setSelectedDuration] = useState(params.selectedDuration || '');
  const [address, setAddress] = useState('');
  const [cartItems, setCartItems] = useState({});
  const [priceInfo, setPriceInfo] = useState({ subtotal: '0.00', total: '0.00', savings: '0.00' });
  const [productCategories, setProductCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const insets = useSafeAreaInsets();

  // Fetch user data from Firebase
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert('Error', 'You need to be logged in to proceed.');
          router.replace('/(auth)/login');
          return;
        }
        
        // Get user data from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const user = userDoc.data();
          setUserData(user);
          
          // Set address from user data if not provided in params
          if (!params.address && user.address) {
            setAddress(user.address);
          } else {
            setAddress(params.address || '');
          }
          
          // Set phone number if available
          if (user.phone) {
            setPhoneNumber(user.phone);
          }
        } else {
          Alert.alert('Error', 'User profile not found.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Parse JSON params
  useEffect(() => {
    try {
      if (params.cartItems) setCartItems(JSON.parse(params.cartItems));
      if (params.priceInfo) setPriceInfo(JSON.parse(params.priceInfo));
      if (params.productCategories) setProductCategories(JSON.parse(params.productCategories));
      if (params.allProducts) setAllProducts(JSON.parse(params.allProducts));
    } catch (error) {
      console.error('Error parsing JSON params:', error);
      Alert.alert('Error', 'There was an error loading your order details.');
    }
  }, []);
  
  // Helper functions
  const getCartItemsForDisplay = () => {
    const items = [];
    Object.entries(cartItems).forEach(([productId, quantity]) => {
      const product = allProducts.find(p => p.id === productId);
      if (product) {
        items.push({
          ...product,
          quantity
        });
      }
    });
    return items;
  };
  
  const generateTransactionId = () => {
    return `TXN_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  };
  
  // Prepare payment data
  const preparePaymentData = async () => {
    if (!userData) {
      Alert.alert('Error', 'User data not available. Please try again.');
      return null;
    }
    
    const txnid = generateTransactionId();
    const amount = priceInfo.total;
    const productinfo = `Order - ${orderType === 'one-time' ? 'One-Time' : 'Subscription'}`;
    const firstname = userData.firstName || userData.displayName || 'Customer';
    const email = userData.email || 'customer@example.com';
    const phone = phoneNumber || '9999999999';
    const surl = 'https://yourapp.com/success'; 
    const furl = 'https://yourapp.com/failure';
    
    // Generate hash string as per PayU format
    const hashString = `${PAYU_CONFIG.key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_CONFIG.salt}`;
    const hash = await generateHash(hashString);
    
    return {
      key: PAYU_CONFIG.key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash
    };
  };
  
  // Payment submission handler
  const handleSubmitPayment = async () => {
    if (!userData) {
      Alert.alert('Error', 'User data not available. Please try again.');
      return;
    }
    
    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please add a delivery address before proceeding with payment.');
      return;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Missing Phone Number', 'Click on update to add phone number');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const paymentData = await preparePaymentData();
      if (!paymentData) {
        setIsProcessing(false);
        return;
      }
      
      // Save order to Firestore before proceeding with payment
      await saveOrderToFirestore(paymentData);
      
      // Set payment form data for WebView
      setPaymentFormData(paymentData);
      setShowPaymentWebView(true);
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  // Save order to Firestore
  const saveOrderToFirestore = async (paymentData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      
      const ordersCollection = collection(db, 'orders');
      const orderRef = doc(ordersCollection);
      
      const orderData = {
        userId: currentUser.uid,
        orderId: paymentData.txnid,
        orderType,
        items: getCartItemsForDisplay().map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        frequency: selectedFrequency,
        timeSlot: selectedTimeSlot,
        duration: selectedDuration,
        address,
        phoneNumber,
        priceInfo,
        paymentMethod: 'PayU Gateway',
        status: 'pending',
        deliveryStatus: 'pending',
        createdAt: new Date(),
      };
      
      await setDoc(orderRef, orderData);
      return orderRef;
    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    }
  };
  
  // Handle payment response
  const handlePaymentResponse = (data) => {
    try {
      const response = JSON.parse(data);
      
      setShowPaymentWebView(false);
      setIsProcessing(false);
      
      if (response.status === 'success') {
        // Payment successful
        setIsComplete(true);
        
        // Update order status in Firestore
        updateOrderStatus(paymentFormData.txnid, 'completed', response);
        
        const orderDetails = {
          orderId: paymentFormData.txnid,
          orderNumber: paymentFormData.txnid.substring(4, 10),
          amount: paymentFormData.amount
        };
        
        sendOrderConfirmationNotification(auth.currentUser.uid, orderDetails)
          .catch(error => console.error('Error sending notification:', error));
        
        // Redirect to confirmation
        setTimeout(() => {
          router.replace({
            pathname: '/Screens/OrderConfirmationScreen',
            params: { orderId: paymentFormData.txnid }
          });
        }, 2000);
      } else {
        // Payment failed
        Alert.alert(
          'Payment Failed',
          response.error_message || 'Your payment was not processed. Please try again.',
          [{ text: 'OK', onPress: () => updateOrderStatus(paymentFormData.txnid, 'failed', response) }]
        );
      }
    } catch (error) {
      console.error('Error processing payment response:', error);
      Alert.alert('Error', 'There was an error processing your payment. Please try again.');
      setShowPaymentWebView(false);
      setIsProcessing(false);
    }
  };
  
  // Update order status function
  const updateOrderStatus = async (orderId, status, paymentDetails) => {
    try {
      const ordersRef = collection(db, 'orders');
      const querySnapshot = await getDocs(query(ordersRef, where('orderId', '==', orderId)));
      
      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        await updateDoc(orderDoc.ref, {
          status,
          paymentDetails,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };
  
  const getDeliveryDetailsText = () => {
    if (orderType === 'one-time') {
      const timeSlot = selectedTimeSlot || '';
      const deliveryTime = timeSlot.replace(/-/g, ' ').replace('today', 'Today').replace('tomorrow', 'Tomorrow');
      return `One-time delivery: ${deliveryTime}`;
    } else if (orderType === 'subscription') {
      const frequency = selectedFrequency.charAt(0).toUpperCase() + selectedFrequency.slice(1);
      const duration = selectedDuration.replace('-', ' ');
      return `${frequency} delivery for ${duration}`;
    }
    return 'Delivery details not available';
  };
  
  // Address update handlers
  const handleUpdateAddress = async () => {
    if (newAddress.trim().length === 0) {
      Alert.alert('Invalid Address', 'Please enter a valid delivery address.');
      return;
    }
    
    try {
      setAddress(newAddress);
      setAddressModalVisible(false);
      
      // Update address in Firebase if user is logged in
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { address: newAddress });
      }
      
      Alert.alert('Success', 'Delivery address has been updated.');
    } catch (error) {
      console.error('Error updating address:', error);
      Alert.alert('Error', 'Failed to update address. Please try again.');
    }
  };
  
  const openAddressModal = () => {
    setNewAddress(address);
    setAddressModalVisible(true);
  };
  
  // Phone number update handlers
  const handleUpdatePhone = async () => {
    if (newPhoneNumber.trim().length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }
    
    try {
      setPhoneNumber(newPhoneNumber);
      setPhoneModalVisible(false);
      
      // Update phone in Firebase if user is logged in
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { phone: newPhoneNumber });
      }
      
      Alert.alert('Success', 'Phone number has been updated.');
    } catch (error) {
      console.error('Error updating phone number:', error);
      Alert.alert('Error', 'Failed to update phone number. Please try again.');
    }
  };
  
  const openPhoneModal = () => {
    setNewPhoneNumber(phoneNumber);
    setPhoneModalVisible(true);
  };
  
  // Render modals
  const renderAddressModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addressModalVisible}
      onRequestClose={() => setAddressModalVisible(false)}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Delivery Address</Text>
              <Pressable style={styles.closeButton} onPress={() => setAddressModalVisible(false)}>
                <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
              </Pressable>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full address"
                  value={newAddress}
                  onChangeText={setNewAddress}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.saveButton} onPress={handleUpdateAddress}>
                <Text style={styles.saveButtonText}>Update Address</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderPhoneModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={phoneModalVisible}
      onRequestClose={() => setPhoneModalVisible(false)}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Phone Number</Text>
              <Pressable style={styles.closeButton} onPress={() => setPhoneModalVisible(false)}>
                <Text style={{ fontSize: 16, color: '#64748b' }}>Cancel</Text>
              </Pressable>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={newPhoneNumber}
                  onChangeText={setNewPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <Pressable style={styles.saveButton} onPress={handleUpdatePhone}>
                <Text style={styles.saveButtonText}>Update Phone</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Render payment WebView
  const renderPaymentWebView = () => {
    if (!showPaymentWebView || !paymentFormData) return null;
    
    const paymentUrl = PAYU_CONFIG.testMode ? PAYU_CONFIG.testBaseUrl : PAYU_CONFIG.productionBaseUrl;
    
    const formHtml = `
      <html>
        <head>
          <title>Payment Gateway</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background-color: #f9fafb;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .loader {
              border: 5px solid #f3f3f3;
              border-top: 5px solid #22c55e;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            p {
              color: #374151;
              margin: 10px 0;
            }
          </style>
        </head>
        <body onload="document.forms[0].submit()">
          <form action="${paymentUrl}" method="post">
            ${Object.entries(paymentFormData).map(([key, value]) => 
              `<input type="hidden" name="${key}" value="${value}" />`
            ).join('')}
          </form>
          <div class="container">
            <div class="loader"></div>
            <p>Redirecting to payment gateway...</p>
            <p>Please do not close this window</p>
          </div>
        </body>
      </html>
    `;
    
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showPaymentWebView}
        onRequestClose={() => {
          Alert.alert(
            'Cancel Payment',
            'Are you sure you want to cancel this payment?',
            [
              { text: 'No', style: 'cancel' },
              { 
                text: 'Yes', 
                onPress: () => {
                  setShowPaymentWebView(false);
                  setIsProcessing(false);
                  updateOrderStatus(paymentFormData.txnid, 'cancelled', { status: 'cancelled' });
                }
              }
            ]
          );
        }}>
        <View style={{ flex: 1 }}>
          <View style={styles.webViewHeader}>
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Cancel Payment',
                  'Are you sure you want to cancel this payment?',
                  [
                    { text: 'No', style: 'cancel' },
                    { 
                      text: 'Yes', 
                      onPress: () => {
                        setShowPaymentWebView(false);
                        setIsProcessing(false);
                        updateOrderStatus(paymentFormData.txnid, 'cancelled', { status: 'cancelled' });
                      }
                    }
                  ]
                );
              }}
              style={styles.webViewBackButton}>
              <ChevronLeft size={24} color="#000" />
              <Text style={styles.webViewBackText}>Cancel</Text>
            </Pressable>
            <Text style={styles.webViewTitle}>Complete Payment</Text>
          </View>
          
          <WebView
            source={{ html: formHtml }}
            onNavigationStateChange={(navState) => {
              // Handle success and failure URLs
              if (navState.url.includes('success') || navState.url.includes('failure')) {
                // Extract response data from URL
                const urlParams = new URLSearchParams(navState.url.split('?')[1] || '');
                const response = {};
                
                for (const [key, value] of urlParams.entries()) {
                  response[key] = value;
                }
                
                response.status = navState.url.includes('success') ? 'success' : 'failed';
                handlePaymentResponse(JSON.stringify(response));
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Initializing payment gateway...</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    );
  };
  
  // Show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }
  
  // Main UI render
  return (
    <View style={styles.container}>
      {/* Modals */}
      {renderAddressModal()}
      {renderPhoneModal()}
      {renderPaymentWebView()}
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable 
          onPress={() => router.replace('/(tabs)/subscription')} 
          style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.orderDetailsCard}>
            <Text style={styles.orderTypeText}>{orderType === 'one-time' ? 'One-Time Order' : 'Subscription'}</Text>
            <Text style={styles.deliveryDetailsText}>{getDeliveryDetailsText()}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.orderItemsTitle}>{Object.keys(cartItems).length} items in your box</Text>
            
            {getCartItemsForDisplay().slice(0, 3).map((item) => (
              <View key={item.id} style={styles.orderItemRow}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                <Text style={styles.orderItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
            
            {getCartItemsForDisplay().length > 3 && (
              <Text style={styles.moreItemsText}>+{getCartItemsForDisplay().length - 3} more items</Text>
            )}
            
            <View style={styles.divider} />
            
            <View style={styles.priceSummary}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>₹{priceInfo.subtotal}</Text>
              </View>
              
              {parseFloat(priceInfo.savings) > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.savingsLabel}>Savings</Text>
                  <Text style={styles.savingsValue}>-₹{priceInfo.savings}</Text>
                </View>
              )}
              
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{priceInfo.total}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Pressable style={styles.editButton} onPress={openAddressModal}>
              <Edit2 size={16} color="#22c55e" />
              <Text style={styles.editButtonText}>Update</Text>
            </Pressable>
          </View>
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <MapPin size={20} color="#64748b" style={styles.addressIcon} />
              <Text style={styles.addressText}>{address || "Please add delivery address"}</Text>
            </View>
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contact Number</Text>
            <Pressable style={styles.editButton} onPress={openPhoneModal}>
              <Edit2 size={16} color="#22c55e" />
              <Text style={styles.editButtonText}>Update</Text>
            </Pressable>
          </View>
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <Phone size={20} color="#64748b" style={styles.addressIcon} />
              <Text style={styles.addressText}>
                {phoneNumber || "Please add your phone number"}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.paymentInfoCard}>
            <View style={styles.paymentGatewayBadge}>
              <Lock size={14} color="#64748b" />
              <Text style={styles.paymentGatewayText}>Secure Payment via PayU</Text>
            </View>
            <Text style={styles.paymentInfoText}>
              You'll be redirected to PayU's secure payment gateway to complete your payment.
            </Text>
            <Text style={styles.paymentInfoText}>
              PayU offers various payment options including credit/debit cards, UPI, net banking, and mobile wallets.
            </Text>
          </View>
        </View>
        
        {/* Submit Button */}
        <View style={styles.payButtonContainer}>
          <Pressable
            style={[
              styles.payButton,
              isProcessing && styles.payButtonProcessing,
              isComplete && styles.payButtonComplete
            ]}
            disabled={isProcessing || isComplete || !address}
            onPress={handleSubmitPayment}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : isComplete ? (
              <>
                <Check size={24} color="#ffffff" />
                <Text style={styles.payButtonText}>Payment Successful</Text>
              </>
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  Proceed to Payment Gateway
                </Text>
                <Shield size={18} color="#ffffff" />
              </>
            )}
          </Pressable>
          
          <Text style={styles.securityNote}>
            Your payment information is securely processed by PayU
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}