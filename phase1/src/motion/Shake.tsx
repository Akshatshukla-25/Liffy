import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { triggerHaptic } from './haptics';

export interface ShakeRef {
  shake: () => void;
}

interface ShakeProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Shake = forwardRef<ShakeRef, ShakeProps>(({ children, style }, ref) => {
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    shake: () => {
      triggerHaptic('error');
      if (reducedMotion) return;
      translateX.value = withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 40 }),
        withTiming(-6, { duration: 40 }),
        withTiming(6, { duration: 40 }),
        withTiming(-3, { duration: 40 }),
        withTiming(3, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );
    },
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
});
