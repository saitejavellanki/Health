import { useState, useRef, useEffect } from 'react';
import { Text, TouchableOpacity, View, Image, ActivityIndicator, StatusBar, ScrollView, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Feather from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { getFirestore, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import styles from '../Utils/CalorieTrackerScreenStyles';

// Gemini API credentials
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default function CalorieTrackerScreen() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [calories, setCalories] = useState(null);
  const [protein, setProtein] = useState(null);
  const [foodName, setFoodName] = useState('');
  const [loggedMeal, setLoggedMeal] = useState(false);
  const cameraRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const nutritionScaleAnim = useRef(new Animated.Value(0.8)).current;
  
  // Run animations when results are loaded
  useEffect(() => {
    if (calories && !analyzing) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(nutritionScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [calories, analyzing]);
  
  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }
  
  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <Feather name="camera-off" size={64} color="#64748b" />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          We need access to your camera to analyze your food and provide accurate nutritional information
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        setImage(photo.uri);
        setResult(null);
        setCalories(null);
        setProtein(null);
        setFoodName('');
        setLoggedMeal(false);
        // Reset animation values
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        nutritionScaleAnim.setValue(0.8);
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  };
  
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // Function to send the image to Gemini AI
  const sendImageToGemini = async (imageUri) => {
    try {
      setAnalyzing(true);
      
      // Convert image to base64
      const base64Image = await convertImageToBase64(imageUri);
      // Extract just the base64 data without the prefix
      const base64Data = base64Image.split(',')[1];
      
      // Prepare request for Gemini
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: "This is an image of food. Analyze this image and tell me what food items are in it. I only need to know: 1) The name of the dish or food items, 2) The total estimated calories, and 3) The estimated grams of protein if you can determine it. Format your response in plain text with only these details."
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generation_config: {
          temperature: 0.4,
          top_p: 0.95,
          max_output_tokens: 2048
        }
      };
      
      // Send request to Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      // Process Gemini response
      if (data.candidates && data.candidates.length > 0) {
        const textResponse = data.candidates[0].content.parts[0].text;
        setResult(textResponse);
        
        // Extract food name
        const foodNameMatch = textResponse.match(/(?:food item|dish|food)(?:s)?(?:\s*):(?:\s*)([^\n.]+)/i);
        if (foodNameMatch && foodNameMatch[1]) {
          setFoodName(foodNameMatch[1].trim());
        }
        
        // Extract calories and protein from response
        const calorieMatch = textResponse.match(/(\d+)(?:\s*)(?:to|-)(?:\s*)(\d+)(?:\s*)calories|(\d+)(?:\s*)calories/i);
        const proteinMatch = textResponse.match(/(\d+)(?:\s*)(?:to|-)(?:\s*)(\d+)(?:\s*)(?:g|grams)(?:\s*)(?:of)?(?:\s*)protein|(\d+)(?:\s*)(?:g|grams)(?:\s*)(?:of)?(?:\s*)protein/i);
        
        if (calorieMatch) {
          if (calorieMatch[3]) {
            // Single value match
            setCalories(calorieMatch[3]);
          } else if (calorieMatch[1] && calorieMatch[2]) {
            // Range match - take the average
            const avgCalories = Math.round((parseInt(calorieMatch[1]) + parseInt(calorieMatch[2])) / 2);
            setCalories(avgCalories.toString());
          }
        }
        
        if (proteinMatch) {
          if (proteinMatch[3]) {
            // Single value match
            setProtein(proteinMatch[3]);
          } else if (proteinMatch[1] && proteinMatch[2]) {
            // Range match - take the average
            const avgProtein = Math.round((parseInt(proteinMatch[1]) + parseInt(proteinMatch[2])) / 2);
            setProtein(avgProtein.toString());
          }
        }
        
        console.log('Analysis result:', textResponse);
      } else {
        throw new Error('No response from Gemini API');
      }
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      setResult('Error analyzing image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const closeAnalysis = () => {
    // Animation to fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setImage(null);
    });
  };
  
  // Function to log the meal in Firebase
  const logMealToFirebase = async () => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error('User not authenticated');
        return;
      }
      
      const userRef = doc(db, 'users', userId);
      
      // Create meal object
      const mealData = {
        foodName: foodName || 'Unknown food',
        calories: parseInt(calories) || 0,
        protein: protein ? parseInt(protein) : null,
        image: image,
        timestamp: serverTimestamp()
      };
      
      // Update user document with new meal
      await updateDoc(userRef, {
        meals: arrayUnion(mealData)
      });
      
      console.log('Meal logged successfully');
      setLoggedMeal(true);
    } catch (error) {
      console.error('Error logging meal to Firebase:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {!image ? (
        <View style={styles.cameraContainer}>
          {/* Header */}
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>NutriLens</Text>
            
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Feather name="camera-reverse" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <CameraView 
            style={styles.camera} 
            facing={facing}
            ref={cameraRef}
          >
            {/* Camera guides */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.scanCorner, styles.topLeft]} />
                <View style={[styles.scanCorner, styles.topRight]} />
                <View style={[styles.scanCorner, styles.bottomLeft]} />
                <View style={[styles.scanCorner, styles.bottomRight]} />
              </View>
              <Text style={styles.instructionText}>Position your food in frame</Text>
            </View>
          </CameraView>
          
          <View style={styles.controlsPortion}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.imageContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.imageContent}>
            {/* Image with gradient overlay for back button */}
            <View style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.imageGradient}
              >
                <TouchableOpacity onPress={closeAnalysis} style={styles.backButton}>
                  <Feather name="arrow-left" size={22} color="#ffffff" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
            
            {!analyzing && calories && (
              <Animated.View 
                style={[
                  styles.resultContainer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim }
                    ]
                  }
                ]}
              >
                {foodName && (
                  <View style={styles.foodNameContainer}>
                    <Text style={styles.foodNameText}>{foodName}</Text>
                  </View>
                )}
                
                <View style={styles.nutritionGrid}>
                  <Animated.View 
                    style={[
                      styles.nutritionItem,
                      { transform: [{ scale: nutritionScaleAnim }] }
                    ]}
                  >
                    <View style={styles.nutritionIconCircle}>
                      <Feather name="zap" size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.nutritionValue}>{calories}</Text>
                    <Text style={styles.nutritionLabel}>calories</Text>
                  </Animated.View>
                  
                  {protein && (
                    <Animated.View 
                      style={[
                        styles.nutritionItem,
                        { transform: [{ scale: nutritionScaleAnim }] }
                      ]}
                    >
                      <View style={styles.nutritionIconCircle}>
                        <Feather name="activity" size={20} color="#22c55e" />
                      </View>
                      <Text style={styles.nutritionValue}>{protein}<Text style={styles.nutritionUnit}>g</Text></Text>
                      <Text style={styles.nutritionLabel}>protein</Text>
                    </Animated.View>
                  )}
                </View>
                
                {!loggedMeal ? (
                  <TouchableOpacity 
                    style={styles.logMealButton}
                    onPress={logMealToFirebase}
                  >
                    <Feather name="check-circle" size={18} color="#ffffff" style={{marginRight: 8}} />
                    <Text style={styles.logMealButtonText}>Log Meal</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mealLoggedContainer}>
                    <Feather name="check-circle" size={18} color="#22c55e" style={{marginRight: 8}} />
                    <Text style={styles.mealLoggedText}>Meal Logged Successfully</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.newPhotoButton} 
                  onPress={closeAnalysis}
                >
                  <Text style={styles.newPhotoButtonText}>New Photo</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            
            {analyzing && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#22c55e" />
                  <Text style={styles.loadingText}>Analyzing your meal...</Text>
                </View>
              </View>
            )}
            
            {!calories && !protein && !analyzing && (
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={styles.analyzeButton} 
                  onPress={() => sendImageToGemini(image)}
                >
                  <Feather name="search" size={18} color="#ffffff" style={{marginRight: 8}} />
                  <Text style={styles.analyzeButtonText}>Analyze Food</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={closeAnalysis}
                >
                  <Text style={styles.cancelButtonText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// Helper function to convert image to base64
async function convertImageToBase64(uri) {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}