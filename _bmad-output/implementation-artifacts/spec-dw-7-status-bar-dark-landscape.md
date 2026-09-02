---
title: 'DW-7 Status bar legibility — force dark style in landscape on light background'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'fb6df274fc961fea37dea271311a02c136fb6890'
final_revision: '5588155b0b174f9ebd3b3bfcec7804117bb2ab23'
---

<intent-contract>

## Intent

**Problem:** On non-notch devices in landscape the HUD's thin top band sits under a light system status bar (`StatusBar style="auto"` on a `#fff` background), making white/light status text illegible and leaving a visible band under the bar.

**Approach:** Force `StatusBar` to `style="dark"` when the app is in landscape on its light background (`#fff`), keeping portrait as `style="auto"` so portrait behavior is unchanged; verify contrast on device/simulator.

## Boundaries & Constraints

**Always:** Keep the app container background `#fff` (light); portrait `StatusBar` must remain `style="auto"`; do not alter layout geometry (`layoutFor`, `bandHeight`, `isLandscape`) or HUD placement; reuse the existing `isLandscape` source of truth.

**Block If:** The fix would require adding native StatusBar translucent/overlay options, changing the HUD band color to dark, or adding a new dependency.

**Never:** Change the landscape band height or board sizing; change the portrait StatusBar behavior; introduce theme switching or background darkening; touch engine/lane/monetization logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Portrait any device | `isLandscape=false` (width <= height) | `StatusBar style="auto"` rendered | No error — fallback to auto |
| Landscape non-notch light UI | `isLandscape=true`, `styles.container.backgroundColor="#fff"` | `StatusBar style="dark"` rendered (dark text/icons on light band) | No error |
| Landscape notch device | `isLandscape=true` with non-zero left inset | Same: `style="dark"` — still legible against light band | No error |
| Rotation portrait→landscape | `isLandscape` flips false→true | StatusBar prop updates to `dark` on next render without flicker to `auto` | Immediate prop switch |
| Rotation landscape→portrait | `isLandscape` flips true→false | StatusBar prop reverts to `auto` | Immediate |

</intent-contract>

## Code Map

- `triade/App.tsx:3,876,885,905,1024` -- Imports `StatusBar` from `expo-status-bar` and renders `<StatusBar style="auto" />` in 4 branches (`!ready`, `tone`, `laneSelect`, `playing`); the file already computes `isLandscape` via `useSyncedLayout()` at `AppContent` top level.
- `triade/src/ui/useSyncedLayout.ts:14-60` -- Provides `{ isLandscape, width, height, insets, boardSize, bandHeight, bandTop }` coalesced across rotation; canonical source for orientation.
- `triade/src/ui/layout.ts:37-42` -- Pure `layoutFor` / `isLandscape(width,height)` definition (`width > height`); must not be changed.
- `triade/src/ui/orientation.ts:1-10` -- `isLandscape` single source import used by layout.
- `triade/app.json:12` -- `expo` config; no StatusBar config overrides present (style driven only by component prop).
- `triade/test-utils/rn-stub.ts:92` -- Test stub for `StatusBar` (`() => null`); unit tests cannot assert style via rendering but can assert the branching helper if extracted.

## Tasks & Acceptance

**Execution:**
- [x] `triade/App.tsx` -- Replace every `<StatusBar style="auto" />` (4 sites) with orientation-aware `style={isLandscape ? "dark" : "auto"}` using the already-available `isLandscape` from `useSyncedLayout()` in `AppContent`; the `!ready`/`tone`/`laneSelect` branches are inside `AppContent` so they share the same `isLandscape` binding — no new hook calls needed. Optionally extract a `statusBarStyle(isLandscape)` pure helper in the same file or `src/ui/statusBar.ts` for testability, but keep the change minimal.
- [x] `triade/src/ui/statusBar.ts` (optional if helper extracted) -- Export `function statusBarStyle(isLandscape: boolean): "auto" | "dark"` returning `"dark"` when landscape else `"auto"`; pure, no RN imports, unit-testable.

**Acceptance Criteria:**
- Given the app is in portrait (`width <= height`), when any screen (`tone`, `laneSelect`, `playing`, `!ready`) renders, then the mounted `StatusBar` prop is `style="auto"` (portrait behavior unchanged).
- Given the app is in landscape (`width > height`) on the light `#fff` container, when any screen renders, then `StatusBar` prop is `style="dark"` (dark text/icons for contrast).
- Given the app rotates 90deg between orientations, when `isLandscape` flips, then the `StatusBar` style prop flips between `"auto"` and `"dark"` on the next render without retaining the previous orientation's value.
- Given `npx tsc --noEmit -p triade/tsconfig.json` and `npm test` under `triade/`, when tests run, then type-check passes and existing layout/orientation tests remain green.

## Spec Change Log


## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### Review Details
- Blind Hunter: verified 4 StatusBar branches now use `statusBarStyle(isLandscape)` helper; portrait remains `auto`, landscape forces `dark` on light `#fff` container; no layout geometry or HUD placement altered; no new dependencies or native config changes; `expo-status-bar` style union satisfied.
- Edge Case Hunter: checked portrait/landscape matrix, notch vs non-notch, rotation flip, debounce lag (~32ms via `useSyncedLayout` — acceptable and intentional per spec), `isLandscape` boolean purity, helper unit-testable and covered.
- No patch required; no defer (pre-existing `tsc` errors in `spawn-candidates-validation` are not caused by this diff).



## Design Notes

Minimal change: reuse `isLandscape` from `useSyncedLayout()` which already drives `bandHeight`/`boardSize`. Do not introduce `useColorScheme` or background-aware logic — the container is always light (`#fff`). `expo-status-bar` `style="dark"` maps to iOS `UIStatusBarStyleDarkContent` (dark text). Four branches in `App.tsx` must all be updated or refactored to a single return with one `StatusBar` at the root; per-branch update is safest if the control flow stays branching.

```tsx
// App.tsx pattern
const statusBarStyle = isLandscape ? "dark" as const : "auto" as const;
<StatusBar style={statusBarStyle} />
```

## Verification

**Commands:**
- `npx tsc --noEmit -p triade/tsconfig.json` -- expected: no type errors (StatusBar style union accepts "dark"|"auto")
- `npm test` -- expected: layout/orientation suites green; no StatusBar render failures
- `grep -n "StatusBar" triade/App.tsx` -- expected: no remaining `style="auto"` literal without `isLandscape` guard

**Manual checks (if no CLI):**
- Simulator/device: rotate iPhone SE / non-notch simulator to landscape (Cmd+arrow) — status icons/text are dark and legible against the light 48pt band; rotate back to portrait — status bar returns to `auto` (no regression). Manual validation gate per ledger.

## Auto Run Result

Status: done

DW-7 status bar legibility fixed: `StatusBar` now renders `style="dark"` in landscape on the light `#fff` container and `style="auto"` in portrait (unchanged). Pure helper `statusBarStyle(isLandscape)` extracted to `triade/src/ui/statusBar.ts` and consumed at all 4 `App.tsx` branches (`!ready`, `tone`, `laneSelect`, `playing`) via the existing `isLandscape` from `useSyncedLayout()`.

Files changed:
- `triade/src/ui/statusBar.ts` — NEW pure `statusBarStyle(isLandscape)` helper (`"dark"` when landscape else `"auto"`).
- `triade/__tests__/ui/statusBar.test.ts` — NEW unit tests for helper (portrait auto, landscape dark, purity).
- `triade/App.tsx:32,877,886,906,1025` — import helper and replace 4× `<StatusBar style="auto" />` with `<StatusBar style={statusBarStyle(isLandscape)} />`.
- `_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md` — NEW spec + triage log.

Review findings breakdown: patches 0, deferred 0, rejected 0. No intent_gap or bad_spec. No code changes beyond the oriented StatusBar prop; layout geometry, HUD, engine untouched.

Follow-up review recommended: false — change is 4 prop swaps + 1 pure helper, fully covered by 3 new unit tests and 914 existing tests still green; low breadth and no API/security impact.

Verification performed:
- `npm test` under `triade/` — 917 pass / 0 fail (914 existing + 3 new statusBar tests), 311 skipped.
- `npx --prefix triade tsc --noEmit -p triade/tsconfig.json` — no new errors on `statusBarStyle`; pre-existing 8 errors in `spawn-candidates-validation` unchanged (not caused by this diff).
- `grep -n StatusBar triade/App.tsx` — 4 sites now use `statusBarStyle(isLandscape)`, no bare `style="auto"` remains.

Residual risks:
- Manual simulator rotation contrast check remains the human validation gate per ledger (non-notch landscape light band); automated test covers prop logic but not pixel contrast.
- `isLandscape` originates from debounced `useSyncedLayout` (32ms), so StatusBar style flips with the same debounce; transient 32ms lag is acceptable and avoids board flash.

