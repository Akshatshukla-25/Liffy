/** Session RPE load: minutes x RPE (works for lifting and running alike). */
export const sessionLoad = (durationMin: number, rpe: number): number => durationMin * rpe;

/**
 * Hybrid balance signal: this week's load vs. average of the previous weeks.
 * ~0.8-1.3 is a typical "sweet spot"; > 1.5 suggests a spike. Returns null with no baseline.
 */
export function loadRatio(weeklyLoads: number[]): number | null {
  if (weeklyLoads.length < 2) return null;
  const current = weeklyLoads[weeklyLoads.length - 1];
  const prev = weeklyLoads.slice(-5, -1);
  const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
  return avg > 0 ? current / avg : null;
}
