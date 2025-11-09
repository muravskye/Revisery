import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import HomePage from './screens/HomePage';
import LoginScreen from './screens/LoginScreen';
import ReminderScreen from './screens/ReminderScreen';
import CoursesScreen from './screens/CoursesScreen';
import CourseRoadmapScreen from './screens/CourseRoadmapScreen';
import ProfileScreen from './screens/ProfileScreen';
import { getOrCreateUser, getCurrentUser, setCurrentUser, logout, UserStats, getLessons, Lesson } from './utils/database';

type Screen = 'daily' | 'courses' | 'roadmap' | 'profile';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [username, setUsername] = useState<string>('');
  const [showReminder, setShowReminder] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('daily');
  const [roadmapCourse, setRoadmapCourse] = useState<{
    courseId: string;
    courseName: string;
    courseIcon: string;
    courseColor: string;
  } | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // User was previously logged in
        // getOrCreateUser will normalize the username
        const stats = await getOrCreateUser(currentUser);
        setUserStats(stats);
        setUsername(stats.userName); // Use normalized username from stats
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (loggedInUsername: string) => {
    try {
      setIsLoading(true);
      // Get or create user (creates new user if doesn't exist)
      // This will normalize the username (capitalize first letter)
      const stats = await getOrCreateUser(loggedInUsername);
      await setCurrentUser(stats.userName); // Use normalized username from stats
      setUserStats(stats);
      setUsername(stats.userName); // Use normalized username
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setUserStats(null);
    setUsername('');
    setShowReminder(false);
  };

  const handleShowReminder = async (subjects: string[]) => {
    try {
      // Load all lessons for the user
      let allLessons: Lesson[] = [];
      if (userStats?.lessons && userStats.lessons.length > 0) {
        allLessons = userStats.lessons;
      } else {
        allLessons = await getLessons(username);
        // If still no lessons and this is Juris, try loading from data file
        if (allLessons.length === 0 && username.toLowerCase() === 'juris') {
          try {
            const { jurisLessonsData } = await import('./utils/lessonsData');
            allLessons = jurisLessonsData;
          } catch (importError) {
            console.error('Error importing lessons data:', importError);
          }
        }
      }
      setLessons(allLessons);
      setSelectedSubjects(subjects);
      setShowReminder(true);
    } catch (error) {
      console.error('Error loading lessons for reminder:', error);
    }
  };

  const handleCloseReminder = async () => {
    setShowReminder(false);
    setSelectedSubjects([]);
    // Reload user stats to update progress bar
    if (username) {
      try {
        const { getOrCreateUser } = await import('./utils/database');
        const updatedStats = await getOrCreateUser(username);
        setUserStats(updatedStats);
      } catch (error) {
        console.error('Error reloading user stats:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />;
  }

  if (showReminder) {
    return (
      <ReminderScreen
        selectedSubjects={selectedSubjects}
        lessons={lessons}
        onClose={handleCloseReminder}
        username={username}
        onCoinsUpdated={(coins) => {
          // Update user stats when coins are updated
          if (userStats) {
            const updatedStats = { ...userStats, knowledgeCoins: coins };
            setUserStats(updatedStats);
          }
        }}
      />
    );
  }

  if (roadmapCourse) {
    return (
      <CourseRoadmapScreen
        courseId={roadmapCourse.courseId}
        courseName={roadmapCourse.courseName}
        courseIcon={roadmapCourse.courseIcon}
        courseColor={roadmapCourse.courseColor}
        onBack={() => {
          setRoadmapCourse(null);
          setCurrentScreen('courses');
        }}
      />
    );
  }

  if (showProfile) {
    return (
      <ProfileScreen
        userStats={userStats}
        username={username}
        onBack={() => {
          setShowProfile(false);
          setCurrentScreen('daily');
        }}
        onLogout={async () => {
          await handleLogout();
          setShowProfile(false);
        }}
      />
    );
  }

  return (
    <View style={styles.appContainer}>
      <View style={styles.contentContainer}>
        {currentScreen === 'daily' && (
          <HomePage 
            userStats={userStats} 
            username={username} 
            onLogout={handleLogout} 
            onShowReminder={handleShowReminder}
            onUserStatsUpdated={(stats) => {
              setUserStats(stats);
            }}
            onShowProfile={() => {
              setShowProfile(true);
              setCurrentScreen('profile');
            }}
          />
        )}
        {currentScreen === 'courses' && (
          <CoursesScreen 
            onNavigate={setCurrentScreen}
            username={username}
            userStats={userStats}
            onCoinsUpdated={async (coins) => {
              // Reload user stats from database to get accurate data including purchased courses
              if (username) {
                try {
                  const updatedStats = await getOrCreateUser(username);
                  setUserStats(updatedStats);
                } catch (error) {
                  console.error('Error reloading user stats:', error);
                  // Fallback to local update
                  if (userStats) {
                    const updatedStats = { ...userStats, knowledgeCoins: coins };
                    setUserStats(updatedStats);
                  }
                }
              }
            }}
            onShowRoadmap={(courseId, courseName, courseIcon, courseColor) => {
              setRoadmapCourse({ courseId, courseName, courseIcon, courseColor });
              setCurrentScreen('roadmap');
            }}
          />
        )}
      </View>
      
      {/* Bottom Navigation Bar */}
      {currentScreen !== 'roadmap' && currentScreen !== 'profile' && (
        <SafeAreaView style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'daily' && styles.navButtonActive]}
            onPress={() => setCurrentScreen('daily')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, currentScreen === 'daily' && styles.navIconActive]}>📅</Text>
            <Text style={[styles.navLabel, currentScreen === 'daily' && styles.navLabelActive]}>Daily</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, currentScreen === 'courses' && styles.navButtonActive]}
            onPress={() => setCurrentScreen('courses')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, currentScreen === 'courses' && styles.navIconActive]}>📚</Text>
            <Text style={[styles.navLabel, currentScreen === 'courses' && styles.navLabelActive]}>Courses</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  contentContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonActive: {
    backgroundColor: '#334155',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#22c55e',
    fontWeight: '700',
  },
});

export default App;


