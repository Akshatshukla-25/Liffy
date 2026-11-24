# Antigravity task: Phase 4, daily-use essentials

Read CLAUDE.md. Do NOT edit src/lib/*, tests/*, or any repositoryV*.ts interface files. Offline only.
First, if not yet done, apply the 4 small Phase 3 fixes (set_type != 'warmup' in getTrainingLog; Save-as-Routine rep range from reps actually done; "Sign in" for guests; load label "This week vs previous 4-week average").

0. CHECK FIRST: are built-in exercise ids STABLE across installs (source id from free-exercise-db), not random UUIDs generated at seed time?
   If random, change seeding to use the source id (migration for existing dev data is fine to skip; just wipe your dev DB). Backups depend on this.
1. Settings: store in MMKV as JSON, load with sanitizeSettings. Context/hook `useSettings`. Screen app/settings.tsx opened from the gear button (remove the gear from screens where it was dead):
   unit kg/lb; max HR (number input + "Estimate from age" using estimateMaxHr); rest timer on/off + optional override seconds;
   Export backup; Import backup; Licenses (show NOTICE.md text); Delete all data (double confirm).
2. Units: storage stays kg. Show weights everywhere with formatWeight(kg, unit) and parse every weight input with parseWeightInput (logger, routine editor increment, history, detail, progress, summary). Label with the unit.
3. RPE: in the logger, an optional RPE per set (tap a small RPE chip -> picker 6, 6.5 ... 10) dispatching UPDATE_SET {rpe}. Make sure sets.rpe is persisted.
4. Rest timer: when a set is ticked done (and enabled), show a bottom bar: countdown from startRest(Date.now(), override ?? suggestRest(reps, rpe)). Buttons -15 / +15 (adjustRest) / Skip. Compute display from remainingSeconds(endsAt, Date.now()) on a 250 ms interval, never by decrementing. Haptic when it hits 0.
   Optional: schedule a local notification at endsAt with expo-notifications (ask permission on first use, cancel on skip). Skip if it complicates things.
5. Backup: implement RepositoryV4 in sqliteRepository.ts.
   Export: exportAllTables -> buildBackup(tables, new Date().toISOString()) -> write liffy-backup-YYYY-MM-DD.json with expo-file-system -> share with expo-sharing.
   Import: expo-document-picker -> parse JSON in try/catch -> validateBackup (show its error text) -> planImport(await repo.exportAllTables(), data) -> confirm dialog with counts -> repo.importRows(upserts). Single transaction, rollback on failure.
6. Verify: npm test (expect 42 passing), tsc. On device: switch to lb and confirm logged weights display and re-enter correctly; do a workout with RPE and rest timer (background the app mid-rest, return: the time is still right);
   export, then Settings > Delete all data, then import and confirm History and routines are back.
   Send 3 screenshots: Settings, logger with RPE + rest bar, import confirmation dialog.
