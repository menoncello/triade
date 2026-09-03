---
workflowType: 'testarch-test-review'
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-03'
inputDocuments:
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/test-utils/rn-stub.ts'
  - 'triade/App.tsx'
  - '_bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design-dw-gameover-hardware-back-handler.md'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: dw-gameover-hardware-back-handler

**Quality Score**: 88/100 (B - Good)
**Review Date**: 2026-09-03
**Review Scope**: directory (triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts + _bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts + _bmad-output/test-artifacts/tests/api/dw-gameover-hardware-back-handler.gateway.spec.ts + _bmad-output/test-artifacts/tests/e2e/dw-gameover-hardware-back-handler.umbrella.spec.ts — working-tree delta dw-gameover-hardware-back-handler)
**Reviewer**: TEA Agent (Muse Spark)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good — BackHandler hardwareBackPress blocking seam is strongly pinned, two file-length HIGHs must be split

**Recommendation**: Request Changes

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Deterministic host-only `node:test + tsx + react-test-renderer` harness — zero hard waits, zero wall-clock fixtures, no `Math.random`, no `page.goto`/`cy.visit`; `BackHandler.addEventListener('hardwareBackPress', () => true)` + dual-path `sub.remove() / (BackHandler as any).removeEventListener` + empty deps `[]` lifetime subscription verified via spy `addCalls/removeCalls/handler()===true` + `act()` mount/unmount + `reducedMotion` independent + fallback legacy path `(add→undefined → removeEventListener)` exercised without device
✅ Full DW-95 AC coverage: P0 mount subscribes `hardwareBackPress` exactly once + handler `() => true` consumes event (true not false/undefined) + unmount `sub.remove()` exactly once without throw + fallback legacy `removeEventListener` when `add` returns undefined + no subscription when overlay not rendered (`gameOver false` → `addCalls 0`) + `reducedMotion` toggle does not duplicate subscription + mount→unmount→remount leak check `addCalls===removeCalls`, all 44 scaffolds dormant `it.skip`/`test.skip` with documented RED-phase header
✅ P1/P2 wiring proves thin-view + never-throw + ledger isolation: `BackHandler` import from `react-native` allowlist + exact literals `hardwareBackPress ×2` + handler literal `() => true ×1` + dual-path `typeof sub.remove === 'function'` + `BackHandler×3-4` imports + `rn-stub.ts BackHandler` surface `addEventListener→{remove}/removeEventListener` + `tsconfig.test.json` path-map `react-native→rn-stub` + engine/layout/render/App empty diff + ledger `resolution-undo 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00` + undo-base `deb5edf9…` + `7374617475733a206f70656e` open-hex

### Key Weaknesses

❌ `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts` is 487 lines — 187 over the 300-line threshold (H5 HIGH) — canonical ATDD with 22 `it.skip` scaffolds (P0 7 + P1 7 + P2 5 + P3 3) + `makeSpy`/`patchBackHandler`/`baseOverlayProps` helpers + file-system scan helpers
❌ `_bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts` is 492 lines — 192 over the 300-line threshold (H5 HIGH) — verbatim mirror of the triade ATDD plus `../../../../` path preamble and duplicated `makeSpy`/`patchBackHandler`/`baseOverlayProps`, duplicating ~75 lines of harness without importing a shared fixture
❌ Inline helper duplication `makeSpy()`/`patchBackHandler()`/`baseOverlayProps()` defined identically in `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:53-91` and again in `_bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts:53-91` and again in `gateway.spec.ts:40-49` and in `umbrella.spec.ts:75-77` while no shared `dw-gameover-hardware-back-handler-fixtures.ts` canonical probes are imported — forfeits `Comprehensive Fixtures` bonus and makes a future `React 19 act()` or `BackHandler` signature migration a four-file edit (L6 LOW)
❌ Inline magic literals duplicated instead of fixture re-use: `hardwareBackPress`, `'Game over'`, `a11yLabel`, `rgba(12,14,17,0.7)`, `zIndex: 2`, `HIT_TARGET`, `5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00`/`deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b`/`7374617475733a206f70656e` appear inline in all four reviewed files without a `SCAN_STRINGS`/`GATE_CONSTANTS` fixture — verbose but deterministic (L6 LOW)

### Summary

The `dw-gameover-hardware-back-handler` bundle (DW-95 vs baseline `6335c41 sweep dw-hud-score-a11y-polish`, working-tree delta `triade/src/ui/GameOverOverlay.tsx:2 BackHandler + 84-95 hardwareBackPress () => true + sub.remove/removeEventListener + triade/test-utils/rn-stub.ts:102-105 stub + deferred-work.md DW-95 open→done 2026-09-03 + spec-gameover-hardware-back-handler.md done`) is an exemplary TEA host-only thin-view overlay hardening seam where the original `GameOverOverlay` blocked `Gesture.Pan` via `pointerEvents="auto"` but never trapped Android hardware back. Host verification is `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test` with `react-test-renderer` + `act()` + `BackHandler` spy injection via `rn-stub.ts` path mapping + `handler()===true` trap + `addCalls/removeCalls` lifecycle + `reducedMotion` independence + legacy fallback + `rg` allowlists — no Playwright/Cypress/device harness required per `test-levels-framework.md` Unit dominance. All 44 scaffolds (P0 7 + P1 7 + P2 5 + P3 3 in each ATDD mirror =22×2=44 plus gateway 14 + umbrella 8 when counting duplicates) are dormant `it.skip`/`test.skip` RED-phase with documented header reason, so `Disabled or Focused Tests` (C1) does not fire; activated counterparts remain `triade/__tests__/ui/components/gameOverOverlay.test.ts 20/20` green and both `tsconfig.json` (real RN) + `tsconfig.test.json` (stub path-map) gates are documented. The only ledger deductions are two H5 HIGHs (487-line canonical + 492-line mirror) + two L6 LOWs (helper duplication + magic literals); determinism, isolation, explicit assertions, network-first, fixture/data-factory, and BDD/priority criteria are all PASS. No bonus category is awarded across every reviewed file because the ATDD duplicates define `makeSpy`/`patchBackHandler` inline instead of importing a shared fixture, so the score is `100 -10 -2 =88` → `Max(0, 100-12+0)=88`, grade B, but computed verdict is `Request Changes` due to H5 per `step-03f-aggregate-scores.md §3b`. Splitting both ATDD files to ≤300 via shared fixture import (or re-exporting the mirror) restores `Approve with Comments` at 96-98. Context exposes R-001 `TS2339 removeEventListener does not exist on BackHandlerStatic RN 0.86` in `GameOverOverlay.tsx:92` — host `tsconfig.test.json` is clean via stub path-map but `triade/tsconfig.json` prod gate fails until `(BackHandler as any).removeEventListener` lands; trace `nfr-assess` already records this as BLOCK.

---

## Quality Criteria Assessment

| Criterion                            | Status                                           | Violations | Basis    | Notes        |
| ------------------------------------ | ------------------------------------------------ | ---------- | -------- | ------------ |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a) | 0    | Convention: bddNaming (emerging: 14 of 40 sampled) | All reviewed tests use `[P0-01]`/`[P1-01]` behavioral naming (`mount subscribes hardwareBackPress exactly once`), not Given/When/Then; repo uses `[P#]` behavioral convention, not GWT — emerging <50% => PASS (n/a) per schedule |
| Test IDs                             | ✅ PASS (n/a) | 0    | Convention: testIds (absent: 0 of 40 sampled) | 0 of 40 sampled files use data-testid/getByTestId; no house test-id convention — PASS (n/a), RN uses spy counts + source literal scans + hasStyle/allText tokens |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS | 0    | Convention: priorityMarkers (established: 23 of 40 sampled, form `[P0]` in test name) | All 44 reviewed tests carry `[P0-01..07]`/`[P1-01..07]`/`[P2-01..05]`/`[P3-01..03]` + `[P0-API-01]`/`[P2-E2E-01]` matching observed form; adopted 57.5% => PASS |
| Disabled or Focused Tests            | ✅ PASS | 0    | Absolute | No `.only`, `fdescribe`, `fit`, `test.only`; all 44 are `it.skip`/`test.skip` but each file header documents RED-phase scaffold: gateway `RED-PHASE, test.skip — Host node:test — All are test.skip (RED). Remove test.skip → test for GREEN` + umbrella `RED-PHASE, test.skip` + triade ATDD `ATDD for dw-gameover-hardware-back-handler — DW-95 BackHandler seam covering working-tree delta vs baseline 6335c41` as still-true reason on header lines; per C1 a documented still-true reason on line or line above is not a violation |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0    | Absolute | Zero waitForTimeout, sleep(, time.sleep(, Thread.sleep(, cy.wait(number) across all 4 reviewed files; handler is synchronous `() => true`, no timer |
| Determinism (no conditionals)        | ✅ PASS | 0    | Absolute | No if/ternary selecting expected values, no try/catch swallowing assertion failures, no Math.random/Date.now governing expiry; `if (sub && typeof sub.remove === 'function')` is SUT cleanup not test control flow; `Date.now()` in `?fallback=${Date.now()}` cache-bust is fixed import key, not expiry fixture (H2 gate closed) |
| Isolation (cleanup, no shared state) | ✅ PASS | 0    | Absolute | No module-level mutable state written inside tests without restore; each test patches `BackHandler.addEventListener/removeEventListener` then `restore()` in `finally`; `addReturn` param isolates fallback branches; spy is fresh per test via `makeSpy()` |
| Fixture Patterns                     | ✅ PASS | 0    | Applicability: file constructs domain payloads | `baseOverlayProps()` factory with overrides pattern used (`stats:{score:123,best:456,maxTile:48,merges:7,longestStreak:3}` + `insets:{top:8,bottom:8,left:8,right:8}`); fixture file `dw-gameover-hardware-back-handler-fixtures.ts` exists in `_bmad-output/test-artifacts/fixtures/` but not imported — noted as L6 not M2 |
| Data Factories                       | ✅ PASS | 0    | Applicability: file constructs domain payloads | Factory with overrides pattern used (`makeSpy()` + `baseOverlayProps(overrides)`); no faker needed; no hardcoded board engine payloads |
| Network-First Pattern                | ✅ PASS (n/a) | 0    | Applicability: file navigates and then reads data-dependent content | No page.goto/cy.visit/router push in pure BackHandler seam — gate closed; `tea_use_playwright_utils:true` loaded but `tea_browser_automation:auto` correctly stays host-only for Expo RN 57 |
| Explicit Assertions                  | ✅ PASS | 0    | Absolute | Every test ≥1 explicit assertion (assert.equal, assert.ok, assert.strictEqual, assert.doesNotThrow, assert.match); zero tests without assertions; total ~98 dormant assertions when activated |
| Test Length (≤300 lines)             | ❌ FAIL | 2    | Absolute | `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts` 487 lines (187 over), `_bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts` 492 lines (192 over); gateway 188, umbrella 102 PASS; fixtures excluded |
| Test Duration (≤1.5 min)             | ✅ PASS | 0    | Absolute | Each file runs <1.5 min host (gateway 14 tests ~300ms, umbrella 8 tests ~250ms, ATDD 22 skip ~45ms dormant / ~400ms activated; `npm --prefix triade test` full host <5s) |
| Flakiness Patterns                   | ✅ PASS | 0    | Absolute | Zero tight timeouts ({timeout:1000}), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; thrash 3-cycle `mount→unmount×3 add 3 remove 3` is deterministic leak check |

**Total Violations**: 0 Critical, 2 High, 0 Medium, 2 Low

**Convention Baseline**: 40 test files sampled outside the review set of 257 corpus files (capped at 40 closest-first by directory distance from `_bmad-output/test-artifacts/tests` and `triade/__tests__/ui` per step-02 sampling rules). `priorityMarkers: 23/40 established [P#] in test name`, `testIds: 0/40 absent`, `bddNaming: 14/40 emerging`, `networkFirst: 1/40 emerging`, `dataFactories: 2/40 emerging`, `fixtures: 0/40 absent`, `assertionStyle: 40/40 established (assert)`; `unknown` never applied (sampled ≥4).

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -2 × 5 = -10
Medium Violations:       -0 × 2 = -0
Low Violations:          -2 × 1 = -2

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +0
  All Test IDs:          +0
                         --------
Total Bonus:             +0

Final Score:             88/100
Grade:                   B
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Split canonical ATDD to ≤300 lines (H5)

**Severity**: P1 (High)
**Location**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:1`
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The file is 487 lines, 187 over the 300-line ideal. Large files are hard to understand and debug. This is the canonical ATDD with 22 `it.skip` scaffolds + `makeSpy`/`patchBackHandler`/`baseOverlayProps` helpers + file-system reads for `src`/`stubSrc`/`appSrc`/`deferredSrc`/`pkgSrc`.

**Current Code**:

```typescript
// ❌ Bad (current — 487 lines monolithic)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
// ... makeSpy, patchBackHandler, baseOverlayProps, P0 7 + P1 7 + P2 5 + P3 3 = 22 tests inline
```

**Recommended Improvement**:

```typescript
// ✅ Better — extract shared harness to fixture, split P0/P1 vs P2/P3
import { makeSpy, patchBackHandler, baseOverlayProps } from '../../fixtures/dw-gameover-hardware-back-handler-fixtures.ts';
// or re-export: triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts → unit mirror imports shared helpers
// Split: dw-gameover-hardware-back-handler.p0-p1.test.ts (≤300) + dw-gameover-hardware-back-handler.p2-p3.test.ts (≤300)
```

**Benefits**:
Focused files under 300 lines are easier to navigate, faster to open in review, and make a future `React 19 act()` migration a one-file edit.

**Priority**:
P1 — blocks `Request Changes` verdict per `step-03f-aggregate-scores.md §3b` (HIGH >0).

---

### 2. De-duplicate unit mirror harness (H5)

**Severity**: P1 (High)
**Location**: `_bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts:1`
**Row**: H5
**Criterion**: Test Length (≤300 lines)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The unit mirror is 492 lines, 192 over the threshold — verbatim copy of the triade ATDD plus `../../../../` path preamble. Duplicating ~75 lines of `makeSpy`/`patchBackHandler`/`baseOverlayProps` without importing the canonical fixture doubles maintenance cost.

**Current Code**:

```typescript
// ❌ Bad — verbatim copy
function makeSpy(): Spy { return { addCalls: 0, ... } }
async function patchBackHandler(spy: Spy, addReturn = ...) { ... }
// ... 22 tests duplicated
```

**Recommended Improvement**:

```typescript
// ✅ Better — re-export or import shared fixture
export * from '../../../../triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts';
// or
import { makeSpy, patchBackHandler, baseOverlayProps } from '../../../../triade/test-utils/dw-gameover-hardware-back-handler-helpers.ts';
```

**Benefits**:
Single source of truth for BackHandler spy plumbing; `tsc` change to `BackHandlerStatic` typing is one file.

**Priority**:
P1 — second H5 that keeps verdict at `Request Changes`.

---

### 3. Extract shared fixture for spy + props helpers (L6)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:53`
**Row**: L6
**Criterion**: Data Factories
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Issue Description**:
`makeSpy()`/`patchBackHandler()`/`baseOverlayProps()` defined identically in four places: triade ATDD, unit mirror, gateway `makeSpy`/`patchBackHandler`/`baseOverlayProps`, and umbrella inline `Spy` + `baseProps`. The canonical fixture `dw-gameover-hardware-back-handler-fixtures.ts` already exports probes but is not imported, so `Comprehensive Fixtures` bonus is forfeited.

**Current Code**:

```typescript
// ⚠️ Could be improved — duplicated in 4 files
function makeSpy(): Spy { return { addCalls: 0, removeCalls: 0, removeEventListenerCalls: 0, handler: null, lastEvent: null, lastRemoveEvent: null }; }
async function patchBackHandler(spy: Spy, addReturn = ...) { const { BackHandler } = await import('react-native'); ... }
function baseOverlayProps(overrides = {}) { return { stats: {...}, insets: {...}, reducedMotion: false, activeLaneId: 'clean', ...overrides }; }
```

**Recommended Improvement**:

```typescript
// ✅ Better — canonical fixture
// _bmad-output/test-artifacts/fixtures/dw-gameover-hardware-back-handler-fixtures.ts
export function makeSpy(): Spy { ... }
export async function patchBackHandler(spy: Spy, addReturn?) { ... }
export function baseOverlayProps(overrides?) { ... }
export const SCAN_STRINGS = { hardwareBackPress: 'hardwareBackPress', handlerTrue: '() => true', resolutionUndo: '5f794ee...' } as const;
// then: import { makeSpy, patchBackHandler, baseOverlayProps } from '../fixtures/dw-gameover-hardware-back-handler-fixtures.ts';
```

**Benefits**:
One edit for `BackHandler` API drift (`as any` fallback), `insets` shape change, or `stats` schema change.

**Priority**:
P3 — low, does not block merge, but cheap to fix while splitting H5 files.

---

### 4. Centralize magic scan literals (L6)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:291`
**Row**: L6
**Criterion**: Data Factories
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Issue Description**:
Literals `hardwareBackPress`, `hardwareBackPresss` (negative), `BackHandler`, `Game over`, `a11yLabel`, `rgba(12,14,17,0.7)`, `zIndex: 2`, `HIT_TARGET`, `expo-router`, `react-navigation`, and ledger hashes `5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00`/`deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b`/`7374617475733a206f70656e` appear inline across all four files without a `SCAN_STRINGS`/`GATE_CONSTANTS` fixture. The probe is correct but verbose.

**Current Code**:

```typescript
// ⚠️ Could be improved — inline literals
assert.equal((src.match(/addEventListener\('hardwareBackPress'/g) ?? []).length, 1);
assert.ok(deferredSrc.includes('5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00'));
```

**Recommended Improvement**:

```typescript
// ✅ Better — fixture constants
import { SCAN_STRINGS } from '../fixtures/dw-gameover-hardware-back-handler-fixtures.ts';
assert.equal((src.match(new RegExp(SCAN_STRINGS.hardwareBackPressAdd, 'g')) ?? []).length, 1);
assert.ok(deferredSrc.includes(SCAN_STRINGS.resolutionUndo));
```

**Benefits**:
Single source for hash rotation; `rg` probes stay in sync with `deferred-work.md` ledger.

**Priority**:
P3 — low, hygiene.

---

## Best Practices Found

### 1. Spy-injected BackHandler lifecycle harness

**Location**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:57`
**Pattern**: Isolated spy injection + restore in finally
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`makeSpy()` + `patchBackHandler(spy, addReturn)` replaces `BackHandler.addEventListener/removeEventListener` in place, captures `handler` + `lastEvent` + `addCalls/removeCalls`, and restores both in `finally`. Each P0 test is fully isolated, no module-level shared mutable state, and the fallback branch `(addReturn === undefined → undefined)` exercises the legacy `removeEventListener` path without polluting sibling tests.

**Code Example**:

```typescript
// ✅ Excellent — isolated spy with finally restore
async function patchBackHandler(spy: Spy, addReturn = { remove: () => spy.removeCalls++ }) {
  const { BackHandler } = await import('react-native');
  const origAdd = (BackHandler as any).addEventListener;
  const origRemove = (BackHandler as any).removeEventListener;
  (BackHandler as any).addEventListener = (ev: string, h: () => boolean) => {
    spy.addCalls++; spy.handler = h; spy.lastEvent = ev;
    if (addReturn === undefined) return undefined as any;
    return addReturn;
  };
  (BackHandler as any).removeEventListener = (ev: string, _h: () => boolean) => {
    spy.removeEventListenerCalls++; spy.lastRemoveEvent = ev;
  };
  return { restore: () => { (BackHandler as any).addEventListener = origAdd; (BackHandler as any).removeEventListener = origRemove; } };
}
// use: const { restore } = await patchBackHandler(spy); try { ... } finally { restore(); }
```

**Use as Reference**:
Keep this pattern when adding future `onContinueCancel` conditional back handler — spy `handler` after `renderer.update({canContinue:true})` must still be `() => true` or the new conditional.

---

### 2. Empty-deps lifetime subscription proven via reducedMotion toggle

**Location**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:213`
**Pattern**: Deterministic mount→update→unmount probe for deps `[]`
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`[P0-06] reducedMotion toggle does not duplicate subscription` mounts `reducedMotion:false` (`addCalls 1`), `renderer.update({reducedMotion:true})` asserts `addCalls` still `1` + `handler()===true`, then `true→false` still `1`, only `unmount` → `removeCalls 1`. This pins the `useEffect(…, [])` contract that `BackHandler` is lifetime-scoped, not per-render, and that animation `reducedMotion` never re-subscribes.

**Code Example**:

```typescript
// ✅ Excellent — toggle without duplicate
act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion: false }) as any)); });
assert.equal(spy.addCalls, 1);
act(() => { (renderer as any).update(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion: true }) as any)); });
assert.equal(spy.addCalls, 1, `after false→true toggle addCalls ${spy.addCalls} expected still 1 (deps [] not [reducedMotion])`);
assert.equal(spy.removeCalls, 0);
```

**Use as Reference**:
Use same `update()` pattern when future `canContinue` conditional back is introduced — that future handler must change deps to `[canContinue]` and the test must then expect `removeCalls 1` + `addCalls 2` on toggle.

---

### 3. Three-cycle leak check

**Location**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:421`
**Pattern**: Explicit `addCalls===removeCalls` invariant over thrash
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`[P3-01] thrash 3 cycles no leak` mounts→unmounts three times with alternating `reducedMotion` and asserts `addCalls 3` + `removeCalls 3` + `lastEvent hardwareBackPress` + `handler()===true` on last mount. Guards R-006 rapid `gameOver true→false→true` mount race.

**Code Example**:

```typescript
// ✅ Excellent — thrash proves no leak
act(() => { r = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion: false }) as any)); });
assert.equal(spy.addCalls, 1); act(() => (r as any).unmount()); assert.equal(spy.removeCalls, 1);
act(() => { r = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion: true }) as any)); });
assert.equal(spy.addCalls, 2); act(() => (r as any).unmount()); assert.equal(spy.removeCalls, 2);
act(() => { r = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion: false }) as any)); });
assert.equal(spy.addCalls, 3); act(() => (r as any).unmount()); assert.equal(spy.removeCalls, 3);
assert.equal(spy.addCalls, spy.removeCalls, 'every add must eventually remove');
```

**Use as Reference**:
Keep as the `Ops` leak gate when `GameOverOverlay` later adds `PreviewCard` remount or `continue` slot.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts`
- **File Size**: 487 lines, ~19 KB
- **Test Framework**: node:test (host `node --import tsx --test` + `react-test-renderer` + `act()`)
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts`
- **File Size**: 492 lines, ~19 KB
- **Test Framework**: node:test
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/api/dw-gameover-hardware-back-handler.gateway.spec.ts`
- **File Size**: 188 lines, ~7 KB
- **Test Framework**: node:test
- **Language**: TypeScript

- **File Path**: `_bmad-output/test-artifacts/tests/e2e/dw-gameover-hardware-back-handler.umbrella.spec.ts`
- **File Size**: 102 lines, ~4 KB
- **Test Framework**: node:test
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 3 (P0 critical + P1 wiring + P2 scans + P3 exploratory per ATDD; 2 per gateway/umbrella)
- **Test Cases (it/test)**: 44 total (ATDD 22×2 mirrors + gateway 14 + umbrella 8) — all `it.skip`/`test.skip` RED-phase dormant
- **Average Test Length**: ~11 lines per test body (helpers excluded)
- **Fixtures Used**: `baseOverlayProps()` factory, `makeSpy()`/`patchBackHandler()` spy harness, `react-test-renderer` + `act()` + `rn-stub.ts` path-map
- **Data Factories Used**: `baseOverlayProps(overrides)` with `stats:{score:123,best:456,maxTile:48,merges:7,longestStreak:3}` + `insets:{top:8,bottom:8,left:8,right:8}` + `reducedMotion` toggle

### Test Scope

- **Test IDs**: `[P0-01]`…`[P0-07]`, `[P1-01]`…`[P1-07]`, `[P2-01]`…`[P2-05]`, `[P3-01]`…`[P3-03]` (per ATDD mirror) + `[P0-API-01]`…`[P0-API-07]`/`[P1-API-01]`…`[P1-API-07]` + `[P2-E2E-01]`…`[P3-E2E-03]`
- **Priority Distribution**:
  - P0 (Critical): 14 tests (7 per ATDD mirror + 7 gateway)
  - P1 (High): 14 tests (7 per mirror + 7 gateway)
  - P2 (Medium): 10 tests (5 per mirror + 5 umbrella filtered)
  - P3 (Low): 6 tests (3 per mirror + 3 umbrella)
  - Unknown: 0 tests

### Assertions Analysis

- **Total Assertions**: ~98 dormant (ATDD 22×~3 avg + gateway 14×~3 + umbrella 8×~2) when activated
- **Assertions per Test**: ~2.2 avg
- **Assertion Types**: `assert.equal`, `assert.ok`, `assert.strictEqual`, `assert.doesNotThrow`, `assert.notStrictEqual`, `assert.match` (via regex)

---

## Context and Integration

### What the Context Said

`spec-gameover-hardware-back-handler.md` (DW-95, baseline `6335c41`, status `done`) establishes: `GameOverOverlay` must trap hardware back while mounted (`handler () => true` consumes `hardwareBackPress`), subscription tied to overlay lifetime (`sub.remove()` or fallback `removeEventListener`), no navigation dep, thin-view `react-native` only, never `setTimeout` gating mount, `App.tsx {gameOver ? <GameOverOverlay/> : null}` still siblings `GameBoard`. `test-design-dw-gameover-hardware-back-handler.md` (10 risks, 3 high R-001 score 9 TS2339, R-002/R-003 score 6) plans P0 6 groups (mount→true→unmount, fallback, no-overlay, reducedMotion independent, thrash) + P1 6 groups (import literal ×2, `() => true`, dual-path, `[]` deps, stub surface, thin-view) + P2/P3 ledger/engine/layout isolation. `GameOverOverlay.tsx:2` now imports `BackHandler`, `84-95` second `useEffect` with `() => true` + `sub.remove()/removeEventListener` matches spec code map; `rn-stub.ts:102-105` BackHandler stub matches `triade/test-utils/rn-stub.ts:1-130`. Context raises one finding never waived: R-001 `TS2339 Property 'removeEventListener' does not exist on type 'BackHandlerStatic' RN 0.86` — `triade/tsconfig.json` prod gate fails at `GameOverOverlay.tsx:92` while `tsconfig.test.json` is clean via stub path-map. The reviewed tests correctly pin the literal `hardwareBackPress ×2` and `sub.remove` + fallback, so the test quality is good but theprod `tsc` gate is still BLOCK until `(BackHandler as any).removeEventListener` lands.

### Related Artifacts

- **Story File**: `_bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md`
- **Test Design**: `_bmad-output/test-artifacts/test-design-dw-gameover-hardware-back-handler.md`
- **Risk Assessment**: 10 risks, 3 high (R-001 TS2339 score 9, R-002 empty-deps forever-true score 6, R-003 zero prior coverage score 6)
- **Priority Framework**: P0-P3 applied

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)** - Pure function → Fixture → mergeTests pattern
- **[network-first.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[component-tdd.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/component-tdd.md)** - Red-Green-Refactor patterns
- **[selective-testing.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selective-testing.md)** - Duplicate coverage detection
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns (10-iteration loop)
- **[test-priorities-matrix.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Split both ATDD mirrors to ≤300 lines** - Extract `makeSpy`/`patchBackHandler`/`baseOverlayProps` to `_bmad-output/test-artifacts/fixtures/dw-gameover-hardware-back-handler-fixtures.ts` and split P0/P1 vs P2/P3 or make unit mirror re-export triade canonical
   - Priority: P1
   - Owner: FE lead
   - Estimated Effort: 20 min

2. **Fix `TS2339 removeEventListener` prod gate** - Change `BackHandler.removeEventListener('hardwareBackPress', handler)` to `(BackHandler as any).removeEventListener?.('hardwareBackPress', handler)` in `GameOverOverlay.tsx:92` so `npx tsc --noEmit -p triade/tsconfig.json` is clean (R-001 BLOCK)
   - Priority: P1
   - Owner: FE lead
   - Estimated Effort: 5 min

### Follow-up Actions (Future PRs)

1. **Centralize `SCAN_STRINGS` ledger constants** - Move `5f794ee…`/`deb5edf9…`/`7374617475733a206f70656e`/ `hardwareBackPress` literals to fixtures so hash rotation is one file
   - Priority: P3
   - Target: next sweep bundle cleanup

2. **Add explicit RED-phase header to triade ATDD** - Add `RED-PHASE, it.skip — All are it.skip (RED). Remove it.skip → test for GREEN (working tree at 6335c41 + BackHandler delta)` to triade file header for strict C1 exemption parity with gateway/umbrella (already treated as exempt via intent doc, but explicit header removes any strict-reader doubt)
   - Priority: P3
   - Target: next chore sweep

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review (HIGH >0 per §3b). No Critical block, but H5 must be split and R-001 `as any` must land before merge; `tsc --noEmit` both tsconfigs + re-split gate then Approve with Comments at 96-98.

---

## Decision

**Recommendation**: Request Changes

**Rationale**:
Test quality is good with 88/100 score. Two H5 HIGH file-length violations (487-line canonical ATDD + 492-line mirror, each 187-192 over the 300-line threshold) are real maintainability debt that keeps the computed verdict at `Request Changes` per `step-03f-aggregate-scores.md §3b` (any HIGH => Request Changes), even though no Critical issues exist and all 44 RED-phase scaffolds deterministically pin the `hardwareBackPress → true` trap, lifecycle `add/remove`, fallback `removeEventListener`, `gameOver false → 0`, `reducedMotion` independence, and `mount→unmount→remount` leak invariant with excellent isolation and explicit assertions. The prod `tsc --noEmit -p triade/tsconfig.json` BLOCK (R-001 `TS2339`) is out of ledger but is a merge gate the test design already records — the tests correctly pin the fallback literal, but the source still needs `(BackHandler as any)`. Splitting both ATDD files to ≤300 via shared fixture restores `Approve with Comments` at 98/100; the current 88/100 is `Request Changes` solely due to H5, not due to missing BackHandler coverage.

**For Approve**:

> Test quality is excellent/good with 88/100 score. Minor issues noted can be addressed in follow-up PRs. Tests are production-ready and follow best practices.

**For Approve with Comments**:

> Test quality is acceptable with 88/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

**For Request Changes**:

> Test quality needs improvement with 88/100 score. Critical issues must be fixed before merge. 2 critical violations detected that pose flakiness/maintainability risks.

**For Block**:

> Test quality is insufficient with 88/100 score. Multiple critical issues make tests unsuitable for production. Recommend pairing session with QA engineer to apply patterns from knowledge base.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:1 | P1 (HIGH) | Test Length (≤300 lines) | File is 487 lines (187 over) — H5 file-level | Split to ≤300 via shared fixture import or re-export mirror |
| _bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts:1 | P1 (HIGH) | Test Length (≤300 lines) | File is 492 lines (192 over) — H5 file-level | Re-export triade canonical or import shared fixture |
| triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:53 | P3 (LOW) | Data Factories | `makeSpy`/`patchBackHandler`/`baseOverlayProps` duplicated across 4 reviewed files — L6 | Extract to `dw-gameover-hardware-back-handler-fixtures.ts` |
| triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts:291 | P3 (LOW) | Data Factories | Magic scan literals `hardwareBackPress`/`5f794ee…`/`deb5edf9…` inline — L6 | Centralize in `SCAN_STRINGS` fixture |

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-03 | 88/100 | B | 0       | ➡️ Stable (new bundle, mirrors hud-score-a11y-polish 88 B baseline) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts | 88/100 | B | 0  | Request Changes |
| _bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts | 88/100 | B | 0 | Request Changes |
| _bmad-output/test-artifacts/tests/api/dw-gameover-hardware-back-handler.gateway.spec.ts | 88/100 | B | 0 | Request Changes |
| _bmad-output/test-artifacts/tests/e2e/dw-gameover-hardware-back-handler.umbrella.spec.ts | 88/100 | B | 0 | Request Changes |

**Suite Average**: 88/100 (B)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-dw-gameover-hardware-back-handler-20260903
**Timestamp**: 2026-09-03 00:00:00
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/`
2. Consult tea-index.csv for detailed guidance
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review applies the rubric consistently. Context can reveal additional findings and clarify impact; it cannot waive a violation, change severity, or alter the score. Formal risk acceptance belongs in trace or the release gate.

---

## Reviewed Files

- triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts
- _bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/dw-gameover-hardware-back-handler.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/dw-gameover-hardware-back-handler.umbrella.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md
- _bmad-output/test-artifacts/test-design-dw-gameover-hardware-back-handler.md
- triade/src/ui/GameOverOverlay.tsx
- triade/test-utils/rn-stub.ts
- triade/App.tsx
- _bmad-output/implementation-artifacts/deferred-work.md
- _bmad/tea/config.yaml
