import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator, FlatList } from 'react-native';
import { ChevronRight, MapPin, Navigation, Plus, Minus, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { styles } from "../Utils/SubscriptionStyles";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../components/firebase/Firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OrderComponent() {
  // ======== STATE MANAGEMENT ========
  const [orderType] = useState('one-time');
  const [cartItems, setCartItems] = useState({});
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [productCategories, setProductCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Define default styles as a fallback
  const defaultStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    // Add other default styles here as needed
  });
  
  // Use imported styles with fallback to default styles
  const styleToUse = styles || defaultStyles;
  
  // ======== DATA FETCHING WITH CACHE ========
  useEffect(() => {
    const fetchProductsWithCache = async () => {
      setLoadingProducts(true);
      
      try {
        // Try to get products from cache first
        const cachedData = await AsyncStorage.getItem('productCategories');
        const cacheTimestamp = await AsyncStorage.getItem('productCategoriesTimestamp');
        const currentTime = new Date().getTime();
        
        // Check if we have valid cached data (less than 1 hour old)
        const CACHE_VALIDITY_PERIOD = 60 * 60 * 1000; // 1 hour in milliseconds
        const isCacheValid = cachedData && cacheTimestamp && 
                            (currentTime - parseInt(cacheTimestamp) < CACHE_VALIDITY_PERIOD);
        
        if (isCacheValid) {
          console.log("Using cached product data");
          setProductCategories(JSON.parse(cachedData));
          setLoadingProducts(false);
          return;
        }
        
        // If no valid cache, fetch from Firebase
        console.log("Cache invalid or missing, fetching from Firebase...");
        
        // Get the single productCategories document with ID "zLQ1DRXaIDvagLGCNJvc"
        const categoryId = "zLQ1DRXaIDvagLGCNJvc";
        const categoryTitle = "Fruits";
        
        console.log(`Fetching products for category ID: ${categoryId}`);
        
        // Get the "products" subcollection directly
        const productsCollection = collection(db, `productCategories/${categoryId}/products`);
        const productsSnapshot = await getDocs(productsCollection);
        
        console.log(`Found ${productsSnapshot.docs.length} products in the products subcollection`);
        
        // Process products data
        const productsData = productsSnapshot.docs.map(doc => {
          const productData = doc.data();
          return {
            id: doc.id,
            ...productData
          };
        });
        
        // Create a category object with the products
        const categoryData = {
          id: categoryId,
          title: categoryTitle,
          products: productsData
        };
        
        // Set state with an array containing this single category
        const categoriesArray = [categoryData];
        setProductCategories(categoriesArray);
        
        // Save to cache
        await AsyncStorage.setItem('productCategories', JSON.stringify(categoriesArray));
        await AsyncStorage.setItem('productCategoriesTimestamp', currentTime.toString());
        
        console.log("Product data fetched and cached successfully");
      } catch (error) {
        console.error("Error fetching products:", error);
        console.error("Error stack:", error.stack);
        Alert.alert(
          "Error Loading Products", 
          "Please check your internet connection and try again. Error: " + error.message
        );
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProductsWithCache();
  }, []);

  // ======== LOCATION HANDLING ========
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
  
  // ======== CACHE MANAGEMENT ========
  const clearProductCache = async () => {
    try {
      await AsyncStorage.removeItem('productCategories');
      await AsyncStorage.removeItem('productCategoriesTimestamp');
      console.log("Product cache cleared");
      Alert.alert("Cache Cleared", "Product data will be refreshed on next load");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  };
  
  // ======== CART FUNCTIONS ========
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

  // ======== CALCULATIONS ========
  const totalItems = Object.values(cartItems).reduce((sum, count) => sum + count, 0);
  
  const calculateTotal = () => {
    // Sum of all products in cart
    const productTotal = Object.entries(cartItems).reduce((sum, [productId, quantity]) => {
      const allProducts = productCategories.flatMap(cat => cat.products);
      const product = allProducts.find(p => p.id === productId);
      return sum + (product ? product.price * quantity : 0);
    }, 0);
    
    return { 
      subtotal: productTotal.toFixed(2),
      total: productTotal.toFixed(2),
      savings: '0.00'
    };
  };
  
  const priceInfo = calculateTotal();
  const canProceed = totalItems > 0;
  
  let locationText = 'Fetching your location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (address) {
    locationText = address;
  }

  // ======== COMPONENT RENDERING ========
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
          <Text style={styleToUse.priceText}>₹{item.price}</Text>
          
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

  // ======== NAVIGATION HANDLER ========
  const handleOrderNow = () => {
    if (canProceed) {
      const paymentParams = {
        orderType,
        cartItems: JSON.stringify(cartItems),
        address,
        priceInfo: JSON.stringify(priceInfo),
        allProducts: JSON.stringify(productCategories.flatMap(cat => cat.products)),
      };

      router.push({
        pathname: '/Screens/payments',
        params: paymentParams
      });
    }
  };

  // ======== MAIN RENDER ========
  return (
    <ScrollView style={styleToUse.container}>
      {/* Real-time Location Header */}
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

      {/* App Header */}
      <View style={styleToUse.header}>
        <Text style={styleToUse.title}>
          Order from Crunch<Text style={{color: 'red'}}>X</Text> Approved
        </Text>
        <Text style={styleToUse.subtitle}>
          We don't offer food from third-party vendors. All items are 100% Crunch<Text style={{color: 'red'}}>X</Text> approved and made in-house.
        </Text>
      </View>
      
      {/* Items Section */}
      <View style={styleToUse.section}>
        <View style={styleToUse.sectionHeaderRow}>
          <Text style={styleToUse.sectionTitle}>Items</Text>
          <Text style={styleToUse.itemsSelectedText}>
            {totalItems} items selected
          </Text>
        </View>
        
        {loadingProducts ? (
          <View style={styleToUse.loadingProductsContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styleToUse.loadingText}>Loading products...</Text>
          </View>
        ) : (
          productCategories.map((category) => (
            <View key={category.id} style={styleToUse.categoryContainer}>
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
          ))
        )}
      </View>

      {/* Order Summary - Only show if items in cart */}
      {totalItems > 0 && (
        <View style={styleToUse.summaryContainer}>
          <Text style={styleToUse.summaryTitle}>Order Summary</Text>
          <View style={styleToUse.summaryRow}>
            <Text style={styleToUse.summaryLabel}>Subtotal ({totalItems} items)</Text>
            <Text style={styleToUse.summaryValue}>₹{priceInfo.subtotal}</Text>
          </View>
          
          {parseFloat(priceInfo.savings) > 0 && (
            <View style={styleToUse.summaryRow}>
              <Text style={styleToUse.savingsLabel}>Savings</Text>
              <Text style={styleToUse.savingsValue}>-₹{priceInfo.savings}</Text>
            </View>
          )}
          
          <View style={[styleToUse.summaryRow, styleToUse.totalRow]}>
            <Text style={styleToUse.totalLabel}>Total</Text>
            <Text style={styleToUse.totalValue}>₹{priceInfo.total}</Text>
          </View>
        </View>
      )}

      {/* Footer with Order Button */}
      <View style={styleToUse.footer}>
        <Pressable
          style={[
            styleToUse.button, 
            !canProceed && styleToUse.buttonDisabled
          ]}
          disabled={!canProceed}
          onPress={handleOrderNow}
        >
          <Text style={[
            styleToUse.buttonText, 
            !canProceed && styleToUse.buttonTextDisabled
          ]}>
            Order Now (₹{priceInfo.total})
          </Text>
          <ChevronRight 
            size={20} 
            color={canProceed ? '#fff' : '#94a3b8'} 
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}