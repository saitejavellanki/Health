import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CrunchXLogo = () => {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoWrapper}>
        <Text style={styles.logoText}>
          Crunch<Text style={styles.xText}>X</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 15,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000000', // Black color for "Crunch"
  },
  xText: {
    color: '#ff3b30', // Red color for the X
    fontWeight: '900',
  },
});

export default CrunchXLogo;