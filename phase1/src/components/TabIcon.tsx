import React, { useEffect } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Dumbbell, Clock, TrendingUp, Footprints } from 'lucide-react-native';
import { spring } from '../motion/tokens';

interface TabIconProps {
  name: 'workout' | 'history' | 'progress' | 'run';
  focused: boolean;
  color?: ColorValue | null;
}

export function TabIcon({ name, focused, color }: TabIconProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(focused ? 1.15 : 1);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(focused ? 1.15 : 1, spring.bouncy);
    }
  }, [focused, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconProps = {
    color,
    size: 24,
    strokeWidth: focused ? 2.4 : 2.0,
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {name === 'workout' && <Dumbbell {...iconProps} />}
      {name === 'history' && <Clock {...iconProps} />}
      {name === 'progress' && <TrendingUp {...iconProps} />}
      {name === 'run' && <Footprints {...iconProps} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
