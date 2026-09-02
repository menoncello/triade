---
status: done
---

# TEA ATDD — dw-decision-dw-56 (done)

**Workflow:** `bmad-testarch-atdd` (red-phase acceptance scaffolds, TDD)
**Decision:** DW-56 — `Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback` (2026-09-02) — spec `_bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md` (baseline `30ebd2f`, status `done`)
**Test design:** `_bmad-output/test-artifacts/test-design-dw-decision-dw-56.md` + `_bmad-output/test-artifacts/test-design/test-design-dw-decision-dw-56.md` (9 risks, 3 high R-001..R-003, P0 38 + P1 19)

**Generated (TEA `test_artifacts: _bmad-output/test-artifacts`):**
- Checklist (canonical, per TEA config): `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-56.md` (stepsCompleted `step-01`..`step-05`, workflowType `testarch-atdd`, storyId/storyKey `dw-decision-dw-56`, generatedTestFiles `dw-decision-dw-56.clamp-roll-and-fallback-displayroll.atdd.test.ts` + `rng-trust-hardening.atdd.test.ts` reference)
- Failing acceptance tests (RED scaffolds, `it.skip`):
  - `triade/__tests__/engine/dw-decision-dw-56.clamp-roll-and-fallback-displayroll.atdd.test.ts` — 20 tests, 4 suites, `it.skip` (10 P0 + 4 P1 + 4 P2 + 2 P3) — canonical for dw-decision-dw-56, covers working-tree delta `weights.ts:20-37` + `game.ts:8-18,34,110`
  - `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` — 20 tests, 4 suites, `it.skip` (reference, bundle `dw-engine-rng-trust-hardening`, byte-identical coverage of same delta; kept for traceability)
- Existing hardened suites (reference, already green after sweep): `weights.test.ts` 9 pass, `game.test.ts` 32 pass, `spawn.test.ts` 5 pass, `adaptive-spawn-integration` 5 suites, `pending-spawn-contract` N3

**Working-tree delta covered (vs HEAD `30ebd2f` — `git diff HEAD --stat` empty, hardening already at HEAD via sweep `dw-engine-rng-trust-hardening`):**
- `triade/src/engine/core/weights.ts:20-37` — `weightedPicker` gains `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` then `scaled = safeRoll * total` (was `roll * total` with only `NaN→last` early-return; `≥1`/`Infinity` fell through `scaled≥total` → `return last` via invalid scaled, negative hit first band by accident)
- `triade/src/engine/core/game.ts:8-18,34,110` — new `normalizeDisplayRoll(raw: unknown): number` + two call sites `newGame` `displayRoll: normalizeDisplayRoll(rng())` and `move` effective `displayRoll: normalizeDisplayRoll(rng())` (was `displayRoll: rng()` unvalidated; `NaN`/`Infinity`/`1`/`"bad"` leaked outside `[0,1)` breaking `previewFor <0.6` 60/40). Branches: `!finite/non-number→0.5` midpoint (not 0, preview-neutral), `<0→0`, `≥1→1-EPSILON`, else `raw`. Preserves 1-draw budget (no `while` re-roll).
- `triade/src/engine/core/spawn.ts`/`types.ts`/`spawnConfig.ts`/`ceiling.ts` byte-identical; `sprint-status.yaml` not written (orchestrator-owned — verified `git diff --stat` has no `sprint-status.yaml`)

**Acceptance criteria mapped (12 AC → 20 P0/P1 + scans):**
- AC negative clamp `weights [1,0.5] -0.5/Infinity→0` → P0-01
- AC ≥1/Infinity clamp `1/1.5/Infinity→last` via valid `1-EPSILON` band not fallthrough → P0-02
- AC NaN/non-number guard still `last` before clamp → P0-03
- AC normalize non-finite/non-number `NaN/Infinity/undefined/null/"bad"/{}→0.5` midpoint not 0 → P0-04
- AC normalize finite clamp `-0.5→0, 1/1.5→1-EPSILON`, valid kept → P0-05
- AC newGame malformed third draw `NaN/Infinity/1/-0.5` still 9 tiles + `∈[0,1)` + 20 draws → P0-06
- AC move effective malformed `NaN→0.5, 1→1-EPSILON, -0.5→0` + spawn deterministic + 3 draws → P0-07
- AC draw-budget preserved `weightedPicker 1, newGame 20, effective 3, noop 0, no while loop` → P0-08
- AC bare site eliminated `displayRoll: rng() 0, roll*total 0, safeRoll/normalize present` → P0-09
- AC `[0,1)` invariant `1→1-EPSILON not 1, NaN→0.5 not 0, -0.5→0 not 0.5` → P0-10
- AC pipeline `weightedValue 0.39→1,0.8→3, 1→3` via clamp 40/40/20 intact → P1-01
- AC move 4 suites + N3 + adaptive + ledger `0eb6ce61 done` + `sprint` untouched → P1-02..P1-04, P2-01..P2-04, P3-01..P3-02

**Implementation checklist (red→green roadmap; all tasks already done in working tree — checklist is the re-hardening guide):**
- [x] `weights.ts:20-30` clamp `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` before `scaled` — P0-01/P0-02/P2-01/P2-02
- [x] `weights.ts:24` keep `typeof !==number || NaN→last` before clamp — P0-03/P2-03
- [x] `game.ts:8-18` implement `normalizeDisplayRoll(raw: unknown)` 3 branches + single `return 0.5` + single `Number.EPSILON` — P0-04/P0-05/P0-10/P2-01
- [x] `game.ts:34,110` wire `newGame` + `move` effective `displayRoll: normalizeDisplayRoll(rng())` — P0-06/P0-07/P0-09
- [x] Preserve 1-draw budget, no `while.*rng` loop, single `rng()` site in weights — P0-08/P2-02/P3-02
- [x] Bare-site elimination + `[0,1)` + epsilon + midpoint coupling scans — P0-09/P0-10/P2-01..P2-04
- [x] Pipeline + ledger `deferred-work.md DW-56 done 2026-09-02 resolution-undo 0eb6ce61` + no `sprint-status.yaml` write — P1-01..P1-04
- [x] Bench `10k weightedPicker <500ms O(1)` + cross-cutting `Music|bgm|RevenueCat 0` — P3-02

**Verification (read-only, no production edits):**
- RED phase (dormant, expected skip): `npm --prefix triade test 2>&1 | grep "ATDD dw-decision-dw-56"` shows `▶ ATDD dw-decision-dw-56 — P0` `﹣ [P0-01] … # SKIP` (10 P0) + `﹣ [P1-01] … # SKIP` (4 P1) + `﹣ [P2-01] … # SKIP` (4 P2) + `﹣ [P3-01] … # SKIP` (2 P3) → suite `✔` with 20 skipped. Full gate `ℹ tests 1292 pass 926 skipped 366 fail 0`.
- GREEN phase (activated, delta covers): `python3 -c "p.read_text().replace('it.skip','it')" && cp /tmp/dw56-active.test.ts … && npm --prefix triade test` shows `✔ [P0-01] … (0.7ms)` + `✔ [P0-02] …` … `✔ [P3-02] …` → 20 pass / 0 fail; full gate `1312 tests pass 946 fail 0` when both ATDD files activated (20+20). Dormant→activated delta `+20 pass / -20 skipped` proves one-at-a-time green.
- Static scans: `rg -n "safeRoll" weights.ts` 2 (def+use) / `const safeRoll` 1, `rg -n "normalizeDisplayRoll" game.ts` 3, `rg -n "Number.EPSILON" weights.ts` 1 + `game.ts` 1 =2, `rg -n "return 0.5" game.ts` 1 `weights.ts` 0, `rg -n "Math.min(Math.max(roll"` 1, `rg -n "displayRoll: rng()"` 0, `rg -n "const scaled = roll * total"` 0, `rg -n "while.*rng" triade/src/engine/core` 0, `rg -n "1 - Number.EPSILON" game.ts` 1 + `weights.ts` 1, `rg -n "dr >= 0 && dr < 1"` 1, `rg -n "raw >= 1"` 1 — all green per `test-design-dw-decision-dw-56.md` allowlists.
- `sprint-status.yaml` not written: `git status --porcelain` shows only untracked `_bmad-output/implementation-artifacts/spec-decision-dw-56…` + `_bmad-output/test-artifacts/test-design…` + this ATDD output; `git diff HEAD --stat` empty; no `sprint-status.yaml` in diff (orchestrator-owned invariant preserved).
- Tsc gates: `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` and `triade/tsconfig.test.json` clean for `game.ts`/`weights.ts` (only pre-existing `spawn-candidates-validation.atdd.test.ts:2322` unrelated to DW-56).

**Traceability:** AC→Test→File:Line: P0-01 `weights.ts:20-30`, P0-02 `weights.ts:29-30`, P0-03 `weights.ts:24`, P0-04 `game.ts:8-18`, P0-05 `game.ts:14-16`, P0-06 `game.ts:34`, P0-07 `game.ts:110`, P0-08 `weights.ts:29+game.ts:8-18`, P0-09 `weights.ts:30+game.ts:34,110`, P0-10 `game.ts:16+weights.ts:29`, P1-01 `spawn.ts:11-21+weights.ts`, ledger `deferred-work.md:467-475`. Risk coverage: R-001→P0-01..03,P0-09,P1-01,P2-01..03; R-002→P0-04..07,P0-09,P0-10,P1-02,P1-03,P2-04; R-003→P0-08,P1-02,P2-02,P3-01; R-004→P0-05,P0-10,P2-01,P2-03; R-005→P0-04,P0-10,P2-01,P2-03; R-006→P0-03,P2-03; R-007→P0-05,P0-07,P0-10,P2-04; R-008→P3-02; R-009→P1-04.

**Gate decision (informational, not NFR PASS):** P0 100% required (10/10 RED→GREEN), P1 ≥95% (4/4 green), P2/P3 ≥90% (6/6 green), high-risk R-001..R-003 100% mitigated — ATDD gate ✅ PASS (red scaffolds verified + activated green; implementation already at HEAD). Next workflow `*nfr-assess` for final PASS/CONCERNS/FAIL per NFR.

**Out-of-scope respected:** Only `test_artifacts` (`atdd-checklist-dw-decision-dw-56.md` + `dw-decision-dw-56.clamp-roll…atdd.test.ts`) and this `implementation-artifacts` marker were written; `sprint-status.yaml` was never written or reverted (orchestrator-owned). Deferred-work `DW-56 done` and `spec-decision-dw-56` were read, not edited by this workflow.
