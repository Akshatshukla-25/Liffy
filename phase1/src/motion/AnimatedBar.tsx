import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  useReducedMotion,
} from 'react-native-reanimated';
import { spring } from './tokens';
import { staggerDelay } from '../lib/celebrate';
import { colors, radii } from '../theme';

interface AnimatedBarProps {
  progress: number; // 0 to 1
  index?: number;
  height?: number;
  barColor?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedBar({
  progress,
  index = 0,
  height = 8,
  barColor = colors.accent,
  trackColor = colors.surfaceHighlight,
  style,
}: AnimatedBarProps) {
  const reducedMotion = useReducedMotion();
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const scaleX = useSharedValue(reducedMotion ? clampedProgress : 0);

  useEffect(() => {
    const delayMs = staggerDelay(index);
    if (reducedMotion) {
      scaleX.value = clampedProgress;
    } else {
      scaleX.value = withDelay(delayMs, withSpring(clampedProgress, spring.gentle));
    }
  }, [clampedProgress, index, reducedMotion]);

  const animatedFill = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: barColor,
            height,
          },
          animatedFill,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: radii.full,
    // Scale from the left
    transformOrigin: 'left center',
  },
});
