import { useState, useRef, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Animated,
  Pressable,
  BackHandler,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Feather from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import styles from '../Utils/CalorieTrackerScreenStyles';
import { router } from 'expo-router';
import CrunchXFacts from '@/components/Loaders/CrunchXFacts';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';

// Gemini API credentials
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL ='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default function CalorieTrackerScreen() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [calories, setCalories] = useState(null);
  const [protein, setProtein] = useState(null);
  const [fat, setFat] = useState(null);
  const [carbohydrates, setCarbohydrates] = useState(null); // New state for carbs
  const [sugars, setSugars] = useState(null); // New state for sugars
  const [foodName, setFoodName] = useState('');
  const [loggedMeal, setLoggedMeal] = useState(false);
  const [showTickAnimation, setShowTickAnimation] = useState(false);
  const [isJunkFood, setIsJunkFood] = useState(0);
  const [scanMode, setScanMode] = useState('food'); // 'food' or 'barcode'
  const cameraRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const nutritionScaleAnim = useRef(new Animated.Value(0.8)).current;
  const tickScaleAnim = useRef(new Animated.Value(0)).current;
  const tickOpacityAnim = useRef(new Animated.Value(0)).current;

  // Add Android back button handler
  useEffect(() => {
    const backAction = () => {
      // If we're viewing an image analysis, close it
      if (image) {
        closeAnalysis();
        return true; // Prevent default behavior
      }
      // Otherwise, navigate to the tabs screen
      router.push('/(tabs)');
      return true; // Prevent default behavior
    };

    // Add the event listener
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Clean up the event listener on component unmount
    return () => backHandler.remove();
  }, [image]);

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
        }),
      ]).start();
    }
  }, [calories, analyzing]);

  // Animation for tick after meal is logged
  useEffect(() => {
    if (showTickAnimation) {
      // Start tick animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(tickOpacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(tickScaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        // Delay before navigation
        Animated.timing(tickOpacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Navigate to tabs screen after animation completes
        router.push('/(tabs)');
      });
    }
  }, [showTickAnimation]);

  // Effect to automatically analyze image after capture
  useEffect(() => {
    if (image && !analyzing && !calories) {
      if (scanMode === 'food') {
        sendImageToGemini(image);
      } else {
        scanBarcodeFromImage(image);
      }
    }
  }, [image, scanMode]);

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
          We need access to your camera to analyze your food and provide
          accurate nutritional information
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
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
        });
        setImage(photo.uri);
        setResult(null);
        setCalories(null);
        setProtein(null);
        setFat(null);
        setCarbohydrates(null); // Reset carbs value
        setSugars(null); // Reset sugars value
        setFoodName('');
        setLoggedMeal(false);
        setShowTickAnimation(false);
        setIsJunkFood(0);
        // Reset animation values
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        nutritionScaleAnim.setValue(0.8);
        tickScaleAnim.setValue(0);
        tickOpacityAnim.setValue(0);
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  function toggleScanMode() {
    setScanMode((current) => (current === 'food' ? 'barcode' : 'food'));
  }

  // Function to scan barcode from image
  const scanBarcodeFromImage = async (imageUri) => {
    try {
      setAnalyzing(true);
      
      // Convert image to base64
      const base64Image = await convertImageToBase64(imageUri);
      // Extract just the base64 data without the prefix
      const base64Data = base64Image.split(',')[1];
      
      // Prepare request for Gemini with a barcode scanning prompt
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: 'This is an image of a barcode or packaged food product. Extract the barcode number if visible or read the nutrition facts from the package. Respond ONLY with the following numbered format:\n\n1) [Name of product]\n2) [Number] calories\n3) [Number] g protein\n4) [Number] g fat\n5) [Number] g carbohydrates\n6) [Number] g sugar\n7) [Yes/No] for whether this is considered junk food\n\nDo not include any other text, explanations, or formatting.',
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generation_config: {
          temperature: 0.2,
          top_p: 0.95,
          max_output_tokens: 2048,
        },
      };
      
      // Send request to Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      // Process the response the same way as food analysis
      if (data.candidates && data.candidates.length > 0) {
        const textResponse = data.candidates[0].content.parts[0].text;
        setResult(textResponse);
        
        // Extract data using the same regex patterns as food analysis
        const foodNameMatch = textResponse.match(/1\)[ \t]*([^\n]+)/);
        if (foodNameMatch && foodNameMatch[1]) {
          setFoodName(foodNameMatch[1].trim());
        } else {
          console.log('Product name extraction failed');
          setFoodName('Unknown product');
        }
        
        const calorieMatch = textResponse.match(/2\)[ \t]*(\d+(?:\.\d+)?)/);
        if (calorieMatch && calorieMatch[1]) {
          setCalories(calorieMatch[1]);
        } else {
          console.log('Calorie extraction failed');
          setCalories('0');
        }
        
        const proteinMatch = textResponse.match(/3\)[ \t]*(\d+(?:\.\d+)?)/);
        if (proteinMatch && proteinMatch[1]) {
          setProtein(proteinMatch[1]);
        } else {
          console.log('Protein extraction failed');
          setProtein('0');
        }
        
        const fatMatch = textResponse.match(/4\)[ \t]*(\d+(?:\.\d+)?)/);
        if (fatMatch && fatMatch[1]) {
          setFat(fatMatch[1]);
        } else {
          console.log('Fat extraction failed');
          setFat('0');
        }
        
        const carbohydrateMatch = textResponse.match(/5\)[ \t]*(\d+(?:\.\d+)?)/);
        if (carbohydrateMatch && carbohydrateMatch[1]) {
          setCarbohydrates(carbohydrateMatch[1]);
        } else {
          console.log('Carbohydrates extraction failed');
          setCarbohydrates('0');
        }
        
        const sugarMatch = textResponse.match(/6\)[ \t]*(\d+(?:\.\d+)?)/);
        if (sugarMatch && sugarMatch[1]) {
          setSugars(sugarMatch[1]);
        } else {
          console.log('Sugar extraction failed');
          setSugars('0');
        }
        
        const junkFoodMatch = textResponse.match(/7\)[ \t]*(\w+)/i);
        if (junkFoodMatch && junkFoodMatch[1]) {
          setIsJunkFood(junkFoodMatch[1].toLowerCase().includes('yes') ? 1 : 0);
        } else {
          console.log('Junk food classification failed');
          setIsJunkFood(0);
        }
      } else {
        console.error('No response from Gemini API or invalid response format');
        setResult('Error analyzing barcode. Please try again.');
        setFoodName('Unknown product');
        setCalories('0');
        setProtein('0');
        setFat('0');
        setCarbohydrates('0');
        setSugars('0');
        setIsJunkFood(0);
      }
    } catch (error) {
      console.error('Error scanning barcode with Gemini:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Function to send the image to Gemini AI
  const sendImageToGemini = async (imageUri) => {
    try {
      setAnalyzing(true);

      // Convert image to base64
      const base64Image = await convertImageToBase64(imageUri);
      // Extract just the base64 data without the prefix
      const base64Data = base64Image.split(',')[1];

      // Prepare request for Gemini with a more structured prompt
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: 'This is an image of food. Analyze this image and respond ONLY with the following numbered format:\n\n1) [Name of food]\n2) [Number] calories\n3) [Number] g protein\n4) [Number] g fat\n5) [Number] g carbohydrates\n6) [Number] g sugar\n7) [Yes/No] for whether this is considered junk food\n\nDo not include any other text, explanations, or formatting.',
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generation_config: {
          temperature: 0.2, // Lower temperature for more consistent formatting
          top_p: 0.95,
          max_output_tokens: 2048,
        },
      };

      // Send request to Gemini API
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // Process Gemini response
      if (data.candidates && data.candidates.length > 0) {
        const textResponse = data.candidates[0].content.parts[0].text;
        setResult(textResponse);
        
        // Improved regex patterns with better error handling
        
        // Extract food name - more permissive pattern
        const foodNameMatch = textResponse.match(/1\)[ \t]*([^\n]+)/);
        if (foodNameMatch && foodNameMatch[1]) {
          setFoodName(foodNameMatch[1].trim());
        } else {
          console.log('Food name extraction failed');
          setFoodName('Unknown food');
        }
        
        // Extract calories - handles decimal values and optional units
        const calorieMatch = textResponse.match(/2\)[ \t]*(\d+(?:\.\d+)?)/);
        if (calorieMatch && calorieMatch[1]) {
          setCalories(calorieMatch[1]);
        } else {
          console.log('Calorie extraction failed');
          setCalories('0');
        }
        
        // Extract protein - more robust pattern
        const proteinMatch = textResponse.match(/3\)[ \t]*(\d+(?:\.\d+)?)/);
        if (proteinMatch && proteinMatch[1]) {
          setProtein(proteinMatch[1]);
        } else {
          console.log('Protein extraction failed');
          setProtein('0');
        }
        
        // Extract fat
        const fatMatch = textResponse.match(/4\)[ \t]*(\d+(?:\.\d+)?)/);
        if (fatMatch && fatMatch[1]) {
          setFat(fatMatch[1]);
        } else {
          console.log('Fat extraction failed');
          setFat('0');
        }
        
        // Extract carbohydrates
        const carbohydrateMatch = textResponse.match(/5\)[ \t]*(\d+(?:\.\d+)?)/);
        if (carbohydrateMatch && carbohydrateMatch[1]) {
          setCarbohydrates(carbohydrateMatch[1]);
        } else {
          console.log('Carbohydrates extraction failed');
          setCarbohydrates('0');
        }
        
        // Extract sugars
        const sugarMatch = textResponse.match(/6\)[ \t]*(\d+(?:\.\d+)?)/);
        if (sugarMatch && sugarMatch[1]) {
          setSugars(sugarMatch[1]);
        } else {
          console.log('Sugar extraction failed');
          setSugars('0');
        }
        
        // Check for junk food classification
        const junkFoodMatch = textResponse.match(/7\)[ \t]*(\w+)/i);
        if (junkFoodMatch && junkFoodMatch[1]) {
          setIsJunkFood(junkFoodMatch[1].toLowerCase().includes('yes') ? 1 : 0);
        } else {
          console.log('Junk food classification failed');
          setIsJunkFood(0);
        }

        console.log('Extracted values:');
        console.log('Food name:', foodName);
        console.log('Calories:', calories);
        console.log('Protein:', protein);
        console.log('Fat:', fat);
        console.log('Carbohydrates:', carbohydrates);
        console.log('Sugars:', sugars);
        console.log('Is junk food:', isJunkFood);
        console.log('Full analysis result:', textResponse);
      } else {
        console.error('No response from Gemini API or invalid response format');
        setResult('Error analyzing image. Please try again.');
        // Set default values when analysis fails
        setFoodName('Unknown food');
        setCalories('0');
        setProtein('0');
        setFat('0');
        setCarbohydrates('0');
        setSugars('0');
        setIsJunkFood(0);
      }
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      
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

  // Modified function to log the meal with carbs and sugars
  const logMealToFirebase = async () => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      // Create meal object with carbs and sugars
      const mealData = {
        userId: userId,
        foodName: foodName || 'Unknown food',
        calories: parseInt(calories) || 0,
        protein: protein ? parseInt(protein) : 0,
        fat: fat ? parseInt(fat) : 0,
        carbohydrates: carbohydrates ? parseInt(carbohydrates) : 0,
        sugars: sugars ? parseInt(sugars) : 0,
        junk: isJunkFood,
        image: image,
        timestamp: serverTimestamp(),
      };

      // Add the meal to a separate meals collection
      const mealsCollection = collection(db, 'meals');
      await addDoc(mealsCollection, mealData);

      // Update user totals in the user document
      const userRef = doc(db, 'users', userId);

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if the user has a lastTrackingDate field and if it's today
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      let lastTrackingDate = userData?.lastTrackingDate?.toDate();
      let mealsTrackedToday = userData?.mealsTrackedToday || 0;
      let currentStreak = userData?.streak || 0;
      let lastStreakDate = userData?.lastStreakDate?.toDate();

      if (lastTrackingDate) {
        lastTrackingDate.setHours(0, 0, 0, 0);

        // If last tracking date is not today, reset counter
        if (lastTrackingDate.getTime() !== today.getTime()) {
          mealsTrackedToday = 1;

          // Check if lastStreakDate was yesterday to maintain streak
          if (lastStreakDate) {
            lastStreakDate.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastStreakDate.getTime() === yesterday.getTime()) {
              // Last streak was yesterday, continue the streak
              // But only increment if this is their first log of today
              currentStreak = currentStreak;
            } else {
              // Streak broken, reset to 0
              currentStreak = 0;
            }
          }
        } else {
          // Increment counter if already tracking today
          mealsTrackedToday += 1;

          // Check if they've now reached 2 meals today to increment streak
          if (
            mealsTrackedToday >= 2 &&
            lastStreakDate?.getTime() !== today.getTime()
          ) {
            currentStreak += 1;
            // Update lastStreakDate to today since they've hit the goal
            lastStreakDate = today;
          }
        }
      } else {
        mealsTrackedToday = 1;
        // First ever tracking, streak remains at 0
      }

      // Update user document with tracking data and streak info
      await updateDoc(userRef, {
        totalCalories: increment(parseInt(calories) || 0),
        totalProtein: increment(protein ? parseInt(protein) : 0),
        totalFat: increment(fat ? parseInt(fat) : 0),
        totalCarbohydrates: increment(carbohydrates ? parseInt(carbohydrates) : 0),
        totalSugars: increment(sugars ? parseInt(sugars) : 0),
        lastUpdated: serverTimestamp(),
        lastTrackingDate: today,
        mealsTrackedToday: mealsTrackedToday,
        streak: currentStreak,
        lastStreakDate: mealsTrackedToday >= 2 ? today : lastStreakDate || null,
      });

      console.log('Meal logged successfully');
      console.log('Current streak:', currentStreak);
      setLoggedMeal(true);

      // Show tick animation before redirecting
      setShowTickAnimation(true);

      // Navigation will happen after animation completes in the useEffect hook
    } catch (error) {
      console.error('Error logging meal to Firebase:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backButtonContainer}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/(tabs)')}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {!image ? (
        <View style={styles.cameraContainer}>
          {/* Header - Changed from NutriLens to Powered by Gemini */}
          <View style={styles.cameraHeader}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                Crunch<Text style={styles.redX}>X</Text>
              </Text>
              <Text style={styles.sublineText}>Powered by Gemini</Text>
            </View>

            {/* Fixed the camera flip icon by explicitly using Feather icon */}
            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <Feather name="refresh-cw" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
            {/* Camera guides */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.scanCorner, styles.topLeft]} />
                <View style={[styles.scanCorner, styles.topRight]} />
                <View style={[styles.scanCorner, styles.bottomLeft]} />
                <View style={[styles.scanCorner, styles.bottomRight]} />
              </View>
              <Text style={styles.instructionText}>
                {scanMode === 'food' 
                  ? 'Position your food in frame'
                  : 'Position barcode or package in frame'}
              </Text>
            </View>
          </CameraView>

          <View style={styles.controlsPortion}>
  {/* Barcode scan button */}
  <TouchableOpacity
    style={[
      styles.scanModeButton,
      scanMode === 'barcode' && styles.scanModeButtonActive
    ]}
    onPress={toggleScanMode}
  >
    <Feather 
      name="maximize" 
      size={20} 
      color={scanMode === 'barcode' ? "#22c55e" : "#ffffff"} 
    />
    <Text style={[
      styles.scanModeButtonText,
      scanMode === 'barcode' && styles.scanModeButtonTextActive
    ]}>
      {scanMode === 'food' ? 'Barcode' : 'Food'}
    </Text>
  </TouchableOpacity>
  
  {/* Camera shutter button */}
  <TouchableOpacity
    style={styles.captureButton}
    onPress={takePicture}
  >
    <View style={styles.captureButtonInner} />
  </TouchableOpacity>
  
  {/* Replace the spacer with an option change button */}
  {/* <TouchableOpacity
    style={styles.scanModeButton}
    onPress={toggleCameraFacing}
  >
    <Feather 
      name="refresh-cw" 
      size={20} 
      color="#ffffff" 
    />
    <Text style={styles.scanModeButtonText}>
      Camera
    </Text>
  </TouchableOpacity> */}
</View>

        </View>
      ) : (
        <ScrollView
          style={styles.imageContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContent}>
            {/* Image with gradient overlay for back button */}
            <View style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.imageGradient}
              >
                <TouchableOpacity
                  onPress={closeAnalysis}
                  style={styles.backButton}
                >
                  <Feather name="arrow-left" size={22} color="#ffffff" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Tick Animation Overlay - shows when meal is logged */}
            {showTickAnimation && (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 999,
                  opacity: tickOpacityAnim,
                }}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: tickScaleAnim }],
                    backgroundColor: '#22c55e',
                    borderRadius: 50,
                    width: 100,
                    height: 100,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Feather name="check" size={60} color="#ffffff" />
                </Animated.View>
                <Animated.Text
                  style={{
                    color: '#ffffff',
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginTop: 16,
                    opacity: tickOpacityAnim,
                  }}
                >
                  Meal Logged!
                </Animated.Text>
              </Animated.View>
            )}

            {!analyzing && calories && (
              <Animated.View
                style={[
                  styles.resultContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                {foodName && (
                  <View style={styles.foodNameContainer}>
                    <Text style={styles.foodNameText}>{foodName}</Text>
                    {scanMode === 'barcode' && (
                      <Text style={styles.scanModeIndicator}>
                        Package Scan
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.nutritionGrid}>
                  <Animated.View
                    style={[
                      styles.nutritionItem,
                      { transform: [{ scale: nutritionScaleAnim }] },
                    ]}
                  >
                    <View style={styles.nutritionIconCircle}>
                      <Feather name="zap" size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.nutritionValue}>{calories || "0"}</Text>
                    <Text style={styles.nutritionLabel}>calories</Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.nutritionItem,
                      { transform: [{ scale: nutritionScaleAnim }] },
                    ]}
                  >
                    <View style={styles.nutritionIconCircle}>
                      <Feather name="activity" size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.nutritionValue}>
                      {protein || "0"}
                      <Text style={styles.nutritionUnit}>g</Text>
                    </Text>
                    <Text style={styles.nutritionLabel}>protein</Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.nutritionItem,
                      { transform: [{ scale: nutritionScaleAnim }] },
                    ]}
                  >
                    <View style={styles.nutritionIconCircle}>
                      <Feather name="droplet" size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.nutritionValue}>
                      {fat || "0"}
                      <Text style={styles.nutritionUnit}>g</Text>
                    </Text>
                    <Text style={styles.nutritionLabel}>fat</Text>
                  </Animated.View>
                  
                  <Animated.View
  style={[
    styles.nutritionItem,
    { transform: [{ scale: nutritionScaleAnim }] },
  ]}
>

                    <View style={styles.nutritionIconCircle}>
                      <Feather name="pie-chart" size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.nutritionValue}>
                      {carbohydrates || "0"}
                      <Text style={styles.nutritionUnit}>g</Text>
                    </Text>
                    <Text style={styles.nutritionLabel}>carbs</Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.nutritionItem,
                      { transform: [{ scale: nutritionScaleAnim }] },
                    ]}
                  >
                    <View style={styles.nutritionIconCircle}>
                      <Feather name="coffee" size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.nutritionValue}>
                      {sugars || "0"}
                      <Text style={styles.nutritionUnit}>g</Text>
                    </Text>
                    <Text style={styles.nutritionLabel}>sugars</Text>
                  </Animated.View>
                </View>

                {/* Junk food indicator */}
                {isJunkFood > 0 && (
                  <View style={styles.junkFoodIndicator}>
                    <Feather name="alert-triangle" size={16} color="#f97316" />
                    <Text style={styles.junkFoodText}>
                      This may not be the healthiest choice
                    </Text>
                  </View>
                )}

                {/* Log meal button */}
                {!loggedMeal && (
                  <TouchableOpacity
                    style={styles.logMealButton}
                    onPress={logMealToFirebase}
                  >
                    <Text style={styles.logMealButtonText}>Log Meal</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}

            {analyzing && (
              <View style={styles.loadingContainer}>
                <CrunchXFacts />
                <Text style={styles.loadingText}>
                  Analyzing your {scanMode === 'food' ? 'food' : 'product'}...
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// Function to convert image URI to base64
const convertImageToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};