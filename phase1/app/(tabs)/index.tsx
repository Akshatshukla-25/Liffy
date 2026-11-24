import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { Flame, Settings, Play, Plus } from 'lucide-react-native';
import { useSettings } from '../../src/context/settings';
import { colors, spacing, typography, radii } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ChunkyButton, PressableScale, PopIn, AnimatedBar } from '../../src/motion';
import { newSession, type Session } from '../../src/lib/session';
import { sessionFromTemplate, type Template } from '../../src/lib/templates';
import { weeklyStreak, type Streak } from '../../src/lib/celebrate';
import type { WorkSet } from '../../src/lib/types';
import { repository } from '../../src/db/sqliteRepository';

function RadarBeacon() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2.4, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.radarContainer}>
      <Animated.View style={[styles.radarHalo, haloStyle]} />
      <View style={styles.radarDot} />
    </View>
  );
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { weeklyGoal } = useSettings();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exerciseNamesMap, setExerciseNamesMap] = useState<Record<string, string>>({});
  const [streak, setStreak] = useState<Streak>({ weeks: 0, thisWeekCount: 0, thisWeekMet: false });

  const loadStreak = useCallback(async () => {
    try {
      await repository.init();
      const sessions = await repository.listWorkouts(100, 0);
      const runs = await repository.listRuns(100, 0);
      const starts = [
        ...sessions.map((s) => s.startedAt),
        ...runs.map((r) => r.startedAt),
      ];
      const tzOffset = -new Date().getTimezoneOffset();
      const strk = weeklyStreak(starts, weeklyGoal || 3, Date.now(), tzOffset);
      setStreak(strk);
    } catch (err) {
      console.error('Failed to calculate streak:', err);
    }
  }, [weeklyGoal]);

  const checkActiveSession = useCallback(async () => {
    try {
      await repository.init();
      const active = await repository.getActiveSession();
      setActiveSession(active);
    } catch (err) {
      console.error('Failed to check active session:', err);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      await repository.init();
      const list = await repository.listTemplates();
      setTemplates(list);

      const allIds = Array.from(new Set(list.flatMap((t) => t.exercises.map((e) => e.exerciseId))));
      if (allIds.length > 0) {
        const names = await repository.getExerciseNames(allIds);
        setExerciseNamesMap(names);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkActiveSession();
      loadTemplates();
      loadStreak();
    }, [checkActiveSession, loadTemplates, loadStreak])
  );

  const handleStartSession = async () => {
    if (activeSession) {
      router.push(`/workout/${activeSession.id}`);
      return;
    }
    const newId = Crypto.randomUUID();
    const session = newSession(newId, new Date().toISOString());
    await repository.saveSession(session);
    router.push(`/workout/${newId}`);
  };

  const handleStartFromTemplate = async (template: Template) => {
    if (activeSession) {
      const confirmResume =
        Platform.OS === 'web'
          ? window.confirm('You have an active workout in progress. Resume it instead?')
          : true;
      if (confirmResume) {
        router.push(`/workout/${activeSession.id}`);
        return;
      }
    }

    const now = new Date().toISOString();
    const lastSets: Record<string, WorkSet[]> = {};
    for (const te of template.exercises) {
      lastSets[te.exerciseId] = await repository.getLastSets(te.exerciseId);
    }

    const session = sessionFromTemplate(
      template,
      now,
      lastSets,
      Crypto.randomUUID
    );
    await repository.saveSession(session);
    router.push(`/workout/${session.id}`);
  };

  const handleTemplateOptions = (template: Template) => {
    const doDelete = async () => {
      await repository.deleteTemplate(template.id);
      loadTemplates();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete routine "${template.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert(template.name, 'Manage routine', [
        { text: 'Start Workout', onPress: () => handleStartFromTemplate(template) },
        { text: 'Edit Routine', onPress: () => router.push(`/template/${template.id}`) },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDiscardActive = () => {
    if (!activeSession) return;
    const doDiscard = async () => {
      await repository.discardSession(activeSession.id);
      setActiveSession(null);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Discard active workout?')) {
        doDiscard();
      }
    } else {
      Alert.alert('Discard Workout', 'Discard your current active workout?', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: doDiscard },
      ]);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.screenTitle}>Workout</Text>
            <Text style={styles.screenSubtitle}>
              Lifting workouts & routines
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={styles.settingsGearBtn}
            accessibilityLabel="Settings"
          >
            <Settings size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Weekly Streak Flame Card */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.streakFlameCol}>
              <View style={[styles.flameCircle, streak.thisWeekMet && styles.flameCircleMet]}>
                <Flame size={22} color={streak.thisWeekMet ? '#000000' : colors.accent} />
              </View>
              {streak.thisWeekMet && (
                <PopIn style={styles.metPop}>
                  <View style={styles.metTag}>
                    <Text style={styles.metTagText}>MET</Text>
                  </View>
                </PopIn>
              )}
            </View>
            <View style={styles.streakInfoCol}>
              <View style={styles.streakTitleRow}>
                <Text style={styles.streakWeeksText}>
                  <Text style={styles.streakWeeksBold}>{streak.weeks}</Text> {streak.weeks === 1 ? 'week streak' : 'weeks streak'}
                </Text>
                <Text style={styles.streakGoalText}>
                  {streak.thisWeekCount} / {weeklyGoal || 3} this week
                </Text>
              </View>
              <AnimatedBar
                progress={streak.thisWeekCount / (weeklyGoal || 3)}
                height={7}
                barColor={streak.thisWeekMet ? colors.accent : '#F59E0B'}
                style={styles.streakBar}
              />
            </View>
          </View>
        </Card>

        {/* Active Session Resume Card if exists */}
        {activeSession && (
          <Card variant="accent" style={styles.activeSessionCard}>
            <View style={styles.activeHeader}>
              <View style={styles.liveIndicator}>
                <RadarBeacon />
                <Text style={styles.liveText}>WORKOUT IN PROGRESS</Text>
              </View>
              <TouchableOpacity onPress={handleDiscardActive} hitSlop={10}>
                <Text style={styles.discardActiveText}>Discard</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.activeTitle}>{activeSession.name}</Text>
            <Text style={styles.activeSubtitle}>
              Started{' '}
              {new Date(activeSession.startedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              • {activeSession.exercises.length} exercises logged
            </Text>

            <ChunkyButton
              title="Resume Workout"
              onPress={() => router.push(`/workout/${activeSession.id}`)}
              leftIcon={<Play size={16} color={colors.text.inverse || '#050507'} />}
            />
          </Card>
        )}

        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>QUICK START</Text>
          </View>
          <Text style={styles.heroTitle}>Start an Empty Workout</Text>
          <Text style={styles.heroDesc}>
            Log sets, reps, and RPE on the fly with offline SQLite persistence.
          </Text>
          <ChunkyButton
            title={activeSession ? 'Start Another Session' : 'Start Session'}
            onPress={handleStartSession}
            leftIcon={<Plus size={18} color={colors.text.inverse || '#050507'} />}
          />
        </Card>

        {/* Routines & Templates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Routines & Templates</Text>
            <TouchableOpacity
              onPress={() => router.push('/template/new')}
              style={styles.newRoutineBtn}
            >
              <Text style={styles.newRoutineBtnText}>+ New Routine</Text>
            </TouchableOpacity>
          </View>

          {templates.length === 0 ? (
            <Card style={styles.emptyRoutineCard}>
              <Text style={styles.emptyRoutineTitle}>No Routines Yet</Text>
              <Text style={styles.emptyRoutineDesc}>
                Create routines to prefill exercises and automate progressive overload targets.
              </Text>
              <ChunkyButton
                title="Create Routine"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/template/new')}
                leftIcon={<Plus size={14} color="#FFFFFF" />}
                style={styles.createRoutineBtn}
              />
            </Card>
          ) : (
            templates.map((tpl, idx) => {
              const exerciseListNames = tpl.exercises
                .map((te) => exerciseNamesMap[te.exerciseId] || 'Exercise')
                .join(', ');

              return (
                <PressableScale
                  key={tpl.id}
                  onPress={() => handleStartFromTemplate(tpl)}
                  onLongPress={() => handleTemplateOptions(tpl)}
                  delayLongPress={500}
                  haptic="tap"
                >
                  <Card style={[styles.routineCard, idx > 0 && styles.cardSpacer]}>
                    <View style={styles.routineHeader}>
                      <Text style={styles.routineName}>{tpl.name}</Text>
                      <View style={styles.routineHeaderActions}>
                        <Text style={styles.routineMeta}>
                          {tpl.exercises.length} {tpl.exercises.length === 1 ? 'Exercise' : 'Exercises'}
                        </Text>
                        <TouchableOpacity
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/template/${tpl.id}`);
                          }}
                          style={styles.editPill}
                        >
                          <Text style={styles.editPillText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {exerciseListNames ? (
                      <Text style={styles.routineDetail} numberOfLines={2}>
                        {exerciseListNames}
                      </Text>
                    ) : (
                      <Text style={styles.routineDetail}>No exercises configured</Text>
                    )}
                    <View style={styles.tapToStartRow}>
                      <Text style={styles.tapToStartText}>Tap to Start • Hold to Manage</Text>
                    </View>
                  </Card>
                </PressableScale>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsGearBtn: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsGearIcon: {
    fontSize: 20,
  },
  screenTitle: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  activeSessionCard: {
    marginBottom: spacing.base,
    padding: spacing.base,
    borderColor: colors.accent,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radarContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  radarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  liveText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1,
  },
  discardActiveText: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    fontWeight: typography.fontWeight.medium,
  },
  activeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  activeSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  resumeBtn: {
    width: '100%',
  },
  heroCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentDim,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  heroDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.sm,
    marginBottom: spacing.base,
  },
  heroButton: {
    width: '100%',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  newRoutineBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newRoutineBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  emptyRoutineCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyRoutineTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyRoutineDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  createRoutineBtn: {
    minWidth: 150,
  },
  routineCard: {
    padding: spacing.base,
  },
  cardSpacer: {
    marginTop: spacing.md,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  routineHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routineName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flexShrink: 1,
  },
  routineMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },
  editPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  editPillText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  routineDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tapToStartRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tapToStartText: {
    fontSize: 10,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.medium,
  },
  statusCard: {
    padding: spacing.base,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statusLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  statusValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  statusValueActive: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
  },
  streakCard: {
    marginBottom: spacing.base,
    backgroundColor: colors.surface,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakFlameCol: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.28)',
  },
  flameCircleMet: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  metPop: {
    position: 'absolute',
    bottom: -6,
  },
  metTag: {
    backgroundColor: '#000000',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  metTagText: {
    fontSize: 8,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  streakInfoCol: {
    flex: 1,
  },
  streakTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  streakWeeksText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  streakWeeksBold: {
    fontSize: typography.fontSize.base,
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  streakGoalText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  streakBar: {
    marginTop: 2,
  },
});
