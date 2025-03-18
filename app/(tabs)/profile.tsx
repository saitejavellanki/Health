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
import {
  Settings,
  Bell,
  Heart,
  CircleHelp,
  LogOut,
  Camera,
  RefreshCw,
  User,
  Calendar,
  Scale,
  Ruler,
  Utensils,
  Clock,
  TrendingUp,
  Award,
  Apple,
  Dumbbell,
  Target,
  Zap,
} from 'lucide-react-native';
import { collection, doc, getDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../components/firebase/Firebase';
import { router, useFocusEffect } from 'expo-router';

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
  dateJoined: any;
  dateOfBirth: { age: number; timestamp?: string };
  dietaryPreference: string;
  mealsTrackedToday: number;
  activityLevel: string;
  goals: Array<{ id?: string; title?: string; targetWeight?: number }>;
}

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileImageKey, setProfileImageKey] = useState(Date.now());

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
        const firestoreData = userDoc.data();
        const goals = firestoreData.goals || [];

        // Get targetWeight from first goal or fallback to root value
        const targetWeight =
          goals[0]?.targetWeight || firestoreData.targetWeight || 100;

        const data = {
          ...firestoreData,
          dateOfBirth: firestoreData.dateOfBirth || { age: 25 },
          dietaryPreference: firestoreData.dietaryPreference || 'Balanced',
          activityLevel: firestoreData.activityLevel || 'Moderate',
          goals,
          targetWeight,
          weight: firestoreData.weight || 70,
        } as UserData;

        setUserData(data);
        setProfileImageKey(Date.now());
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

  useEffect(() => {
    fetchUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const navigateToSettings = () => {
    if (userData) {
      router.push({
        pathname: '/Utils/SettingsScreen',
        params: { userData: JSON.stringify(userData) },
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

  const formatHeight = (height: { feet: number; inches: number }) => {
    return `${height.feet}' ${height.inches}"`;
  };

  const calculateAge = () => {
    if (!userData) return 0;
    return userData.dateOfBirth?.age || 25;
  };

  const getDaysUntilGoal = () => {
    if (!userData) return 0;

    const weightDifference = Math.abs(userData.weight - userData.targetWeight);
    if (weightDifference <= 0) return 0;

    return Math.ceil(weightDifference / 0.5) * 7;
  };

  const calculateWeightProgress = () => {
    if (!userData) return 0;

    if (userData.targetWeight > userData.weight) {
      const progress = (userData.weight / userData.targetWeight) * 100;
      return Math.min(100, Math.max(0, progress));
    }

    const progress =
      100 - ((userData.weight - userData.targetWeight) / userData.weight) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const formatJoinDate = (dateJoined: any) => {
    if (dateJoined?.seconds) {
      return new Date(dateJoined.seconds * 1000).toLocaleDateString();
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Regular' }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <CircleHelp size={48} color="#FF6B6B" />
        <Text
          style={{
            marginTop: 12,
            fontFamily: 'Inter-Regular',
            color: '#FF6B6B',
          }}
        >
          {error || 'Unable to load profile'}
        </Text>
      </View>
    );
  }

  const weightProgress = calculateWeightProgress();

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileHeaderContainer}>
          <View style={styles.coverImageContainer}>
            <Image
              key={profileImageKey}
              source={{
                uri:
                  userData.profileImage ||
                  'https://res.cloudinary.com/dzlvcxhuo/image/upload/v1742205498/placeholder_for_dp_nsojeb.jpg',
                cache: 'reload',
              }}
              style={styles.coverImage}
              resizeMode="cover"
            />

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={navigateToSettings}
            >
              <Settings size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.profileInfoOverlay}>
              <Text style={styles.nameOverlay}>{userData.name}</Text>
              <Text style={styles.emailOverlay}>{userData.email}</Text>
            </View>
          </View>

          <View style={styles.streakContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {userData.mealsTrackedToday || 0}
              </Text>
              <Text style={styles.statLabel}>Meals Scanned</Text>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <User size={20} color="#22c55e" />
          </View>
          <View style={styles.userDetailsGrid}>
            <View style={styles.detailItem}>
              <Calendar size={20} color="#6366f1" />
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>{calculateAge()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ruler size={20} color="#f59e0b" />
              <Text style={styles.detailLabel}>Height</Text>
              <Text style={styles.detailValue}>
                {formatHeight(userData.height)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Scale size={20} color="#ef4444" />
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{userData.weight} kg</Text>
            </View>
            <View style={styles.detailItem}>
              <Dumbbell size={20} color="#8b5cf6" />
              <Text style={styles.detailLabel}>Activity</Text>
              <Text style={styles.detailValue}>{userData.activityLevel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diet & Nutrition</Text>
            <Apple size={20} color="#22c55e" />
          </View>
          <View style={styles.dietRow}>
            <View style={styles.dietBadge}>
              <Utensils size={16} color="#22c55e" />
              <Text style={styles.dietBadgeText}>
                {userData.dietaryPreference}
              </Text>
            </View>
            <View style={styles.dietaryInfo}>
              <Text style={styles.dietaryDescription}>
                Your preferred diet pattern helps us create meal plans tailored
                to your needs.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Goals</Text>
            <Target size={20} color="#22c55e" />
          </View>
          <View style={styles.goalsContainer}>
            {/* {userData.goals.map((goal, index) => (
              <View key={index} style={styles.goalItem}>
                <Award size={18} color="#22c55e" />
                <Text style={styles.goalText}>
                  {goal.title + ' ' || 'Custom Goal'}
                </Text>
                {goal.targetWeight && (
                  <Text style={styles.goalSubText}>
                    (Target: {goal.targetWeight} kg)
                  </Text>
                )}
              </View>
            ))} */}
            {userData.goals.length > 0 && (
              <View style={styles.goalItem}>
                <Award size={18} color="#22c55e" />
                <Text style={styles.goalText}>
                  {userData.goals[userData.goals.length - 1].title + ' ' ||
                    'Custom Goal'}
                </Text>
                {userData.goals[userData.goals.length - 1].targetWeight && (
                  <Text style={styles.goalSubText}>
                    (Target:{' '}
                    {userData.goals[userData.goals.length - 1].targetWeight} kg)
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weight Progress</Text>
            <TrendingUp size={20} color="#22c55e" />
          </View>
          <View style={styles.weightStats}>
            <View style={styles.weightStatItem}>
              <Text style={styles.weightLabel}>Current</Text>
              <Text style={styles.weightValue}>{userData.weight} kg</Text>
            </View>
            <Zap size={24} color="#22c55e" />
            <View style={styles.weightStatItem}>
              <Text style={styles.weightLabel}>Target</Text>
              <Text style={styles.weightValue}>{userData.targetWeight} kg</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${weightProgress}%` }]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(weightProgress)}% to goal
            </Text>
          </View>
          <View style={styles.estimatedTimeContainer}>
            <Clock size={16} color="#666" />
            <Text style={styles.estimatedTimeText}>
              Estimated time to goal: {getDaysUntilGoal()} days
            </Text>
          </View>
        </View> */}

        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workout Stats</Text>
            <Dumbbell size={20} color="#22c55e" />
          </View>
          <View style={styles.workoutStatsContainer}>
            <View style={styles.workoutStat}>
              <Text style={styles.workoutStatValue}>
                {userData.totalWorkouts || 0}
              </Text>
              <Text style={styles.workoutStatLabel}>Total Workouts</Text>
            </View>
            <View style={styles.workoutStat}>
              <Text style={styles.workoutStatValue}>
                {userData.streak || 0}
              </Text>
              <Text style={styles.workoutStatLabel}>Current Streak</Text>
            </View>
            <View style={styles.workoutStat}>
              <Text style={styles.workoutStatValue}>
                {formatJoinDate(userData.dateJoined)}
              </Text>
              <Text style={styles.workoutStatLabel}>Member Since</Text>
            </View>
          </View>
        </View> */}

        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={handleRegeneratePlan}
        >
          <RefreshCw size={24} color="#22c55e" />
          <Text style={styles.regenerateText}>Regenerate Plan</Text>
        </TouchableOpacity>

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
    top: Platform.OS === 'android' ? 50 + (StatusBar.currentHeight || 0) : 50,
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
  userDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 8,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
    marginTop: 4,
  },
  dietRow: {
    flexDirection: 'column',
  },
  dietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dietBadgeText: {
    color: '#22c55e',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginLeft: 6,
  },
  dietaryInfo: {
    marginTop: 8,
  },
  dietaryDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  goalsContainer: {
    marginTop: 4,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  goalText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  weightLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'right',
  },
  estimatedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  estimatedTimeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 8,
  },
  workoutStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  workoutStat: {
    width: '33%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  workoutStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  workoutStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#FFF1F1',
    marginHorizontal: 16,
    marginBottom: 30,
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
