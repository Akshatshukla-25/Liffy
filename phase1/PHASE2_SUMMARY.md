# Phase 2: Offline-First Workout Logger & SQLite Engine

All Phase 2 requirements specified in [`ANTIGRAVITY_PHASE2.md`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/ANTIGRAVITY_PHASE2.md) and [`CLAUDE.md`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/CLAUDE.md) have been implemented, tested, and verified.

---

## 1. Deliverables Summary

1. **SQLite Repository ([`src/db/sqliteRepository.ts`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/src/db/sqliteRepository.ts))**:
   - Implements `Repository` contract using modern `expo-sqlite` (`openDatabaseAsync('liffy.db')`).
   - Runs migrations via `PRAGMA user_version`.
   - Stores muscle arrays as JSON strings.
   - Filters every query by `owner_id` (defaulting to `'local'` for Guest Mode) and `deleted_at IS NULL` (soft deletes).
   - Seeds 876 exercises on initial launch from bundled `assets/exercises.json`.
   - Implements `claimLocalData(userId)` to re-own guest rows upon user authentication.

2. **Exercise Catalogue Downloader ([`scripts/import-exercises.mjs`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/scripts/import-exercises.mjs)) & Attribution ([`NOTICE.md`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/NOTICE.md))**:
   - Downloads public domain exercise catalogue from `yuhonas/free-exercise-db`.
   - Maps category and equipment into `'strength' | 'bodyweight' | 'cardio' | 'mobility'`.
   - Strips image assets to minimize bundle footprint.
   - Records dataset attribution and Unlicense public domain notice in `NOTICE.md`.

3. **Workout Logger Screen ([`app/workout/[id].tsx`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/app/workout/[id].tsx))**:
   - Manages state strictly via `useReducer(sessionReducer, initialSession)` from `src/lib/session.ts`.
   - Live header showing elapsed duration (`mm:ss` / `hh:mm:ss`), volume in kg (`sessionVolume`), and Finish button.
   - Exercise cards with set rows: set index, previous performance badge (`repo.getLastSets`), weight kg input, reps input, and done checkmark with `expo-haptics`.
   - "+ Add Set" automatically prefills weights and reps from the previous set.
   - Debounced auto-save (300ms) to SQLite on every session state mutation for crash safety.

4. **Add Exercise Bottom Sheet ([`src/components/ExercisePickerSheet.tsx`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/src/components/ExercisePickerSheet.tsx))**:
   - Real-time search query filtering 876 exercises via `repo.searchExercises`.
   - Filter chips: `ALL`, `STRENGTH`, `BODYWEIGHT`, `CARDIO`, `MOBILITY`.
   - Displays category, equipment, and primary muscles for each exercise.

5. **Finish Workflow & PR Engine ([`src/components/WorkoutSummaryModal.tsx`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/src/components/WorkoutSummaryModal.tsx))**:
   - Runs `detectPRs(await repo.getExerciseHistory(exerciseId), candidateSet)` before saving finished state.
   - Dispatches `{ type: 'FINISH', at: now }` and saves to SQLite.
   - Presents summary modal with duration, volume, exercises, sets completed, and PR badges.

6. **History Tab Real Data ([`app/(tabs)/history.tsx`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/app/(tabs)/history.tsx))**:
   - Replaced mock activity with `@shopify/flash-list` rendering `repo.listWorkouts`.
   - Pull-to-refresh and dynamic volume/session calculations.
   - Tapping an item opens [`app/workout/detail/[id].tsx`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/app/workout/detail/[id].tsx) read-only detail view.

7. **Crash Safety & Resume Banner ([`app/(tabs)/index.tsx`](file:///Users/akshatshukla/Development/Open-Source/Liffy/phase1/app/(tabs)/index.tsx))**:
   - On app launch, `repo.getActiveSession()` detects any unfinished workouts.
   - Displays a prominent `WORKOUT IN PROGRESS` card on the home screen with "Resume Workout" and "Discard" actions.

---

## 2. Test & Type Check Verification

- **Vitest**: `npm test` passes **22 / 22** tests.
- **TypeScript**: `npx tsc --noEmit` exits with **0 errors**.

---

## 3. UI Screenshots

### 1. Exercise Picker Bottom Sheet
![Add Exercise Sheet](/Users/akshatshukla/.gemini/antigravity/brain/2c0c2dc0-0d7a-4264-aa21-f3fdfc0fcf85/add_exercise_sheet.png)

### 2. Live Workout Logger
![Live Workout Logger](/Users/akshatshukla/.gemini/antigravity/brain/2c0c2dc0-0d7a-4264-aa21-f3fdfc0fcf85/logger_screen.png)

### 3. Workout Complete Summary (with PR Detection)
![Workout Summary Modal](/Users/akshatshukla/.gemini/antigravity/brain/2c0c2dc0-0d7a-4264-aa21-f3fdfc0fcf85/finish_summary.png)

### 4. Active Workout Resume Card (Crash Safety)
![Active Workout Resume Card](/Users/akshatshukla/.gemini/antigravity/brain/2c0c2dc0-0d7a-4264-aa21-f3fdfc0fcf85/resume_banner.png)

### 5. Resumed Workout Logger
![Resumed Logger](/Users/akshatshukla/.gemini/antigravity/brain/2c0c2dc0-0d7a-4264-aa21-f3fdfc0fcf85/resumed_logger.png)

### 6. History Tab (Real SQLite Feed)
![History Tab](/Users/akshatshukla/.gemini/antigravity/brain/2c0c2dc0-0d7a-4264-aa21-f3fdfc0fcf85/history_recorded.png)
