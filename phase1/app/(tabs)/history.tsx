import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Settings } from 'lucide-react-native';

import { colors, spacing, typography, radii } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { formatWeight } from '../../src/lib/units';
import { useSettings } from '../../src/context/settings';
import type { WorkoutSummary } from '../../src/db/repository';
import { repository } from '../../src/db/sqliteRepository';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();

  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    try {
      await repository.init();
      const list = await repository.listWorkouts(50, 0);
      setWorkouts(list);
    } catch (err) {
      console.error('Failed to load workouts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };

  const totalVolumeKg = workouts.reduce((acc, w) => acc + w.volumeKg, 0);

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.screenTitle}>History</Text>
          <Text style={styles.screenSubtitle}>
            Completed lifting sessions & logs
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

      <View style={styles.statsRow}>
        <Card style={styles.statBox}>
          <Text style={styles.statNumber}>{workouts.length}</Text>
          <Text style={styles.statLabel}>Completed Sessions</Text>
        </Card>
        <Card style={styles.statBox}>
          <Text style={styles.statNumber}>
            {formatWeight(totalVolumeKg, settings.unit, true)}
          </Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recorded Sessions</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlashList
          data={workouts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + spacing.xl },
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/workout/detail/${item.id}`)}
            >
              <Card elevated style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logTitleCol}>
                    <Text style={styles.logType}>STRENGTH SESSION</Text>
                    <Text style={styles.logTitle}>{item.name}</Text>
                  </View>
                  <Text style={styles.logDate}>{formatDate(item.startedAt)}</Text>
                </View>

                {item.exerciseNames.length > 0 && (
                  <Text style={styles.exerciseListText} numberOfLines={1}>
                    {item.exerciseNames.join(', ')}
                  </Text>
                )}

                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricVal}>{item.durationMin} min</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Volume</Text>
                    <Text style={styles.metricVal}>{formatWeight(item.volumeKg, settings.unit, true)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Exercises</Text>
                    <Text style={[styles.metricVal, { color: colors.accent }]}>
                      {item.exerciseNames.length}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Recorded Workouts</Text>
              <Text style={styles.emptyDesc}>
                You haven't logged any workouts yet. Start an empty session from the Workout tab!
              </Text>
            </Card>
          }
        />
      )}
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
  listContainer: {
    padding: spacing.base,
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
  settingsGearBtn: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    padding: spacing.base,
  },
  statNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  logCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  logTitleCol: {
    flex: 1,
  },
  logType: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 2,
  },
  logTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  logDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  exerciseListText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
