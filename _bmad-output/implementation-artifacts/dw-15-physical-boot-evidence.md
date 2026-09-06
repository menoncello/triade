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
