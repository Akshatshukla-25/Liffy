export const epley = (w: number, r: number) => w * (1 + r / 30);
export const brzycki = (w: number, r: number) => (w * 36) / (37 - r);

/**
 * Estimated 1RM (average of Epley and Brzycki).
 * Returns null above 12 reps (too unreliable) or for invalid input.
 */
export function estimate1RM(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps < 1 || reps > 12 || !Number.isFinite(weightKg + reps)) return null;
  if (reps === 1) return weightKg;
  return (epley(weightKg, reps) + brzycki(weightKg, reps)) / 2;
}

export const roundTo = (n: number, step = 0.5) => Math.round(n / step) * step;
