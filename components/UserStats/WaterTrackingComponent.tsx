import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';

// Simplified version without external dependencies
const WaterTrackingComponent = () => {
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8); // Default 8 glasses
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initialize with mock data
    setWaterIntake(3); // Mock initial data
    startWaveAnimation();
  }, []);

  useEffect(() => {
    // Trigger wave and scale animation when water intake changes
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
    ]).start();
  }, [waterIntake]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.sin,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.sin,
        }),
      ])
    ).start();
  };

  const updateWaterIntake = (amount) => {
    const newIntake = Math.max(0, Math.min(waterGoal + 2, waterIntake + amount));
    setWaterIntake(newIntake);
    
    // In a real app, this is where you would save to AsyncStorage or another local storage option
    console.log('Water intake updated:', newIntake);
  };

  // Calculate water percentage
  const waterPercentage = Math.min(Math.round((waterIntake / waterGoal) * 100), 100);
  
  // Determine message based on percentage
  const getMessage = () => {
    if (waterPercentage < 25) return "Stay hydrated!";
    if (waterPercentage < 50) return "Keep drinking!";
    if (waterPercentage < 75) return "Halfway there!";
    if (waterPercentage < 100) return "Almost there!";
    return "Goal reached!";
  };

  // Get color theme based on percentage
  const getColors = () => {
    if (waterPercentage < 25) return ['#93c5fd', '#3b82f6'];
    if (waterPercentage < 50) return ['#7dd3fc', '#0ea5e9'];
    if (waterPercentage < 75) return ['#67e8f9', '#06b6d4'];
    if (waterPercentage < 100) return ['#5eead4', '#14b8a6'];
    return ['#86efac', '#22c55e'];
  };

  const primaryColor = getColors()[1];
  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  // Create a function to render mock icons (without emojis)
  const renderIcon = (iconName, size, color) => {
    // Basic icon replacements using text
    const icons = {
      'droplet': '●', // Using a filled circle instead of 'O'
      'minus': '-',
      'plus': '+',
      'zap': 'Z',
    };
    
    return (
      <Text style={{fontSize: size, color: color}}>{icons[iconName] || '•'}</Text>
    );
  };

  // Calculate the water height percentage for the bottle
  const waveHeight = `${waterPercentage}%`;

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, {backgroundColor: '#f0f9ff'}]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Animated.View 
              style={{opacity: 1}}
            >
              {renderIcon('droplet', 20, primaryColor)}
            </Animated.View>
            <Text style={[styles.title, { color: primaryColor }]}>Water Tracker</Text>
          </View>
        </View>

        <View style={styles.waterTracker}>
          <Animated.View 
            style={[
              styles.bottleContainer,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <View style={styles.bottle}>
              <View style={[styles.bottleInner, { height: waveHeight, backgroundColor: primaryColor }]}>
                <Animated.View
                  style={[
                    styles.waveContainer,
                    { transform: [{ translateX }] }
                  ]}
                >
                  <View
                    style={[styles.wave, {backgroundColor: primaryColor}]}
                  />
                </Animated.View>
              </View>
              
              {/* Simple animated bubble replacement */}
              {waterPercentage > 20 && (
                <Animated.View 
                  style={[
                    styles.bubble, 
                    { left: '20%', bottom: '20%', opacity: 0.7 }
                  ]}
                />
              )}
              
              {waterPercentage > 40 && (
                <Animated.View 
                  style={[
                    styles.bubble, 
                    { left: '60%', bottom: '40%', width: 8, height: 8, opacity: 0.5 }
                  ]}
                />
              )}
            </View>
            <View style={styles.markings}>
              {[...Array(5).keys()].map((i) => (
                <View key={i} style={styles.marking}>
                  <Text style={styles.markingText}>{waterGoal - i * 2}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={styles.statsContainer}>
            <Animated.View
              style={[styles.statsRow, {opacity: 1}]}
            >
              <View style={[styles.stat, { backgroundColor: `${primaryColor}20` }]}>
                <Text style={[styles.statValue, { color: primaryColor }]}>{waterIntake}</Text>
                <Text style={[styles.statLabel, styles.fixedHeight]}>Glass</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: `${primaryColor}10` }]}>
                <Text style={[styles.statValue, { color: primaryColor }]}>{waterGoal}</Text>
                <Text style={[styles.statLabel, styles.fixedHeight]}>Goal</Text>
              </View>
            </Animated.View>
            
            <Animated.View style={{opacity: 1}}>
              <Text style={[styles.message, { color: primaryColor }]}>
                {getMessage()}
              </Text>
            </Animated.View>
            
            <Animated.View
              style={[styles.buttonContainer, {opacity: 1}]}
            >
              <Pressable
                style={[styles.button, styles.minusButton, { borderColor: primaryColor }]}
                onPress={() => updateWaterIntake(-1)}
              >
                {renderIcon('minus', 20, primaryColor)}
              </Pressable>
              
              <Pressable
                style={[styles.button, styles.plusButton, { backgroundColor: primaryColor }]}
                onPress={() => updateWaterIntake(1)}
              >
                {renderIcon('plus', 20, '#ffffff')}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 20,
    width: '98%', // Made wider
    alignSelf: 'center',
  },
  container: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  waterTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
  },
  bottleContainer: {
    width: '40%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottle: {
    width: '70%',
    height: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  bottleInner: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  waveContainer: {
    height: '100%',
    width: 140, // Make it wider than the container to allow for animation
  },
  wave: {
    height: '100%',
    width: '100%',
  },
  markings: {
    height: '100%',
    width: '30%',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  marking: {
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    alignItems: 'flex-start',
  },
  markingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    fontWeight: '500',
  },
  statsContainer: {
    width: '56%',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    width: '45%',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  fixedHeight: {
    height: 20, // Fixed height to ensure alignment
    lineHeight: 20, // Makes the text vertically centered in the fixed height
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  plusButton: {
    // Shadow removed
  },
  bubble: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});

export default WaterTrackingComponent;