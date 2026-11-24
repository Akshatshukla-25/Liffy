import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getExerciseSvg } from '../lib/exerciseSvg';
import { BodyMap } from './body/BodyMap';
import { colors, radii } from '../theme';

export interface ExerciseIllustrationProps {
  name: string;
  id?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  size?: number;
  color?: string;
  forceBodyMap?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BACK_MUSCLES = new Set([
  'lats',
  'traps',
  'glutes',
  'hamstrings',
  'lower back',
  'lower_back',
  'calves',
  'triceps',
  'upper back',
  'upper_back',
  'middle back',
]);

export function ExerciseIllustration({
  name,
  id,
  primaryMuscles = [],
  secondaryMuscles = [],
  size = 48,
  color = colors.text.primary,
  forceBodyMap = false,
  style,
}: ExerciseIllustrationProps) {
  const svgXml = !forceBodyMap ? getExerciseSvg(name, id) : null;
  const isBack = primaryMuscles.some((m) => BACK_MUSCLES.has(m.toLowerCase()));

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {svgXml ? (
        <View style={styles.svgWrapper}>
          <SvgXml
            xml={svgXml}
            width={size * 0.85}
            height={size * 0.85}
            color={color}
          />
        </View>
      ) : (
        <BodyMap
          highlightedMuscles={primaryMuscles}
          secondaryMuscles={secondaryMuscles}
          viewMode={isBack ? 'back' : 'front'}
          height={size * 0.9}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161924',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
