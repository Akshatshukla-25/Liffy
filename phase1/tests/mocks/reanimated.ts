// Reanimated mock for testing UI components in node/vitest

export let mockReducedMotionState = false;
export function setMockReducedMotion(v: boolean) {
  mockReducedMotionState = v;
}

export function useSharedValue<T>(initialValue: T) {
  return { value: initialValue };
}

export function useAnimatedStyle(updater: () => any) {
  return updater();
}

export function withSpring(toValue: any, config?: any) {
  return toValue;
}

export function withTiming(toValue: any, config?: any, callback?: (finished?: boolean) => void) {
  if (callback) callback(true);
  return toValue;
}

export function withDelay(delayMs: number, animation: any) {
  return animation;
}

export function withSequence(...animations: any[]) {
  return animations[animations.length - 1];
}

export function withRepeat(animation: any, count?: number, reverse?: boolean) {
  return animation;
}

export function useReducedMotion(): boolean {
  return mockReducedMotionState;
}

export function runOnJS<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export const Easing = {
  bezier: () => ({}),
  out: (fn: any) => fn,
  ease: {},
};

export const FadeInDown = {
  duration: () => FadeInDown,
  springify: () => FadeInDown,
};

export const FadeOutDown = {
  duration: () => FadeOutDown,
};

const Animated = {
  View: 'Animated.View',
};

export default Animated;
