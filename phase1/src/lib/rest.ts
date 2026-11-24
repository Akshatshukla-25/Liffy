/** Suggested rest after a set: heavier/lower-rep = longer. Very hard sets (RPE >= 9) add 30 s. */
export function suggestRest(reps: number, rpe?: number | null): number {
  const base = reps <= 5 ? 180 : reps <= 12 ? 120 : 90;
  return base + (rpe != null && rpe >= 9 ? 30 : 0);
}

/** Timers must use an absolute end time (survives backgrounding), never a decrementing counter. */
export const startRest = (nowMs: number, seconds: number): number => nowMs + seconds * 1000;
export const adjustRest = (endsAtMs: number, deltaSec: number, nowMs: number): number =>
  Math.max(nowMs, endsAtMs + deltaSec * 1000);
export const remainingSeconds = (endsAtMs: number, nowMs: number): number =>
  Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
export const formatClock = (sec: number): string => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
