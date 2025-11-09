import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { UserStats } from '../utils/database';

type Props = {
  userStats: UserStats | null;
  username: string;
  onBack: () => void;
  onLogout: () => void;
};

const ProfileScreen: React.FC<Props> = ({ userStats, username, onBack, onLogout }) => {
  // Profile picture - for Juris, use the car image from assets
  const isJuris = username.toLowerCase() === 'juris';

  // Placeholder stats
  const stats = [
    { label: 'Total Study Time', value: '24h 30m', icon: '⏱️' },
    { label: 'Questions Answered', value: '342', icon: '❓' },
    { label: 'Correct Answers', value: '287', icon: '✅' },
    { label: 'Accuracy', value: '84%', icon: '🎯' },
    { label: 'Streak Record', value: '7 days', icon: '🔥' },
    { label: 'Courses Completed', value: '2', icon: '📚' },
    { label: 'Total Coins Earned', value: '1,250', icon: '💰' },
    { label: 'Current Level', value: '12', icon: '⭐' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 60 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePictureContainer}>
            {isJuris ? (
              <Image
                source={require('../assets/juris-profile.jpg')}
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePicturePlaceholderText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.userLevel}>Level {userStats?.knowledgeCoins ? Math.floor(userStats.knowledgeCoins / 100) : 1}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Account Info Section */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.accountInfoCard}>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Username</Text>
              <Text style={styles.accountInfoValue}>{username}</Text>
            </View>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Daily Streak</Text>
              <Text style={styles.accountInfoValue}>{userStats?.dailyStreak || 0} days</Text>
            </View>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Knowledge Coins</Text>
              <Text style={styles.accountInfoValue}>{(userStats?.knowledgeCoins || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.accountInfoRow}>
              <Text style={styles.accountInfoLabel}>Purchased Courses</Text>
              <Text style={styles.accountInfoValue}>{userStats?.purchasedCourses?.length || 0}</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2a2a2a',
    borderWidth: 4,
    borderColor: '#22c55e',
    overflow: 'hidden',
    marginBottom: 16,
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicturePlaceholderText: {
    color: '#f8fafc',
    fontSize: 48,
    fontWeight: '700',
  },
  username: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userLevel: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  accountSection: {
    marginBottom: 24,
  },
  accountInfoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  accountInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  accountInfoLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  accountInfoValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;

