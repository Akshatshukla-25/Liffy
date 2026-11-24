# Antigravity task: Phase 1 scaffold

Context: read CLAUDE.md first. src/lib, tests/ and supabase/migrations/0001_init.sql already exist and are final. Do not modify them.

Tasks:
1. Create the Expo project (TypeScript, Expo Router) in this repo, keeping the existing files. Use `npx expo install` for all Expo-related packages so versions match the SDK.
2. Install: react-native-reanimated, react-native-gesture-handler, @shopify/react-native-skia, @shopify/flash-list, @gorhom/bottom-sheet, expo-sqlite, expo-haptics, expo-crypto, @supabase/supabase-js, @tanstack/react-query, react-native-mmkv, zod.
3. Create src/theme/ with dark design tokens (background, surface, border, text, accent, success, danger; spacing and radius scales; one font scale). Premium dark look.
4. Set up Expo Router with 4 tabs: Workout, History, Progress, Run (placeholder screens using theme tokens).
5. Create src/db/supabase.ts (client from env vars) and email auth screens (sign in / sign up) with a session guard.
6. Add a vitest config so `npm test` runs tests/ (already passing). Add a path alias `@/lib`.
7. Verify: app boots on simulator/emulator, tabs navigate, `npm test` passes. Report screenshots and anything you changed outside this list.

Do NOT build the workout logger yet (Phase 2).
