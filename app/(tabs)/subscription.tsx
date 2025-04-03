import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { ChevronRight, MapPin, Navigation, Plus, Minus, Clock, RefreshCw } from 'lucide-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { styles } from "../Utils/SubscriptionStyles";
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../components/firebase/Firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
  const [isInServiceArea, setIsInServiceArea] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
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
  
  // Gachibowli, Hyderabad coordinates
  const GACHIBOWLI_COORDS = {
    latitude: 17.4400,
    longitude: 78.3489
  };
  
  // Service radius in kilometers
  const SERVICE_RADIUS = 10;
  
  // Function to calculate distance between two coordinates in km (using Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };
  
  // ======== IMAGE CACHING SYSTEM ========
  const cacheDirectory = FileSystem.cacheDirectory + 'images/';
  
  // Ensure cache directory exists
  useEffect(() => {
    (async () => {
      const dirInfo = await FileSystem.getInfoAsync(cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true });
      }
    })();
  }, []);
  
  // Function to cache an image
  const cacheImage = async (uri) => {
    try {
      // Create a unique filename based on the URI
      const filename = uri.split('/').pop();
      const path = cacheDirectory + filename;
      
      // Check if the file already exists in cache
      const fileInfo = await FileSystem.getInfoAsync(path);
      
      if (fileInfo.exists) {
        // Image is already cached
        return { uri: path };
      }
      
      // Download the image
      const downloadResult = await FileSystem.downloadAsync(uri, path);
      
      if (downloadResult.status === 200) {
        // Return the local URI of the cached image
        return { uri: path };
      }
      
      // If download failed, return the original URI
      return { uri };
    } catch (error) {
      console.error("Error caching image:", error);
      return { uri }; // Return original on error
    }
  };
  
  // Function to get an image from cache or load it
  const getImageUri = async (uri) => {
    if (!uri) return null;
    
    // Check if we already have this image in our state cache
    if (imageCache[uri]) {
      return imageCache[uri];
    }
    
    // Try to load from file cache
    const cachedImage = await cacheImage(uri);
    
    // Update the state cache
    setImageCache(prev => ({
      ...prev,
      [uri]: cachedImage.uri
    }));
    
    return cachedImage.uri;
  };
  
  // Load initial image cache from storage
  useEffect(() => {
    (async () => {
      try {
        const storedImageCache = await AsyncStorage.getItem('imageCache');
        if (storedImageCache) {
          setImageCache(JSON.parse(storedImageCache));
        }
      } catch (error) {
        console.error("Error loading image cache:", error);
      }
    })();
  }, []);
  
  // Save image cache to storage when it changes
  useEffect(() => {
    if (Object.keys(imageCache).length > 0) {
      AsyncStorage.setItem('imageCache', JSON.stringify(imageCache));
    }
  }, [imageCache]);
  
  // Pre-cache all product images after loading products
  useEffect(() => {
    if (productCategories.length > 0) {
      const allProducts = productCategories.flatMap(cat => cat.products);
      
      // Start pre-caching images in the background
      (async () => {
        for (const product of allProducts) {
          if (product.image && !imageCache[product.image]) {
            await getImageUri(product.image);
          }
        }
      })();
    }
  }, [productCategories]);
  
  // ======== IMPROVED DATA FETCHING WITH REAL-TIME UPDATES ========
  // Function to process products snapshot into categories
  const processProductsSnapshot = (snapshot) => {
    // Create a map to group products by category
    const categoriesMap = new Map();
    
    // Process each product and group by its actual category from Firestore
    snapshot.docs.forEach(doc => {
      const productData = doc.data();
      // Get the category from the product data
      const category = productData.category || "Uncategorized";
      
      console.log(`Product: ${productData.name}, Category: ${category}`);
      
      // Check if we already have this category in our map
      if (!categoriesMap.has(category)) {
        // Create a new category if it doesn't exist
        categoriesMap.set(category, {
          id: category.toLowerCase().replace(/\s+/g, '-'),
          title: category,
          products: []
        });
      }
      
      // Add product to its category
      categoriesMap.get(category).products.push({
        id: doc.id,
        ...productData
      });
    });
    
    // Convert the map to an array of categories
    let categoriesArray = Array.from(categoriesMap.values());
    
    // Filter out empty categories and sort alphabetically
    categoriesArray = categoriesArray
      .filter(category => category.products.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title));
    
    console.log("Categories found:", categoriesArray.map(c => c.title).join(", "));
    console.log("Product counts by category:", 
      categoriesArray.map(c => `${c.title}: ${c.products.length}`).join(", "));
    
    return categoriesArray;
  };
  
  // Set up real-time listener for product updates
  useEffect(() => {
    setLoadingProducts(true);
    
    // Get products collection reference
    const productsCollection = collection(db, 'products');
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(productsCollection, 
      (snapshot) => {
        console.log(`Received real-time update with ${snapshot.docs.length} products`);
        
        // Process the snapshot into categories
        const categoriesArray = processProductsSnapshot(snapshot);
        
        // Update state with the latest data
        setProductCategories(categoriesArray);
        setLoadingProducts(false);
        
        // Save to cache for offline use
        AsyncStorage.setItem('productCategories', JSON.stringify(categoriesArray));
        AsyncStorage.setItem('productCategoriesTimestamp', new Date().getTime().toString());
        
        console.log("Product data updated from real-time listener");
      },
      (error) => {
        console.error("Error in real-time products listener:", error);
        Alert.alert(
          "Error Loading Products", 
          "Please check your internet connection and try again. Error: " + error.message
        );
        setLoadingProducts(false);
        
        // Try to load from cache if available
        loadProductsFromCache();
      }
    );
    
    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, []);
  
  // Function to load products from cache
  const loadProductsFromCache = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('productCategories');
      if (cachedData) {
        console.log("Loading products from cache as fallback");
        setProductCategories(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error("Error loading cached products:", error);
    }
  };

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
        
        // Check if user is within service area
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          GACHIBOWLI_COORDS.latitude,
          GACHIBOWLI_COORDS.longitude
        );
        
        setIsInServiceArea(distance <= SERVICE_RADIUS);
        console.log(`Distance from Gachibowli: ${distance.toFixed(2)} km`);
        console.log(`In service area: ${distance <= SERVICE_RADIUS}`);
        
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
      
      // Check if user is within service area
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        GACHIBOWLI_COORDS.latitude,
        GACHIBOWLI_COORDS.longitude
      );
      
      setIsInServiceArea(distance <= SERVICE_RADIUS);
      console.log(`Distance from Gachibowli: ${distance.toFixed(2)} km`);
      console.log(`In service area: ${distance <= SERVICE_RADIUS}`);
      
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

  // ======== OPTIMIZED PRODUCT RENDERING ========
  const OptimizedImage = ({ source, style, fallback }) => {
    const [imageSource, setImageSource] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      let isMounted = true;
      
      const loadImage = async () => {
        if (!source) {
          setIsLoading(false);
          setHasError(true);
          return;
        }
        
        try {
          const cachedUri = await getImageUri(source.uri);
          if (isMounted) {
            setImageSource({ uri: cachedUri });
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error loading image:", error);
          if (isMounted) {
            setIsLoading(false);
            setHasError(true);
          }
        }
      };
      
      loadImage();
      
      return () => {
        isMounted = false;
      };
    }, [source]);
    
    if (isLoading) {
      return (
        <View style={[style, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      );
    }
    
    if (hasError) {
      return (
        <View style={[style, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>No Image</Text>
        </View>
      );
    }
    
    return (
      <Image 
        source={imageSource} 
        style={style} 
        resizeMode="cover"
        defaultSource={fallback}  // Fallback image
      />
    );
  };
  
  // ======== CACHE MANAGEMENT ========
  const clearAllCache = async () => {
    try {
      // Clear product cache
      await AsyncStorage.removeItem('productCategories');
      await AsyncStorage.removeItem('productCategoriesTimestamp');
      
      // Clear image cache in AsyncStorage
      await AsyncStorage.removeItem('imageCache');
      
      // Clear file system image cache
      await FileSystem.deleteAsync(cacheDirectory, { idempotent: true });
      await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true });
      
      // Reset state
      setImageCache({});
      
      console.log("All caches cleared");
      Alert.alert("Cache Cleared", "All data will be refreshed immediately");
      
      // Products will be refreshed automatically by the real-time listener
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  };
  
  // Pull to refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await clearAllCache();
      // Note: No need to fetch products manually as the real-time listener will update automatically
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);
  
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
  const canProceed = totalItems > 0 && isInServiceArea;
  
  let locationText = 'Fetching your location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (address) {
    locationText = address;
  }

  // ======== MODIFIED PRODUCT RENDERING ========
  const renderProductItem = ({ item }) => (
    <View style={styleToUse.productCard}>
      <OptimizedImage 
        source={{ uri: item.image }} 
        style={styleToUse.productImage}
        fallback={require('../../assets/images/icon.png')} // Add a placeholder image to your assets
      />
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
              disabled={!isInServiceArea}
            >
              <Plus size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
  
  // ======== OPTIMIZED FLATLIST RENDERING ========
  const renderCategoryProducts = (category) => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={category.products}
      renderItem={renderProductItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styleToUse.productList}
      initialNumToRender={3}  // Limit initial render count
      maxToRenderPerBatch={5} // Limit items per batch
      windowSize={3}          // Reduce window size for better performance
      removeClippedSubviews={true} // Remove items that are outside of the viewport
      getItemLayout={(data, index) => (
        // Pre-calculate item dimensions to improve rendering speed
        {length: 160, offset: 160 * index, index}
      )}
    />
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

  // ======== COMING SOON MESSAGE ========
  const renderComingSoonMessage = () => (
    <View style={{
      padding: 20,
      margin: 20,
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: '#22c55e',
        marginBottom: 10,
        textAlign: 'center'
      }}>
        Coming Soon!
      </Text>
      <Text style={{
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 15
      }}>
        We're not yet available in your area. Currently, we're only serving within a 10 km radius of Gachibowli, Hyderabad.
      </Text>
      <Text style={{
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center'
      }}>
        We're expanding soon! Stay tuned for updates.
      </Text>
    </View>
  );

  // ======== MAIN RENDER ========
  return (
    <ScrollView 
      style={styleToUse.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#22c55e"]}
          tintColor="#22c55e"
        />
      }
    >
      {/* Real-time Location Header */}
      <View style={styleToUse.locationContainer}>
        <View style={styleToUse.locationHeader}>
          <MapPin size={20} color={isInServiceArea ? "#22c55e" : "#ef4444"} />
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
      
      {/* Service Area Check */}
      {!loading && !isInServiceArea ? (
        renderComingSoonMessage()
      ) : (
        <>
          {/* Items Section */}
          <View style={styleToUse.section}>
            <View style={styleToUse.sectionHeaderRow}>
              <Text style={styleToUse.sectionTitle}>Items</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styleToUse.itemsSelectedText}>
                  {totalItems} items selected
                </Text>
                <Pressable 
                  onPress={clearAllCache} 
                  style={{
                    marginLeft: 10,
                    padding: 5,
                    borderRadius: 4,
                    backgroundColor: '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <RefreshCw size={14} color="#22c55e" />
                  <Text style={{color: '#22c55e', fontSize: 12, marginLeft: 4}}>Refresh</Text>
                </Pressable>
              </View>
            </View>
            
            {loadingProducts ? (
              <View style={styleToUse.loadingProductsContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styleToUse.loadingText}>Loading products...</Text>
              </View>
            ) : productCategories.length === 0 ? (
              // No products found
              <View style={styleToUse.noProductsContainer}>
                <Text style={styleToUse.noProductsText}>
                  No products found. Please try refreshing.
                </Text>
                <Pressable 
                  style={styleToUse.refreshButton}
                  onPress={clearAllCache}
                >
                  <Text style={styleToUse.refreshButtonText}>Refresh Products</Text>
                </Pressable>
              </View>
            ) : (
              // Display product categories
              productCategories.map((category) => (
                <View key={category.id} style={styleToUse.categoryContainer}>
                  <Text style={styleToUse.categoryTitle}>{category.title}</Text>
                  {renderCategoryProducts(category)}
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
                {isInServiceArea ? `Order Now (₹${priceInfo.total})` : "Not Available In Your Area"}
              </Text>
              <ChevronRight 
                size={20} 
                color={canProceed ? '#fff' : '#94a3b8'} 
              />
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}