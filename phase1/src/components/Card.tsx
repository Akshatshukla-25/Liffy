import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors, radii, spacing, glass } from '../theme';

export type CardVariant = 'standard' | 'elevated' | 'floating' | 'inset' | 'accent';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  elevated?: boolean; // Backward compatibility alias for variant="elevated"
  children: React.ReactNode;
}

export function Card({
  style,
  variant,
  elevated = false,
  children,
  ...props
}: CardProps) {
  // Resolve variant with backward-compatible alias
  const resolvedVariant: CardVariant = variant ?? (elevated ? 'elevated' : 'standard');

  return (
    <View
      style={[
        styles.card,
        styles[resolvedVariant],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
  },
  // L1: Base standard card
  standard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight || 'rgba(255, 255, 255, 0.08)',
  },
  // L2: Elevated card
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight || 'rgba(255, 255, 255, 0.12)',
  },
  // L3: Floating / Overlay card
  floating: {
    backgroundColor: glass.surfaceFloating || 'rgba(20, 22, 30, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radii.xl,
  },
  // L0: Inset micro-tile
  inset: {
    backgroundColor: glass.surfaceInset || 'rgba(255, 255, 255, 0.03)',
    borderColor: glass.borderSubtle || 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  // Accent card (Active session / Met streaks / PRs)
  accent: {
    backgroundColor: colors.accentSubtle || 'rgba(0, 229, 255, 0.05)',
    borderColor: colors.accentBorder || 'rgba(0, 229, 255, 0.32)',
  },
});
