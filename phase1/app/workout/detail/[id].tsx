import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../../../src/theme';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { sessionVolume, sessionDurationMin, type Session } from '../../../src/lib/session';
import { formatWeight } from '../../../src/lib/units';
import { useSettings } from '../../../src/context/settings';
import type { ExerciseRow } from '../../../src/db/repository';
import { repository } from '../../../src/db/sqliteRepository';
import { BodyMap } from '../../../src/components/body';
import { ExerciseIllustration } from '../../../src/components/ExerciseIllustration';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  const [session, setSession] = useState<Session | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<string, ExerciseRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        await repository.init();
        if (id) {
          const s = await repository.getWorkout(id);
          if (mounted && s) {
            setSession(s);
            const exercises = await repository.searchExercises('', 300);
            const map: Record<string, ExerciseRow> = {};
            for (const e of exercises) {
              map[e.id] = e;
            }
            setExerciseMap(map);
          }
        }
      } catch (err) {
        console.error('Failed to load workout details:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDelete = () => {
    const doDelete = async () => {
      if (id) {
        await repository.deleteWorkout(id);
        router.back();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this workout from history?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Workout',
        'Are you sure you want to delete this workout from your history?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, styles.centerLoading, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Workout not found.</Text>
        <Button title="Back" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const durationMin = sessionDurationMin(session);
  const volumeKg = sessionVolume(session);
  const dateFormatted = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const { workoutPrimaryMuscles, workoutSecondaryMuscles } = useMemo(() => {
    if (!session) return { workoutPrimaryMuscles: [], workoutSecondaryMuscles: [] };
    const pSet = new Set<string>();
    const sSet = new Set<string>();
    for (const ex of session.exercises) {
      const info = exerciseMap[ex.exerciseId];
      if (info) {
        info.primaryMuscles?.forEach((m) => pSet.add(m));
        info.secondaryMuscles?.forEach((m) => sSet.add(m));
      }
    }
    return {
      workoutPrimaryMuscles: Array.from(pSet),
      workoutSecondaryMuscles: Array.from(sSet),
    };
  }, [session, exerciseMap]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={24} color={colors.text.primary} strokeWidth={2.0} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{session.name}</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={10} style={styles.deleteHeaderBtn}>
          <Text style={styles.deleteHeaderText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing.xl },
        ]}
      >
        <Text style={styles.dateText}>{dateFormatted}</Text>

        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>DURATION</Text>
            <Text style={styles.metricValue}>{durationMin} <Text style={styles.metricUnit}>min</Text></Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL VOLUME</Text>
            <Text style={styles.metricValue}>{formatWeight(volumeKg, settings.unit, true)}</Text>
          </Card>
        </View>

        {workoutPrimaryMuscles.length > 0 && (
          <Card elevated style={styles.activationCard}>
            <Text style={styles.activationHeader}>TARGETED MUSCLE ACTIVATION</Text>
            <View style={styles.bodyMapWrapper}>
              <BodyMap
                highlightedMuscles={workoutPrimaryMuscles}
                secondaryMuscles={workoutSecondaryMuscles}
                viewMode="both"
                height={175}
                showLegend
              />
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Exercises & Sets</Text>

        {session.exercises.map((ex, exIdx) => {
          const exInfo = exerciseMap[ex.exerciseId];
          const isBackMove = exInfo?.primaryMuscles?.some((m) =>
            ['lats', 'traps', 'glutes', 'hamstrings', 'lower back', 'lower_back', 'calves', 'triceps', 'upper back'].includes(
              m.toLowerCase()
            )
          );

          return (
            <Card key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseCardHeader}>
                <View style={styles.exerciseCardTitleCol}>
                  <Text style={styles.exerciseName}>
                    {exInfo?.name || 'Exercise'}
                  </Text>
                  {exInfo?.primaryMuscles && exInfo.primaryMuscles.length > 0 && (
                    <Text style={styles.exerciseCategory}>
                      {exInfo.category.toUpperCase()} • {exInfo.primaryMuscles.join(', ')}
                    </Text>
                  )}
                </View>
                {exInfo && (
                  <ExerciseIllustration
                    name={exInfo.name}
                    id={exInfo.id}
                    primaryMuscles={exInfo.primaryMuscles}
                    secondaryMuscles={exInfo.secondaryMuscles}
                    size={48}
                    style={styles.miniThumbBox}
                  />
                )}
              </View>

              <View style={styles.setsList}>
                {ex.sets.map((set, sIdx) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setIndexText}>Set {sIdx + 1}</Text>
                    <Text style={styles.setStatsText}>
                      {formatWeight(set.weightKg, settings.unit, true)} × {set.reps} reps
                      {set.rpe != null ? ` @${set.rpe}` : ''}
                    </Text>
                    {set.done ? (
                      <View style={styles.doneBadge}>
                        <Check size={14} color={colors.success} strokeWidth={2.0} />
                        <Text style={styles.doneBadgeText}>Done</Text>
                      </View>
                    ) : (
                      <View style={styles.skippedBadge}>
                        <Text style={styles.skippedBadgeText}>Skipped</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  deleteHeaderBtn: {
    paddingHorizontal: spacing.xs,
  },
  deleteHeaderText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  container: {
    padding: spacing.base,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: spacing.base,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    padding: spacing.base,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
  },
  metricUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  activationCard: {
    padding: spacing.base,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  activationHeader: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  bodyMapWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  exerciseCard: {
    marginBottom: spacing.base,
    padding: spacing.base,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exerciseCardTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  miniThumbBox: {
    width: 48,
    height: 48,
    backgroundColor: '#161924',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exerciseName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  exerciseCategory: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  setsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  setIndexText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  setStatsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doneBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
  },
  skippedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  skippedBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted || colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.base,
  },
});
