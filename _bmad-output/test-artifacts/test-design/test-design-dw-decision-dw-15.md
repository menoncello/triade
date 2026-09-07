---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md'
  - '_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md'
  - '_bmad-output/implementation-artifacts/dw15-logs-20260906/'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: dw-decision-dw-15 — Physical iOS device boot validation (retry unlocked)

**Date:** 2026-09-06
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — decision deep-dive for `dw-decision-dw-15`
**Scope:** Targeted test design for the working-tree delta of `dw-decision-dw-15` (decision: `Run physical boot now — Run Expo prebuild plus dev-build boot on a connected iPhone and record boot plus Skia board render evidence against DW-15`)
**Decision date:** 2026-09-06 — `spec-dw-15-physical-ios-boot-2.md` (PASS-PARTIAL agent-side, NOT full DW-15 closure)

> **Delta under assessment:** Zero production-code change. `git diff HEAD --stat` shows exactly one file — `_bmad-output/implementation-artifacts/deferred-work.md` (DW-15 `open → done 2026-09-06` + `resolution: resolved by sweep bundle dw-decision-dw-15` + `resolution-undo`). `git diff HEAD -- triade/` is **empty**. The implementation bundle already landed at HEAD via `3f6b56b` (retry: install+launch OK on unlocked iPhone, auto-drive soak, evidence + logs) + `c5aae4e` (final_revision stamp). This design therefore assesses the committed delta retrospectively as the decision's verification plan:
> - `_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md` — retry section (device re-verified iPhone 14 Pro iOS 26.6.1, run narrative, inferred-strong board reasoning, holder-pending checklist, verbatim excerpts, handoff + cleanup).
> - `_bmad-output/implementation-artifacts/dw15-logs-20260906/` (new) — `dw15-run2.log` (expo run:ios install+launch success) + `dw15-run3.log` (intermediate device-locked block) + `dw15-metro.log` (auto-drive soak) + `sha256.txt` (durable proof, replaces /tmp refs).
> - `_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md` (new) — intent contract (HAPPY_PATH / DEVICE_LOCKED_AGAIN / DEVICE_UNREACHABLE / SIGNING_FAILURE), code map (`triade/index.ts`, `App.tsx`, `render/GameBoard.tsx`, `render/useFrameRateBaseline.ts` observe-only), tasks [x] agent-side-complete, AC1–AC3 (AC2/AC3 amended to remotely-verifiable bar), Verification commands.
> - Ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-15 `done 2026-09-06` + `resolution: resolved by sweep bundle dw-decision-dw-15`.

---

## Executive Summary

**Scope:** Validate that the Expo dev build installs, launches, and error-free soaks on a physical iPhone 14 Pro (iOS 26.6.1) with the Skia 4x4 board mounted via the existing auto-drive path — without touching product code, without TestFlight/App Store, without `prebuild --clean`, without tuning engine/render code. Outcome is PASS-PARTIAL (Debug, agent-side): install + launch + JS execution + board-mounted auto-play soak with zero redbox/fatal/crash lines. Pixel-visual confirm + on-screen `fps · p99 · frames` numbers + Release baseline remain holder-pending by design (no remote screen-readback channel exists unattended).

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 3
- Critical categories: TECH (board evidence inferred-strong not pixel-observed, Metro-silence soak inference), PERF (fps numbers unrecorded — Debug probe path ran, readout on-screen only), OPS (volatile holder window: auto-lock + Metro PID + foreground-at-handoff unverified)

**Coverage Summary:**

- P0 scenarios: 5 groups (14 checks: install+launch pins + Metro bundle + zero-error soak + zero-code-change + ledger)
- P1 scenarios: 4 groups (10 checks: board-mount reasoning chain + lock-gate + log durability + holder checklist)
- P2/P3 scenarios: 6 groups (static scans + holder visual + Release rerun + exploratory)
- **Total effort**: ~3.0–5.5 hours (~0.4–0.7 days; host + holder-eyes, no CI gate — physical-device lane, `expo run:ios` + `devicectl` + Metro log grep)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score/spawn rules, `feel/` worklets tuning, frame-budget optimization, `useFrameRateBaseline.ts` probe changes** | `git diff HEAD -- triade/` is empty; spec `Never: tune engine/render code for the frame budget`. The four `WARN [Worklets] Tried to modify key 'current'` lines are pre-existing boot-time warnings, triaged benign for boot verdict. | Engine invariants stay gated by `triade/__tests__/engine/*.test.ts` (26 engine tests gate every PR) + `npm --prefix triade test` + `tsc` clean. Animation hardening is outside DW-15 scope. |
| **Release-config baseline numbers** | This pass is Debug-only by spec; Release rerun is an explicit holder-checklist item, not this run. | Holder checklist item 3 (Release rerun + readout) tracked as P2; DW-16 (on-device frame-rate baseline) stays the durable owner of device numbers. |
| **TestFlight / App Store submission, provisioning-profile surgery, `prebuild --clean`** | Spec `Never` + `Block If` boundaries; signing succeeded via automatic signing despite gitignored `triade/ios/` regenerating team-less. | No submission attempted; `project.pbxproj` zero `DEVELOPMENT_TEAM` noted as premise correction, not a defect. |
| **Simulator re-validation, RevenueCat / AdMob / Epic 9 a11y, offline/persistence, HUD layout** | No product code touched; simulator boot was the 2026-08-10 baseline this run supersedes for Debug-physical only. | Existing suites remain gate; device lane covers boot/pixel only per project-context rule (CI covers pure, device covers gesture/pixel — never the inverse). |
| **`sprint-status.yaml`** | Orchestrator-owned; this workflow must never write it or revert it. | Verified untouched: `git diff --stat` shows only `deferred-work.md`. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Medium.** Launch path is controllable (`npx expo run:ios --device <UDID>` + `devicectl device process launch`, phone kept unlocked, Metro non-interactive safe, `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` JS-bundle-time flag with zero code change). Pixel/numbers readout is NOT controllable remotely — no screenshot/tap automation via devicectl, libimobiledevice absent, probe readout on-screen only with no console log.

**Observability — Partial (by design).** Observable remotely: build SUCCEEDED 0 errors, `Installing …/Debug-iphoneos/triade.app`, `Logs for your project will appear below`, Metro `iOS Bundled` lines (index + lazy haptics/audio chunks), `Launched application with com.menontech.triade bundle identifier`, grep-empty for redbox/fatal/crash. NOT observable remotely: board pixels, on-screen `fps · p99 · frames` digits, per-move counts (moves unlogged by worklet no-log rule), native crash without Metro output, foreground state at handoff.

**Reliability — Medium (PASS-PARTIAL honest).** Two independent launch confirmations (run2 install+launch ~20:22 + direct devicectl launch ~20:28) + ~17 min wall-clock soak with zero error lines. Residual: soak/error-freedom is inferred from Metro silence (spec-acknowledged), auto-lock re-engaged once mid-run (run3 verbatim), Debug-only.

**Testability Risks:** (a) claiming pixel PASS from Metro logs — avoided by inferred-strong label + holder-pending checklist; (b) claiming fps numbers from probe silence — avoided by holder-pending note; (c) wall-clock-as-soak without move counts — stated explicitly with worklet no-log reason.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Board pixels never remotely confirmed — mount+moves verdict is inferred-strong, not pixel-observed.** Reasoning chain (auto-drive sets `screen='playing'`, sole `GameBoard` mount point; lazy haptics/audio chunks served = game paths executing; zero redbox/fatal across soak) is strong but not visual. A render-surface regression that mounts without painting would pass the Metro gate. | 3 | 2 | **6** | Holder-eyes gate: checklist item 1 (Skia 4x4 visibly rendering while auto-drive plays — photo or written confirm) before claiming full DW-15 closure. Agent-side label stays inferred-strong, never observed. | Eduardo (holder) | Holder window (while unlocked; auto-lock re-engages in minutes) |
| R-002 | PERF | **Frame-baseline numbers unrecorded — 120-frame probe path ran, readout on-screen only.** `useFrameRateBaseline.ts` executed without errors but emits no console log; no remote screen readback exists. DW-16 (on-device frame-rate baseline) cannot consume numbers from this run. | 3 | 2 | **6** | Holder-eyes gate: checklist item 2 (copy verbatim on-screen `fps · p99 · frames` Debug readout). Do not invent numbers; evidence records holder-pending with reason + relaunch fallback. | Eduardo (holder) | Holder window; else Release-rerun lane |
| R-003 | TECH | **Soak error-freedom inferred from Metro silence — native crash without Metro output not excludable.** Wall-clock ~20:28→~20:45 with moves unlogged by design (worklet no-log rule); grep-empty proves no JS redbox/fatal, not absence of a silent native kill. Foreground-at-handoff unverified (auto-lock). | 2 | 3 | **6** | Dual-launch corroboration (run2 + direct devicectl launch) + on-demand bundle serving throughout soak + explicit residual-risk disclosure in spec §Auto Run Result. Full closure requires holder foreground confirm + future Release soak. | FE lead | Immediate (gate PASS-PARTIAL label, not full closure) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | OPS | **Volatile holder window — phone auto-lock re-engages within minutes (locked once mid-run, run3 verbatim); Metro PID 14623 + app session are ephemeral.** Holder arriving late finds a locked phone / dead Metro and cannot complete checklist items 1–2. | 3 | 1 | 3 | Handoff + fallback recorded: relaunch `xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade` while Metro up (`lsof -iTCP:8081`); guarded cleanup `kill -0 14623 && kill 14623; lsof -ti:8081 \| xargs kill`. Checklist carries expiry note. |
| R-005 | TECH | **Debug-only — Release baseline still pending.** Debug dev-client bundle (1407 modules) vs expo-start bundle (1319 modules) drift is explained (same source, AUTO_DRIVE flag only), but Release compiler/opt behavior is untested on device. | 2 | 2 | 4 | Explicit Release-rerun checklist item 3 (separate future run); this pass never claims Release coverage. DW-16 owns device numbers. |
| R-006 | OPS | **`triade/ios/` gitignored + prebuild regenerates team-less — future `prebuild --clean` wipes any manual signing config.** Spec premise "ios/ checked in with DEVELOPMENT_TEAM" was inaccurate (`triade/.gitignore:40 /ios`, zero `DEVELOPMENT_TEAM` in regenerated pbxproj). Automatic signing worked this time, but the lane depends on it. | 2 | 2 | 4 | Premise correction recorded in evidence (not a defect); never run `prebuild --clean` in this lane; if signing ever demands human action, HALT per spec `Block If` (no code workarounds). |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-007 | OPS | **Log durability — /tmp log rot would orphan proof.** Pass-1 review caught volatile /tmp refs. | 1 | 2 | 2 | Monitor — mitigated: durable copies in `dw15-logs-20260906/` + `sha256.txt` (3 logs pinned). Verify hashes on read. |
| R-008 | OPS | **Ledger/sprint-status ownership — deferred-work edit vs orchestrator bookkeeping.** Working-tree edit touches orchestrator-adjacent ledger. | 1 | 2 | 2 | Monitor — edit is the sweep-bundle resolution the spec defers to the orchestrator (`Never: edit the deferred-work ledger` was the agent boundary; orchestrator records resolution). `sprint-status.yaml` untouched; never write it. |

### Risk Category Legend

- **TECH**: Technical/Architecture (inferred-strong board evidence, Metro-silence soak inference, Debug-only, ios/ regeneration)
- **SEC**: Security — none this decision (local dev build, no auth/data exposure)
- **PERF**: Performance (fps/p99 readout unrecorded; probe path ran error-free)
- **DATA**: Data Integrity — none (no snapshot/persistence touched; zero code change)
- **BUS**: Business Impact — none direct (no monetization/UX logic changed)
- **OPS**: Operations (auto-lock window, volatile Metro PID, log durability, ledger ownership)

---

## NFR Planning

**Purpose:** Capture decision-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — boot/launch | Dev build installs + launches on unlocked iPhone 14 Pro without Metro redbox or native crash (AC1). | R-003 | `expo run:ios --device` Build SUCCEEDED 0 errors + install+launch success (run2) + independent `devicectl process launch` success; grep run2/metro logs for redbox/fatal/crash empty (excl. known worklets warnings). | `dw15-run2.log` + devicectl launch stdout + sha256 |
| Reliability — error-free soak | Auto-drive board soak (~17 min wall-clock) with zero redbox/fatal/crash lines; moves unlogged by design. | R-003 | Metro auto-drive soak observation through ~20:45; grep `error\|fatal\|redbox\|crash` (case-insensitive, excl. worklets warnings) empty; dual-launch corroboration. | `dw15-metro.log` + verbatim excerpts § |
| Performance — frame baseline | On-screen `fps · p99 · frames` readout copied verbatim (Debug); Release readout separate. | R-002 | Holder-eyes read of overlay while auto-drive plays; no remote₄ claim. | Holder note or photo; UNKNOWN until provided |
| Maintainability — zero code change | `git diff HEAD -- triade/` empty; `tsc --noEmit` clean only if code touched (not run — nothing touched). | R-006 | `git status` shows only the three artifact paths; `rg DEVELOPMENT_TEAM triade/ios` context (gitignored, informational). | `git diff --stat` + evidence prebuild note |
| Operability — lock/volatile handling | Device-locked failure halts blocked with verbatim error (AC: DEVICE_LOCKED_AGAIN); holder handoff + cleanup commands recorded. | R-004 | run3 verbatim locked block quoted with per-source label; handoff (PID 14623, port 8081, relaunch fallback, guarded kill). | `dw15-run3.log:45-49` + evidence §§ Handoff/Live processes |
| Durability — evidence | Device identity + run outcome + baseline-or-pending + verbatim errors in durable files with hashes. | R-007 | `dw-15-physical-boot-evidence.md` retry section complete; `dw15-logs-20260906/sha256.txt` verifies 3 logs. | Evidence md + sha256.txt |

**Unknown thresholds:** Frame numbers (`fps · p99 · frames`) UNKNOWN — on-screen only, holder-pending; do not invent. Release-device thresholds belong to DW-16, not this decision. Soak move count UNKNOWN by design (worklet no-log rule) — wall-clock window stated instead.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-dw-15-physical-ios-boot-2.md` intent contract + AC2/AC3 amended bar + review pass 1/2 triage signed; human chose "Run physical boot now" with phone unlocked)
- [ ] Test environment provisioned and accessible (paired iPhone 14 Pro UDID `00008120-00023C440263C01E` / identifier `DD0414C7-175F-54F0-B474-42F213FD3ABD`, iOS 26.6.1, `available (paired)`; `triade/` + Xcode + CocoaPods + Metro port 8081; phone kept unlocked)
- [ ] Test data available or factories ready (n/a — no test data; auto-drive `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` JS-bundle-time flag drives deterministic `doMove` every 500 ms via existing path)
- [ ] Feature deployed to test environment (cached signed Debug `.app` from earlier run; prebuild skipped per spec; no product code touched)
- [ ] Pre-implementation blockers resolved (device-locked run1 block cleared by human unlock; signing via automatic signing confirmed; `sprint-status.yaml` not written by this workflow)

## Exit Criteria

- [ ] All P0 tests passing (install+launch + bundle + zero-error soak + zero-code-change + ledger resolution)
- [ ] All P1 tests passing (or failures triaged with waivers) — board-mount reasoning + lock-gate verbatim + log durability + holder checklist recorded
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigated as holder-gated PASS-PARTIAL or waived with owner/expiry — full closure explicitly NOT claimed)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on boot/launch/soak seam; holder-eyes items tracked, not silently dropped)
- [ ] `git status` shows only artifact paths (`deferred-work.md` + evidence + `dw15-logs-20260906/` + spec); `git diff HEAD -- triade/` empty

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA + device holder | Owns holder-eyes checklist (board photo, fps readout, Release rerun), unlock window, foreground confirm |
| FE lead | Dev Lead | Owns dual-launch corroboration, Metro soak grep, worklets-warning triage, module-drift note, zero-code-change pin |
| PM | PM | Signs PASS-PARTIAL (not full closure) + holder-checklist expiry + DW-16 ownership of device numbers |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Boot/launch/soak pins; mostly landed in logs

**Criteria**: Blocks physical-boot claim + High risk (≥6) + No workaround (no other lane proves on-device boot)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC1 — `expo run:ios --device 00008120-00023C440263C01E` Build SUCCEEDED 0 errors + install + launch on unlocked phone (`Logs for your project will appear below`) | Device (install/launch) | R-003 | 2 | QA | run2 log: `Build Succeeded`, `0 error(s), 2 warning(s)`, Installing → Logs. |
| AC1-independent — direct `devicectl device process launch --device … com.menontech.triade` → `Launched application …` | Device (launch probe) | R-003 | 1 | QA | Fast lock-state probe + launch corroboration ~20:28. |
| Metro serves on-device bundle — `iOS Bundled … index.ts` + lazy haptics/audio chunks; JS executed on device | Device (bundle) | R-003 | 3 | QA | Metro log lines; module drift 1407 vs 1319 explained (dev-client vs expo-start, same source). |
| Zero redbox/fatal/crash across soak — grep run2+metro (excl. 4 known worklets boot warnings) empty | Device (soak log) | R-003 | 2 | QA | ~17 min wall-clock; moves unlogged by design — state window explicitly. |
| Zero production-code change — `git diff HEAD -- triade/` empty; only artifact paths changed | Static scan | R-006 | 2 | QA | `git diff --stat` + `git status` pins. |
| Ledger DW-15 `done 2026-09-06` + `resolution: resolved by sweep bundle dw-decision-dw-15` + `resolution-undo` hash | Static | R-008 | 1 | QA | `rg -n "status: done 2026-09-06" deferred-work.md`; sprint-status untouched. |
| Lock-gate honesty — intermediate locked attempt fails with verbatim `device is locked`, quoted with per-source label, no retry loop | Device (negative) | R-004 | 1 | QA | run3 log 20:24:27→20:25:21 verbatim block. |
| Worklets-warning triage — 4 `WARN [Worklets] Tried to modify key 'current'` labeled pre-existing boot-time, benign for boot verdict | Static/log | — | 1 | DEV | Hardening outside DW-15 scope. |
| Evidence completeness — retry section has device identity + outcome + inferred-strong reasoning + holder checklist + verbatim excerpts + handoff/cleanup | Doc review | R-001, R-002, R-004, R-007 | 1 | QA | Evidence §§ Device/What ran/Results/Outcome/Live processes. |

**Total P0**: 14 checks, device lane ~30–60 min + doc review

### P1 (High) — Reasoning chain + durability + handoff

**Criteria**: Important boot-evidence integrity + Medium/high risk + Common holder flow

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Board-mount reasoning chain sound — auto-drive `screen='playing'` sole `GameBoard` mount + lazy chunks consistent with game paths + zero-error soak; labeled inferred-strong, pixel holder-pending | Doc/log review | R-001 | 3 | QA | Never claim observed pixels; overclaim (`confirms game paths`) softened to `consistent with`. |
| Per-source verbatim labels — `[run2]/[metro]/[launch]` prefixes on every quoted block; exact log file times used (no approximates) | Doc review | R-007 | 2 | QA | Pass-2 patch: spliced-block + approximate-time findings closed. |
| Log durability — `dw15-logs-20260906/` 3 logs + `sha256.txt` verify; no /tmp refs | Static/file | R-007 | 2 | QA | `sha256sum -c sha256.txt` green. |
| Holder handoff actionable — PID 14623 + port 8081 + relaunch fallback + guarded cleanup + auto-lock caveat + foreground-unverified note + expiry | Doc review | R-004 | 3 | QA | `kill -0` guard + port check; blind-kill finding closed. |

**Total P1**: 10 checks, ~1.0–2.0 h (mostly review)

### P2 (Medium) — Holder-eyes + Release lane

**Criteria**: Secondary closure steps + Medium risk + Human-in-the-loop

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Holder visual — Skia 4x4 visibly rendering while auto-drive plays (photo or written confirm) | Manual (holder) | R-001 | 1 | Eduardo | Checklist item 1; window-limited by auto-lock. |
| Holder readout — verbatim on-screen `fps · p99 · frames` (Debug) copied | Manual (holder) | R-002 | 1 | Eduardo | Checklist item 2; Debug-only labeled. |
| Release rerun — separate future run + readout (not this pass) | Device (future) | R-005 | 1 | QA | Checklist item 3; DW-16 consumes numbers. |
| Spec integrity — contract read-only respected (HAPPY_PATH/Approach wording vs amended bar reconciled via change-log interpretation note, not silent edit) | Doc review | — | 1 | QA | Pass-2 high finding closed via interpretation note. |

**Total P2**: 4 checks, holder-dependent (~0.5–1.0 h active + wait)

### P3 (Low) — Exploratory / hygiene

**Criteria**: Nice-to-have, exploratory, benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — second-iPhone pairing drift probe (`devicectl list devices` single paired device, UDID pinned) | Device scan | 1 | QA | Rejected pairing-drift finding documented; single-device lane confirmed. |
| Cross-cutting hygiene — no TestFlight/App Store attempt, no `prebuild --clean`, no engine/render tuning in logs/diff | Static scan | 1 | QA | Spec `Never` boundaries respected. |

**Total P3**: 2 checks, ~0.2–0.4 h

---

## Execution Order

> Keep execution simple: PR / Nightly / Weekly — do not re-list all tests (refer to coverage plan). Philosophy: run everything in PRs if `<15 min`; defer only if expensive/long-running.

- **PR (<15 min):** Host-only pins — `git diff --stat` (only artifacts) + `git diff HEAD -- triade/` empty + `rg` ledger pins (`status: done 2026-09-06`, `resolution: resolved by sweep bundle dw-decision-dw-15`, `resolution-undo`) + `sha256sum -c dw15-logs-20260906/sha256.txt` + `npm --prefix triade test` (engine 26-test gate unaffected) — Playwright parallelization covers 100s of tests in 10–15 min. No device needed in PR.
- **Device lane (on-demand, holder present):** All P0 device checks (`expo run:ios --device` + `devicectl launch` + Metro auto-drive soak + log grep) + P2 holder-eyes (board photo, fps readout) + Release rerun. Requires unlocked iPhone + Metro port 8081 + ~30–60 min window. This is the only lane that can close R-001/R-002.
- **Nightly/Weekly:** None required for this decision (no k6 performance, no chaos, no long-running 4+ h suites).
- **No redundancy:** Do not re-list all P0/P1 checks here; coverage plan is the source of truth.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 14 | ~0.10 | ~1.0–1.8 | Device install/launch + Metro soak + greps + zero-change + ledger pins — mostly log review, one device session |
| P1 | 10 | ~0.12 | ~0.8–1.4 | Reasoning-chain + verbatim-label + durability + handoff doc review |
| P2 | 4 | ~0.20 | ~0.5–1.0 | Holder-eyes visual + readout + Release lane + spec-integrity review (active time; excludes holder wait) |
| P3 | 2 | ~0.15 | ~0.2–0.4 | Pairing-drift probe + boundary hygiene scans |
| **Total** | **30** | **-** | **~2.5–4.6** | **~0.3–0.6 days active + one holder-window device session (~30–60 min); full gate `<15 min` host + device lane on demand** |

> For gate reporting, collapse to `~2.0–3.8 h` without P3 exploratory (keep P3 optional).

### Prerequisites

**Test Data:**

- n/a — no factories/fixtures; device identity pinned (iPhone 14 Pro `DD0414C7-175F-54F0-B474-42F213FD3ABD` / UDID `00008120-00023C440263C01E`, iOS 26.6.1); auto-drive flag `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` (no code change)

**Tooling:**

- `npx expo run:ios --device` + `xcrun devicectl` (install/launch/probe) + Metro log grep (`redbox|fatal|crash`, excl. worklets warnings)
- `rg` (ledger/verbatim pins) + `sha256sum -c` (log durability) + `git diff --stat` (zero-code-change pin)
- `lsof -iTCP:8081` (Metro liveness) + guarded `kill` (cleanup)

**Environment:**

- Paired unlocked iPhone + macOS Xcode/CocoaPods + `triade/` + Metro port 8081; baseline `3f6b56b` + HEAD `c5aae4e` already contain evidence/logs/spec; working tree adds ledger resolution only

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — install+launch + bundle + zero-error soak + zero-code-change + lock-gate honesty)
- **P1 pass rate**: ≥95% (waivers required for failures — reasoning-chain label, verbatim labels, durability, handoff)
- **P2/P3 pass rate**: ≥90% (informational; holder-eyes items tracked as pending, not failed)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001/R-002 holder-gated; R-003 PASS-PARTIAL labeled)

### Coverage Targets

- **Critical paths**: ≥90% (install → launch → bundle → soak → evidence)
- **Boot-evidence scenarios**: 100% (verbatim device identity + outcome + pending-or-numbers + verbatim error paths per spec AC3)
- **Holder-eyes items**: tracked 100% (board photo, fps readout, Release rerun — pending with reason, never silently dropped)
- **Zero-change invariant**: 100% (`triade/` diff empty)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (14 checks)
- [ ] No high-risk (≥6) items unmitigated (R-001/R-002 holder-gated with owner+window; R-003 PASS-PARTIAL labeled with residual disclosure)
- [ ] Board pixels never claimed as observed remotely (inferred-strong label enforced)
- [ ] fps numbers never invented (holder-pending with reason enforced)
- [ ] `git diff HEAD -- triade/` empty (zero production-code change enforced)
- [ ] `sprint-status.yaml` untouched (orchestrator-owned enforced)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: Board pixels never remotely confirmed (Score: 6)

**Mitigation Strategy:** (1) Keep agent-side verdict at inferred-strong with full reasoning chain (mount point + lazy chunks + zero-error soak); (2) gate full DW-15 closure on holder-eyes checklist item 1 (photo or written confirm of Skia 4x4 while auto-drive plays); (3) preserve relaunch fallback so a late holder can re-establish the board view without a full rebuild.
**Owner:** Eduardo (holder)
**Timeline:** Holder window (while unlocked; auto-lock re-engages in minutes — expiry noted)
**Status:** In Progress (agent-side complete; holder-pending)
**Verification:** Holder photo/note appended to evidence; until then outcome stays PASS-PARTIAL.

### R-002: Frame-baseline numbers unrecorded (Score: 6)

**Mitigation Strategy:** (1) Record probe-path-ran-without-errors (not numbers) in evidence; (2) gate numbers on holder-eyes checklist item 2 (verbatim on-screen `fps · p99 · frames` Debug readout); (3) route Release numbers to a separate future run owned by DW-16.
**Owner:** Eduardo (holder)
**Timeline:** Holder window; else Release-rerun lane
**Status:** In Progress (holder-pending with reason — no remote readback channel)
**Verification:** Verbatim readout string in evidence; never a reconstructed/estimated number.

### R-003: Soak error-freedom inferred from Metro silence (Score: 6)

**Mitigation Strategy:** (1) Dual-launch corroboration (run2 install+launch + independent devicectl launch); (2) on-demand bundle serving throughout the soak window as liveness proof; (3) explicit residual-risk disclosure in spec §Auto Run Result + §Residual risks (native silent kill not excludable, foreground-at-handoff unverified); (4) full closure requires holder foreground confirm + future Release soak.
**Owner:** FE lead
**Timeline:** Immediate (gate PASS-PARTIAL label, not full closure)
**Status:** Complete (as PASS-PARTIAL with disclosed residual)
**Verification:** `dw15-run2.log` + `dw15-metro.log` greps empty (excl. worklets) + devicectl launch stdout + spec residual-risk list.

---

## Assumptions and Dependencies

### Assumptions

1. Production `Rng`/engine behavior is irrelevant to this lane — zero code changed; device lane proves boot/render plumbing only.
2. Well-behaved unlock window: human keeps the phone unlocked through install+launch+soak; auto-lock re-engagement is expected noise (run3 precedent), handled by relaunch fallback, not by retry loops.
3. `Number` baselines (module counts 1407 vs 1319) differ by bundle entry (dev-client vs expo-start), not by app source — AUTO_DRIVE flag only changes auto-open screen + 500 ms move interval.
4. Worklets `Tried to modify key 'current'` warnings are pre-existing boot-time noise, benign for the boot verdict; animation hardening is out of scope.
5. Holder-pending items (pixels, fps digits, Release) require eyes/hands on the unlocked phone; no remote channel can close them unattended.

### Dependencies

1. Paired iPhone 14 Pro reachable via devicectl (`available (paired)`) — required for any device check; if unreachable, HALT per spec matrix.
2. Cached signed Debug `.app` + Metro port 8081 — required for relaunch fallback without rebuild.
3. `dw15-logs-20260906/` + `sha256.txt` durable — required as proof; /tmp originals are volatile.
4. DW-16 (on-device frame-rate baseline) — consumes the fps numbers this run leaves holder-pending; this plan does not duplicate DW-16.

### Risks to Plan

- **Risk**: Holder never completes checklist items 1–2 before the session dies (auto-lock + Metro PID expiry).
  - **Impact**: DW-15 stays PASS-PARTIAL indefinitely; ledger `done` reads stronger than evidence supports.
  - **Contingency**: Relaunch fallback (`devicectl process launch` while Metro up) re-establishes the view in <1 min; if Metro died, re-run `expo run:ios --device` Debug (cached build) per handoff. Keep ledger resolution as sweep-bundle qualified, not as pixel-proof.

- **Risk**: Future `prebuild --clean` or Expo SDK bump regenerates `ios/` and breaks automatic signing.
  - **Impact**: Next physical-boot lane HALTs at signing (`Block If`).
  - **Contingency**: HALT with verbatim error + `ios signing requires human action`; no code workarounds; human provisions signing, then re-run this plan's P0 device checks.

---

## Follow-on Workflows (Manual)

- Run `*atdd` only if a P0 regression test is wanted for a *code* seam — not applicable here (zero code change; nothing to pin in `__tests__/`).
- Run `*automate` for broader device-lane automation only if libimobiledevice/screenshot tooling is adopted (currently absent — hence holder-eyes).
- Run `*nfr-assess` after holder evidence (board photo, fps readout) or Release rerun exists to assign final PASS/CONCERNS/FAIL per NFR category (boot reliability, frame baseline).
- Run `*trace` to link DW-15 evidence → DW-16 frame baseline when numbers land.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **`triade/index.ts` / `App.tsx` boot (snapshot, preload+hydration, `screen==='playing'`)** | Untouched; exercised on-device via auto-drive (bundle executed, no redbox) | Engine 26-test gate + `tsc` clean stay green; no new tests needed (zero diff) |
| **`src/render/GameBoard.tsx` Skia 4x4 mount** | Untouched; mount inferred-strong via sole-mount-point reasoning + lazy-chunk serving | Holder photo closes the pixel gap; simulator render evidence (2026-08-10) remains the pixel baseline until then |
| **`src/render/useFrameRateBaseline.ts` 120-frame probe** | Untouched, observe-only; path ran error-free, readout holder-pending | DW-16 owns numbers; Debug readout + Release rerun tracked in P2 |
| **Metro / dev-client / signing lane (`expo run:ios`, devicectl, automatic signing)** | Validated for Debug-unlocked; gitignored `ios/` regeneration noted | Future lanes must not `prebuild --clean`; signing HALT path documented |
| **CI `npm test` + `tsc` gate** | Unaffected (pure-engine suites never ran on device; device never gates PR per project-context) | `npm --prefix triade test` + both `tsconfig` clean stay gate |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR thresholds and planned evidence

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md` (decision DW-15, PASS-PARTIAL)
- Evidence: `_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md` (retry § 2026-09-06)
- Logs: `_bmad-output/implementation-artifacts/dw15-logs-20260906/` (`dw15-run2.log`, `dw15-run3.log`, `dw15-metro.log`, `sha256.txt`)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` DW-15 `done 2026-09-06 resolution-undo …`
- Prior spec: `_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot.md` (blocked run, device-locked verbatim)
- Project rules: `_bmad-output/project-context.md` (CI covers pure; device covers gesture/pixel — never the inverse; worklets never log; device-test never PR gate)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution Mode**: sequential (auto fallback — no subagent/team capability)
**Capability Probe**: `tea_capability_probe: true` → working-tree assessment, sequential
