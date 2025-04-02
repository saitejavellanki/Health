import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../components/firebase/Firebase';

const SimpleStreakComp = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch streak data from Firebase on component mount
  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStreak(userData.streak || 0);
        }
      } catch (error) {
        console.error('Error fetching streak:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakData();
  }, []);

  // Determine flame size and color based on streak
  const getFlameProperties = () => {
    if (streak < 3) return { size: 22, color: '#FF9800' };
    if (streak < 7) return { size: 24, color: '#FF5722' };
    if (streak < 14) return { size: 26, color: '#F44336' };
    return { size: 28, color: '#E91E63' };
  };

  const { size, color } = getFlameProperties();

  // Get streak description
  const getStreakDescription = () => {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return 'First day!';
    if (streak < 3) return 'Just starting!';
    if (streak < 7) return 'Keep it up!';
    if (streak < 14) return "You're on fire!";
    return 'Unstoppable!';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading streak...</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <View style={styles.flameContainer}>
            <MaterialCommunityIcons name="fire" size={size} color={color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.streakValue}>{streak} <Text style={styles.streakUnit}>day streak</Text></Text>
            <Text style={styles.streakDescription}>{getStreakDescription()}</Text>
          </View>
          <View style={styles.logoContainer}>
            {/* Replace the path below with your actual logo path */}
            <Image 
              source={require('../../assets/images/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Conditions Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Streak Conditions</Text>
              <TouchableOpacity 
                style={styles.closeIcon}
                onPress={() => setModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#FF5722"
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.infoSection}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="scan-helper"
                    size={24}
                    color="#FF5722"
                  />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Condition 1</Text>
                  <Text style={styles.infoText}>
                    Log at least two meals daily using the scanner.
                  </Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="food-apple"
                    size={24}
                    color="#FF5722"
                  />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Condition 2</Text>
                  <Text style={styles.infoText}>
                    Meet your daily calorie goal.
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoNoteContainer}>
                <Text style={styles.infoText2}>
                  Both conditions must be satisfied each day to keep your streak alive!
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: Platform.OS === 'android' ? 3 : 2,
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.12)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameContainer: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,112,67,0.1)',
    borderRadius: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  logoContainer: {
    height: 36,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  logoImage: {
    width: 58,
    height: 58,
  },
  streakValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  streakUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#FF7043',
  },
  streakDescription: {
    fontSize: 12,
    color: '#FF7043',
    marginTop: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#FF7043',
    textAlign: 'center',
    padding: 8,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: Platform.OS === 'android' ? 5 : 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  closeIcon: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,87,34,0.08)',
  },
  modalBody: {
    padding: 20,
    maxHeight: 300,
  },
  infoSection: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,87,34,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoNoteContainer: {
    backgroundColor: 'rgba(255,87,34,0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText2: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#FF5722',
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimpleStreakComp;