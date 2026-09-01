---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-09-01'
workflowType: 'testarch-trace'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md', '_bmad-output/implementation-artifacts/epic-8-context.md', '_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md', '_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md']
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: '_bmad-output/test-artifacts/traceability/coverage-matrix-8-2-punch-visual.json'
---

# Traceability Report — 8-2 Punch Visual — overshoot+flash+particles+1536 glow (Epic 8, S8.2)

**Target:** Story 8-2 Punch visual — merged tile's overshoot-and-snap declaratively from trace + flash + particle burst scaled by value + 1536+ glow
**Date:** 2026-09-01
**Evaluator:** Eduardo (TEA Master Test Architect — Murat)
**Coverage Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — spec-8-2-punch-visual.md 5 ACs + I/O matrix (7 rows) + Boundaries (ADR-01 / FR-30 / single access point / only-glow / chrome rule)
**Oracle Sources:** `_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md`, `_bmad-output/implementation-artifacts/epic-8-context.md`, `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md`, `_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md`
**Re-verification (working-tree delta):** `ef72635 feat(feel): 8-2 punch visual — overshoot+flash+particles+1536 glow` (4 ahead of `origin/main`) — `triade/src/feel/feel.ts` (96 LOC, FeelPreset.overshootScale 1.08/1.12/1.15 + REDUCED_PRESET scale 1) + `triade/src/feel/punch.ts` (new 47 LOC, 6 pure helpers `punchScaleFor/punchDurationFor/shouldFlash/particleCountFor/shouldGlow/punchProfileFor`) + `triade/src/render/GameBoard.tsx` (`reducedMotion` prop, `TileDescriptor.isMerge`, `AnimatedTile` declarative `withDelay(SLIDE_MS, withSequence(withTiming(overshootScale, overshootMs), withSpring(1)))`, `flashOpacity` worklet, `hasGlow` `#ff8c2f` 0.28 behind tile, `BurstView`/`ParticleDot` 4/8/16 dots 500ms, `isMerge && !reducedMotion` gating) + `triade/App.tsx:887` wiring `settings.reducedMotion` into `GameBoard` (`GameOverOverlay` keeps `reducedMotion={false}` literal per Epic 9) + `triade/__tests__/feel/punch.test.ts` (9 cases) + `triade/__tests__/feel/punch.atdd.test.ts` (19 cases, 17 GREEN + 2 expected RED for R-002/R-007). No `transitionPlan.ts` change (classify already `merge` iff `from.length===2 && !spawned`), `triade/src/engine/**` byte-identical. **749 tests, 745 pass / 4 fail / 0 skip (749 total, 26 suites, 4906ms)** — scoped 8-2 surface **26 pass / 2 fail** across 28 mapped cases; `npx tsc --noEmit --project triade/tsconfig.json` clean, `git diff --stat -- triade/src/engine` empty.

> `sprint-status.yaml` at `done` is orchestrator bookkeeping — not a defect to fix, per task constraints. `spec-8-2-punch-visual.md:Review Triage` documents 2 carry-over defers from 8-1 (R-001 tutorial double Light, R-006 expo-haptics) not caused by 8-2.

---

## Gate Decision: CONCERNS

**Rationale:** P0 coverage **100% (4/4)** and P0 pass **100% (16/16)** — AC1 overshoot tiers, AC2 flash+particles, AC3 1536+ only glow, AC4 FR-30 Reduced Motion all **GREEN** on `ef72635`. Overall coverage **100% (6/6 ≥80%)**. P1 coverage 100% but **P1 pass 83% (5/6)`** due to one **EXPECTED RED** high-risk: `[P1-05] R-002` burst `setTimeout(500)` is bare — not stored in `burstTimer(s)Ref` nor cleared on `GameBoard` unmount (score 6, early-input orphan). P2 pass **80% (4/5)`** due to `[P2-01] R-007` same root cause (second signal, score 4) — one fix clears both. Device smoke (real iPhone 3/6/12+/1536 portrait+landscape + Reduced Motion ON flat + preview chrome + airplane + rapid-swipe orphan) is manual pre-merge lane **PENDING** (15 min). Not **FAIL** because no P0 blocker, engine byte-identical, `tsc` clean, full suite 99.47% pass, and REDs are waived with expiry before 8-3 (shake mutates `tilesRef` under re-plan). Carry-over 8-1 REDs (R-001 `2!==1`, R-006 missing dep) remain waived per spec Review Triage.

---

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
|----------|----------------|---------------|------------|--------|
| P0       | 4              | 4             | 100%       | ✅ PASS |
| P1       | 1              | 1             | 100%       | ✅ PASS (coverage) / ⚠️ CONCERNS (pass) |
| P2       | 1              | 1             | 100%       | ✅ PASS (coverage) / ⚠️ CONCERNS (pass) |
| P3       | 0              | 0             | 100%*      | ✅ PASS |
| **Total**| **6**          | **6**         | **100%**   | ✅ PASS (coverage) / ⚠️ CONCERNS (gate) |

\* No P3 requirements in scope for 8-2; effective coverage treated as 100% per gate rules (identical to 7.x/8-1 convention).

**Pass-rate view (execution, not coverage):**

| Priority | Tests | Pass | Pass % | Gate threshold | Status |
|----------|-------|------|--------|----------------|--------|
| P0 | 16 | 16 | 100% | 100% required | ✅ MET |
| P1 | 6 | 5 | 83.3% | ≥90% target | ⚠️ CONCERNS (1 waived RED, R-002) |
| P2 | 5 | 4 | 80% | informational (≥90% target) | ⚠️ waived RED (R-007) |
| **Scoped 8-2** | **28** | **26** | **92.9%** | — | ⚠️ |
| **Full suite** | **749** | **745** | **99.47%** | ≥95% target | ✅ MET |

---

## Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 8.2-AC1 | Overshoot-and-snap declarative from trace `isMerge` (3→1.08/80ms 4 false, 6→1.12/100ms 8 false, 12+→1.15/120ms 16 true) — scale/duration from `presetFor` data, not literals | P0 | FULL | 8.2-U-001, 8.2-U-002, 8.2-U-003, 8.2-U-009, 8.2-ATDD-P0-01, 8.2-ATDD-P0-02, 8.2-ATDD-P0-03, 8.2-ATDD-P0-07, 8.2-ATDD-P0-08, 8.2-ATDD-P1-03 |
| 8.2-AC2 | Flash + particle burst at merge point as imperative worklets in `src/feel` (flash only heavy >=12, particles 4/8/16) gated by `reducedMotion` | P0 | FULL | 8.2-U-001, 8.2-U-002, 8.2-U-003, 8.2-U-008, 8.2-ATDD-P0-01, 8.2-ATDD-P0-02, 8.2-ATDD-P0-03, 8.2-ATDD-P0-07, 8.2-ATDD-P1-04 |
| 8.2-AC3 | 1536/3072+ incandescent glow is the only glow (`#ff8c2f` 0.28 behind tile, only when `isPunch && value>=1536`), suppressed under Reduced Motion | P0 | FULL | 8.2-U-004, 8.2-ATDD-P0-04, 8.2-ATDD-P2-03 |
| 8.2-AC4 | FR-30 / UX-DR-16 — Reduced Motion gates all punch visuals (overshoot, flash, particles, 1536+ glow) while haptics+sound stay (`reducedPresetFor(12).haptic==='heavy', overshootScale===1`) | P0 | FULL | 8.2-U-005, 8.2-ATDD-P0-05, 8.2-ATDD-P1-04 |
| 8.2-AC5 | Observability & interaction: trace→`isMerge` contract via real engine trace (`planTileTransitions` + `classify` `from.length===2 && !spawned` iff `type==='merge'`), `GameBoard.applyPlan` `isMerge` gating, declarative mapping, chrome guard (spawn/preview/score never punch), NOOP silent, early-input orphan safeguard R-002 | P1 | FULL | 8.2-U-006, 8.2-ATDD-P1-01, 8.2-ATDD-P1-02, 8.2-ATDD-P1-03, 8.2-ATDD-P1-04, 8.2-ATDD-P1-05*, 8.2-ATDD-P1-06 |
| 8.2-AC6 | Boundaries & non-functional: engine byte-identical ADR-01, `FeelPreset` single access point (no scattered 1.08/1.12/1.15), never-throw + data-not-code finite scale ≤1.2, perf micro-bench, only-glow static gate, burst accumulation cleanup R-007 | P2 | FULL | 8.2-U-007, 8.2-U-009, 8.2-ATDD-P0-06, 8.2-ATDD-P0-08, 8.2-ATDD-P2-01*, 8.2-ATDD-P2-02, 8.2-ATDD-P2-03, 8.2-ATDD-P2-04, 8.2-ATDD-P2-05 |

\* EXPECTED RED with waiver — coverage FULL (test exists and documents the contract) but execution fails until residual is fixed. One fix clears both `P1-05` and `P2-01` (same bare `setTimeout(500)`).

### Test Inventory (deduplicated, 28 mapped cases across the working-tree delta)

| ID | Level | File:Line | Title | Status |
|---|---|---|---|---|
| 8.2-U-001 | unit | triade/__tests__/feel/punch.test.ts:7 | [P0] 3 light punch small (scale 1.08, 4 particles, no flash) | ✅ pass |
| 8.2-U-002 | unit | triade/__tests__/feel/punch.test.ts:19 | [P0] 6 medium punch (scale 1.12, 8 particles, no flash) | ✅ pass |
| 8.2-U-003 | unit | triade/__tests__/feel/punch.test.ts:28 | [P0] 12+ heavy punch (scale 1.15, 16 particles, flash) | ✅ pass |
| 8.2-U-004 | unit | triade/__tests__/feel/punch.test.ts:38 | [P0] glow only for 1536+ (only glow in system) | ✅ pass |
| 8.2-U-005 | unit | triade/__tests__/feel/punch.test.ts:47 | [P0] Reduced Motion gates all visual (FR-30, UX-DR-16) | ✅ pass |
| 8.2-U-006 | unit | triade/__tests__/feel/punch.test.ts:67 | [P0] chrome guard — helper never called for non-merge (NOOP) | ✅ pass |
| 8.2-U-007 | unit | triade/__tests__/feel/punch.test.ts:77 | [P0] non-finite / negative values fallback safe (never throw) | ✅ pass |
| 8.2-U-008 | unit | triade/__tests__/feel/punch.test.ts:85 | [P0] multiple merges per move each scale independently | ✅ pass |
| 8.2-U-009 | unit | triade/__tests__/feel/punch.test.ts:96 | [P0] all preset values have finite overshootScale 1..1.2 | ✅ pass |
| 8.2-ATDD-P0-01 | unit | triade/__tests__/feel/punch.atdd.test.ts:27 | [P0-01] AC1 small merge 3 -> light punch 1.08/80ms/4 particles/no flash/no glow | ✅ pass |
| 8.2-ATDD-P0-02 | unit | triade/__tests__/feel/punch.atdd.test.ts:46 | [P0-02] AC1 medium merge 6 -> medium punch 1.12/100ms/8/no flash | ✅ pass |
| 8.2-ATDD-P0-03 | unit | triade/__tests__/feel/punch.atdd.test.ts:59 | [P0-03] AC1 heavy merge 12+ -> heavy punch 1.15/120ms/16/flash (sweep all heavy tiers) | ✅ pass |
| 8.2-ATDD-P0-04 | unit | triade/__tests__/feel/punch.atdd.test.ts:73 | [P0-04] AC glow tier — glow only for 1536+ (only glow in system) | ✅ pass |
| 8.2-ATDD-P0-05 | unit | triade/__tests__/feel/punch.atdd.test.ts:89 | [P0-05] AC Reduced Motion gate FR-30 — all visual cut, haptics stay | ✅ pass |
| 8.2-ATDD-P0-06 | unit | triade/__tests__/feel/punch.atdd.test.ts:114 | [P0-06] edge — non-finite / negative never throw, glow never on NaN | ✅ pass |
| 8.2-ATDD-P0-07 | unit | triade/__tests__/feel/punch.atdd.test.ts:129 | [P0-07] AC multiple merges per move — each scales independently | ✅ pass |
| 8.2-ATDD-P0-08 | unit | triade/__tests__/feel/punch.atdd.test.ts:148 | [P0-08] data-not-code — all preset values have finite overshootScale 1..1.2 | ✅ pass |
| 8.2-ATDD-P1-01 | unit | triade/__tests__/feel/punch.atdd.test.ts:170 | [P1-01] trace->isMerge contract via REAL engine trace: type merge iff from.length===2 && !spawned | ✅ pass |
| 8.2-ATDD-P1-02 | unit | triade/__tests__/feel/punch.atdd.test.ts:213 | [P1-02] chrome guard — spawn tiles never become isMerge/punch | ✅ pass |
| 8.2-ATDD-P1-03 | unit | triade/__tests__/feel/punch.atdd.test.ts:228 | [P1-03] overshoot declarative — punchScaleFor/punchDurationFor match presetFor per tier | ✅ pass |
| 8.2-ATDD-P1-04 | unit | triade/__tests__/feel/punch.atdd.test.ts:246 | [P1-04] burst scaling & reducedMotion gating | ✅ pass |
| 8.2-ATDD-P1-05 | unit | triade/__tests__/feel/punch.atdd.test.ts:269 | [P1-05] R-002 early-input orphan safeguard — burst timer cleanup on unmount (EXPECTED RED) | ❌ fail `GameBoard must store burst setTimeout id(s) in a ref and clear on unmount` (waived) |
| 8.2-ATDD-P1-06 | unit | triade/__tests__/feel/punch.atdd.test.ts:283 | [P1-06] NOOP silent — moved false never produces punch | ✅ pass |
| 8.2-ATDD-P2-01 | unit | triade/__tests__/feel/punch.atdd.test.ts:314 | [P2-01] burst accumulation — setTimeout auto-clear filters by id, no orphan accumulation (EXPECTED RED — unmount guard missing) | ❌ fail `burst setTimeout must be cleared on GameBoard unmount` (waived) |
| 8.2-ATDD-P2-02 | unit | triade/__tests__/feel/punch.atdd.test.ts:329 | [P2-02] perf micro-bench — punchProfileFor + preset sweep is host-cheap | ✅ pass |
| 8.2-ATDD-P2-03 | unit | triade/__tests__/feel/punch.atdd.test.ts:342 | [P2-03] only-glow static gate — glow exists only behind hasGlow branch | ✅ pass |
| 8.2-ATDD-P2-04 | unit | triade/__tests__/feel/punch.atdd.test.ts:355 | [P2-04] engine purity — triade/src/engine byte-identical (no engine edits in 8-2) | ✅ pass |
| 8.2-ATDD-P2-05 | unit | triade/__tests__/feel/punch.atdd.test.ts:363 | [P2-05] single access point — no scattered overshoot/particle literals outside feel.ts | ✅ pass |

Files: 2 · Cases: 28 · Skipped/Fixme/Pending: 0/0/0 · All mapped tests use `node:test` + `tsx` host runner (no Playwright needed; `tea_use_playwright_utils:true` loaded but not applied; Skia/Reanimated worklets trust-but-verify via manual device lane).

### Detailed Mapping

#### 8.2-AC1: Overshoot declarative via presetFor (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `8.2-U-001` - triade/__tests__/feel/punch.test.ts:7
    - **Given:** merge value 3
    - **When:** `presetFor(3)` and `punchScaleFor(3,false)/punchProfileFor(3,false)`
    - **Then:** `overshootScale 1.08, overshootMs 80, particleBurst 4, flash false, scale 1.08`
  - `8.2-U-002` - triade/__tests__/feel/punch.test.ts:19 — 6→1.12/100ms/8/false ✅
  - `8.2-U-003` - triade/__tests__/feel/punch.test.ts:28 — 12..768 sweep heavy 1.15/120ms/16/true ✅
  - `8.2-U-009` - triade/__tests__/feel/punch.test.ts:96 — `overshootScale` finite `1..1.2` for `3,6,12,24,48,96,192,384,768,1536,3072,6144,12288` ✅
  - `8.2-ATDD-P0-01` - triade/__tests__/feel/punch.atdd.test.ts:27 — small tier pin `1.08/80/4/false/no glow` ✅
  - `8.2-ATDD-P0-02` - triade/__tests__/feel/punch.atdd.test.ts:46 — medium `1.12/100/8/false` ✅
  - `8.2-ATDD-P0-03` - triade/__tests__/feel/punch.atdd.test.ts:59 — heavy sweep `12..12288 →1.15/120/16/true` ✅
  - `8.2-ATDD-P0-07` - triade/__tests__/feel/punch.atdd.test.ts:129 — values [3,6,12] each `1.08/1.12/1.15` + durations `80/100/120` ✅
  - `8.2-ATDD-P0-08` - triade/__tests__/feel/punch.atdd.test.ts:148 — all tiers finite `overshootScale≤1.2`, frozen identity `presetFor(3)===FEEL_PRESETS[3]` ✅
  - `8.2-ATDD-P1-03` - triade/__tests__/feel/punch.atdd.test.ts:228 — `punchScaleFor(v,false)===presetFor(v).overshootScale` and `punchDurationFor` sweep for `allPresetValues()` + `GameBoard` uses `punchPreset.overshootScale/Ms` ✅

#### 8.2-AC2: Flash + particle burst scaled vs Reduced Motion (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `8.2-U-001` - triade/__tests__/feel/punch.test.ts:7 — 3→`shouldFlash false`, `particleCountFor 4`
  - `8.2-U-002` - triade/__tests__/feel/punch.test.ts:19 — 6→`false/8`
  - `8.2-U-003` - triade/__tests__/feel/punch.test.ts:28 — heavy→`true/16`
  - `8.2-U-008` - triade/__tests__/feel/punch.test.ts:85 — `[3,6,12]` → `4/8/16` and `false/false/true`
  - `8.2-ATDD-P0-01` - triade/__tests__/feel/punch.atdd.test.ts:27 — light no flash/4 particles
  - `8.2-ATDD-P0-02` - triade/__tests__/feel/punch.atdd.test.ts:46 — medium no flash/8
  - `8.2-ATDD-P0-03` - triade/__tests__/feel/punch.atdd.test.ts:59 — heavy flash/16 sweep
  - `8.2-ATDD-P0-07` - triade/__tests__/feel/punch.atdd.test.ts:129 — sequential multi-merge particles `4/8/16`
  - `8.2-ATDD-P1-04` - triade/__tests__/feel/punch.atdd.test.ts:246
    - **Given:** values `3,6,12,1536`
    - **When:** `particleCountFor(v,false)` vs `true`, `shouldFlash(v,false)` vs `true`, `shouldGlow`, `GameBoard.applyPlan` gating `if (!reducedMotion) && preset.particleBurst>0`, `App.tsx` wiring `reducedMotion={settings.reducedMotion}`
    - **Then:** non-reduced counts match preset `4/8/16`, reduced counts 0, `App` passes `settings.reducedMotion`, `GameOverOverlay` keeps literal `false` ✅

#### 8.2-AC3: 1536+ glow — only glow in system (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `8.2-U-004` - triade/__tests__/feel/punch.test.ts:38
    - **Given:** values `1,6,12,384,768 vs 1536/3072/6144`
    - **When:** `shouldGlow(v,false)`
    - **Then:** `<1536 false`, `1536+ true` ✅
  - `8.2-ATDD-P0-04` - triade/__tests__/feel/punch.atdd.test.ts:73 — same + `punchProfileFor.glow` mirrors ✅
  - `8.2-ATDD-P2-03` - triade/__tests__/feel/punch.atdd.test.ts:342
    - **Given:** `GameBoard.tsx` source
    - **When:** scan for `color="#ff8c2f"`
    - **Then:** exactly one occurrence inside `hasGlow ? (` branch, and `shouldGlow(<1536)===false` loop ✅

#### 8.2-AC4: Reduced Motion FR-30 / UX-DR-16 — gates all punch visuals, keeps haptics (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `8.2-U-005` - triade/__tests__/feel/punch.test.ts:47 — for `3,6,12,24,1536,3072`: `punchScaleFor(v,true)===1 && shouldFlash===false && particleCount===0 && shouldGlow===false` and `reducedPresetFor(12).haptic==='heavy' && overshootScale===1` ✅
  - `8.2-ATDD-P0-05` - triade/__tests__/feel/punch.atdd.test.ts:89 — same sweep plus `punchDurationFor(v,true)===0`, `punchProfileFor(v,true)` all zeroed, `reducedPresetFor(3).haptic==='light' / 6 medium` ✅
  - `8.2-ATDD-P1-04` - triade/__tests__/feel/punch.atdd.test.ts:246 — burst gating `if (!reducedMotion)` + `App` wiring ✅ (also covers AC2)

#### 8.2-AC5: Observability — trace→isMerge, GameBoard wiring, chrome guard, NOOP, early-input orphan (P1)

- **Coverage:** FULL ✅ (test exists; execution has 1 EXPECTED RED — coverage is not gapped, execution is waived)
- **Tests:**
  - `8.2-U-006` - triade/__tests__/feel/punch.test.ts:67 — chrome helper NOOP: `punchScaleFor(1)` fallback light data but `GameBoard` gates via `isMerge` (spawn tile kind `appear` without `isMerge` → `isPunch false`) — chrome rule ✅
  - `8.2-ATDD-P1-01` - triade/__tests__/feel/punch.atdd.test.ts:170
    - **Given:** real engine `MoveResult.trace` from `newGame(mulberry32(42))` + `move(game,'left',mulberry32(99))`
    - **When:** `planTileTransitions(prevBoard, result)` and `presetFor`/`punchProfileFor` over merge entries
    - **Then:** identifies merge iff `from.length===2 && !spawned` via `transitionPlan.classify`, spawn entries never `length 2`, plan merges have `from.length 2`, host never throws ✅
  - `8.2-ATDD-P1-02` - triade/__tests__/feel/punch.atdd.test.ts:213
    - **Given:** `GameBoard.tsx` source
    - **When:** scan `isMerge:true` only inside `tr.type==='merge'` branch, `spawn` branch never `isMerge`, `AnimatedTile` gates `isMerge && !reducedMotion` for `hasGlow/hasFlash`
    - **Then:** chrome guard pinned ✅
  - `8.2-ATDD-P1-03` - triade/__tests__/feel/punch.atdd.test.ts:228 — `punchScaleFor/Duration` match `presetFor` per tier + `GameBoard` uses `presetFor(tr.value)` for burst and `punchPreset.overshootScale/Ms` ✅
  - `8.2-ATDD-P1-04` - triade/__tests__/feel/punch.atdd.test.ts:246 — burst scaling & `App` wiring ✅
  - `8.2-ATDD-P1-05` - triade/__tests__/feel/punch.atdd.test.ts:269
    - **Given:** `GameBoard.tsx` with `setTimeout(()=>setBursts(filter by id),500)` leak
    - **When:** check `burstTimer|burstTimeout|burstTimers` ref + `clearTimeout`
    - **Then:** **EXPECTED RED** — bare `setTimeout` without ref storage → `GameBoard must store burst setTimeout id(s) in a ref and clear on unmount` — R-002 score 6, waived pending fix before 8-3 (one fix also clears P2-01)
  - `8.2-ATDD-P1-06` - triade/__tests__/feel/punch.atdd.test.ts:283 — NOOP: `result.moved===false` + slide/spawn-only trace never produces `isMerge`/burst; `plan.length 0` when NOOP ✅

#### 8.2-AC6: Boundaries — engine purity, single access point, never-throw, scale cap, perf, accumulation (P2)

- **Coverage:** FULL ✅ (tests exist for each boundary; one EXPECTED RED)
- **Tests:**
  - `8.2-U-007` - triade/__tests__/feel/punch.test.ts:77 — `punchProfileFor(NaN/Infinity/-5)` + `shouldGlow(NaN)` never throw ✅
  - `8.2-U-009` - triade/__tests__/feel/punch.test.ts:96 — all `13` tiers `overshootScale` finite `1..1.2` ✅
  - `8.2-ATDD-P0-06` - triade/__tests__/feel/punch.atdd.test.ts:114 — same sweep plus `particleCountFor(NaN)===4` fallback ✅
  - `8.2-ATDD-P0-08` - triade/__tests__/feel/punch.atdd.test.ts:148 — frozen identity + `allPresetValues()` sweep ✅
  - `8.2-ATDD-P2-01` - triade/__tests__/feel/punch.atdd.test.ts:314
    - **Given:** same `GameBoard` burst timer leak
    - **When:** check `!newBursts.some(b.id)` filters by id (correct) + unmount guard with `clearTimeout`
    - **Then:** **EXPECTED RED** `burst setTimeout must be cleared on GameBoard unmount` — R-007 score 4, same cause as P1-05 ✅ test exists, execution waived, one fix clears both
  - `8.2-ATDD-P2-02` - triade/__tests__/feel/punch.atdd.test.ts:329 — perf: `10k*13 =130k punchProfileFor` in `<200ms` (<100ms host actual) ✅
  - `8.2-ATDD-P2-03` - triade/__tests__/feel/punch.atdd.test.ts:342 — single `#ff8c2f` inside `hasGlow` branch ✅
  - `8.2-ATDD-P2-04` - triade/__tests__/feel/punch.atdd.test.ts:355 — `git diff --stat -- triade/src/engine` empty, engine must not import `feel` ✅
  - `8.2-ATDD-P2-05` - triade/__tests__/feel/punch.atdd.test.ts:363 — `feel.ts` owns `1.08/1.12/1.15`, `punch.ts` delegates to `presetFor` not literals, `GameBoard` not hardcoding ✅

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found. **P0 is 100% FULL and 100% GREEN — no blocker.**

#### High Priority Gaps (PR BLOCKER) ⚠️

0 coverage gaps. **P1 coverage is FULL.** Execution has 1 waived expected-red (R-002 score 6, P1-05) — not a missing test, but a failing assertion requiring one-line fix before 8-3. Tracked as residual risk, not a coverage hole.

#### Medium Priority Gaps (Nightly) ⚠️

0 coverage gaps. **P2 coverage is FULL.** Execution has 1 waived expected-red (R-007 score 4, P2-01 — same bare `setTimeout` cause, second signal).

#### Low Priority Gaps (Optional) ℹ️

0 gaps. No P3 in scope.

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- Endpoints without direct API tests: **0** — pure feel+render story: no HTTP/API backend. `planTileTransitions` + real `newGame+move` trace fixture is the provider contract.
- Examples: N/A (Expo RN, no OpenAPI; `allow_synthetic_oracle:true` but formal oracle is sufficient with high confidence).

#### Auth/Authz Negative-Path Gaps

- Criteria missing denied/invalid-path tests: **0** — no auth surfaces in 8-2.
- Examples: N/A. Negative paths are Reduced Motion/never-throw/NOOP sweeps (AC4/AC6) and spawn chrome guard.

#### Happy-Path-Only Criteria

- Criteria missing error/edge scenarios: **0** — every I/O row has boundary + error + chrome/NOOP + multi-merge (I/O matrix 7 rows all pinned with both happy sweep and defensive `NaN/Infinity/-5` + `moved===false` + `spawned:true` exclusion).
- Examples: N/A — AC1 3/6/12+ sweep plus non-finite fallback; AC4 Reduced Motion FR-30 sweep; chrome spawn never isMerge; NOOP empty plan.

**Counts:** `endpoints_without_tests:0`, `auth_missing_negative_paths:0`, `happy_path_only_criteria:0`, `ui_journeys_without_e2e:0`, `ui_states_missing_coverage:0` (E2E device lane is manual by design — see Device gate, not a heuristic gap).

### Quality Assessment

#### Tests with Issues

**BLOCKER Issues** ❌ — none

**WARNING Issues** ⚠️
- `8.2-ATDD-P1-05` — asserts burst timer ref + clearTimeout on unmount but delta has bare `setTimeout(500)` (R-002, score 6) — waived pending fix before 8-3 (one fix clears P2-01); **no coverage hole**, execution waived.
- `8.2-ATDD-P2-01` — same bare `setTimeout` guard missing (R-007, score 4) — waived with P1-05; **coverage exists**, execution fails.

**INFO Issues** ℹ️ — none (no flaky, no slow >90s: 28 host tests run ~5s + perf sweep <200ms P2-02; no >300-line file; no `test.skip` — `node:test` red-phase uses non-zero exit, not skips; matches 7.4/8-1 precedent).

#### Tests Passing Quality Gates

**26/28 mapped tests (92.9%) meet all quality criteria on scoped surface** — **2 expected RED are intentional waivers**; full suite **745/749 (99.47%)** meets standard threshold. ✅ (P0 16/16 100%, P1 5/6 83% waived, P2 4/5 80% waived)

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- AC1 light/medium/heavy mapping: tested at pure-function (`presetFor`/`punch*For`) and at board contract (`GameBoard.applyPlan` + real engine trace fixture + declarative mapping gate) ✅ — different levels, same invariant.
- AC2 flash/particles: tested via pure helper sweep (`shouldFlash/particleCountFor`) and via source-structure burst gating (`GameBoard` + `App` wiring) ✅

#### Unacceptable Duplication ⚠️ — none

- 8-2 consciously deduplicates: `punch.test.ts` is the guard suite (9, green, fast), `punch.atdd.test.ts` is the ATDD acceptance scaffold (19, includes real-trace fixture, chrome/burst/glow wiring, and 2 RED pins for the leak). No same-level duplication to remove (automation-summary Step 2 confirms no duplicate coverage).

### Coverage by Test Level

| Test Level | Tests | Criteria Covered | Coverage % |
| ---------- | ----- | ---------------- | ---------- |
| E2E        | 0     | 0               | N/A (manual device lane, not automated — see below) |
| API        | 0     | 0               | N/A (feel+punch gateway `presetFor(tr.value)` + trace contract is the API-equivalent) |
| Component  | 0     | 0               | N/A (GameBoard seam stubbed at host via source scan, not Playwright component) |
| Unit       | 28    | 6               | 100%       |
| **Total**  | **28**| **6**           | **100%**   |

**E2E/API note (TEA terminology for this Expo RN story):** "API" = typed `TraceEntry` gateway + `punch.ts` pure helpers validated by `P1-01/P1-02/P1-04` host fixtures + source gates; "E2E" = real iPhone Skia+Reanimated verification (manual device smoke `P1-06` in test-design: 3→subtle / 6→medium / 12+→flash+16 / 1536→glow+only glow portrait+landscape+Reduced Motion ON) — manual on dev build (no Simulator haptics/60 FPS feel), not scaffolded as code. Host automation covers all automatable surfaces.

### Traceability Recommendations

#### Immediate Actions (Before PR Merge to verified)

1. **Fix R-002/R-007 burst timer leak (P1-05 score 6 / P2-01 score 4)** — Store `setTimeout` id(s) for burst auto-clear in a ref (`burstTimerRef: Set<ReturnType<typeof setTimeout>>` or array) and clear in a `useEffect` cleanup on `GameBoard` unmount, mirroring `settleTimerRef` at `GameBoard.tsx:321-326`. One fix clears both RED pins; keep `prev.filter(not in newBursts)` by `id` (already correct). Verify with rapid-swipe combo (2–3 sequential merges within 500ms) video shows no off-grid orphans and `jest.useFakeTimers`-style host test that `setBursts` not called after unmount.
2. **Run device smoke P1-06 (15 min)** — Real iPhone dev build (SDK 57, Skia + Reanimated 4): single lane `3→subtle punch`, `6→medium`, `12+→flash+16`, `1536+→glow (only glow, #ff8c2f 0.28 behind tile)` each in portrait+landscape; enable Reduced Motion (iOS Settings→Accessibility→Motion) → repeat heavy+glow: confirm flat (scale=1 no overshoot, no flash/particles/glow) while haptics still felt; confirm preview card and score never animate; test in airplane mode; rapid swipes during burst window → no orphan bursts. Record PR checkbox sign-off.
3. **Keep carry-over 8-1 waivers as waived** — Do not re-file `R-001` tutorial double Light `2!==1` (`haptics.atdd.test.ts:170`) and `R-006` missing `expo-haptics` dep (`haptics.atdd.test.ts:211`) for 8-2; they are `defer` per `spec-8-2-punch-visual.md:Review Triage 2026-09-01` and not caused by punch. Full-suite 4 RED total remains documented.

#### Short-term Actions (This Milestone / Epic 8)

1. **Instrument 8-2 risk mitigations as CI gates** — `git diff --stat -- triade/src/engine` empty (ADR-01), `rg "1\.08|1\.12|1\.15"` outside `feel.ts` fails, single `#ff8c2f` inside `hasGlow` branch check (`P2-03`), `punch.ts` delegates to `presetFor` gate (`P2-05`), and `reducedMotion={settings.reducedMotion}` wiring gate (`P1-04`) — all host gates, keep in PR checks for 8.3-8.6.
2. **Tune perf mitigation for next story** — Host micro-bench `P2-02` already `<200ms` for 130k `punchProfileFor`; add device benchmark lane `useFrameRateBaseline` after 2-min play with 10+ merges including one heavy (12+) and one 1536+ glow before 8-3 (shake adds further main-thread cost per R-001).

#### Long-term Actions (Backlog)

1. **Close waivers when fixed + re-run trace to PASS** — Turn `P1-05`+`P2-01` GREEN with the one-line fix + device smoke signed off, then re-run `bmad-testarch-trace` — target **PASS** (all 28 mapped + device) before Epic 8 advances beyond S8.2.
2. **Epic 8 device p99 benchmark (ADR-04 two-level)** — When 8.3 (shake) lands, measure device `p99Ms`/`fps` under `useFrameRateBaseline`; defer full Epic 8 NFR perf gate until then (currently host-dominated).

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

- **Total Tests (full suite):** 749
- **Passed:** 745 (99.47%)
- **Failed:** 4 (0.53% — all EXPECTED RED, 2 carry-over 8-1 + 2 new 8-2)
- **Skipped:** 0 (0%) — no `test.skip` by design (`node:test` red-phase uses non-zero exit)
- **Duration:** 4906 ms (26 suites)

**Scoped surface (8-2 punch visual, 28 mapped):**

- **Total:** 28
- **Passed:** 26 (92.9%)
- **Failed:** 2 (7.1% — P1-05 R-002 bare setTimeout, P2-01 R-007 same cause waived, one fix)
- **Skipped:** 0

**Priority Breakdown (scoped):**

- **P0 Tests:** 16/16 passed (100%) ✅ — all AC1-4 pins green (overshoot tiers, flash+particles 4/8/16, glow only 1536+, Reduced Motion FR-30 zeroing vs haptics stay, non-finite never throw)
- **P1 Tests:** 5/6 passed (83.3%) ⚠️ — `P1-01`/`P1-02`/`P1-03`/`P1-04`/`P1-06` green, `P1-05` red waived (R-002 score 6)
- **P2 Tests:** 4/5 passed (80%) ℹ️ — `P2-02`/`P2-03`/`P2-04`/`P2-05` green, `P2-01` red waived (R-007 score 4)
- **P3 Tests:** 0/0 (100%*) ℹ️

**Overall Pass Rate (full suite):** 99.47% ✅ (threshold ≥95% for PASS, ≥90% for CONCERNS — met)
**Overall Pass Rate (scoped 8-2):** 92.9% ⚠️ (waived REDs keep CONCERNS, not FAIL)

**Test Results Source:** local run `npm --prefix triade test` (verified live 2026-09-01) — 26 suites; `triade/__tests__/feel/punch.test.ts` 9 pass, `triade/__tests__/feel/punch.atdd.test.ts` 19 cases 17 pass / 2 fail expected; full suite reconfirmed `npx tsc --noEmit --project triade/tsconfig.json` clean, `git diff --stat -- triade/src/engine` empty.

---

#### Coverage Summary (from Phase 1)

**Requirements Coverage:**

- **P0 Acceptance Criteria:** 4/4 covered (100%) ✅ — I/O rows overshoot/flash+particles/glow/Reduced Motion + data-not-code + chrome guard + never-throw
- **P1 Acceptance Criteria:** 1/1 covered (100%) ✅ — trace→isMerge + wiring + chrome + burst gating + NOOP + multi-merge + early-input orphan (R-002 pinned)
- **P2 Acceptance Criteria:** 1/1 covered (100%) ✅ — engine purity + single access point + only-glow + scale cap + perf + burst accumulation (R-007 pinned)
- **Overall Coverage:** 6/6 covered (100%) ✅ (minimum: 80%)

**Code Coverage** (if available):

- **Line Coverage:** N/A — `node:test` + `tsx`, no c8/istanbul gate configured (per `triade/package.json`, consistent with 7.x/8-1 precedent).
- **Branch Coverage:** N/A
- **Function Coverage:** N/A

**Coverage Source:** `_bmad-output/test-artifacts/traceability/coverage-matrix-8-2-punch-visual.json` (contract_static, oracle_sources: spec + epic-8-context + test-design + ATDD checklist)

---

#### Non-Functional Requirements (NFRs)

**Security:** NOT_ASSESSED ℹ️ — no auth, no data exposure, no payment path in 8-2 (SEC category none, per test-design Risk Category Legend).

**Performance:** CONCERNS ⚠️
- Host micro-bench `P2-02` is GREEN: `130k punchProfileFor` calls `<200ms` (actual <100ms) — R-001 host mitigation done.
- Device `p99Ms`/`fps` not yet measured for punch layer (deferred to Epic 8 two-level benchmark ADR-04 when 8.3 lands); 16 `ParticleDot` + overshoot `withSequence` + `RoundedRect` glow concurrent with Skia Canvas may exceed 60 FPS `p99 16.7ms` on mid-tier iPhones per R-001 (score 6). Mitigations already in place: `BurstView` `position:absolute` + `pointerEvents:none`, `overshootScale≤1.2`/`particleBurst∈{0,4,8,16}` cap asserted, no layout thrash. Track before 8-3 (shake adds cost).

**Reliability:** CONCERNS ⚠️ (but not a FAIL — waived)
- `presetFor/punchProfileFor/shouldGlow` never throw (pinned via `P0-06` `NaN/Infinity/-5` sweeps) — PASS portion.
- **Open:** `GameBoard` burst `setTimeout(500)` bare leak risks `setState on unmounted component` warning and orphan bursts on rapid re-plan (R-002/R-007) — pinned by `P1-05`/`P2-01` RED. One fix (ref + `clearTimeout` on unmount) resolves.

**Maintainability:** PASS ✅
- `FeelPreset` / `FEEL_PRESETS` frozen single access point incl `overshootScale` (AC1), `punch.ts` thin wrappers delegating to `presetFor` (`P2-05` GREEN), `allPresetValues()` exhaustive sweep (`P0-08`), `P2-04` engine purity + `P2-03` only-glow single `#ff8c2f` inside `hasGlow` — all gates GREEN. Future 8.3-8.5 reuse same preset without rework.

**Overall NFR:** **CONCERNS** (perf device lane pending + reliability burst leak waived) — non-blocking for story `done` but `verified` requires fix.

**NFR Source:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` NFR Planning (60 FPS / never-throw / maintainability / FR-30+chrome/offline) + this trace execution; no full `nfr-assess` run for 8-2 (deferred).

---

#### Flakiness Validation

**Burn-in Results** (if available):

- **Burn-in Iterations:** not run (host `node:test` pure functions, deterministic via `mulberry32` seeded `newGame+move` runs — no flaky harness).
- **Flaky Tests Detected:** 0 ✅
- **Stability Score:** 100% (no `test.skip`, no `fixme`, no timing-dependent assertions; `P2-02` perf sweep is deterministic)

**Burn-in Source:** not_available (host-only story; device lane is manual smoke, not burn-in).

---

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual                    | Status   |
| --------------------- | --------- | ------------------------- | -------- |
| P0 Coverage           | 100%      | 100% (4/4)                | ✅ PASS |
| P0 Test Pass Rate     | 100%      | 100% (16/16)              | ✅ PASS |
| Security Issues       | 0         | 0                         | ✅ PASS |
| Critical NFR Failures | 0         | 0                         | ✅ PASS |
| Flaky Tests           | 0         | 0                         | ✅ PASS |

**P0 Evaluation:** ✅ ALL PASS — critical punch contract (overshoot/light/medium/heavy, flash+16, glow 1536+ only, Reduced Motion FR-30) fully pinned and green; chrome guard + never-throw + scale cap also green.

---

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold                 | Actual               | Status   |
| ---------------------- | ------------------------- | -------------------- | -------- |
| P1 Coverage            | ≥90%       | 100% (1/1)           | ✅ PASS |
| P1 Test Pass Rate      | ≥90%      | 83.3% (5/6)            | ⚠️ CONCERNS — 1 waived RED (R-002 burst timer ref, score 6) |
| Overall Test Pass Rate | ≥95% (full suite) | 99.47% (745/749)     | ✅ PASS |
| Overall Coverage       | ≥80%          | 100% (6/6)           | ✅ PASS |

**P1 Evaluation:** ⚠️ SOME CONCERNS — P1 pass is 83% solely due to documented expected-red R-002 (burst timer leak) with waiver expiry before 8-3; coverage is FULL, full-suite pass and overall coverage exceed thresholds, so not FAIL.

---

#### P2/P3 Criteria (Informational, Don't Block)

| Criterion         | Actual          | Notes                                                        |
| ----------------- | --------------- | ------------------------------------------------------------ |
| P2 Test Pass Rate | 80% (4/5) | Tracked, doesn't block — 1 waived RED (R-007 burst accumulation, score 4, same cause as R-002) |
| P3 Test Pass Rate | N/A (0 tests) | Evaluated — no P3 in scope |

---

### GATE DECISION: CONCERNS

---

### Rationale

All **P0 criteria met** with 100% coverage and **16/16 P0 tests green** — the spec I/O matrix (small 3→1.08/80/4 false, medium 6→1.12/100/8 false, heavy 12+→1.15/120/16 true, glow only 1536+, Reduced Motion gates all visuals while `reducedPresetFor(12).haptic==='heavy'` stays, non-finite fallbacks, multi-merge, finite scale ≤1.2, chrome guard, never-throw) is proven on the working-tree delta `ef72635` (`triade/src/feel/feel.ts` + `triade/src/feel/punch.ts` + `triade/src/render/GameBoard.tsx` with `isMerge && !reducedMotion` + `triade/App.tsx:887` wiring). Engine remains byte-identical (`git diff --stat -- triade/src/engine` empty per ADR-01), `npx tsc --noEmit` clean, and full suite **745/749 (99.47%)** exceeds the 95% overall pass target.

**CONCERNS** (not **FAIL**) because the two failures are **expected-red waivers with documented residual risks** constituting the only P1/P2 misses and sharing a single cause:

1. **R-002 (P1, score 6)** — `GameBoard.tsx:386-392` stores burst auto-clear in bare `setTimeout(()=>setBursts(filter by id),500)` without a `burstTimer(s)Ref` and without `clearTimeout` on unmount. An in-flight `appear` tile promoted to `move` under T3.4 early-input (`busy` gate opens at `EARLY_INPUT_MS ~84ms` / 30% of `MAX_MOVE_ANIM_MS`) cancels its `withDelay` via `opacity=1/scale=1` but its `BurstView` (key `b${idPool[i]}` in `bursts` state) remains at stale `pixel(tr.to)` and its timer runs on a stale closure — rapid swipes can accumulate orphan bursts off-grid or `setState on unmounted component` warning. `haptics.atdd.test.ts:269` `[P1-05]` correctly fails with `GameBoard must store burst setTimeout id(s) in a ref and clear on unmount`.

2. **R-007 (P2, score 4)** — same `setTimeout` leak's second signal at `punch.atdd.test.ts:314` `[P2-01]` (`burst setTimeout must be cleared on GameBoard unmount`). The auto-clear does filter `prev.filter(b=>!newBursts.some(nb=>nb.id===b.id))` correctly for uniqueness (id-keyed), but lacks the unmount guard. Spec `Auto Run Result:Verification` already notes "Engine files byte-identical ... 2 fail (both EXPECTED RED: R-001, R-006)" carry-over from 8-1; new residual is this leak.

Additionally, **device smoke** (`P1-06` in test-design: real iPhone Skia+Reanimated worklets, Taptic not simulatable) is **manual E2E** and **PENDING** — it is the correct TEA `E2E` level for punch visuals and is required before `verified`, but its absence does not fail the host-gated `done` state when waived with a dated owner (waiver expiry before 8-3, owner PR author / QA, 15 min).

**Overall residual risk: MEDIUM — deployment with enhanced monitoring is acceptable; block `verified` until waivers are cleared.**

---

#### Residual Risks (For CONCERNS or WAIVED) — 2 open (same cause, both waived) + 2 planned

1. **R-002 burst timer leak (P1, score 6)**
   - **Priority:** P1 — High (orphan bursts / unmounted update during early-input re-plan)
   - **Probability:** Medium (deterministic when second swipe falls within 500ms burst window after a merge)
   - **Impact:** High (visual orphan at stale cell + React warning, future 8.3 shake also mutates `tilesRef` under re-plan)
   - **Risk Score:** 6 (`2×3`, TEA test-design R-002)
   - **Mitigation:** Store `setTimeout` id(s) in `burstTimersRef: Set<ReturnType<typeof setTimeout>>` and clear on `GameBoard` unmount via `useEffect` return (exactly like `settleTimerRef` at `GameBoard.tsx:321-326`); tie burst lifetime to `AnimatedTile` id or mounted ref if needed; keep `pointerEvents:none` + `position:absolute` for dots.
   - **Remediation:** Fix in 8-3 cycle (before shake) or commit as patch to 8-2; re-run `punch.atdd.test.ts:269` until GREEN plus `314` plus device rapid-swipe combo video.

2. **R-007 burst accumulation (P2, score 4) — same fix**
   - **Priority:** P2 — Medium (memory / orphan dots)
   - **Probability:** Medium (same window, `idPool` wraps after many moves — currently `idRef` is monotonic, but re-plan can reuse stale `idPool` pattern)
   - **Impact:** Medium (leaked `Animated.View`s until 500ms auto-clear, `setState` on unmounted)
   - **Risk Score:** 4 (`2×2`, TEA test-design R-007)
   - **Mitigation:** Same ref+cleanup as R-002; one code change clears both `P1-05` and `P2-01`.
   - **Remediation:** Same due date; both turn GREEN together.

3. **R-001 burst jank vs 60 FPS (P1, score 6) — informational this trace**
   - **Priority:** P1 — High (perf)
   - **Probability:** Medium (16 `ParticleDot` with 4 shared values + staggered `withDelay`/`withTiming` + `Canvas` + overshoot sequence can exceed p99 16.7ms on mid-tier iPhones)
   - **Risk Score:** 6
   - **Mitigation:** Caps `overshootScale≤1.2`/`particleBurst∈{0,4,8,16}` still asserted (`P0-08` GREEN), `P2-02` micro-bench host GREEN (<200ms for 130k), keep `BurstView` dots `position:absolute` — consider limiting bursts to heaviest merge per move if device trace shows jank.
   - **Remediation:** Add device benchmark lane `useFrameRateBaseline` after 2-min play including heavy+glow before 8-3.

4. **R-003 FR-30 compliance wiring (P1, score 6) — mitigated**
   - **Priority:** P1
   - **Mitigation:** `P0-05` sweep + `P1-04` App wiring gate already GREEN (`reducedMotion={settings.reducedMotion}` and `GameOverOverlay literal false`); add `// FR-30: punch gated — haptics stay` comment and lint/BAN rule for `reducedMotion` imports in `src/feel` outside `punch.ts`.
   - **Remediation:** Add lint rule this story, enforce in 8-5 review.

**Overall Residual Risk:** **MEDIUM** — deploy `done` with enhanced monitoring; block `verified` until both waivers cleared and device lane signed off.

---

#### Critical Issues (For FAIL or CONCERNS) — 2 waived, 1 pending device lane

| Priority | Issue         | Description         | Owner        | Due Date     | Status             |
| -------- | ------------- | ------------------- | ------------ | ------------ | ------------------ |
| P1       | R-002 burst leak (P1-05) | `GameBoard` `setTimeout(500)` bare → orphan burst / `setState` on unmounted; test `punch.atdd.test.ts:269` red | FE | before 8-3 (shake mutates `tilesRef` under re-plan) | WAIVED (expected red, one fix) |
| P2       | R-007 accumulation (P2-01) | Same burst id filter correct but unmount guard missing; test `punch.atdd.test.ts:314` red | FE | before 8-3 | WAIVED (same fix as P1-05) |
| P1       | Device smoke PENDING | Real iPhone manual lane: 3 subtle / 6 medium / 12+ flash+16 / 1536 glow portrait+landscape + Reduced Motion ON flat + preview chrome + airplane + rapid-swipe orphan | PR author / QA | before verified | OPEN — 15 min |

**Blocking Issues Count:** 0 P0 blockers, 2 P1/P2 waived issues (same cause) + 1 P1 manual pending (device lane — not a host coverage gap).

---

### Gate Recommendations

#### For CONCERNS Decision ⚠️

1. **Deploy with Enhanced Monitoring**
   - Merge `ef72635` to `done` is acceptable; keep `sprint-status.yaml` at `done` (orchestrator bookkeeping — not a defect per task constraints). Do **not** advance to `verified` until `P1-05` and `P2-01` are green and device smoke signed off.
   - Enable enhanced logging for the two risk areas:
     - R-002/R-007: dev-build warning on orphan burst (stale `pixel(tr.to)` outside grid bounds) and CI check for `GameBoard` `clearTimeout` on `burstTimer*` in diff.
     - R-001: frame budget — keep `useFrameRateBaseline` lane ready; no infra for nightly yet (defer to Epic 8 `p99 <16.7ms` when 8.3 lands).

2. **Create Remediation Backlog**
   - **8-2.1 Fix burst timer cleanup (R-002/R-007)** (Priority: P1) — Owner FE, Due: before 8-3, Verification: `punch.atdd.test.ts:269 + 314` both GREEN + rapid-swipe combo device video (2–3 sequential merges within 500ms show no off-grid orphans).
   - Target milestone: **Epic 8 S8.2 follow-up / 8-3** — revisit `R-001` device p99 and `R-003` FR-30 lint in 8-5.

3. **Post-Deployment Actions**
   - Monitor burst behavior on real iPhone for **48h** after `verified` device lane (repeated swipes not leaking).
   - Re-run `npm --prefix triade test` + `npx tsc --noEmit` + `git diff --stat -- triade/src/engine empty` after fix — **re-assess gate to PASS** before 8-3 merge.
   - Enforce PR checks for 8.x: `git diff --stat -- triade/src/engine` empty + `rg "1\.08|1\.12|1\.15" src/feel --glob '!feel.ts'` fails if scattered + `rg "#ff8c2f"` outside `hasGlow` branch fails.

---

### Next Steps

**Immediate Actions** (next 24-48 hours):

1. One-line fix: `burstTimersRef` + `useEffect` cleanup on unmount in `GameBoard.tsx` → make `P1-05` + `P2-01` GREEN.
2. Run 15-min real-iPhone device smoke (test-design `P1-06`): 3→subtle / 6→medium / 12+→flash+16 / 1536+→glow only, portrait+landscape, Reduced Motion ON flat, airplane, rapid-swipe orphan check — record PR checkbox sign-off before `verified`.
3. Product owns R-001 device benchmark decision before 8-3; keep 8-1 carry-over REDs (`2!==1` tutorial dedup, `expo-haptics` dep) waived — do not re-block 8-2.

**Follow-up Actions** (next milestone 8-3):

1. Sequential dev: implement Screen Shake (8-3) which reuses same `FeelPreset.shakeMs` + `reducedMotion` gate — verify its `tilesRef` mutation does not regress burst fix.
2. Run `/bmad:tea:test-review` on `punch.test.ts` + `punch.atdd.test.ts` for quality DoD validation (conscious deduplication is intentional).
3. Run `/bmad:tea:nfr-assess` for 60 FPS p99 when Epic 8 device lane available (deferred, not required for `done`).

**Stakeholder Communication**:

- Notify PM: `CONCERNS — P0 100% GREEN (16/16) and FULL 6/6 coverage on ef72635, but P1-05/P2-01 burst timer leak is expected-red waived + device smoke pending; done is acceptable, verified blocked until one-line fix before 8-3. Details: _bmad-output/test-artifacts/traceability/traceability-matrix-8-2-punch-visual.md`
- Notify SM: `CONCERNS — same; orchestrator must keep sprint-status.yaml at done (no revert) per task constraints; awaiting-operator for device lane is bookkeeping, not defect.`
- Notify DEV lead: `CONCERNS — see R-002/R-007 remediation (burstTimersRef + clearTimeout on unmount) and CI gates before 8-3.`

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  # Phase 1: Traceability
  traceability:
    story_id: "8-2"
    date: "2026-09-01"
    coverage:
      overall: 100%
      p0: 100%
      p1: 100%
      p2: 100%
      p3: 100%
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 0
    quality:
      passing_tests_scoped: 26
      passing_tests_full_suite: 745
      total_tests_scoped: 28
      total_tests_full_suite: 749
      blocker_issues: 0
      warning_issues: 2
    recommendations:
      - "Fix R-002/R-007 burst timer leak before 8-3 — store in ref + clear on unmount (one fix clears both)"
      - "Run 15-min real-iPhone device smoke P1-06 before verified (3/6/12+/1536 + Reduced Motion ON flat + rapid-swipe orphan)"

  # Phase 2: Gate Decision
  gate_decision:
    decision: "CONCERNS"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100%
      p0_pass_rate: 100%
      p1_coverage: 100%
      p1_pass_rate: 83.3%
      overall_pass_rate_scoped: 92.9%
      overall_pass_rate_full_suite: 99.47%
      overall_coverage: 100%
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_p1_pass_rate: 90
      min_overall_pass_rate: 95
      min_coverage: 80
    evidence:
      test_results: "local npm --prefix triade test — 749 tests 745 pass / 4 fail (expected RED) 4906ms; scoped 28 tests 26 pass / 2 fail (R-002/R-007 bare setTimeout) + tsc clean + engine empty"
      traceability: "_bmad-output/test-artifacts/traceability/traceability-matrix-8-2-punch-visual.md"
      coverage_matrix: "_bmad-output/test-artifacts/traceability/coverage-matrix-8-2-punch-visual.json"
      gate_decision: "_bmad-output/test-artifacts/traceability/gate-decision-8-2-punch-visual.json"
      nfr_assessment: "_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md (NFR Planning)"
      code_coverage: "N/A (node:test, no c8 gate)"
    next_steps: "Fix one bare setTimeout leak (burstTimersRef + clearTimeout on unmount) → 19/19 GREEN + run 15-min real-iPhone device smoke before verified; re-run trace to PASS before 8-3"
    waiver: # CONCERNS with waived expected-reds
      reason: "2 expected-red guards encode 8-2 burst timer leak (R-002 P1-05 score 6, R-007 P2-01 score 4) — coverage is FULL (tests exist), execution is waived pending one-line fix before 8-3; plus carry-over 8-1 waivers (R-001 2!==1, R-006 dep) not counted as 8-2 blockers"
      approver: "FE — pending sign-off, waiver expiry before 8-3 / before 8-5 review"
      expiry: "2026-09-15 (8-3 milestone / before 8-5 Reduced Motion umbrella)"
      remediation_due: "before verified / before 8-3 merge"
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md` (spec contract — 5 ACs + I/O matrix 7 rows + FR-30/UX-DR-16/UX-DR-27, tasks+acceptance, final_revision `punch-visual-8-2`)
- **Epic Context:** `_bmad-output/implementation-artifacts/epic-8-context.md` + `epics.md` 8-2 entry
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` (R-001..R-010, P0 8 groups / P1 6 / P2 5 / P3 3, ~5.5–12h)
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md` (19 ATDD scaffolds, 17 green + 2 expected red)
- **Automation Summary:** `_bmad-output/test-artifacts/automation-summary.md` (preflight + 28 mapped + 749 total)
- **Spec Change Delta:** working-tree `ef72635` delta — `triade/src/feel/feel.ts:20-45` + `triade/src/feel/punch.ts` + `triade/src/render/GameBoard.tsx:100-480` + `triade/App.tsx:887` (mirrors spec Code Map)
- **Test Files:** `triade/__tests__/feel/punch.test.ts` (9, `triade/__tests__/feel/punch.atdd.test.ts` 19) — `triade/__tests__/feel/` surface (`feel.test.ts` 12 carry-over unchanged)
- **Trace Artifacts:** `coverage-matrix-8-2-punch-visual.json`, `gate-decision-8-2-punch-visual.json`, `e2e-trace-summary-8-2-punch-visual.json`, `traceability-matrix-8-2-punch-visual.md` — all under `_bmad-output/test-artifacts/traceability/`
- **NFR Evidence Audit:** deferred — see `test-design-epic-8-2-punch-visual.md` NFR Planning (60 FPS / never-throw / maintainability / FR-30+chrome/offline); full `nfr-assess` when Epic 8 device lane available

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 100% (6/6 FULL) ✅
- P0 Coverage: 100% (4/4) ✅ PASS
- P1 Coverage: 100% (1/1) ✅ PASS — execution 83% waived
- Critical Gaps: 0
- High Priority Gaps: 0 (execution concern is waived RED, not coverage gap)

**Phase 2 - Gate Decision:**

- **Decision:** CONCERNS ⚠️
- **P0 Evaluation:** ✅ ALL PASS (16/16 green, 6/6 FULL, tsc clean, engine byte-identical)
- **P1 Evaluation:** ⚠️ SOME CONCERNS (5/6 green; P1-05 R-002 bare burst setTimeout waived + device smoke pending)

**Overall Status:** CONCERNS ⚠️ — code-complete `done` on `ef72635` with one-line fix pending + device lane; block `verified` until waivers cleared.

**Next Steps:**

- If PASS ✅: Proceed to deployment (target after burst fix + device smoke — all 28 GREEN + manual sign-off)
- If CONCERNS ⚠️: Deploy `done` with monitoring, create remediation `8-2.1 burst timer cleanup` (one fix), run 15-min device smoke before `verified` — current state
- If FAIL ❌: Block deployment, fix critical issues, re-run workflow (not applicable — no P0 blocker)
- If WAIVED 🔓: Deploy with business approval and aggressive monitoring (not applicable — CONCERNS is sufficient)

**Generated:** 2026-09-01
**Workflow:** testarch-trace v4.0 (Enhanced with Gate Decision) — story `8-2-punch-visual` working-tree `ef72635` + untracked `punch.atdd.test.ts` delta
**Evaluator:** Eduardo (TEA Master Test Architect)

---

<!-- Powered by BMAD-CORE™ -->
