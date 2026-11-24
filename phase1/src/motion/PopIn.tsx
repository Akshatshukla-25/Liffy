import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { spring, duration } from './tokens';

interface PopInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}

export function PopIn({ children, style, delay = 0 }: PopInProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (reducedMotion) {
        opacity.value = withTiming(1, { duration: duration.quick });
      } else {
        opacity.value = withTiming(1, { duration: duration.quick });
        scale.value = withSpring(1, spring.bouncy);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
