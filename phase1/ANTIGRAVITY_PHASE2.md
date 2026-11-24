# Antigravity task: Phase 2, workout logger (offline only)

Read CLAUDE.md first. Do NOT edit src/lib/*, tests/*, src/db/schema.ts or src/db/repository.ts (interfaces). Ask if one needs to change.
Offline only: no Supabase calls for data in this phase. Guest mode is the default, and owner_id = 'local'.

1. Implement `Repository` in src/db/sqliteRepository.ts with expo-sqlite, following schema.ts and the doc comments in repository.ts.
   Run migrations in init() using PRAGMA user_version. Store muscle arrays as JSON text.
2. Exercise catalogue: write scripts/import-exercises.mjs that downloads
   https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
   and writes assets/exercises.json (id, name, category, equipment, primaryMuscles, secondaryMuscles only; map to our categories).
   Seed the exercises table from it on first init (generate UUIDs once, or use the source id as the id). Record the source and license in NOTICE.md.
   Do not bundle images yet.
3. Workout screen: "Start Session" creates newSession() (ids via expo-crypto randomUUID) and routes to app/workout/[id].tsx.
4. Logger screen: state via useReducer(sessionReducer). Rows per set: weight, reps, done check (haptic on tick). "Add set" and
   "Add exercise" (bottom sheet with search -> repo.searchExercises). Show previous sets via repo.getLastSets. Live timer and
   sessionVolume in the header. Persist with repo.saveSession on every change (debounce 300 ms). On app launch, if
   repo.getActiveSession() returns one, offer to resume or discard.
5. Finish: dispatch FINISH, save, then show a summary. Compute PRs with detectPRs(await repo.getExerciseHistory(id), set) BEFORE saving.
6. History tab: replace mock data with repo.listWorkouts (FlashList, paginated); tap opens a read-only detail.
7. Remove the mock data from the History and Progress tabs, or leave them clearly marked as mock until Phase 3.
8. Verify: `npm test`, `npx tsc --noEmit`, then a real workout on the device (kill the app mid-workout and confirm resume).
   Send screenshots of the logger, the add-exercise sheet, and the finish summary.
