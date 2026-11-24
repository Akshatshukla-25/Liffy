# Antigravity task: Phase 3, real Progress tab + routines

Read CLAUDE.md. Do NOT edit src/lib/*, tests/*, repositoryV3.ts. src/db/schema.ts was updated (migration 2 adds templates):
replace the file; existing installs upgrade via PRAGMA user_version, so verify migration 2 runs on a DB already at version 1.

1. Implement `RepositoryV3` (src/db/repositoryV3.ts) in sqliteRepository.ts. All queries filter owner_id, deleted_at IS NULL, and finished workouts only (ended_at IS NOT NULL).
2. Progress tab: remove ALL mock data. Use repo.getTrainingLog(since 120 days) and repo.getLoadSessions(since 35 days), with `best1RMs`, `e1rmTrend`, `weeklyVolume`, `muscleSetsLast7`, `weeklyLoads(…, 5, now)`, `loadStatus` from src/lib/progress.ts. Sections:
   - Top lifts: top 5 exercises by e1RM best; tap one for a line chart of e1rmTrend (install victory-native, or Skia directly).
   - Weekly volume: 8-week bar chart.
   - Muscle balance: hard sets per muscle, last 7 days (horizontal bars).
   - Load: show ratio + band (low/optimal/high/spike). Label it "This week vs previous 4-week average". If loadStatus is null show "Need 3+ weeks of data".
   - Proper empty states when there is no data. Never show fake numbers.
3. Templates: Workout tab replaces mock cards with repo.listTemplates(). Screen app/template/[id].tsx to create/edit (name, exercises via the existing picker, sets, rep range, increment kg), and a long-press menu to delete.
   Also "Save as routine" on the finish summary (builds a Template from the finished session: sets = count of done sets, rep range 8-12 default).
4. Start from template: gather lastSets with repo.getLastSets per exercise, call sessionFromTemplate(template, now, lastSets, randomUUID), save with repo.saveSession, route to the logger.
5. Header cleanup: remove the gear button from tabs where it does nothing (or route it to a minimal Settings screen with units kg/lb and max HR, stored in MMKV. Optional).
6. Verify: npm test (expect 30 passing), tsc, then use the app: finish 2 workouts, check Progress shows them, create a routine, start it twice and confirm the second start shows progression targets.
   Send 3 screenshots: Progress, routine editor, workout started from a routine.
