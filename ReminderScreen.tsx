import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { generateRemindersForSubjects, ReminderResponse } from '../utils/openai';
import { Lesson, updateUserStats, getUserData, markSubjectCompleted, areAllDailyTasksCompleted, addCoins, hasClaimedCompletionBonusToday, claimCompletionBonus } from '../utils/database';

type Props = {
  selectedSubjects: string[];
  lessons: Lesson[];
  onClose: () => void;
  username?: string;
  onCoinsUpdated?: (coins: number) => void;
};

const ReminderScreen: React.FC<Props> = ({ selectedSubjects, lessons, onClose, username, onCoinsUpdated }) => {
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<'theory1' | 'theory2' | 'task' | 'explanation' | 'completion'>('theory1');
  const [reminders, setReminders] = useState<Map<string, ReminderResponse>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [subjectCorrectAnswers, setSubjectCorrectAnswers] = useState<Map<string, number>>(new Map());
  const [subjectTotalQuestions, setSubjectTotalQuestions] = useState<Map<string, number>>(new Map());
  const [awardedQuestions, setAwardedQuestions] = useState<Set<string>>(new Set()); // Track which questions have been awarded
  const [awardedBonuses, setAwardedBonuses] = useState<Set<string>>(new Set()); // Track which bonuses have been awarded
  const [canClaimCompletionBonus, setCanClaimCompletionBonus] = useState(false); // Track if completion bonus can be claimed
  const [hasClaimedBonus, setHasClaimedBonus] = useState(false); // Track if bonus was claimed in this session

  // Get the list of subjects to display
  const allUniqueSubjects = useMemo(() => 
    Array.from(new Set(lessons.map(l => l.subject))).filter(s => s), 
    [lessons]
  );
  
  const subjectsToDisplay = useMemo(() => 
    selectedSubjects.length > 0 
      ? selectedSubjects.filter(s => allUniqueSubjects.includes(s))
      : allUniqueSubjects,
    [selectedSubjects, allUniqueSubjects]
  );
  
  const currentSubject = subjectsToDisplay[currentSubjectIndex];
  const currentReminder = currentSubject ? reminders.get(currentSubject) : undefined;
  const currentTask = currentReminder?.tasks[currentTaskIndex];

  useEffect(() => {
    // Reset coin tracking when starting new reminder session
    setTotalCoinsEarned(0);
    setCorrectAnswers(0);
    setTotalQuestions(0);
    setSubjectCorrectAnswers(new Map());
    setSubjectTotalQuestions(new Map());
    setAwardedQuestions(new Set());
    setAwardedBonuses(new Set());
    setCanClaimCompletionBonus(false); // Reset bonus claim status
    setHasClaimedBonus(false); // Reset bonus claimed status
    loadReminders();
  }, [selectedSubjects, lessons]);

  const loadReminders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const allUnique = Array.from(new Set(lessons.map(l => l.subject))).filter(s => s);
      const subjectsToRemind = selectedSubjects.length > 0 
        ? selectedSubjects.filter(s => allUnique.includes(s))
        : allUnique;
      
      if (subjectsToRemind.length === 0) {
        setError('No subjects available for reminders');
        setIsLoading(false);
        return;
      }
      
      const subjectLessons = lessons.map(l => ({
        subject: l.subject,
        topic: l.topic || '',
        homework: l.homework || '',
        date: l.date,
      }));
      
      const generatedReminders = await generateRemindersForSubjects(subjectsToRemind, subjectLessons);
      setReminders(generatedReminders);
    } catch (err: any) {
      console.error('Error loading reminders:', err);
      setError(err.message || 'Failed to generate reminders. Make sure your Google Gemini API key is configured.');
    } finally {
      setIsLoading(false);
    }
  };

  const awardCoins = async (isCorrect: boolean, questionKey: string) => {
    if (!username) return;
    
    // Check if we've already awarded coins for this question
    if (awardedQuestions.has(questionKey)) {
      console.warn('Coins already awarded for this question, skipping...');
      return;
    }
    
    const coinsToAward = isCorrect ? 10 : 5;
    console.log(`[awardCoins] Awarding ${coinsToAward} coins for question: ${questionKey}, Correct: ${isCorrect}`);
    
    setTotalCoinsEarned(prev => {
      const newTotal = prev + coinsToAward;
      console.log(`[awardCoins] Total coins earned (UI): ${newTotal}`);
      return newTotal;
    });
    
    // Mark this question as awarded BEFORE awarding coins to prevent race conditions
    setAwardedQuestions(prev => new Set(prev).add(questionKey));
    
    try {
      // Use atomic addCoins function to prevent double-counting
      const newCoins = await addCoins(username, coinsToAward);
      console.log(`[awardCoins] Database coins updated to: ${newCoins}`);
      if (onCoinsUpdated) {
        onCoinsUpdated(newCoins);
      }
    } catch (error) {
      console.error('Error awarding coins:', error);
    }
  };

  const handleAnswerSelect = async (answerIndex: number) => {
    if (selectedAnswer !== null || !currentTask || !currentSubject) return; // Already answered
    
    // Create a unique key for this question to prevent double-awarding
    const questionKey = `${currentSubject}-${currentTaskIndex}-${currentTask.question}`;
    
    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === currentTask.correctAnswer;
    
    // Award coins (10 for correct, 5 for wrong)
    await awardCoins(isCorrect, questionKey);
    
    // Track correct answers globally
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
    setTotalQuestions(prev => prev + 1);
    
    // Track correct answers per subject
    const currentSubjectCorrect = subjectCorrectAnswers.get(currentSubject) || 0;
    const currentSubjectTotal = subjectTotalQuestions.get(currentSubject) || 0;
    
    if (isCorrect) {
      setSubjectCorrectAnswers(new Map(subjectCorrectAnswers.set(currentSubject, currentSubjectCorrect + 1)));
    }
    setSubjectTotalQuestions(new Map(subjectTotalQuestions.set(currentSubject, currentSubjectTotal + 1)));
    
    // Show explanation immediately
    setCurrentPage('explanation');
  };

  const handleNext = async () => {
    if (currentPage === 'theory1') {
      setCurrentPage('theory2');
    } else if (currentPage === 'theory2') {
      // After theory, go directly to first task
      setCurrentTaskIndex(0);
      setSelectedAnswer(null);
      setCurrentPage('task');
    } else if (currentPage === 'explanation') {
      // Move to next task or next subject
      if (currentTaskIndex < (currentReminder?.tasks.length || 0) - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
        setSelectedAnswer(null);
        setCurrentPage('task');
      } else {
        // All tasks done for this subject
        if (currentSubject && username) {
          await markSubjectCompleted(username, currentSubject);
          
          // Check if user got all questions correct for this subject (3/3)
          const subjectCorrect = subjectCorrectAnswers.get(currentSubject) || 0;
          const subjectTotal = subjectTotalQuestions.get(currentSubject) || 0;
          
          // Only award bonus if we have exactly 3 questions and all correct, and haven't awarded it yet
          const perfectScoreBonusKey = `perfect-${currentSubject}`;
          if (subjectTotal === 3 && subjectCorrect === 3 && currentReminder?.tasks.length === 3 && !awardedBonuses.has(perfectScoreBonusKey)) {
            // Award +20 bonus coins for perfect score (3/3)
            console.log(`[handleNext] Awarding perfect score bonus (20 coins) for subject: ${currentSubject}`);
            setAwardedBonuses(prev => new Set(prev).add(perfectScoreBonusKey));
            const newCoins = await addCoins(username, 20);
            setTotalCoinsEarned(prev => prev + 20);
            if (onCoinsUpdated) {
              onCoinsUpdated(newCoins);
            }
          }
        }
        
        // Move to next subject or show completion
        if (currentSubjectIndex < subjectsToDisplay.length - 1) {
          setCurrentSubjectIndex(currentSubjectIndex + 1);
          setCurrentTaskIndex(0);
          setSelectedAnswer(null);
          setCurrentPage('theory1');
        } else {
          // All subjects and tasks completed - check if all daily tasks are done
          if (username && subjectsToDisplay.length > 0) {
            const allCompleted = await areAllDailyTasksCompleted(username, subjectsToDisplay.length);
            if (allCompleted) {
              // Check if bonus can be claimed (not claimed today)
              const alreadyClaimed = await hasClaimedCompletionBonusToday(username);
              setCanClaimCompletionBonus(!alreadyClaimed);
            } else {
              setCanClaimCompletionBonus(false);
            }
          }
          // Show completion screen
          setCurrentPage('completion');
        }
      }
    }
  };

  const handleBack = () => {
    if (currentPage === 'task' && currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
      setSelectedAnswer(null);
      setCurrentPage('explanation'); // Go to previous task's explanation
    } else if (currentPage === 'explanation') {
      setCurrentPage('task');
      setSelectedAnswer(null);
    } else if (currentPage === 'theory2') {
      setCurrentPage('theory1');
    } else if (currentPage === 'theory1' && currentSubjectIndex > 0) {
      setCurrentSubjectIndex(currentSubjectIndex - 1);
      const prevReminder = reminders.get(subjectsToDisplay[currentSubjectIndex - 1]);
      if (prevReminder && prevReminder.tasks.length > 0) {
        setCurrentTaskIndex(prevReminder.tasks.length - 1);
        setCurrentPage('explanation');
      } else {
        setCurrentPage('theory2');
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Generating your reminders...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>
            Make sure your Google Gemini API key is set in the configuration.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentReminder) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No reminder available for {currentSubject}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Split theory into two pages
  const theoryContent = currentReminder.theory.content;
  const theoryWords = theoryContent.split(' ');
  const midPoint = Math.ceil(theoryWords.length / 2);
  const theoryPage1 = theoryWords.slice(0, midPoint).join(' ');
  const theoryPage2 = theoryWords.slice(midPoint).join(' ');

  const isCorrect = selectedAnswer !== null && currentTask && selectedAnswer === currentTask.correctAnswer;
  const coinsForThisAnswer = isCorrect ? 10 : (selectedAnswer !== null ? 5 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {currentPage !== 'completion' && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderButton}>
              <Text style={styles.closeHeaderButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.subjectTitle}>{currentSubject || 'Loading...'}</Text>
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>
                {currentSubjectIndex + 1} / {subjectsToDisplay.length}
              </Text>
            </View>
          </View>

          {totalCoinsEarned > 0 && (
            <View style={styles.coinsBanner}>
              <Text style={styles.coinsText}>💰 +{totalCoinsEarned} coins earned!</Text>
            </View>
          )}
        </>
      )}

      {currentPage === 'completion' ? (
        <View style={styles.completionScreenContainer}>
          <View style={styles.completionContainer}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={styles.completionTitle}>Good job!</Text>
            <Text style={styles.completionSubtitle}>
              You answered {correctAnswers} out of {totalQuestions} questions correctly
            </Text>
            {totalCoinsEarned > 0 && (
              <View style={styles.completionCoinsBox}>
                <Text style={styles.completionCoinsText}>💰 +{totalCoinsEarned} coins earned!</Text>
                {correctAnswers === totalQuestions && totalQuestions >= 3 && (
                  <Text style={styles.bonusText}>✨ Perfect score bonus included!</Text>
                )}
              </View>
            )}
            
            {/* Claim Completion Bonus Button */}
            {canClaimCompletionBonus && !hasClaimedBonus && (
              <TouchableOpacity 
                style={styles.claimBonusButton}
                onPress={async () => {
                  if (!username) return;
                  
                  try {
                    const result = await claimCompletionBonus(username);
                    if (result.success && result.coins !== undefined) {
                      setHasClaimedBonus(true);
                      setTotalCoinsEarned(prev => prev + 100);
                      setCanClaimCompletionBonus(false);
                      if (onCoinsUpdated) {
                        onCoinsUpdated(result.coins);
                      }
                      Alert.alert('🎉 Bonus Claimed!', 'You received 100 coins for completing all daily tasks!');
                    } else {
                      Alert.alert('Error', result.message || 'Failed to claim bonus');
                    }
                  } catch (error) {
                    console.error('Error claiming bonus:', error);
                    Alert.alert('Error', 'Failed to claim bonus');
                  }
                }}
              >
                <Text style={styles.claimBonusButtonText}>🏆 Claim 100 Coin Bonus</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.completionButton}
              onPress={onClose}
            >
              <Text style={styles.completionButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {currentPage === 'theory1' && (
            <View style={styles.page}>
              <Text style={styles.pageTitle}>📚 Theory - Part 1</Text>
              <Text style={styles.theoryText}>{theoryPage1}</Text>
            </View>
          )}

          {currentPage === 'theory2' && (
            <View style={styles.page}>
              <Text style={styles.pageTitle}>📚 Theory - Part 2</Text>
              <Text style={styles.theoryText}>{theoryPage2}</Text>
              
              {currentReminder.theory.keyPoints.length > 0 && (
                <View style={styles.keyPointsContainer}>
                  <Text style={styles.keyPointsTitle}>Key Points:</Text>
                  {currentReminder.theory.keyPoints.map((point, index) => (
                    <View key={index} style={styles.keyPointItem}>
                      <Text style={styles.keyPointBullet}>•</Text>
                      <Text style={styles.keyPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {currentPage === 'task' && currentTask && (
            <View style={styles.page}>
              <View style={styles.taskHeaderContainer}>
                <Text style={styles.pageTitle}>📝 Question {currentTaskIndex + 1} of {currentReminder?.tasks.length || 0}</Text>
                <View style={[
                  styles.difficultyBadge,
                  currentTask.difficulty === 'easy' && styles.difficultyEasy,
                  currentTask.difficulty === 'medium' && styles.difficultyMedium,
                  currentTask.difficulty === 'hard' && styles.difficultyHard,
                ]}>
                  <Text style={styles.difficultyText}>
                    {currentTask.difficulty.charAt(0).toUpperCase() + currentTask.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.taskQuestion}>{currentTask.question}</Text>
              
              <View style={styles.optionsContainer}>
                {currentTask.options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      selectedAnswer === index && styles.optionSelected,
                    ]}
                    onPress={() => handleAnswerSelect(index)}
                    disabled={selectedAnswer !== null}
                  >
                    <Text style={styles.optionText}>
                      {String.fromCharCode(65 + index)}. {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {currentPage === 'explanation' && currentTask && selectedAnswer !== null && (
            <View style={styles.page}>
              <View style={styles.explanationHeader}>
                <Text style={styles.pageTitle}>
                  {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                </Text>
                <View style={styles.coinsBadge}>
                  <Text style={styles.coinsBadgeText}>+{coinsForThisAnswer} 🪙</Text>
                </View>
              </View>
              
              <Text style={styles.taskQuestion}>{currentTask.question}</Text>
              
              <View style={styles.optionsContainer}>
                {currentTask.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrectOption = index === currentTask.correctAnswer;
                  
                  return (
                    <View
                      key={index}
                      style={[
                        styles.optionButton,
                        styles.optionButtonDisabled,
                        isCorrectOption && styles.optionCorrect,
                        isSelected && !isCorrectOption && styles.optionIncorrect,
                      ]}
                    >
                      <Text style={[
                        styles.optionText,
                        isCorrectOption && styles.optionTextCorrect,
                        isSelected && !isCorrectOption && styles.optionTextIncorrect,
                      ]}>
                        {String.fromCharCode(65 + index)}. {option}
                      </Text>
                      {isCorrectOption && (
                        <Text style={[styles.optionIcon, styles.optionIconCorrect]}>✓ Correct</Text>
                      )}
                      {isSelected && !isCorrectOption && (
                        <Text style={[styles.optionIcon, styles.optionIconIncorrect]}>✗ Your answer</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              
              <View style={styles.explanationSection}>
                <View style={[
                  styles.explanationCard,
                  isCorrect ? styles.explanationCardCorrect : styles.explanationCardIncorrect,
                ]}>
                  <Text style={styles.explanationTitle}>💡 Explanation:</Text>
                  <Text style={styles.explanationText}>{currentTask.explanation}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {currentPage !== 'completion' && (
        <View style={styles.footer}>
          {(currentPage === 'theory2' || currentPage === 'explanation') && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          {currentPage !== 'task' && (
            <TouchableOpacity 
              style={[styles.nextButton, !(currentPage === 'theory2' || currentPage === 'explanation') && styles.nextButtonFull]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentPage === 'theory1' || currentPage === 'theory2' 
                  ? 'Next →'
                  : currentPage === 'explanation'
                  ? (currentTaskIndex < (currentReminder?.tasks.length || 0) - 1 
                      ? 'Next Question →' 
                      : currentSubjectIndex < subjectsToDisplay.length - 1 
                        ? 'Next Subject →' 
                        : 'Finish')
                  : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
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
  closeHeaderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeHeaderButtonText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subjectTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  progressIndicator: {
    width: 32,
    alignItems: 'flex-end',
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  coinsBanner: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  coinsText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    flexGrow: 1,
  },
  page: {
    minHeight: 400,
  },
  pageTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  theoryText: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  keyPointsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  keyPointsTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  keyPointItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  keyPointBullet: {
    color: '#22c55e',
    fontSize: 18,
    marginRight: 8,
    marginTop: 2,
  },
  keyPointText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  taskHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  taskQuestion: {
    color: '#f8fafc',
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 24,
    fontWeight: '600',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionButtonDisabled: {
    opacity: 0.8,
  },
  optionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1e3a1e',
  },
  optionCorrect: {
    borderColor: '#22c55e',
    backgroundColor: '#1e3a1e',
  },
  optionIncorrect: {
    borderColor: '#ef4444',
    backgroundColor: '#3a1e1e',
  },
  optionText: {
    color: '#e2e8f0',
    fontSize: 16,
    flex: 1,
  },
  optionTextCorrect: {
    color: '#22c55e',
    fontWeight: '700',
  },
  optionTextIncorrect: {
    color: '#ef4444',
  },
  optionIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  optionIconCorrect: {
    color: '#22c55e',
  },
  optionIconIncorrect: {
    color: '#ef4444',
  },
  explanationSection: {
    marginTop: 24,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyEasy: {
    backgroundColor: '#22c55e',
  },
  difficultyMedium: {
    backgroundColor: '#f59e0b',
  },
  difficultyHard: {
    backgroundColor: '#ef4444',
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  explanationCard: {
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  explanationCardCorrect: {
    backgroundColor: '#1e3a1e',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  explanationCardIncorrect: {
    backgroundColor: '#3a1e1e',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  explanationTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  explanationText: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 24,
  },
  correctAnswerBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  correctAnswerLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  correctAnswerText: {
    color: '#22c55e',
    fontSize: 16,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '800',
  },
  closeButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '800',
  },
  completionScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    width: '100%',
  },
  completionEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  completionTitle: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  completionSubtitle: {
    color: '#cbd5e1',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  completionCoinsBox: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 40,
  },
  completionCoinsText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  completionButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  completionButtonText: {
    color: '#052e16',
    fontSize: 18,
    fontWeight: '800',
  },
  bonusText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  claimBonusButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  claimBonusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ReminderScreen;
