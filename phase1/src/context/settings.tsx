import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  type Settings,
  defaultSettings,
  sanitizeSettings,
} from '../lib/settings';

class SafeSettingsStorage {
  private mmkv: any = null;
  private memory = new Map<string, string>();

  constructor() {
    try {
      const { MMKV } = require('react-native-mmkv');
      this.mmkv = new MMKV({ id: 'liffy-settings' });
    } catch {
      this.mmkv = null;
    }
  }

  getString(key: string): string | null {
    if (this.mmkv) {
      try {
        return this.mmkv.getString(key) ?? null;
      } catch {}
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {}
    }
    return this.memory.get(key) ?? null;
  }

  set(key: string, value: string): void {
    if (this.mmkv) {
      try {
        this.mmkv.set(key, value);
        return;
      } catch {}
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    this.memory.set(key, value);
  }
}

const storage = new SafeSettingsStorage();
const SETTINGS_KEY = 'liffy_settings';
const WEEKLY_GOAL_KEY = 'liffy_weekly_goal';

interface SettingsContextType {
  settings: Settings;
  weeklyGoal: number;
  updateSettings: (patch: Partial<Settings>) => void;
  updateWeeklyGoal: (goal: number) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  weeklyGoal: 3,
  updateSettings: () => {},
  updateWeeklyGoal: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
    try {
      const raw = storage.getString(WEEKLY_GOAL_KEY);
      if (raw) {
        const val = parseInt(raw, 10);
        if (Number.isFinite(val) && val >= 1 && val <= 7) return val;
      }
    } catch {}
    return 3;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = storage.getString(SETTINGS_KEY);
      if (raw) {
        return sanitizeSettings(JSON.parse(raw));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    return defaultSettings;
  });

  const updateWeeklyGoal = (goal: number) => {
    const clamped = Math.max(1, Math.min(7, Math.round(goal)));
    setWeeklyGoal(clamped);
    try {
      storage.set(WEEKLY_GOAL_KEY, clamped.toString());
    } catch {}
  };

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = sanitizeSettings({ ...prev, ...patch });
      try {
        storage.set(SETTINGS_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
      return next;
    });
  };

  const value = useMemo(
    () => ({ settings, weeklyGoal, updateSettings, updateWeeklyGoal }),
    [settings, weeklyGoal]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
