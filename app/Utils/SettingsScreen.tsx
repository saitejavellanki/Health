import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { X, Save, Camera, ChevronLeft, Check } from 'lucide-react-native';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db, storage } from '../../components/firebase/Firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { router, useLocalSearchParams } from 'expo-router';

// Diet types and goals data
const DIET_TYPES = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'non-vegetarian', label: 'Non-Vegetarian' },
  { id: 'ketogenic', label: 'Ketogenic' },
];

const GOALS = [
  {
    id: 'weight-loss',
    title: 'Weight Loss',
    description: 'Healthy and sustainable weight loss through balanced nutrition',
    requiresTarget: true,
  },
  {
    id: 'weight-gain',
    title: 'Weight Gain',
    description: 'Healthy weight gain with nutrient-dense meal plans',
    requiresTarget: true,
  },
  {
    id: 'muscle-gain',
    title: 'Muscle Gain',
    description: 'Build lean muscle mass with protein-rich meal plans',
  },
  {
    id: 'maintenance',
    title: 'Maintain Shape',
    description: 'Keep your current weight while improving overall nutrition',
  },
  {
    id: 'performance',
    title: 'Athletic Performance',
    description: 'Optimize your nutrition for better athletic performance',
  },
];

interface UserData {
  name: string;
  email: string;
  profileImage: string;
  height: { feet: number; inches: number };
  weight: number;
  targetWeight: number;
  streak?: number;
  totalWorkouts?: number;
  dateJoined?: string;
  goals?: Array<{
    id: string;
    title: string;
    createdAt: any;
    targetWeight?: number;
  }>;
  dietType?: string;
}

const SettingsScreen: React.FC = () => {
  const params = useLocalSearchParams();
  
  // Parse userData from params - only once on component mount
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editedUserData, setEditedUserData] = useState<UserData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Goal and diet type state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDietTypeModal, setShowDietTypeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [showTargetWeightModal, setShowTargetWeightModal] = useState(false);
  const [selectedDietType, setSelectedDietType] = useState('');

  // Use empty dependency array to run only once on mount
  useEffect(() => {
    const initializeUserData = () => {
      if (params.userData) {
        try {
          const parsedData = JSON.parse(params.userData as string) as UserData;
          setUserData(parsedData);
          setEditedUserData(parsedData);
          
          // Set initial values for goals and diet type if they exist
          if (parsedData.goals && parsedData.goals.length > 0) {
            const currentGoal = parsedData.goals[parsedData.goals.length - 1];
            setSelectedGoal(currentGoal.id);
            if (currentGoal.targetWeight) {
              setTargetWeight(String(currentGoal.targetWeight));
            }
          }
          
          if (parsedData.dietType) {
            setSelectedDietType(parsedData.dietType);
          }
          
          setIsLoaded(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          Alert.alert('Error', 'Failed to load user data');
          router.back();
        }
      } else {
        Alert.alert('Error', 'No user data provided');
        router.back();
      }
    };

    initializeUserData();
  }, []); // Empty dependency array means this runs once on mount

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
        setImageError(false);
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
      
      // Create a simpler path structure
      const storageRef = ref(storage, `profileImages/profile_${currentUser.uid}.jpg`);
      
      // Upload the image
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update local state
      if (editedUserData) {
        setEditedUserData({...editedUserData, profileImage: downloadURL});
      }
      
      Alert.alert('Success', 'Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedUserData) return;
    
    try {
      setUpdating(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You need to be logged in to update your profile.');
        return;
      }

      // Validate inputs
      if (editedUserData.name?.trim() === '') {
        Alert.alert('Invalid Input', 'Name cannot be empty');
        setUpdating(false);
        return;
      }

      const targetWeightValue = Number(editedUserData.targetWeight);
      const weight = Number(editedUserData.weight);
      
      if (isNaN(targetWeightValue) || targetWeightValue <= 0) {
        Alert.alert('Invalid Input', 'Target weight must be a positive number');
        setUpdating(false);
        return;
      }

      if (isNaN(weight) || weight <= 0) {
        Alert.alert('Invalid Input', 'Weight must be a positive number');
        setUpdating(false);
        return;
      }

      // Get user doc to check existing goals
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Prepare update data
      const updateData: any = {
        name: editedUserData.name,
        weight: weight,
        targetWeight: targetWeightValue,
        height: editedUserData.height,
        profileImage: editedUserData.profileImage,
      };
      
      // Add diet type if it exists
      if (selectedDietType) {
        updateData.dietType = selectedDietType;
      }

      // Update Firestore document
      await updateDoc(userDocRef, updateData);
      
      // Handle goal updates separately if a goal is selected
      if (selectedGoal) {
        // Find the complete goal object
        const goalObj = GOALS.find(g => g.id === selectedGoal);
        
        if (goalObj) {
          const newGoal = {
            id: goalObj.id,
            title: goalObj.title,
            createdAt: new Date(),
          };
          
          // Add target weight if needed and provided
          if (goalObj.requiresTarget && targetWeight) {
            newGoal.targetWeight = parseFloat(targetWeight);
          }
          
          await updateDoc(userDocRef, {
            goals: arrayUnion(newGoal)
          });
        }
      }
      
      Alert.alert(
        'Success', 
        'Profile updated successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error updating user data:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getDefaultProfileImage = () => {
    // Using an Unsplash image as a default profile picture
    return 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&h=500&q=80';
  };

  // Handle profile image source
  const getProfileImageSource = () => {
    if (imageError || !editedUserData?.profileImage || editedUserData.profileImage.trim() === '') {
      return { uri: getDefaultProfileImage() };
    }
    return { uri: editedUserData.profileImage };
  };
  
  const handleGoalSelection = (goalId: string) => {
    setSelectedGoal(goalId);
    
    // Check if target weight is required
    const goal = GOALS.find(g => g.id === goalId);
    if (goal?.requiresTarget) {
      setShowGoalModal(false);
      setShowTargetWeightModal(true);
    } else {
      setShowGoalModal(false);
    }
  };

  const handleTargetWeightSubmit = () => {
    if (!targetWeight || isNaN(parseFloat(targetWeight))) {
      Alert.alert('Error', 'Please enter a valid target weight');
      return;
    }
    
    setShowTargetWeightModal(false);
  };

  const getCurrentGoalText = () => {
    if (!selectedGoal) return 'Not set';
    
    const goal = GOALS.find(g => g.id === selectedGoal);
    return goal ? goal.title : 'Not set';
  };

  const getCurrentDietTypeText = () => {
    if (!selectedDietType) return 'Not set';
    
    const diet = DIET_TYPES.find(d => d.id === selectedDietType);
    return diet ? diet.label : 'Not set';
  };

  if (!isLoaded || !userData || !editedUserData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Regular' }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} /> {/* Empty view for balance */}
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          ) : (
            <View style={styles.profileImageContainer}>
              {imageLoading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color="#22c55e" />
                </View>
              )}
              <Image
                source={getProfileImageSource()}
                style={styles.profileImage}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  console.warn('Profile image failed to load, using default');
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            </View>
          )}
          <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
            <Camera size={20} color="#FFFFFF" />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            style={styles.formInput}
            value={editedUserData.name}
            onChangeText={(text) => {
              setEditedUserData({ ...editedUserData, name: text });
            }}
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
              value={String(editedUserData.height?.feet || '')}
              onChangeText={(text) => {
                const feet = parseInt(text) || 0;
                setEditedUserData({
                  ...editedUserData,
                  height: { ...editedUserData.height, feet }
                });
              }}
              keyboardType="numeric"
              placeholder="Feet"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.formLabel}>Height (inches)</Text>
            <TextInput
              style={styles.formInput}
              value={String(editedUserData.height?.inches || '')}
              onChangeText={(text) => {
                const inches = parseInt(text) || 0;
                setEditedUserData({
                  ...editedUserData,
                  height: { ...editedUserData.height, inches }
                });
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
            value={String(editedUserData.weight || '')}
            onChangeText={(text) => {
              setEditedUserData({ ...editedUserData, weight: parseFloat(text) || 0 });
            }}
            keyboardType="numeric"
            placeholder="Your current weight"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Target Weight (kg)</Text>
          <TextInput
            style={styles.formInput}
            value={String(editedUserData.targetWeight || '')}
            onChangeText={(text) => {
              setEditedUserData({ ...editedUserData, targetWeight: parseFloat(text) || 0 });
            }}
            keyboardType="numeric"
            placeholder="Your target weight"
          />
        </View>

        {/* Fitness Goal Section */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Fitness Goal</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowGoalModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {getCurrentGoalText()}
            </Text>
            <ChevronLeft size={20} color="#64748b" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Diet Type Section */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Diet Preference</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowDietTypeModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {getCurrentDietTypeText()}
            </Text>
            <ChevronLeft size={20} color="#64748b" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveChanges}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Goal Selection Modal */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Fitness Goal</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowGoalModal(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.optionItem}
                  onPress={() => handleGoalSelection(goal.id)}
                >
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{goal.title}</Text>
                    <Text style={styles.optionDescription}>{goal.description}</Text>
                  </View>
                  {selectedGoal === goal.id && (
                    <Check size={20} color="#22c55e" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Diet Type Modal */}
      <Modal
        visible={showDietTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDietTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Diet Type</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowDietTypeModal(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {DIET_TYPES.map((diet) => (
              <TouchableOpacity
                key={diet.id}
                style={styles.optionItem}
                onPress={() => {
                  setSelectedDietType(diet.id);
                  setShowDietTypeModal(false);
                }}
              >
                <Text style={styles.optionTitle}>{diet.label}</Text>
                {selectedDietType === diet.id && (
                  <Check size={20} color="#22c55e" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Target Weight Modal */}
      <Modal
        visible={showTargetWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTargetWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGoal === 'weight-loss' ? 'Target Weight (kg)' : 'Goal Weight (kg)'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedGoal === 'weight-loss' 
                ? 'What weight would you like to achieve?' 
                : 'What weight would you like to gain to?'}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="Enter weight in kg"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalCancelButton} 
                onPress={() => setShowTargetWeightModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalSubmitButton}
                onPress={handleTargetWeightSubmit}
              >
                <Text style={styles.modalSubmitText}>Confirm</Text>
              </Pressable>
            </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 20,
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
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1e293b',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
    marginHorizontal: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  modalSubmitButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});

export default SettingsScreen;