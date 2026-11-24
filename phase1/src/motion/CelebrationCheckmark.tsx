import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { triggerHaptic } from './haptics';
import { colors, radii } from '../theme';

export interface CelebrationCheckmarkProps {
  done: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
  size?: number;
  hitSlop?: number;
}

const overshootSpring = {
  damping: 8,
  stiffness: 280,
  mass: 0.7,
};

/**
 * Tactile, celebratory 3D checkmark button for active workout logging.
 * Replaces unicode '✓' with a Lucide Check icon, featuring a high-contrast
 * volt background and punchy spring overshoot physics on check.
 */
export function CelebrationCheckmark({
  done,
  onToggle,
  style,
  size = 38,
  hitSlop = 8,
}: CelebrationCheckmarkProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(done ? 1 : 0);
  const ringScale = useSharedValue(done ? 1 : 0.8);
  const ringOpacity = useSharedValue(0);
  const pressY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = done ? 1 : 0;
      return;
    }

    if (done) {
      // Punchy pop-in with spring overshoot (scales to ~1.2x before settling)
      scale.value = 0;
      scale.value = withSpring(1, overshootSpring);

      // Micro ripple pulse
      ringOpacity.value = 0.5;
      ringScale.value = 1;
      ringScale.value = withSpring(1.3, { damping: 15, stiffness: 180 });
      ringOpacity.value = withSpring(0, { damping: 18, stiffness: 150 });
    } else {
      scale.value = withSpring(0, { damping: 15, stiffness: 300 });
      ringOpacity.value = 0;
    }
  }, [done, reducedMotion]);

  const animatedCheck = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedRing = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const animatedCap = useAnimatedStyle(() => ({
    transform: [{ translateY: pressY.value }],
  }));

  const handlePressIn = () => {
    if (!reducedMotion) {
      pressY.value = withSpring(2, { damping: 18, stiffness: 320 });
    }
    triggerHaptic('setDone');
  };

  const handlePressOut = () => {
    if (!reducedMotion) {
      pressY.value = withSpring(0, { damping: 18, stiffness: 320 });
    }
  };

  const depth = 3;

  return (
    <View style={[styles.wrapper, { width: size, height: size + depth }, style]}>
      {/* Subtle volt pulse ring on check */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          { width: size, height: size, borderRadius: radii.md },
          animatedRing,
        ]}
      />

      {/* 3D bottom bevel */}
      <View
        style={[
          styles.bottomBevel,
          {
            width: size,
            height: depth,
            borderRadius: radii.md,
            backgroundColor: done ? '#0099B8' : '#0A0B10',
          },
        ]}
      />

      <Pressable
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={hitSlop}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.button,
            { width: size, height: size, borderRadius: radii.md, marginBottom: depth },
            done ? styles.buttonActive : styles.buttonInactive,
            !reducedMotion && animatedCap,
          ]}
        >
          {done ? (
            <Animated.View style={[styles.iconContainer, animatedCheck]}>
              <Check
                size={Math.round(size * 0.55)}
                strokeWidth={3.2}
                color={colors.text.inverse || '#050507'}
              />
            </Animated.View>
          ) : (
            <Check
              size={Math.round(size * 0.5)}
              strokeWidth={2.4}
              color={colors.text.muted || '#6E768E'}
            />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  bottomBevel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInactive: {
    backgroundColor: colors.surfaceElevated || '#171922',
    borderWidth: 1.5,
    borderColor: colors.borderLight || 'rgba(255, 255, 255, 0.12)',
  },
  buttonActive: {
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
