import { Tabs } from 'expo-router';
import { View, Text, SafeAreaView } from 'react-native';
import { Home, CalendarDays, User, PieChart, Ticket, ScanFace } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isPremium, setIsPremium] = useState(false);
  const router = useRouter();
  
  // Check if user is premium
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          
          if (userDoc.exists()) {
            setIsPremium(userDoc.data().isPremium === true);
          }
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
      }
    };
    
    checkPremiumStatus();
  }, []);
  
  // Handle scan button press based on premium status
  const handleScanPress = () => {
    if (isPremium) {
      router.push('/Screens/CalorieTrackerScreen');
    } else {
      router.push('/Screens/PremiumSubscriptionScreen');
    }
  };
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "white",
          height: 65 + insets.bottom, // Increased height
          borderTopWidth: 1,
          borderTopColor: "#EEEEEE",
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -1,
          },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 4,
          paddingBottom: 8 + insets.bottom, // Increased bottom padding
          paddingTop: 10, // Increased top padding
          paddingHorizontal: 12,
        }
      }}>
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              alignItems: "center",
              justifyContent: "center",
              width: 70, // Wider for larger content
            }}>
              <Home
                size={24} // Larger icon size
                color={focused ? "#F02A4B" : "#71717A"}
                strokeWidth={focused ? 2.2 : 1.8}
              />
              <Text 
                numberOfLines={1}
                style={{
                  color: focused ? "#F02A4B" : "#71717A",
                  fontSize: 12, // Larger font
                  fontWeight: focused ? "600" : "500",
                  marginTop: 4, // More spacing
                  textAlign: "center"
                }}
              >
                Home
              </Text>
            </View>
          )
        }}
      />
      
      {/* 2. Subscription */}
      <Tabs.Screen
        name="subscription"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              alignItems: "center",
              justifyContent: "center",
              width: 70, // Wider for larger content
            }}>
              <Ticket
                size={24} // Larger icon size
                color={focused ? "#F02A4B" : "#71717A"}
                strokeWidth={focused ? 2.2 : 1.8}
              />
              <Text 
                numberOfLines={1}
                style={{
                  color: focused ? "#F02A4B" : "#71717A",
                  fontSize: 12, // Larger font
                  fontWeight: focused ? "600" : "500",
                  marginTop: 4, // More spacing
                  textAlign: "center"
                }}
              >
                Order
              </Text>
            </View>
          )
        }}
      />
      
      {/* 3. Calorie Tracker (Center Button) - Always show but redirect if not premium */}
      <Tabs.Screen
        name="NavigateToCalorie"
        listeners={{
          tabPress: (e) => {
            // Prevent default navigation
            e.preventDefault();
            // Handle custom navigation based on premium status
            handleScanPress();
          }
        }}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              alignItems: "center",
              justifyContent: "center",
              height: 58, // Larger center button
              width: 58, // Larger center button
              borderRadius: 29, // Adjusted for new size
              backgroundColor: "#F02A4B",
              transform: [{ translateY: -25 }], // More elevation
              shadowColor: "#F02A4B",
              shadowOffset: {
                width: 0,
                height: 3,
              },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5, // Slightly more elevation
            }}>
              <ScanFace
                size={35} // Larger icon size
                color="white"
                strokeWidth={2.2}
              />
            </View>
          )
        }}
      />
      
      {/* 4. Meals */}
      <Tabs.Screen
        name="AllMeals"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              alignItems: "center",
              justifyContent: "center",
              width: 70, // Wider for larger content
            }}>
              <CalendarDays
                size={24} // Larger icon size
                color={focused ? "#F02A4B" : "#71717A"}
                strokeWidth={focused ? 2.2 : 1.8}
              />
              <Text 
                numberOfLines={1}
                style={{
                  color: focused ? "#F02A4B" : "#71717A",
                  fontSize: 12, // Larger font
                  fontWeight: focused ? "600" : "500",
                  marginTop: 4, // More spacing
                  textAlign: "center"
                }}
              >
                Meals
              </Text>
            </View>
          )
        }}
      />
      
      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              alignItems: "center",
              justifyContent: "center",
              width: 70, // Wider for larger content
            }}>
              <User
                size={24} // Larger icon size
                color={focused ? "#F02A4B" : "#71717A"}
                strokeWidth={focused ? 2.2 : 1.8}
              />
              <Text 
                numberOfLines={1}
                style={{
                  color: focused ? "#F02A4B" : "#71717A",
                  fontSize: 12, // Larger font
                  fontWeight: focused ? "600" : "500",
                  marginTop: 4, // More spacing
                  textAlign: "center"
                }}
              >
                Profile
              </Text>
            </View>
          )
        }}
      />
    </Tabs>
  );
}