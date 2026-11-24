import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useReducedMotion,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { duration } from './tokens';
import { Tier, confettiCount, confettiPieces, Piece } from '../lib/celebrate';

export interface ConfettiProps {
  tier: Tier;
  seed?: number;
  onComplete?: () => void;
}

const PALETTE = [
  '#00E5FF', // Electric Cyan (theme primary accent)
  '#FFFFFF', // Pure White
  '#10B981', // Emerald Green
  '#38BDF8', // Sky Blue
  '#F59E0B', // Amber Gold
  '#EC4899', // Electric Pink
];

interface ParticleItemProps {
  piece: Piece;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
}

/**
 * High-performance particle piece animated 100% on the native UI thread.
 * Zero JS re-renders during motion.
 */
function ParticlePiece({ piece, progress, originX, originY }: ParticleItemProps) {
  const gravity = 1100; // px/s^2
  const durationSec = duration.celebrate / 1000;
  const delaySec = piece.delayMs / 1000;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const currentProgress = progress.value;
    const elapsedSec = currentProgress * durationSec;
    if (elapsedSec < delaySec) {
      return { opacity: 0 };
    }

    const t = elapsedSec - delaySec;
    const x = originX + piece.vx * t * 0.55;
    const y = originY + piece.vy * t + 0.5 * gravity * t * t;
    const rot = piece.rot + piece.rotSpeed * t;

    // Smooth fade out in the final 28% of celebration duration
    const fadeStart = 0.72;
    const opacity = currentProgress > fadeStart
      ? 1 - (currentProgress - fadeStart) / (1 - fadeStart)
      : 1;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rot}deg` },
      ],
      opacity: Math.max(0, opacity),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: piece.size,
          height: piece.size * 0.65,
          backgroundColor: PALETTE[piece.colorIndex % PALETTE.length],
          borderRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function Confetti({
  tier,
  seed = 42,
  onComplete,
}: ConfettiProps) {
  const reducedMotion = useReducedMotion();

  // Ensure standard 'done' tier still gets celebration particles (32 pieces), clamped to 48 budget cap
  const baseCount = confettiCount(tier);
  const count = Math.min(baseCount > 0 ? baseCount : tier === 'done' ? 32 : 0, 48);

  const progress = useSharedValue(0);
  const dimensions = Dimensions.get('window');

  // Pre-generate deterministic particle coordinates once
  const rawPieces = useMemo(() => {
    if (count === 0 || reducedMotion) return [];
    return confettiPieces(count, seed, PALETTE.length);
  }, [count, seed, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || count === 0) {
      onComplete?.();
      return;
    }

    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: duration.celebrate,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      }
    );
  }, [count, seed, reducedMotion, onComplete]);

  if (reducedMotion || count === 0) return null;

  const originX = dimensions.width * 0.5;
  const originY = dimensions.height * 0.38;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rawPieces.map((p, idx) => (
        <ParticlePiece
          key={idx}
          piece={p}
          progress={progress}
          originX={originX}
          originY={originY}
        />
      ))}
    </View>
  );
}
