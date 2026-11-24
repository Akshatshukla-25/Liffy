import { createClient } from '@supabase/supabase-js';

class SafeStorage {
  private mmkv: any = null;
  private memory = new Map<string, string>();

  constructor() {
    try {
      // Dynamic require so non-native (web/vitest) environments don't throw
      const { MMKV } = require('react-native-mmkv');
      this.mmkv = new MMKV({ id: 'liffy-supabase-auth' });
    } catch {
      this.mmkv = null;
    }
  }

  getItem(key: string): string | null {
    if (this.mmkv) {
      try {
        return this.mmkv.getString(key) ?? null;
      } catch {
        // Fall back to in-memory
      }
    }
    return this.memory.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.mmkv) {
      try {
        this.mmkv.set(key, value);
        return;
      } catch {
        // Fall back to in-memory
      }
    }
    this.memory.set(key, value);
  }

  removeItem(key: string): void {
    if (this.mmkv) {
      try {
        this.mmkv.delete(key);
        return;
      } catch {
        // Fall back to in-memory
      }
    }
    this.memory.delete(key);
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new SafeStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
