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
  Modal,
  TextInput,
} from 'react-native';
import { Settings, Bell, Heart, CircleHelp, LogOut, Camera, X, Save, Edit } from 'lucide-react-native';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db, storage } from '../../components/firebase/Firebase'; 
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [uploading, setUploading] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editedUserData, setEditedUserData] = useState<Partial<UserData>>({});
  const [updatingSettings, setUpdatingSettings] = useState(false);

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
          setEditedUserData(data); // Initialize edit form with current data
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
  
      // Check if storage is properly initialized
      console.log('Storage object:', storage);
      
      // Convert uri to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a simpler path structure
      const storageRef = ref(storage, `profileImages/profile_${currentUser.uid}.jpg`);
      console.log('Storage reference:', storageRef);
      
      // Upload the image
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        profileImage: downloadURL
      });
      
      // Update state
      setUserData(prevData => prevData ? {...prevData, profileImage: downloadURL} : null);
      setEditedUserData(prevData => ({ ...prevData, profileImage: downloadURL }));
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      console.log('Error details:', JSON.stringify(error));
      Alert.alert('Error', 'Failed to upload image. Please check the console for details.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateUserData = async () => {
    try {
      setUpdatingSettings(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You need to be logged in to update your profile.');
        return;
      }

      // Validate inputs
      if (editedUserData.name?.trim() === '') {
        Alert.alert('Invalid Input', 'Name cannot be empty');
        return;
      }

      const targetWeight = Number(editedUserData.targetWeight);
      const weight = Number(editedUserData.weight);
      
      if (isNaN(targetWeight) || targetWeight <= 0) {
        Alert.alert('Invalid Input', 'Target weight must be a positive number');
        return;
      }

      if (isNaN(weight) || weight <= 0) {
        Alert.alert('Invalid Input', 'Weight must be a positive number');
        return;
      }

      // Update Firestore document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        name: editedUserData.name,
        weight: weight,
        targetWeight: targetWeight,
        height: editedUserData.height,
      });
      
      // Update local state
      setUserData(prevData => prevData ? {...prevData, ...editedUserData} : null);
      
      Alert.alert('Success', 'Profile updated successfully!');
      setSettingsModalVisible(false);
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setUpdatingSettings(false);
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
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.uploadingText}>Updating profile picture...</Text>
              </View>
            ) : (
              <Image
                source={{ uri: userData.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            )}
            
            {/* Update profile picture button */}
            {/* <TouchableOpacity style={styles.updateProfileButton} onPress={pickImage}>
              <Camera size={24} color="#FFFFFF" />
            </TouchableOpacity> */}
            
            {/* Settings button */}
            <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsModalVisible(true)}>
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

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Profile Image Section */}
              <View style={styles.modalImageSection}>
                <Image
                  source={{ uri: editedUserData.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' }}
                  style={styles.modalProfileImage}
                />
                <TouchableOpacity style={styles.modalChangePhotoButton} onPress={pickImage}>
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.modalChangePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={editedUserData.name}
                  onChangeText={(text) => setEditedUserData(prev => ({ ...prev, name: text }))}
                  placeholder="Your name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={[styles.formInput, styles.disabledInput]}
                  value={editedUserData.email}
                  editable={false}
                />
                <Text style={styles.helperText}>Email cannot be changed</Text>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Height (feet)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editedUserData.height?.feet?.toString()}
                    onChangeText={(text) => {
                      const feet = parseInt(text) || 0;
                      setEditedUserData(prev => ({
                        ...prev,
                        height: { ...prev.height, feet }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholder="Feet"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Height (inches)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editedUserData.height?.inches?.toString()}
                    onChangeText={(text) => {
                      const inches = parseInt(text) || 0;
                      setEditedUserData(prev => ({
                        ...prev,
                        height: { ...prev.height, inches }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholder="Inches"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Weight (kg)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editedUserData.weight?.toString()}
                  onChangeText={(text) => setEditedUserData(prev => ({ ...prev, weight: parseFloat(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="Your current weight"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Target Weight (kg)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editedUserData.targetWeight?.toString()}
                  onChangeText={(text) => setEditedUserData(prev => ({ ...prev, targetWeight: parseFloat(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="Your target weight"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleUpdateUserData}
                disabled={updatingSettings}
              >
                {updatingSettings ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    height: 320, // Increased from 270 to make profile pic area larger
    width: '100%',
    position: 'relative',
    marginTop: -StatusBar.currentHeight || 0, // Remove top margin for status bar
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
    top: 50, // Positioned below status bar
    right: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
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
  updateProfileButton: {
    position: 'absolute',
    bottom: 80, // Positioned above the name
    right: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  uploadingContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    // Moved down from -20 to further increase profile pic visibility
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
  },
  modalScrollView: {
    flex: 1,
  },
  modalImageSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  modalProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  modalChangePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalChangePhotoText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
});

export default ProfileScreen;