import React, { useEffect, useState } from 'react';
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
import { collection, doc, getDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../components/firebase/Firebase'; 
import { router } from 'expo-router';

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

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
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
        } else {
          setError('User data not found');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error loading user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

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

  // Dummy progress data for engagement features - calculate these values based on userData
  const weightProgress =
    ((userData.weight - userData.targetWeight) / 5) * 100;
  
  // These could potentially come from Firebase as well in a future implementation
  const weeklyActivity = [5, 3, 6, 4, 7, 5, 6]; // Days active

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header with full-width background image */}
        <View style={styles.profileHeaderContainer}>
          <View style={styles.coverImageContainer}>
            <Image
              source={{ uri: userData.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }}
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

        {/* Progress Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weight Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(weightProgress)}% to goal
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${weightProgress}%` }]}
            />
          </View>
          <View style={styles.weightStats}>
            <Text style={styles.weightStat}>
              Current: {userData.weight}kg
            </Text>
            <Text style={styles.weightStat}>
              Target: {userData.targetWeight}kg
            </Text>
          </View>
        </View>

        {/* Weekly Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Activity</Text>
          <View style={styles.weekGrid}>
            {weeklyActivity.map((days, index) => (
              <View key={index} style={styles.dayPill}>
                <Text style={styles.dayText}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}
                </Text>
                <View style={[styles.activityDot, { opacity: days / 7 }]} />
              </View>
            ))}
          </View>
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
  scrollView: {
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
    elevation: 2,
    marginHorizontal: 16,
    marginTop: -10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '70%',
    backgroundColor: '#ddd',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameIcon: {
    fontSize: 20,
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weightStat: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dayPill: {
    alignItems: 'center',
  },
  dayText: {
    fontFamily: 'Inter-Medium',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  regenerateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#22c55e',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default ProfileScreen;