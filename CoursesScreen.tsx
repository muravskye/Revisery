import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Alert, Modal } from 'react-native';
import { getUserData, purchaseCourse, getPurchasedCourses, UserStats } from '../utils/database';

type Props = {
  onNavigate: (screen: 'daily' | 'courses') => void;
  username?: string;
  userStats?: UserStats | null;
  onCoinsUpdated?: (coins: number) => void;
  onShowRoadmap?: (courseId: string, courseName: string, courseIcon: string, courseColor: string) => void;
};

const COURSE_PRICE = 20;

const CoursesScreen: React.FC<Props> = ({ onNavigate, username, userStats, onCoinsUpdated, onShowRoadmap }) => {
  const [purchasedCourses, setPurchasedCourses] = useState<string[]>([]);
  const [loadingCourse, setLoadingCourse] = useState<string | null>(null);

  const courses = [
    { id: 'math', name: 'Math', icon: '📐', color: '#3b82f6', subjects: ['Math 2'] },
    { id: 'physics', name: 'Physics', icon: '⚛️', color: '#8b5cf6', subjects: ['Physics 2'] },
  ];

  useEffect(() => {
    loadPurchasedCourses();
  }, [username, userStats]);

  const loadPurchasedCourses = async () => {
    if (!username) return;
    try {
      const purchased = await getPurchasedCourses(username);
      setPurchasedCourses(purchased);
    } catch (error) {
      console.error('Error loading purchased courses:', error);
    }
  };

  const handlePurchase = async (courseId: string, courseName: string) => {
    if (!username) {
      Alert.alert('Error', 'Please login to purchase courses');
      return;
    }

    setLoadingCourse(courseId);
    
    try {
      const result = await purchaseCourse(username, courseId, COURSE_PRICE);
      
      if (result.success) {
        // Reload purchased courses
        await loadPurchasedCourses();
        
        // Update user stats - reload from database to get accurate coin count
        if (username) {
          const { getUserData } = await import('../utils/database');
          const updatedUserData = await getUserData(username);
          if (updatedUserData && onCoinsUpdated) {
            onCoinsUpdated(updatedUserData.knowledgeCoins);
          }
        }
        
        Alert.alert('Success', `You've purchased ${courseName}!`);
      } else {
        if (result.message === 'Not enough coins') {
          Alert.alert('Not Enough Coins', `You need ${COURSE_PRICE} coins to purchase this course. Complete daily tasks to earn more coins!`);
        } else {
          Alert.alert('Error', result.message);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to purchase course. Please try again.');
    } finally {
      setLoadingCourse(null);
    }
  };

  const currentCoins = userStats?.knowledgeCoins || 0;
  const hasEnoughCoins = currentCoins >= COURSE_PRICE;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Courses</Text>
        {userStats && (
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsBadgeText}>💰 {currentCoins}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Choose a course to explore</Text>
        
        <View style={styles.coursesContainer}>
          {courses.map((course) => {
            const isPurchased = purchasedCourses.includes(course.id);
            
            return (
              <View key={course.id} style={[styles.courseCard, { borderColor: course.color }]}>
                <Text style={styles.courseIcon}>{course.icon}</Text>
                <Text style={[styles.courseName, { color: course.color }]}>{course.name}</Text>
                
                {isPurchased ? (
                  <>
                    <View style={styles.purchasedBadge}>
                      <Text style={styles.purchasedText}>✓ Purchased</Text>
                    </View>
                    {/* Show fake subjects for purchased courses */}
                    <View style={styles.subjectsList}>
                      {course.subjects.map((subject, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[styles.subjectItem, { borderColor: course.color }]}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (onShowRoadmap) {
                              onShowRoadmap(course.id, course.name, course.icon, course.color);
                            }
                          }}
                        >
                          <Text style={[styles.subjectItemText, { color: course.color }]}>
                            {subject}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {/* Roadmap Button */}
                    <TouchableOpacity
                      style={[styles.roadmapButton, { backgroundColor: course.color }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onShowRoadmap) {
                          onShowRoadmap(course.id, course.name, course.icon, course.color);
                        }
                      }}
                    >
                      <Text style={styles.roadmapButtonText}>🗺️ View Roadmap</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.coursePrice}>💰 {COURSE_PRICE} coins</Text>
                    <TouchableOpacity
                      style={[
                        styles.purchaseButton,
                        { backgroundColor: course.color },
                        (!hasEnoughCoins || loadingCourse === course.id) && styles.purchaseButtonDisabled
                      ]}
                      onPress={() => handlePurchase(course.id, course.name)}
                      disabled={!hasEnoughCoins || loadingCourse === course.id}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.purchaseButtonText}>
                        {loadingCourse === course.id ? 'Processing...' : 'Purchase'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>
        
        <View style={{ height: 80 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
  },
  coinsBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coinsBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 24,
  },
  coursesContainer: {
    gap: 16,
  },
  courseCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  courseIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  courseName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  coursePrice: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  purchaseButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  purchasedBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  purchasedText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '700',
  },
  subjectsList: {
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  subjectItem: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  subjectItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roadmapButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  roadmapButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CoursesScreen;

