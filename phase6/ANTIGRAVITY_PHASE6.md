# Antigravity task: Phase 6, motion + visual polish ("feels alive", Duolingo-style bounce)

Read CLAUDE.md, then append the "Motion rules" below to it. Do NOT edit src/lib/*, tests/*, src/motion/tokens.ts.
The design is ORIGINAL: copy the *feel* (springy, chunky, rewarding), never Duolingo's assets, mascot, colors or fonts.

## Motion rules (add to CLAUDE.md)
1. All motion constants come from src/motion/tokens.ts (spring, duration, press, stagger, hapticFor). No magic numbers in components.
2. Animate only transform and opacity, on the UI thread (Reanimated shared values / Skia). Never animate layout props (width/height/top) in lists.
3. Every interactive element gives feedback within one frame: scale + haptic (hapticFor).
4. Respect reduced motion (useReducedMotion): no bouncing/confetti/shake; use short fades.
5. Long lists: only the first 12 rows animate in (staggerDelay). Nothing animates on scroll.
6. Test on the real phone. If any screen drops frames, simplify the animation, not the device.

## Build shared primitives first (src/motion/)
1. `PressableScale`: wraps Pressable; scales to press.scale with spring.snappy on press-in, back on release; fires the haptic.
2. `ChunkyButton` (primary CTA): the volt button gets a darker bottom edge (press.chunkyDepth px) that collapses while pressed, like a physical key. Use for Start Session, Finish, Add Set, Save.
3. `PopIn` (entering): scale 0.6 -> 1 + fade with spring.bouncy. Used by check marks, PR badges, the streak flame.
4. `CountUpText`: animates a number from its previous value using countUp(from, to, t) over duration.count, via animated props so it runs on the UI thread. Check it works with the installed Reanimated version; fall back to a light JS loop only if it doesn't, and tell me.
5. `AnimatedBar`: fills with scaleX (transform) using spring.gentle for volume and muscle bars; stagger with staggerDelay.
6. `Confetti`: Skia canvas, pieces from confettiPieces(confettiCount(tier), seed, palette.length), simple gravity + rotation, ~duration.celebrate, then unmount. 5-6 palette colors from the theme.
7. `Shake` (error): small horizontal shake on invalid input.

## Apply it
- Logger: ticking a set = row flashes the accent, the check uses PopIn, haptic setDone; the rest bar slides up with spring.gentle; the timer ring is a Skia arc that drains smoothly; at 0 a short pulse + haptic restDone. New set rows slide/fade in.
- Finish: celebrationTier({ setsDone, prCount }). 'done' = summary slides up with CountUpText for volume/duration/sets; 'pr' = + PopIn trophy badge + confetti; 'epic' = + bigger burst and a second haptic pulse. Never block the Save/Close buttons behind the animation.
- Streak: weeklyStreak(all session start times (lifting + runs), target 3/week (setting), Date.now(), -new Date().getTimezoneOffset()). Show a flame badge on the Workout tab with the number of weeks and an "x / 3 this week" bar; PopIn when the current week becomes met. Add "weekly session goal" (1-7) to Settings.
- Navigation: tab icon pops (spring.bouncy) on selection; screen push uses a spring-feeling slide; bottom sheets use spring.gentle.
- Lists (History, routines): staggered entrance on first load only.
- Progress: charts draw in once (AnimatedBar for bars; line chart path reveal); numbers use CountUpText.
- Empty states: simple code-drawn illustrations (Skia/SVG shapes) with a gentle idle float loop (cancel on unmount).

## Visual de-AI pass (keep it small)
- Font: Nunito (@expo-google-fonts/nunito, OFL license; add to NOTICE.md) for all text; weights 600/700/800. Define the type scale once in src/theme.
- Icons: replace the hand-made tab icons with lucide-react-native, consistent stroke width.
- Cards: one consistent style (radius, border, elevation tint); stop mixing different card looks. Reduce the number of different greys.
- Copy: replace marketing-style placeholder sentences with short, plain labels.
- App icon + splash: a simple original mark (release assets come in Phase 7).

## Verify
npm test (expect 65 passing), tsc. On device: capture short screen recordings of (1) ticking a set + rest timer, (2) finishing a workout with a PR, (3) the streak badge. Test with "Remove animations" enabled in Android settings.
Send me the 3 clips or screenshots plus a list of any animation you had to simplify for performance.
