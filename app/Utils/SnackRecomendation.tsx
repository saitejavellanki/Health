import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { db } from '../../components/firebase/Firebase';
import { ShoppingBag, Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function SnackRecommendations({ todaysPlan, addToCart }) {
  const [loading, setLoading] = useState(true);
  const [todaysPick, setTodaysPick] = useState(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchTodaysPick = async () => {
      try {
        let allProducts = [];
        
        // Try to get cached products first
        const cachedData = await AsyncStorage.getItem('productCategories');
        
        if (cachedData) {
          const categories = JSON.parse(cachedData);
          // Flatten all products from all categories
          allProducts = categories.flatMap(cat => cat.products);
        } else {
          // If no cached data, fetch all products from Firebase
          console.log("Fetching all products from Firebase...");
          // Get products from the "products" subcollection
          const productsCollection = collection(db, "productCategories/zLQ1DRXaIDvagLGCNJvc/products");
          const productsSnapshot = await getDocs(productsCollection);
          
          // Get all products and their images
          allProducts = await Promise.all(productsSnapshot.docs.map(async (doc) => {
            const productData = doc.data();
            
            // If the image is a storage path rather than a URL, fetch the download URL
            let imageUrl = productData.image;
            if (imageUrl && (imageUrl.startsWith('gs://') || imageUrl.startsWith('products/'))) {
              try {
                const storage = getStorage();
                // If it's a relative path, prepend the storage path
                if (!imageUrl.startsWith('gs://')) {
                  imageUrl = `products/${imageUrl}`;
                }
                const imageRef = ref(storage, imageUrl);
                imageUrl = await getDownloadURL(imageRef);
              } catch (imageError) {
                console.error(`Error fetching image for product ${doc.id}:`, imageError);
                imageUrl = null; // Set to null so we can use the defaultSource
              }
            }
            
            return {
              id: doc.id,
              ...productData,
              image: imageUrl
            };
          }));
          
          // Cache the products with resolved image URLs
          try {
            await AsyncStorage.setItem('productCategories', JSON.stringify([{
              id: 'zLQ1DRXaIDvagLGCNJvc',
              title: 'Snacks',
              products: allProducts
            }]));
          } catch (cacheError) {
            console.error("Error caching products:", cacheError);
          }
        }
        
        // Check if todaysPlan exists and has snacks
        if (todaysPlan && todaysPlan.sections && todaysPlan.sections.snack && todaysPlan.sections.snack.length > 0) {
          // Get the first snack from today's plan
          const todaysSnack = todaysPlan.sections.snack[0];
          
          // Try to find a matching product based on snack name
          // We'll use a fuzzy match (includes) to be more flexible
          const matchingProducts = allProducts.filter(product => 
            product.name && todaysSnack && 
            (product.name.toLowerCase().includes(todaysSnack.toLowerCase()) || 
             todaysSnack.toLowerCase().includes(product.name.toLowerCase()))
          );
          
          if (matchingProducts.length > 0) {
            // Use the first matching product
            setTodaysPick(matchingProducts[0]);
            setLoading(false);
            return;
          }
          
          // If no match found through simple comparison, try to query Firestore directly
          try {
            const productsCollection = collection(db, "productCategories/zLQ1DRXaIDvagLGCNJvc/products");
            // Create a query to find products that contain the snack name or vice versa
            const snackNameLower = todaysSnack.toLowerCase();
            
            // We can't do complex string operations in Firestore query
            // So we'll fetch a reasonable number of products and filter client side
            const snackProductsQuery = query(productsCollection, limit(20));
            const snackProductsSnapshot = await getDocs(snackProductsQuery);
            
            if (!snackProductsSnapshot.empty) {
              const matchingProducts = [];
              
              for (const doc of snackProductsSnapshot.docs) {
                const productData = doc.data();
                const productName = productData.name ? productData.name.toLowerCase() : '';
                
                // Check if product name contains snack name or vice versa
                if (productName.includes(snackNameLower) || snackNameLower.includes(productName)) {
                  // Handle image URL
                  let imageUrl = productData.image;
                  if (imageUrl && (imageUrl.startsWith('gs://') || imageUrl.startsWith('products/'))) {
                    try {
                      const storage = getStorage();
                      if (!imageUrl.startsWith('gs://')) {
                        imageUrl = `products/${imageUrl}`;
                      }
                      const imageRef = ref(storage, imageUrl);
                      imageUrl = await getDownloadURL(imageRef);
                    } catch (imageError) {
                      console.error(`Error fetching image for product ${doc.id}:`, imageError);
                      imageUrl = null;
                    }
                  }
                  
                  matchingProducts.push({
                    id: doc.id,
                    ...productData,
                    image: imageUrl
                  });
                }
              }
              
              if (matchingProducts.length > 0) {
                setTodaysPick(matchingProducts[0]);
                setLoading(false);
                return;
              }
            }
          } catch (matchError) {
            console.error("Error finding matching product:", matchError);
          }
        }
        
        // Fallback: If no matching product found or no snacks in today's plan, use a random product
        console.log("Falling back to random product selection");
        if (allProducts.length > 0) {
          const randomIndex = Math.floor(Math.random() * allProducts.length);
          setTodaysPick(allProducts[randomIndex]);
        } else {
          // If no products found in cache, try to fetch directly from Firebase
          try {
            const productsCollection = collection(db, "productCategories/zLQ1DRXaIDvagLGCNJvc/products");
            const randomProductQuery = query(productsCollection, limit(1));
            const randomProductSnapshot = await getDocs(randomProductQuery);
            
            if (!randomProductSnapshot.empty) {
              const doc = randomProductSnapshot.docs[0];
              const productData = doc.data();
              
              // Handle image URL
              let imageUrl = productData.image;
              if (imageUrl && (imageUrl.startsWith('gs://') || imageUrl.startsWith('products/'))) {
                try {
                  const storage = getStorage();
                  if (!imageUrl.startsWith('gs://')) {
                    imageUrl = `products/${imageUrl}`;
                  }
                  const imageRef = ref(storage, imageUrl);
                  imageUrl = await getDownloadURL(imageRef);
                } catch (imageError) {
                  console.error(`Error fetching fallback image for product ${doc.id}:`, imageError);
                  imageUrl = null;
                }
              }
              
              setTodaysPick({
                id: doc.id,
                ...productData,
                image: imageUrl
              });
            }
          } catch (fallbackError) {
            console.error("Error fetching fallback today's pick:", fallbackError);
          }
        }
      } catch (error) {
        console.error("Error fetching today's pick:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodaysPick();
  }, [todaysPlan]);
  
  const handleProductPress = (item) => {
    router.push("(tabs)/subscription");
  };
  
  // If component is still loading, show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#22c55e" />
        <Text style={styles.loadingText}>Finding today's pick for you...</Text>
      </View>
    );
  }
  
  // If there's no today's pick, don't render anything
  if (!todaysPick) {
    return null;
  }
  
  // Updated header to indicate whether this is from today's meal plan or a suggestion
  const isFromMealPlan = todaysPlan && 
                         todaysPlan.sections && 
                         todaysPlan.sections.snack && 
                         todaysPlan.sections.snack.length > 0;
  
  // Render today's pick in Zomato-style horizontal card
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Today's Pick</Text>
        <Text style={styles.subtitle}>
          {isFromMealPlan ? 'Based on your meal plan' : 'Selected just for you'}
        </Text>
      </View>
      
      <Pressable
        style={styles.zomatoCard}
        onPress={() => handleProductPress(todaysPick)}
      >
        {/* Left side - Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: todaysPick.image }}
            style={styles.productImage}
            defaultSource={require('../../assets/images/icon.png')}
          />
          <View style={styles.deliveryBadge}>
            <ShoppingBag size={12} color="#22c55e" />
            <Text style={styles.deliveryText}>{todaysPick.deliveryTime || "1 hour"}</Text>
          </View>
        </View>
        
        {/* Right side - Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{todaysPick.name}</Text>
          
          {/* Rating & Time Section */}
          <View style={styles.ratingContainer}>
            <View style={styles.rating}>
              <Star size={12} fill="#22c55e" color="#ffffff" />
              <Text style={styles.ratingText}>4.2</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.timeText}>{todaysPick.deliveryTime || "1 hour"}</Text>
          </View>
          
          <Text style={styles.weightText}>{todaysPick.weight || "100g"}</Text>
          
          <View style={styles.priceActionContainer}>
            <Text style={styles.priceText}>₹{todaysPick.price}</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                // Navigate to payments page
                router.push("(tabs)/subscription");
              }}
            >
              <Text style={styles.addButtonText}>ADD</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  zomatoCard: {
    width: '100%',
    height: 130,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row', // Horizontal layout
    overflow: 'hidden',
  },
  imageContainer: {
    width: '40%',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#f3f4f6',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 10,
    color: '#22c55e',
    marginLeft: 4,
    fontWeight: '500',
  },
  productInfo: {
    width: '60%',
    padding: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 3,
  },
  dotSeparator: {
    fontSize: 14,
    color: '#9ca3af',
    marginHorizontal: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  weightText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  priceActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  }
});