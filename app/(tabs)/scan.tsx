// app/(tabs)/scan.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Scan } from 'lucide-react-native'; // Using Scan icon from lucide

export default function ScanScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to CalorieTrackerScreen when this screen mounts
    router.replace('/(onboarding)/CalorieTrackerScreen');
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.replace('/(onboarding)/CalorieTrackerScreen')}
      >
        <Scan size={48} color="#22c55e" />
        <Text style={styles.scanText}>Scanning...</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  scanButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    marginTop: 16,
    fontSize: 18,
    color: '#22c55e',
    fontWeight: '600',
  },
});
