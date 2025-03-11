import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';

export default function DateOfBirth() {
  // Generate arrays for days, months, and years
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

  // State for selected values
  const [selectedDay, setSelectedDay] = useState(29);
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedYear, setSelectedYear] = useState(2003);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for scroll views
  const dayScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  const ITEM_HEIGHT = 50;
  const visibleItems = 5;
  const scrollViewHeight = ITEM_HEIGHT * visibleItems;

  // Function to center a value in its scroll view
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

  // Initialize scroll positions when component mounts
  useEffect(() => {
    // Set initial scroll positions to center the default selected values
    setTimeout(() => {
      centerValueInScrollView(dayScrollRef, selectedDay, days);
      centerValueInScrollView(monthScrollRef, selectedMonth, months);
      centerValueInScrollView(yearScrollRef, selectedYear, years);
    }, 200);
  }, []);

  // Function to handle day scroll
  const handleDayScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < days.length) {
      const newDay = days[index];
      if (newDay !== selectedDay) {
        setSelectedDay(newDay);
        // Re-center the day after a small delay
        setTimeout(() => {
          centerValueInScrollView(dayScrollRef, newDay, days);
        }, 100);
      }
    }
  };

  // Function to handle month scroll
  const handleMonthScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < months.length) {
      const newMonth = months[index];
      if (newMonth !== selectedMonth) {
        setSelectedMonth(newMonth);
        // Re-center the month after a small delay
        setTimeout(() => {
          centerValueInScrollView(monthScrollRef, newMonth, months);
        }, 100);
      }
    }
  };

  // Function to handle year scroll
  const handleYearScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < years.length) {
      const newYear = years[index];
      if (newYear !== selectedYear) {
        setSelectedYear(newYear);
        // Re-center the year after a small delay
        setTimeout(() => {
          centerValueInScrollView(yearScrollRef, newYear, years);
        }, 100);
      }
    }
  };

  const handleContinue = () => {
    try {
      setIsLoading(true);

      // Validate the date
      const monthIndex = months.indexOf(selectedMonth);
      const date = new Date(selectedYear, monthIndex, selectedDay);

      // Check if date is valid
      if (date.getDate() !== selectedDay || date.getMonth() !== monthIndex) {
        Alert.alert('Invalid Date', 'Please select a valid date of birth.');
        setIsLoading(false);
        return;
      }

      // Check if user is at least 13 years old
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

      // Save DOB data or navigate to the next step
      console.log(
        `Date of Birth: ${selectedDay} ${selectedMonth} ${selectedYear}`
      );

      // Navigate to the next screen
      router.push('/preferences');
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

  return (
    <View style={styles.container}>
      <View style={styles.backButtonContainer}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push('/weight')}
        >
          <ChevronLeft size={24} color="#000" />
        </Pressable>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Select your date of birth</Text>

        <View style={styles.pickerContainer}>
          {/* Day Picker */}
          <View style={styles.pickerColumn}>
            {/* <Text style={styles.pickerLabel}>Day</Text> */}
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

          {/* Month Picker */}
          <View style={[styles.pickerColumn, { flex: 2 }]}>
            {/* <Text style={styles.pickerLabel}>Month</Text> */}
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

          {/* Year Picker */}
          <View style={styles.pickerColumn}>
            {/* <Text style={styles.pickerLabel}>Year</Text> */}
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
                        year === selectedYear && styles.selectedPickerItemText,
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

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonLoading]}
          disabled={isLoading}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
          {!isLoading && <ArrowRight size={20} color="#fff" />}
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
  backButtonContainer: {
    paddingTop: 20,
    // paddingHorizontal: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#5a6a7e',
    marginBottom: 10,
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
    backgroundColor: 'rgba(140, 198, 63, 0.1)',
  },
  pickerItemText: {
    fontSize: 18,
    color: '#5a6a7e',
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
    marginTop: 'auto',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8cc63f',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
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
