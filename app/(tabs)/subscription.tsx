import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Check, ChevronRight, MapPin, Navigation, Plus, Minus, Clock, Calendar } from 'lucide-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
// Correct import for styles
import {styles} from "../Utils/SubscriptionStyles";

// Define order types
const ORDER_TYPES = [
  {
    id: 'one-time',
    title: 'One-Time Order',
    description: 'Single delivery at your convenience',
    icon: 'Clock',
  },
  {
    id: 'subscription',
    title: 'Subscription',
    description: 'Regular deliveries on your schedule',
    icon: 'Calendar',
  }
];

// Subscription frequency options
const SUBSCRIPTION_FREQUENCIES = [
  {
    id: 'daily',
    title: 'Daily Box',
    price: 79.99,
    description: 'Fresh ingredients every day',
    image: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=800&auto=format&fit=crop',
    savingsPercent: '15%',
  },
  {
    id: 'weekly',
    title: 'Weekly Box',
    price: 89.99,
    description: 'Perfect for meal planning',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800&auto=format&fit=crop',
    savingsPercent: '10%',
  },
  {
    id: 'biweekly',
    title: 'Bi-Weekly Box',
    price: 99.99,
    description: 'Flexible delivery schedule',
    image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=800&auto=format&fit=crop',
    savingsPercent: '5%',
  },
];

// Delivery time slots for one-time orders
const DELIVERY_TIME_SLOTS = [
  { id: 'today-morning', text: 'Today, 9am - 12pm', availableIn: '30 min' },
  { id: 'today-afternoon', text: 'Today, 2pm - 5pm', availableIn: '4 hrs' },
  { id: 'today-evening', text: 'Today, 6pm - 9pm', availableIn: '8 hrs' },
  { id: 'tomorrow-morning', text: 'Tomorrow, 9am - 12pm', availableIn: '24 hrs' },
];

// Subscription duration options
const SUBSCRIPTION_DURATIONS = [
  { id: '1-month', text: '1 Month', discountPercent: 0 },
  { id: '3-months', text: '3 Months', discountPercent: 5 },
  { id: '6-months', text: '6 Months', discountPercent: 10 },
  { id: '12-months', text: '12 Months', discountPercent: 15 },
];

// Blinkit-style product data with images and prices
const PRODUCT_CATEGORIES = [
  {
    title: 'Fresh Vegetables',
    products: [
      {
        id: 'veg1',
        name: 'Organic Spinach',
        price: 2.99,
        weight: '250g',
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
      {
        id: 'veg2',
        name: 'Bell Peppers Mix',
        price: 3.49,
        weight: '500g',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
      {
        id: 'veg3',
        name: 'Broccoli',
        price: 2.79,
        weight: '400g',
        image: 'https://images.unsplash.com/photo-1583663848850-46af132dc08e?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
      {
        id: 'veg4',
        name: 'Cherry Tomatoes',
        price: 3.99,
        weight: '300g',
        image: 'https://images.unsplash.com/photo-1546094096-0df4bcabd31c?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
    ]
  },
  {
    title: 'Protein Options',
    products: [
      {
        id: 'protein1',
        name: 'Chicken Breast',
        price: 7.99,
        weight: '500g',
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '15 min'
      },
      {
        id: 'protein2',
        name: 'Salmon Fillet',
        price: 9.99,
        weight: '400g',
        image: 'https://images.unsplash.com/photo-1499125562588-29fb8a56b5d5?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '15 min'
      },
      {
        id: 'protein3',
        name: 'Tofu',
        price: 3.99,
        weight: '350g',
        image: 'https://images.unsplash.com/photo-1583874044705-d37fc6708960?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '15 min'
      },
      {
        id: 'protein4',
        name: 'Free-Range Eggs',
        price: 4.49,
        weight: '12 pcs',
        image: 'https://images.unsplash.com/photo-1511994714008-b6d68a8b32a2?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '15 min'
      },
    ]
  },
  {
    title: 'Healthy Snacks',
    products: [
      {
        id: 'snack1',
        name: 'Mixed Nuts',
        price: 6.99,
        weight: '200g',
        image: 'https://images.unsplash.com/photo-1606937921474-3a7cd8a851ed?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
      {
        id: 'snack2',
        name: 'Greek Yogurt',
        price: 4.49,
        weight: '500g',
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
      {
        id: 'snack3',
        name: 'Granola Bars',
        price: 5.99,
        weight: '6 pcs',
        image: 'https://images.unsplash.com/photo-1578027458176-05cd379b662c?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
      {
        id: 'snack4',
        name: 'Dried Fruits Mix',
        price: 4.29,
        weight: '150g',
        image: 'https://images.unsplash.com/photo-1596810574821-9a71e38cb27d?q=80&w=400&auto=format&fit=crop',
        deliveryTime: '10 min'
      },
    ]
  },
];

export default function Subscription() {
  // State variables
  const [orderType, setOrderType] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [cartItems, setCartItems] = useState({});
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Define default styles as a fallback in case the import fails
  const defaultStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    // Add other default styles here as needed
  });
  
  // Use imported styles with fallback to default styles
  const styleToUse = styles || defaultStyles;
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      try {
        // Get current location
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
        
        // Reverse geocode to get address
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode.length > 0) {
          const addressData = geocode[0];
          // Format address
          const formattedAddress = [
            addressData.name,
            addressData.street,
            addressData.district,
            addressData.city,
            addressData.region,
            addressData.postalCode
          ].filter(Boolean).join(', ');
          
          setAddress(formattedAddress);
        }
      } catch (error) {
        setErrorMsg('Error fetching location');
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshLocation = async () => {
    setLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode.length > 0) {
        const addressData = geocode[0];
        const formattedAddress = [
          addressData.name,
          addressData.street,
          addressData.district,
          addressData.city,
          addressData.region,
          addressData.postalCode
        ].filter(Boolean).join(', ');
        
        setAddress(formattedAddress);
      }
    } catch (error) {
      setErrorMsg('Error refreshing location');
      Alert.alert('Location Error', 'Could not refresh location. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset selection state when order type changes
  useEffect(() => {
    setSelectedFrequency('');
    setSelectedTimeSlot('');
    setSelectedDuration('');
  }, [orderType]);
  
  // Cart functions
  const handleAddToCart = (productId) => {
    setCartItems(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId] -= 1;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const totalItems = Object.values(cartItems).reduce((sum, count) => sum + count, 0);
  
  // Calculate total price based on selection
  const calculateTotal = () => {
    // Sum of all products in cart
    const productTotal = Object.entries(cartItems).reduce((sum, [productId, quantity]) => {
      const allProducts = PRODUCT_CATEGORIES.flatMap(cat => cat.products);
      const product = allProducts.find(p => p.id === productId);
      return sum + (product ? product.price * quantity : 0);
    }, 0);
    
    // Base total is just product total for one-time orders
    if (orderType === 'one-time') {
      return { 
        subtotal: productTotal.toFixed(2),
        total: productTotal.toFixed(2),
        savings: '0.00'
      };
    }
    
    // For subscriptions, apply discounts based on frequency and duration
    if (orderType === 'subscription' && selectedFrequency && selectedDuration) {
      const frequencyOption = SUBSCRIPTION_FREQUENCIES.find(f => f.id === selectedFrequency);
      const durationOption = SUBSCRIPTION_DURATIONS.find(d => d.id === selectedDuration);
      
      if (frequencyOption && durationOption) {
        const frequencySavingsPercent = parseInt(frequencyOption.savingsPercent) / 100;
        const durationDiscountPercent = durationOption.discountPercent / 100;
        
        const frequencySavings = productTotal * frequencySavingsPercent;
        const durationSavings = productTotal * durationDiscountPercent;
        const totalSavings = frequencySavings + durationSavings;
        
        const finalTotal = productTotal - totalSavings;
        
        return {
          subtotal: productTotal.toFixed(2),
          total: finalTotal.toFixed(2),
          savings: totalSavings.toFixed(2)
        };
      }
    }
    
    return { 
      subtotal: productTotal.toFixed(2),
      total: productTotal.toFixed(2),
      savings: '0.00'
    };
  };
  
  const priceInfo = calculateTotal();
  
  // Check if user can proceed to checkout
  const canProceed = () => {
    if (totalItems === 0) return false;
    
    if (orderType === 'one-time') {
      return selectedTimeSlot !== '';
    } else if (orderType === 'subscription') {
      return selectedFrequency !== '' && selectedDuration !== '';
    }
    
    return false;
  };
  
  let locationText = 'Fetching your location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (address) {
    locationText = address;
  }

  // Get icon component based on icon name
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Clock':
        return <Clock size={20} color="#22c55e" />;
      case 'Calendar':
        return <Calendar size={20} color="#22c55e" />;
      default:
        return null;
    }
  };

  // Render product item for horizontal FlatList
  const renderProductItem = ({ item }) => (
    <View style={styleToUse.productCard}>
      <Image source={{ uri: item.image }} style={styleToUse.productImage} />
      <View style={styleToUse.deliveryBadge}>
        <Clock size={12} color="#22c55e" />
        <Text style={styleToUse.deliveryText}>{item.deliveryTime}</Text>
      </View>
      
      <View style={styleToUse.productInfo}>
        <Text numberOfLines={1} style={styleToUse.productName}>{item.name}</Text>
        <Text style={styleToUse.weightText}>{item.weight}</Text>
        
        <View style={styleToUse.priceContainer}>
          <Text style={styleToUse.priceText}>${item.price}</Text>
          
          {cartItems[item.id] ? (
            <View style={styleToUse.quantityControl}>
              <Pressable
                onPress={() => handleRemoveFromCart(item.id)}
                style={styleToUse.quantityButton}
              >
                <Minus size={16} color="#22c55e" />
              </Pressable>
              <Text style={styleToUse.quantityText}>{cartItems[item.id]}</Text>
              <Pressable
                onPress={() => handleAddToCart(item.id)}
                style={styleToUse.quantityButton}
              >
                <Plus size={16} color="#22c55e" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styleToUse.addButton}
              onPress={() => handleAddToCart(item.id)}
            >
              <Plus size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styleToUse.container}>
      {/* Real-time Location Header (Swiggy Style) */}
      <View style={styleToUse.locationContainer}>
        <View style={styleToUse.locationHeader}>
          <MapPin size={20} color="#22c55e" />
          <View style={styleToUse.locationInfo}>
            <Text style={styleToUse.locationTitle}>
              {loading ? 'Detecting location...' : 'Deliver to current location'}
            </Text>
            
            {loading ? (
              <View style={styleToUse.loadingContainer}>
                <ActivityIndicator size="small" color="#22c55e" />
                <Text style={styleToUse.loadingText}>Fetching your location...</Text>
              </View>
            ) : (
              <Text numberOfLines={2} style={styleToUse.locationAddress}>
                {errorMsg ? errorMsg : locationText}
              </Text>
            )}
          </View>
          <Pressable onPress={refreshLocation} style={styleToUse.refreshButton}>
            <Navigation size={20} color="#22c55e" />
          </Pressable>
        </View>
      </View>

      <View style={styleToUse.header}>
        <Text style={styleToUse.title}>Customize Your Box</Text>
        <Text style={styleToUse.subtitle}>
          Choose items for your box and select delivery options
        </Text>
      </View>

      {/* ITEMS SECTION - MOVED TO TOP */}
      <View style={styleToUse.section}>
        <View style={styleToUse.sectionHeaderRow}>
          <Text style={styleToUse.sectionTitle}>Add Items to Your Box</Text>
          <Text style={styleToUse.itemsSelectedText}>
            {totalItems} items selected
          </Text>
        </View>
        
        {PRODUCT_CATEGORIES.map((category) => (
          <View key={category.title} style={styleToUse.categoryContainer}>
            <Text style={styleToUse.categoryTitle}>{category.title}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={category.products}
              renderItem={renderProductItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styleToUse.productList}
            />
          </View>
        ))}
      </View>

      {/* Order Type Selection - MOVED AFTER ITEMS */}
      <View style={styleToUse.section}>
        <Text style={styleToUse.sectionTitle}>Select Order Type</Text>
        <View style={styleToUse.orderTypeContainer}>
          {ORDER_TYPES.map((type) => (
            <Pressable
              key={type.id}
              style={[
                styleToUse.orderTypeCard,
                orderType === type.id && styleToUse.orderTypeCardSelected,
              ]}
              onPress={() => setOrderType(type.id)}>
              <View style={styleToUse.orderTypeIconContainer}>
                {getIcon(type.icon)}
              </View>
              <View style={styleToUse.orderTypeContent}>
                <Text style={styleToUse.orderTypeTitle}>{type.title}</Text>
                <Text style={styleToUse.orderTypeDescription}>{type.description}</Text>
              </View>
              {orderType === type.id && (
                <View style={styleToUse.orderTypeCheckmark}>
                  <Check size={20} color="#22c55e" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* One-Time Order Selection */}
      {orderType === 'one-time' && (
        <View style={styleToUse.section}>
          <Text style={styleToUse.sectionTitle}>Select Delivery Time</Text>
          {DELIVERY_TIME_SLOTS.map((slot) => (
            <Pressable
              key={slot.id}
              style={[
                styleToUse.timeSlotCard,
                selectedTimeSlot === slot.id && styleToUse.timeSlotCardSelected,
              ]}
              onPress={() => setSelectedTimeSlot(slot.id)}>
              <View style={styleToUse.timeSlotContent}>
                <Text style={styleToUse.timeSlotText}>{slot.text}</Text>
                <View style={styleToUse.timeSlotBadge}>
                  <Text style={styleToUse.timeSlotBadgeText}>
                    Available in {slot.availableIn}
                  </Text>
                </View>
              </View>
              {selectedTimeSlot === slot.id && (
                <View style={styleToUse.checkmark}>
                  <Check size={20} color="#22c55e" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Subscription Plan Selection */}
      {orderType === 'subscription' && (
        <>
          <View style={styleToUse.section}>
            <Text style={styleToUse.sectionTitle}>Select Delivery Frequency</Text>
            {SUBSCRIPTION_FREQUENCIES.map((frequency) => (
              <Pressable
                key={frequency.id}
                style={[
                  styleToUse.planCard,
                  selectedFrequency === frequency.id && styleToUse.planCardSelected,
                ]}
                onPress={() => setSelectedFrequency(frequency.id)}>
                <Image source={{ uri: frequency.image }} style={styleToUse.planImage} />
                <View style={styleToUse.savingsBadge}>
                  <Text style={styleToUse.savingsBadgeText}>Save {frequency.savingsPercent}</Text>
                </View>
                <View style={styleToUse.planContent}>
                  <View style={styleToUse.planHeader}>
                    <Text style={styleToUse.planTitle}>{frequency.title}</Text>
                    <Text style={styleToUse.planPrice}>${frequency.price}/box</Text>
                  </View>
                  <Text style={styleToUse.planDescription}>{frequency.description}</Text>
                </View>
                {selectedFrequency === frequency.id && (
                  <View style={styleToUse.checkmark}>
                    <Check size={24} color="#22c55e" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styleToUse.section}>
            <Text style={styleToUse.sectionTitle}>Select Subscription Duration</Text>
            <View style={styleToUse.durationContainer}>
              {SUBSCRIPTION_DURATIONS.map((duration) => (
                <Pressable
                  key={duration.id}
                  style={[
                    styleToUse.durationCard,
                    selectedDuration === duration.id && styleToUse.durationCardSelected,
                  ]}
                  onPress={() => setSelectedDuration(duration.id)}>
                  <Text style={styleToUse.durationText}>{duration.text}</Text>
                  {duration.discountPercent > 0 && (
                    <View style={styleToUse.durationBadge}>
                      <Text style={styleToUse.durationBadgeText}>
                        Save {duration.discountPercent}%
                      </Text>
                    </View>
                  )}
                  {selectedDuration === duration.id && (
                    <View style={styleToUse.smallCheckmark}>
                      <Check size={16} color="#22c55e" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Order Summary */}
      {totalItems > 0 && (
        <View style={styleToUse.summaryContainer}>
          <Text style={styleToUse.summaryTitle}>Order Summary</Text>
          <View style={styleToUse.summaryRow}>
            <Text style={styleToUse.summaryLabel}>Subtotal ({totalItems} items)</Text>
            <Text style={styleToUse.summaryValue}>${priceInfo.subtotal}</Text>
          </View>
          
          {parseFloat(priceInfo.savings) > 0 && (
            <View style={styleToUse.summaryRow}>
              <Text style={styleToUse.savingsLabel}>Savings</Text>
              <Text style={styleToUse.savingsValue}>-${priceInfo.savings}</Text>
            </View>
          )}
          
          <View style={[styleToUse.summaryRow, styleToUse.totalRow]}>
            <Text style={styleToUse.totalLabel}>Total</Text>
            <Text style={styleToUse.totalValue}>${priceInfo.total}</Text>
          </View>
        </View>
      )}

      <View style={styleToUse.footer}>
        <Pressable
          style={[
            styleToUse.button, 
            !canProceed() && styleToUse.buttonDisabled
          ]}
          disabled={!canProceed()}
          onPress={() => {
            if (canProceed()) {
              const paymentParams = {
                orderType,
                selectedFrequency,
                selectedTimeSlot,
                selectedDuration,
                cartItems: JSON.stringify(cartItems), // Serialize objects
                address,
                priceInfo: JSON.stringify(priceInfo), // Serialize objects
                allProducts: JSON.stringify(PRODUCT_CATEGORIES.flatMap(cat => cat.products)), // Serialize arrays
                productCategories: JSON.stringify(PRODUCT_CATEGORIES) // Serialize arrays
              };

              router.push({
                pathname: '/(onboarding)/payments',
                params: paymentParams
              });
            }
          }}>
          <Text style={[
            styleToUse.buttonText, 
            !canProceed() && styleToUse.buttonTextDisabled
          ]}>
            {orderType === 'subscription' ? 'Subscribe Now' : 'Place Order'} (${priceInfo.total})
          </Text>
          <ChevronRight 
            size={20} 
            color={canProceed() ? '#fff' : '#94a3b8'} 
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}