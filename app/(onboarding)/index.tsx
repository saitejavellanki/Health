import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=1000&auto=format&fit=crop' }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to NutriBox</Text>
        <Text style={styles.subtitle}>
          Your personalized meal planning and grocery shopping assistant
        </Text>
        <Pressable style={styles.button} onPress={() => router.push('/preferences')}>
          <Text style={styles.buttonText}>Get Started</Text>
          <ArrowRight size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: '60%',
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    paddingHorizontal: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
});