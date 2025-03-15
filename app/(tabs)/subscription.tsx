import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator, FlatList } from 'react-native';
import { ChevronRight, MapPin, Navigation, Plus, Minus, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
// Correct import for styles
import {styles} from "../Utils/SubscriptionStyles";
// Import Firebase
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../components/firebase/Firebase'; // Make sure this points to your Firebase config file

export default function OrderComponent() {
  // State variables - setting one-time order as default
  const [orderType] = useState('one-time');
  const [cartItems, setCartItems] = useState({});
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [productCategories, setProductCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
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
  
  // Fetch products from Firebase
  useEffect(() => {
    // Fixed fetchProducts function for your exact Firebase structure
const fetchProducts = async () => {
  setLoadingProducts(true);
  try {
    console.log("Starting product fetch for exact Firebase structure...");
    
    // Get the single productCategories document with ID "zLQ1DRXaIDvagLGCNJvc"
    const categoryId = "zLQ1DRXaIDvagLGCNJvc";
    const categoryTitle = "Fruits"; // You might want to adjust this based on your preferred title
    
    console.log(`Fetching products for category ID: ${categoryId}`);
    
    // Get the "products" subcollection directly
    const productsCollection = collection(db, `productCategories/${categoryId}/products`);
    const productsSnapshot = await getDocs(productsCollection);
    
    console.log(`Found ${productsSnapshot.docs.length} products in the products subcollection`);
    
    // Process products data
    const productsData = productsSnapshot.docs.map(doc => {
      const productData = doc.data();
      console.log(`Product ${doc.id}: ${productData.name}, Price: ${productData.price}`);
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
    
    console.log(`Processed category with ${productsData.length} products`);
    console.log("Category data:", JSON.stringify(categoryData, null, 2));
    
    // Set state with an array containing this single category
    setProductCategories([categoryData]);
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
    
    fetchProducts();
  }, []);

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
  
  // Check if user can proceed to checkout
  const canProceed = totalItems > 0;
  
  let locationText = 'Fetching your location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (address) {
    locationText = address;
  }

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

      <View style={styleToUse.header}>
        <Text style={styleToUse.title}>
          Order from Crunch<Text style={{color: 'red'}}>X</Text> Approved
        </Text>
        <Text style={styleToUse.subtitle}>
          We don't offer food from third-party vendors. All items are 100% Crunch<Text style={{color: 'red'}}>X</Text> approved and made in-house.
        </Text>
      </View>
      
      {/* ITEMS SECTION */}
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

      <View style={styleToUse.footer}>
        <Pressable
          style={[
            styleToUse.button, 
            !canProceed && styleToUse.buttonDisabled
          ]}
          disabled={!canProceed}
          onPress={() => {
            if (canProceed) {
              const paymentParams = {
                orderType,
                cartItems: JSON.stringify(cartItems),
                address,
                priceInfo: JSON.stringify(priceInfo),
                allProducts: JSON.stringify(productCategories.flatMap(cat => cat.products)),
              };

              router.push({
                pathname: '/(onboarding)/payments',
                params: paymentParams
              });
            }
          }}>
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