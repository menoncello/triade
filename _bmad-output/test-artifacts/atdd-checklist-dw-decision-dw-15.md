---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-06'
workflowType: 'testarch-atdd'
storyId: 'dw-decision-dw-15'
storyKey: 'dw-decision-dw-15'
storyFile: '_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-15.md'
generatedTestFiles:
  - 'triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md'
  - '_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md'
  - '_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-run2.log'
  - '_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-run3.log'
  - '_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-metro.log'
  - '_bmad-output/implementation-artifacts/dw15-logs-20260906/sha256.txt'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-decision-dw-15.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-decision-dw-15 — Physical iOS device boot validation (retry unlocked)

**Date:** 2026-09-06
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Static host (`node:test` + `tsx`) — log/ledger/evidence pins + `git diff` zero-change gate + sha256 durability; device lane itself is manual-validation domain (no Playwright/Cypress harness — Expo RN 57 + Skia, no `page.goto`). Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 — `react`/`react-native`/`expo`/`@shopify/react-native-skia`), but the scenario is framework-free file/log assertions exercised via `node:test`.

---

## Story Summary

`dw-decision-dw-15` executes the human decision on DW-15 (2026-09-06 — *"Run physical boot now"*): re-run `npx expo run:ios --device 00008120-00023C440263C01E` with the iPhone unlocked, then record boot + Skia board render evidence with frame-baseline numbers. Outcome is **PASS-PARTIAL (Debug, agent-side)**: install + launch + JS execution + board-mounted auto-play soak with zero redbox/fatal/crash lines. Pixel-visual confirm + on-screen `fps · p99 · frames` numbers + Release baseline remain **holder-pending by design** (no remote screen-readback channel exists unattended).

**As a** player on a physical iPhone
**I want** the Expo dev build to install, launch, and soak error-free with the Skia 4x4 board mounted via the existing auto-drive path
**So that** on-device boot/render plumbing is proven without touching product code, TestFlight, or App Store submission.

---

## Acceptance Criteria

1. **AC-1 Install + launch** — Given the iPhone is paired and unlocked, when `npx expo run:ios --device` completes, then the app launches on the physical device without a Metro redbox or native crash.
2. **AC-2 Board mount + soak** — Given the app boots on the device, when the auto-drive session reaches the board, then the Skia board mounts and executes moves with zero redbox/crash across the Metro soak; pixel-visual confirm is recorded as holder-pending, never claimed remotely.
3. **AC-3 Evidence on exit** — Given the run finishes (pass or blocked), when the agent exits, then `dw-15-physical-boot-evidence.md` contains the retry outcome with device identity plus baseline numbers, a holder-pending note with reason, or the verbatim blocking error.

---

## Story Integration Metadata

- **Story ID:** `dw-decision-dw-15` (bundle; spec `baseline_revision: 5f6affd`, `final_revision: 3f6b56b`, status `done` post-loop)
- **Story Key:** `dw-decision-dw-15`
- **Story File:** `_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-15.md`
- **Generated Test Files:**
  - `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts` (NEW — 15 RED-phase scaffolds, `it.skip` dormant, host `node:test` + `tsx`; 9 P0 + 3 P1 + 3 P2-manual)
- **Working-tree delta covered:**
  - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-15 `open → done 2026-09-06` + `resolution: resolved by sweep bundle dw-decision-dw-15` + `resolution-undo: 923d8da75ac945a8a1351bd8d57a0ee3b2acca61362b1b8fd4292f4335a4769c` 64-hex + `decision: 2026-09-06 Run physical boot now …` (the ONLY unstaged change: `git diff --stat` = 1 file).
  - Committed bundle at HEAD already assessed retrospectively: `3f6b56b` (evidence retry § + `dw15-logs-20260906/` run2/run3/metro + sha256 + spec) + `c5aae4e` (final_revision stamp).
  - `git diff HEAD -- triade/` is **empty** — zero production-code change by design (spec `Always` boundary).
  - `sprint-status.yaml` NOT written (orchestrator-owned — verified via `git diff --name-only`).

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm --prefix triade test`)
- **No Playwright/Cypress harness:** scenario is log/ledger/evidence file pins + `git`/`sha256` shell gates; device lane is holder-manual per project-context rule (CI covers pure, device covers gesture/pixel — never the inverse). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia project, not a web Playwright flow).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`

---

## Red-Phase Test Scaffolds Created

### Host Tests (15 tests, `node:test` + `tsx`)

**File:** `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts` (~200 lines, 3 suites)

All 15 are `it.skip` dormant scaffolds — RED-phase. When P0/P1 are activated (`it.skip` → `it`) they assert the **expected** post-run hardened state; before the `3f6b56b` bundle they would fail (no logs/evidence/spec, ledger still `open`). With the working-tree delta they **PASS** (see Execution Evidence). P2 MANUAL items stay `skip` until a holder is present — they intentionally `assert.ok(false)` with device-side instructions. This is the correct TDD inversion: P0/P1 document the contract the landed bundle already satisfies; P2 documents the holder gate that cannot pass unattended.

#### P0 Critical — Install/launch/soak/ledger pins (9 tests)

- ✅ **Test:** `[P0-01] ledger DW-15 done 2026-09-06 with sweep-bundle resolution and undo hash`
  - **Status:** RED (skip) — before: `status: open`; after: `done 2026-09-06` + `resolution: resolved by sweep bundle dw-decision-dw-15` + 64-hex `resolution-undo` + `decision: 2026-09-06 Run physical boot now`
  - **Verifies:** `deferred-work.md` DW-15 section, AC-3 ledger closure (test-design R-008).
- ✅ **Test:** `[P0-02] zero production-code change — git diff HEAD -- triade/ is empty`
  - **Status:** RED — any `triade/` edit fails it; spec `Always` boundary pins it empty
  - **Verifies:** `git diff HEAD -- triade/` + `git diff --name-only` contain no `triade/` path (R-006).
- ✅ **Test:** `[P0-03] run2 install+launch pins — build SUCCEEDED, 0 errors, install path, log tail`
  - **Status:** RED — before: no `dw15-run2.log`; after: `› Build Succeeded` + `› 0 error(s)` + DerivedData `Debug-iphoneos/triade.app` install + `› Logs for your project will appear below.`
  - **Verifies:** `dw15-run2.log:31,33,38,41`, AC-1 (R-003).
- ✅ **Test:** `[P0-04] independent devicectl launch corroboration recorded`
  - **Status:** RED — before: single-launch claim; after: `--device <UDID> com.menontech.triade` + `Launched application with … bundle identifier` in evidence
  - **Verifies:** dual-launch corroboration ~20:28, AC-1 (R-003).
- ✅ **Test:** `[P0-05] Metro serves the on-device bundle — index + lazy game-path chunks`
  - **Status:** RED — before: no bundle proof; after: `iOS Bundled … index.ts` + lazy `expo-haptics`/`expo-audio` chunks + log-tail header
  - **Verifies:** `dw15-metro.log:7-12,25-26`, JS executed on device (R-003).
- ✅ **Test:** `[P0-06] zero redbox/fatal/crash across run2 + metro soak (excl. triaged warnings)`
  - **Status:** RED — any untriaged `redbox|fatal|crash|error` line fails it; known-benign `› 0 error(s)` summary, worklets warnings, and admob config warning are excluded
  - **Verifies:** ~17 min wall-clock soak error-freedom, AC-2 (R-003).
- ✅ **Test:** `[P0-07] worklets boot warnings triaged benign, not counted as failures`
  - **Status:** RED — expects exactly 4+4 `Tried to modify key` lines + `worklet` triage note in evidence
  - **Verifies:** pre-existing boot-time warnings benign for boot verdict; hardening outside DW-15 scope.
- ✅ **Test:** `[P0-08] lock-gate honesty — run3 device-locked block quoted verbatim, no retry loop`
  - **Status:** RED — before: lock-gate asserted-not-shown; after: `› Build Succeeded` then verbatim `device is locked` in run3 + quoted in evidence with per-source label
  - **Verifies:** `dw15-run3.log:39,49`, spec DEVICE_LOCKED_AGAIN row (R-004).
- ✅ **Test:** `[P0-09] log durability — 3 logs pinned with verifiable sha256, no /tmp refs`
  - **Status:** RED — before: volatile /tmp refs; after: `dw15-run2.log`/`dw15-run3.log`/`dw15-metro.log` exist and each hash appears in `sha256.txt`
  - **Verifies:** durable proof replacing /tmp (R-007).

#### P1 Wiring — Evidence/spec/handoff (3 tests)

- ✅ **Test:** `[P1-01] evidence retry section complete — identity + outcome + reasoning + checklist + handoff`
  - **Status:** RED — pins `iPhone 14 Pro` + identifier + UDID + `26.6.1` + `inferred-strong` + `holder-pending` + Metro PID/port handoff
  - **Verifies:** evidence retry § completeness (R-001, R-002, R-004, R-007).
- ✅ **Test:** `[P1-02] spec AC bar is the amended remotely-verifiable one (AC2/AC3 holder-pending)`
  - **Status:** RED — pins `PASS-PARTIAL` + `holder-pending` + `DEVICE_LOCKED_AGAIN` + `Never:` boundaries
  - **Verifies:** review pass-1 amended bar, no pixel/number overclaim.
- ✅ **Test:** `[P1-03] sprint-status.yaml untouched — orchestrator-owned invariant`
  - **Status:** RED — any `sprint-status` entry in `git diff --stat`/`--name-only` fails it
  - **Verifies:** orchestrator bookkeeping boundary (R-008).

#### P2 Manual — Holder-eyes, stays skip until holder present (3 tests)

- ✅ **Test:** `[P2-01 MANUAL] holder visual — Skia 4x4 visibly rendering while auto-drive plays`
  - **Status:** MANUAL skip — relaunch via devicectl while Metro is up, photo or written confirm appended to evidence. Never edit to pass remotely.
  - **Verifies:** closes R-001 (checklist item 1).
- ✅ **Test:** `[P2-02 MANUAL] holder readout — verbatim on-screen fps · p99 · frames (Debug)`
  - **Status:** MANUAL skip — copy overlay digits verbatim; never invent numbers. Debug-only.
  - **Verifies:** closes R-002 (checklist item 2); DW-16 consumes numbers.
- ✅ **Test:** `[P2-03 MANUAL] Release rerun tracked as a separate future run, not claimed here`
  - **Status:** MANUAL skip — asserts evidence tracks the Release item, then fails by design until the future lane runs.
  - **Verifies:** Debug-only scope honesty (R-005, checklist item 3).

---

## Data Factories Created

Not applicable to this device-lane decision (per `test-design-dw-decision-dw-15.md`):
- **No data factories / `@faker-js/faker`** — inputs are pinned device identity (iPhone 14 Pro `DD0414C7-175F-54F0-B474-42F213FD3ABD` / UDID `00008120-00023C440263C01E`, iOS 26.6.1) + log/ledger/evidence files on disk. No new factory file — tests `readFileSync` the durable artifacts directly.

---

## Fixtures Created

Not applicable — file/log assertions + shell gates, no Playwright fixtures / browser automation:
- **No Playwright fixture / `test.extend`** — host `node:test` + `tsx` with `readFileSync` + `execSync(git)` + `createHash(sha256)`; RN Expo project, no `page.goto`.
- **No external service mocking** — no I/O beyond local artifact reads; device interaction is holder-manual (P2).

---

## Mock Requirements

None. No UI surface mocks — static file pins + `git`/`sha256` gates cover the automatable seam. The only consumers are the holder-eyes checklist (board photo, fps readout, Release rerun) — verified by human eyes on the unlocked phone, not by mocked endpoints.

---

## Required data-testid Attributes

None — no component is mounted in these host tests; `GameBoard.tsx` Skia pixels are holder-visual (P2-01), not a test-id selector seam.

---

## Implementation Checklist

Maps directly to the working-tree delta (ledger `deferred-work.md` DW-15 resolution only) plus the committed `3f6b56b`/`c5aae4e` bundle assessed retrospectively. Each scaffold's GREEN task is the artifact change that makes it pass — for this completed run the P0/P1 tasks are **already done** (bundle landed at HEAD, ledger resolution in working tree; activated P0+P1 now GREEN). P2 tasks are holder-pending and stay open. Keep the checklist as the red→green roadmap for any re-run.

### Test: [P0-01] Ledger DW-15 done + resolution + undo hash

**File:** `_bmad-output/implementation-artifacts/deferred-work.md` (DW-15 section)

**Tasks to make this test pass (DONE in working tree):**
- [x] Set `status: done 2026-09-06` (was `open`)
- [x] Add `resolution: resolved by sweep bundle dw-decision-dw-15`
- [x] Add `resolution-undo: 923d8da75ac945a8a1351bd8d57a0ee3b2acca61362b1b8fd4292f4335a4769c 2026-09-06 7374617475733a206f70656e`
- [x] Keep `decision: 2026-09-06 Run physical boot now — …` line intact
- [x] Run test: activate `it.skip` → `it` for P0-01 → green
- [x] ✅ Test passes

**Estimated Effort:** 0.1h (orchestrator-owned edit; TEA only pins it)

---

### Test: [P0-02] Zero production-code change

**File:** (no file — invariant over `git diff HEAD -- triade/`)

**Tasks:**
- [x] Verify `git diff HEAD -- triade/` is empty (no product code touched per spec `Always`)
- [x] Verify `git diff --name-only` lists only `deferred-work.md` (+ untracked artifact/test files, never `triade/`)
- [x] If a future lane touches code, re-run `npx tsc --noEmit` in `triade/` (skipped here — nothing touched)
- [x] ✅ Test passes

**Estimated Effort:** 0.1h

---

### Tests: [P0-03..05] run2 install+launch + devicectl corroboration + Metro bundle

**Files:** `_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-run2.log`, `dw15-metro.log`, `dw-15-physical-boot-evidence.md` (committed at `3f6b56b`)

**Tasks (DONE at HEAD):**
- [x] `npx expo run:ios --device 00008120-00023C440263C01E` with phone unlocked → `› Build Succeeded`, `› 0 error(s)`, install `Debug-iphoneos/triade.app`, `› Logs for your project will appear below.` (run2)
- [x] Independent `xcrun devicectl device process launch --device … com.menontech.triade` → `Launched application …` quoted in evidence (P0-04)
- [x] Metro serves `iOS Bundled … index.ts` + lazy `expo-haptics`/`expo-audio` chunks (P0-05, module drift 1407 vs 1319 explained as dev-client vs expo-start entry)
- [x] ✅ All three tests pass

**Estimated Effort:** 0.5–1.0h device session (already spent 2026-09-06; re-run only if logs ever need regenerating)

---

### Tests: [P0-06..07] Zero-error soak + worklets triage

**Files:** `dw15-run2.log`, `dw15-metro.log`, evidence triage note

**Tasks (DONE at HEAD):**
- [x] Grep `redbox|fatal|crash|error` (case-insensitive) over run2+metro → empty after excluding the `› 0 error(s)` build-summary PASS line, the 4+4 `Tried to modify key` worklets boot warnings, and the admob `ios_app_id key not found` config warning
- [x] Evidence triages worklets lines as pre-existing boot-time noise, benign for boot verdict; hardening explicitly out of DW-15 scope
- [x] ✅ Both tests pass

**Estimated Effort:** 0.2h

---

### Tests: [P0-08..09] Lock-gate verbatim + log durability

**Files:** `dw15-run3.log`, `dw15-logs-20260906/sha256.txt`, evidence excerpts

**Tasks (DONE at HEAD):**
- [x] Quote run3 `device is locked` verbatim block (`20:24:27→20:25:21`) with `[run3]` per-source label; no retry loop (P0-08)
- [x] Keep durable copies of all 3 logs + `sha256.txt`; verify with `sha256sum -c`; no `/tmp` refs in evidence (P0-09)
- [x] ✅ Both tests pass

**Estimated Effort:** 0.2h

---

### Tests: [P1-01..03] Evidence completeness + spec bar + sprint-status invariant

**Files:** `dw-15-physical-boot-evidence.md`, `spec-dw-15-physical-ios-boot-2.md`, `git diff`

**Tasks (DONE at HEAD / working tree):**
- [x] Evidence retry § carries device identity + run narrative + inferred-strong board reasoning + holder-pending checklist + verbatim excerpts + handoff (PID 14623, port 8081, relaunch fallback, guarded cleanup) + expiry note (P1-01)
- [x] Spec outcome reads PASS-PARTIAL with amended AC2/AC3 (mount + error-free soak, pixels/numbers holder-pending) + full `Never`/`Block If` boundaries (P1-02)
- [x] Never write `sprint-status.yaml` — verify `git diff --stat` shows no `sprint-status` (P1-03)
- [x] ✅ All three tests pass

**Estimated Effort:** 0.2h (review only)

---

### Tests: [P2-01..03] Holder-eyes manual lane (OPEN — holder present required)

**Files:** holder appends to `dw-15-physical-boot-evidence.md`; future Release run

**Tasks (NOT done — pending holder window):**
- [ ] **P2-01** While Metro is up (`lsof -iTCP:8081`) and phone unlocked, relaunch `xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade`, watch auto-drive play, capture Skia 4x4 photo or written confirm → append to evidence checklist item 1. If Metro died, re-run `expo run:ios --device` (cached build). Activate P2-01 only after the photo/note lands (replace `assert.ok(false)` with the evidence-path assertion).
- [ ] **P2-02** Copy the verbatim on-screen `fps · p99 · frames` Debug readout into evidence checklist item 2. Never invent numbers. (DW-16 consumes them.)
- [ ] **P2-03** Schedule the separate Release rerun + readout (checklist item 3); until it exists P2-03 stays red by design.
- [ ] Guarded cleanup when done: `kill -0 14623 && kill 14623; lsof -ti:8081 | xargs kill` (verify PID/port first — never blind-kill).

**Estimated Effort:** 0.5–1.0h active + holder wait (auto-lock re-engages in minutes — expiry noted in evidence)

---

## Running Tests

```bash
# Run the dormant RED scaffolds (all 15 skip — proves presence + harness, changes nothing)
cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/device/dw-15-physical-ios-boot.atdd.test.ts
# → tests 15, pass 0, skipped 15 (expected before activation)

# Activate P0+P1 for the current task (leave P2 MANUAL skipped), confirm GREEN:
python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts'); t=p.read_text().replace(\"it.skip('[P0\", \"it('[P0\").replace(\"it.skip('[P1\", \"it('[P1\"); pathlib.Path('/tmp/dw15-active.test.ts').write_text(t)" && cp /tmp/dw15-active.test.ts triade/__tests__/device/dw-15-physical-ios-boot.atdd.active.test.ts && npm --prefix triade test -- __tests__/device/dw-15-physical-ios-boot.atdd.active.test.ts && rm triade/__tests__/device/dw-15-physical-ios-boot.atdd.active.test.ts
# → tests 15, pass 12, skipped 3 (P2 MANUAL holder-pending), fail 0

# Host PR gate (<15 min, no device needed):
git diff --stat  # only deferred-work.md (+ untracked artifacts/tests)
git diff HEAD -- triade/  # empty
sha256sum -c _bmad-output/implementation-artifacts/dw15-logs-20260906/sha256.txt
npm --prefix triade test  # engine 26-test gate unaffected (zero code change)

# Device lane (on-demand, holder present, ~30–60 min):
# xcrun devicectl list devices  (expect iPhone 14 Pro DD0414C7-… available (paired))
# cd triade && npx expo run:ios --device 00008120-00023C440263C01E
# xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade
# EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1 npx expo start  (watch Metro; grep redbox|fatal|crash excl. worklets)
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 15 tests written as red-phase scaffolds with `it.skip()` (TDD red phase — `node:test` skip is the `test.skip()` analogue; outer `describe` is the suite runner)
- ✅ No factories/fixtures needed beyond the durable artifact files + pinned device identity
- ✅ Mock requirements documented (none — file/log pins suffice)
- ✅ data-testid requirements listed (none — holder-visual, not selectors)
- ✅ Implementation checklist created (9 P0 + 3 P1 + 3 P2-manual tasks)

**Verification:**

- All 15 generated tests are present and marked `it.skip()` (dormant run: `tests 15 / skipped 15 / fail 0`)
- Activation guidance is clear (P0/P1 `it.skip → it` per task; P2 MANUAL stays skip until holder present)
- Activated P0+P1 would fail before the `3f6b56b` bundle (no logs/evidence/spec, ledger `open`) — now PASS because the working-tree delta implements them (activated run: `pass 12 / skipped 3 / fail 0`)
- P2 MANUAL items intentionally fail when force-activated (`assert.ok(false)` with device-side instructions) — they gate the holder window, not code
- This is INTENTIONAL (TDD red phase for the automatable seam; manual gate for the pixel/numbers seam)

---

### GREEN Phase (DEV Team — Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from the implementation checklist (start with P0-01 ledger pin — highest priority, already green, verify only)
2. **Remove `it.skip` → `it`** for that test and confirm it fails first on the pre-bundle tree (or passes now — the bundle already landed; record which)
3. **Read the test** to understand expected behaviour (log line, ledger line, evidence section, or shell gate)
4. **Implement minimal change** to make that specific test pass (see Checklist task for file:line — for this bundle: ledger resolution line only; P0-03..P1-02 already landed at HEAD)
5. **Run the test** to verify green (activated-file procedure above)
6. **Check off the task** in the implementation checklist
7. **Move to next test** and repeat — leave P2 MANUAL for the holder session

**For this completed run:** every P0/P1 GREEN task is already DONE (bundle at HEAD + ledger resolution in working tree; activated run proves GREEN: 12 pass). P2 stays open for the holder. Keep the one-at-a-time rule for any future re-run.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (ledger 3-line resolution; no product code — `triade/` diff stays empty)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all automatable tests pass** (green phase complete — 12/12 activated P0+P1, plus full `npm test` gate unaffected)
2. **Review evidence for quality** (per-source `[run2]/[metro]/[launch]` labels, exact log-file times not approximates, `inferred-strong` never `observed`, numbers never invented)
3. **Extract duplications** (none — single evidence file, single log dir, single ledger entry; `rg` pins catch drift)
4. **Optimize performance** (n/a — no code; device lane stays on-demand, never a PR gate)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays green; dormant ATDD stays 15 skipped)
6. **Update documentation** (append holder evidence to `dw-15-physical-boot-evidence.md` when P2 lands; link to DW-16 for numbers)

**Completion:**

- All automatable tests pass (12/12 P0+P1; P2 tracked as holder-pending, not failed)
- No duplications or overclaims (pixels `inferred-strong`, fps UNKNOWN, soak residual disclosed, Debug-only labeled)
- `sprint-status.yaml` not written
- Ready for review and DW-15 closure sign-off once P2 lands

---

## Next Steps

1. **Link this checklist and generated tests** into the spec `Auto Run Result` / evidence handoff section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md`)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required; R-001/R-002 holder-gated PASS-PARTIAL)
4. **Begin implementation** using the implementation checklist as guide — P0/P1 already in working tree (activated run proves GREEN: 12 pass)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm RED-before / GREEN-after as documented
6. **Run the holder session** for P2-01..03 (unlocked phone + Metro up + ~30–60 min window; auto-lock expiry noted)
7. **When P2 lands**, append photo/readout to evidence, flip P2 scaffolds to assert the evidence paths, and route numbers to DW-16
8. **Never touch `sprint-status.yaml`** — orchestrator-owned

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-decision-dw-15.md` + TEA config):

- **test-levels-framework.md** — Level selection: static host pins (log/ledger/evidence/`git`/sha256) vs device-manual (holder eyes) vs deferred Release lane; Playwright/E2E intentionally absent (RN Skia, no web surface).
- **test-priorities-matrix.md** — P0 (boot/launch/soak/ledger, 9) / P1 (reasoning/durability/handoff, 3) / P2 (holder-eyes + Release, 3-manual) per risk scores R-001..R-003 ≥6.
- **risk-governance.md / probability-impact.md** — 8 risks (3 high: inferred-strong pixels, unrecorded fps, Metro-silence soak) gated as holder-pending PASS-PARTIAL, never full closure.
- **nfr-criteria.md** — NFR planning (boot reliability, error-free soak, frame baseline UNKNOWN, zero-change, lock handling, evidence durability) informing P0/P1/P2 levels.
- **component-tdd.md** — Host TDD contract (red-phase `it.skip` scaffolds, one behavioural pin per test, determinism via pinned files/hashes).
- **test-quality.md** — Given-When-Then per test, isolation via file reads (no shared state), determinism via sha256 + verbatim log lines.
- **data-factories.md / fixture-architecture.md / network-first.md** — Assessed, not applied (no factories, no `test.extend`, no network interception — file/log seam).
- **Playwright utils (`tea_use_playwright_utils:true`)** — Loaded per config but not applied (no `page.goto` — RN Skia project).

See `_bmad-output/test-artifacts/test-design/test-design-dw-decision-dw-15.md` Sections "Risk Assessment" (8 risks, 3 high) and "NFR Planning" for the thresholds that informed P0/P1/P2 levels.

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification (dormant, expected skip)

**Command:** `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/device/dw-15-physical-ios-boot.atdd.test.ts`

**Results:**
```
▶ ATDD dw-15 physical boot — P0 critical (install/launch/soak/ledger)
  ﹣ [P0-01] … # SKIP (×9)
✔ ATDD dw-15 physical boot — P0 critical (1.48ms)
▶ ATDD dw-15 physical boot — P1 wiring (evidence/spec/handoff)
  ﹣ [P1-01] … # SKIP (×3)
✔ ATDD dw-15 physical boot — P1 wiring (0.23ms)
▶ ATDD dw-15 physical boot — P2 manual (holder-eyes, stays skip until holder present)
  ﹣ [P2-01 MANUAL] … # SKIP (×3)
✔ ATDD dw-15 physical boot — P2 manual (0.32ms)
ℹ tests 15
ℹ suites 3
ℹ pass 0
ℹ fail 0
ℹ skipped 15
ℹ todo 0
ℹ duration_ms ~171ms

Summary:
- Total tests: 15 (3 suites pass + 15 inner skipped)
- Skipped: 15 (expected before activation — RED scaffolds dormant)
- Status: ✅ Red-phase scaffolds verified (all present, all it.skip, correct harness node:test + tsx)
```

### Activated Run / GREEN Verification (P0+P1 activated, P2 MANUAL stays skip)

**Command:** copy to `dw-15-physical-ios-boot.atdd.active.test.ts` with `it.skip('[P0` → `it('[P0` and `it.skip('[P1` → `it('[P1`, run, delete copy.

**Results:**
```
▶ ATDD dw-15 physical boot — P0 critical (install/launch/soak/ledger)
  ✔ [P0-01] … [P0-09] (9 pass)
▶ ATDD dw-15 physical boot — P1 wiring (evidence/spec/handoff)
  ✔ [P1-01] … [P1-03] (3 pass)
▶ ATDD dw-15 physical boot — P2 manual (holder-eyes, stays skip until holder present)
  ﹣ [P2-01 MANUAL] … # SKIP (×3)
ℹ tests 15
ℹ suites 3
ℹ pass 12
ℹ fail 0
ℹ skipped 3
ℹ todo 0

Summary:
- P0 9/9 GREEN (working-tree delta + HEAD bundle satisfy every pin)
- P1 3/3 GREEN (evidence/spec/handoff complete; sprint-status untouched)
- P2 3/3 skipped by design (holder window required; force-activation fails on assert.ok(false) with device instructions)
```

**Fixes applied during activation (documented, not hidden):** P0-06 initially matched the benign `› 0 error(s)` build-summary PASS line as an error signal — excluded via `› 0 error(s)` filter. P0-07 initially matched zero worklets lines because the scaffold used straight-quote `'current'` while logs use backtick `` `current` `` — corrected to quote-agnostic `Tried to modify key`. Both corrections verified in the final 12-pass run above.
