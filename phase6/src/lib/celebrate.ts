export type Tier = 'none' | 'done' | 'pr' | 'epic';

/** How big the finish-screen celebration is. 'epic' = 3+ PRs. */
export function celebrationTier(p: { setsDone: number; prCount: number }): Tier {
  if (p.setsDone <= 0) return 'none';
  if (p.prCount >= 3) return 'epic';
  if (p.prCount >= 1) return 'pr';
  return 'done';
}

export const confettiCount = (t: Tier): number => ({ none: 0, done: 0, pr: 40, epic: 90 }[t]);

export const staggerDelay = (index: number, stepMs = 45, maxMs = 360, maxItems = 12): number =>
  index >= maxItems ? 0 : Math.min(index * stepMs, maxMs);

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Value of a count-up animation at progress t (0..1). */
export const countUp = (from: number, to: number, t: number): number => lerp(from, to, easeOutCubic(t));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface Piece { x: number; vx: number; vy: number; rot: number; rotSpeed: number; size: number; colorIndex: number; delayMs: number; }

/** Deterministic confetti: same seed => same burst (testable, and no JS-thread randomness during animation). x is 0..1 of width. */
export function confettiPieces(count: number, seed: number, colors: number): Piece[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: 0.5 + (rnd() - 0.5) * 0.3,
    vx: (rnd() - 0.5) * 900,
    vy: -(500 + rnd() * 700),
    rot: rnd() * 360,
    rotSpeed: (rnd() - 0.5) * 720,
    size: 6 + rnd() * 8,
    colorIndex: Math.floor(rnd() * colors),
    delayMs: Math.floor(rnd() * 120),
  }));
}

/* ---------- weekly streak ---------- */
const DAY = 86_400_000;
/** Monday-based week index in the user's local time (tzOffsetMin = minutes east of UTC, e.g. India = 330). */
export const weekIndex = (ms: number, tzOffsetMin: number): number => Math.floor((ms + tzOffsetMin * 60_000 + 3 * DAY) / (7 * DAY));

export interface Streak { weeks: number; thisWeekCount: number; thisWeekMet: boolean; }

/**
 * Consecutive weeks with >= `target` sessions. The current week counts once it is met, but an unmet
 * current week does NOT break the streak (you still have days left). Sessions = lifting + runs start times.
 */
export function weeklyStreak(startedAtIso: string[], target: number, nowMs: number, tzOffsetMin: number): Streak {
  const counts = new Map<number, number>();
  for (const s of startedAtIso) { const w = weekIndex(Date.parse(s), tzOffsetMin); counts.set(w, (counts.get(w) ?? 0) + 1); }
  const cur = weekIndex(nowMs, tzOffsetMin);
  const thisWeekCount = counts.get(cur) ?? 0;
  const thisWeekMet = thisWeekCount >= target;
  let weeks = thisWeekMet ? 1 : 0;
  for (let w = cur - 1; (counts.get(w) ?? 0) >= target; w--) weeks++;
  return { weeks, thisWeekCount, thisWeekMet };
}
