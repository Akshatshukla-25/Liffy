import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Zap } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '../theme';
import { Card } from './Card';
import { ChunkyButton, PopIn, Confetti, triggerHaptic } from '../motion';
import { useSettings } from '../context/settings';

export interface RunSummaryData {
  distanceKm: number;
  durationSeconds: number;
  avgHr: number | null;
  rpe: number | null;
  paceMinKm: number; // e.g. 5.1 (5:06 min/km)
  isLongest?: boolean;
}

interface RunAccomplishmentModalProps {
  visible: boolean;
  data: RunSummaryData | null;
  onDone: () => void;
}

export function RunAccomplishmentModal({
  visible,
  data,
  onDone,
}: RunAccomplishmentModalProps) {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const isImperial = settings.unit === 'lb'; // Imperial running uses miles

  useEffect(() => {
    if (visible && data) {
      triggerHaptic('workoutFinished');
      setTimeout(() => triggerHaptic('pr'), 350);
    }
  }, [visible, data]);

  if (!data) return null;

  const displayDistance = isImperial
    ? (data.distanceKm * 0.621371).toFixed(2)
    : data.distanceKm.toFixed(2);
  const distanceUnit = isImperial ? 'mi' : 'km';

  // Format pace mm:ss
  const paceSec = isImperial ? data.paceMinKm * 60 * 1.60934 : data.paceMinKm * 60;
  const pMin = Math.floor(paceSec / 60);
  const pSec = Math.floor(paceSec % 60);
  const paceStr = `${pMin}:${pSec < 10 ? '0' : ''}${pSec} /${distanceUnit}`;

  // Format total duration hh:mm:ss or mm:ss
  const totalMin = Math.floor(data.durationSeconds / 60);
  const remSec = data.durationSeconds % 60;
  const durationStr = `${totalMin}:${remSec < 10 ? '0' : ''}${remSec}`;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        {/* Full celebration burst for the runner */}
        <Confetti tier="pr" seed={Date.now()} />

        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Top Pill Badge */}
            <View style={styles.badge}>
              <Zap size={13} color={colors.accent} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>
                {data.isLongest ? 'NEW LONGEST DISTANCE' : 'RUN LOGGED'}
              </Text>
            </View>

            {/* Runner Celebration Icon */}
            <PopIn style={styles.iconWrapper}>
              <View style={styles.iconCircle}>
                <Flame size={40} color={colors.accent} />
              </View>
            </PopIn>

            <Text style={styles.title}>
              {data.isLongest ? 'Distance Record!' : 'Miles in the Bank!'}
            </Text>
            <Text style={styles.subtitle}>
              Pace, distance, and cardio load saved locally to offline database.
            </Text>

            {/* 4-Metric Grid */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>DISTANCE</Text>
                <View style={styles.countRow}>
                  <Text style={styles.statValue}>{displayDistance}</Text>
                  <Text style={styles.statUnit}> {distanceUnit}</Text>
                </View>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>AVG PACE</Text>
                <Text style={styles.statValue}>{paceStr}</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>DURATION</Text>
                <Text style={styles.statValue}>{durationStr}</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>AVG HEART RATE</Text>
                <Text style={styles.statValue}>
                  {data.avgHr ? `${data.avgHr} bpm` : '−'}
                </Text>
              </Card>
            </View>

            {/* CTA Button */}
            <View style={styles.buttonContainer}>
              <ChunkyButton
                title="Return to Run Hub"
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
  iconWrapper: {
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.xl,
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
  buttonContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  doneBtn: {
    width: '100%',
  },
});
