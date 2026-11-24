import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.text.muted}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    width: '100%',
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
