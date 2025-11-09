import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, SafeAreaView, Modal, TextInput, Alert, Platform, Image } from 'react-native';
import * as Notifications from 'expo-notifications';
import { UserStats, updateUserStats, logout, getLessons, Lesson, getCompletedDailyTasks, clearUserData } from '../utils/database';

type Metric = {
  label: string;
  value: string | number;
  color: string;
  icon: string;
};

type Props = {
  userStats: UserStats | null;
  username: string;
  onLogout?: () => void;
  onShowReminder?: (subjects: string[]) => void;
  onUserStatsUpdated?: (stats: UserStats) => void;
  onShowProfile?: () => void;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};


const HomePage: React.FC<Props> = ({ userStats, username, onLogout, onShowReminder, onUserStatsUpdated, onShowProfile }) => {
  const [devPromptVisible, setDevPromptVisible] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [currentStats, setCurrentStats] = useState<UserStats | null>(userStats);
  const [tomorrowLessons, setTomorrowLessons] = useState<Lesson[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  // Configure notification handler
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request notification permissions
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status === 'granted');
    };
    requestPermissions();
  }, []);

  // Get tomorrow's date in YYYY-MM-DD format
  // For demo purposes: Assume today is Tuesday (Nov 4, 2025), so tomorrow is Wednesday (Nov 5, 2025)
  const getTomorrowDate = (): string => {
    // Hardcoded for demo: Wednesday, November 5, 2025
    return '2025-11-05';
  };

  // Load tomorrow's lessons
  useEffect(() => {
    const loadTomorrowLessons = async () => {
      if (!username) return;
      
      try {
        // Try multiple sources for lessons
        let lessons: Lesson[] = [];
        
        // First, try userStats
        if (userStats?.lessons && userStats.lessons.length > 0) {
          lessons = userStats.lessons;
        } else {
          // Try database
          lessons = await getLessons(username);
          
          // If still no lessons and this is Juris, try loading from data file
          if (lessons.length === 0 && username.toLowerCase() === 'juris') {
            try {
              const { jurisLessonsData } = await import('../utils/lessonsData');
              lessons = jurisLessonsData;
              // Save them to database for future use
              const { saveLessons } = await import('../utils/database');
              await saveLessons(username, lessons);
            } catch (importError) {
              console.error('Error importing lessons data:', importError);
            }
          }
        }
        
        const tomorrow = getTomorrowDate(); // '2025-11-05' for Wednesday
        
        // Filter lessons for tomorrow, exclude "Projekta darbs", and only include lessons with homework
        const filtered = lessons.filter((lesson: Lesson) => {
          if (!lesson.date || lesson.date !== tomorrow) return false;
          if (!lesson.homework || lesson.homework.trim().length === 0) return false;
          if (lesson.subject.toLowerCase().includes('projekta darbs')) return false;
          return true;
        });
        
        setTomorrowLessons(filtered);
      } catch (error) {
        console.error('Error loading tomorrow lessons:', error);
        setTomorrowLessons([]);
      }
    };

    loadTomorrowLessons();
  }, [username, userStats?.lessons]);

  // Load completed daily tasks
  useEffect(() => {
    const loadCompletedTasks = async () => {
      if (!username) return;
      try {
        const completed = await getCompletedDailyTasks(username);
        setCompletedTasks(completed);
      } catch (error) {
        console.error('Error loading completed tasks:', error);
      }
    };

    loadCompletedTasks();
    
    // Reload completed tasks when userStats change (after completing tasks)
    if (userStats) {
      loadCompletedTasks();
    }
  }, [username, userStats]);

  // Get unique subjects from tomorrow's lessons
  const getUniqueSubjects = (): string[] => {
    const subjects = tomorrowLessons
      .map(lesson => lesson.subject)
      .filter((subject, index, self) => self.indexOf(subject) === index);
    return subjects;
  };

  // Calculate daily task progress
  const uniqueSubjects = getUniqueSubjects();
  const completedCount = completedTasks.filter(task => uniqueSubjects.includes(task)).length;
  const totalTasks = uniqueSubjects.length;
  const progressPercent = totalTasks > 0 ? completedCount / totalTasks : 0;
  const isAllCompleted = totalTasks > 0 && completedCount >= totalTasks;

  // Toggle subject selection
  const toggleSubjectSelection = (subject: string) => {
    const newSelected = new Set(selectedSubjects);
    if (newSelected.has(subject)) {
      newSelected.delete(subject);
    } else {
      newSelected.add(subject);
    }
    setSelectedSubjects(newSelected);
  };

  // Handle "Let's remind you" button click
  const handleReminderButton = () => {
    const subjectsToRemind = selectedSubjects.size > 0 
      ? Array.from(selectedSubjects)
      : getUniqueSubjects();
    
    if (subjectsToRemind.length === 0) {
      // If no subjects selected and no subjects available, show message
      return;
    }
    
    if (onShowReminder) {
      onShowReminder(subjectsToRemind);
    }
  };

  // Update stats when userStats prop changes
  useEffect(() => {
    if (userStats) {
      setCurrentStats(userStats);
    }
  }, [userStats]);

  // Save stats whenever they change
  useEffect(() => {
    if (currentStats && username) {
      updateUserStats(username, currentStats);
    }
  }, [currentStats, username]);

  const userName = currentStats?.userName || username || 'User';

  const metrics: Metric[] = [
    { label: 'Daily Streak', value: currentStats?.dailyStreak || 0, color: '#f97316', icon: '🔥' },
    { label: 'Knowledge Coins', value: (currentStats?.knowledgeCoins || 0).toLocaleString(), color: '#f59e0b', icon: '💰' },
  ];

  const mathProgressPercent = 0.75;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Revisory</Text>
        <View style={styles.statusBar}>
          {metrics.map((m) => (
            <View key={m.label} style={styles.metricItem}>
              <Text style={[styles.metricIcon, { color: m.color }]}>{m.icon}</Text>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            </View>
          ))}
          <TouchableOpacity
            accessibilityLabel="Open developer menu"
            onPress={() => setDevPromptVisible(true)}
            style={styles.devButton}
            activeOpacity={0.7}
          >
            <Text style={styles.devButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Profile"
            onPress={() => {
              if (onShowProfile) {
                onShowProfile();
              }
            }}
            style={styles.avatarButton}
            activeOpacity={0.7}
          >
            {username.toLowerCase() === 'juris' ? (
              <Image
                source={require('../assets/juris-profile.jpg')}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.greetingText}>
          {getGreeting()}, {userName}! Time to study.
        </Text>

        <TouchableOpacity activeOpacity={0.9} style={styles.urgentCard}>
          <View style={styles.urgentHeaderRow}>
            <Text style={styles.urgentSubject}>Daily tasks</Text>
          </View>
          <Text style={styles.urgentDetail}>Complete them to earn coins.</Text>
          
          {/* Daily Tasks Progress Bar */}
          {tomorrowLessons.length > 0 && totalTasks > 0 && (
            <View style={styles.urgentProgressContainer}>
              <View style={styles.urgentProgressHeader}>
                <View style={styles.urgentProgressTitleRow}>
                  <Text style={styles.urgentProgressTitle}>Tasks done</Text>
                  {isAllCompleted && (
                    <View style={styles.urgentAwardIconContainer}>
                      <Text style={styles.urgentAwardIcon}>🏆</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.urgentProgressText}>
                  {completedCount} / {totalTasks}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercent * 100}%` },
                    isAllCompleted && styles.progressFillCompleted
                  ]} 
                />
              </View>
            </View>
          )}
          
          {(!tomorrowLessons.length || totalTasks === 0) && (
            <>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressFill, { width: `${mathProgressPercent * 100}%` }]} />
              </View>
              <Text style={styles.progressLabel}>Mastery 75%</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.reminderCard}>
          <View style={styles.reminderContent}>
            <Text style={styles.smileyIcon}>😊</Text>
            <Text style={styles.reminderTitle}>Let's remind you</Text>
            
            {tomorrowLessons.length > 0 ? (
              <View style={styles.subjectsContainer}>
                <Text style={styles.subjectsLabel}>For tomorrow (tap to select):</Text>
                {uniqueSubjects.map((subject, index) => {
                  const isSelected = selectedSubjects.has(subject);
                  const isCompleted = completedTasks.includes(subject);
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.7}
                      onPress={() => toggleSubjectSelection(subject)}
                      style={[
                        styles.subjectBox,
                        isSelected && styles.subjectBoxSelected,
                        isCompleted && styles.subjectBoxCompleted
                      ]}
                    >
                      <Text style={[
                        styles.subjectText,
                        isSelected && styles.subjectTextSelected,
                        isCompleted && styles.subjectTextCompleted
                      ]}>
                        {subject}
                      </Text>
                      {isCompleted && <Text style={styles.completedCheckmark}>✓</Text>}
                      {isSelected && !isCompleted && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noRemindersText}>No reminders for tomorrow</Text>
            )}
            <TouchableOpacity 
              activeOpacity={0.9} 
              style={styles.reminderButton}
              onPress={handleReminderButton}
            >
              <Text style={styles.reminderButtonText}>Let's remind you</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Developer Modal */}
      <Modal transparent visible={devPromptVisible} animationType="fade" onRequestClose={() => setDevPromptVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{devUnlocked ? 'Developer Menu' : 'Enter Dev Password'}</Text>
            {devUnlocked ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.modalItem}>• App Version: 1.0.0</Text>
                <Text style={styles.modalItem}>• Env: dev</Text>
                <TouchableOpacity 
                  style={styles.modalDangerButton}
                  onPress={async () => {
                    Alert.alert(
                      'Clear User Data',
                      'This will reset coins to 0, clear purchased courses, and clear all completed tasks. Lessons will be preserved. Are you sure?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const success = await clearUserData(username);
                              if (success) {
                                // Reload user stats from database to get fresh data
                                const { getOrCreateUser } = await import('../utils/database');
                                const updatedStats = await getOrCreateUser(username);
                                setCurrentStats(updatedStats);
                                // Notify parent component to update its userStats
                                if (onUserStatsUpdated) {
                                  onUserStatsUpdated(updatedStats);
                                }
                                Alert.alert('Success', 'User data cleared! Coins and purchased courses reset. Lessons preserved.');
                              } else {
                                Alert.alert('Error', 'Failed to clear user data');
                              }
                              setDevPromptVisible(false);
                            } catch (error) {
                              console.error('Error clearing user data:', error);
                              Alert.alert('Error', 'Failed to clear user data');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.modalDangerButtonText}>🗑️ Clear User Data</Text>
                </TouchableOpacity>
                
                <Text style={styles.modalSectionTitle}>Push Notification</Text>
                
                <TouchableOpacity 
                  style={styles.modalNotificationButton}
                  onPress={async () => {
                    if (!notificationPermission) {
                      Alert.alert('Permission Required', 'Please grant notification permissions in your device settings.');
                      return;
                    }
                    try {
                      await Notifications.scheduleNotificationAsync({
                        content: {
                          title: 'Revisory',
                          body: 'Hey, you should remind yourself',
                          sound: true,
                        },
                        trigger: null, // Instant
                      });
                      Alert.alert('Success', 'Notification sent instantly!');
                    } catch (error) {
                      console.error('Error sending notification:', error);
                      Alert.alert('Error', 'Failed to send notification');
                    }
                  }}
                >
                  <Text style={styles.modalNotificationButtonText}>📱 Instant</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalNotificationButton}
                  onPress={async () => {
                    if (!notificationPermission) {
                      Alert.alert('Permission Required', 'Please grant notification permissions in your device settings.');
                      return;
                    }
                    try {
                      // Schedule notification after 10 seconds
                      setTimeout(async () => {
                        await Notifications.scheduleNotificationAsync({
                          content: {
                            title: 'Revisory',
                            body: 'Hey, you should remind yourself',
                            sound: true,
                          },
                          trigger: null,
                        });
                      }, 10000);
                      Alert.alert('Success', 'Notification scheduled for 10 seconds!');
                    } catch (error) {
                      console.error('Error scheduling notification:', error);
                      Alert.alert('Error', 'Failed to schedule notification');
                    }
                  }}
                >
                  <Text style={styles.modalNotificationButtonText}>📱 In 10 seconds</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalNotificationButton}
                  onPress={async () => {
                    if (!notificationPermission) {
                      Alert.alert('Permission Required', 'Please grant notification permissions in your device settings.');
                      return;
                    }
                    try {
                      // Schedule notification after 20 seconds
                      setTimeout(async () => {
                        await Notifications.scheduleNotificationAsync({
                          content: {
                            title: 'Revisory',
                            body: 'Hey, you should remind yourself',
                            sound: true,
                          },
                          trigger: null,
                        });
                      }, 20000);
                      Alert.alert('Success', 'Notification scheduled for 20 seconds!');
                    } catch (error) {
                      console.error('Error scheduling notification:', error);
                      Alert.alert('Error', 'Failed to schedule notification');
                    }
                  }}
                >
                  <Text style={styles.modalNotificationButtonText}>📱 In 20 seconds</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalClose} onPress={() => setDevPromptVisible(false)}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  value={devPassword}
                  onChangeText={setDevPassword}
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  style={styles.modalInput}
                />
                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={() => {
                    if (devPassword === '1234') {
                      setDevUnlocked(true);
                      setDevPassword('');
                    }
                  }}
                >
                  <Text style={styles.modalSubmitText}>Unlock</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalClose} onPress={() => { setDevPromptVisible(false); setDevPassword(''); }}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonText: {
    fontSize: 14,
    color: '#f8fafc',
  },
  metricItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  avatarButton: {
    marginLeft: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#22c55e',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  greetingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 12,
  },
  urgentCard: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  urgentSubject: {
    color: '#052e16',
    fontSize: 18,
    fontWeight: '800',
  },
  urgentDetail: {
    color: '#052e16',
    fontSize: 14,
    marginBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#065f46',
  },
  progressLabel: {
    color: '#052e16',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '700',
  },
  progressFillCompleted: {
    backgroundColor: '#16a34a',
  },
  urgentProgressContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  urgentProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  urgentProgressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentProgressTitle: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '700',
  },
  urgentAwardIconContainer: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentAwardIcon: {
    fontSize: 12,
  },
  urgentProgressText: {
    color: '#052e16',
    fontSize: 12,
    fontWeight: '700',
  },
  reminderCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    minHeight: 200,
  },
  reminderContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    gap: 16,
  },
  smileyIcon: {
    fontSize: 48,
  },
  reminderTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  subjectsContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  subjectsLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subjectBox: {
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  subjectBoxSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  subjectBoxCompleted: {
    backgroundColor: '#1e40af',
    borderColor: '#3b82f6',
  },
  subjectText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  subjectTextSelected: {
    color: '#052e16',
    fontWeight: '700',
  },
  subjectTextCompleted: {
    color: '#dbeafe',
    fontWeight: '700',
  },
  checkmark: {
    color: '#052e16',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedCheckmark: {
    color: '#60a5fa',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dailyTasksProgressContainer: {
    width: '100%',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dailyTasksProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyTasksProgressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyTasksProgressTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  awardIconContainer: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardIcon: {
    fontSize: 12,
  },
  dailyTasksProgressText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  dailyTasksProgressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
    overflow: 'hidden',
  },
  dailyTasksProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  dailyTasksProgressFillCompleted: {
    backgroundColor: '#22c55e',
  },
  noRemindersText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 16,
  },
  reminderButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  reminderButtonText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '84%',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: '#e2e8f0',
  },
  modalSubmit: {
    marginTop: 12,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '800',
  },
  modalClose: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalItem: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  modalDangerButton: {
    marginTop: 12,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalDangerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalSectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  modalNotificationButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalNotificationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HomePage;

