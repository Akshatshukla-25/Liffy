# CLAUDE.md — Agent Operating Guide

> Offline-first hybrid athlete tracker (lifting + running). React Native (Expo, TypeScript), Supabase backend, premium dark UI.
> Hard constraints: pure logic only in `src/lib/` (no React, no network, unit-tested), animations on the UI thread (Reanimated/Skia), every write works offline first, minimal dependencies, real assets only (record licenses in NOTICE.md).

## Layout
app/             Expo Router screens
src/components/  UI (theme tokens in src/theme/, never hardcode colors)
src/lib/         Pure domain logic. OWNED BY CLAUDE CHAT: do not edit; request changes instead
src/store/       State + offline write queue
src/db/          Supabase client + queries (migrations in supabase/migrations/)
tests/           Vitest tests for src/lib

## Commands
npm install
npx expo start
npm test          # must pass before any commit
npx expo lint

## Rules
1. Never compute training metrics (volume, 1RM, PRs, progression, pace) in components. Import from src/lib.
2. Client generates UUIDs (expo-crypto randomUUID). Writes go to local DB + sync queue first, Supabase second.
3. Delete = set deleted_at; never hard delete synced rows.
4. Sync conflicts: use mergeRecords / resolveConflict from src/lib/sync.ts.
5. No secrets in code; Supabase URL/anon key via EXPO_PUBLIC_* env vars.
6. Ask before adding a dependency.


## Motion rules
1. All motion constants come from src/motion/tokens.ts (spring, duration, press, stagger, hapticFor). No magic numbers in components.
2. Animate only transform and opacity, on the UI thread (Reanimated shared values / Skia). Never animate layout props (width/height/top) in lists.
3. Every interactive element gives feedback within one frame: scale + haptic (hapticFor).
4. Respect reduced motion (useReducedMotion): no bouncing/confetti/shake; use short fades.
5. Long lists: only the first 12 rows animate in (staggerDelay). Nothing animates on scroll.
6. Test on the real phone. If any screen drops frames, simplify the animation, not the device.
