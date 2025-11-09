import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, Alert } from 'react-native';

type Props = {
  courseId: string;
  courseName: string;
  courseIcon: string;
  courseColor: string;
  onBack: () => void;
};

const CourseRoadmapScreen: React.FC<Props> = ({ courseId, courseName, courseIcon, courseColor, onBack }) => {
  // Placeholder roadmap data
  const roadmapData = {
    math: [
      { id: 'math-1', title: 'Level 1: Basic Algebra', description: 'Understand fundamental algebraic operations and expressions.', difficulty: 'beginner', completed: true },
      { id: 'math-2', title: 'Level 2: Linear Equations', description: 'Solve linear equations and inequalities with one or more variables.', difficulty: 'beginner', completed: true },
      { id: 'math-3', title: 'Level 3: Quadratic Functions', description: 'Explore quadratic equations, their graphs, and methods of solving.', difficulty: 'intermediate', completed: false },
      { id: 'math-4', title: 'Level 4: Polynomials', description: 'Work with polynomial functions, factoring, and roots.', difficulty: 'intermediate', completed: false },
      { id: 'math-5', title: 'Level 5: Exponential & Logarithmic Functions', description: 'Master exponential growth, decay, and logarithmic properties.', difficulty: 'advanced', completed: false },
      { id: 'math-6', title: 'Level 6: Trigonometry Basics', description: 'Introduction to trigonometric functions, identities, and applications.', difficulty: 'advanced', completed: false },
    ],
    physics: [
      { id: 'physics-1', title: 'Level 1: Motion and Forces', description: 'Understand Newton\'s laws, kinematics, and basic force concepts.', difficulty: 'beginner', completed: true },
      { id: 'physics-2', title: 'Level 2: Energy and Work', description: 'Learn about kinetic and potential energy, work, and power.', difficulty: 'beginner', completed: true },
      { id: 'physics-3', title: 'Level 3: Momentum', description: 'Study impulse, momentum, and conservation of momentum in collisions.', difficulty: 'intermediate', completed: false },
      { id: 'physics-4', title: 'Level 4: Mechanical Energy', description: 'Delve into conservation of mechanical energy and its applications.', difficulty: 'intermediate', completed: false },
      { id: 'physics-5', title: 'Level 5: Rotational Motion', description: 'Explore torque, angular momentum, and rotational kinematics.', difficulty: 'advanced', completed: false },
      { id: 'physics-6', title: 'Level 6: Waves and Optics', description: 'Introduction to wave properties, sound, light, and optical phenomena.', difficulty: 'advanced', completed: false },
    ],
  };

  const currentRoadmap = roadmapData[courseId as keyof typeof roadmapData] || [];
  const completedLevels = currentRoadmap.filter(level => level.completed).length;
  const totalLevels = currentRoadmap.length;
  const progress = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.courseIcon}>{courseIcon}</Text>
        <Text style={styles.courseTitle}>{courseName} Roadmap</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>AI-Generated Learning Path</Text>

        <View style={styles.roadmapContainer}>
          {currentRoadmap.map((level, index) => (
            <View key={level.id} style={styles.levelItem}>
              <View style={styles.levelIndicatorContainer}>
                <View style={[styles.levelCircle, level.completed && styles.levelCircleCompleted, { borderColor: courseColor }]}>
                  <Text style={styles.levelNumber}>{index + 1}</Text>
                </View>
                {index < totalLevels - 1 && (
                  <View style={[styles.levelLine, level.completed && styles.levelLineCompleted, { backgroundColor: courseColor }]} />
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.levelCard,
                  { borderColor: courseColor },
                  !level.completed && styles.levelCardLocked,
                ]}
                activeOpacity={level.completed ? 0.7 : 1}
                onPress={() => {
                  if (level.completed) {
                    // Handle navigation to level content
                    Alert.alert('Level Unlocked!', `You've completed ${level.title}. Content coming soon!`);
                  } else {
                    Alert.alert('Level Locked', `Complete previous levels to unlock ${level.title}.`);
                  }
                }}
              >
                <Text style={[styles.levelTitle, !level.completed && styles.levelTitleLocked]}>{level.title}</Text>
                <Text style={[styles.levelDescription, !level.completed && styles.levelDescriptionLocked]}>{level.description}</Text>
                <View style={[
                  styles.difficultyBadge,
                  level.difficulty === 'beginner' && styles.difficultyBeginner,
                  level.difficulty === 'intermediate' && styles.difficultyIntermediate,
                  level.difficulty === 'advanced' && styles.difficultyAdvanced,
                ]}>
                  <Text style={styles.difficultyText}>{level.difficulty.charAt(0).toUpperCase() + level.difficulty.slice(1)}</Text>
                </View>
                {!level.completed && (
                  <View style={styles.lockedOverlay}>
                    <Text style={styles.lockedText}>🔒 Locked</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.progressSummary}>
        <Text style={styles.progressSummaryText}>Progress: {completedLevels} / {totalLevels} levels completed</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: courseColor }]} />
        </View>
      </View>
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
    padding: 8,
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
  },
  courseIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  courseTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  roadmapContainer: {
    paddingHorizontal: 10,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  levelIndicatorContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  levelCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    zIndex: 1,
  },
  levelCircleCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  levelNumber: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelLine: {
    width: 2,
    height: 60, // Adjust height to connect circles
    backgroundColor: '#475569',
    position: 'absolute',
    top: 40, // Position below the circle
    zIndex: 0,
  },
  levelLineCompleted: {
    backgroundColor: '#22c55e',
  },
  levelCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  levelCardLocked: {
    opacity: 0.6,
  },
  levelTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  levelTitleLocked: {
    color: '#94a3b8',
  },
  levelDescription: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 12,
  },
  levelDescriptionLocked: {
    color: '#64748b',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  difficultyBeginner: {
    backgroundColor: '#22c55e',
  },
  difficultyIntermediate: {
    backgroundColor: '#f59e0b',
  },
  difficultyAdvanced: {
    backgroundColor: '#ef4444',
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressSummary: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#2a2a2a',
  },
  progressSummaryText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#475569',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
});

export default CourseRoadmapScreen;

