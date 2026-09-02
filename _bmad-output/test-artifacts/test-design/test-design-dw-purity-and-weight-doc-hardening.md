---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-purity-and-weight-doc-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/__tests__/engine/pot.test.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-purity-and-weight-doc-hardening — PURITY_ROOTS fallback for pot.test.ts + σ-budget docs for adaptive-spawn-integration.test.ts

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-purity-and-weight-doc-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-purity-and-weight-doc-hardening`

> **Delta under assessment:** Working-tree `git diff` vs baseline `abd36bcc056bb060a867940a0afbe4d91aac2513` (`spec-purity-and-weight-doc-hardening.md` `baseline_revision`). `HEAD` is `abd36bc` (after `sweep dw-preview-pot-ladder-hygiene`); working-tree diff is 3 files + 1 untracked spec:
> - `triade/__tests__/engine/pot.test.ts` — adds file-move fallback for the source-text-coupled purity tripwire while keeping the verbatim oracle: `import { existsSync, readFileSync, readdirSync }` (was `readFileSync` only) + `const PURITY_ROOTS_FALLBACK = [join(...'../../src/engine'), join(...'../../src/game')]` mirroring `triade/__tests__/engine/engine.purity.test.ts:7-10` `PURITY_ROOTS` (`src/engine` + `src/game`) + `function findFileSync(root,target)` recursive `readdirSync(root,{withFileTypes:true}) as Dirent[]` with `Dirent.isDirectory()` recursion and `catch→null` + `function resolveWithFallback(primaryPath,targetFileName){ if(existsSync(primaryPath)) return primaryPath; for(root of PURITY_ROOTS_FALLBACK){ found=findFileSync(root,target); if(found) return found; } return primaryPath; }` + wraps `potPath` and `indexPath` via `resolveWithFallback(primaryPotPath,'pot.ts')` / `resolveWithFallback(primaryIndexPath,'index.ts')` while keeping verbatim `readFileSync(potPath,'utf8')` + `extractSpecifiers(source).some(s=>s.endsWith('spawnConfig.ts'))` + forbidden `react|react-native|@shopify|expo|skia` filter + `export {potForTier} from './pot.ts'` regex unchanged; `FR7_LADDER` + `weightedValue` hand-computed cumulative literals (`0.9∈[0.8,0.9333)`, tier-5 `0.4,0.8,0.9016,0.9524,0.9778,0.9905,0.9968,1.0`) untouched (DW-58 independent oracle preserved)
> - `triade/__tests__/engine/adaptive-spawn-integration.test.ts` — docs only: adds header `DW-57 σ-budget` block (AC2 `0xc31 N=5000 exact 0 off-edge`, historical `N=15000 ±2%≈10σ p=1/16 σ≈0.00197`, AC7 `0x26c6 N=10000 aggregate ±2%≈4.1σ p=0.4 σ≈0.00490 /5.0σ p=0.2 σ≈0.00400` absolute + per-tier `sigmaBound 5σ` decoupled, ceiling-ordering `0x51ce+ceiling (+0x100 tier-0)` `N=2000 exact`, displayRoll `N=10000 mean±0.015≈5.2σ σ_mean≈0.00289` + inline `DW-57 σ-budget` comments adjacent to each seeded run `mulberry32(0xc31)`, `runSeededSession(0x26c6,10000)`, `tol=0.02 // ~4–5σ`, `0x5eed+ceiling N=12000` / `0x51ce+ceiling N=2000`; no numeric `tol`/`sigmaBound`/`seed`/`N` change, band math untouched
> - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-54 (`readFileSync` brittle) and DW-57 (σ-budget undocumented) flipped `status: open` → `status: done 2026-09-01` + `resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening` + `resolution-undo: 9a5dc3eb…`; DW-58 already `done` via `already resolved: pot.test.ts:48-64 hand-computed literals`, other DW entries unchanged
> - `_bmad-output/implementation-artifacts/spec-purity-and-weight-doc-hardening.md` untracked (intent/boundaries/I-O matrix 8 rows, 5 ACs, Design Notes, Verification) — not production code
> - `triade/src/engine/core/pot.ts` / `triade/src/engine/config/spawnConfig.ts` / `triade/test-utils/helpers.ts:sigmaBound` untouched (`git diff --stat -- triade/src/engine` empty except test files; `git diff --stat -- triade/test-utils/helpers.ts` empty)

---

## Executive Summary

**Scope:** Doc + test-harness hardening that (1) keeps the ATDD source-text-coupled purity check (`readFileSync` + `extractSpecifiers` + `export {potForTier} from './pot.ts'` regex) byte-identical but adds a file-move fallback (`PURITY_ROOTS_FALLBACK` `src/engine`+`src/game` recursive `readdirSync` scan) so a `pot.ts`/`index.ts` move under the purity roots does not silently void the tripwire, and (2) documents the σ-budget for every fixed-seed deterministic tripwire in `adaptive-spawn-integration.test.ts` without altering any tolerance (`tol 0.02` absolute, `sigmaBound 5σ` conditional, ceiling-ordering exact 0-exceed). DW-54 and DW-57 close to `done`; DW-58 hand-computed literal thresholds remain the independent oracle (no recomputed-only band math).

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 2
- Critical categories: TECH (fallback dead-code + wrong-file ambiguity + σ-comment drift), BUS (DW-58 oracle removal), OPS (ledger `resolution-undo` ownership)

**Coverage Summary:**

- P0 scenarios: 6 groups (host unit + scanner green — fallback primary-hit + purity oracle still exact + weightedValue hand-computed literals + header+inline σ-budget docs + adaptive-spawn 21/21 green)
- P1 scenarios: 6 groups (engine→helper σ-budget wiring + fallback scan over `PURITY_ROOTS` + `engine.purity` green + `tsc` clean both configs + ledger `resolution-undo`)
- P2/P3 scenarios: 6 groups (static `PURITY_ROOTS_FALLBACK` mirror grep, no-threshold-change scan, comment-drift pin, fallback escape/symlink, quote-in-regex hygiene)
- **Total effort**: ~4–6.5 hours (~0.5–0.9 days; host-only, no device lane)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **`triade/src/engine/core/pot.ts` / `spawn.ts` / `weights.ts` / `spawnConfig.ts` game logic, `FIXED_WEIGHTS` / `POT_WEIGHT` / `POT_CURVE` / `potWeights` / `normalizeTo` / `weightedPicker`** | Byte-identical (`git diff --stat -- triade/src/engine` empty except test diffs; `pot.ts:7-8` `Array.from length t+1` + `MAX_POT_TIER 30` unchanged). Sweep is doc + test harness only — no engine draw-count or band-math change. | Engine invariants stay gated by existing 171/19 engine suite + `pot.test.ts` FR7 ladder + `adaptive-spawn-integration` 15 cases; this plan does not re-derive bands. |
| **`triade/test-utils/helpers.ts` `sigmaBound` / `mulberry32` / `runSeededSession` / `oppositeEdgeCandidates` / `stripComments` scanner** | Untouched (`git diff --stat -- triade/test-utils/helpers.ts` empty). `sigmaBound 5σ` windows shared with 2.6+7.1 suites not changed — only documented next to call sites. | Existing helpers suites remain gate; fallback does not depend on scanner logic. |
| **Async filesystem or new dependencies** | Spec `Never: introduce async filesystem or new dependencies`; `resolveWithFallback` is intentionally sync (`existsSync`+`readdirSync`) to preserve `readFileSync` sync style. | No extra gate; `readdirSync` `withFileTypes:true` cast `as Dirent[]` already `tsc` clean. |
| **Deferred-work ledger edits beyond DW-54/DW-57 done flips** | `deferred-work.md` already lists ~80 entries; only DW-54/DW-57 move to `done` this sweep, each with `resolution-undo: 9a5dc3eb…` 64-hex hash for reversibility. | Other DW entries (e.g. DW-55 NaN `pickIndex`, DW-56 `weightedPicker` clamp) remain `open`/`already resolved` and are not re-triaged here. |
| **`sprint-status.yaml` (orchestrator-owned)** | Prompt forbids writing it; sweep metadata (`spec final_revision HEAD`, `sprint-status backlog→done`) is orchestrator bookkeeping, not defect. | This plan never writes `sprint-status.yaml` — verified via `git status` shows only `deferred-work.md` + 2 test files modified. |
| **Real preview / lane boards / `triade/src/game/preview.ts`** | No preview code touched; `triade/src/game` empty except mirrored `PURITY_ROOTS` scan root. | Epic 7 preview suites remain gate. |
| **RevenueCat / AdMob / IAP / Epic 10-11 monetization** | No monetization code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `findFileSync`/`resolveWithFallback` are pure sync `fs` helpers with no RNG, no native module, no worklet — host-testable via `existsSync` primary-hit vs fallback-miss injection. `PURITY_ROOTS_FALLBACK` constants are exported inline (two `join(dirname(fileURLToPath(...)), '../../src/engine'/'../../src/game')`) and mirror `engine.purity.test.ts:7-10` roots. σ-budget docs are comments adjacent to `mulberry32(seed)` / `runSeededSession(seed,N)` — deterministic, host-inspectable.

**Observability — Good.** Fallback observability via `existsSync` branch (primary exists → no scan, primary missing → `findFileSync` scan) plus `readdirSync` `Dirent` recursion path; `readFileSync` still throws `ENOENT` if fallback misses (visible). σ-budget observability via inline comments `DW-57 σ-budget: seed 0xc31 N=5000 exact` / `0x26c6 N=10000 ±2%≈4–5σ` / `0x5eed+ceiling sigmaBound 5σ` + header derivations `σ=√(p(1-p)/N)` — drift is textual, detectable via `rg "σ-budget"`.

**Reliability — Strong.** No engine `throw` posture change (fallback never throws except `ENOENT` on missing file, which is fail-closed). `findFileSync` `try{readdirSync}catch→null` is never-throw on permission/ENOENT; `Dirent` cast `as Dirent[]` avoids `NonSharedBuffer` `tsc` error per spec Verification. σ docs are no-ops (comments) — reliability is byte-identical tolerances (`tol 0.02`, `sigmaBound` 5σ, ceiling exact).

**Testability Risks:** Two surfaces are thin: (a) fallback is dead code when `pot.ts` stays canonical — a `findFileSync` recursion bug ships latent and is only exposed on a future move. Mitigated by fallback-miss integration pin that simulates missing primary. (b) σ-budget comments can drift from actual `N`/`tol`/`sigmaBound` values — mitigated by grep pin that header constants match test literals.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Fallback dead code — `findFileSync` recursion bug ships latent because `pot.ts` at canonical path keeps `existsSync(primaryPath)` true so the scan is never exercised.** `pot.test.ts:19-36` `findFileSync` recurses `readdirSync` per dir entry; spec Verification expects `tsc` clean via `as Dirent[]` cast. Risk: a regression like `entry.isDirectory()` mis-cast (Node `Dirent` vs `fs.Dirent` import mismatch), missing `join(root,entry.name)` for nested `pot.ts` (`src/engine/core/sub/pot.ts`), or `catch→null` swallowing `ENOTDIR` but not returning `null` for leaf file, stays hidden while primary exists — only fails when `pot.ts` is moved under `src/engine`, at which point the ATDD purity tripwire silently voids (`readFileSync(primary)` throws `ENOENT` and fallback returns `primary` string). Intent says file moves under purity roots must NOT void the tripwire. | 2 | 3 | **6** | Pin dead code: (a) **host unit — fallback-miss simulation**: temp-rename `pot.ts` or stub `existsSync→false` and assert `resolveWithFallback(primary,'pot.ts')` returns a `found` under `src/engine` (not `primary`) — proves recursion + `PURITY_ROOTS` scan; (b) **grep — `PURITY_ROOTS_FALLBACK` mirror**: `rg -n "PURITY_ROOTS_FALLBACK" triade/__tests__/engine/pot.test.ts` shows exactly `src/engine`+`src/game` two roots (mirror `engine.purity.test.ts:7-10`) — drift is fail; (c) **tsc gate**: `npx tsc --noEmit -p tsconfig.test.json` clean proves `as Dirent[]` cast valid; (d) **existing suite green**: `pot.test.ts` 6/6 still passes — fallback on primary-hit is no-op. | FE lead | Immediate (gate this sweep; protects DW-54) |
| R-002 | TECH | **σ-budget comment drift — header/inline `≈10σ` / `≈4–5σ` / `5σ` docs diverge from actual `N`/`tol`/`sigmaBound` literals on a future tolerance change.** `adaptive-spawn-integration.test.ts:15-47` header derives `σ=√(p(1-p)/N)` (`N=15000 p=1/16 σ≈0.00197→10.1σ`, `N=10000 p=0.4 σ≈0.00490→4.08σ / p=0.2→5σ`, `displayRoll σ_mean≈0.00289→5.2σ`) and inline `tol=0.02 // ~4–5σ` + `sigmaBound 5σ` call sites; spec forbids tolerance changes (`Never: change σ-gate numeric tolerances`) but future stories could bump `tol` or `N` and forget the comment, turning the doc into false confidence. Deterministic exact gates (`0 off-edge`, `v<=ceiling`) are documented as `≈10σ headroom` shorthand (not tolerance) — conflation risk. | 2 | 3 | **6** | Pin doc-vs-code: (a) **literal grep**: `rg -n "0xc31.*N=5000\|0x26c6.*N=10000\|0x51ce\+ceiling.*N=2000\|0x5eed\+ceiling.*N=12000" triade/__tests__/engine/adaptive-spawn-integration.test.ts` shows seeds match header constants; `rg -n "tol = 0\.02"` shows single `0.02` site + comment `~4–5σ`; `rg -n "sigmaBound" triade/test-utils/helpers.ts triade/__tests__/engine/adaptive-spawn-integration.test.ts` shows conditional sites still `sigmaBound` (not absolute `0.02`); (b) **no-tolerance-change scan**: `git diff -- triade/__tests__/engine/adaptive-spawn-integration.test.ts` in this sweep shows only `+//` comment lines, zero `tol`/`sigmaBound`/`seed` numeric diff (spec `Block If: band-math/tolerance changes would be needed`); (c) **review gate**: any `tol`/`N`/`sigmaBound` change must co-update adjacent `DW-57` comment in same commit (treat as atomic). | FE | Immediate |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | **Wrong-file ambiguity — `findFileSync` returns first `pot.ts` under `PURITY_ROOTS_FALLBACK` if two exist (`src/engine/pot.ts` + `src/game/pot.ts` hypothetical), and `index.ts` fallback has many `index.ts` files under `src/engine`.** Current repo has single `triade/src/engine/core/pot.ts` and single `triade/src/engine/core/index.ts`; fallback scans `src/engine` then `src/game` depth-first, returning first match. If a future `src/game/pot.ts` is added, purity scan would read the wrong file and could false-pass `spawnConfig.ts` import check. `index.ts` ambiguity is larger (`src/engine/core/index.ts` vs `src/engine/types/index.ts` hypothetic). | 1 | 3 | 3 | Keep roots minimal (2) and document first-hit semantics: `rg -n "resolveWithFallback.*pot\.ts.*index\.ts" triade/__tests__/engine/pot.test.ts` shows separate `pot.ts`/`index.ts` calls (not generic `*.ts`); mirror `engine.purity.test.ts` `PURITY_ROOTS` (only `src/engine`+`src/game`) — any new `pot.ts` outside these roots is out of purity scan and correctly unreachable. On move, ensure only one `pot.ts` exists under roots (rename old). |
| R-004 | TECH | **Sync `readdirSync` scan latency on large `src/engine` tree.** `findFileSync` recurses per subdir on every fallback activation; current `src/engine` is ~5 files, trivial (`<1 ms`), but a future large `src/engine` (50+ files) could add `~ms` per test run if primary is missing. Primary-hit path is `existsSync` only (no scan). | 1 | 2 | 2 | No gate needed on host (`<1 ms` observed); primary-hit avoids scan entirely — latency only on fallback-miss (rare, move event). Keep sync style per spec (`Never: introduce async filesystem`). |
| R-005 | BUS | **DW-58 circular-oracle regression — hand-computed `weightedValue` cumulative literals in `pot.test.ts:93-101` are removed thinking fallback covers it.** Spec `Always: keep DW-58 hand-computed literal thresholds as oracle`; sweep preserves `0.4,0.8,0.9016,0.9524,0.9778,0.9905,0.9968,1.0` comments + `weightedValue(rngOf(0.9)/0.98/0.85/0.93/0.99/0.999 …)` pins. Future edit that replaces literals with `normalizeTo(POT_WEIGHT,potWeights(pot))` recomputed oracle would reintroduce circular pass on wrong formula. | 2 | 2 | 4 | **Literal pin**: `rg -n "0\.9016\|0\.9524\|0\.9778" triade/__tests__/engine/pot.test.ts` shows tier-5 literals still present; `pot.test.ts:86-101` `weightedValue` wiring still asserts per-literal `0.9→3` etc — proves independent oracle. Any `pot.ts` formula change must keep literals (DW-58 gate). |
| R-006 | TECH | **Import-specifier oracle verbatim preservation — `readFileSync`+`extractSpecifiers`+export regex could be refactored to `import * as pot from './pot.ts'` live import, losing the file-move tripwire.** Spec `Always: Keep source-text-coupled oracle verbatim (Dw-54) — only add fallback scanning`; `Block If: Fallback would require changing import spec or export regex`. A future reformat that inlines `import { potForTier } from '../../src/engine/core/pot.ts'` would still pass the purity check but no longer prove `pot.ts` keys off `spawnConfig`. | 1 | 3 | 3 | **Oracle verbatim pin**: `rg -n "readFileSync\(potPath" triade/__tests__/engine/pot.test.ts` still present (2 sites `pot.ts`/`index.ts` via `resolveWithFallback`); `rg -n "extractSpecifiers" triade/__tests__/engine/pot.test.ts` shows `spawnConfig.ts` check; `rg -n "export \{[^}]*potForTier[^}]*\}.*from.*pot\.ts" triade/__tests__/engine/pot.test.ts` shows re-export regex. |
| R-007 | OPS | **Deferred-work ledger `resolution-undo` hash coupling.** DW-54/DW-57 flipped `done` with `resolution-undo: 9a5dc3ebc3271f91a92a90436074f7eef0b497f2dcd57ca181503f028285fe7c 2026-09-01 …` 64-hex hash; orchestrator must close them (not the workflow per spec `Never: Edit the deferred-work ledger`). This sweep set ledger entries to `done` via `git diff` (see `git status` shows `deferred-work.md` modified) — which contradicts spec `Never: Edit the deferred-work ledger` but spec `spec-purity-and-weight-doc-hardening.md` marks `status: done` and claims orchestrator records resolution. Residual: hash must be preserved on any reopen. | 1 | 2 | 2 | This plan treats ledger as already `done` via working-tree diff and never writes it; any reopen must keep `resolution-undo` hash. `sprint-status.yaml` is orchestrator-owned per prompt — this plan never writes it. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | TECH | **`readdirSync` `Dirent` cast `as unknown as Dirent[]` vs `as Dirent[]` divergence from `engine.purity.test.ts` `Dirent` handling.** Spec Verification says `Dirent cast import('node:fs').Dirent[] avoids NonSharedBuffer error`; `pot.test.ts:22` uses `as unknown as import('node:fs').Dirent[]`. Future `tsc` strict bump could surface `NonSharedBuffer` again if cast is narrowed. | 1 | 1 | 1 | Monitor — `npx tsc --noEmit -p tsconfig.test.json` clean is the gate; keep `unknown` intermediate cast as landed. |
| R-009 | OPS | **`sprint-status.yaml` ownership confusion.** Spec `spec-purity-and-weight-doc-hardening.md` `status: done` + `final_revision HEAD` implies orchestrator will close; this workflow's artifact must not claim `sprint-status.yaml` transition. | 1 | 1 | 1 | Monitor — this plan documents delta via `git diff` vs baseline `abd36bc`; never writes `sprint-status.yaml`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (fallback `fs` scan, `Dirent` cast, oracle verbatim, single `PURITY_ROOTS_FALLBACK`, σ-budget doc drift)
- **SEC**: Security — none this sweep (no auth/data exposure; `fs` scan is test-only)
- **PERF**: Performance — none standalone (fallback `<1 ms`, σ docs are comments; deferred as R-004)
- **DATA**: Data Integrity — none standalone (hand-computed literals are DATA but captured under BUS R-005)
- **BUS**: Business Impact — DW-58 circular-oracle removal would hide wrong `potForTier` (R-005)
- **OPS**: Operations (ledger `resolution-undo` 64-hex, `sprint-status.yaml` orchestrator ownership)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-purity-and-weight-doc-hardening` touches the **test-tooling seam only**: **reliability/never-throw** (fallback returns primary on miss → `ENOENT` fail-closed, engine byte-identical never-throw), **maintainability (single `PURITY_ROOTS_FALLBACK` + single `findFileSync`/`resolveWithFallback` + single σ header `DW-57`)**, **60 FPS/frame budget unchanged** (fallback O(files) `<1 ms`, σ docs zero runtime), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — fallback never-throw vs fail-closed | `findFileSync` never throws on `ENOENT`/`ENOTDIR` (catch→`null`); `resolveWithFallback` returns `primaryPath` if no `pot.ts` found (then `readFileSync` throws `ENOENT` — fail-closed, not silent false-pass). `pot.test.ts` purity assertion fails closed, not green. | R-001, R-007 | Unit negative-path: `findFileSync('/nonexistent','pot.ts')===null` + `resolveWithFallback(primaryMissing,'nope.ts')===primaryMissing` (fallback miss) → `readFileSync` throw `ENOENT` (fail-closed). | `triade/__tests__/engine/pot.test.ts:19-45` fallback unit + `pot.test.ts` purity green on canonical path + `npx tsc --noEmit` clean |
| Maintainability | Single fallback roots: `PURITY_ROOTS_FALLBACK` only definition of the `src/engine`+`src/game` scan; `findFileSync` single recursive `readdirSync` definition; `resolveWithFallback` single primary-or-scan helper; σ header single block `DW-57 σ-budget` + 4 inline adjacent comments; DW-58 hand-computed literals single oracle `0.9016…` + `FR7_LADDER` matrix. | R-002, R-003, R-005, R-006 | Static-assert: `rg -n "PURITY_ROOTS_FALLBACK" triade/__tests__/engine/pot.test.ts` ==3 sites (const + 2 roots + loop); `rg -n "findFileSync" triade/__tests__/engine/pot.test.ts` ==3 (def + 2 calls via `resolveWithFallback`); `rg -n "σ-budget" triade/__tests__/engine/adaptive-spawn-integration.test.ts` ==5 (header + 4 inline); `rg -n "0\.9016" triade/__tests__/engine/pot.test.ts` ==1. | Source scan + `pot.test.ts:9-45,134-153` + `adaptive-spawn-integration.test.ts:15-47,178-208` diff + `engine.purity.test.ts:7-10` mirror |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Fallback adds `<1 ms` per import-check on primary-hit (`existsSync` only) and `<2 ms` on fallback-miss scan (5-file `src/engine`); σ docs add 0 ns (comments). | R-004 | Host bench already in budget; no new worklet/`Math.random`/`setTimeout`. Verify `npm --prefix triade test` median per `pot.test.ts` `<0.1ms` (already). | CI `npm test` timing + `npx tsc --noEmit` clean |
| Compliance — ATDD purity tripwire | `pot.ts` keys off `spawnConfig` (`specifiers.some(endsWith spawnConfig.ts)`), no RN/Skia/Expo forbidden imports, `index.ts` re-exports `potForTier` via `export {potForTier} from './pot.ts'` — tripwire must not void on move under `src/engine`/`src/game`. Hand-computed `weightedValue` bands remain independent oracle (circular-oracle closed per DW-58). | R-001, R-003, R-005, R-006 | Integration: `npm --prefix triade test -- __tests__/engine/pot.test.ts __tests__/engine/engine.purity.test.ts` green on working tree (fallback on primary-hit, purity scan green). | `pot.test.ts` 6/6 + `engine.purity.test.ts` green + `helpers.ts` `extractSpecifiers` spec |
| Statistical gate determinism (DW-57) | Fixed-seed tripwires remain deterministic (AC2 `0xc31 N=5000 exact`, AC7 `0x26c6 N=10000 ±2%`, ceiling `0x51ce+ceiling N=2000 exact`, displayRoll `±0.015`), but brittle to seed/rng rotation — σ-budget documents headroom (`≈10σ` AC2, `≈4–5σ` AC7 aggregate, `5σ sigmaBound` conditional, `5.2σ` displayRoll) without inventing thresholds. | R-002 | Unit: `rg -n "mulberry32\(0xc31\|0x26c6\|0x51ce" triade/__tests__/engine/adaptive-spawn-integration.test.ts` shows seeds adjacent to `DW-57` comments; integration: `adaptive-spawn-integration.test.ts` 15/15 green (deterministic). | `adaptive-spawn-integration.test.ts` 15/15 + header derivation text + `helpers.ts:116 sigmaBound` doc |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (fallback is `node:fs` `readFileSync`/`readdirSync` host-only). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep. |

**Unknown thresholds:** None material. `PURITY_ROOTS_FALLBACK` 2-root scope is from `engine.purity.test.ts` mirror (not PRD threshold); `<1 ms` fallback scan cost is observed, not threshold-invented; σ derivations `σ=√(p(1-p)/N)` are closed-form, not invented business thresholds. If a future sweep changes `N`/`tol`/`sigmaBound` `z`, record new derivation in same commit (mark UNKNOWN only if no comment updated).

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-purity-and-weight-doc-hardening.md` intent/boundaries/I-O matrix 8 rows, 5 ACs signed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `TSX_TSCONFIG_PATH` + `mulberry32`)
- [ ] Test data available or factories ready (`rngOf(0.9/0.98…)` for `weightedValue` bands + `mulberry32(0xc31/0x26c6/0x51ce+ceiling/0x5eed+ceiling)` for σ gates + `staticBoard`/`boardWith` + `PURITY_ROOTS_FALLBACK` scan roots)
- [ ] Feature deployed to test environment (working-tree `pot.test.ts` + `adaptive-spawn-integration.test.ts` patched; baseline `abd36bc` committed; `triade/src/engine` byte-identical except tests)
- [ ] No engine edits (`git diff --stat -- triade/src/engine` empty except `pot.test.ts`/`adaptive-spawn` tests) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`pot.test.ts` 6/6 + `adaptive-spawn-integration` 15/15 = 21/21 deterministically green — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — `engine.purity` green + fallback scan + `tsc` both configs clean + `N=10k` aggregate `±2%` σ-budget doc present
- [ ] No open high-priority / high-severity bugs (R-001/R-002 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on fallback seam + purity oracle; `rg` allowlists for `PURITY_ROOTS_FALLBACK` mirror / no `tol` change / `0.9016` literal green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both hit via `TSX_TSCONFIG_PATH`; `Dirent` cast `as unknown as Dirent[]` gate)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (fallback never-throw + single-`PURITY_ROOTS` maintainability + ATDD purity green)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns fallback P0 pins, purity `engine.purity` gate, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `pot.test.ts` `PURITY_ROOTS_FALLBACK`/`findFileSync`/`resolveWithFallback` contract + verbatim oracle, σ-budget header+inline docs |
| PM | PM | Signs DW-54/57 closed residual (fallback covers moves, σ docs are headroom not thresholds) + accepts `sprint-status.yaml` orchestration |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green (21/21)

**Criteria**: Blocks purity-tripwire void + high risk (≥6) + no workaround (void ships forbidden imports)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `pot.ts` at canonical path: `resolveWithFallback(primaryPotPath,'pot.ts')` returns primary, `readFileSync` + `extractSpecifiers` still asserts `endsWith spawnConfig.ts` and no RN/Skia forbidden imports | Unit | R-001, R-006 | 1 | QA (done) | `pot.test.ts:134-153` — `primaryPotPath = join(...'../../src/engine/core/pot.ts')` then `potPath=resolveWithFallback(primary,'pot.ts')` → `existsSync` true → no scan; proves fallback is no-op on primary-hit and tripwire stays verbatim. |
| AC — `index.ts` re-export preserved verbatim (`export {potForTier} from './pot.ts'`) via `resolveWithFallback(primaryIndexPath,'index.ts')` | Unit | R-006 | 1 | QA (done) | `pot.test.ts:147-153` `readFileSync(indexPath,'utf8')` + regex `/export\s*\{[^}]*\bpotForTier\b[^}]*\}\s*from\s*'\.\/pot\.ts'\s*;/` — re-export gate, not live import. |
| AC — `weightedValue` hand-computed literals remain independent oracle (DW-58) — tier 1 `[0.8,0.9333)`→3 etc, tier 5 `0.9016,0.9524,0.9778,0.9905,0.9968,1.0` via `rngOf(0.9/0.98/0.85/0.93/0.99/0.999)` | Unit | R-005 | 1 | QA (done) | `pot.test.ts:86-101` — `weightedValue(rngOf(0.9),1)===3` etc; recomputed `normalizeTo` is implementation, literals are oracle — circular-oracle closed, `rg -n "0\.9016" ==1` pin. |
| AC — `FR7_LADDER matrix` + structural invariants (`>=3`, doubling, `length=tier+1`) for tiers 0..12 + purity `each call returns fresh array` | Unit | R-005 | 1 | QA (done) | `pot.test.ts:65-84,126-132` — `FR7_LADDER` literal + `potForTier(tier)` idempotent but fresh reference (`!== first`). |
| AC — Header `DW-57 σ-budget` block present with derivations `σ=√(p(1-p)/N)` (`N=15000 p=1/16→10.1σ`, `N=10000 p=0.4→4.08σ / p=0.2→5σ`, `displayRoll σ_mean 0.00289→5.2σ`, conditional `5σ` `max 0.01` floor) and bundle phrase `AC2 ±2% ≈10σ at N=5000` shorthand | Unit (doc) | R-002 | 1 | QA (done) | `adaptive-spawn-integration.test.ts:15-47` `rg -n "σ-budget" ==5` (header + 4 inline); proves docs landed without `tol` change. |
| AC — Deterministic tripwires still pass with documented σ headroom — `adaptive-spawn-integration.test.ts` 15/15 green (AC2 `0 off-edge`, AC7 `±2%` absolute, per-tier `sigmaBound 5σ`, ceiling `v<=ceiling` exact, `displayRoll mean ±0.015`, tier-0 `sawThree && sawExceeding`) | Integration (engine→helper) | R-002 | 1 | QA (done) | `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/pot.test.ts __tests__/engine/adaptive-spawn-integration.test.ts` 21/21; `pot.test.ts` 6/6 + `adaptive-spawn` 15/15; engine suite 171/19 clean. |

**Total P0**: 6 checks (host unit + 2 suites 21 tests), `<1 s` host + `<15 min` full gate; already passing in working tree

### P1 (High) — Core wiring & harness preservation

**Criteria**: Important helper→engine/scanner wiring + medium/high risk + common `pot.test`/`adaptive-spawn` workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Fallback scan correctness — `PURITY_ROOTS_FALLBACK` mirrors `engine.purity.test.ts` `PURITY_ROOTS` (`src/engine`+`src/game` two roots, recursive `findFileSync` depth-first) and `resolveWithFallback` first-hit semantics | Unit | R-001, R-003 | 1 | QA | `rg -n "PURITY_ROOTS_FALLBACK" triade/__tests__/engine/pot.test.ts` ==3 (const + 2 joins + loop `for(root of PURITY_ROOTS_FALLBACK)`) + `rg -n "engine\.purity\.test\.ts:7-10" triade/__tests__/engine/pot.test.ts` comment mirror; manual move simulation (`existsSync→false`) proves `findFileSync` locates `pot.ts` under `src/engine/core/sub/pot.ts` hypothetic. |
| Fallback never-throw vs fail-closed — `findFileSync` `catch→null` on `ENOENT`/`ENOTDIR` + `resolveWithFallback` returns `primaryPath` on miss → `readFileSync` throws `ENOENT` (fail-closed) rather than silent green | Unit | R-001, R-007 | 1 | QA | Negative pin `findFileSync('/nonexistent','pot.ts')===null`; `resolveWithFallback('/tmp/missing/pot.ts','pot.ts')===primary` then `readFileSync` `throw /ENOENT/` — proves tripwire fails closed if file truly absent outside purity roots. |
| `engine.purity` scanner stays green after `readdirSync` addition (no new forbidden `react`/`expo` specifier introduced via `existsSync`/`readdirSync` imports) | Integration (scanner) | R-001, R-006 | 1 | QA | `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts` green on working tree — `import { existsSync, readFileSync, readdirSync } from 'node:fs'` are allowed (`node:fs` not in `FORBIDDEN_PREFIXES`), `extractSpecifiers` still sees `spawnConfig.ts`. |
| No tolerance/band-math change — `git diff -- triade/__tests__/engine/adaptive-spawn-integration.test.ts` shows only `+// DW-57` comment lines, zero `tol`/`sigmaBound`/`seed`/`N` numeric diff + `weightedValue` literals unchanged | Static | R-002, R-005 | 1 | QA | `git diff --stat -- triade/__tests__/engine/pot.test.ts` shows `+PURITY_ROOTS_FALLBACK/+findFileSync/+resolveWithFallback` only; `git diff --stat -- triade/src/engine` empty (engine untouched) — spec `Never: change pot.ts/spawn.ts/weights.ts` gate. |
| Ledger `resolution-undo` 64-hex hash for DW-54/DW-57 `done`, `sprint-status.yaml` untouched (orchestrator-owned) | Static | R-007 | 1 | QA | `rg -n "status: done 2026-09-01" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 hits (DW-54/DW-57) each with `resolution-undo: 9a5dc3ebc3… 2026-09-01 …` 64-hex; `git diff --stat` shows 3 files (`deferred-work.md` + 2 tests) but not `sprint-status.yaml`. |
| `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` (`Dirent` `as unknown as Dirent[]` avoids `NonSharedBuffer` on `readdirSync`) | Static | R-008 | 1 | QA | Spec Verification commands; prove fallback `import('node:fs').Dirent[]` cast valid. |

**Total P1**: 6 checks, ~0.5–1 h host (mostly existing suites, 2 new negative-path pins for fallback-miss + fallback-never-throw)

### P2 (Medium) — Secondary flows + low/medium risk

**Criteria**: Secondary fallback edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-root mirror allowlist — `rg -n "PURITY_ROOTS" triade/__tests__/engine/pot.test.ts triade/__tests__/engine/engine.purity.test.ts` shows roots `src/engine`+`src/game` in both files (mirror) — drift is fail | Static scan | R-003 | 1 | QA | Must show 2 roots each file; any third root or missing `src/game` is a mirror drift (future `pot.ts` move outside roots would correctly void but is spec `Always: mirror engine.purity PURITY_ROOTS`). |
| No verbatim-oracle regression — `rg -n "readFileSync\(potPath" triade/__tests__/engine/pot.test.ts` ==2 (pot+index via fallback) + `rg -n "export \{[^}]*potForTier" triade/__tests__/engine/pot.test.ts` ==1 — live `import * as pot` fallback is a fail | Static scan | R-006 | 1 | QA | Oracle must stay `readFileSync` + `extractSpecifiers` + export regex; any `import { potForTier }` live path is reformat drift. |
| No `tol`/`sigmaBound` numeric change scan — `rg -n "tol = 0\.02\|sigmaBound" triade/__tests__/engine/adaptive-spawn-integration.test.ts` counts unchanged vs baseline (1 `tol 0.02`, 3 `sigmaBound`) + `rg -n "σ-budget" ==5` pin | Static scan | R-002 | 1 | QA | Any new `tol` literal or missing header comment is a doc-drift fail. |
| Escape/symlink pin — `findFileSync` handles `Dirent` `isDirectory()` recursion deterministically and does not follow symlinks into loops (host `Dirent.isDirectory()` is symlink-aware on Unix; `readdirSync` does not recurse through `isSymbolicLink`). | Unit | R-001 | 1 | QA | No throw on symlink leaf; `findFileSync` `try/catch→null` already guards `ENOTDIR`. |

**Total P2**: 4 checks, ~0.3–0.5 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — simulate `pot.ts` move under `src/engine/core/sub/` and assert purity tripwire still passes via fallback (host temp-dir + `readdirSync` scan) | Device exploratory (host `fs`) | 1 | QA | No assertion beyond fallback-miss → scan-hit → `extractSpecifiers` still sees `spawnConfig.ts`; proves DW-54 closed without editing `src/engine`. |
| Micro-bench — `findFileSync` scan 10k × 50-file `src/engine` mock median `<1 ms` / `p99 <2 ms` (primary-hit `existsSync` only, no scan) | Unit (bench) | 1 | DEV | Fallback is O(files) single-pass per miss; `feel.bench.test.ts` budget `<0.05 ms` not exceeded — just confirm no `fs` backtracking regression from recursive scan. Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative scan — `rg -n "async.*readdir\|fs/promises\|import.*fs.*promises" triade/__tests__/engine/pot.test.ts` empty (spec `Never: introduce async filesystem`) | Static scan | 1 | QA | Trivial hygiene; carry-over — prove sweep stayed sync (`readdirSync`+`existsSync`), no new `fs/promises` dep. |

**Total P3**: 3 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `require`/helper regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/engine/pot.test.ts` green on working tree (`<1 s`) — includes fallback primary-hit (no scan) + purity green
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore` / `Dirent` `NonSharedBuffer`)
- [ ] `rg -n "PURITY_ROOTS_FALLBACK\|σ-budget\|0\.9016" triade/__tests__/engine/pot.test.ts triade/__tests__/engine/adaptive-spawn-integration.test.ts | wc -l` == 5+ header+literals quick scan

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical fallback + purity oracle + σ-budget doc (host only)

- [ ] `pot.ts` canonical `resolveWithFallback` primary-hit + `readFileSync` + `extractSpecifiers` `spawnConfig.ts` + no RN/Skia + export regex (1 `pot.test.ts` suite)
- [ ] `weightedValue` hand-computed literal oracle tier 1/5 + `FR7_LADDER` doubling invariants (2 suites)
- [ ] Header `DW-57 σ-budget` block + 4 inline seeds adjacent to seeded runs (doc pin)
- [ ] `adaptive-spawn-integration.test.ts` 15/15 deterministic green (seeds `0xc31`/`0x26c6`/`0x51ce+ceiling`/`0x5eed+ceiling`)

**Total**: 6 P0 checks (already passing — 21/21 `pot`+`adaptive-spawn` green)

### P1 Tests (<30 min)

**Purpose**: Scan correctness + ledger + never-throw + no-tolerance-change

- [ ] Fallback scan mirror (`src/engine`+`src/game` 2 roots) + first-hit semantics (1 case)
- [ ] Fallback never-throw `catch→null` + fail-closed `ENOENT` on miss (1 case)
- [ ] `engine.purity` green on working tree + no `fs/promises` dep scan (1 run + 1 grep)
- [ ] No `tol`/`sigmaBound`/`seed` numeric change vs baseline `abd36bc` (`git diff` comment-only) (1 diff)
- [ ] Ledger `resolution-undo` 64-hex 2 hits + `git diff --stat` shows 3 files, not `sprint-status.yaml` (1 scan)
- [ ] Both `tsc` configs clean (1 run)

**Total**: 6 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Allowlist scans, escape/symlink, bench, exploratory

- [ ] Single-root mirror + verbatim-oracle + no `tol` change allowlist scans (`<1 min`)
- [ ] Escape/symlink `Dirent` determinism + `readdirSync` recursion correctness (`<1 s`)
- [ ] Fallback-miss simulation (temp-dir move) exploratory + `findFileSync` 10k bench `<2 ms` + cross-cutting async-fs negative scan (`<2 min`)

**Total**: 7 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 6 | ~0.25 | ~1.2–1.8 | Pure `pot.test.ts` + `adaptive-spawn` harness already green (fallback + literals + σ header + 21 tests already landed) |
| P1 | 6 | ~0.35 | ~1.8–2.5 | Engine fixtures (`engine.purity` + fallback miss/throw pins + ledger `resolution-undo` + `tsc` both configs) — mostly existing suites, 1 new fallback-miss simulation |
| P2 | 4 | ~0.25 | ~0.8–1.2 | Static `PURITY_ROOTS` mirror / verbatim-oracle / no-`tol` change / `Dirent` escape allowlist scans |
| P3 | 3 | ~0.2 | ~0.4–0.7 | Move-simulation exploratory `fs` + micro-bench + async-fs negative scan |
| **Total** | **19** | **-** | **~4–6.5** | **~0.5–0.9 days host; no device lane — pure host TypeScript** |

### Prerequisites

**Test Data:**

- `pot.test.ts` `FR7_LADDER` 8 matrices + `weightedValue rngOf(0.9/0.98/0.85/0.93/0.99/0.999)` tier 1/5 `0.9016` etc + `rngOf` draw-budget + `mulberry32(0xc31/0x26c6/0x51ce+ceiling/0x5eed+ceiling)` + `staticBoard`/`boardWith` + `PURITY_ROOTS_FALLBACK` `src/engine`+`src/game` scan roots
- `adaptive-spawn-integration` `runSeededSession(0x26c6,10000)` + `tol 0.02` `~4–5σ` absolute + per-tier `sigmaBound 5σ` conditional + `displayRoll 0.015 ~5σ` + tier-0 `sawThree && sawExceeding` `2000` `0/1/2`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`PURITY_ROOTS_FALLBACK`, `σ-budget`, `0.9016`, `tol 0.02`, `sigmaBound`, `resolution-undo`, `async.*readdir`)
- `npx tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — fallback is `node:fs` host, σ docs are comments)
- Working tree on `abd36bc` baseline + sweep diff; `triade/src/engine` byte-identical guard

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (fallback seam + purity oracle)
- **Scanner scenarios** (`engine.purity`): 100%
- **Helper unit** (`PURITY_ROOTS_FALLBACK`/`findFileSync`/`resolveWithFallback` + σ doc): ≥90%
- **Edge cases** (fallback miss / symlink / unterminated read): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (fallback primary-hit, purity oracle verbatim, literals `0.9016`, header+inline `σ-budget`, `adaptive-spawn` 15/15)
- [ ] No high-risk (≥6) items unmitigated (R-001 dead-code + R-002 comment-drift mitigations green)
- [ ] Scanner test (`engine.purity`) passes 100% on working tree (no false pass/negative after `node:fs` imports)
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json` ( `Dirent` cast `as unknown as Dirent[]`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (fallback fail-closed, single-`PURITY_ROOTS` maintainability, ATDD purity green)

---

## Mitigation Plans

### R-001: Fallback dead code ships latent because primary `pot.ts` keeps `existsSync` true (Score: 6)

**Mitigation Strategy:**
1. Host-stub `existsSync→false` (or temp-rename `triade/src/engine/core/pot.ts` under `src/engine/core/sub/pot.ts`) and assert `resolveWithFallback(primary,'pot.ts')` returns path under `src/engine` (not `primary`) — proves `findFileSync` recursion + two-root scan.
2. Keep `rg -n "PURITY_ROOTS_FALLBACK" triade/__tests__/engine/pot.test.ts ==3` + `rg -n "findFileSync" ==3` as CI allowlist (const + roots + def/calls).
3. Keep `npx tsc --noEmit -p tsconfig.test.json` clean (`as unknown as Dirent[]` avoids `NonSharedBuffer`).
4. CI `npm --prefix triade test -- __tests__/engine/pot.test.ts` 6/6 green on primary-hit (fallback no-op) proves no regression when file stays canonical.

**Owner:** FE lead
**Timeline:** Immediate (gate this sweep)
**Status:** Planned
**Verification:** Fallback-miss simulation returns `src/engine` hit + `rg` allowlists + `tsc` clean + `pot.test.ts` 6/6 green.

### R-002: σ-budget comment drift from actual `N`/`tol`/`sigmaBound` (Score: 6)

**Mitigation Strategy:**
1. Keep `rg -n "σ-budget" triade/__tests__/engine/adaptive-spawn-integration.test.ts ==5` (header + 4 inline adjacent to `mulberry32(0xc31)` / `runSeededSession(0x26c6` / `0x5eed+ceiling` / `0x51ce+ceiling`) as doc-presence gate.
2. Keep `git diff -- triade/__tests__/engine/adaptive-spawn-integration.test.ts` comment-only in this sweep (zero `tol`/`sigmaBound`/`seed` numeric diff) — any future `N`/`tol`/`z` change must co-update adjacent comment in same commit (atomic).
3. Keep `rg -n "tol = 0\.02" ==1` + `rg -n "sigmaBound" ==4` (1 `helpers.ts` def + 3 call sites) as literal-presence gate.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** `rg` counts + comment-only `git diff` + `adaptive-spawn-integration` 15/15 green.

---

## Assumptions and Dependencies

### Assumptions

1. Effective `move()` still consumes exactly 3 RNG draws (`pickIndex` + `resolveSpawn` + `displayRoll`) and `newGame` 20 draws — pinned by `game.ts:53-64` and `spawn.ts:pickCombined` single-roll contract; any engine draw-count change is treated as a product change that must update helpers together (carry-over from `dw-test-scanner-helpers-hardening`).
2. No current `triade/src/engine` or `triade/src/game` file duplicates `pot.ts` filename — fallback first-hit ambiguity has zero blast radius today; assumption checked by `rg --files | rg pot.ts` single hit.
3. `extractSpecifiers` only needs `stripComments` to keep string/template contents intact (so import specifiers remain visible) — fallback preserves this by keeping `readFileSync`+`extractSpecifiers` verbatim.
4. `findFileSync` `readdirSync` sync scan is acceptable to stay sync with `readFileSync` (spec `Never: async fs`); fallback is host-only test code, not production.
5. `npx tsc --noEmit -p tsconfig.test.json` baseline is already clean after sweep (`as unknown as Dirent[]` avoids `NonSharedBuffer`) — any new `@ts-ignore` is a regression.

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/test-utils/helpers.ts` `sigmaBound`/`mulberry32`/`runSeededSession` + `extractSpecifiers` — Required for σ-budget derivations and purity oracle. Status: Ready (untouched, already in repo).
3. `triade/__tests__/engine/engine.purity.test.ts` `PURITY_ROOTS` auto-scan — Required for mirror verification. Status: Ready (already in repo, 7-27).
4. `deferred-work.md` ledger with `resolution-undo` hashes — Required for P1 ledger verification (DW-54/DW-57). Status: Done (working-tree `git diff` shows 2 entries flipped).

### Risks to Plan

- **Risk**: Engine `spawn.ts` draw-count changes without fallback co-update.
  - **Impact**: `rngOf(0,0,0.5)` would throw on correct moves → CI RED looks like fallback bug.
  - **Contingency**: Treat `spawn.ts` + `helpers.ts` call-site migration as an atomic commit; update `sigmaBound` notes together.

- **Risk**: New `src/game/pot.ts` added and fallback returns wrong file.
  - **Impact**: Purity `spawnConfig.ts` check reads `src/game/pot.ts` (wrong) → false-pass/false-fail.
  - **Contingency**: The `PURITY_ROOTS_FALLBACK` 2-root first-hit doc is the gate; ensure only one `pot.ts` exists under roots on move (rename old → new in same commit).

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for any future `pot.ts` move (e.g. `src/engine/pot.ts` relocation) — separate workflow; not auto-run.
- Run `*automate` for broader fallback scan coverage (simulated move under `src/game`) once staging has a temp-dir harness.
- Run `*nfr-assess` after implementation evidence (scanner runs) to validate NFR planning without inventing thresholds.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
