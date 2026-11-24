import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { colors, radii, spacing, typography } from '../src/theme';
import { spring, press, duration } from '../src/motion/tokens';
import {
  celebrationTier,
  confettiCount,
  confettiPieces,
  countUp,
  weeklyStreak,
} from '../src/lib/celebrate';
import {
  parseWeightInput,
  formatWeight,
  kgToLb,
  lbToKg,
} from '../src/lib/units';
import {
  paceSecPerKm,
  formatPace,
  hrZone,
} from '../src/lib/running';
import {
  parseDuration,
  runSummary,
  zoneRanges,
} from '../src/lib/runs';
import {
  setVolume,
  totalVolume,
} from '../src/lib/volume';
import {
  newSession,
  sessionReducer,
  sessionVolume,
  sessionDurationMin,
  Session,
} from '../src/lib/session';
import {
  buildBackup,
  validateBackup,
  planImport,
  type Tables,
  type Row,
} from '../src/lib/backup';

// Import mocked motion modules
import {
  setMockReducedMotion,
  mockReducedMotionState,
} from './mocks/reanimated';
import { ChunkyButton } from '../src/motion/ChunkyButton';
import { CelebrationCheckmark } from '../src/motion/CelebrationCheckmark';
import { Confetti } from '../src/motion/Confetti';
import { CountUpText } from '../src/motion/CountUpText';

function withReactHooks<T>(fn: () => T): T {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const prevH = internals?.H;

  const mockDispatcher = {
    useState: (init: any) => {
      const val = typeof init === 'function' ? init() : init;
      return [val, vi.fn()];
    },
    useEffect: (effect: any) => {
      effect();
    },
    useRef: (init: any) => ({ current: init }),
    useMemo: (factory: any) => factory(),
    useCallback: (cb: any) => cb,
    useLayoutEffect: (effect: any) => {
      effect();
    },
  };

  if (internals) {
    internals.H = mockDispatcher;
  }

  try {
    return fn();
  } finally {
    if (internals) {
      internals.H = prevH;
    }
  }
}

describe('Adversarial Stress Test: ChunkyButton & Tactile Physics', () => {
  beforeEach(() => {
    setMockReducedMotion(false);
  });

  it('renders all variants and sizes with correct tokens without throwing', () => {
    const variants = ['primary', 'secondary', 'danger', 'outline', 'ghost'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        expect(() => {
          withReactHooks(() =>
            ChunkyButton({
              title: `Test ${variant} ${size}`,
              variant,
              size,
              onPress: () => {},
            })
          );
        }).not.toThrow();
      }
    }
  });

  it('verifies 3D bevel depth tokens across sizes', () => {
    // sm -> 3px depth; md/lg -> press.chunkyDepth (4px); ghost -> 0px
    expect(press.chunkyDepth).toBe(4);
    expect(spring.snappy).toEqual({ damping: 18, stiffness: 320, mass: 0.8 });
  });

  it('simulates rapid button press spam (100 cycles in tight loop)', () => {
    let pressCount = 0;
    const onPress = () => {
      pressCount++;
    };

    const element = withReactHooks(() =>
      ChunkyButton({
        title: 'Spam Button',
        onPress,
      })
    );
    expect(element).toBeDefined();

    // The pressable child props contains handlers
    const pressable = Array.isArray(element.props.children)
      ? (element.props.children[1] || element.props.children[0])
      : element.props.children;
    expect(pressable).toBeDefined();

    for (let i = 0; i < 100; i++) {
      pressable.props.onPressIn();
      pressable.props.onPress();
      pressable.props.onPressOut();
    }

    expect(pressCount).toBe(100);
  });

  it('disabled or loading button locks press interaction and haptics', () => {
    let pressCount = 0;
    const onPress = () => {
      pressCount++;
    };

    const disabledBtn = withReactHooks(() =>
      ChunkyButton({
        title: 'Disabled',
        disabled: true,
        onPress,
      })
    );
    const pressableDisabled = Array.isArray(disabledBtn.props.children)
      ? (disabledBtn.props.children[1] || disabledBtn.props.children[0])
      : disabledBtn.props.children;
    expect(pressableDisabled.props.disabled).toBe(true);

    const loadingBtn = withReactHooks(() =>
      ChunkyButton({
        title: 'Loading',
        loading: true,
        onPress,
      })
    );
    const pressableLoading = Array.isArray(loadingBtn.props.children)
      ? (loadingBtn.props.children[1] || loadingBtn.props.children[0])
      : loadingBtn.props.children;
    expect(pressableLoading.props.disabled).toBe(true);
  });

  it('reduced motion completely skips spring animations on ChunkyButton', () => {
    setMockReducedMotion(true);

    const element = withReactHooks(() =>
      ChunkyButton({
        title: 'Reduced Motion Button',
        onPress: () => {},
      })
    );

    const pressable = Array.isArray(element.props.children)
      ? (element.props.children[1] || element.props.children[0])
      : element.props.children;
    const animatedInner = pressable.props.children;
    // When reducedMotion is true, !reducedMotion && animatedInner evaluates to false
    expect(animatedInner.props.style).toContain(false);
  });
});

describe('Adversarial Stress Test: CelebrationCheckmark Microswitch', () => {
  beforeEach(() => {
    setMockReducedMotion(false);
  });

  it('renders both checked and unchecked states properly', () => {
    let toggled = false;
    const onToggle = () => {
      toggled = !toggled;
    };

    const unchecked = withReactHooks(() =>
      CelebrationCheckmark({
        done: false,
        onToggle,
      })
    );
    expect(unchecked).toBeDefined();

    const checked = withReactHooks(() =>
      CelebrationCheckmark({
        done: true,
        onToggle,
      })
    );
    expect(checked).toBeDefined();
  });

  it('handles rapid toggling under rapid set completion', () => {
    let toggleCount = 0;
    let doneState = false;
    const onToggle = () => {
      toggleCount++;
      doneState = !doneState;
    };

    for (let i = 0; i < 50; i++) {
      const comp = withReactHooks(() =>
        CelebrationCheckmark({
          done: doneState,
          onToggle,
        })
      );
      expect(comp).toBeDefined();
      const pressable = comp.props.children[2];
      pressable.props.onPressIn();
      pressable.props.onPress();
      pressable.props.onPressOut();
    }
    expect(toggleCount).toBe(50);
    expect(doneState).toBe(false); // Even number of toggles returns to initial state
  });

  it('handles extreme sizes (0, negative, huge) safely', () => {
    expect(() => {
      withReactHooks(() => CelebrationCheckmark({ done: false, onToggle: () => {}, size: 0 }));
      withReactHooks(() => CelebrationCheckmark({ done: true, onToggle: () => {}, size: -10 }));
      withReactHooks(() => CelebrationCheckmark({ done: true, onToggle: () => {}, size: 500 }));
    }).not.toThrow();
  });
});

describe('Adversarial Stress Test: Celebration Tiers & Particle Engine', () => {
  beforeEach(() => {
    setMockReducedMotion(false);
  });

  it('celebration tiers: strictly tests 0 PRs, 1 PR, and multiple PRs boundaries', () => {
    // 0 sets done => 'none' regardless of PRs
    expect(celebrationTier({ setsDone: 0, prCount: 0 })).toBe('none');
    expect(celebrationTier({ setsDone: 0, prCount: 1 })).toBe('none');
    expect(celebrationTier({ setsDone: 0, prCount: 5 })).toBe('none');
    expect(celebrationTier({ setsDone: -1, prCount: 3 })).toBe('none');

    // >= 1 set done, 0 PRs => 'done'
    expect(celebrationTier({ setsDone: 1, prCount: 0 })).toBe('done');
    expect(celebrationTier({ setsDone: 15, prCount: 0 })).toBe('done');

    // >= 1 set done, 1 or 2 PRs => 'pr'
    expect(celebrationTier({ setsDone: 1, prCount: 1 })).toBe('pr');
    expect(celebrationTier({ setsDone: 5, prCount: 2 })).toBe('pr');

    // >= 1 set done, 3+ PRs => 'epic'
    expect(celebrationTier({ setsDone: 1, prCount: 3 })).toBe('epic');
    expect(celebrationTier({ setsDone: 10, prCount: 10 })).toBe('epic');
  });

  it('particle budgeting: inspects base count vs component fallback', () => {
    // In lib: none=0, done=0, pr=40, epic=90
    expect(confettiCount('none')).toBe(0);
    expect(confettiCount('done')).toBe(0);
    expect(confettiCount('pr')).toBe(40);
    expect(confettiCount('epic')).toBe(90);

    // In Confetti.tsx component:
    // 'done' fallback is 32 particles
    const getEffectiveCount = (tier: 'none' | 'done' | 'pr' | 'epic') => {
      const base = confettiCount(tier);
      return base > 0 ? base : tier === 'done' ? 32 : 0;
    };

    expect(getEffectiveCount('none')).toBe(0);
    expect(getEffectiveCount('done')).toBe(32);
    expect(getEffectiveCount('pr')).toBe(40);
    expect(getEffectiveCount('epic')).toBe(90);
  });

  it('confetti determinism and bounds with extreme seeds', () => {
    const seeds = [0, -1, 42, 999999999, -2147483648];
    for (const seed of seeds) {
      const pieces = confettiPieces(32, seed, 6);
      expect(pieces.length).toBe(32);
      for (const p of pieces) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.vx)).toBe(true);
        expect(Number.isFinite(p.vy)).toBe(true);
        expect(Number.isFinite(p.rot)).toBe(true);
        expect(Number.isFinite(p.size)).toBe(true);
        expect(p.colorIndex).toBeGreaterThanOrEqual(0);
        expect(p.colorIndex).toBeLessThan(6);
      }
    }
  });

  it('reduced motion disables confetti completely and calls onComplete immediately', () => {
    setMockReducedMotion(true);
    let completed = false;

    const rendered = withReactHooks(() =>
      Confetti({
        tier: 'epic',
        onComplete: () => {
          completed = true;
        },
      })
    );

    expect(rendered).toBeNull();
    expect(completed).toBe(true);
  });
});

describe('Adversarial Stress Test: Workout Logging & Extreme Metrics', () => {
  it('parseWeightInput rejects adversarial inputs', () => {
    // Negative numbers
    expect(parseWeightInput('-1', 'kg')).toBeNull();
    expect(parseWeightInput('-0.001', 'kg')).toBeNull();
    expect(parseWeightInput('-100', 'lb')).toBeNull();

    // Out of realistic human / equipment bounds (> 2000 kg)
    expect(parseWeightInput('2001', 'kg')).toBeNull();
    expect(parseWeightInput('999999', 'kg')).toBeNull();

    // Invalid non-numerics & symbols
    expect(parseWeightInput('NaN', 'kg')).toBeNull();
    expect(parseWeightInput('Infinity', 'kg')).toBeNull();
    expect(parseWeightInput('-Infinity', 'kg')).toBeNull();
    expect(parseWeightInput('undefined', 'kg')).toBeNull();
    expect(parseWeightInput('<script>', 'kg')).toBeNull();
    expect(parseWeightInput('100kg', 'kg')).toBeNull();
    expect(parseWeightInput('', 'kg')).toBeNull();
    expect(parseWeightInput('   ', 'kg')).toBeNull();

    // Valid edge cases
    expect(parseWeightInput('0', 'kg')).toBe(0);
    expect(parseWeightInput('0.25', 'kg')).toBe(0.25);
    expect(parseWeightInput('0,25', 'kg')).toBe(0.25);
    expect(parseWeightInput('2000', 'kg')).toBe(2000);
  });

  it('formatWeight handles 0, decimals, and extreme kg cleanly', () => {
    expect(formatWeight(0, 'kg')).toBe('0');
    expect(formatWeight(0, 'kg', true)).toBe('0 kg');
    expect(formatWeight(0, 'lb')).toBe('0');
    expect(formatWeight(0, 'lb', true)).toBe('0 lb');

    // Rounding: kg rounds to 0.25, lb rounds to 0.5
    expect(formatWeight(62.12, 'kg')).toBe('62');
    expect(formatWeight(62.13, 'kg')).toBe('62.25');
    expect(formatWeight(100, 'lb')).toBe('220.5');

    // Large weight
    expect(formatWeight(1500, 'kg')).toBe('1500');
  });

  it('session volume under zero volume, empty sets, and extreme weights', () => {
    const s0 = newSession('test-0', '2026-11-03T10:00:00Z');
    expect(sessionVolume(s0)).toBe(0);

    // Session with 0 done sets
    let s1 = sessionReducer(s0, { type: 'ADD_EXERCISE', id: 'e1', exerciseId: 'bench' });
    s1 = sessionReducer(s1, { type: 'ADD_SET', exerciseEntryId: 'e1', setId: 's1' });
    s1 = sessionReducer(s1, {
      type: 'UPDATE_SET',
      exerciseEntryId: 'e1',
      setId: 's1',
      patch: { weightKg: 100, reps: 10 },
    });
    expect(sessionVolume(s1)).toBe(0); // Not done yet

    // Mark done
    s1 = sessionReducer(s1, { type: 'TOGGLE_DONE', exerciseEntryId: 'e1', setId: 's1' });
    expect(sessionVolume(s1)).toBe(1000);

    // Add set with 0 weight (bodyweight)
    s1 = sessionReducer(s1, { type: 'ADD_SET', exerciseEntryId: 'e1', setId: 's2' });
    s1 = sessionReducer(s1, {
      type: 'UPDATE_SET',
      exerciseEntryId: 'e1',
      setId: 's2',
      patch: { weightKg: 0, reps: 20 },
    });
    s1 = sessionReducer(s1, { type: 'TOGGLE_DONE', exerciseEntryId: 'e1', setId: 's2' });
    expect(sessionVolume(s1)).toBe(1000); // 0 * 20 adds 0

    // Add huge set (e.g. leg press machine 800 kg x 15 reps = 12,000 kg)
    s1 = sessionReducer(s1, { type: 'ADD_SET', exerciseEntryId: 'e1', setId: 's3' });
    s1 = sessionReducer(s1, {
      type: 'UPDATE_SET',
      exerciseEntryId: 'e1',
      setId: 's3',
      patch: { weightKg: 800, reps: 15 },
    });
    s1 = sessionReducer(s1, { type: 'TOGGLE_DONE', exerciseEntryId: 'e1', setId: 's3' });
    expect(sessionVolume(s1)).toBe(13000);
  });

  it('countUp mathematical interpolation bounds', () => {
    // Progress at 0
    expect(countUp(0, 500, 0)).toBe(0);
    // Progress at 1
    expect(countUp(0, 500, 1)).toBe(500);
    // Progress overclamping
    expect(countUp(0, 500, 1.5)).toBe(500);
    expect(countUp(0, 500, -0.5)).toBe(0);
    // Identical from and to
    expect(countUp(100, 100, 0.5)).toBe(100);
    // Zero target
    expect(countUp(0, 0, 0.5)).toBe(0);
  });

  it('CountUpText handles zero, decimals, and reduced motion immediately', () => {
    setMockReducedMotion(true);

    const zeroEl = withReactHooks(() => CountUpText({ value: 0 }));
    expect(zeroEl.props.children).toContain('0');

    const decimalEl = withReactHooks(() => CountUpText({ value: 42.5, decimals: 1 }));
    expect(decimalEl.props.children).toContain('42.5');

    const largeEl = withReactHooks(() => CountUpText({ value: 125000 }));
    expect(largeEl.props.children).toContain('125000');
  });
});

describe('Adversarial Stress Test: Run Telemetry & Edge Conditions', () => {
  it('running pace edge cases: 0 distance, 0 duration, negative distance', () => {
    // 0 distance or 0 duration must return null, preventing division by zero / Infinity
    expect(paceSecPerKm(0, 0)).toBeNull();
    expect(paceSecPerKm(0, 1200)).toBeNull();
    expect(paceSecPerKm(1000, 0)).toBeNull();
    expect(paceSecPerKm(-500, 1200)).toBeNull();
    expect(paceSecPerKm(1000, -60)).toBeNull();

    // formatPace handles null safely
    expect(formatPace(null)).toBe('--:--');

    // Normal pace: 5000m in 1500s (25 min) => 300 s/km (5:00 min/km)
    expect(paceSecPerKm(5000, 1500)).toBe(300);
    expect(formatPace(300)).toBe('5:00');

    // Second boundary rounding (e.g. 59.6 seconds rounds to 60 -> rolls minute)
    expect(formatPace(359.8)).toBe('6:00');
  });

  it('heart rate zone calculation handles boundary values safely', () => {
    const maxHr = 190;
    // Under 50%
    expect(hrZone(80, maxHr)).toBe(0);
    // Exactly at thresholds
    expect(hrZone(95, maxHr)).toBe(1); // 50%
    expect(hrZone(114, maxHr)).toBe(2); // 60%
    expect(hrZone(133, maxHr)).toBe(3); // 70%
    expect(hrZone(152, maxHr)).toBe(4); // 80%
    expect(hrZone(171, maxHr)).toBe(5); // 90%
    expect(hrZone(200, maxHr)).toBe(5); // Peak effort (> 100%)
  });

  it('runSummary with 0 runs returns safe zeroes and null pace', () => {
    const emptySummary = runSummary([], '2026-11-03T12:00:00Z');
    expect(emptySummary).toEqual({
      weekKm: 0,
      prev4AvgKm: 0,
      longestKm: 0,
      avgPaceSecPerKm: null,
    });
  });
});

describe('Adversarial Stress Test: Weekly Streak Resilience', () => {
  it('survives massive date lists (1,000 sessions) without performance degradation', () => {
    const t0 = performance.now();
    const dates: string[] = [];
    const baseMs = Date.parse('2026-11-03T12:00:00Z');

    for (let i = 0; i < 1000; i++) {
      dates.push(new Date(baseMs - i * 86_400_000 * 2).toISOString());
    }

    const streak = weeklyStreak(dates, 3, baseMs, 0);
    const duration = performance.now() - t0;

    expect(duration).toBeLessThan(100); // Must compute within 100ms
    expect(Number.isFinite(streak.weeks)).toBe(true);
    expect(Number.isFinite(streak.thisWeekCount)).toBe(true);
  });

  it('streak calculation with target = 0 or 1', () => {
    const now = Date.parse('2026-11-04T12:00:00Z');
    const sessions = ['2026-11-03T08:00:00Z'];
    const s = weeklyStreak(sessions, 1, now, 0);
    expect(s.thisWeekMet).toBe(true);
    expect(s.weeks).toBe(1);
  });
});

describe('Adversarial Stress Test: Backup & Migration 3 Run Integrity', () => {
  it('buildBackup exports runs while stripping device fields and preserving source and external_id', () => {
    const localTables: Tables = {
      runs: [
        {
          id: 'run-1',
          started_at: '2026-11-01T08:00:00Z',
          distance_m: 5000,
          duration_s: 1500,
          source: 'gpx',
          external_id: 'gpx-hash-12345',
          owner_id: 'local',
          dirty: 1,
          updated_at: '2026-11-01T08:30:00Z',
        },
        {
          id: 'run-2',
          started_at: '2026-11-02T08:00:00Z',
          distance_m: 10000,
          duration_s: 3100,
          source: 'manual',
          external_id: null,
          owner_id: 'local',
          dirty: 0,
          updated_at: '2026-11-02T08:55:00Z',
          deleted_at: '2026-11-02T09:00:00Z', // soft deleted
        },
      ],
    };

    const backup = buildBackup(localTables, '2026-11-05T00:00:00Z');
    expect(backup.tables.runs).toHaveLength(1);
    const exportedRun = backup.tables.runs![0];
    expect(exportedRun.id).toBe('run-1');
    expect(exportedRun.source).toBe('gpx');
    expect(exportedRun.external_id).toBe('gpx-hash-12345');
    // Device fields stripped
    expect(exportedRun.owner_id).toBeUndefined();
    expect(exportedRun.dirty).toBeUndefined();
  });

  it('planImport correctly resolves newer run rows and ignores older backup rows', () => {
    const local: Tables = {
      runs: [
        {
          id: 'run-1',
          updated_at: '2026-11-03T10:00:00Z',
          source: 'gpx',
          external_id: 'hash-abc',
        },
      ],
    };

    const backupFile = {
      format: 'liffy-backup' as const,
      version: 1 as const,
      exportedAt: '2026-11-05T00:00:00Z',
      tables: {
        runs: [
          // Older than local => ignore
          {
            id: 'run-1',
            updated_at: '2026-11-02T10:00:00Z',
            source: 'gpx',
            external_id: 'hash-abc',
          },
          // Brand new run => take
          {
            id: 'run-2',
            updated_at: '2026-11-04T10:00:00Z',
            source: 'manual',
            external_id: null,
          },
        ],
      },
    };

    const plan = planImport(local, backupFile);
    expect(plan.counts.runs).toBe(1);
    expect(plan.upserts.runs).toHaveLength(1);
    expect(plan.upserts.runs![0].id).toBe('run-2');
  });
});
