import React, { useState, useEffect, useReducer, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  useReducedMotion,
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import {
  scheduleRestNotificationAsync,
  cancelRestNotificationAsync,
} from '../../src/utils/notifications';

import { colors, spacing, typography, radii } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ExercisePickerSheet } from '../../src/components/ExercisePickerSheet';
import { WorkoutSummaryModal, type PRSummaryItem, type WorkoutSummaryData } from '../../src/components/WorkoutSummaryModal';
import { ChunkyButton, PressableScale, PopIn, triggerHaptic, spring, CelebrationCheckmark } from '../../src/motion';
import { ChevronLeft, Timer, Check, X, BellRing, Plus } from 'lucide-react-native';
import { weeklyStreak } from '../../src/lib/celebrate';

import {
  sessionReducer,
  newSession,
  sessionVolume,
  sessionDurationMin,
  type Session,
  type SessionExercise,
  type SessionSet,
} from '../../src/lib/session';
import { detectPRs, type PRType } from '../../src/lib/prs';
import type { WorkSet, SetType } from '../../src/lib/types';
import type { Template } from '../../src/lib/templates';
import type { ExerciseRow } from '../../src/db/repository';
import { repository } from '../../src/db/sqliteRepository';
import { useSettings } from '../../src/context/settings';
import { formatWeight, parseWeightInput, type Unit } from '../../src/lib/units';
import {
  suggestRest,
  startRest,
  adjustRest,
  remainingSeconds,
  formatClock,
} from '../../src/lib/rest';

function formatTimer(startedAt: string, nowIso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(startedAt)) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface SetRowItemProps {
  exerciseId: string;
  set: SessionSet;
  setIndex: number;
  prevSet?: WorkSet;
  unit: Unit;
  onUpdate: (patch: Partial<Pick<SessionSet, 'weightKg' | 'reps' | 'rpe' | 'type'>>) => void;
  onToggleDone: () => void;
  onOpenRpePicker: () => void;
}

const SetRowItem = React.memo(function SetRowItem({
  set,
  setIndex,
  prevSet,
  unit,
  onUpdate,
  onToggleDone,
  onOpenRpePicker,
}: SetRowItemProps) {
  const [weightText, setWeightText] = useState(() =>
    set.weightKg > 0 ? formatWeight(set.weightKg, unit) : ''
  );
  const [repsText, setRepsText] = useState(() =>
    set.reps > 0 ? String(set.reps) : ''
  );
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setWeightText(set.weightKg > 0 ? formatWeight(set.weightKg, unit) : '');
    }
  }, [set.weightKg, unit]);

  useEffect(() => {
    setRepsText(set.reps > 0 ? String(set.reps) : '');
  }, [set.reps]);

  const handleWeightChange = (text: string) => {
    setWeightText(text);
    const parsedKg = parseWeightInput(text, unit);
    if (parsedKg !== null) {
      onUpdate({ weightKg: parsedKg });
    } else if (text.trim() === '') {
      onUpdate({ weightKg: 0 });
    }
  };

  const handleWeightBlur = () => {
    isFocusedRef.current = false;
    const parsedKg = parseWeightInput(weightText, unit);
    if (parsedKg !== null && parsedKg > 0) {
      setWeightText(formatWeight(parsedKg, unit));
      onUpdate({ weightKg: parsedKg });
    } else {
      setWeightText(set.weightKg > 0 ? formatWeight(set.weightKg, unit) : '');
    }
  };

  const prevLabel = prevSet
    ? `${formatWeight(prevSet.weightKg, unit, true)} × ${prevSet.reps}`
    : '—';

  const reducedMotion = useReducedMotion();
  const flash = useSharedValue(0);

  useEffect(() => {
    if (set.done && !reducedMotion) {
      flash.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 280 })
      );
    }
  }, [set.done, reducedMotion]);

  const animatedRowStyle = useAnimatedStyle(() => ({
    backgroundColor: flash.value > 0 ? 'rgba(0, 229, 255, 0.18)' : 'transparent',
  }));

  const handleCopyPrevious = () => {
    if (prevSet && !set.done) {
      const w = prevSet.weightKg > 0 ? formatWeight(prevSet.weightKg, unit) : '';
      setWeightText(w);
      setRepsText(String(prevSet.reps));
      onUpdate({ weightKg: prevSet.weightKg, reps: prevSet.reps });
      triggerHaptic('tap');
    }
  };

  return (
    <Animated.View style={[styles.setRow, set.done && styles.setRowDone, animatedRowStyle]}>
      {/* Set Number */}
      <View style={styles.colSet}>
        <Text style={[styles.setNumberText, set.done && styles.textDone]}>
          {setIndex + 1}
        </Text>
      </View>

      {/* Previous Performance with Tap-to-Copy Ergonomics */}
      <TouchableOpacity
        style={styles.colPrev}
        onPress={handleCopyPrevious}
        activeOpacity={prevSet ? 0.6 : 1}
      >
        <Text style={styles.prevText} numberOfLines={1}>
          {prevLabel}
        </Text>
      </TouchableOpacity>

      {/* Weight Input with 42px height & selectTextOnFocus */}
      <View style={styles.colWeight}>
        <TextInput
          style={[styles.numericInput, set.done && styles.numericInputDone]}
          keyboardType="decimal-pad"
          value={weightText}
          placeholder="0"
          placeholderTextColor={colors.text.muted}
          selectTextOnFocus
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onChangeText={handleWeightChange}
          onBlur={handleWeightBlur}
        />
      </View>

      {/* Reps Input with 42px height & selectTextOnFocus */}
      <View style={styles.colReps}>
        <TextInput
          style={[styles.numericInput, set.done && styles.numericInputDone]}
          keyboardType="number-pad"
          value={repsText}
          placeholder="0"
          placeholderTextColor={colors.text.muted}
          selectTextOnFocus
          onChangeText={(txt) => {
            setRepsText(txt);
            const val = parseInt(txt, 10) || 0;
            onUpdate({ reps: val });
          }}
        />
      </View>

      {/* RPE Chip */}
      <View style={styles.colRpe}>
        <TouchableOpacity
          style={[
            styles.rpeChip,
            set.rpe != null && styles.rpeChipActive,
            set.done && styles.rpeChipDone,
          ]}
          onPress={onOpenRpePicker}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.rpeChipText,
              set.rpe != null && styles.rpeChipTextActive,
            ]}
          >
            {set.rpe != null ? `@${set.rpe}` : 'RPE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Done Checkbox: Tactile 3D CelebrationCheckmark */}
      <View style={styles.colDone}>
        <CelebrationCheckmark
          done={set.done}
          onToggle={onToggleDone}
          size={36}
          hitSlop={8}
        />
      </View>
    </Animated.View>
  );
});

interface WorkoutLoggerInnerProps {
  initialSession: Session;
}

function WorkoutLoggerInner({ initialSession }: WorkoutLoggerInnerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, weeklyGoal } = useSettings();
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());

  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [exerciseMap, setExerciseMap] = useState<Record<string, ExerciseRow>>({});
  const [previousSetsMap, setPreviousSetsMap] = useState<Record<string, WorkSet[]>>({});

  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [isRoutineSaved, setIsRoutineSaved] = useState(false);
  const finishedSessionRef = useRef<Session | null>(null);

  // RPE Picker State
  const [rpePickerTarget, setRpePickerTarget] = useState<{
    exerciseEntryId: string;
    setId: string;
    currentRpe: number | null;
  } | null>(null);

  // Rest Timer State
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const hasVibratedRef = useRef(false);
  const scheduledNotificationIdRef = useRef<string | null>(null);

  const cancelRestNotification = useCallback(async () => {
    if (scheduledNotificationIdRef.current) {
      await cancelRestNotificationAsync(scheduledNotificationIdRef.current);
      scheduledNotificationIdRef.current = null;
    }
  }, []);

  const scheduleRestNotification = useCallback(async (endsAtMs: number) => {
    await cancelRestNotification();
    if (endsAtMs <= Date.now()) return;
    const id = await scheduleRestNotificationAsync(endsAtMs);
    if (id) {
      scheduledNotificationIdRef.current = id;
    }
  }, [cancelRestNotification]);

  // Clean up notifications on unmount
  useEffect(() => {
    return () => {
      cancelRestNotification();
    };
  }, [cancelRestNotification]);

  // Live timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest timer 250ms countdown interval (derived from absolute epoch timestamp)
  useEffect(() => {
    if (!restEndsAt) {
      setRestRemaining(0);
      hasVibratedRef.current = false;
      return;
    }

    const checkTimer = () => {
      const rem = remainingSeconds(restEndsAt, Date.now());
      setRestRemaining(rem);
      if (rem <= 0) {
        cancelRestNotification();
        if (!hasVibratedRef.current) {
          hasVibratedRef.current = true;
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        }
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 250);
    return () => clearInterval(interval);
  }, [restEndsAt, cancelRestNotification]);

  // Load exercise metadata & previous sets for any exercises in the session
  const loadExerciseDetails = useCallback(async (exerciseId: string) => {
    try {
      if (!exerciseMap[exerciseId]) {
        const found = await repository.searchExercises('', 200);
        const match = found.find((e) => e.id === exerciseId);
        if (match) {
          setExerciseMap((prev) => ({ ...prev, [exerciseId]: match }));
        }
      }
      if (!previousSetsMap[exerciseId]) {
        const prevSets = await repository.getLastSets(exerciseId);
        setPreviousSetsMap((prev) => ({ ...prev, [exerciseId]: prevSets }));
      }
    } catch (err) {
      console.error('Failed to load exercise details:', err);
    }
  }, [exerciseMap, previousSetsMap]);

  useEffect(() => {
    for (const ex of session.exercises) {
      loadExerciseDetails(ex.exerciseId);
    }
  }, [session.exercises, loadExerciseDetails]);

  // Debounced auto-save (300ms)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (session.endedAt) return; // Finished sessions saved explicitly

    const timer = setTimeout(() => {
      repository.saveSession(session).catch((err) => {
        console.error('Auto-save error:', err);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [session]);

  const handleAddExercise = (exercise: ExerciseRow) => {
    setExerciseMap((prev) => ({ ...prev, [exercise.id]: exercise }));
    const exerciseEntryId = Crypto.randomUUID();
    const setId = Crypto.randomUUID();
    dispatch({ type: 'ADD_EXERCISE', id: exerciseEntryId, exerciseId: exercise.id });
    dispatch({ type: 'ADD_SET', exerciseEntryId, setId });
  };

  const handleToggleDone = (exerciseEntryId: string, setId: string) => {
    triggerHaptic('setDone');

    const ex = session.exercises.find((e) => e.id === exerciseEntryId);
    const st = ex?.sets.find((s) => s.id === setId);
    const willBeDone = !st?.done;

    dispatch({ type: 'TOGGLE_DONE', exerciseEntryId, setId });

    // Start rest timer if set is ticked done and rest timer is enabled
    if (willBeDone && settings.restTimerEnabled) {
      hasVibratedRef.current = false;
      const durationSec =
        settings.restOverrideSec ?? suggestRest(st?.reps ?? 8, st?.rpe);
      const endsAt = startRest(Date.now(), durationSec);
      setRestEndsAt(endsAt);
      scheduleRestNotification(endsAt);
    }
  };

  const handleFinish = async () => {
    cancelRestNotification();
    const now = new Date().toISOString();
    const newPRs: PRSummaryItem[] = [];

    // Detect PRs BEFORE saving finished state
    for (const ex of session.exercises) {
      const exName = exerciseMap[ex.exerciseId]?.name ?? 'Exercise';
      const priorHistory = await repository.getExerciseHistory(ex.exerciseId);

      for (const st of ex.sets) {
        if (st.done && st.reps > 0) {
          const prTypes = detectPRs(priorHistory, {
            weightKg: st.weightKg,
            reps: st.reps,
            rpe: st.rpe,
            type: st.type,
          });
          if (prTypes.length > 0) {
            newPRs.push({
              exerciseName: exName,
              prTypes,
              weightKg: st.weightKg,
              reps: st.reps,
            });
          }
        }
      }
    }

    const finished = sessionReducer(session, { type: 'FINISH', at: now });
    finishedSessionRef.current = finished;
    dispatch({ type: 'FINISH', at: now });
    await repository.saveSession(finished);

    let streakWeeks: number | undefined;
    let weekProgress: { current: number; target: number } | undefined;
    try {
      const pastWorkouts = await repository.listWorkouts(100, 0);
      const allDates = [now, ...pastWorkouts.map((w) => w.startedAt)];
      const targetGoal = weeklyGoal || 3;
      const streakResult = weeklyStreak(allDates, targetGoal, Date.parse(now), 0);
      streakWeeks = streakResult.weeks;
      weekProgress = { current: streakResult.thisWeekCount, target: targetGoal };
    } catch (_) {}

    setSummaryData({
      durationMin: sessionDurationMin(finished, now),
      volumeKg: sessionVolume(finished),
      exerciseCount: finished.exercises.length,
      setCount: finished.exercises.reduce((acc, e) => acc + e.sets.length, 0),
      prs: newPRs,
      streakWeeks,
      weekProgress,
    });
    setIsSummaryVisible(true);
  };

  const handleSaveRoutine = async () => {
    const targetSession = finishedSessionRef.current || session;
    if (!targetSession || targetSession.exercises.length === 0) return;
    try {
      const template: Template = {
        id: Crypto.randomUUID(),
        name: targetSession.name || 'Routine',
        exercises: targetSession.exercises.map((e) => {
          const doneSets = e.sets.filter((s) => s.done);
          const repsDone = doneSets.map((s) => s.reps).filter((r) => r > 0);
          const lowestReps = repsDone.length > 0 ? Math.min(...repsDone) : 8;
          const highestReps = repsDone.length > 0 ? Math.max(...repsDone) : 8;
          const repMin = lowestReps;
          const repMax = Math.max(highestReps + 2, repMin + 2);
          return {
            exerciseId: e.exerciseId,
            sets: Math.max(1, doneSets.length),
            repMin,
            repMax,
            incrementKg: 2.5,
          };
        }),
      };
      await repository.saveTemplate(template);
      setIsRoutineSaved(true);
    } catch (err) {
      console.error('Failed to save routine:', err);
    }
  };

  const handleDiscard = () => {
    cancelRestNotification();
    const doDiscard = async () => {
      await repository.discardSession(session.id);
      router.replace('/(tabs)');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Discard this workout? All progress will be lost.')) {
        doDiscard();
      }
    } else {
      Alert.alert(
        'Discard Workout',
        'Are you sure you want to discard this workout? All progress will be lost.',
        [
          { text: 'Keep Logging', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: doDiscard },
        ]
      );
    }
  };

  const currentVolume = sessionVolume(session);
  const durationLabel = formatTimer(session.startedAt, nowIso);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ChevronLeft size={24} color={colors.text.primary} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.workoutNameText} numberOfLines={1}>
            {session.name}
          </Text>
          <View style={styles.headerMetricsRow}>
            <View style={styles.timerRow}>
              <Timer size={13} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.timerText}>{durationLabel}</Text>
            </View>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.volumeText}>
              {formatWeight(currentVolume, settings.unit, true)}
            </Text>
          </View>
        </View>

        <View>
          <ChunkyButton
            title="Finish"
            size="sm"
            onPress={handleFinish}
            haptic="workoutFinished"
            leftIcon={<Check size={15} strokeWidth={2.2} color={colors.text.inverse || '#050507'} />}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + (restEndsAt !== null ? 100 : 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {session.exercises.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Exercises Added</Text>
            <Text style={styles.emptyDesc}>
              Tap "Add Exercise" below to begin logging your workout.
            </Text>
            <ChunkyButton
              title="+ Add Exercise"
              onPress={() => setExercisePickerOpen(true)}
              leftIcon={<Plus size={18} color={colors.text.inverse || '#050507'} />}
              style={styles.addExerciseEmptyBtn}
            />
          </Card>
        ) : (
          session.exercises.map((exercise) => {
            const exInfo = exerciseMap[exercise.exerciseId];
            const prevSets = previousSetsMap[exercise.exerciseId] || [];

            return (
              <Card key={exercise.id} style={styles.exerciseCard}>
                {/* Exercise Header */}
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseTitleCol}>
                    <Text style={styles.exerciseName}>
                      {exInfo?.name || 'Loading Exercise...'}
                    </Text>
                    {exInfo?.primaryMuscles && exInfo.primaryMuscles.length > 0 && (
                      <Text style={styles.exerciseCategory}>
                        {exInfo.category.toUpperCase()} • {exInfo.primaryMuscles.join(', ')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    hitSlop={12}
                    onPress={() => dispatch({ type: 'REMOVE_EXERCISE', id: exercise.id })}
                    style={styles.removeExBtn}
                  >
                    <X size={18} color={colors.text.muted} strokeWidth={2.0} />
                  </TouchableOpacity>
                </View>

                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.colHeader, styles.colSet]}>SET</Text>
                  <Text style={[styles.colHeader, styles.colPrev]}>PREVIOUS</Text>
                  <Text style={[styles.colHeader, styles.colWeight]}>
                    {settings.unit.toUpperCase()}
                  </Text>
                  <Text style={[styles.colHeader, styles.colReps]}>REPS</Text>
                  <Text style={[styles.colHeader, styles.colRpe]}>RPE</Text>
                  <View style={[styles.colDoneHeader]}>
                    <Check size={14} color={colors.text.muted} strokeWidth={2.4} />
                  </View>
                </View>

                {/* Set Rows */}
                {exercise.sets.map((set, setIndex) => {
                  const prevSet = prevSets[setIndex];

                  return (
                    <SetRowItem
                      key={set.id}
                      exerciseId={exercise.id}
                      set={set}
                      setIndex={setIndex}
                      prevSet={prevSet}
                      unit={settings.unit}
                      onUpdate={(patch) => {
                        dispatch({
                          type: 'UPDATE_SET',
                          exerciseEntryId: exercise.id,
                          setId: set.id,
                          patch,
                        });
                      }}
                      onToggleDone={() => handleToggleDone(exercise.id, set.id)}
                      onOpenRpePicker={() =>
                        setRpePickerTarget({
                          exerciseEntryId: exercise.id,
                          setId: set.id,
                          currentRpe: set.rpe,
                        })
                      }
                    />
                  );
                })}

                {/* Add Set Button */}
                <PressableScale
                  style={styles.addSetButton}
                  onPress={() => {
                    const setId = Crypto.randomUUID();
                    dispatch({ type: 'ADD_SET', exerciseEntryId: exercise.id, setId });
                  }}
                  haptic="tap"
                >
                  <Text style={styles.addSetText}>+ Add Set</Text>
                </PressableScale>
              </Card>
            );
          })
        )}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <ChunkyButton
            title="+ Add Exercise"
            variant="secondary"
            onPress={() => setExercisePickerOpen(true)}
            leftIcon={<Plus size={18} color="#FFFFFF" />}
            style={styles.actionBtn}
          />
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={handleDiscard}
            activeOpacity={0.7}
          >
            <Text style={styles.discardText}>Discard Workout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Rest Timer Bar */}
      {restEndsAt !== null && (
        <Animated.View
          entering={FadeInDown.springify().damping(22).stiffness(160)}
          exiting={FadeOutDown.duration(160)}
          style={[styles.restBarContainer, { bottom: insets.bottom + 8 }]}
        >
          <View style={styles.restBarInfo}>
            <View style={styles.restBarHeaderRow}>
              {restRemaining > 0 ? (
                <Timer size={12} color={colors.accent} style={{ marginRight: 5 }} />
              ) : (
                <BellRing size={12} color={colors.success} style={{ marginRight: 5 }} />
              )}
              <Text style={styles.restBarTitle}>
                {restRemaining > 0 ? 'REST TIMER' : 'REST COMPLETE'}
              </Text>
            </View>
            <Text
              style={[
                styles.restBarTimer,
                restRemaining === 0 && styles.restBarTimerDone,
              ]}
            >
              {formatClock(restRemaining)}
            </Text>
          </View>
          <View style={styles.restBarControls}>
            <TouchableOpacity
              style={styles.restStepBtn}
              onPress={() =>
                setRestEndsAt((prev) => {
                  if (!prev) return null;
                  const next = adjustRest(prev, -15, Date.now());
                  scheduleRestNotification(next);
                  return next;
                })
              }
            >
              <Text style={styles.restStepText}>-15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restStepBtn}
              onPress={() =>
                setRestEndsAt((prev) => {
                  if (!prev) return null;
                  const next = adjustRest(prev, 15, Date.now());
                  scheduleRestNotification(next);
                  return next;
                })
              }
            >
              <Text style={styles.restStepText}>+15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restSkipBtn}
              onPress={() => {
                cancelRestNotification();
                setRestEndsAt(null);
              }}
            >
              <Text style={styles.restSkipText}>
                {restRemaining > 0 ? 'Skip' : 'Dismiss'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* RPE Picker Modal */}
      <Modal
        visible={rpePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRpePickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRpePickerTarget(null)}
        >
          <View style={styles.rpePickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.rpePickerTitle}>Select RPE (Effort)</Text>
            <Text style={styles.rpePickerSubtitle}>
              Rate of Perceived Exertion (6 = light effort, 10 = absolute limit)
            </Text>

            <View style={styles.rpeGrid}>
              {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((val) => {
                const isSelected = rpePickerTarget?.currentRpe === val;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.rpeOptionBtn, isSelected && styles.rpeOptionBtnSelected]}
                    onPress={() => {
                      if (rpePickerTarget) {
                        dispatch({
                          type: 'UPDATE_SET',
                          exerciseEntryId: rpePickerTarget.exerciseEntryId,
                          setId: rpePickerTarget.setId,
                          patch: { rpe: val },
                        });
                      }
                      setRpePickerTarget(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.rpeOptionText,
                        isSelected && styles.rpeOptionTextSelected,
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rpeModalActions}>
              <TouchableOpacity
                style={styles.rpeClearBtn}
                onPress={() => {
                  if (rpePickerTarget) {
                    dispatch({
                      type: 'UPDATE_SET',
                      exerciseEntryId: rpePickerTarget.exerciseEntryId,
                      setId: rpePickerTarget.setId,
                      patch: { rpe: null },
                    });
                  }
                  setRpePickerTarget(null);
                }}
              >
                <Text style={styles.rpeClearText}>Clear RPE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rpeCloseBtn}
                onPress={() => setRpePickerTarget(null)}
              >
                <Text style={styles.rpeCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Picker Sheet */}
      <ExercisePickerSheet
        visible={exercisePickerOpen}
        onClose={() => setExercisePickerOpen(false)}
        onSelectExercise={handleAddExercise}
      />

      {/* Workout Finished Summary Modal */}
      <WorkoutSummaryModal
        visible={isSummaryVisible}
        data={summaryData}
        isRoutineSaved={isRoutineSaved}
        onSaveRoutine={handleSaveRoutine}
        onDone={() => {
          setIsSummaryVisible(false);
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        await repository.init();
        if (id) {
          const existing = await repository.getWorkout(id);
          if (mounted) {
            setSession(existing ?? newSession(id, new Date().toISOString()));
          }
        }
      } catch (err) {
        console.error('Failed to initialize workout session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading || !session) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <WorkoutLoggerInner key={session.id} initialSession={session} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerLoading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: 28,
    color: colors.text.secondary,
    lineHeight: 30,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  workoutNameText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  headerMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  timerText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
  },
  dotSeparator: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  volumeText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  finishBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
  },
  finishBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
  scrollContainer: {
    padding: spacing.base,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  addExerciseEmptyBtn: {
    minWidth: 180,
  },
  exerciseCard: {
    marginBottom: spacing.md,
    padding: spacing.sm + 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  exerciseTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  exerciseCategory: {
    fontSize: typography.fontSize.xs - 1,
    color: colors.text.muted,
    marginTop: 2,
    fontWeight: typography.fontWeight.medium,
  },
  removeExBtn: {
    padding: spacing.xs,
  },
  removeExText: {
    fontSize: 22,
    color: colors.text.muted,
    lineHeight: 22,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  colSet: {
    width: 26,
    alignItems: 'center',
  },
  colPrev: {
    flex: 1.1,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  colWeight: {
    flex: 1,
    paddingHorizontal: 2,
  },
  colReps: {
    flex: 0.85,
    paddingHorizontal: 2,
  },
  colRpe: {
    flex: 0.85,
    paddingHorizontal: 2,
  },
  colDone: {
    width: 36,
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  setRowDone: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  setNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  textDone: {
    color: colors.accent,
  },
  prevText: {
    fontSize: 11,
    color: colors.text.muted,
    textAlign: 'center',
  },
  numericInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight || 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.sm,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    height: 42,
    minHeight: 42,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  numericInputDone: {
    borderColor: 'rgba(0, 229, 255, 0.40)',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colDoneHeader: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  rpeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.xs,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    borderColor: colors.accent,
  },
  rpeChipDone: {
    borderColor: 'rgba(0, 229, 255, 0.28)',
  },
  rpeChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  rpeChipTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkText: {
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
  },
  checkTextActive: {
    color: colors.background,
  },
  addSetButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radii.sm,
  },
  addSetText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
  },
  bottomActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
  discardBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  discardText: {
    fontSize: typography.fontSize.sm,
    color: colors.danger,
    fontWeight: typography.fontWeight.medium,
  },

  // Rest Timer Floating Bar
  restBarContainer: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  restBarInfo: {
    flexDirection: 'column',
  },
  restBarTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
  },
  restBarTimer: {
    fontSize: 22,
    fontWeight: typography.fontWeight.black,
    color: colors.accent,
  },
  restBarTimerDone: {
    color: colors.success,
  },
  restBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restStepBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.xs,
  },
  restStepText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  restSkipBtn: {
    backgroundColor: 'rgba(255, 80, 80, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.xs,
  },
  restSkipText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.danger,
  },

  // RPE Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  rpePickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  rpePickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  rpePickerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  rpeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  rpeOptionBtn: {
    width: '18%',
    flexGrow: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpeOptionBtnSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  rpeOptionText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  rpeOptionTextSelected: {
    color: colors.background,
  },
  rpeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  rpeClearBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  rpeClearText: {
    fontSize: typography.fontSize.sm,
    color: colors.danger,
    fontWeight: typography.fontWeight.medium,
  },
  rpeCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: radii.sm,
  },
  rpeCloseText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
