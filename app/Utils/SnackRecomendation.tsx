import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { db } from '../../components/firebase/Firebase';
import { ShoppingBag } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function SnackRecommendations({ todaysPlan, addToCart }) {
  const [loading, setLoading] = useState(true);
  const [recommendedSnacks, setRecommendedSnacks] = useState([]);
  const [showingRandomSnacks, setShowingRandomSnacks] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const fetchRecommendedSnacks = async () => {
      try {
        let matchingProducts = [];
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
        
        // If today's plan exists, try to match snacks
        if (todaysPlan && todaysPlan.sections && todaysPlan.sections.snack) {
          // Get snack names from today's plan
          const snackNames = todaysPlan.sections.snack;
          
          // Filter products that match snack names
          matchingProducts = allProducts.filter(product => {
            return snackNames.some(snackName => 
              product.name.toLowerCase().includes(snackName.toLowerCase())
            );
          });
        }
        
        // If no matching products found, show random snacks
        if (matchingProducts.length === 0) {
          // Randomize the array of all products
          const shuffledProducts = [...allProducts].sort(() => 0.5 - Math.random());
          // Take up to 5 random products
          matchingProducts = shuffledProducts.slice(0, 5);
          setShowingRandomSnacks(true);
        } else {
          setShowingRandomSnacks(false);
        }
        
        setRecommendedSnacks(matchingProducts);
      } catch (error) {
        console.error("Error fetching snacks:", error);
        // In case of error, try to show some random products from Firebase directly
        try {
          const productsCollection = collection(db, "productCategories/zLQ1DRXaIDvagLGCNJvc/products");
          const randomProductsQuery = query(productsCollection, limit(5));
          const randomProductsSnapshot = await getDocs(randomProductsQuery);
          
          // Get random products and their images
          const randomProducts = await Promise.all(randomProductsSnapshot.docs.map(async (doc) => {
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
                console.error(`Error fetching fallback image for product ${doc.id}:`, imageError);
                imageUrl = null;
              }
            }
            
            return {
              id: doc.id,
              ...productData,
              image: imageUrl
            };
          }));
          
          setRecommendedSnacks(randomProducts);
          setShowingRandomSnacks(true);
        } catch (fallbackError) {
          console.error("Error fetching fallback snacks:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendedSnacks();
  }, [todaysPlan]);
  
  const handleProductPress = (item) => {
    router.push("(tabs)/subscription");
  };
  
  // If component is still loading, show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#22c55e" />
        <Text style={styles.loadingText}>Finding snacks for you...</Text>
      </View>
    );
  }
  
  // If there are no recommendations at all, don't render anything
  if (recommendedSnacks.length === 0) {
    return null;
  }
  
  // Render recommended snacks
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          {showingRandomSnacks ? "Popular Snacks" : "Recommended Snacks"}
        </Text>
        <Text style={styles.subtitle}>
          {showingRandomSnacks ? "You might like these" : "Matches with today's plan"}
        </Text>
      </View>
      
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={recommendedSnacks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.productCard}
            onPress={() => handleProductPress(item)}
          >
            {/* Image Component */}
            <Image 
              source={{ uri: item.image }}
             
              style={styles.productImage}
            />
            
            <View style={styles.deliveryBadge}>
              <ShoppingBag size={12} color="#22c55e" />
              <Text style={styles.deliveryText}>{item.deliveryTime || "1 hour"}</Text>
            </View>
            
            <View style={styles.productInfo}>
              <Text numberOfLines={1} style={styles.productName}>{item.name}</Text>
              <Text style={styles.weightText}>{item.weight || "100g"}</Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>₹{item.price}</Text>
                <Pressable
                  style={styles.addButton}
                  onPress={() => addToCart && addToCart(item)}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
        contentContainerStyle={styles.productList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
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
  productList: {
    paddingRight: 8,
  },
  productCard: {
    width: 160,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
    backgroundColor: '#f3f4f6',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  weightText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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