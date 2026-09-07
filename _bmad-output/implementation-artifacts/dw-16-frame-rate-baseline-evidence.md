# DW-16 on-device frame-rate baseline evidence

Date: 2026-09-06

## Runtime identity

- Simulator: iPhone 17 Pro, UDID EF376678-61DF-4782-A01F-E058C05A476A, iOS 26.5
  (from `xcrun simctl list devices available`; booted from `Shutdown` to `Booted` for this run)
- Host: Xcode 26.6 (Build 17F113)
- Build config: Debug (`Debug-iphonesimulator/triade.app`, dev-client + Metro bundler)
- Seed: 20260808 (matches `triade/App.tsx:115-116` `mulberry32(20260808)`)
- Fallback path: paired iPhone 14 Pro (UDID 00008120-00023C440263C01E) NOT used —
  `xcrun devicectl list devices` reports it `unavailable` (verbatim listing below),
  so per spec the simulator path stands and no device install was attempted.

## Commands run (with exit codes)

| # | Command | Exit | Outcome |
|---|---------|------|---------|
| 1 | `xcrun simctl list devices available` | 0 | 12 runtimes listed (iOS 26.5), all `Shutdown` |
| 2 | `xcrun simctl boot EF376678-61DF-4782-A01F-E058C05A476A` | 0 | iPhone 17 Pro `(Booted)` |
| 3 | `cd triade && npx expo run:ios --device EF376678-61DF-4782-A01F-E058C05A476A --non-interactive` | 0 (build) | `› Build Succeeded`, 0 errors, 3 warnings (duplicate `-lc++`; GoogleMobileAds `ios_app_id key not found` — safe to ignore per message; ambiguous-dependencies script). Installed on iPhone 17 Pro, opened `com.menontech.triade` via dev-client URL. Metro kept serving. |
| 4 | `xcrun simctl io <sim> screenshot` (13:41, 13:44) | 0 | App on laneSelect (`Tríade / Choose your lane`), no Metro redbox, no native crash |
| 5 | Host determinism: `runSeededSession(20260808, 200)` via `node --import tsx` (twice) | 0 | `{"spawns":200,"moves_snapshots":200,"first5":[2,1,1,3,2],"ms":4}` + `deterministic:true` — completes, no stuck failure |
| 6 | `xcrun devicectl list devices` | 0 | iPhone 14 Pro `DD0414C7-175F-54F0-B474-42F213FD3ABD` state `unavailable` — fallback unavailable |
| 7 | `cd triade && npx tsc --noEmit` | 0 | clean, no output |
| 8 | `cd triade && npm test` (project runner: `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/**/*.test.ts"`) | 0 | 1438 tests · 126 suites · 1012 pass · 0 fail · 426 skipped · ~5s. NOTE: bare `node --test` (spec wording) fails with `ERR_UNKNOWN_FILE_EXTENSION` on `.ts` — expected; the tsx loader is the project's runner. |

Verbatim `xcrun devicectl list devices`:

```text
Name                   Hostname                             Identifier                             State         Model
--------------------   ----------------------------------   ------------------------------------   -----------   --------------------------
Eduardo’s iPhone (2)   Eduardos-iPhone-2.coredevice.local   DD0414C7-175F-54F0-B474-42F213FD3ABD   unavailable   iPhone 14 Pro (iPhone15,2)
```

## Frame readout

NOT OBSERVED — no `fps · p99Ms · frames` readout captured (requires the playing screen).

- Booted: YES (laneSelect reached, screenshots prove render with no redbox/crash).
- Board rendered: NO — `Play` was never activated; the app stayed on laneSelect.
- Blocking cause (host input sandbox, not app code): the run host cannot synthesize
  taps into the simulator — no Accessibility grant and none grantable non-interactively:
  - `osascript` GUI scripting fails verbatim:

    ```text
    68:84: execution error: System Events got an error: osascript is not allowed assistive access. (-1719)
    ```

  - Quartz `CGEventPost` (tried `kCGHIDEventTap` and `kCGSessionEventTap`) verified
    no-op: `CGEventGetLocation` returned `(861.19, 1331.07)` unchanged before/after
    move+click posts. No `idb`/`maestro`/`detox` on host; no E2E tap harness in repo.
  - Per spec, the locked/unavailable physical device was NOT retried.

## Budget verdict vs p99 < 16.7ms

NO VERDICT POSSIBLE — zero frame samples recorded, so there is nothing to compare
against the T5.2 budget (p99 < 16.7ms, fps >= 59 on 60Hz). This is a harness/input
limitation, not a product-code failure: no engine/render code was touched and
`triade/src/render/useFrameRateBaseline.ts` (WINDOW = 120, fps/p99 math) is unchanged.

Methodology note for the orchestrator / re-measurement: the probe is one-shot from
`AppContent` mount, so its 120-frame window elapses on the launch screens
(laneSelect here) — the `baseline:` readout only *renders* on the playing screen
(`triade/App.tsx:1179-1183`). Even a later manual `Play` tap would report
launch-screen frames, not board frames. A future board-frame baseline needs the
window to cover board render (human taps `Play` within ~2s of launch, or a
relaunch-then-tap protocol) — that is a protocol change, not a code change, and is
left to the orchestrator.

Prior context (unchanged): the only frame-rate numbers on record remain the
2026-08-10 simulator informative reading (60 fps · p99 16.67ms · 120 frames, Mac GPU).

## Sharing

This evidence file is shared with DW-32 (same fps/p99 readout need).

## Product-code changes

NONE. No files under `triade/` were modified; no boot-blocking fix was needed
(the app boots and renders laneSelect cleanly).

---

# Re-measurement: 2026-09-07 (UTC; host local 2026-09-06 21:05–21:25 -0300)

Spec: `_bmad-output/implementation-artifacts/spec-decision-dw-16-frame-rate-baseline-2.md`.
The 2026-09-06 section above is left intact.

## Runtime identity

- Simulator: iPhone 17 Pro, UDID EF376678-61DF-4782-A01F-E058C05A476A, iOS 26.5
  (already `Booted` at run start; no boot needed)
- Build config: Debug (`Debug-iphonesimulator/triade.app`, dev-client + Metro bundler,
  Metro already serving on :8081 and reused)
- Seed: 20260808 (`mulberry32(20260808)`, `triade/App.tsx:118`)
- Auto-drive: `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` (`__DEV__`-only, boots straight to
  board, cycles left/up/right/down every 500ms)
- Fallback not needed: `xcrun devicectl list devices` reports the iPhone 14 Pro
  `available (paired)` this time, but the simulator path was used per spec priority.

## Commands run (with exit codes)

| # | Command | Exit | Outcome |
|---|---------|------|---------|
| 1 | `xcrun simctl list devices available` | 0 | iPhone 17 Pro `Booted`, 11 more runtimes `Shutdown` |
| 2 | `xcrun devicectl list devices` | 0 | iPhone 14 Pro `available (paired)` — fallback reachable, not used |
| 3 | `cd triade && EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1 npx expo run:ios --device EF376678-61DF-4782-A01F-E058C05A476A --non-interactive` | 0 | `› Build Succeeded`, 0 errors, 3 warnings (duplicate `-lc++`; GoogleMobileAds `ios_app_id key not found`; ambiguous-dependencies script). Installed on iPhone 17 Pro, opened `com.menontech.triade` via dev-client URL |
| 4 | `xcrun simctl io <sim> screenshot` ×4 (sim clock 21:12 / 21:17 / 21:19 / 21:20) | 0 | All four show the playing screen (Skia 4x4 board, score line, pause button), no Metro redbox, no native crash |
| 5 | Host determinism: `runSeededSession(20260808, 200)` via `node --import tsx` (twice) | 0 | `{"spawns":200,"first5":[2,1,1,3,2],"ms1":4,"ms2":1,"deterministic":true}` — identical spawn output, no stuck failure |
| 6 | `xcrun simctl spawn <sim> log show --predicate 'process == "triade"' --last 3m` (grep error/redbox/exception/baseline) | 0 | Only MediaToolbox `FigFilePlayer err=-12864` noise (ads); no redbox, no crash, no baseline log (expected — worklets/frame math never log) |
| 7 | `cd triade && npx tsc --noEmit` | 0 | clean, no output |
| 8 | `cd triade && npm test` | 0 | 1469 tests · 129 suites · 1024 pass · 0 fail · 445 skipped · ~5.4s |

## Frame readout

BOARD REACHED — but the completed `fps · p99Ms · frames` readout was NEVER OBSERVED.

Verbatim on-screen text in all four screenshots (playing screen, above the score line):

```text
recording frame rate baseline…
```

(`…` is U+2026, matching `triade/App.tsx:1228`.)

- Booted: YES. Board rendered: YES (shot1 score 36, shot2 score 450, shot3 score 9
  after an auto-restart, shot4 score 156 — the auto-drive plays and restarts games).
- Completed `baseline: <fps> fps · p99 <p99>ms · <n> frames` readout: NO —
  `stats` stayed `null` across ~4 minutes of sustained board play, so the restarted
  120-frame window never published via `runOnJS(setStats)`. No redbox or crash
  accompanied this; the game itself renders and plays normally.
- This is a probe-observation limitation, not a verdict on the engine: per spec
  (`triade/` untouched, WINDOW/fps-p99 math unchanged) no product code was changed
  to diagnose or fix it. Suspect for the orchestrator: the `useFrameCallback`
  window either never accumulates 120 samples in this build or the generation
  restart never settles — left to DW-32 / a follow-up, NOT fixed here.

## Budget verdict vs p99 < 16.7ms / fps >= 59

NO VERDICT POSSIBLE — zero completed frame samples recorded, so there is nothing
to compare against the T5.2 budget. Prior context (unchanged): the only
frame-rate numbers on record remain the 2026-08-10 simulator informative reading
(60 fps · p99 16.67ms · 120 frames, Mac GPU).

## Sharing

This evidence file remains shared with DW-32 (same fps/p99 readout need).

## Product-code changes (2026-09-07 run)

NONE. No files under `triade/` were modified; no boot-blocking fix was needed
(the app builds, installs, boots straight to the board, and plays via auto-drive).

---

# Diagnosis + probe-wiring fix: 2026-09-07 (bundle frame-rate-baseline-measure)

Spec: `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md`.
Both sections above are left intact. Per the bundle intent, this run diagnoses the
probe-side window/generation wiring instead of re-running measurement as-is, so no
new simulator build was attempted and no new frame numbers are claimed.

## Static findings (no `triade/` behavior changed to obtain them)

F1 — frame callback re-registered every render. `useFrameCallback` received a fresh
inline arrow on every `AppContent` render, so Reanimated re-registers the callback
and resets the `timeSinceFirstFrame` base each time. The `__DEV__` auto-drive moves
every 500ms (each move re-renders), so deltas computed as `now - last.current`
straddle resets and go corrupt (large negatives) mid-window. The official
Reanimated docs recommend wrapping frame callbacks in `useCallback` for exactly
this reason. Consistent with history: the probe DID publish on 2026-08-10
(60 fps · p99 16.67ms · 120 frames) before the DW-32 generation-restart +
auto-drive landed.

F2 — empty-window deadlock. If 120 callbacks ever yielded zero samples, the old
completion path set `done = true` and then returned early on `samples.length === 0`
without publishing — `stats` stayed null forever and the screen read
`recording frame rate baseline…` permanently. One transient degenerate window was
enough to wedge the probe for the rest of the session.

## Fix applied (hook-only, WINDOW/math byte-identical)

- `triade/src/render/useFrameRateBaseline.ts`: extracted pure exported
  `computeFrameRateStats(samples)` (identical sorted/idx/p99/avgMs formulas,
  null on empty); memoized the frame callback with `useCallback(..., [])`
  (safe: only refs + `setStats` + the module function are captured);
  a null result now resets durations/last/count and retries instead of latching
  `done`. `WINDOW = 120`, the hook signature, and the generation-reset effect are
  unchanged. `triade/App.tsx` untouched. Release behavior unchanged (no harness
  shipped, no worklet/frame-math logging added).
- `triade/__tests__/render/useFrameRateBaseline.math.test.ts` (new): source-shape
  guards (WINDOW 120, memoized callback, empty-window reset) plus math checks
  (119 × 16.667ms → fps ≈ 60 / p99 ≈ 16.67 / frames 119; 100-sample single spike
  → p99 selects the spike; empty → null). No RN imports (repo ATDD style).

## Automated verification (no device run in this bundle)

- `cd triade && npx tsc --noEmit` → clean, exit 0.
- `cd triade && npm test` → 1478 tests · 131 suites · 1033 pass · 0 fail ·
  445 skipped (new file 6/6 passing, zero regressions).
- Working tree at fix time: clean on branch `feat/epic-10-telemetria`
  (baseline `6b16593`); this bundle's diff is the hook fix + the new test + the
  spec/evidence docs only.

## Budget verdict vs p99 < 16.7ms / fps >= 59

STILL NO VERDICT — zero new frame samples were recorded in this bundle by design
(diagnosis instead of a blind re-run). Prior context (unchanged): the only
frame-rate numbers on record remain the 2026-08-10 simulator informative reading
(60 fps · p99 16.67ms · 120 frames, Mac GPU).

## Re-measurement protocol for the orchestrator (one screenshot, not a 4-minute watch)

1. Boot the iPhone Simulator dev build with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1`
   (seed 20260808, Debug) and wait ~10s after the board appears.
2. Take one screenshot: expect `baseline: <fps> fps · p99 <p99>ms · <n> frames`.
3. If the screen still reads `recording…` after 30s of board play, the transient
   causes ruled out by this fix (re-registration churn, empty-window latch) are
   eliminated — the remaining suspect is callback-never-firing at the
   Reanimated/runtime level, and the follow-up is device-log investigation, not
   another measurement run as-is.

## Sharing

This evidence file remains shared with DW-32 (same fps/p99 readout need).
