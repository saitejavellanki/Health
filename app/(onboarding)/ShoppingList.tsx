import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { ChevronLeft, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { getDoc, doc, query, collection, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../components/firebase/Firebase'; // Adjust path and make sure auth is exported

// Gemini API credentials
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default function ShoppingList() {
  const [fullPlan, setFullPlan] = useState([]);
  const [timeSpan, setTimeSpan] = useState('week'); // Default to a week
  const [shoppingList, setShoppingList] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch plan data from Firebase based on the current user
  useEffect(() => {
    const fetchUserPlanData = async () => {
      try {
        // Check if user is authenticated
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          setError('You must be logged in to view your shopping list');
          setLoading(false);
          return;
        }
        
        const userId = currentUser.uid;
        
        // Query to find the most recent plan for this user
        const plansQuery = query(
          collection(db, 'userplans'),
          where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(plansQuery);
        
        if (querySnapshot.empty) {
          setError('No meal plan found. Please create a plan first.');
          setLoading(false);
          return;
        }
        
        // Find the most recent plan
        let latestPlan = null;
        let latestDate = new Date(0); // Initialize with oldest possible date
        
        querySnapshot.forEach((doc) => {
          const planData = doc.data();
          // Check if createdAt exists and is a Firestore timestamp before calling toDate()
          if (planData.createdAt && typeof planData.createdAt.toDate === 'function') {
            const planDate = planData.createdAt.toDate();
            if (planDate > latestDate) {
              latestDate = planDate;
              latestPlan = { id: doc.id, ...planData };
            }
          }
        });
        
        // If no plan with valid timestamp was found, use the first one
        if (!latestPlan && querySnapshot.docs.length > 0) {
          latestPlan = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        
        // Parse the JSON plan data
        const parsedPlan = JSON.parse(latestPlan.parsedPlan);
        setFullPlan(parsedPlan);
        
        // Generate initial shopping list with the default timespan
        generateShoppingList(parsedPlan, timeSpan);
      } catch (error) {
        console.error("Error fetching user plan data:", error);
        setError('Failed to load plan data');
        setLoading(false);
      }
    };

    fetchUserPlanData();
  }, []);

  // Generate shopping list using Gemini API
  const generateShoppingList = async (planData, span) => {
    setLoading(true);
    
    try {
      // Determine how many days to include based on the timeSpan
      let daysToInclude = 7; // Default to a week
      if (span === 'day') {
        daysToInclude = 1;
      } else if (span === 'month') {
        daysToInclude = 30;
      }

      // Limit the plan to the number of days we want
      const limitedPlan = planData.slice(0, Math.min(daysToInclude, planData.length));
      
      // Extract all meals for the specified timespan
      let meals = [];
      limitedPlan.forEach(dayPlan => {
        if (dayPlan.sections) {
          const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
          
          mealTypes.forEach(mealType => {
            if (dayPlan.sections[mealType]) {
              dayPlan.sections[mealType].forEach(meal => {
                meals.push(meal);
              });
            }
          });
        }
      });

      // Create prompt for Gemini
      const prompt = `
      Generate a detailed shopping list based on the following meals for a ${span}:
      ${meals.join('\n')}
      
      Format your response as a JSON object with the following structure:
      {
        "Proteins": [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}],
        "Vegetables": [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}],
        "Fruits": [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}],
        "Grains": [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}],
        "Dairy": [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}],
        "Other": [{"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}]
      }
      
      Keep your response concise. Extract all relevant ingredients, estimate reasonable quantities, and organize them by food category.
      IMPORTANT: Only include the JSON with no extra text. Do not truncate or cut off any part of the JSON.
      `;

      // Call Gemini API with increased maxOutputTokens to handle longer responses
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048, // Increased from 1024 to allow for larger responses
          }
        })
      });

      const data = await response.json();
      
      try {
        if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
          const responseText = data.candidates[0].content.parts[0].text;
          console.log("Raw API response:", responseText); // Log the raw response for debugging
          
          // More robust JSON extraction
          // First try to find JSON by looking for text between first { and last }
          let jsonText = responseText.trim();
          
          // If the response is wrapped in backticks or contains "json" marker, extract just the JSON part
          if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0].trim();
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0].trim();
          }
          
          // If the text doesn't start with { or ends without }, look for brackets
          const firstBrace = jsonText.indexOf('{');
          const lastBrace = jsonText.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
          }
          
          // Try to parse the extracted JSON
          try {
            const parsedResponse = JSON.parse(jsonText);
            console.log("Successfully parsed response:", parsedResponse);
            
            // Validate the structure - ensure all required categories exist
            const requiredCategories = ['Proteins', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Other'];
            requiredCategories.forEach(category => {
              if (!parsedResponse[category]) {
                parsedResponse[category] = [];
              }
            });
            
            setShoppingList(parsedResponse);
          } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            
            // More aggressive JSON repair attempt for truncated responses
            try {
              let repairAttempt = jsonText;
              
              // Check for unclosed brackets
              const openBraces = (repairAttempt.match(/{/g) || []).length;
              const closeBraces = (repairAttempt.match(/}/g) || []).length;
              
              if (openBraces > closeBraces) {
                // Add missing closing braces
                repairAttempt += '}'.repeat(openBraces - closeBraces);
              }
              
              // Check for trailing commas before closing brackets
              repairAttempt = repairAttempt.replace(/,\s*}/g, '}');
              repairAttempt = repairAttempt.replace(/,\s*]/g, ']');
              
              const repairedJson = JSON.parse(repairAttempt);
              console.log("Repaired JSON:", repairedJson);
              
              // Validate structure after repair
              const requiredCategories = ['Proteins', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Other'];
              requiredCategories.forEach(category => {
                if (!repairedJson[category]) {
                  repairedJson[category] = [];
                }
              });
              
              setShoppingList(repairedJson);
            } catch (repairError) {
              console.error("JSON repair failed:", repairError);
              // Ultimate fallback - create an empty structure
              setShoppingList({
                "Proteins": [],
                "Vegetables": [],
                "Fruits": [],
                "Grains": [],
                "Dairy": [],
                "Other": []
              });
              setError('Could not process the shopping list. Please try again.');
            }
          }
        } else {
          console.error("Invalid API response structure:", data);
          setError('Invalid response from API');
          // Create default empty structure
          setShoppingList({
            "Proteins": [],
            "Vegetables": [],
            "Fruits": [],
            "Grains": [],
            "Dairy": [],
            "Other": []
          });
        }
      } catch (error) {
        console.error("Error processing API response:", error);
        setError('Error processing API response');
        // Create default empty structure
        setShoppingList({
          "Proteins": [],
          "Vegetables": [],
          "Fruits": [],
          "Grains": [],
          "Dairy": [],
          "Other": []
        });
      }
    } catch (error) {
      console.error("Error generating shopping list:", error);
      setError('Failed to generate shopping list');
      // Create default empty structure
      setShoppingList({
        "Proteins": [],
        "Vegetables": [],
        "Fruits": [],
        "Grains": [],
        "Dairy": [],
        "Other": []
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = (itemName) => {
    setCheckedItems(prevState => ({
      ...prevState,
      [itemName]: !prevState[itemName]
    }));
  };

  // If still loading the initial data
  if (loading && Object.keys(shoppingList).length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.headerTitle}>Shopping List</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Generating your shopping list...</Text>
        </View>
      </View>
    );
  }

  // If there was an error
  if (error && Object.keys(shoppingList).length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.headerTitle}>Shopping List</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable 
            style={styles.retryButton}
            onPress={() => {
              // Reset error so we can try again
              setError(null);
              setLoading(true);
              
              const fetchUserPlanData = async () => {
                try {
                  const currentUser = auth.currentUser;
                  
                  if (!currentUser) {
                    setError('You must be logged in to view your shopping list');
                    setLoading(false);
                    return;
                  }
                  
                  const userId = currentUser.uid;
                  const plansQuery = query(
                    collection(db, 'userplans'),
                    where('userId', '==', userId)
                  );
                  const querySnapshot = await getDocs(plansQuery);
                  
                  if (querySnapshot.empty) {
                    setError('No meal plan found. Please create a plan first.');
                    setLoading(false);
                    return;
                  }
                  
                  // Use the same safer approach to find the latest plan
                  let latestPlan = null;
                  let latestDate = new Date(0);
                  
                  querySnapshot.forEach((doc) => {
                    const planData = doc.data();
                    if (planData.createdAt && typeof planData.createdAt.toDate === 'function') {
                      const planDate = planData.createdAt.toDate();
                      if (planDate > latestDate) {
                        latestDate = planDate;
                        latestPlan = { id: doc.id, ...planData };
                      }
                    }
                  });
                  
                  // If no plan with valid timestamp was found, use the first one
                  if (!latestPlan && querySnapshot.docs.length > 0) {
                    latestPlan = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                  }
                  
                  const parsedPlan = JSON.parse(latestPlan.parsedPlan);
                  setFullPlan(parsedPlan);
                  
                  generateShoppingList(parsedPlan, timeSpan);
                } catch (error) {
                  console.error("Error fetching user plan data:", error);
                  setError('Failed to load plan data');
                  setLoading(false);
                }
              };
              
              fetchUserPlanData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle}>Shopping List</Text>
      </View>
      
      <View style={styles.timeSpanSelector}>
        <Pressable
          style={[styles.timeSpanButton, timeSpan === 'day' && styles.selectedTimeSpan]}
          onPress={() => {
            setTimeSpan('day');
            generateShoppingList(fullPlan, 'day');
          }}
        >
          <Text style={[styles.timeSpanText, timeSpan === 'day' && styles.selectedTimeSpanText]}>Day</Text>
        </Pressable>
        <Pressable
          style={[styles.timeSpanButton, timeSpan === 'week' && styles.selectedTimeSpan]}
          onPress={() => {
            setTimeSpan('week');
            generateShoppingList(fullPlan, 'week');
          }}
        >
          <Text style={[styles.timeSpanText, timeSpan === 'week' && styles.selectedTimeSpanText]}>Week</Text>
        </Pressable>
        <Pressable
          style={[styles.timeSpanButton, timeSpan === 'month' && styles.selectedTimeSpan]}
          onPress={() => {
            setTimeSpan('month');
            generateShoppingList(fullPlan, 'month');
          }}
        >
          <Text style={[styles.timeSpanText, timeSpan === 'month' && styles.selectedTimeSpanText]}>Month</Text>
        </Pressable>
      </View>
      
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Updating shopping list...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {Object.entries(shoppingList).map(([category, items]) => (
            items.length > 0 && (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {items.map((item, index) => (
                  <Pressable 
                    key={`${item.name}-${index}`}
                    style={[
                      styles.itemRow,
                      checkedItems[item.name] && styles.checkedItem
                    ]}
                    onPress={() => toggleItemCheck(item.name)}
                  >
                    <View style={styles.checkboxContainer}>
                      {checkedItems[item.name] ? (
                        <Check size={18} color="#22c55e" />
                      ) : (
                        <View style={styles.uncheckedBox} />
                      )}
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={[
                        styles.itemName,
                        checkedItems[item.name] && styles.checkedItemText
                      ]}>
                        {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                      </Text>
                      <Text style={styles.itemQuantity}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1a1a1a',
  },
  timeSpanSelector: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  timeSpanButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedTimeSpan: {
    backgroundColor: '#ecfdf5',
  },
  timeSpanText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748b',
  },
  selectedTimeSpanText: {
    color: '#22c55e',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  checkedItem: {
    opacity: 0.5,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedBox: {
    width: 24,
    height: 24,
  },
  itemDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1a1a1a',
  },
  checkedItemText: {
    textDecorationLine: 'line-through',
  },
  itemQuantity: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
  },
});