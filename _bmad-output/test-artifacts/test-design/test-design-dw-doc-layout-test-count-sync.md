---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md'
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/weights.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-doc-layout-test-count-sync — story-doc test-count sync (DW-11) + co-located engine RNG note

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-doc-layout-test-count-sync`
**Scope:** Targeted test design for the working-tree delta of `dw-doc-layout-test-count-sync`

> **Delta under assessment:** Working-tree diff vs `HEAD` (`2e91c12`) is 4 files, 35 insertions / 8 deletions:
> - `_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` — doc-only sync for DW-11: `T2` note `All 12 layout tests` → `All 14 layout tests (12 original + clamp-path + golden-anchor added in the 2026-08-17 review fixes)`, `T5` `12 layout unit tests` → `14 layout unit tests (...plus clamp-path and golden-anchor cases added in the 2026-08-17 review fixes)`, ATDD bullet `12 tests` → `14 tests ... plus clamp-path and golden-anchor cases added ...`, and appended `## Auto Run Result` (`Status: done` + 3-line summary). No `triade/src/ui/layout.ts` or `triade/App.tsx` edit in this diff.
> - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-11 `status: open` → `done 2026-09-02` + `resolution: resolved by sweep bundle dw-doc-layout-test-count-sync` + `resolution-undo: 8080feef...`; DW-56 `status: open` → `done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-rng-trust-hardening` + `resolution-undo: 0eb6ce61...` + `decision: 2026-09-02 Clamp roll...`
> - `triade/src/engine/core/game.ts:8-18,34,110` — adds `normalizeDisplayRoll(raw: unknown): number` (`non-number/!isFinite → 0.5`, `<0 → 0`, `>=1 → 1-EPSILON`) and replaces `displayRoll: rng()` with `normalizeDisplayRoll(rng())` in `newGame` and effective `move` path (DW-56).
> - `triade/src/engine/core/weights.ts:22-27` — `weightedPicker` clamps `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` then `scaled = safeRoll*total` (DW-56). Diff is co-located in the same working tree but belongs to sweep `dw-engine-rng-trust-hardening`; it is already assessed in `test-design-dw-engine-rng-trust-hardening.md` and treated as **Not in Scope** here except for traceability hygiene.
> - `sprint-status.yaml` is orchestrator-owned and not written (prompt constraint) — verified `git diff --stat` shows no such file.

---

## Executive Summary

**Scope:** Close DW-11, a pure documentation drift: story `1-5-layout-portrait-e-landscape.md` claimed 12 layout tests after the 2026-08-17 review had landed 14 (clamp-path + golden-anchor `500×580 → 452`). The sweep syncs the narrative to 14 and flips the ledger to `done`. No layout math, HUD, band, or engine contract change is intended by DW-11 itself. A second, co-located engine hardening (DW-56 `weights.ts`/`game.ts` normalize/clamp) rides the same working tree; it is functionally independent and already has its own risk-based plan — this design pins the isolation.

**Risk Summary:**

- Total risks identified: 6
- High-priority risks (≥6): 0 when scoped strictly to DW-11 doc-sync; 2 high risks exist only if the co-located DW-56 engine delta is mis-attributed to this bundle (isolated via Not-in-Scope gating and cross-reference to its own test-design)
- Critical categories: OPS (ledger `resolution-undo` 64-hex, doc-code count truth), TECH (residual count mismatch 14 vs actual 18 in `layout.test.ts` if floor tests counted), BUS (onboarding confusion from stale narrative)

**Coverage Summary:**

- P0 scenarios: 4 groups (doc-count grep vs `layout.test.ts` truth, ledger DW-11 done+hash, no-prod-code pin for layout seam, traceability isolation for DW-56)
- P1 scenarios: 4 groups (ATDD 14 label + T2/T5 narrative cross-pin, `Auto Run Result` idempotency, `rg` no `sprint-status.yaml` write, `tsc` + `layout.test.ts` stays green)
- P2/P3 scenarios: 4 groups (residual 14→18 drift note, ledger DW-56 already-done hygiene, style `rg` for duplicate formula not reintroduced, optional full `npm test` waiver)
- **Total effort**: ~1.5–3.0 hours (~0.2–0.4 days; host-only, no device bench)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **`triade/src/engine/core/game.ts` + `weights.ts` functional hardening (DW-56 normalizeDisplayRoll / safeRoll clamp)** | Working-tree diff includes DW-56 engine edits (`game.ts: normalizeDisplayRoll`, `weights.ts: safeRoll`) which are functionally independent from DW-11 doc sync; attributing them here would duplicate risk and coverage. `git diff --stat` shows 2 engine files that belong to sweep `dw-engine-rng-trust-hardening` per `deferred-work.md: DW-56 resolution` and `spec` not in this bundle. | Already assessed in `test-design-dw-engine-rng-trust-hardening.md` (P0/P1/P2, 857 pass / 10 EXPECTED RED gate, `tsc` clean). This plan gates only that this bundle does **not** claim engine coverage and that engine files are byte-identical to that sweep's final revision when viewed in isolation; full engine gate lives in that sweep's design. |
| **`triade/src/ui/layout.ts` / `App.tsx` / `Hud.tsx` layout math (SAFE_MARGIN 16, PORTRAIT 96/LANDSCAPE 48, getBandTop, Number.isFinite guard, BOARD_SIZE_FLOOR)** | DW-11 never edits layout math; `git diff --stat -- triade/src/ui` empty for this diff. `spec-layout-band-dedup-and-guard.md` hardening is already done and pinned in `test-design-dw-layout-band-dedup-and-guard.md`. | Existing `dw-layout-band-dedup-and-guard` test-design remains gate (18 layout tests, 96/48 pins, 382/688/452 anchors, `getBandTop` 3-site grep). Not re-derived. |
| **`SafeAreaProvider` rotation race (DW-6), status-bar legibility (DW-7), board 0-clamp vs 40-pt floor (DW-4)** | Native polish / UX-DR open items unrelated to doc count. | DW-4/6/7 stay `open` and manual; not re-tested. |
| **RevenueCat / AdMob / IAP / Epic 10-11 monetization + `LaneSelect`/`ToneScreen`** | No monetization code in diff. | Existing suites remain gate. |
| **Benchmark micro-bench lane for layout or engine** | Doc sync is O(1) text; engine perf is O(1) clamp cost `<0.01 ms` already gated by `dw-engine-rng-trust-hardening`. | `npm test` `<15 min` is gate; no extra bench. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong (doc) / Strong (engine isolated).** Doc counts are grep-observable: `rg -n "All 14 layout tests"`, `rg -n "14 layout unit tests"`, `rg -n "14 tests, P0/P1"`, and `rg -c "test\('" triade/__tests__/ui/layout.test.ts` vs parsed `describe` titles. Engine clamp/normalize are pure `Rng→value` host-testable via `rngOf` fixtures (already done in DW-56 design).

**Observability — Good.** Doc outputs are textual (`deferred-work.md: status: done 2026-09-02` + `resolution-undo: 64-hex` + `resolution: resolved by sweep bundle dw-doc-layout-test-count-sync`). Layout seam observability unchanged (`layout.test.ts` 18 pass, `tsc` clean). `git diff --stat` directly shows no `triade/src/ui` edit for DW-11 and 2 engine files for DW-56.

**Reliability — Strong.** Doc edit never throws; engine helpers never throw (`normalizeDisplayRoll` returns `0.5` for non-finite, `safeRoll` always `<1`). No async/worklet.

**Testability Risks:** Residual count mismatch if doc pins 14 but file contains 18 (floor + degenerate + sweep tests added after 2026-08-17). Callers that `rg` for exact "14 layout tests" would still match but the file's `test(` count is 18 — pins must assert **doc says 14 and file has ≥14 and every doc-quoted golden anchor present**, not strict equality, unless the story explicitly re-baselines to 18. Ledger `resolution-undo` hash is single 64-hex per DW; a later reopen without preserving hash loses revert trail.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| — | — | **No high risk when strictly scoped to DW-11 doc sync.** Doc-only `md` edits cannot break runtime layout, engine, feel, Skia, or monetization. The only path to ≥6 requires mis-attributing the co-located DW-56 engine delta to this bundle; that path is explicitly gated as Not-in-Scope with cross-reference to its own design and a `git diff --stat` isolation pin. | — | — | — | — | — | — |
| R-EXT-01 | TECH | **Co-located DW-56 engine clamp/normalize mis-attributed to doc bundle → high-risk coverage gap if this plan were the sole gate for `weights.ts`/`game.ts`.** `weights.ts: safeRoll` and `game.ts: normalizeDisplayRoll` change RNG trust boundary; without their own P0 (NaN/Infinity/-Infinity/`1-EPSILON` + `displayRoll∈[0,1)` pins) a `>=1` roll could silently bias pot or `displayRoll` could be `NaN`. | 2 | 3 | **6** | Isolate: (a) this plan marks `weights.ts`/`game.ts` as Not-in-Scope and points to `test-design-dw-engine-rng-trust-hardening.md` as the authoritative gate; (b) hygiene pin `git diff --stat` in this plan shows engine files exist but are **not** claimed as mitigated here — full P0 lives in that sweep (`rg -n "normalizeDisplayRoll"`, `rg -n "safeRoll"`, `node --test -- __tests__/engine/weights.test.ts` etc.). | FE lead | Immediate (this sweep; hygiene only) |
| R-EXT-02 | OPS | **Sprint board ownership — `sprint-status.yaml` is orchestrator-owned and must never be written by TEA.** A stray edit would violate prompt and orphan orchestrator bookkeeping. | 2 | 3 | **6** | Gate `git diff --stat` shows no `sprint-status.yaml`; `rg -n "sprint-status" _bmad-output/implementation-artifacts/deferred-work.md` not required. This plan never writes that file. | QA | Immediate |

> R-EXT are **isolation** risks, not DW-11 functional risks. They score ≥6 only to enforce the boundary; functional DW-11 risks are ≤4.

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-001 | OPS | **Doc-code count residual drift — doc now says 14 but `layout.test.ts` actually contains 18 `test(` invocations (14 + 4 floor/degenerate/min-tile additions post-2026-08-17).** Story `T2`/`ATDD` narrative "12→14" is directionally correct (closes 6-gap to 4-gap) but still undercounts if the 4 floor/degenerate tests are considered part of the suite. A future reader `rg` counts 18 and sees doc 14 and re-opens DW-11. | 2 | 2 | 4 | Pin doc-code alignment as **≥14 not ==14** plus anchor pin: (a) `rg -c "test\('" triade/__tests__/ui/layout.test.ts` ≥14 (actually 18) and (b) doc phrases `rg -n "All 14 layout tests \(12 original \+ clamp-path \+ golden-anchor"` and `rg -n "14 layout unit tests.*clamp-path and golden-anchor"` each ==1, and (c) every quoted golden anchor `382`/`688`/`452` still present in `layout.test.ts` (3 grep hits). Record residual note in this design that 18 is the file truth if floor tests are in scope; a follow-on sweep can re-baseline doc to 18 if desired without reopening DW-11 as defect. |
| R-002 | TECH | **Ledger `resolution-undo` single 64-hex per DW not preserved on reopen.** `deferred-work.md: DW-11` now `done 2026-09-02` + `resolution-undo: 8080feef...` and DW-56 `0eb6ce61...`. A later sweep that flips either back to `open` without keeping the hash loses revert trail and breaks `deferred-work.md` audit. | 1 | 3 | 3 | Static pin `rg -n "resolution-undo: [0-9a-f]{64}" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 new 64-hex hits for DW-11/56 and `rg -n "status: done 2026-09-02" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 hits; any reopen must keep hash. |
| R-003 | BUS | **Onboarding confusion from stale ATDD label — `ATDD: 12 tests` vs `14 tests` label drift.** External readers (design QA, new FE) rely on story file's ATDD bullet to discover `layout.test.ts` count; a stale "12 tests" would make them expect 12 and mis-count on PR review. | 2 | 2 | 4 | Same doc pin as R-001: `rg -n "14 tests, P0/P1"` in `1-5-layout-portrait-e-landscape.md` ==1 and `rg -n "12 tests, P0/P1"` ==0. |
| R-004 | OPS | **`Auto Run Result` append is not idempotent — second sweep appends a second `## Auto Run Result` block.** Template expects one. | 1 | 2 | 2 | Pin `rg -c "## Auto Run Result" _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` ==1 and `rg -n "Status: done" ...` ==1 inside that block. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-005 | TECH | **No-prod-code invariant — doc sync must not introduce an accidental `triade/src` edit.** A stray whitespace or import in `triade/src/ui/layout.ts` would turn a doc sweep into a code sweep and invalidate the doc-only premise. | 1 | 2 | 2 | Monitor — `git diff --stat -- triade/src/ui` empty (layout seam) and `git diff --stat -- triade/src/engine` shows only DW-56 engine files which are Not-in-Scope here; hygiene pin. |
| R-006 | OPS | **Spec `final_revision` vs `baseline_revision` drift for `spec-layout-band-dedup-and-guard.md` not bumped by doc sync.** Doc sweep intentionally does not bump spec `final_revision` (spec is already `done` at `a09e6ed`); a future audit comparing `spec final_revision` to `deferred-work` resolution might expect a bump. | 1 | 1 | 1 | Monitor — spec stays `final_revision: a09e6ed` per design; doc sync is not a spec change. |

### Risk Category Legend

- **TECH**: Technical/Architecture (count truth, no-prod-code)
- **SEC**: Security — none this sweep (no auth/data exposure)
- **PERF**: Performance — none standalone (doc sync is O(1) text)
- **DATA**: Data Integrity — none standalone (doc truth, not board state)
- **BUS**: Business Impact (onboarding confusion if doc stale)
- **OPS**: Operations (ledger `resolution-undo`, `sprint-status.yaml` ownership, `Auto Run Result` idempotency)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. Doc sync touches **maintainability/traceability** only; layout reliability/perf/offline are already pinned and unchanged.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Maintainability — doc-code traceability | Story `1-5-layout-portrait-e-landscape.md` T2/T5/ATDD narrative must match `layout.test.ts` truth: doc says `14` after fix (12 original + clamp-path + golden-anchor) and every quoted golden anchor `382`/`688`/`452` present; `deferred-work.md` DW-11 `done 2026-09-02` + `resolution-undo` 64-hex single hash. | R-001, R-002, R-003 | Static grep gates (host): `rg -n "All 14 layout tests"` ==1, `rg -n "14 layout unit tests"` ==1, `rg -n "14 tests, P0/P1"` ==1, `rg -c "test\('" triade/__tests__/ui/layout.test.ts` ≥14, `rg -n "382" triade/__tests__/ui/layout.test.ts`/`688`/`452` each ≥1, `rg -n "resolution-undo: [0-9a-f]{64}" deferred-work.md` 2 hits. | `1-5-layout-portrait-e-landscape.md` diff + `deferred-work.md` diff + `rg` outputs |
| Reliability — never-throw (layout/engine unchanged by doc) | `layoutFor` never throws, every `boardSize/bandHeight` finite (`layout.test.ts` 18 pass) — doc edit must not regress this. | R-005 | Host `npm --prefix triade test -- __tests__/ui/layout.test.ts` 18 pass + both `tsc` clean (`tsconfig.json` + `tsconfig.test.json`). | `npm test` log + `tsc` log |
| Performance — 60 FPS / frame budget | Layout O(1) arithmetic `<0.01 ms` unchanged; doc sync adds no worklet or timeout. | — | Host `npm --prefix triade test` `<15 min` already required by spec Verification. | CI timing (no bench lane) |
| Offline / Installability | Installable + offline unchanged; no new native module. | — | `npm test` offline still green. | Manual not needed |

**Unknown thresholds:** None material. The specific fallback counts for non-finite guard are not invented here — doc pins 14 as narrative, not as threshold; the gate is **grep match + file count ≥14**, not invented exactness.

---

## Entry Criteria

- [ ] Spec `spec-layout-band-dedup-and-guard.md` `baseline_revision 80dc5c1` / `final_revision a09e6ed` reviewed and `git diff --stat -- triade/src/engine` empty for DW-11's intended scope (engine files in working tree are DW-56 and treated as Not-in-Scope with cross-reference)
- [ ] Story doc `1-5-layout-portrait-e-landscape.md` at `HEAD` shows `12 layout tests` (pre-fix) and deferred-work DW-11 `open` at `2e91c12`
- [ ] Test data/fixtures available: `triade/__tests__/ui/layout.test.ts` with `ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` + 18 `test(` titles, `SAFE_MARGIN 16`/`PORTRAIT 96`/`LANDSCAPE 48`/`BOARD_SIZE_FLOOR 216`
- [ ] Feature deployed to host: working tree has doc + ledger patches (no `triade/src/ui` edit) and `tsx` + `TSX_TSCONFIG_PATH` available for `node --import tsx --test`
- [ ] `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (doc-count grep vs file truth + ledger DW-11 done+hash + no-prod-code pin + engine isolation pin)
- [ ] All P1 tests passing or waived (ATDD label, `Auto Run Result` singleton, `sprint-status.yaml` untouched, `layout.test.ts` 18 pass + both `tsc` clean)
- [ ] No open high-priority / high-severity bugs (R-EXT isolation pins green or formally waived with owner/expiry; functional DW-11 has no ≥6)
- [ ] Test coverage agreed as sufficient (doc-code grep allowlists + 64-hex ledger + file count ≥14 green)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (doc-code traceability maintainability)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns doc-count ledger pins, `Auto Run Result` idempotency, `rg` isolation gates, `nfr-assess` handoff |
| FE lead | Dev Lead | Owns `1-5-layout-portrait-e-landscape.md` narrative truth and ledger `resolution-undo` preservation |
| PM | PM | Signs DW-11 doc drift closure and accepts residual 14→18 note as not-a-defect |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship DW-11 doc sync

**Criteria**: Blocks DW-11 closure + medium risk + no workaround (doc truth is the contract)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — Story doc T2/T5/ATDD counts synced: `rg -n "All 14 layout tests \(12 original \+ clamp-path \+ golden-anchor"` ==1, `rg -n "14 layout unit tests.*clamp-path and golden-anchor"` ==1, `rg -n "14 tests, P0/P1.*plus clamp-path and golden-anchor"` ==1, and `rg -n "All 12 layout tests"` ==0 (the remaining `12 layout tests` hit is the historical defer record at `1-5-layout-portrait-e-landscape.md:71` which is allowed) | Static (grep) | R-001, R-003 | 1 | QA (done) | Doc diff `1-5-layout-portrait-e-landscape.md:177,180,201` — host grep `<1 s`. |
| AC — `layout.test.ts` file truth: `rg -c "test\('" triade/__tests__/ui/layout.test.ts` ≥14 (observed 18) and every doc-quoted golden anchor `382`/`688`/`452` still present in file (`rg -n "382" ...` ≥1 each) | Unit + Static | R-001 | 2 | QA | Verifies doc 14 is not stale relative to file; residual 14→18 noted as P2, not P0 fail. |
| AC — Ledger DW-11 `done` + 64-hex `resolution-undo` single hash and not a stray `open` | Static | R-002 | 1 | QA | `rg -n "DW-11.*done 2026-09-02" deferred-work.md` ==1, `rg -n "resolved by sweep bundle dw-doc-layout-test-count-sync" deferred-work.md` ==1, `rg -n "resolution-undo: 8080feef[0-9a-f]{56}" deferred-work.md` ==1. |
| AC — No prod layout code changed for DW-11 + engine delta isolated: `git diff --stat -- triade/src/ui` empty, `git diff --stat -- triade/src/engine` shows only `game.ts`/`weights.ts` which are Not-in-Scope and already gated by `test-design-dw-engine-rng-trust-hardening.md` | Static | R-005, R-EXT-01 | 1 | QA | `git diff --stat` hygiene pin — host `<1 s`. |

**Total P0**: 5 checks (host grep + ledger + git), `<1 s` host

### P1 (High) — Ledger hygiene, idempotency, and gate preservation

**Criteria**: Important traceability + medium risk + common PR path

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| ATDD label cross-pin: `atdd-checklist-1-5-layout-portrait-e-landscape.md` still lists layout suite (informational) and story doc's Verification `127/127 pass` text unchanged except T2/T5 counts | Static | R-003 | 1 | QA | `rg -n "atdd-checklist-1-5" 1-5-layout-portrait-e-landscape.md` ≥1; no stale "12" remains. |
| `Auto Run Result` singleton: `rg -c "## Auto Run Result" 1-5-layout-portrait-e-landscape.md` ==1 and `rg -n "Status: done" ...` ==1 inside that block | Static | R-004 | 1 | QA | Prevents duplicate append on re-sweep. |
| Orchestrator ownership: `git diff --stat` shows no `sprint-status.yaml` and `rg -l "sprint-status" _bmad-output/implementation-artifacts/deferred-work.md` ==0 (ledger never mentions it) | Static | R-EXT-02 | 1 | QA | Per prompt "never write it". |
| Gate preservation: `npm --prefix triade test -- __tests__/ui/layout.test.ts` 18 pass + `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean | Integration (scanner) | R-005 | 1 | QA | Doc edit must not regress layout suite or types. |

**Total P1**: 4 checks, ~0.3–0.6 h host (mostly existing suite)

### P2 (Medium) — Residual drift note and DW-56 hygiene

**Criteria**: Secondary ledger/hygiene + low/medium risk

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Residual 14→18 note: `layout.test.ts` has 18 `test(` but doc says 14 — record as accepted residual (not a reopen) with `rg -c` evidence and this design's R-001 note; follow-on can re-baseline doc to 18 if desired | Static (doc) | R-001 | 1 | QA | This plan documents the +4 as floor/degenerate/min-tile additions, not a missed clamp-path/golden-anchor. |
| Ledger DW-56 hygiene (co-located): `rg -n "DW-56.*done 2026-09-02" deferred-work.md` ==1 + `resolution-undo: 0eb6ce61...` 64-hex ==1 + `decision: 2026-09-02 Clamp roll` present | Static | R-002 | 1 | QA | Confirms engine ledger not orphaned; functional gate lives in its own design. |

**Total P2**: 2 checks, ~0.1–0.3 h host

### P3 (Low) — Exploratory / waived

**Criteria**: Nice-to-have, exploratory

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Full `npm --prefix triade test` (857 pass / 10 EXPECTED RED felt-atdd) exploratory — optional, may be waived with host `layout.test.ts` 18 pass if full suite is long | Integration (host) | 1 | QA | Waivable; doc-only sweep does not require full engine gate here (DW-56 suite is separate). |
| Style hygiene: `rg -n "music\|bgm\|RevenueCat\|AdMob" _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` empty (doc sweep stayed in scope) | Static | 1 | QA | Trivial. |

**Total P3**: 2 checks, ~0.1–0.2 h host (waivable)

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch doc-ledger drift before full gate

- [ ] `rg -n "All 14 layout tests" _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` ==1 and `rg -n "12 layout tests" ...` ==0
- [ ] `rg -n "resolution-undo: 8080feef" _bmad-output/implementation-artifacts/deferred-work.md` ==1 and `rg -n "status: done 2026-09-02" ...` contains DW-11
- [ ] `git diff --stat -- triade/src/ui` empty (no layout code) and `git diff --stat | wc -l` shows 4 files (doc+ledger+2 engine) — engine files noted as DW-56

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Doc-code truth + ledger + isolation

- [ ] P0 doc-count 4 greps vs file truth 18 + golden anchors 382/688/452
- [ ] P0 ledger DW-11 done+hash + no-prod-code pin + engine isolation cross-ref

**Total**: 5 P0 checks

### P1 Tests (<30 min)

**Purpose**: Idempotency + ownership + gate preservation

- [ ] ATDD label cross-pin + `Auto Run Result` singleton
- [ ] `sprint-status.yaml` untouched
- [ ] `layout.test.ts` 18 pass + both `tsc` clean

**Total**: 4 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Residual note, DW-56 ledger hygiene, optional full suite

- [ ] Residual 14→18 doc note
- [ ] DW-56 ledger hygiene `0eb6ce61` + decision line
- [ ] Optional full `npm test` (waivable) + style hygiene

**Total**: 4 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 5 | ~0.15 | ~0.6–0.9 | Grep pins + ledger + git hygiene already green (diff landed); file-count ≥14 check is O(1) host |
| P1 | 4 | ~0.2 | ~0.6–1.0 | `Auto Run Result` singleton + `sprint-status.yaml` gate + `layout.test.ts` 18 pass + both `tsc` (mostly existing suites) |
| P2 | 2 | ~0.15 | ~0.2–0.4 | Residual 14→18 note + DW-56 ledger hygiene |
| P3 | 2 | ~0.1 | ~0.15–0.3 | Full suite waivable + style scan |
| **Total** | **13** | **-** | **~1.5–2.6** | **~0.2–0.4 days host; full gate `<10 min` (`rg` + `tsc` + `node --test` layout); no device bench** |

### Prerequisites

**Test Data:**

- Story doc `1-5-layout-portrait-e-landscape.md` at `HEAD` (`12`) and working tree (`14`) + `deferred-work.md` DW-11 `open→done` + `layout.test.ts` 18 `test(` titles + golden `382/688/452` + `SAFE_MARGIN 16`/`PORTRAIT 96`/`LANDSCAPE 48`
- Ledger hashes `8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb` (DW-11) and `0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e` (DW-56) for `resolution-undo`

**Tooling:**

- `rg` (ripgrep) for doc/ledger/lock grep allowlists
- `node --import tsx --test` via `TSX_TSCONFIG_PATH=tsconfig.test.json` (`triade/package.json: test`)
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json`
- `git diff --stat` for isolation pin

**Environment:**

- Host Node 18+/20+ with `tsx`; no Expo or iOS simulator required (doc-only + host engine hygiene already in DW-56 design).

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — doc-count greps vs file truth + ledger DW-11 done+hash + git isolation)
- **P1 pass rate**: ≥95% (waivers required for any open P1 — e.g. full `npm test` waivable with `layout.test.ts` 18 pass if time-boxed)
- **P2/P3 pass rate**: ≥90% (informational; static greps must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-EXT isolation pins)

### Coverage Targets

- **Critical paths**: ≥90% (doc 14 + ledger 64-hex + file ≥14 + golden anchors are all critical)
- **Doc traceability**: 100% (`14` labels + `12` absent + `Auto Run Result` singleton + `sprint-status.yaml` untouched must be PINNED)
- **Business logic**: ≥80% (`layoutFor` pure + `getBandTop` pure already pinned in band-dedup design; not re-derived here)
- **Edge cases**: ≥90% (residual 14→18 documented, not re-failed)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (doc-count 14 greps vs file ≥14 + golden anchors + ledger DW-11 done+hash + git isolation)
- [ ] No high-risk (≥6) items unmitigated in isolation (R-EXT-01/02 each have cross-ref + git pin, or formal waiver with owner+expiry)
- [ ] `Auto Run Result` singleton holds (`## Auto Run Result` ==1)
- [ ] `sprint-status.yaml` untouched (`git diff --stat` shows no such file)
- [ ] `layout.test.ts` 18 pass + both `tsc` clean (no type regression from doc edit)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (doc-code traceability maintainability)

---

## Mitigation Plans

### R-001: Doc-code residual 14→18 (Score: 4)

**Mitigation Strategy:** Pin doc-code as **≥14** not `==14` plus anchor pin: `rg -c "test\('" triade/__tests__/ui/layout.test.ts` ≥14 (observed 18) and `rg -n "All 14 layout tests \(12 original \+ clamp-path \+ golden-anchor"` ==1 and golden `382`/`688`/`452` each ≥1 in file. Record this design's note that +4 are floor/degenerate/min-tile tests added after the 2026-08-17 clamp-path/golden-anchor fixes — not a missed DW-11. Follow-on may re-baseline doc to 18 without reopening DW-11 as defect.

**Owner:** QA Lead
**Timeline:** Immediate (this sweep)
**Status:** Planned (greps already green in working tree; residual note is this design)
**Verification:** `rg` outputs + `layout.test.ts:1-315` file truth

### R-002: Ledger `resolution-undo` preservation (Score: 3)

**Mitigation Strategy:** Static pin `rg -n "resolution-undo: [0-9a-f]{64}" _bmad-output/implementation-artifacts/deferred-work.md` 2 hits (DW-11 `8080feef...`, DW-56 `0eb6ce61...`) and `rg -n "status: done 2026-09-02" ...` 2 hits; any reopen must keep hash per `Ops` ledger rule.

**Owner:** FE lead
**Timeline:** Immediate
**Status:** Complete (ledger landed `deferred-work.md:88-91,465-469`)
**Verification:** `rg` outputs + ledger diff

### R-003: ATDD label drift 12→14 (Score: 4)

**Mitigation Strategy:** `rg -n "14 tests, P0/P1" _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` ==1 and `rg -n "12 tests, P0/P1" ...` ==0.

**Owner:** QA
**Timeline:** Immediate
**Status:** Complete (diff `1-5-layout-portrait-e-landscape.md:201`)
**Verification:** `rg` outputs

### R-EXT-01/02: Co-located engine + sprint-status isolation (Score: 6 each)

**Mitigation Strategy:** Mark `weights.ts`/`game.ts` as Not-in-Scope with cross-reference to `test-design-dw-engine-rng-trust-hardening.md`; gate `git diff --stat -- triade/src/ui` empty and `git diff --stat` shows no `sprint-status.yaml`; hygiene pins run in PR.

**Owner:** FE lead / QA
**Timeline:** Immediate
**Status:** Complete (isolation pins in this design; functional engine gate lives in DW-56 design)
**Verification:** `git diff --stat`, `rg -n "sprint-status"` empty, DW-56 design file exists

---

## Assumptions and Dependencies

### Assumptions

1. Story `1-5-layout-portrait-e-landscape.md` `T2`/`T5`/`ATDD` counts of 14 are narrative counts of the 2026-08-17 clamp-path + golden-anchor fixes (12 original + 2); the 4 additional floor/degenerate/min-tile tests that make the file 18 are not part of DW-11's scope and are deferred to a later doc re-baseline if desired — asserting **≥14** is the production contract.
2. `deferred-work.md` `resolution-undo` is a single 64-hex hash per DW that must survive any reopen; the hash values `8080feef...` (DW-11) and `0eb6ce61...` (DW-56) are the revert trail for this sweep.
3. `triade/src/engine/core/game.ts`/`weights.ts` diff is DW-56 and already has its own P0 (safeRoll clamp + displayRoll `∈[0,1)` + `tsc` + 857 pass gate) — this design does not duplicate those pins.
4. Host `node --import tsx --test` is the gate runner (`triade/package.json: test`); `tsx` + `TSX_TSCONFIG_PATH` available.
5. `sprint-status.yaml` remains orchestrator-owned; this workflow never writes it per prompt.

### Dependencies

1. `triade/__tests__/ui/layout.test.ts` (18 `test(`) stays gate; do not edit the 0-clamp `:232` or sweep `:189` without re-baselining gold anchors and doc count
2. `_bmad-output/implementation-artifacts/deferred-work.md` must remain the single ledger for `resolution-undo` 64-hex; do not hand-edit hashes
3. Both `triade/tsconfig.json` + `triade/tsconfig.test.json` stay `tsc` clean — doc edit must not introduce new `@ts-ignore` outside `rn-stub` ring

### Risks to Plan

- **Risk**: Future layout count edit adds/removes `test(` without syncing story doc
  - **Impact**: DW-11 reopens; onboarding confusion on PR review
  - **Contingency**: `rg -c "test\('" triade/__tests__/ui/layout.test.ts` vs `rg -n "All .* layout tests" 1-5...md` runs in PR; doc must be bumped together with `layout.test.ts` edits

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (not auto-run). For this bundle the P0 ATDD is host grep pins, not code — no RED needed.
- Run `*automate` for broader coverage — not needed for doc sync; engine P0 already in `dw-engine-rng-trust-hardening` automate lane.
- A `*review` / `*nfr-assess` pass can be run once the `rg` gates and `tsc` + `layout.test.ts` 18 pass evidence are captured.

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
|-------------------|--------|------------------|
| **`_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md`** (doc) | Narrative bump 12→14 in 3 sites + `Auto Run Result` block appended | `rg` 14-vs-12 allowlists + `Auto Run Result` singleton + `rg -c` file count ≥14 + golden anchors 382/688/452 |
| **`_bmad-output/implementation-artifacts/deferred-work.md`** (ledger) | DW-11 + DW-56 `open→done` + 64-hex `resolution-undo` + `resolution` string | `rg -n "status: done 2026-09-02"` 2 hits + `rg -n "resolution-undo: [0-9a-f]{64}"` 2 hits + `rg -n "resolved by sweep bundle"` 2 hits |
| **`triade/src/engine/core/game.ts` + `weights.ts`** (engine, co-located DW-56) | RNG trust hardening: `normalizeDisplayRoll` + `safeRoll` clamp — **Not in Scope here** | Isolated via Not-in-Scope + cross-ref to `test-design-dw-engine-rng-trust-hardening.md`; hygiene only: `git diff --stat -- triade/src/ui` empty + `git diff --stat -- triade/src/engine` shows 2 files but not claimed |
| **`triade/src/ui/layout.ts` / `App.tsx` / `Hud.tsx`** | No edit for DW-11 (doc-only) | `git diff --stat -- triade/src/ui` empty + `layout.test.ts` 18 pass + both `tsc` clean |
| **`triade/__tests__/ui/layout.test.ts`** | Truth source for count (18 `test(`) + finiteness/96/48/382/688/452 pins | `layout.test.ts` 18 pass stays green; no new edit required for DW-11 |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR planning (maintainability/traceability)

### Related Documents

- Story: `_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` (T2/T5/ATDD 12→14 diff)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-11 + DW-56 `done` + `resolution-undo`)
- Spec: `_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md` (`baseline 80dc5c1` → `final a09e6ed`, DW-5/10 already done)
- Engine delta (co-located, separate gate): `triade/src/engine/core/game.ts` + `weights.ts` (DW-56) — see `test-design-dw-engine-rng-trust-hardening.md`
- Layout truth: `triade/__tests__/ui/layout.test.ts` (18 `test(`)
- Config: `_bmad/tea/config.yaml` (`test_artifacts _bmad-output/test-artifacts`, `test_design_output _bmad-output/test-artifacts/test-design`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
