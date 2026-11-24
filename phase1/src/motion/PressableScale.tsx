import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { spring, press, HapticEvent } from './tokens';
import { triggerHaptic } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  haptic?: HapticEvent;
  children: React.ReactNode;
}

export function PressableScale({
  style,
  haptic = 'tap',
  onPressIn,
  onPressOut,
  onPress,
  children,
  disabled,
  ...props
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    if (!disabled && !reducedMotion) {
      scale.value = withSpring(press.scale, spring.snappy);
    }
    if (!disabled && haptic) {
      triggerHaptic(haptic);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disabled && !reducedMotion) {
      scale.value = withSpring(1, spring.snappy);
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      style={[style, !reducedMotion && animatedStyle]}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
