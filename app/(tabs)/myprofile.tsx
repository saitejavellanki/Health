import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: screenWidth } = Dimensions.get('window');

interface UserData {
  name: string;
  email: string;
  profileImage: string;
  height: { feet: number; inches: number };
  weight: number;
  targetWeight: number;
  streak: number;
  totalWorkouts: number;
  dateJoined: string;
}

const dummyUserData: UserData = {
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
  height: { feet: 5, inches: 10 },
  weight: 75,
  targetWeight: 70,
  streak: 16,
  totalWorkouts: 87,
  dateJoined: 'Jan 15, 2025',
};

const ProfileScreen: React.FC = () => {
  // Dummy progress data for engagement features
  const weightProgress =
    ((dummyUserData.weight - dummyUserData.targetWeight) / 5) * 100;
  const weeklyActivity = [5, 3, 6, 4, 7, 5, 6]; // Days active
  const achievements = ['100k Steps', '5 Week Streak', 'Marathon Runner'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: dummyUserData.profileImage }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.name}>{dummyUserData.name}</Text>
          <Text style={styles.email}>{dummyUserData.email}</Text>

          <View style={styles.streakContainer}>
            <Icon name="fire" size={20} color="#FFA726" />
            <Text style={styles.streakText}>
              {dummyUserData.streak} Day Streak
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weight Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(weightProgress)}% to goal
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${weightProgress}%` }]}
            />
          </View>
          <View style={styles.weightStats}>
            <Text style={styles.weightStat}>
              Current: {dummyUserData.weight}kg
            </Text>
            <Text style={styles.weightStat}>
              Target: {dummyUserData.targetWeight}kg
            </Text>
          </View>
        </View>

        {/* Weekly Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Activity</Text>
          <View style={styles.weekGrid}>
            {weeklyActivity.map((days, index) => (
              <View key={index} style={styles.dayPill}>
                <Text style={styles.dayText}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}
                </Text>
                <View style={[styles.activityDot, { opacity: days / 7 }]} />
              </View>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <View style={styles.badgesContainer}>
            {achievements.map((achievement, index) => (
              <View key={index} style={styles.badge}>
                <Icon name="trophy" size={18} color="#FFD700" />
                <Text style={styles.badgeText}>{achievement}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Social Proof */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>Top 5%</Text>
            <Text style={styles.statLabel}>In Your City</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>1.2k</Text>
            <Text style={styles.statLabel}>Active Friends</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>#23</Text>
            <Text style={styles.statLabel}>Community Rank</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    // backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    // borderWidth:0.5,
    paddingTop: 50,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#2E86DE',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginBottom: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  streakText: {
    color: '#FFA726',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D2D2D',
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E86DE',
    borderRadius: 4,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weightStat: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dayPill: {
    alignItems: 'center',
  },
  dayText: {
    fontFamily: 'Inter-Medium',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E86DE',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Inter-Medium',
    color: '#2D2D2D',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
  },
});

export default ProfileScreen;
