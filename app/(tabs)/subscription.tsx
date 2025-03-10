import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { Check, ChevronRight, MapPin, Navigation, Plus, Minus } from 'lucide-react-native';
import * as Location from 'expo-location';

const SUBSCRIPTION_TYPES = [
  {
    id: 'weekly',
    title: 'Weekly Box',
    price: 89.99,
    description: 'Perfect for meal planning',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'biweekly',
    title: 'Bi-Weekly Box',
    price: 99.99,
    description: 'Flexible delivery schedule',
    image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=800&auto=format&fit=crop',
  },
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
  const [selectedType, setSelectedType] = useState('');
  const [cartItems, setCartItems] = useState({});
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
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
  
  let locationText = 'Fetching your location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (address) {
    locationText = address;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Real-time Location Header (Swiggy Style) */}
      <View style={styles.locationContainer}>
        <View style={styles.locationHeader}>
          <MapPin size={20} color="#22c55e" />
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              {loading ? 'Detecting location...' : 'Deliver to current location'}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#22c55e" />
                <Text style={styles.loadingText}>Fetching your location...</Text>
              </View>
            ) : (
              <Text numberOfLines={2} style={styles.locationAddress}>
                {errorMsg ? errorMsg : locationText}
              </Text>
            )}
          </View>
          <Pressable onPress={refreshLocation} style={styles.refreshButton}>
            <Navigation size={20} color="#22c55e" />
          </Pressable>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Customize Your Box</Text>
        <Text style={styles.subtitle}>
          Choose your preferred subscription and add products to your box
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Your Plan</Text>
        {SUBSCRIPTION_TYPES.map((type) => (
          <Pressable
            key={type.id}
            style={[
              styles.planCard,
              selectedType === type.id && styles.planCardSelected,
            ]}
            onPress={() => setSelectedType(type.id)}>
            <Image source={{ uri: type.image }} style={styles.planImage} />
            <View style={styles.planContent}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{type.title}</Text>
                <Text style={styles.planPrice}>${type.price}/box</Text>
              </View>
              <Text style={styles.planDescription}>{type.description}</Text>
            </View>
            {selectedType === type.id && (
              <View style={styles.checkmark}>
                <Check size={24} color="#22c55e" />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Blinkit-style product grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Items to Your Box</Text>
        <Text style={styles.itemsSelectedText}>
          {totalItems} items selected
        </Text>
        
        {PRODUCT_CATEGORIES.map((category) => (
          <View key={category.title} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.productGrid}>
              {category.products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.deliveryBadge}>
                    <Text style={styles.deliveryText}>
                      {product.deliveryTime}
                    </Text>
                  </View>
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.priceText}>${product.price}</Text>
                    <Text style={styles.weightText}>{product.weight}</Text>
                    <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
                  </View>
                  
                  {cartItems[product.id] ? (
                    <View style={styles.quantityControl}>
                      <Pressable
                        onPress={() => handleRemoveFromCart(product.id)}
                        style={styles.quantityButton}
                      >
                        <Minus size={18} color="#22c55e" />
                      </Pressable>
                      <Text style={styles.quantityText}>{cartItems[product.id]}</Text>
                      <Pressable
                        onPress={() => handleAddToCart(product.id)}
                        style={styles.quantityButton}
                      >
                        <Plus size={18} color="#22c55e" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addButton}
                      onPress={() => handleAddToCart(product.id)}
                    >
                      <Text style={styles.addButtonText}>ADD</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button, 
            (!selectedType || totalItems === 0) && styles.buttonDisabled
          ]}
          disabled={!selectedType || totalItems === 0}>
          <Text style={[
            styles.buttonText, 
            (!selectedType || totalItems === 0) && styles.buttonTextDisabled
          ]}>
            Continue to Payment ({totalItems} items)
          </Text>
          <ChevronRight 
            size={20} 
            color={selectedType && totalItems > 0 ? '#fff' : '#94a3b8'} 
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Location styles (Swiggy-inspired)
  locationContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // Extra padding for status bar
  },
  locationInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  locationTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1a1a1a',
  },
  locationAddress: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  // Original styles
  header: {
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  section: {
    padding: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  itemsSelectedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#22c55e',
  },
  planImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  planContent: {
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
  },
  planPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#22c55e',
  },
  planDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  // Blinkit-style product grid
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 12,
    marginLeft: 4,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 1,
  },
  deliveryText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    marginBottom: 8,
  },
  priceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1a1a1a',
  },
  weightText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  productName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#1a1a1a',
    height: 40,
  },
  addButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#22c55e',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#22c55e',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
});