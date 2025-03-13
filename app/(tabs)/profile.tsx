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
} from 'react-native';
import { Settings, Bell, CreditCard, Heart, CircleHelp, LogOut } from 'lucide-react-native';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db, storage } from '../../components/firebase/Firebase'; 
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

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

const MENU_ITEMS = [
  { icon: Settings, label: 'Settings', route: '/(onboarding)/plan' },
  { icon: Bell, label: 'Notifications', route: '/notifications' },
  { icon: CreditCard, label: 'Payment Methods', route: '/payments' },
  { icon: Heart, label: 'Favorites', route: '/favorites' },
  { icon: CircleHelp, label: 'Help & Support', route: '/support' },
];

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const pickImage = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need camera roll permissions to upload a profile picture.');
          return;
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You need to be logged in to update your profile.');
        return;
      }

      // Convert uri to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a unique filename
      const filename = `profile_${currentUser.uid}_${new Date().getTime()}`;
      const storageRef = ref(storage, `profileImages/${filename}`);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        profileImage: downloadURL
      });
      
      // Update local state
      setUserData(prevData => prevData ? {...prevData, profileImage: downloadURL} : null);
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
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

  const handleMenuItemPress = (route: string) => {
    router.push(route);
  };

  // If loading, show a loading indicator
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Regular' }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // If error or no user data, show an error message
  if (error || !userData) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <CircleHelp size={48} color="#FF6B6B" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Regular', color: '#FF6B6B' }}>
          {error || 'Unable to load profile'}
        </Text>
      </SafeAreaView>
    );
  }

  // Dummy progress data for engagement features - calculate these values based on userData
  const weightProgress =
    ((userData.weight - userData.targetWeight) / 5) * 100;
  
  // These could potentially come from Firebase as well in a future implementation
  const weeklyActivity = [5, 3, 6, 4, 7, 5, 6]; // Days active

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: userData.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
                <View style={styles.editIconContainer}>
                  <Settings size={16} color="#FFFFFF" />
                </View>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.name}>{userData.name}</Text>
          <Text style={styles.email}>{userData.email}</Text>

          <View style={styles.streakContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.totalWorkouts || 0}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.streak || 0}</Text>
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

        {/* Menu Items */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.route)}
            >
              <item.icon size={24} color="#64748b" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  scrollView: {
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderColor: '#22c55e',
    paddingTop: 50,
  },
  avatarContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#22c55e',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#22c55e',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#22c55e',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginBottom: 12,
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
    width: '90%',
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
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
  menu: {
    padding: 16,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 12,
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