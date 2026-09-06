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
