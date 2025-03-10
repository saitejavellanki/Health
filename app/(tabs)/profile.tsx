import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Settings, Bell, CreditCard, Heart, CircleHelp, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../components/firebase/Firebase'; // Adjust path as needed

const MENU_ITEMS = [
  { icon: Settings, label: 'Settings', route: '/(onboarding)/plan' },
  { icon: Bell, label: 'Notifications', route: '/notifications' },
  { icon: CreditCard, label: 'Payment Methods', route: '/payments' },
  { icon: Heart, label: 'Favorites', route: '/favorites' },
  { icon: CircleHelp, label: 'Help & Support', route: '/support' },
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user profile from Firestore
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // If user document doesn't exist, create basic profile
            setUserProfile({
              name: currentUser.displayName || 'User',
              email: currentUser.email,
              orders: 0,
              activeBoxes: 0,
              avatar: currentUser.photoURL || 'https://i.pravatar.cc/300',
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        // User is signed out
        router.replace('/(auth)/login');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleMenuItemPress = (route) => {
    router.push(route);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Use userProfile or fallback to basic user info
  const displayProfile = userProfile || {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || 'No email available',
    orders: 0,
    activeBoxes: 0,
    avatar: user?.photoURL || 'https://i.pravatar.cc/300',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: displayProfile.avatar }} 
          style={styles.avatar} 
          // Using a fallback for loading errors
          onError={({ nativeEvent: { error } }) => console.log('Image load error:', error)}
        />
        <Text style={styles.name}>{displayProfile.name}</Text>
        <Text style={styles.email}>{displayProfile.email}</Text>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayProfile.orders || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{displayProfile.activeBoxes || 0}</Text>
            <Text style={styles.statLabel}>Active Boxes</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.menu}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.menuItem}
            onPress={() => handleMenuItemPress(item.route)}
          >
            <item.icon size={24} color="#64748b" />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={24} color="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#e2e8f0', // Placeholder color while loading
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  menu: {
    padding: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
});