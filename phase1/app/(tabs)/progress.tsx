import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Settings } from 'lucide-react-native';

import { colors, spacing, typography, radii } from '../../src/theme';
import { Card } from '../../src/components/Card';
import {
  best1RMs,
  e1rmTrend,
  weeklyVolume,
  muscleSetsLast7,
  weeklyLoads,
  loadStatus,
  type LogRow,
  type LoadSession,
  type LoadStatus,
  type Best,
} from '../../src/lib/progress';
import { formatWeight, type Unit } from '../../src/lib/units';
import { useSettings } from '../../src/context/settings';
import { repository } from '../../src/db/sqliteRepository';
import { AnimatedBar, CountUpText } from '../../src/motion';
import { BodyMap } from '../../src/components/body';

interface TrendChartProps {
  data: { date: string; e1rm: number }[];
  exerciseName: string;
  unit: Unit;
}

function TrendLineChart({ data, exerciseName, unit }: TrendChartProps) {
  const [chartWidth, setChartWidth] = useState(300);
  const chartHeight = 140;
  const padX = 24;
  const padY = 20;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  };

  if (data.length === 0) {
    return (
      <View style={styles.trendEmptyContainer}>
        <Text style={styles.trendEmptyText}>No trend data available.</Text>
      </View>
    );
  }

  const latest = data[data.length - 1];
  const first = data[0];

  if (data.length === 1) {
    return (
      <View style={styles.trendChartBox} onLayout={onLayout}>
        <View style={styles.singlePointBox}>
          <Text style={styles.singlePointValue}>{formatWeight(latest.e1rm, unit, true)}</Text>
          <Text style={styles.singlePointDate}>
            First record • {new Date(latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  }

  const e1rmValues = data.map((d) => d.e1rm);
  const minVal = Math.min(...e1rmValues);
  const maxVal = Math.max(...e1rmValues);
  const range = Math.max(maxVal - minVal, 2);
  const yMin = Math.max(0, minVal - range * 0.15);
  const yMax = maxVal + range * 0.15;

  const innerW = chartWidth - padX * 2;
  const innerH = chartHeight - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * innerW;
    const y = padY + (1 - (d.e1rm - yMin) / (yMax - yMin)) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight} L ${points[0].x.toFixed(1)} ${chartHeight} Z`;

  return (
    <View style={styles.trendChartBox} onLayout={onLayout}>
      <View style={styles.trendHeaderRow}>
        <Text style={styles.trendExerciseTitle}>{exerciseName} Trend</Text>
        <Text style={styles.trendLatestVal}>{formatWeight(latest.e1rm, unit, true)}</Text>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Gradient fill under curve */}
        <Path d={areaPath} fill="url(#accentGradient)" />

        {/* Trend stroke */}
        <Path d={linePath} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3.5}
            fill={i === points.length - 1 ? colors.accent : colors.surfaceElevated}
            stroke={colors.accent}
            strokeWidth={1.5}
          />
        ))}
      </Svg>

      <View style={styles.trendDatesRow}>
        <Text style={styles.trendDateText}>
          {new Date(first.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
        <Text style={styles.trendDateText}>
          {new Date(latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [trainingLog, setTrainingLog] = useState<LogRow[]>([]);
  const [loadSessions, setLoadSessions] = useState<LoadSession[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const loadProgressData = useCallback(async () => {
    try {
      await repository.init();
      const now = new Date();
      const since120Days = new Date(now.getTime() - 120 * 86400000).toISOString();
      const since35Days = new Date(now.getTime() - 35 * 86400000).toISOString();

      const [log, sessions] = await Promise.all([
        repository.getTrainingLog(since120Days),
        repository.getLoadSessions(since35Days),
      ]);

      setTrainingLog(log);
      setLoadSessions(sessions);

      // Best 1RMs
      const bests = best1RMs(log);
      const topIds = Object.entries(bests)
        .sort((a, b) => b[1].e1rm - a[1].e1rm)
        .slice(0, 5)
        .map(([id]) => id);

      if (topIds.length > 0) {
        const names = await repository.getExerciseNames(topIds);
        setExerciseNames(names);
        setSelectedLiftId((prev) => (prev && topIds.includes(prev) ? prev : topIds[0]));
      } else {
        setSelectedLiftId(null);
      }
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData])
  );

  const nowIso = new Date().toISOString();

  // 1. Top Lifts (best1RMs)
  const bestMap: Record<string, Best> = best1RMs(trainingLog);
  const topLifts = Object.entries(bestMap)
    .sort((a, b) => b[1].e1rm - a[1].e1rm)
    .slice(0, 5);

  // 2. Weekly Volume (8 weeks)
  const volume8Weeks = weeklyVolume(trainingLog, 8, nowIso);
  const maxWeeklyVol = Math.max(...volume8Weeks, 1);
  const total8WeekVolume = volume8Weeks.reduce((acc, v) => acc + v, 0);

  // 3. Muscle Balance (last 7 days)
  const muscleMap = muscleSetsLast7(trainingLog, nowIso);
  const sortedMuscles = Object.entries(muscleMap).sort((a, b) => b[1] - a[1]);
  const maxMuscleSets = Math.max(...sortedMuscles.map((m) => m[1]), 1);

  // 4. Load Status (weeklyLoads 5 weeks)
  const loads5Weeks = weeklyLoads(loadSessions, 5, nowIso);
  const acwrStatus: LoadStatus | null = loadStatus(loads5Weeks);

  // Trend data for selected lift
  const trendData = selectedLiftId ? e1rmTrend(trainingLog, selectedLiftId) : [];
  const selectedLiftName = selectedLiftId ? exerciseNames[selectedLiftId] || 'Exercise' : '';

  const getBandBadge = (band: LoadStatus['band']) => {
    switch (band) {
      case 'optimal':
        return { text: 'OPTIMAL ZONE', color: colors.success, bg: colors.successDim };
      case 'low':
        return { text: 'LOW LOAD', color: colors.text.secondary, bg: 'rgba(255, 255, 255, 0.08)' };
      case 'high':
        return { text: 'HIGH LOAD', color: '#FACC15', bg: 'rgba(250, 204, 21, 0.15)' };
      case 'spike':
        return { text: 'LOAD SPIKE', color: colors.danger, bg: 'rgba(255, 69, 58, 0.15)' };
    }
  };

  const getBandDesc = (band: LoadStatus['band']) => {
    switch (band) {
      case 'optimal':
        return 'Your training stress is balanced. Low injury risk with consistent adaptation corridor (0.8 - 1.3).';
      case 'low':
        return 'Training load is below your chronic baseline (< 0.8). Risk of detraining or ready to ramp up volume.';
      case 'high':
        return 'Training load is elevated (1.3 - 1.5). Monitor fatigue, sleep, and recovery closely.';
      case 'spike':
        return 'Acute load spike (> 1.5). Significantly elevated risk of overtraining or injury.';
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.screenTitle}>Progress</Text>
            <Text style={styles.screenSubtitle}>
              Strength curves, volume & workload
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

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            {/* Section 1: Top Lifts & 1RM Trend */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Top Lifts (Estimated 1RM)</Text>
                {topLifts.length > 0 && (
                  <Text style={styles.sectionSubtitleHint}>Tap lift for trend</Text>
                )}
              </View>

              {topLifts.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Strength Data Yet</Text>
                  <Text style={styles.emptyDesc}>
                    Complete a workout with completed working sets (≤12 reps) to see your top estimated 1RM bests and progression curves.
                  </Text>
                </Card>
              ) : (
                <Card elevated style={styles.liftCard}>
                  {topLifts.map(([id, best], idx) => {
                    const isSelected = selectedLiftId === id;
                    const name = exerciseNames[id] || 'Exercise';
                    return (
                      <TouchableOpacity
                        key={id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedLiftId((prev) => (prev === id ? null : id))}
                        style={[
                          styles.liftItemContainer,
                          idx > 0 && styles.divider,
                          isSelected && styles.liftItemSelected,
                        ]}
                      >
                        <View style={styles.liftRow}>
                          <View style={styles.liftInfoCol}>
                            <Text style={[styles.liftName, isSelected && styles.liftNameActive]}>
                              {name}
                            </Text>
                            <Text style={styles.liftFormula}>
                              Recorded {new Date(best.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                          <View style={styles.liftScore}>
                            <Text style={styles.liftWeight}>{formatWeight(best.e1rm, settings.unit, true)}</Text>
                            <Text style={styles.liftMetaText}>
                              {isSelected ? '▲ Active' : '▼ View Trend'}
                            </Text>
                          </View>
                        </View>

                        {/* Expandable Trend Line Chart */}
                        {isSelected && (
                          <View style={styles.chartWrapper}>
                            <TrendLineChart data={trendData} exerciseName={name} unit={settings.unit} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </Card>
              )}
            </View>

            {/* Section 2: Weekly Volume Bar Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Weekly Volume (8-Week)</Text>
                {total8WeekVolume > 0 && (
                  <Text style={styles.volumeTotalLabel}>
                    {formatWeight(total8WeekVolume, settings.unit, true)}
                  </Text>
                )}
              </View>

              {total8WeekVolume === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Volume Data</Text>
                  <Text style={styles.emptyDesc}>
                    No completed lifting volume recorded in the last 8 weeks.
                  </Text>
                </Card>
              ) : (
                <Card elevated style={styles.volumeCard}>
                  <View style={styles.barChartContainer}>
                    {volume8Weeks.map((vol, i) => {
                      const isCurrent = i === 7;
                      const heightPercent = Math.max(6, Math.round((vol / maxWeeklyVol) * 100));
                      const label = i === 7 ? 'Now' : `${8 - i}w`;

                      return (
                        <View key={i} style={styles.barColumn}>
                          <Text style={styles.barValueText} numberOfLines={1}>
                            {vol > 0 ? formatWeight(vol, settings.unit) : '−'}
                          </Text>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: `${heightPercent}%`,
                                  backgroundColor: isCurrent ? colors.accent : 'rgba(0, 229, 255, 0.35)',
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.barLabelText, isCurrent && styles.barLabelCurrent]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              )}
            </View>

            {/* Section 3: Muscle Balance (Last 7 Days) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Muscle Balance (7 Days)</Text>
                <Text style={styles.sectionSubtitleHint}>Primary 1 / Sec 0.5</Text>
              </View>

              {sortedMuscles.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Muscle Volume Logged</Text>
                  <Text style={styles.emptyDesc}>
                    No working sets completed in the last 7 days.
                  </Text>
                </Card>
              ) : (
                <Card elevated style={styles.muscleCard}>
                  <View style={styles.bodyMapContainer}>
                    <BodyMap
                      muscleLoads={muscleMap}
                      viewMode="both"
                      height={205}
                      showLegend
                      selectedMuscle={selectedMuscle}
                      onSelectMuscle={(slug) => {
                        setSelectedMuscle((prev) => (prev === slug ? null : slug));
                      }}
                    />
                  </View>
                  <View style={styles.bodyMapDivider} />
                  {sortedMuscles.map(([muscle, sets], idx) => {
                    const formattedName = muscle.charAt(0).toUpperCase() + muscle.slice(1);
                    const isSelected = selectedMuscle === muscle.toLowerCase();

                    return (
                      <TouchableOpacity
                        key={muscle}
                        activeOpacity={0.7}
                        onPress={() =>
                          setSelectedMuscle((prev) => (prev === muscle.toLowerCase() ? null : muscle.toLowerCase()))
                        }
                        style={[
                          styles.muscleRow,
                          idx > 0 && styles.muscleRowSpacer,
                          isSelected && styles.muscleRowSelected,
                        ]}
                      >
                        <View style={styles.muscleHeaderRow}>
                          <Text style={[styles.muscleName, isSelected && styles.muscleNameSelected]}>
                            {formattedName}
                          </Text>
                          <Text style={styles.muscleSetsText}>
                            <CountUpText value={sets} /> {sets === 1 ? 'set' : 'sets'}
                          </Text>
                        </View>
                        <AnimatedBar
                          progress={sets / maxMuscleSets}
                          index={idx}
                          height={8}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </Card>
              )}
            </View>

            {/* Section 4: Load */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>This week vs previous 4-week average</Text>
              <Card elevated style={styles.loadCard}>
                <View style={styles.loadHeader}>
                  <Text style={styles.loadLabel}>ACUTE : CHRONIC LOAD</Text>
                  {acwrStatus ? (
                    (() => {
                      const badge = getBandBadge(acwrStatus.band);
                      return (
                        <View style={[styles.loadPill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.loadPillText, { color: badge.color }]}>
                            {badge.text}
                          </Text>
                        </View>
                      );
                    })()
                  ) : (
                    <View style={styles.loadPillNeutral}>
                      <Text style={styles.loadPillTextNeutral}>BUILDING BASE</Text>
                    </View>
                  )}
                </View>

                {acwrStatus ? (
                  <>
                    <Text style={styles.loadValue}>{acwrStatus.ratio.toFixed(2)}</Text>
                    <Text style={styles.loadDesc}>{getBandDesc(acwrStatus.band)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.loadValueNeutral}>Need 3+ weeks of data</Text>
                    <Text style={styles.loadDesc}>
                      Log lifting workouts and runs consistently across at least 3 of the previous 4 weeks to establish your acute-to-chronic training load corridor.
                    </Text>
                  </>
                )}
              </Card>
            </View>
          </>
        )}
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
  centerLoading: {
    padding: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionSubtitleHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  volumeTotalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
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
    lineHeight: typography.lineHeight.sm,
  },
  liftCard: {
    padding: spacing.base,
  },
  liftItemContainer: {
    paddingVertical: spacing.xs,
  },
  liftItemSelected: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
  liftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  liftInfoCol: {
    flex: 1,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  liftName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  liftNameActive: {
    color: colors.accent,
  },
  liftFormula: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  liftScore: {
    alignItems: 'flex-end',
  },
  liftWeight: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  liftMetaText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  chartWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trendChartBox: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  trendExerciseTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  trendLatestVal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.black,
    color: colors.accent,
  },
  trendDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: 4,
  },
  trendDateText: {
    fontSize: 10,
    color: colors.text.muted,
  },
  trendEmptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  trendEmptyText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  singlePointBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  singlePointValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.black,
    color: colors.accent,
  },
  singlePointDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: 4,
  },
  volumeCard: {
    padding: spacing.base,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: spacing.base,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 9,
    color: colors.text.muted,
    marginBottom: 4,
    textAlign: 'center',
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xs,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.xs,
  },
  barLabelText: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  barLabelCurrent: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  muscleCard: {
    padding: spacing.base,
  },
  bodyMapContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  bodyMapDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  muscleRow: {
    width: '100%',
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  muscleRowSpacer: {
    marginTop: spacing.md,
  },
  muscleRowSelected: {
    backgroundColor: 'rgba(0, 229, 255, 0.10)',
    paddingHorizontal: spacing.xs,
  },
  muscleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  muscleName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  muscleNameSelected: {
    color: colors.accent,
  },
  muscleSetsText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  muscleBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
  },
  loadCard: {
    padding: spacing.lg,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  loadLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  loadPill: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
  loadPillText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  loadPillNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
  loadPillTextNeutral: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  loadValue: {
    fontSize: 38,
    fontWeight: typography.fontWeight.black,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  loadValueNeutral: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  loadDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.sm,
  },
});
