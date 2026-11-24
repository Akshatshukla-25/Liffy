import React from 'react';
import {
  StyleProp,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { ChunkyButton } from '../motion/ChunkyButton';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading = false,
  style,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  return (
    <ChunkyButton
      title={title}
      variant={variant}
      size={size}
      fullWidth={fullWidth !== undefined ? fullWidth : size !== 'sm'}
      loading={loading}
      disabled={disabled || loading}
      onPress={() => onPress?.({} as any)}
      style={style as StyleProp<ViewStyle>}
    />
  );
}
