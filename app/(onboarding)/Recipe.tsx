import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { ArrowLeft, Clock, Users, Bookmark, Youtube } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAucRYgtPspGpF9vuHh_8VzrRwzIfNqv0M';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default function Recipe() {
  const params = useLocalSearchParams();
  const { mealType, mealName, calories } = params;
  
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipeFromGemini = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create prompt for Gemini
        const prompt = `Create a detailed recipe for "${mealName}" which is a ${mealType} meal with approximately ${calories || '500'} calories.
        
        Format the response as a JSON object with the following structure:
        {
          "name": "Recipe name",
          "type": "Type of meal",
          "calories": calories as number,
          "prepTime": "prep time in minutes",
          "cookTime": "cook time in minutes",
          "servings": number of servings,
          "ingredients": ["ingredient 1", "ingredient 2", ...],
          "instructions": ["step 1", "step 2", ...],
          "nutritionFacts": {
            "protein": "protein in grams",
            "carbs": "carbs in grams",
            "fat": "fat in grams",
            "fiber": "fiber in grams",
            "sugar": "sugar in grams"
          },
          "tips": "cooking tip or suggestion",
          "youtubeLinks": [
            {
              "title": "Video title",
              "url": "YouTube URL"
            }
          ]
        }

        Make sure the ingredients and instructions are detailed but concise. The nutrition facts should be realistic for the recipe. Also include 1-2 relevant YouTube tutorial links for this recipe if possible.`;

        console.log('Sending request to Gemini API...');
        
        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const responseData = await response.json();
        
        // Parse Gemini response
        if (responseData.candidates && responseData.candidates.length > 0) {
          const textContent = responseData.candidates[0].content.parts[0].text;
          
          // Extract JSON from the response (Gemini might wrap it in markdown code blocks)
          const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/) || 
                            textContent.match(/```\n([\s\S]*?)\n```/) ||
                            textContent.match(/{[\s\S]*?}/);
          
          let recipeData;
          if (jsonMatch) {
            const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
            recipeData = JSON.parse(jsonString);
          } else {
            try {
              // Try to parse the whole response as JSON
              recipeData = JSON.parse(textContent);
            } catch (e) {
              throw new Error('Failed to parse recipe data from response');
            }
          }
          
          // Set the recipe data
          setRecipe(recipeData);
        } else {
          throw new Error('No content in API response');
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching recipe:", error);
        setError(error.message);
        setLoading(false);
        
        // Fallback to mock data in case of error
        const mockRecipe = {
          name: mealName,
          type: mealType,
          calories: parseInt(calories) || 500,
          prepTime: "15 mins",
          cookTime: "25 mins",
          servings: 2,
          ingredients: [
            "2 cups main ingredient",
            "1 cup secondary ingredient",
            "Spices and seasonings to taste"
          ],
          instructions: [
            "Prepare the ingredients.",
            "Cook according to preference.",
            "Serve and enjoy!"
          ],
          nutritionFacts: {
            protein: "15g",
            carbs: "60g",
            fat: "15g",
            fiber: "8g",
            sugar: "10g"
          },
          tips: "Customize based on your preferences.",
          youtubeLinks: [
            {
              title: "How to make " + mealName,
              url: "https://www.youtube.com/results?search_query=how+to+make+" + encodeURIComponent(mealName)
            }
          ]
        };
        
        setRecipe(mockRecipe);
      }
    };

    fetchRecipeFromGemini();
  }, [mealName, mealType, calories]);

  const goBack = () => {
    router.back();
  };

  const openYoutubeLink = (url) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Cannot open URL: " + url);
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Crafting your recipe...</Text>
      </View>
    );
  }

  if (error && !recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Something went wrong: {error}</Text>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Recipe not found.</Text>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.mealType}>{recipe.type}</Text>
          <Text style={styles.recipeName}>{recipe.name}</Text>
        </View>
        <Pressable style={styles.saveButton}>
          <Bookmark size={24} color="#22c55e" />
        </Pressable>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Clock size={16} color="#64748b" />
          <Text style={styles.infoText}>{recipe.prepTime} prep</Text>
        </View>
        <View style={styles.infoItem}>
          <Clock size={16} color="#64748b" />
          <Text style={styles.infoText}>{recipe.cookTime} cook</Text>
        </View>
        <View style={styles.infoItem}>
          <Users size={16} color="#64748b" />
          <Text style={styles.infoText}>{recipe.servings} servings</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoText}>{recipe.calories} cal</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            Note: Using backup recipe data. Original error: {error}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {recipe.ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientItem}>
            <View style={styles.bullet} />
            <Text style={styles.ingredientText}>{ingredient}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {recipe.instructions.map((step, index) => (
          <View key={index} style={styles.instructionItem}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
            <Text style={styles.instructionText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Facts</Text>
        <View style={styles.nutritionContainer}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.nutritionFacts.protein}</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.nutritionFacts.carbs}</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.nutritionFacts.fat}</Text>
            <Text style={styles.nutritionLabel}>Fat</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.nutritionFacts.fiber}</Text>
            <Text style={styles.nutritionLabel}>Fiber</Text>
          </View>
        </View>
      </View>

      {recipe.tips && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chef Tips</Text>
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>{recipe.tips}</Text>
          </View>
        </View>
      )}

      {recipe.youtubeLinks && recipe.youtubeLinks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Tutorials</Text>
          {recipe.youtubeLinks.map((link, index) => (
            <Pressable 
              key={index} 
              style={styles.youtubeLinkContainer}
              onPress={() => openYoutubeLink(link.url)}
            >
              <Youtube size={24} color="#FF0000" />
              <Text style={styles.youtubeLinkText}>{link.title}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#b91c1c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#22c55e',
    marginTop: 8,
  },
  saveButton: {
    padding: 8,
  },
  mealType: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  recipeName: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  section: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 12,
  },
  ingredientText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1a1a1a',
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#22c55e',
    width: 24,
  },
  instructionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  nutritionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  tipContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#15803d',
  },
  youtubeLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  youtubeLinkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  }
});