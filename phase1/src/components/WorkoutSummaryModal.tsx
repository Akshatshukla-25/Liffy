import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Award, Flame, Sparkles, Check } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../theme';
import { Card } from './Card';
import { ChunkyButton, PopIn, CountUpText, Confetti, triggerHaptic } from '../motion';
import type { PRType } from '../lib/prs';
import { formatWeight, kgToLb } from '../lib/units';
import { celebrationTier } from '../lib/celebrate';
import { useSettings } from '../context/settings';

export interface PRSummaryItem {
  exerciseName: string;
  prTypes: PRType[];
  weightKg: number;
  reps: number;
}

export interface WorkoutSummaryData {
  durationMin: number;
  volumeKg: number;
  exerciseCount: number;
  setCount: number;
  prs: PRSummaryItem[];
  streakWeeks?: number;
  weekProgress?: { current: number; target: number };
}

interface WorkoutSummaryModalProps {
  visible: boolean;
  data: WorkoutSummaryData | null;
  onDone: () => void;
  onSaveRoutine?: () => void;
  isRoutineSaved?: boolean;
}

export function WorkoutSummaryModal({
  visible,
  data,
  onDone,
  onSaveRoutine,
  isRoutineSaved = false,
}: WorkoutSummaryModalProps) {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const prCount = data?.prs.length ?? 0;
  const setsDone = data?.setCount ?? 0;
  const tier = celebrationTier({ setsDone, prCount });

  useEffect(() => {
    if (visible && data) {
      if (tier === 'epic') {
        triggerHaptic('pr');
        setTimeout(() => triggerHaptic('pr'), 280);
        setTimeout(() => triggerHaptic('workoutFinished'), 560);
      } else if (tier === 'pr') {
        triggerHaptic('pr');
        setTimeout(() => triggerHaptic('workoutFinished'), 320);
      } else {
        triggerHaptic('workoutFinished');
      }
    }
  }, [visible, tier, data]);

  if (!data) return null;

  const displayVolume = Math.round(settings.unit === 'lb' ? kgToLb(data.volumeKg) : data.volumeKg);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        {/* Full celebration confetti & particle explosion */}
        <Confetti tier={tier} seed={Date.now()} />

        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Top Congratulatory Pill Badge */}
            <View style={styles.badge}>
              <Sparkles size={13} color={colors.accent} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>
                {tier === 'epic' ? 'EPIC BEAST SESSION' : tier === 'pr' ? 'NEW PERSONAL RECORDS' : 'WORKOUT COMPLETE'}
              </Text>
            </View>

            {/* Celebratory Icon with Spring Overshoot Pop-In */}
            <PopIn style={styles.trophyWrapper}>
              <View style={[
                styles.trophyCircle,
                tier === 'epic' && styles.trophyCircleEpic,
                tier === 'done' && styles.trophyCircleDone,
              ]}>
                {tier === 'epic' ? (
                  <Trophy size={42} color={colors.text.inverse || '#050507'} />
                ) : tier === 'pr' ? (
                  <Trophy size={38} color={colors.accent} />
                ) : (
                  <Award size={38} color={colors.accent} />
                )}
              </View>
            </PopIn>

            <Text style={styles.title}>
              {tier === 'epic' ? 'UNSTOPPABLE!' : tier === 'pr' ? 'Records Broken!' : 'Workout Crushed!'}
            </Text>
            <Text style={styles.subtitle}>
              {tier === 'epic'
                ? 'Monstrous volume and multiple personal records shattered.'
                : tier === 'pr'
                ? 'You raised your ceiling today. Training saved locally to offline storage.'
                : 'Great workout logged and persisted to offline SQLite.'}
            </Text>

            {/* 4-Stat Grid with Dynamic Count-Up */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>DURATION</Text>
                <View style={styles.countRow}>
                  <CountUpText value={data.durationMin} style={styles.statValue} />
                  <Text style={styles.statUnit}> min</Text>
                </View>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>TOTAL VOLUME</Text>
                <View style={styles.countRow}>
                  <CountUpText value={displayVolume} style={styles.statValue} />
                  <Text style={styles.statUnit}> {settings.unit}</Text>
                </View>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>EXERCISES</Text>
                <CountUpText value={data.exerciseCount} style={styles.statValue} />
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>SETS COMPLETED</Text>
                <CountUpText value={data.setCount} style={styles.statValue} />
              </Card>
            </View>

            {/* Weekly Goal Progress Gamification Card */}
            {data.weekProgress && (
              <Card style={styles.streakCard}>
                <View style={styles.streakRow}>
                  <View style={styles.streakIconCircle}>
                    <Flame size={20} color={colors.accent} />
                  </View>
                  <View style={styles.streakTextCol}>
                    <Text style={styles.streakTitle}>
                      {data.streakWeeks ? `${data.streakWeeks}-Week Streak Active` : 'Weekly Training Target'}
                    </Text>
                    <Text style={styles.streakSubtitle}>
                      {data.weekProgress.current} of {data.weekProgress.target} workouts completed this week
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Personal Records Broken Section */}
            {data.prs.length > 0 && (
              <View style={styles.prsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Trophy size={18} color={colors.accent} style={styles.sectionHeaderIcon} />
                  <Text style={styles.sectionTitle}>Personal Records Broken</Text>
                </View>

                {data.prs.map((pr, idx) => (
                  <PopIn key={idx} delay={idx * 90}>
                    <Card style={styles.prCard}>
                      <View style={styles.prHeader}>
                        <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                        <View style={styles.prBadgePill}>
                          <Sparkles size={11} color={colors.accent} style={{ marginRight: 3 }} />
                          <Text style={styles.prBadgePillText}>
                            {pr.prTypes.join(' & ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.prDetail}>
                        {formatWeight(pr.weightKg, settings.unit, true)} × {pr.reps} reps
                      </Text>
                    </Card>
                  </PopIn>
                ))}
              </View>
            )}

            {/* Chunky 3D Action Buttons */}
            <View style={styles.buttonContainer}>
              {onSaveRoutine && (
                <ChunkyButton
                  title={isRoutineSaved ? "Saved as Routine" : "Save as Routine"}
                  variant="secondary"
                  disabled={isRoutineSaved}
                  onPress={onSaveRoutine}
                  leftIcon={isRoutineSaved ? <Check size={16} color={colors.text.secondary} /> : undefined}
                  style={styles.saveRoutineBtn}
                />
              )}

              <ChunkyButton
                title="Return to Home"
                onPress={onDone}
                variant="primary"
                style={styles.doneBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.96)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.base,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.base,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.28)',
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    color: colors.accent,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 1.5,
  },
  trophyWrapper: {
    marginBottom: spacing.md,
  },
  trophyCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  trophyCircleEpic: {
    backgroundColor: colors.accent,
    borderColor: '#FFFFFF',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
  },
  trophyCircleDone: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accent,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.base,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.base,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
  },
  statUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  streakCard: {
    width: '100%',
    marginBottom: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  streakTextCol: {
    flex: 1,
  },
  streakTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  streakSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  prsSection: {
    width: '100%',
    marginBottom: spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeaderIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  prCard: {
    marginBottom: spacing.sm,
    padding: spacing.base,
    borderColor: 'rgba(0, 229, 255, 0.40)',
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  prExerciseName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  prBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.30)',
  },
  prBadgePillText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  prDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  buttonContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  saveRoutineBtn: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  doneBtn: {
    width: '100%',
  },
});
