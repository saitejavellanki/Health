import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft, Calendar } from 'lucide-react-native';
import { db, auth } from '../../components/firebase/Firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export default function DateOfBirth() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i - 10);

  const [selectedDay, setSelectedDay] = useState(29);
  const [selectedMonth, setSelectedMonth] = useState('September');
  const [selectedYear, setSelectedYear] = useState(2003);
  const [isLoading, setIsLoading] = useState(false);
  const [progressAnimation] = useState(new Animated.Value(0));

  const dayScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  const ITEM_HEIGHT = 50;
  const visibleItems = 5;
  const scrollViewHeight = ITEM_HEIGHT * visibleItems;

  const totalSteps = 9;
  const currentStep = 4;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: currentStep / totalSteps,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  const centerValueInScrollView = (scrollRef, value, array) => {
    if (!scrollRef.current) return;

    const index = array.indexOf(value);
    if (index !== -1) {
      scrollRef.current.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
    }
  };

  useEffect(() => {
    setTimeout(() => {
      centerValueInScrollView(dayScrollRef, selectedDay, days);
      centerValueInScrollView(monthScrollRef, selectedMonth, months);
      centerValueInScrollView(yearScrollRef, selectedYear, years);
    }, 200);
  }, []);

  const handleDayScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < days.length) {
      const newDay = days[index];
      if (newDay !== selectedDay) {
        setSelectedDay(newDay);
        setTimeout(() => {
          centerValueInScrollView(dayScrollRef, newDay, days);
        }, 100);
      }
    }
  };

  const handleMonthScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < months.length) {
      const newMonth = months[index];
      if (newMonth !== selectedMonth) {
        setSelectedMonth(newMonth);
        setTimeout(() => {
          centerValueInScrollView(monthScrollRef, newMonth, months);
        }, 100);
      }
    }
  };

  const handleYearScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < years.length) {
      const newYear = years[index];
      if (newYear !== selectedYear) {
        setSelectedYear(newYear);
        setTimeout(() => {
          centerValueInScrollView(yearScrollRef, newYear, years);
        }, 100);
      }
    }
  };

  const handleContinue = async () => {
    try {
      setIsLoading(true);

      const monthIndex = months.indexOf(selectedMonth);
      const date = new Date(selectedYear, monthIndex, selectedDay);

      if (date.getDate() !== selectedDay || date.getMonth() !== monthIndex) {
        Alert.alert('Invalid Date', 'Please select a valid date of birth.');
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const isBirthdayPassed =
        today.getMonth() > date.getMonth() ||
        (today.getMonth() === date.getMonth() &&
          today.getDate() >= date.getDate());

      const actualAge = isBirthdayPassed ? age : age - 1;

      if (actualAge < 13) {
        Alert.alert(
          'Age Restriction',
          'You must be at least 13 years old to use this app.'
        );
        setIsLoading(false);
        return;
      }

      const formattedDOB = {
        day: selectedDay,
        month: selectedMonth,
        year: selectedYear,
        timestamp: date.toISOString(),
        age: actualAge,
      };

      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert(
          'Error',
          'No authenticated user found. Please log in again.'
        );
        setIsLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userRef, {
        dateOfBirth: formattedDOB,
        updatedAt: new Date().toISOString(),
      }).catch(async (error) => {
        if (error.code === 'not-found') {
          await setDoc(userRef, {
            dateOfBirth: formattedDOB,
            userId: currentUser.uid,
            email: currentUser.email || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          throw error;
        }
      });

      console.log(
        `Date of Birth saved: ${selectedDay} ${selectedMonth} ${selectedYear}`
      );

      router.push('/doesworkout');
    } catch (error) {
      console.error('Error saving date of birth:', error);
      Alert.alert(
        'Error',
        'Failed to save your date of birth. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/gender')}
        >
          <ChevronLeft size={24} color="#000" />
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.stepProgressContainer}>
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBar, { width: progressWidth }]}
            />
          </View>
          <Text style={styles.stepText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>
        <View style={styles.titleContainer}>
          <Calendar size={28} color="#8cc63f" style={styles.icon} />
          <Text style={styles.title}>When were you born?</Text>
          <Text style={styles.subtitle}>
            Your age helps us personalize your fitness journey
          </Text>
        </View>

        <View style={styles.pickerOuterContainer}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Day</Text>
              <View style={styles.pickerWrapper}>
                <ScrollView
                  ref={dayScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  style={[styles.picker, { height: scrollViewHeight }]}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  onScroll={(event) => {
                    const y = event.nativeEvent.contentOffset.y;
                    const index = Math.round(y / ITEM_HEIGHT);
                    if (index >= 0 && index < days.length) {
                      setSelectedDay(days[index]);
                    }
                  }}
                  onMomentumScrollEnd={handleDayScroll}
                  scrollEventThrottle={16}
                >
                  {days.map((day) => (
                    <Pressable
                      key={`day-${day}`}
                      style={[
                        styles.pickerItem,
                        day === selectedDay && styles.selectedPickerItem,
                      ]}
                      onPress={() => {
                        setSelectedDay(day);
                        centerValueInScrollView(dayScrollRef, day, days);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          day === selectedDay && styles.selectedPickerItemText,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.pickerHighlight} pointerEvents="none" />
              </View>
            </View>

            <View style={[styles.pickerColumn, { flex: 2 }]}>
              <Text style={styles.pickerLabel}>Month</Text>
              <View style={styles.pickerWrapper}>
                <ScrollView
                  ref={monthScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  style={[styles.picker, { height: scrollViewHeight }]}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  onScroll={(event) => {
                    const y = event.nativeEvent.contentOffset.y;
                    const index = Math.round(y / ITEM_HEIGHT);
                    if (index >= 0 && index < months.length) {
                      setSelectedMonth(months[index]);
                    }
                  }}
                  onMomentumScrollEnd={handleMonthScroll}
                  scrollEventThrottle={16}
                >
                  {months.map((month) => (
                    <Pressable
                      key={`month-${month}`}
                      style={[
                        styles.pickerItem,
                        month === selectedMonth && styles.selectedPickerItem,
                      ]}
                      onPress={() => {
                        setSelectedMonth(month);
                        centerValueInScrollView(monthScrollRef, month, months);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          month === selectedMonth &&
                            styles.selectedPickerItemText,
                        ]}
                      >
                        {month}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.pickerHighlight} pointerEvents="none" />
              </View>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Year</Text>
              <View style={styles.pickerWrapper}>
                <ScrollView
                  ref={yearScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  style={[styles.picker, { height: scrollViewHeight }]}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                  onScroll={(event) => {
                    const y = event.nativeEvent.contentOffset.y;
                    const index = Math.round(y / ITEM_HEIGHT);
                    if (index >= 0 && index < years.length) {
                      setSelectedYear(years[index]);
                    }
                  }}
                  onMomentumScrollEnd={handleYearScroll}
                  scrollEventThrottle={16}
                >
                  {years.map((year) => (
                    <Pressable
                      key={`year-${year}`}
                      style={[
                        styles.pickerItem,
                        year === selectedYear && styles.selectedPickerItem,
                      ]}
                      onPress={() => {
                        setSelectedYear(year);
                        centerValueInScrollView(yearScrollRef, year, years);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          year === selectedYear &&
                            styles.selectedPickerItemText,
                        ]}
                      >
                        {year}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.pickerHighlight} pointerEvents="none" />
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonLoading]}
          disabled={isLoading}
          onPress={handleContinue}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.buttonText}>Continue</Text>
              <ArrowRight size={20} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  stepProgressContainer: {
    alignItems: 'center',
    width: '80%',
    marginTop: -20,
    marginBottom: 40,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    // alignContent: 'center',
  },
  stepText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
  },
  pickerOuterContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 10,
    fontWeight: '500',
  },
  pickerWrapper: {
    position: 'relative',
    height: 250,
    width: '100%',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: 'rgba(140, 198, 63, 0.15)',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
  selectedPickerItemText: {
    color: '#8cc63f',
    fontWeight: '600',
  },
  pickerHighlight: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: '100%',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: -1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    width: '100%',
    paddingVertical: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '90%',
    marginBottom: 55,
  },
  buttonLoading: {
    backgroundColor: '#a9d178',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});
