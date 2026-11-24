import React, { useEffect, useState, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { duration } from './tokens';
import { countUp } from '../lib/celebrate';

interface CountUpTextProps {
  value: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  durationMs?: number;
}

export function CountUpText({
  value,
  from = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
  durationMs = duration.count,
}: CountUpTextProps) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : from);
  const prevValueRef = useRef(from);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const targetVal = value;
    const startTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      const current = countUp(startVal, targetVal, t);
      setDisplayValue(current);

      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = targetVal;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs, reducedMotion]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toString();

  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}
