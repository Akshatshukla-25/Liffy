# Antigravity task: Phase 5 (FREE version), Run tab: manual runs + GPX import

Replaces the earlier Strava version of this phase. Everything here is free: no accounts, no servers, no API keys.
If any Strava code, worker or env var was already added, DELETE it (src/lib/strava.ts, strava-proxy/, tests/phase5 Strava tests, EXPO_PUBLIC_STRAVA_*).
Read CLAUDE.md. Do NOT edit src/lib/*, tests/*, repositoryV*.ts. Replace src/db/schema.ts and src/lib/backup.ts with the versions in this zip
(backup.ts goes back to the original: imported GPX runs are the user's own data, so they ARE backed up).

0. Leftovers from Phase 4 (do first): rest-timer local notification (expo-notifications; permission on first timer; schedule at endsAt; cancel on skip, reschedule on +/-15 s; silent in foreground);
   pin the exercise catalogue download to a specific commit hash of yuhonas/free-exercise-db; seeding inserts only missing ids.
1. Migration 3 (runs.source, runs.external_id + unique index) must run on a DB already at version 2. Verify.
2. Implement RepositoryV5 (src/db/repositoryV5.ts) in sqliteRepository.ts. getLoadSessions must still include runs.
3. Run tab: remove ALL mock data and the fake "Start Run / GPS READY" card.
   - Summary from runSummary(runs, now): this week km, previous-4-week average, longest run, avg pace (formatPace). Store distance in meters; show km (mi if a unit setting exists).
   - HR zones from zoneRanges(settings.maxHr); if maxHr is null show "Set your max HR in Settings".
   - Run list (FlashList, repo.listRuns) with a small "GPX" tag on imported runs; tap for detail; long-press delete.
   - "Add run": date, distance, time (parseDuration), optional avg HR, optional RPE -> repo.saveRun (source 'manual', id randomUUID).
   - "Import GPX": expo-document-picker (accept any type, check the name ends with .gpx) -> expo-file-system readAsStringAsync -> parseGpx.
     If !looksLikeRun(gpxType(xml)) ask "This looks like a <type>. Import as a run anyway?". summarizeGpx() null -> "Couldn't read a run from this file."
     Show a preview (date, distance, moving time, pace, avg HR) -> Confirm -> repo.importRun(gpxToRun(summary)); 'duplicate' -> "Already imported".
   - Short help text under the button: "Export a GPX file from your watch app or from strava.com (activity menu), then import it here."
4. Verify: npm test (expect 56 passing), tsc. On device: add a manual run; import a real GPX of one of your runs; import it again (duplicate message); delete it; export a backup and re-import it.
   Send 3 screenshots: Run tab, Add run form, GPX import preview.
