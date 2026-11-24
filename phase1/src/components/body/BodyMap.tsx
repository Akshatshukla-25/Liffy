import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { BODY_PATHS } from './bodyPaths';
import {
  INERT_PARTS,
  MUSCLE_LABELS,
  mapMusclesToSlugs,
} from './muscleMapping';
import { colors, radii, spacing, typography } from '../../theme';

export interface BodyMapProps {
  highlightedMuscles?: string[];
  secondaryMuscles?: string[];
  muscleLoads?: Record<string, number>;
  gender?: 'male' | 'female';
  viewMode?: 'both' | 'front' | 'back' | 'toggle';
  height?: number;
  onSelectMuscle?: (muscleSlug: string, label: string) => void;
  selectedMuscle?: string | null;
  showLegend?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BodyMap({
  highlightedMuscles = [],
  secondaryMuscles = [],
  muscleLoads,
  gender = 'male',
  viewMode = 'both',
  height = 200,
  onSelectMuscle,
  selectedMuscle,
  showLegend = false,
  style,
}: BodyMapProps) {
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');

  // Convert exercise muscle inputs into standard body map slugs
  const primarySlugs = useMemo(
    () => new Set(mapMusclesToSlugs(highlightedMuscles)),
    [highlightedMuscles]
  );
  const secondarySlugs = useMemo(
    () => new Set(mapMusclesToSlugs(secondaryMuscles)),
    [secondaryMuscles]
  );

  // Normalize muscle loads
  const normalizedLoads = useMemo(() => {
    if (!muscleLoads) return null;
    const mapped: Record<string, number> = {};
    for (const [key, val] of Object.entries(muscleLoads)) {
      const slugs = mapMusclesToSlugs([key]);
      for (const s of slugs) {
        mapped[s] = Math.max(mapped[s] || 0, val);
      }
    }
    const max = Math.max(...Object.values(mapped), 1);
    return { mapped, max };
  }, [muscleLoads]);

  const getMuscleColor = (slug: string) => {
    if (selectedMuscle && slug === selectedMuscle) {
      return { fill: '#FFFFFF', stroke: colors.accent, strokeWidth: 1.5 };
    }

    if (normalizedLoads) {
      const load = normalizedLoads.mapped[slug] || 0;
      if (load <= 0) {
        return { fill: '#242838', stroke: '#3E465E', strokeWidth: 0.85 };
      }
      const ratio = load / normalizedLoads.max;
      if (ratio > 0.75) {
        return { fill: colors.accent, stroke: '#FFFFFF', strokeWidth: 1.2 }; // Level 4
      }
      if (ratio > 0.5) {
        return { fill: 'rgba(0, 229, 255, 0.75)', stroke: colors.accent, strokeWidth: 0.9 }; // Level 3
      }
      if (ratio > 0.25) {
        return { fill: 'rgba(0, 229, 255, 0.50)', stroke: 'rgba(0, 229, 255, 0.85)', strokeWidth: 0.8 }; // Level 2
      }
      return { fill: 'rgba(0, 229, 255, 0.28)', stroke: 'rgba(0, 229, 255, 0.60)', strokeWidth: 0.7 }; // Level 1
    }

    if (primarySlugs.has(slug)) {
      return { fill: colors.accent, stroke: '#FFFFFF', strokeWidth: 1.2 };
    }
    if (secondarySlugs.has(slug)) {
      return { fill: '#818CF8', stroke: '#A5B4FC', strokeWidth: 1.0 };
    }

    return { fill: '#242838', stroke: '#3E465E', strokeWidth: 0.85 };
  };

  const currentGender = BODY_PATHS[gender] || BODY_PATHS.male;

  const renderPaths = (view: typeof currentGender.front) => {
    const inertElements = INERT_PARTS.flatMap((slug) =>
      (view.p[slug] || []).map((d, i) => (
        <Path
          key={`${slug}_${i}`}
          d={d}
          fill="#2B3042"
          stroke="#47506B"
          strokeWidth={0.85}
        />
      ))
    );

    const muscleElements = Object.entries(view.p)
      .filter(([slug]) => !INERT_PARTS.includes(slug))
      .flatMap(([slug, pathList]) => {
        const { fill, stroke, strokeWidth } = getMuscleColor(slug);
        return pathList.map((d, i) => (
          <Path
            key={`${slug}_${i}`}
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            onPress={
              onSelectMuscle
                ? () => onSelectMuscle(slug, MUSCLE_LABELS[slug] || slug)
                : undefined
            }
          />
        ));
      });

    return (
      <G>
        {inertElements}
        {muscleElements}
      </G>
    );
  };

  const isBoth = viewMode === 'both';
  const isToggle = viewMode === 'toggle';
  const effectiveView = isToggle ? activeTab : viewMode;

  const aspectBoth = 1445 / 1280;
  const aspectSingle = 727 / 1280;

  const svgWidth = isBoth ? height * aspectBoth : height * aspectSingle;

  return (
    <View style={[styles.container, style]}>
      {isToggle && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'front' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('front')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === 'front' && styles.toggleBtnTextActive,
              ]}
            >
              Anterior (Front)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeTab === 'back' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('back')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                activeTab === 'back' && styles.toggleBtnTextActive,
              ]}
            >
              Posterior (Back)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.svgWrapper}>
        {isBoth ? (
          <Svg
            width={svgWidth}
            height={height}
            viewBox="0 95 1445 1280"
          >
            {renderPaths(currentGender.front)}
            {renderPaths(currentGender.back)}
          </Svg>
        ) : (
          <Svg
            width={svgWidth}
            height={height}
            viewBox={
              effectiveView === 'front'
                ? currentGender.front.vb
                : currentGender.back.vb
            }
          >
            {renderPaths(
              effectiveView === 'front'
                ? currentGender.front
                : currentGender.back
            )}
          </Svg>
        )}
      </View>

      {showLegend && (
        <View style={styles.legendContainer}>
          {normalizedLoads ? (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.legendText}>High Volume</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(0, 229, 255, 0.50)' }]} />
                <Text style={styles.legendText}>Moderate</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#242838', borderColor: '#3E465E', borderWidth: 1 }]} />
                <Text style={styles.legendText}>Resting</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.legendText}>Primary</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#818CF8' }]} />
                <Text style={styles.legendText}>Secondary</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#141620', borderColor: '#222634', borderWidth: 1 }]} />
                <Text style={styles.legendText}>Untargeted</Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.accentDim,
  },
  toggleBtnText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  toggleBtnTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
});
