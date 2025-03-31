import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  StatusBar,
  StyleSheet,
  Modal,
  Share,
  Alert,
  Platform
} from 'react-native';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import InstagramShareModal, { ShareableContent } from '../Utils/InstagramShareModal';

const MemoryGalleryScreen = () => {
  const router = useRouter();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [igShareVisible, setIgShareVisible] = useState(false);
  const isFocused = useIsFocused();
  const windowWidth = Dimensions.get('window').width;
  const lastFetchTimeRef = useRef(null);
  const memoriesRef = useRef([]);
  
  // Change to 2 columns with staggered layout for a more organic look
  const numColumns = 2;
  const spacing = 12;
  const itemWidth = (windowWidth - (spacing * (numColumns + 1))) / numColumns;
  
  useEffect(() => {
    // On first load, try to get data from cache first
    if (!initialLoadDone) {
      loadCachedMemories().then(cached => {
        if (cached) {
          // If we have cached data, show it immediately
          setLoading(false);
          setInitialLoadDone(true);
          
          // Check if we need to refresh from Firestore (if last fetch was > 5 minutes ago)
          const now = Date.now();
          const lastFetchTime = lastFetchTimeRef.current;
          if (!lastFetchTime || (now - lastFetchTime) > 5 * 60 * 1000) {
            loadUserFoodMemories(false); // false = don't show loading indicator
            lastFetchTimeRef.current = now;
          }
        } else {
          // If no cache, fetch from Firestore with loading indicator
          loadUserFoodMemories(true);
          setInitialLoadDone(true);
        }
      });
    } else if (isFocused) {
      // On subsequent focuses, check if we need to refresh
      const now = Date.now();
      if (!lastFetchTimeRef.current || (now - lastFetchTimeRef.current) > 5 * 60 * 1000) {
        loadUserFoodMemories(false); // Refresh without loading indicator
        lastFetchTimeRef.current = now;
      }
    }
  }, [isFocused, initialLoadDone]);
  
  // Filter effect - this doesn't need to refetch from Firestore
  useEffect(() => {
    if (memories.length > 0) {
      // Just re-filter the memories we already have
      getFilteredMemories();
    }
  }, [selectedFilter]);
  
  // Load memories from AsyncStorage cache
  const loadCachedMemories = async () => {
    try {
      const cachedData = await AsyncStorage.getItem('userMemoriesCache');
      if (cachedData) {
        const { memories: cachedMemories, timestamp } = JSON.parse(cachedData);
        // Check if cache is less than 1 hour old
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          setMemories(cachedMemories);
          memoriesRef.current = cachedMemories;
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading cached memories:', error);
      return false;
    }
  };
  
  // Save memories to AsyncStorage cache
  const cacheMemories = async (memoriesToCache) => {
    try {
      const cacheData = {
        memories: memoriesToCache,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('userMemoriesCache', JSON.stringify(cacheData));
      memoriesRef.current = memoriesToCache;
    } catch (error) {
      console.error('Error caching memories:', error);
    }
  };
  
  const loadUserFoodMemories = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }
      
      // Query meals collection for this user
      const mealsRef = collection(db, 'meals');
      const userMealsQuery = query(
        mealsRef, 
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(userMealsQuery);
      
      // Process meal documents
      const userMeals = [];
      
      querySnapshot.forEach((doc) => {
        const mealData = doc.data();
        
        // Format date
        const timestamp = mealData.timestamp?.toDate();
        const formattedDate = timestamp ? formatDate(timestamp) : 'Unknown date';
        
        userMeals.push({
          id: doc.id,
          foodName: mealData.foodName || 'Unknown food',
          calories: mealData.calories || 0,
          junk: mealData.junk || 0,
          image: mealData.image,
          timestamp,
          formattedDate,
          // Add random height variation for staggered effect
          heightRatio: Math.random() * 0.4 + 1.0
        });
      });
      
      setMemories(userMeals);
      
      // Cache the fetched data
      cacheMemories(userMeals);
      
      if (showLoading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading food memories:', error);
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  // Add a new food memory with image to Firestore and update cache
  const addFoodMemory = async (imageUri, foodData) => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      const storage = getStorage();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // First upload the image to Firebase Storage
      const imageBlob = await fetchImageAsBlob(imageUri);
      const storageRef = ref(storage, `foodImages/${userId}/${Date.now()}.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, imageBlob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress tracking if needed
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload is ${progress}% done`);
          },
          (error) => {
            // Handle error
            console.error('Error uploading image:', error);
            reject(error);
          },
          async () => {
            // Upload completed, get download URL
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Add meal data to Firestore
              const mealData = {
                userId,
                foodName: foodData.foodName || 'Unknown food',
                calories: foodData.calories || 0,
                junk: foodData.junk || 0,
                image: downloadURL,
                timestamp: serverTimestamp()
              };
              
              const docRef = await addDoc(collection(db, 'meals'), mealData);
              
              // Add the new meal to our local cache
              const newMemory = {
                id: docRef.id,
                ...mealData,
                timestamp: new Date(),
                formattedDate: formatDate(new Date()),
                heightRatio: Math.random() * 0.4 + 1.0
              };
              
              // Update the state and cache with the new memory
              const updatedMemories = [newMemory, ...memoriesRef.current];
              setMemories(updatedMemories);
              cacheMemories(updatedMemories);
              
              resolve(newMemory);
            } catch (error) {
              console.error('Error adding meal to Firestore:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error in addFoodMemory:', error);
      throw error;
    }
  };
  
  // Convert image URI to blob for upload
  const fetchImageAsBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };
  
  // Simple date formatter
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Filter meals based on time periods
  const getFilteredMemories = () => {
    if (selectedFilter === 'all') return memories;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (selectedFilter === 'today') {
      return memories.filter(item => 
        item.timestamp && item.timestamp >= today
      );
    } else if (selectedFilter === 'month') {
      return memories.filter(item => 
        item.timestamp && item.timestamp >= monthStart
      );
    }
    
    return memories;
  };
  
  // Handler for going back
  const handleGoBack = () => {
    router.back();
  };
  
  // Open full screen image modal
  const openFullImage = (item) => {
    setSelectedImage(item.image);
    setModalVisible(true);
  };
  
  // Navigate to camera screen with callback for saving new images
  const navigateToCamera = () => {
    router.push({
      pathname: '/Screens/CalorieTrackerScreen',
      params: {
        onImageCaptured: (imageUri, foodData) => {
          // This function will be called from the CalorieTrackerScreen
          // after a photo is taken and processed
          return addFoodMemory(imageUri, foodData);
        }
      }
    });
  };
  
  // Share all images
  const shareImages = () => {
    const filteredMemories = getFilteredMemories();
    
    console.log('Memories to share:', filteredMemories.length);
    console.log('First memory sample:', filteredMemories.length > 0 ? filteredMemories[0] : 'No memories');
    
    if (filteredMemories.length === 0) {
      Alert.alert('No Images', 'There are no images to share.');
      return;
    }
    
    // Show the Instagram share modal
    setIgShareVisible(true);
  };
  
  // Render memory item with staggered layout
  const renderMemoryItem = ({ item, index }) => {
    const isEven = index % 2 === 0;
    const marginTop = isEven ? 0 : spacing;
    
    return (
      <TouchableOpacity 
        style={[
          styles.memoryItem,
          { 
            width: itemWidth, 
            height: itemWidth * item.heightRatio,
            marginTop: marginTop
          }
        ]}
        onPress={() => openFullImage(item)}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: item.image }} 
          style={styles.memoryImage}
          resizeMode="cover"
        />
        
        {/* Small calorie indicator in the bottom right corner */}
        <View style={styles.calorieIndicator}>
          <Feather name="zap" size={12} color="#ffffff" style={{ marginRight: 2 }} />
          <Text style={styles.calorieText}>
            {item.calories}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Empty state component
  const EmptyMemoriesState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="camera-off" size={50} color="#6b7280" />
      <Text style={styles.emptyText}>
        No food memories yet
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={navigateToCamera}
      >
        <Feather name="camera" size={16} color="#ffffff" style={{ marginRight: 8 }} />
        <Text style={styles.addButtonText}>Track a Meal</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Feather name="arrow-left" size={20} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Crunch<Text style={styles.redX}>X</Text>
          </Text>
        </View>
        
        <View style={styles.headerRightButtons}>
          {/* Share button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareImages}
            disabled={sharingInProgress}
          >
            {sharingInProgress ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Feather name="share-2" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
          
          {/* Camera button */}
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={navigateToCamera}
          >
            <Feather name="camera" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter tabs - Today/Month/All */}
      <View style={styles.filterContainer}>
        {['today', 'month', 'all'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter && styles.filterTabTextActive
            ]}>
              {filter === 'today' ? 'Today' : filter === 'month' ? 'Month' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Memory grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : getFilteredMemories().length === 0 ? (
        <EmptyMemoriesState />
      ) : (
        <FlatList
          data={getFilteredMemories()}
          renderItem={renderMemoryItem}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            padding: spacing,
            paddingBottom: spacing * 2
          }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      )}
      
      {/* Full image modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)}
          >
            <Feather name="x" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
      
      {/* Instagram Share Modal - Updated to use React Native's Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={igShareVisible}
        onRequestClose={() => setIgShareVisible(false)}
        statusBarTranslucent={true}
      >
        <ShareableContent
          memories={getFilteredMemories()}
          onClose={() => setIgShareVisible(false)}
          onSaveSuccess={() => setIgShareVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  redX: {
    color: '#ef4444', // Red color for the X
    fontFamily: 'Inter-Bold',
    includeFontPadding: false, // Helps with text alignment issues
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF', // White color for dark background
    textAlign: 'center',
    lineHeight: 28, // Adding lineHeight to ensure consistent baseline
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  shareButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 10,
  },
  cameraButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#222222',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  filterTabActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  filterTabText: {
    fontWeight: '600',
    color: '#a3a3a3',
    fontSize: 13,
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  memoryItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  calorieIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  calorieText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d1d5db',
    marginTop: 16,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginTop: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  }
});

export default MemoryGalleryScreen;