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
  const cameraRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const nutritionScaleAnim = useRef(new Animated.Value(0.8)).current;
  const tickScaleAnim = useRef(new Animated.Value(0)).current;
  const tickOpacityAnim = useRef(new Animated.Value(0)).current;

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
      sendImageToGemini(image);
    }
  }, [image]);

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

  // Function to send the image to Gemini AI
  const sendImageToGemini = async (imageUri) => {
    try {
      setAnalyzing(true);

      // Convert image to base64
      const base64Image = await convertImageToBase64(imageUri);
      // Extract just the base64 data without the prefix
      const base64Data = base64Image.split(',')[1];

      // Prepare request for Gemini - Updated to include carbs and sugars
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: 'This is an image of food. Analyze this image and tell me what food items are in it. I need to know: 1) The name of the dish or food items, 2) The total estimated calories, 3) The estimated grams of protein, 4) The estimated grams of fat, 5) The estimated grams of carbohydrates, 6) The estimated grams of sugar, and 7) Whether this is considered junk food (yes or no). Format your response in plain text with only these details.',
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
          temperature: 0.4,
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

        // Extract food name
        // Extract food name
        const foodNameMatch = textResponse.match(/(?:1\))(?:\s*)([^\n.]+)/i);
        if (foodNameMatch && foodNameMatch[1]) {
          setFoodName(foodNameMatch[1].trim());
        }
        
        // Extract calories from a format like "2) 400 calories"
        const calorieMatch = textResponse.match(/(?:2\))(?:\s*)(\d+(?:\.\d+)?)(?:\s*)(?:calories|kcal)(?:\s*(?:of\s*\w+)?)?/i);
        if (calorieMatch && calorieMatch[1]) {
          setCalories(calorieMatch[1]);
        }
        
        // Extract protein from a format like "3) 30 grams" or "3) 30 grams of protein"
        const proteinMatch = textResponse.match(/(?:3\))(?:\s*)(\d+(?:\.\d+)?)(?:\s*)(?:g|grams?)(?:\s*(?:of\s*\w+)?)?/i);
        if (proteinMatch && proteinMatch[1]) {
          setProtein(proteinMatch[1]);
        }
        
        // Extract fat from a format like "4) 30 grams" or "4) 30 grams of fat"
        const fatMatch = textResponse.match(/(?:4\))(?:\s*)(\d+(?:\.\d+)?)(?:\s*)(?:g|grams?)(?:\s*(?:of\s*\w+)?)?/i);
        if (fatMatch && fatMatch[1]) {
          setFat(fatMatch[1]);
        }
        
        // Extract carbohydrates from a format like "5) 5 grams" or "5) 5 grams of carbohydrates"
        const carbohydrateMatch = textResponse.match(/(?:5\))(?:\s*)(\d+(?:\.\d+)?)(?:\s*)(?:g|grams?)(?:\s*(?:of\s*\w+)?)?/i);
        if (carbohydrateMatch && carbohydrateMatch[1]) {
          setCarbohydrates(carbohydrateMatch[1]);
        }
        
        // Extract sugars from a format like "6) 2 grams" or "6) 2 grams of sugar"
        const sugarMatch = textResponse.match(/(?:6\))(?:\s*)(\d+(?:\.\d+)?)(?:\s*)(?:g|grams?)(?:\s*(?:of\s*\w+)?)?/i);
        if (sugarMatch && sugarMatch[1]) {
          setSugars(sugarMatch[1]);
        }
        

// Check for junk food classification (7) yes/no)
const junkFoodMatch = textResponse.match(/(?:7\))(?:\s*)(\w+)/i);
if (junkFoodMatch && junkFoodMatch[1]) {
  setIsJunkFood(junkFoodMatch[1].toLowerCase() === 'yes' ? 1 : 0);
}

        console.log('Extracted values:');
console.log('Calories:', calories);
console.log('Protein:', protein);
console.log('Fat:', fat);
console.log('Carbohydrates:', carbohydrates);
console.log('Sugars:', sugars);

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
                Position your food in frame
              </Text>
            </View>
          </CameraView>

          <View style={styles.controlsPortion}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
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
      <Feather name="cube" size={20} color="#22c55e" />
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
    <Text style={styles.nutritionLabel}>sugar</Text>
  </Animated.View>
</View>



                {!loggedMeal ? (
                  <TouchableOpacity
                    style={styles.logMealButton}
                    onPress={logMealToFirebase}
                  >
                    <Feather
                      name="check-circle"
                      size={18}
                      color="#ffffff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.logMealButtonText}>Log Meal</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mealLoggedContainer}>
                    <Feather
                      name="check-circle"
                      size={18}
                      color="#22c55e"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.mealLoggedText}>
                      Meal Logged Successfully
                    </Text>
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
              <View>
                <CrunchXFacts />
                <View style={styles.analyzerStatus}>
                  <ActivityIndicator size="small" color="#22c55e" />
                  <Text style={styles.analyzingText}>
                    Analyzing your meal...
                  </Text>
                </View>
              </View>
            )}

            {!calories && !protein && !analyzing && (
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={() => sendImageToGemini(image)}
                >
                  <Feather
                    name="search"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
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
