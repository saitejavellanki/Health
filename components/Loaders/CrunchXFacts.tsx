import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

const CrunchXFacts = () => {
  // Single fact about delivery
  const fact = {
    title: "Fast Healthy Delivery",
    message: "You can now order fruits and healthy snacks and get delivered in 10 min at 0 delivery cost.",
    icon: "truck"
  };

  // Split the message into words for animation
  const words = fact.message.split(' ');
  const fadeAnims = useRef(words.map(() => new Animated.Value(0))).current;
  
  useEffect(() => {
    // Animate each word with a slight delay between them
    const animations = fadeAnims.map((anim, index) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 150, // Faster duration (was 300)
        delay: 50 * index, // Shorter delay between words (was 100)
        useNativeDriver: true
      });
    });
    
    // Run animations in sequence with shorter stagger time
    Animated.stagger(70, animations).start(); // Faster stagger (was 150)
    
    return () => {
      // Clean up animations if component unmounts
      animations.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.factCard}>
        <View style={styles.factContent}>
          <View style={styles.contentRow}>
            <View style={styles.iconContainer}>
              <Feather name={fact.icon} size={32} color="#ffffff" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.factTitle}>{fact.title}</Text>
              <View style={styles.messageContainer}>
                {words.map((word, index) => (
                  <Animated.Text 
                    key={index} 
                    style={[
                      styles.factMessage,
                      { opacity: fadeAnims[index] }
                    ]}
                  >
                    {word}{' '}
                  </Animated.Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: 24
  },
  factCard: {
    backgroundColor: '#050505', // Darker black
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    width: '100%',
    maxWidth: 800,
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#181818', // Subtle border instead of green shadow
    position: 'relative',
    overflow: 'hidden'
  },
  factContent: {
    width: '100%'
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#111111', // Darker background for icon
    borderRadius: 50,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#222222',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  textContainer: {
    flex: 1
  },
  factTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.3
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  factMessage: {
    fontSize: 16,
    color: '#a3a3a3',
    lineHeight: 24,
    letterSpacing: 0.2
  }
});

export default CrunchXFacts;