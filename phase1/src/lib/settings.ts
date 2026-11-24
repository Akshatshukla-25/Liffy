import { Unit } from './units';

export interface Settings { unit: Unit; maxHr: number | null; restTimerEnabled: boolean; restOverrideSec: number | null; }
export const defaultSettings: Settings = { unit: 'kg', maxHr: null, restTimerEnabled: true, restOverrideSec: null };

/** Tanaka formula: 208 - 0.7 x age. A rough estimate; a field-tested max is better. */
export const estimateMaxHr = (age: number): number | null =>
  Number.isFinite(age) && age >= 10 && age <= 100 ? Math.round(208 - 0.7 * age) : null;

/** Load stored JSON safely: unknown/invalid fields fall back to defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null);
  return {
    unit: o.unit === 'lb' ? 'lb' : 'kg',
    maxHr: int(o.maxHr, 120, 230),
    restTimerEnabled: typeof o.restTimerEnabled === 'boolean' ? o.restTimerEnabled : true,
    restOverrideSec: int(o.restOverrideSec, 10, 600),
  };
}
