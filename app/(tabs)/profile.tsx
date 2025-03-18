import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Linking,
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
  Edit,
  Save,
  X,
} from 'lucide-react-native';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../components/firebase/Firebase';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

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

const PROFILE_CACHE_KEY = 'profile_data_cache';
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

const ProfileScreen: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileImageKey, setProfileImageKey] = useState(Date.now());
  const lastFetchTimeRef = useRef<number>(0);

  // Add state for editing
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [editedValues, setEditedValues] = useState<{ [key: string]: any }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const getCachedUserData = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_TIME;

        if (!isExpired && data) {
          setUserData(data);
          setProfileImageKey(Date.now());
          setLoading(false);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log('Error retrieving cached data:', error);
      return false;
    }
  };

  const cacheUserData = async (data: UserData) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.log('Error caching user data:', error);
    }
  };

  const fetchUserData = useCallback(
    async (forceRefresh = false) => {
      // Use cache if not forcing refresh and cache isn't expired
      if (!forceRefresh) {
        const currentTime = Date.now();
        const timeSinceLastFetch = currentTime - lastFetchTimeRef.current;

        // Check if we've fetched within the cache period
        if (timeSinceLastFetch < CACHE_EXPIRY_TIME && userData) {
          return;
        }

        // Try to use cached data
        const usedCache = await getCachedUserData();
        if (usedCache) {
          return;
        }
      }

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

          // Cache the fetched data
          await cacheUserData(data);
        } else {
          setError('User data not found');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error loading user data');
      } finally {
        setLoading(false);
      }
    },
    [userData]
  );

  // Initial load - check cache first, then fetch if needed
  useEffect(() => {
    const initializeData = async () => {
      const usedCache = await getCachedUserData();
      if (!usedCache) {
        fetchUserData(true);
      }
    };

    initializeData();
  }, []);

  // When screen comes into focus - use cached data if valid
  useFocusEffect(
    useCallback(() => {
      fetchUserData(false);
    }, [fetchUserData])
  );

  // Function to upload image to Firebase Storage
  const uploadImage = async (uri: string): Promise<string> => {
    try {
      // Create a blob from the image URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a unique filename
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const filename = `profile_${currentUser.uid}_${Date.now()}`;

      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `profileImages/${filename}`);

      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  // Function to handle profile image edit
  const handleProfileImageEdit = async () => {
    try {
      // Check and request permissions if needed (mainly for iOS)
      if (Platform.OS !== 'web') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Sorry, we need camera roll permissions to make this work!'
          );
          return;
        }
      }

      setIsUploadingImage(true);

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Get the selected image URI
        const imageUri = result.assets[0].uri;

        // Upload image to Firebase
        const downloadURL = await uploadImage(imageUri);

        // Update Firestore document
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          profileImage: downloadURL,
        });

        // Update local state
        if (userData) {
          const updatedUserData = { ...userData, profileImage: downloadURL };
          setUserData(updatedUserData);
          await cacheUserData(updatedUserData); // Update cached data too
        }

        setProfileImageKey(Date.now()); // Force image refresh

        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert(
        'Error',
        'Failed to update profile picture. Please try again.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Function to toggle edit mode for a specific field
  const toggleEditMode = (field: string) => {
    setEditMode((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));

    // Initialize edited value with current value when entering edit mode
    if (!editMode[field]) {
      setEditedValues((prev) => ({
        ...prev,
        [field]: getFieldCurrentValue(field),
      }));
    }
  };

  // Get current value of a field
  const getFieldCurrentValue = (field: string): any => {
    if (!userData) return '';

    switch (field) {
      case 'profileImage':
        return userData.profileImage;
      case 'height':
        return userData.height;
      case 'weight':
        return userData.weight;
      case 'age':
        return userData.dateOfBirth.age;
      case 'activityLevel':
        return userData.activityLevel;
      case 'dietaryPreference':
        return userData.dietaryPreference;
      case 'targetWeight':
        return userData.targetWeight;
      default:
        return '';
    }
  };

  // Handle field value changes
  const handleFieldChange = (field: string, value: any) => {
    setEditedValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if any field is in edit mode
  const isAnyFieldInEditMode = Object.values(editMode).some((value) => value);

  // Cancel all edits
  const cancelEdits = () => {
    setEditMode({});
    setEditedValues({});
  };

  // Save changes to Firebase
  const saveChanges = async () => {
    if (!userData) return;

    try {
      setIsSaving(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError('User not authenticated');
        setIsSaving(false);
        return;
      }

      const userDocRef = doc(db, 'users', currentUser.uid);

      // Create object with updated values
      const updates: { [key: string]: any } = {};

      if (editMode.profileImage && editedValues.profileImage !== undefined) {
        updates.profileImage = editedValues.profileImage;
      }

      if (editMode.height && editedValues.height !== undefined) {
        updates.height = editedValues.height;
      }

      if (editMode.weight && editedValues.weight !== undefined) {
        updates.weight = parseFloat(editedValues.weight);
      }

      if (editMode.age && editedValues.age !== undefined) {
        updates.dateOfBirth = {
          ...userData.dateOfBirth,
          age: parseInt(editedValues.age),
        };
      }

      if (editMode.activityLevel && editedValues.activityLevel !== undefined) {
        updates.activityLevel = editedValues.activityLevel;
      }

      if (
        editMode.dietaryPreference &&
        editedValues.dietaryPreference !== undefined
      ) {
        updates.dietaryPreference = editedValues.dietaryPreference;
      }

      if (editMode.targetWeight && editedValues.targetWeight !== undefined) {
        updates.targetWeight = parseFloat(editedValues.targetWeight);

        // Also update the targetWeight in the goals array if it exists
        if (userData.goals && userData.goals.length > 0) {
          const updatedGoals = [...userData.goals];
          updatedGoals[0].targetWeight = parseFloat(editedValues.targetWeight);
          updates.goals = updatedGoals;
        }
      }

      // Update Firestore
      await updateDoc(userDocRef, updates);

      // Clear edit modes and refresh data
      setEditMode({});
      setEditedValues({});
      fetchUserData(true);

      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToSettings = () => {
    if (userData) {
      router.push({
        pathname: '/Utils/SettingsScreen',
        params: { userData: JSON.stringify(userData) },
      });
    }
  };

  // Add handler for email support
  const handleEmailSupport = () => {
    Linking.openURL('mailto:crunchx.ai@gmail.com');
  };

  const handleRegeneratePlan = () => {
    router.push('/(onboarding)/plan');
  };

  const handleLogout = async () => {
    try {
      // Clear the cache when logging out
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

            {/* Profile photo edit button */}
            <TouchableOpacity
              style={styles.profileEditButton}
              onPress={handleProfileImageEdit}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Camera size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <View style={styles.profileInfoOverlay}>
              <Text style={styles.nameOverlay}>{userData.name}</Text>
              {/* <Text style={styles.emailOverlay}>{userData.email}</Text> */}
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
              <TouchableOpacity
                style={styles.cardEditIcon}
                onPress={() => toggleEditMode('age')}
              >
                <Edit size={16} color="grey" />
              </TouchableOpacity>
              <Calendar size={20} color="#6366f1" />
              <Text style={styles.detailLabel}>Age</Text>
              {editMode.age ? (
                <TextInput
                  style={styles.detailEditInput}
                  value={String(editedValues.age)}
                  onChangeText={(text) => handleFieldChange('age', text)}
                  keyboardType="numeric"
                  autoFocus
                />
              ) : (
                <Text style={styles.detailValue}>{calculateAge()}</Text>
              )}
            </View>

            <View style={styles.detailItem}>
              <TouchableOpacity
                style={styles.cardEditIcon}
                onPress={() => toggleEditMode('height')}
              >
                <Edit size={16} color="grey" />
              </TouchableOpacity>
              <Ruler size={20} color="#f59e0b" />
              <Text style={styles.detailLabel}>Height</Text>
              {editMode.height ? (
                <View style={styles.heightInputContainer}>
                  <TextInput
                    style={[styles.heightInput, { width: '45%' }]}
                    value={String(editedValues.height.feet)}
                    onChangeText={(text) =>
                      handleFieldChange('height', {
                        ...editedValues.height,
                        feet: parseInt(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                    placeholder="Feet"
                  />
                  <Text style={styles.heightSeparator}>'</Text>
                  <TextInput
                    style={[styles.heightInput, { width: '45%' }]}
                    value={String(editedValues.height.inches)}
                    onChangeText={(text) =>
                      handleFieldChange('height', {
                        ...editedValues.height,
                        inches: parseInt(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                    placeholder="Inches"
                  />
                  <Text style={styles.heightSeparator}>"</Text>
                </View>
              ) : (
                <Text style={styles.detailValue}>
                  {formatHeight(userData.height)}
                </Text>
              )}
            </View>

            <View style={styles.detailItem}>
              <TouchableOpacity
                style={styles.cardEditIcon}
                onPress={() => toggleEditMode('weight')}
              >
                <Edit size={16} color="grey" />
              </TouchableOpacity>
              <Scale size={20} color="#ef4444" />
              <Text style={styles.detailLabel}>Weight</Text>
              {editMode.weight ? (
                <View style={styles.weightInputContainer}>
                  <TextInput
                    style={styles.detailEditInput}
                    value={String(editedValues.weight)}
                    onChangeText={(text) => handleFieldChange('weight', text)}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={styles.weightUnit}>kg</Text>
                </View>
              ) : (
                <Text style={styles.detailValue}>{userData.weight} kg</Text>
              )}
            </View>

            <View style={styles.detailItem}>
              <TouchableOpacity
                style={styles.cardEditIcon}
                onPress={() => toggleEditMode('activityLevel')}
              >
                <Edit size={16} color="grey" />
              </TouchableOpacity>
              <Dumbbell size={20} color="#8b5cf6" />
              <Text style={styles.detailLabel}>Activity</Text>
              {editMode.activityLevel ? (
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.activityOption,
                      editedValues.activityLevel === 'Low' &&
                        styles.selectedActivity,
                    ]}
                    onPress={() => handleFieldChange('activityLevel', 'Low')}
                  >
                    <Text
                      style={
                        editedValues.activityLevel === 'Low'
                          ? styles.selectedActivityText
                          : styles.activityOptionText
                      }
                    >
                      Low
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.activityOption,
                      editedValues.activityLevel === 'Moderate' &&
                        styles.selectedActivity,
                    ]}
                    onPress={() =>
                      handleFieldChange('activityLevel', 'Moderate')
                    }
                  >
                    <Text
                      style={
                        editedValues.activityLevel === 'Moderate'
                          ? styles.selectedActivityText
                          : styles.activityOptionText
                      }
                    >
                      Moderate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.activityOption,
                      editedValues.activityLevel === 'High' &&
                        styles.selectedActivity,
                    ]}
                    onPress={() => handleFieldChange('activityLevel', 'High')}
                  >
                    <Text
                      style={
                        editedValues.activityLevel === 'High'
                          ? styles.selectedActivityText
                          : styles.activityOptionText
                      }
                    >
                      High
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.detailValue}>{userData.activityLevel}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diet & Nutrition</Text>
            <Apple size={20} color="#22c55e" />
          </View>
          <View style={styles.dietRow}>
            <View style={styles.dietaryHeader}>
              <View style={styles.dietBadge}>
                <Utensils size={16} color="#22c55e" />
                {editMode.dietaryPreference ? (
                  <View style={styles.dietaryOptionsContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {[
                        'Vegetarian',
                        'Non-Vegetarian',
                        'Vegan',
                        'Keto',
                        'Paleo',
                        'Mediterranean',
                      ].map((diet) => (
                        <TouchableOpacity
                          key={diet}
                          style={[
                            styles.dietaryOption,
                            editedValues.dietaryPreference === diet &&
                              styles.selectedDietaryOption,
                          ]}
                          onPress={() =>
                            handleFieldChange('dietaryPreference', diet)
                          }
                        >
                          <Text
                            style={
                              editedValues.dietaryPreference === diet
                                ? styles.selectedDietaryOptionText
                                : styles.dietaryOptionText
                            }
                          >
                            {diet}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <Text style={styles.dietBadgeText}>
                    {userData.dietaryPreference}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.dietEditIcon}
                onPress={() => toggleEditMode('dietaryPreference')}
              >
                <Edit size={16} color="grey" />
              </TouchableOpacity>
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
            {userData.goals.length > 0 && (
              <View style={styles.goalItem}>
                <Award size={18} color="#22c55e" />
                <Text style={styles.goalText}>
                  {userData.goals[userData.goals.length - 1].title + ' ' ||
                    'Custom Goal'}
                </Text>
                {!editMode.targetWeight ? (
                  <View style={styles.targetWeightContainer}>
                    <Text style={styles.goalSubText}>
                      (Target: {userData.targetWeight} kg)
                    </Text>
                    <TouchableOpacity
                      style={styles.smallEditIcon}
                      onPress={() => toggleEditMode('targetWeight')}
                    >
                      <Edit size={14} color="#666" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.targetWeightEditContainer}>
                    <TextInput
                      style={styles.targetWeightInput}
                      value={String(editedValues.targetWeight)}
                      onChangeText={(text) =>
                        handleFieldChange('targetWeight', text)
                      }
                      keyboardType="numeric"
                      placeholder="Target Weight (kg)"
                      autoFocus
                    />
                    <Text style={styles.weightUnit}>kg</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Need help button */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={handleEmailSupport}
        >
          <Text style={styles.helpText}>Need help?</Text>
        </TouchableOpacity>

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

        <View style={{ height: 100 }} />
      </ScrollView>

      {isAnyFieldInEditMode && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelEdits}>
            <X size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveChanges}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// Extended styles
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
  profileEditButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
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
    position: 'relative',
  },
  cardEditIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
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
  targetWeightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetWeightEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  targetWeightInput: {
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
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
  // Help button styles
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f9ff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
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
  // Edit mode styles
  editableFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallEditIcon: {
    marginLeft: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dietEditIcon: {
    marginLeft: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },
  detailEditInput: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
    textAlign: 'center',
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    width: '80%',
  },
  heightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  heightInput: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
    textAlign: 'center',
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heightSeparator: {
    marginHorizontal: 2,
    fontSize: 16,
    color: '#2D2D2D',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  weightUnit: {
    marginLeft: 4,
    fontSize: 16,
    color: '#2D2D2D',
  },
  dietaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dietaryOptionsContainer: {
    marginLeft: 6,
  },
  dietaryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  selectedDietaryOption: {
    backgroundColor: '#22c55e',
  },
  dietaryOptionText: {
    fontSize: 14,
    color: '#22c55e',
  },
  selectedDietaryOptionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  goalSubText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  pickerContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  activityOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  selectedActivity: {
    backgroundColor: '#8b5cf6',
  },
  activityOptionText: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  selectedActivityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default ProfileScreen;
