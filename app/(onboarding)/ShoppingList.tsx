import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ChevronLeft, X, Check } from 'lucide-react-native';
import { router } from 'expo-router';

export default function ShoppingList() {
  const params = useLocalSearchParams();
  const [fullPlan, setFullPlan] = useState([]);
  const [timeSpan, setTimeSpan] = useState('week'); // Default to a week
  const [shoppingList, setShoppingList] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    if (params.fullPlan) {
      try {
        const planData = JSON.parse(params.fullPlan);
        setFullPlan(planData);
        generateShoppingList(planData, timeSpan);
      } catch (error) {
        console.error("Error parsing plan data:", error);
      }
    }
  }, [params.fullPlan]);

  const generateShoppingList = (planData, span) => {
    // Determine how many days to include based on the timeSpan
    let daysToInclude = 7; // Default to a week
    if (span === 'day') {
      daysToInclude = 1;
    } else if (span === 'month') {
      daysToInclude = 30;
    }

    // Limit the plan to the number of days we want
    const limitedPlan = planData.slice(0, daysToInclude);

    // Create a map to track ingredients and their quantities
    const ingredientsMap = new Map();

    // Process each day's meals to extract ingredients
    limitedPlan.forEach(dayPlan => {
      if (!dayPlan.sections) return;
      
      // Process all meal types
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      mealTypes.forEach(mealType => {
        if (!dayPlan.sections[mealType]) return;
        
        // For each meal in this meal type
        dayPlan.sections[mealType].forEach(meal => {
          // Parse the meal to extract ingredients
          // This is a simplified approach assuming meal names contain ingredients
          // In a real app, you'd have a more structured meal database with ingredients
          extractIngredientsFromMeal(meal, ingredientsMap);
        });
      });
    });

    // Convert the ingredients map to an array for display
    const ingredientsList = Array.from(ingredientsMap, ([name, details]) => ({
      name,
      quantity: details.quantity,
      unit: details.unit
    }));

    // Sort alphabetically
    ingredientsList.sort((a, b) => a.name.localeCompare(b.name));

    // Group by food category
    const categorizedList = categorizeIngredients(ingredientsList);
    
    setShoppingList(categorizedList);
  };

  // Function to extract ingredients from a meal description
  const extractIngredientsFromMeal = (mealDescription, ingredientsMap) => {
    // This function would ideally parse a structured meal object
    // For this demo, we'll use a simple rule-based approach
    
    // Common ingredients by food category
    const commonIngredients = {
      'Proteins': ['chicken', 'beef', 'fish', 'salmon', 'tuna', 'eggs', 'tofu', 'tempeh', 'beans', 'lentils', 'turkey'],
      'Vegetables': ['spinach', 'kale', 'broccoli', 'carrots', 'tomatoes', 'bell peppers', 'onions', 'garlic', 'mushrooms', 'zucchini', 'cucumber', 'lettuce'],
      'Fruits': ['apples', 'bananas', 'oranges', 'berries', 'strawberries', 'blueberries', 'avocado', 'mango', 'pineapple'],
      'Grains': ['rice', 'quinoa', 'oats', 'bread', 'pasta', 'tortilla', 'cereal'],
      'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
      'Other': ['olive oil', 'nuts', 'seeds', 'honey', 'spices', 'herbs']
    };
    
    // Convert meal description to lowercase for easier matching
    const lowerMeal = mealDescription.toLowerCase();
    
    // For each category and its ingredients
    Object.entries(commonIngredients).forEach(([category, ingredients]) => {
      ingredients.forEach(ingredient => {
        if (lowerMeal.includes(ingredient)) {
          // If the ingredient is already in the map, update quantity
          if (ingredientsMap.has(ingredient)) {
            const existingDetails = ingredientsMap.get(ingredient);
            
            // Determine if we need to increment quantity
            // If it's a different meal, we increment
            if (!existingDetails.meals.includes(mealDescription)) {
              existingDetails.quantity += getIngredientQuantity(ingredient);
              existingDetails.meals.push(mealDescription);
              ingredientsMap.set(ingredient, existingDetails);
            }
          } else {
            // Add new ingredient
            ingredientsMap.set(ingredient, {
              quantity: getIngredientQuantity(ingredient),
              unit: getIngredientUnit(ingredient),
              category: category,
              meals: [mealDescription]
            });
          }
        }
      });
    });
  };

  // Function to get estimated quantity based on ingredient type
  const getIngredientQuantity = (ingredient) => {
    // This would be replaced with actual recipe data in a real app
    const quantities = {
      'chicken': 200, 'beef': 200, 'fish': 150, 'salmon': 150, 'tuna': 100,
      'eggs': 2, 'tofu': 200, 'tempeh': 100, 'beans': 200, 'lentils': 150,
      'spinach': 100, 'kale': 100, 'broccoli': 150, 'carrots': 100, 'tomatoes': 2,
      'bell peppers': 1, 'onions': 1, 'garlic': 2, 'mushrooms': 100, 'zucchini': 1,
      'apples': 1, 'bananas': 2, 'oranges': 1, 'berries': 100, 'strawberries': 100,
      'rice': 150, 'quinoa': 150, 'oats': 80, 'bread': 2, 'pasta': 100,
      'milk': 250, 'cheese': 50, 'yogurt': 150, 'butter': 50,
      'olive oil': 15, 'nuts': 50, 'seeds': 30, 'honey': 15, 'spices': 5
    };
    
    return quantities[ingredient] || 1;
  };

  // Function to get appropriate unit based on ingredient
  const getIngredientUnit = (ingredient) => {
    const units = {
      'chicken': 'g', 'beef': 'g', 'fish': 'g', 'salmon': 'g', 'tuna': 'g',
      'eggs': '', 'tofu': 'g', 'tempeh': 'g', 'beans': 'g', 'lentils': 'g',
      'spinach': 'g', 'kale': 'g', 'broccoli': 'g', 'carrots': 'g', 'tomatoes': '',
      'bell peppers': '', 'onions': '', 'garlic': 'cloves', 'mushrooms': 'g', 'zucchini': '',
      'apples': '', 'bananas': '', 'oranges': '', 'berries': 'g', 'strawberries': 'g',
      'rice': 'g', 'quinoa': 'g', 'oats': 'g', 'bread': 'slices', 'pasta': 'g',
      'milk': 'ml', 'cheese': 'g', 'yogurt': 'g', 'butter': 'g',
      'olive oil': 'ml', 'nuts': 'g', 'seeds': 'g', 'honey': 'ml', 'spices': 'g'
    };
    
    return units[ingredient] || '';
  };

  // Function to categorize ingredients by food group
  const categorizeIngredients = (ingredientsList) => {
    const categories = {
      'Proteins': [],
      'Vegetables': [],
      'Fruits': [],
      'Grains': [],
      'Dairy': [],
      'Other': []
    };
    
    ingredientsList.forEach(ingredient => {
      // Get the ingredient details from the map
      // Determine which category it belongs to
      let category = 'Other';
      
      // Example logic to assign categories
      if (['chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans', 'lentils'].some(item => ingredient.name.includes(item))) {
        category = 'Proteins';
      } else if (['spinach', 'broccoli', 'carrots', 'tomatoes', 'peppers', 'onions'].some(item => ingredient.name.includes(item))) {
        category = 'Vegetables';
      } else if (['apple', 'banana', 'orange', 'berries', 'strawberry'].some(item => ingredient.name.includes(item))) {
        category = 'Fruits';
      } else if (['rice', 'quinoa', 'oats', 'bread', 'pasta'].some(item => ingredient.name.includes(item))) {
        category = 'Grains';
      } else if (['milk', 'cheese', 'yogurt', 'butter'].some(item => ingredient.name.includes(item))) {
        category = 'Dairy';
      }
      
      categories[category].push(ingredient);
    });
    
    return categories;
  };

  const toggleItemCheck = (itemName) => {
    setCheckedItems(prevState => ({
      ...prevState,
      [itemName]: !prevState[itemName]
    }));
  };

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
                      {item.quantity}{item.unit}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ))}
      </ScrollView>
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
});