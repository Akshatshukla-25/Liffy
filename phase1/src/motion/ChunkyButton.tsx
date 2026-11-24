import React, { useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { spring, HapticEvent } from './tokens';
import { triggerHaptic } from './haptics';
import { colors, radii, spacing, typography } from '../theme';

export interface ChunkyButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  haptic?: HapticEvent;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function ChunkyButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  haptic = 'tap',
  style,
  textStyle,
  leftIcon,
  rightIcon,
  fullWidth,
}: ChunkyButtonProps) {
  const isFullWidth = fullWidth !== undefined ? fullWidth : size !== 'sm';
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (disabled || loading) {
      scale.value = withSpring(1, spring.snappy);
    }
  }, [disabled, loading]);

  const getPalette = () => {
    switch (variant) {
      case 'primary':
        return {
          face: colors.accent,
          text: colors.text.inverse || '#050507',
          border: 'transparent',
        };
      case 'danger':
        return {
          face: colors.danger,
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'outline':
        return {
          face: colors.surfaceElevated || '#171922',
          text: colors.accent,
          border: colors.accentBorder || 'rgba(0, 229, 255, 0.35)',
        };
      case 'ghost':
        return {
          face: 'transparent',
          text: colors.text.secondary,
          border: 'transparent',
        };
      case 'secondary':
      default:
        return {
          face: colors.surfaceElevated || '#171922',
          text: '#FFFFFF',
          border: colors.borderLight || 'rgba(255, 255, 255, 0.12)',
        };
    }
  };

  const palette = getPalette();

  const animatedInner = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    if (!reducedMotion) {
      scale.value = withSpring(0.97, spring.snappy);
    }
    if (haptic) triggerHaptic(haptic);
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    if (!reducedMotion) {
      scale.value = withSpring(1, spring.snappy);
    }
  };

  return (
    <View style={[styles.container, isFullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={isFullWidth ? styles.pressableFull : styles.pressable}
      >
        <Animated.View
          style={[
            styles.inner,
            styles[size],
            {
              backgroundColor: palette.face,
              borderColor: palette.border,
              borderWidth: palette.border !== 'transparent' ? 1 : 0,
            },
            disabled && styles.disabled,
            !reducedMotion && animatedInner,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={palette.text} />
          ) : (
            <View style={styles.contentRow}>
              {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}
              <Text
                style={[
                  styles.title,
                  styles[`text_${size}`],
                  { color: palette.text },
                  textStyle,
                ]}
              >
                {title}
              </Text>
              {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 4,
  },
  fullWidth: {
    width: '100%',
  },
  pressableFull: {
    width: '100%',
  },
  pressable: {},
  inner: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sm: {
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  md: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  lg: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
  },
  text_sm: {
    fontSize: typography.fontSize.sm,
  },
  text_md: {
    fontSize: typography.fontSize.base,
  },
  text_lg: {
    fontSize: typography.fontSize.md,
  },
  disabled: {
    opacity: 0.45,
  },
});
