# DW-15 physical iOS boot evidence

Date: 2026-09-06

## Device

- Model: iPhone 14 Pro (iPhone15,2)
- devicectl identifier: DD0414C7-175F-54F0-B474-42F213FD3ABD
- UDID: 00008120-00023C440263C01E
- iOS version: 26.6.1 (from `xcrun devicectl list devices -v`, `osVersionNumber`)
- State at run time: `available (paired)` (verbatim devicectl listing below)

Verbatim `xcrun devicectl list devices`:

```text
Name                   Hostname                             Identifier                             State                Model
--------------------   ----------------------------------   ------------------------------------   ------------------   --------------------------
Eduardo’s iPhone (2)   Eduardos-iPhone-2.coredevice.local   DD0414C7-175F-54F0-B474-42F213FD3ABD   available (paired)   iPhone 14 Pro (iPhone15,2)
```

## Prebuild

- Command: `npx expo prebuild` (incremental, no `--clean`), exit 0.
- Note: despite no `--clean`, Expo cleared and regenerated `ios/` + `android/` ("Clearing android, ios / Cleared android, ios code / Created native directories"), then installed CocoaPods. This is standard Expo behavior, not a flag error.
- Signing intact: NO. `triade/ios/` is gitignored (`triade/.gitignore:40: /ios`) — it is NOT checked in, contrary to the spec premise. After regeneration, `project.pbxproj` contains zero `DEVELOPMENT_TEAM` entries and `app.json` defines no team. The pre-existing manual signing config (if any lived in the gitignored dir) was wiped by the regeneration.

## run:ios (Debug)

- First attempt `npx expo run:ios --device` (no value) failed fast in non-interactive mode: `CommandError: Input is required, but 'npx expo' is in non-interactive mode. Required input: > Select a device`. Re-ran with explicit UDID `--device 00008120-00023C440263C01E` (valid per `expo run:ios --help`: `-d, --device [device]  Device name, UDID, or "generic"`).
- Build: SUCCEEDED, 0 errors, 3 warnings (duplicate `-lc++` link warning; GoogleMobileAds `ios_app_id key not found` config warning — app.json does set it via the Expo plugin so per the message it is safe to ignore; ambiguous-dependencies script warning). Code signing of `triade.app` completed with no signing/provisioning error — automatic signing worked despite the missing DEVELOPMENT_TEAM entry.
- Install/launch (attempted twice, ~minutes apart): FAILED — device locked both times.
- Booted: NO (app never installed/launched; build only).
- Board rendered: UNKNOWN (no on-device observation possible without launch).
- Frame baseline (`fps · p99 · frames` from `useFrameRateBaseline.ts`): NOT OBSERVED (requires running app; Metro never served the bundle to the device).

Verbatim blocking error (identical on both attempts):

```text
› Installing /Users/eduardomenoncello/Library/Developer/Xcode/DerivedData/triade-cngecqzjzclowkeqbgjzqjbzbmav/Build/Products/Debug-iphoneos/triade.app
- Connecting to: Eduardo’s iPhone (2)
✖ Connecting to: Eduardo’s iPhone (2)
CommandError: Cannot launch triade on Eduardo’s iPhone (2) because the device is locked.
```

## Release run

- SKIPPED (Debug run never reached the device; per spec I/O matrix there is no Debug baseline to be provisional about).

## Outcome

BLOCKED: physical device locked at install time. Unlock the iPhone (passcode/Face ID — human action), keep it unlocked, and re-run `npx expo run:ios --device 00008120-00023C440263C01E` from `triade/`; the Debug build is cached and signed, so only install + launch remain. Also note for the orchestrator: spec premise "ios/ checked in with DEVELOPMENT_TEAM" is inaccurate — `triade/ios/` is gitignored and prebuild regenerates it without a team; signing still succeeded via automatic signing.

---

# Retry 2026-09-06 (spec-dw-15-physical-ios-boot-2)

Timeline (-03): `expo run:ios` install+launch success ~20:22 (run2 log 20:21:24→20:22:08 file times); intermediate locked attempt 20:24:27→20:25:21 (run3 log file times); direct `devicectl process launch` success ~20:28; Metro auto-drive soak observed through ~20:45. Build configuration throughout: Debug (Release baseline still pending).

## Device (re-verified)

- Model: iPhone 14 Pro (iPhone15,2), identifier `DD0414C7-175F-54F0-B474-42F213FD3ABD`, UDID `00008120-00023C440263C01E`
- iOS version: 26.6.1 (verbatim `osVersionNumber: Optional("26.6.1")` from `xcrun devicectl list devices -v`)
- State: `available (paired)`; unlocked at install/launch time. One intermediate `expo run:ios` attempt failed after auto-lock re-engaged — verbatim (`dw15-logs-20260906/dw15-run3.log:45-49`):

```text
Waiting on http://localhost:8081
› Installing .../Debug-iphoneos/triade.app
- Connecting to: Eduardo’s iPhone (2)
✖ Connecting to: Eduardo’s iPhone (2)
CommandError: Cannot launch triade on Eduardo’s iPhone (2) because the device is locked.
```

## What ran

- Skipped prebuild (native project + signed Debug `.app` already cached from the earlier run; no product code touched).
- `npx expo run:ios --device 00008120-00023C440263C01E` → Build SUCCEEDED, 0 errors → install + launch SUCCEEDED on the unlocked phone (Metro "Logs for your project will appear below", iOS bundles served).
- Direct launch also verified independently: `xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade` → `Launched application with com.menontech.triade bundle identifier.`
- Metro restarted with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` (JS-bundle-time flag, no code change) so the dev build boots straight to the board and cycles deterministic moves via the existing `doMove` path every 500 ms — no manual taps needed.

## Results

- Booted on physical device: YES. JS bundle executed on-device (Metro `iOS Bundled` lines for index + lazy expo-asset/mmkv/secure-store/haptics/audio modules; on-device Reanimated worklet warnings forwarded to Metro).
- Skia board mounted + moves executing: YES (inferred-strong, not pixel-observed). Reasoning chain: auto-drive sets `screen='playing'` which is the only mount point of `GameBoard`; the Metro log shows the full index bundle plus lazy `expo-haptics` / `expo-audio` chunks served after launch — consistent with game code paths executing; a ~17 min wall-clock window (launch ~20:28, last log check ~20:45, moves unlogged by design per the worklet no-log rule so no per-move count exists) produced zero redbox, zero fatal, zero native-crash lines. Limit: a native crash that kills the app without Metro output cannot be ruled out from Metro logs alone; mitigation is that the app launched cleanly twice and served bundles on demand throughout.
- Visual pixel confirmation: NOT captured remotely (no screenshot/tap automation available via devicectl; libimobiledevice absent). The holder has the unlocked phone in hand for visual confirmation.
- Frame baseline (`fps · p99 · frames` from `useFrameRateBaseline.ts`): NOT RECORDED — the readout is on-screen only (no console log) and there is no remote screen readback. Per the spec I/O matrix this stays a provisional/pending item; the Debug build ran the full 120-frame probe path without errors.

## Verbatim log excerpts (durable copies: `_bmad-output/implementation-artifacts/dw15-logs-20260906/`, sha256 in `sha256.txt`)

Sources: `[run2]` = `dw15-run2.log` (expo run:ios, install+launch success); `[metro]` = `dw15-metro.log` (EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1 expo start, auto-drive soak); `[launch]` = direct devicectl launch stdout.

```text
[run2] › Build Succeeded
[run2] › 0 error(s), and 2 warning(s)
[run2] › Installing .../Debug-iphoneos/triade.app
[run2] - Connecting to: Eduardo’s iPhone (2)
[run2] › Logs for your project will appear below.
[metro] iOS Bundled 539ms index.ts (1319 modules)
[metro] iOS Bundled 259ms node_modules/expo-audio/build/index.js (1 module)
[launch] Launched application with com.menontech.triade bundle identifier.
```

Notes: module count differs between runs (`1407` in run2's dev-client bundle vs `1319` in the expo-start bundle) — same app source; the AUTO_DRIVE flag only changes which screen auto-opens plus the 500 ms move interval. The four `WARN [Worklets] Tried to modify key 'current'...` lines are a pre-existing Reanimated boot-time warning (fired at bundle load, before any move), benign for the boot verdict; animation-side hardening is outside DW-15 scope.

## Outcome

PASS-PARTIAL (Debug, agent-side — NOT full DW-15 closure): dev-build boot on the physical iPhone 14 Pro validated — install, launch, JS execution, board-mounted auto-play soak with zero errors. Holder-pending checklist for full DW-15 closure (requires eyes on the unlocked phone; window: while the holder keeps it unlocked — auto-lock re-engages within minutes):

- [ ] Skia 4x4 board visibly rendering while auto-drive plays (photo or written confirm).
- [ ] One on-screen `fps · p99 · frames` readout (Debug build) copied verbatim.
- [ ] Release-config rerun + readout (separate future run; this pass is Debug-only).
- Fallback if the session died before the holder looked: with Metro up (`lsof -iTCP:8081 -sTCP:LISTEN`), re-run `xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade` on the unlocked phone and read the overlay.

## Live processes left for the holder (2026-09-06 ~20:45 -03)

- Metro with auto-drive bundle: PID 14623 (log: `dw15-logs-20260906/dw15-metro.log` snapshot; live log was `/tmp/dw15-metro.log`).
- App `com.menontech.triade` launched on the iPhone and auto-playing the board.
- Caveats: phone auto-lock re-engages within minutes (it locked once mid-run) — if the holder finds it locked, unlock and re-run `xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade` while Metro is up; foreground state at handoff is unverified. Cleanup when done: `kill -0 14623 2>/dev/null && kill 14623; lsof -ti:8081 | xargs kill 2>/dev/null` (guarded PID + port check, frees 8081).
