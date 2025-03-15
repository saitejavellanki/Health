import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Settings, Bell, Heart, CircleHelp, LogOut, Camera, RefreshCw } from 'lucide-react-native';
import { collection, doc, getDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../components/firebase/Firebase'; 
import { router, useFocusEffect } from 'expo-router';
import { BarChart } from 'react-native-chart-kit';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface UserData {
  name: string;
  email: string;
  profileImage: string;
  height: { feet: number; inches: number };
  weight: number;
  targetWeight: number;
  streak: number;
  totalWorkouts: number;
  dateJoined: string;
}

interface NutritionData {
  date: string;
  protein: number;
  carbs: number;
  calories: number;
}

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileImageKey, setProfileImageKey] = useState(Date.now()); // Add a key to force image refresh
  const [activeNutrient, setActiveNutrient] = useState<'protein' | 'carbs' | 'calories'>('calories');

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
        // Reset the profile image key to force a refresh
        setProfileImageKey(Date.now());
        
        // After successful user data fetch, get nutrition data
        await fetchNutritionData(currentUser.uid);
      } else {
        setError('User data not found');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Error loading user data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchNutritionData = async (userId: string) => {
    try {
      // Get data for the last 7 days
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6); // Get 7 days including today
      
      const mealsQuery = query(
        collection(db, 'meals'),
        where('userId', '==', userId),
        where('timestamp', '>=', sevenDaysAgo),
        orderBy('timestamp', 'asc')
      );
      
      const mealsSnapshot = await getDocs(mealsQuery);
      
      // Process meal data by date
      const mealsByDate: { [date: string]: { protein: number, carbs: number, calories: number } } = {};
      
      mealsSnapshot.forEach((doc) => {
        const mealData = doc.data();
        const mealDate = new Date(mealData.timestamp.toDate()).toISOString().split('T')[0];
        
        if (!mealsByDate[mealDate]) {
          mealsByDate[mealDate] = { protein: 0, carbs: 0, calories: 0 };
        }
        
        mealsByDate[mealDate].protein += mealData.protein || 0;
        mealsByDate[mealDate].carbs += mealData.carbs || 0;
        mealsByDate[mealDate].calories += mealData.calories || 0;
      });
      
      // Create an array of the last 7 days
      const last7Days: NutritionData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() - (6 - i));
        const dateString = date.toISOString().split('T')[0];
        const dayData = mealsByDate[dateString] || { protein: 0, carbs: 0, calories: 0 };
        
        last7Days.push({
          date: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          protein: dayData.protein,
          carbs: dayData.carbs,
          calories: dayData.calories
        });
      }
      
      setNutritionData(last7Days);
    } catch (err) {
      console.error('Error fetching nutrition data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUserData();
  }, []);
  
  // Refetch when screen comes into focus (when navigating back)
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const navigateToSettings = () => {
    // Navigate to settings screen with userData as params
    if (userData) {
      router.push({
        pathname: '/Utils/SettingsScreen',
        params: { userData: JSON.stringify(userData) }
      });
    }
  };

  const handleRegeneratePlan = () => {
    router.push('/(onboarding)/plan');
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out: ', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };
  
  const getNutrientColor = (nutrient: string) => {
    switch (nutrient) {
      case 'protein': return '#22c55e'; // Green for protein
      case 'carbs': return '#3b82f6'; // Blue for carbs
      case 'calories': return '#ef4444'; // Red for calories
      default: return '#22c55e';
    }
  };
  
  const getActiveTabStyle = (nutrient: 'protein' | 'carbs' | 'calories') => {
    return activeNutrient === nutrient ? 
      { ...styles.nutrientTab, backgroundColor: getNutrientColor(nutrient) } : 
      styles.nutrientTab;
  };
  
  const getActiveTextStyle = (nutrient: 'protein' | 'carbs' | 'calories') => {
    return activeNutrient === nutrient ? 
      { ...styles.nutrientText, color: '#FFFFFF' } : 
      styles.nutrientText;
  };

  // If loading, show a loading indicator
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Regular' }}>Loading profile...</Text>
      </View>
    );
  }

  // If error or no user data, show an error message
  if (error || !userData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <CircleHelp size={48} color="#FF6B6B" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Regular', color: '#FF6B6B' }}>
          {error || 'Unable to load profile'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header with full-width background image */}
        <View style={styles.profileHeaderContainer}>
          <View style={styles.coverImageContainer}>
            <Image
              key={profileImageKey} // Add key to force refresh when changed
              source={{ 
                uri: userData.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg',
                cache: 'reload' // Force image cache to reload
              }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            
            {/* Settings button */}
            <TouchableOpacity style={styles.settingsButton} onPress={navigateToSettings}>
              <Settings size={22} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Profile info on top of image */}
            <View style={styles.profileInfoOverlay}>
              <Text style={styles.nameOverlay}>{userData.name}</Text>
              <Text style={styles.emailOverlay}>{userData.email}</Text>
            </View>
          </View>

          {/* Streak container - moved downward */}
          <View style={styles.streakContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.mealsTrackedToday || 0}</Text>
              <Text style={styles.statLabel}>Meals Tracked</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <View style={styles.streakValueContainer}>
                <Text style={styles.statValue}>{userData.streak || 0}</Text>
                {userData.streak > 0 && (
                  <Text style={styles.flameIcon}>🔥</Text>
                )}
              </View>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Nutrition Intake Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Intake (Last 7 Days)</Text>
          
          {nutritionData.length > 0 ? (
            <>
              {/* Nutrient Selector Tabs */}
              <View style={styles.nutrientTabsContainer}>
                <TouchableOpacity 
                  style={getActiveTabStyle('calories')}
                  onPress={() => setActiveNutrient('calories')}
                >
                  <Text style={getActiveTextStyle('calories')}>Calories</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={getActiveTabStyle('protein')}
                  onPress={() => setActiveNutrient('protein')}
                >
                  <Text style={getActiveTextStyle('protein')}>Protein</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={getActiveTabStyle('carbs')}
                  onPress={() => setActiveNutrient('carbs')}
                >
                  <Text style={getActiveTextStyle('carbs')}>Carbs</Text>
                </TouchableOpacity>
              </View>
              
              {/* Bar Chart for selected nutrient */}
              <View style={styles.chartContainer}>
                <BarChart
                  data={{
                    labels: nutritionData.map(day => day.date),
                    datasets: [
                      {
                        data: activeNutrient === 'calories' 
                          ? nutritionData.map(day => day.calories)
                          : activeNutrient === 'protein'
                            ? nutritionData.map(day => day.protein)
                            : nutritionData.map(day => day.carbs)
                      }
                    ]
                  }}
                  width={screenWidth - 32}
                  height={220}
                  yAxisLabel={activeNutrient === 'calories' ? '' : ''}
                  yAxisSuffix={activeNutrient === 'calories' ? ' cal' : 'g'}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => getNutrientColor(activeNutrient),
                    labelColor: (opacity = 1) => '#333333',
                    barPercentage: 0.7,
                    style: {
                      borderRadius: 16
                    }
                  }}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                />
              </View>
              
              {/* Summary Cards */}
              <View style={styles.summaryCardsContainer}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Avg. Calories</Text>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                    {Math.round(nutritionData.reduce((sum, day) => sum + day.calories, 0) / nutritionData.length)}
                  </Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Avg. Protein</Text>
                  <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                    {Math.round(nutritionData.reduce((sum, day) => sum + day.protein, 0) / nutritionData.length)}g
                  </Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Avg. Carbs</Text>
                  <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
                    {Math.round(nutritionData.reduce((sum, day) => sum + day.carbs, 0) / nutritionData.length)}g
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No nutrition data available</Text>
              <Text style={styles.noDataSubtext}>Start tracking your meals to see stats here</Text>
            </View>
          )}
        </View>

        {/* Regenerate Plan Button */}
        <TouchableOpacity style={styles.regenerateButton} onPress={handleRegeneratePlan}>
          <RefreshCw size={24} color="#22c55e" />
          <Text style={styles.regenerateText}>Regenerate Plan</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    scrollContent: {
      paddingBottom: 30,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileHeaderContainer: {
      marginBottom: 16,
    },
    coverImageContainer: {
      height: 320,
      width: '100%',
      position: 'relative',
      marginTop: -StatusBar.currentHeight || 0,
    },
    coverImage: {
      height: '100%',
      width: '100%',
    },
    profileInfoOverlay: {
      position: 'absolute',
      bottom: 20,
      left: 20,
    },
    nameOverlay: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: '#FFFFFF',
      marginBottom: 4,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    emailOverlay: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    settingsButton: {
      position: 'absolute',
      top: 50,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
    },
    streakContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      padding: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 15,
      elevation: 5,
      marginHorizontal: 16,
      marginTop: -30,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      width: 1,
      height: 40,
      backgroundColor: '#E1E1E1',
    },
    streakValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 22,
      fontFamily: 'Inter-Bold',
      color: '#333333',
    },
    statLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#666666',
      marginTop: 4,
    },
    flameIcon: {
      fontSize: 20,
      marginLeft: 4,
    },
    section: {
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: '#333333',
      marginBottom: 16,
    },
    chartContainer: {
      marginVertical: 8,
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 8,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    chart: {
      borderRadius: 16,
      marginVertical: 8,
    },
    // Styles for Bar Chart version
    nutrientTabsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    nutrientTab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      marginHorizontal: 4,
      borderRadius: 8,
      backgroundColor: '#F3F4F6',
    },
    nutrientText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: '#333333',
    },
    summaryCardsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 4,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 1,
    },
    summaryLabel: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: '#666666',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
    },
    // Styles for Line Chart version
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
      flexWrap: 'wrap',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      marginBottom: 8,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 6,
    },
    legendText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#333333',
    },
    noDataContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      height: 150,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    noDataText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#666666',
      marginBottom: 8,
    },
    noDataSubtext: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#888888',
      textAlign: 'center',
    },
    regenerateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ECFDF5',
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    regenerateText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#22c55e',
      marginLeft: 8,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FEF2F2',
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
    },
    logoutText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#ef4444',
      marginLeft: 8,
    }
});

export default ProfileScreen;