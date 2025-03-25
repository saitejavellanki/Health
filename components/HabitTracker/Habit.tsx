import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Calendar,
  Clock,
  Bell,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart2
} from 'lucide-react-native';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../components/firebase/Firebase';

const HabitTracker = ({ navigation }) => {
  // States
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [habitName, setHabitName] = useState('');
  const [habitType, setHabitType] = useState('daily');
  const [habitCategory, setHabitCategory] = useState('health');
  const [targetValue, setTargetValue] = useState('');
  const [user, setUser] = useState(null);
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [habitStats, setHabitStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Categories with colors
  const categories = [
    { id: 'health', label: 'Health', color: '#4ade80' },
    { id: 'fitness', label: 'Fitness', color: '#3b82f6' },
    { id: 'mindfulness', label: 'Mindfulness', color: '#a78bfa' },
    { id: 'productivity', label: 'Productivity', color: '#f97316' },
    { id: 'personal', label: 'Personal', color: '#ec4899' }
  ];

  // Types of habits
  const habitTypes = [
    { id: 'daily', label: 'Daily Habit' },
    { id: 'counter', label: 'Counter' },
    { id: 'timer', label: 'Timer' }
  ];

  // Check auth state when component mounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchHabits(currentUser.uid);
      } else {
        setLoading(false);
        // Optional: redirect to login
        // navigation.navigate('Login');
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch habits from Firestore
  const fetchHabits = async (userId) => {
    try {
      setLoading(true);
      const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
      const habitsSnapshot = await getDocs(habitsQuery);
      
      const habitsList = [];
      habitsSnapshot.forEach((doc) => {
        habitsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setHabits(habitsList);
      
      // Fetch statistics for each habit
      const statsData = {};
      for (const habit of habitsList) {
        statsData[habit.id] = await fetchHabitStats(habit.id);
      }
      setHabitStats(statsData);
      
    } catch (error) {
      console.error('Error fetching habits:', error);
      Alert.alert('Error', 'Could not load your habits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch habit statistics
  const fetchHabitStats = async (habitId) => {
    try {
      const logsQuery = query(collection(db, 'habitLogs'), where('habitId', '==', habitId));
      const logsSnapshot = await getDocs(logsQuery);
      
      const logs = [];
      logsSnapshot.forEach((doc) => {
        logs.push(doc.data());
      });
      
      // Calculate statistics based on habit type
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return { streak: 0, completion: 0, best: 0 };
      
      // Basic implementation - should be expanded based on specific needs
      return {
        streak: calculateStreak(logs, habit),
        completion: calculateCompletion(logs, habit),
        best: calculateBest(logs, habit)
      };
    } catch (error) {
      console.error('Error fetching habit stats:', error);
      return { streak: 0, completion: 0, best: 0 };
    }
  };

  // Calculate current streak
  const calculateStreak = (logs, habit) => {
    if (logs.length === 0) return 0;
    
    // Sort logs by date
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    // Simple streak calculation for daily habits
    if (habit.type === 'daily') {
      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (const log of sortedLogs) {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        
        // One day difference means consecutive days
        const diffTime = currentDate - logDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
          currentDate = logDate;
        } else if (diffDays === 0) {
          // Same day, continue
          currentDate = logDate;
        } else {
          // Streak broken
          break;
        }
      }
      
      return streak;
    }
    
    return 0; // Default for other habit types
  };

  // Calculate completion percentage
  const calculateCompletion = (logs, habit) => {
    if (logs.length === 0) return 0;
    
    // For daily habits, calculate completion rate for last 30 days
    if (habit.type === 'daily') {
      const daysToCheck = 30;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let completed = 0;
      
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        // Check if there's a log for this date
        const hasLog = logs.some(log => {
          const logDate = new Date(log.date);
          logDate.setHours(0, 0, 0, 0);
          return logDate.getTime() === checkDate.getTime();
        });
        
        if (hasLog) completed++;
      }
      
      return Math.round((completed / daysToCheck) * 100);
    }
    
    return 0; // Default for other habit types
  };

  // Calculate best performance
  const calculateBest = (logs, habit) => {
    if (logs.length === 0) return 0;
    
    // For counter habits, find the highest value
    if (habit.type === 'counter') {
      return Math.max(...logs.map(log => log.value || 0));
    }
    
    // For timer habits, find the longest duration
    if (habit.type === 'timer') {
      return Math.max(...logs.map(log => log.duration || 0));
    }
    
    // For daily habits, find the longest streak
    let bestStreak = 0;
    let currentStreak = 0;
    
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    let lastDate = null;
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const diffTime = logDate - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          // Streak broken
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
          currentStreak = 1;
        }
      }
      
      lastDate = logDate;
    }
    
    // Check final streak
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }
    
    return bestStreak;
  };

  // Add or update a habit
  const saveHabit = async () => {
    try {
      if (!habitName.trim()) {
        Alert.alert('Error', 'Habit name cannot be empty');
        return;
      }
      
      if (habitType === 'counter' || habitType === 'timer') {
        if (!targetValue || isNaN(targetValue)) {
          Alert.alert('Error', 'Please enter a valid target value');
          return;
        }
      }
      
      const habitData = {
        name: habitName.trim(),
        type: habitType,
        category: habitCategory,
        targetValue: habitType === 'daily' ? null : parseInt(targetValue),
        createdAt: new Date().toISOString(),
        userId: user.uid
      };
      
      if (editingHabit) {
        // Update existing habit
        await updateDoc(doc(db, 'habits', editingHabit.id), habitData);
        Alert.alert('Success', 'Habit updated successfully');
      } else {
        // Add new habit
        await addDoc(collection(db, 'habits'), habitData);
        Alert.alert('Success', 'New habit created');
      }
      
      // Reset form and close modal
      resetForm();
      setModalVisible(false);
      
      // Refresh habits
      fetchHabits(user.uid);
      
    } catch (error) {
      console.error('Error saving habit:', error);
      Alert.alert('Error', 'Could not save habit');
    }
  };

  // Delete a habit
  const deleteHabit = async (habitId) => {
    try {
      Alert.alert(
        'Delete Habit',
        'Are you sure you want to delete this habit? All tracking data will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              await deleteDoc(doc(db, 'habits', habitId));
              
              // Also delete related logs
              const logsQuery = query(collection(db, 'habitLogs'), where('habitId', '==', habitId));
              const logsSnapshot = await getDocs(logsQuery);
              
              const deletePromises = [];
              logsSnapshot.forEach((docSnapshot) => {
                deletePromises.push(deleteDoc(doc(db, 'habitLogs', docSnapshot.id)));
              });
              
              await Promise.all(deletePromises);
              
              // Refresh habits
              fetchHabits(user.uid);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting habit:', error);
      Alert.alert('Error', 'Could not delete habit');
    }
  };

  // Log habit completion
  const logHabit = async (habit, value = null) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if already logged today
      const todayLogsQuery = query(
        collection(db, 'habitLogs'),
        where('habitId', '==', habit.id),
        where('date', '==', today.toISOString().split('T')[0])
      );
      
      const querySnapshot = await getDocs(todayLogsQuery);
      
      if (!querySnapshot.empty) {
        // Update existing log
        const logDoc = querySnapshot.docs[0];
        
        if (habit.type === 'daily') {
          // For daily habits, toggle completion
          await deleteDoc(doc(db, 'habitLogs', logDoc.id));
          Alert.alert('Habit marked as incomplete');
        } else if (habit.type === 'counter') {
          // For counter habits, prompt for new value
          promptForValue(habit, logDoc.id, logDoc.data().value);
        } else if (habit.type === 'timer') {
          // For timer habits, prompt for duration
          promptForDuration(habit, logDoc.id, logDoc.data().duration);
        }
      } else {
        // Create new log
        if (habit.type === 'daily') {
          await addDoc(collection(db, 'habitLogs'), {
            habitId: habit.id,
            date: today.toISOString().split('T')[0],
            completed: true,
            createdAt: new Date().toISOString()
          });
          Alert.alert('Habit marked as complete');
        } else if (habit.type === 'counter') {
          promptForValue(habit);
        } else if (habit.type === 'timer') {
          promptForDuration(habit);
        }
      }
      
      // Refresh habit stats
      const statsData = { ...habitStats };
      statsData[habit.id] = await fetchHabitStats(habit.id);
      setHabitStats(statsData);
      
    } catch (error) {
      console.error('Error logging habit:', error);
      Alert.alert('Error', 'Could not log habit');
    }
  };

  // Prompt for counter value
  const promptForValue = (habit, logId = null, currentValue = 0) => {
    Alert.prompt(
      'Enter Value',
      `How many ${habit.name} did you complete today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            const numValue = parseInt(value);
            if (isNaN(numValue)) {
              Alert.alert('Error', 'Please enter a valid number');
              return;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (logId) {
              // Update existing log
              await updateDoc(doc(db, 'habitLogs', logId), {
                value: numValue,
                updatedAt: new Date().toISOString()
              });
            } else {
              // Create new log
              await addDoc(collection(db, 'habitLogs'), {
                habitId: habit.id,
                date: today.toISOString().split('T')[0],
                value: numValue,
                createdAt: new Date().toISOString()
              });
            }
            
            // Refresh habit stats
            const statsData = { ...habitStats };
            statsData[habit.id] = await fetchHabitStats(habit.id);
            setHabitStats(statsData);
          }
        }
      ],
      'plain-text',
      currentValue.toString()
    );
  };

  // Prompt for timer duration
  const promptForDuration = (habit, logId = null, currentDuration = 0) => {
    Alert.prompt(
      'Enter Duration',
      `How many minutes did you spend on ${habit.name} today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (duration) => {
            const numDuration = parseInt(duration);
            if (isNaN(numDuration)) {
              Alert.alert('Error', 'Please enter a valid number');
              return;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (logId) {
              // Update existing log
              await updateDoc(doc(db, 'habitLogs', logId), {
                duration: numDuration,
                updatedAt: new Date().toISOString()
              });
            } else {
              // Create new log
              await addDoc(collection(db, 'habitLogs'), {
                habitId: habit.id,
                date: today.toISOString().split('T')[0],
                duration: numDuration,
                createdAt: new Date().toISOString()
              });
            }
            
            // Refresh habit stats
            const statsData = { ...habitStats };
            statsData[habit.id] = await fetchHabitStats(habit.id);
            setHabitStats(statsData);
          }
        }
      ],
      'plain-text',
      currentDuration.toString()
    );
  };

  // Reset form state
  const resetForm = () => {
    setEditingHabit(null);
    setHabitName('');
    setHabitType('daily');
    setHabitCategory('health');
    setTargetValue('');
  };

  // Edit habit
  const editHabit = (habit) => {
    setEditingHabit(habit);
    setHabitName(habit.name);
    setHabitType(habit.type);
    setHabitCategory(habit.category);
    setTargetValue(habit.targetValue ? habit.targetValue.toString() : '');
    setModalVisible(true);
  };

  // Toggle expanded habit details
  const toggleExpandHabit = (habitId) => {
    setExpandedHabit(expandedHabit === habitId ? null : habitId);
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    if (user) {
      fetchHabits(user.uid);
    } else {
      setRefreshing(false);
    }
  };

  // Get category color
  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#64748b';
  };

  // Get category label
  const getCategoryLabel = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.label : 'Category';
  };

  // Get habit icon based on type
  const getHabitTypeIcon = (type) => {
    switch (type) {
      case 'daily':
        return <Calendar size={16} color="#64748b" />;
      case 'counter':
        return <BarChart2 size={16} color="#64748b" />;
      case 'timer':
        return <Clock size={16} color="#64748b" />;
      default:
        return <Calendar size={16} color="#64748b" />;
    }
  };

  // Render habit item
  const renderHabitItem = ({ item: habit }) => {
    const categoryColor = getCategoryColor(habit.category);
    const isExpanded = expandedHabit === habit.id;
    const stats = habitStats[habit.id] || { streak: 0, completion: 0, best: 0 };
    
    return (
      <View style={styles.habitCard}>
        <TouchableOpacity 
          style={styles.habitHeader}
          onPress={() => toggleExpandHabit(habit.id)}
        >
          <View style={styles.habitTitleContainer}>
            <View 
              style={[
                styles.categoryIndicator, 
                { backgroundColor: categoryColor }
              ]}
            />
            <Text style={styles.habitTitle}>{habit.name}</Text>
          </View>
          
          <View style={styles.habitActions}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => logHabit(habit)}
            >
              <Check size={18} color="#fff" />
            </TouchableOpacity>
            
            {isExpanded ? 
              <ChevronUp size={20} color="#64748b" /> : 
              <ChevronDown size={20} color="#64748b" />
            }
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.habitDetails}>
            <View style={styles.habitStatsRow}>
              <View style={styles.habitStat}>
                <Text style={styles.habitStatValue}>{stats.streak}</Text>
                <Text style={styles.habitStatLabel}>Current Streak</Text>
              </View>
              
              <View style={styles.habitStat}>
                <Text style={styles.habitStatValue}>{stats.completion}%</Text>
                <Text style={styles.habitStatLabel}>Completion</Text>
              </View>
              
              <View style={styles.habitStat}>
                <Text style={styles.habitStatValue}>{stats.best}</Text>
                <Text style={styles.habitStatLabel}>
                  {habit.type === 'daily' ? 'Best Streak' : 
                   habit.type === 'counter' ? 'Best Count' : 'Longest Time'}
                </Text>
              </View>
            </View>
            
            <View style={styles.habitInfo}>
              <View style={styles.habitInfoItem}>
                <Text style={styles.habitInfoLabel}>Type:</Text>
                <View style={styles.habitInfoValue}>
                  {getHabitTypeIcon(habit.type)}
                  <Text style={styles.habitInfoText}>
                    {habitTypes.find(t => t.id === habit.type)?.label || 'Daily Habit'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.habitInfoItem}>
                <Text style={styles.habitInfoLabel}>Category:</Text>
                <View style={styles.habitInfoValue}>
                  <View 
                    style={[
                      styles.categoryDot, 
                      { backgroundColor: categoryColor }
                    ]}
                  />
                  <Text style={styles.habitInfoText}>
                    {getCategoryLabel(habit.category)}
                  </Text>
                </View>
              </View>
              
              {habit.type !== 'daily' && (
                <View style={styles.habitInfoItem}>
                  <Text style={styles.habitInfoLabel}>Target:</Text>
                  <Text style={styles.habitInfoText}>
                    {habit.targetValue} {habit.type === 'timer' ? 'minutes' : 'times'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.habitActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => editHabit(habit)}
              >
                <Edit2 size={16} color="#64748b" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteHabit(habit.id)}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Loading your habits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Habits</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={60} color="#4ade80" />
          <Text style={styles.emptyTitle}>No Habits Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start tracking your daily habits to build a better routine.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <Text style={styles.emptyButtonText}>Create Your First Habit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderHabitItem}
          contentContainerStyle={styles.habitsList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
      
      {/* Add/Edit Habit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Habit Name</Text>
              <TextInput
                style={styles.input}
                placeholder="What do you want to track?"
                value={habitName}
                onChangeText={setHabitName}
                placeholderTextColor="#94a3b8"
              />
              
              <Text style={styles.inputLabel}>Habit Type</Text>
              <View style={styles.typeSelector}>
                {habitTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      habitType === type.id && styles.typeOptionSelected
                    ]}
                    onPress={() => setHabitType(type.id)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        habitType === type.id && styles.typeOptionTextSelected
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {(habitType === 'counter' || habitType === 'timer') && (
                <>
                  <Text style={styles.inputLabel}>
                    Target {habitType === 'counter' ? 'Count' : 'Minutes'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={habitType === 'counter' ? "How many times?" : "How many minutes?"}
                    value={targetValue}
                    onChangeText={setTargetValue}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                </>
              )}
              
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      habitCategory === category.id && {
                        borderColor: category.color,
                        backgroundColor: `${category.color}20`
                      }
                    ]}
                    onPress={() => setHabitCategory(category.id)}
                  >
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: category.color }
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        habitCategory === category.id && {
                          color: category.color,
                          fontWeight: '600'
                        }
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveHabit}
            >
              <Text style={styles.saveButtonText}>
                {editingHabit ? 'Update Habit' : 'Create Habit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  habitsList: {
    padding: 16,
  },
  habitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  habitTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  habitDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  habitStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  habitStat: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  habitStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  habitStatLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  habitInfo: {
    marginBottom: 16,
  },
  habitInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitInfoLabel: {
    width: 80,
    fontSize: 14,
    color: '#64748b',
  },
  habitInfoValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitInfoText: {
    fontSize: 14,
    color: '#1e293b',
    marginLeft: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 16,
    maxHeight: '70%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    alignItems: 'center',
  },
  typeOptionSelected: {
    backgroundColor: '#4ade8020',
    borderColor: '#4ade80',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#64748b',
  },
  typeOptionTextSelected: {
    color: '#4ade80',
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 24,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  saveButton: {
    backgroundColor: '#4ade80',
    padding: 16,
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  }
});

export default HabitTracker;