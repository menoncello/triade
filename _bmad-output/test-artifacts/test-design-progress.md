---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-01'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-8-3-screen-shake.md'
  - '_bmad-output/implementation-artifacts/epic-8-context.md'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/shake.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/feel/shake.test.ts'
  - 'triade/App.tsx'
  - '_bmad/tea/config.yaml'
---

# Test Design Progress — 8-1 Haptics (Epic-Level)

## Step 1 — Detect Mode
Mode: **Epic-Level (Phase 4)**. Trigger: `sprint-status.yaml` exists + epic-8-context + spec-8-1-haptics provide accepted AC. System-level prerequisites (PRD+ADR) not needed for this targeted story design.

## Step 2 — Load Context
Loaded: spec contract (intent/boundaries/I-O matrix, 4 ACs), epic-8 context (feel model, S8.1–8.6 deps), `triade/src/feel/feel.ts` (91 LOC), `triade/src/feel/haptics.ts` (55 LOC), `triade/__tests__/feel/feel.test.ts` (12 cases), `triade/App.tsx` wiring block, `_bmad/tea/config.yaml` (test_artifacts, language). Stack detected: frontend (Expo RN + Skia + Reanimated, SDK 57, no backend) — knowledge fragments: risk-governance, probability-impact, test-levels-framework, nfr-criteria.

## Step 3 — Risk and Testability
8 risks scored (P×I): 2 high (R-001 double haptic on tutorial climax 3×2=6, R-002 FR-30 drift 2×3=6), 3 medium of score 4 (R-003 multi-merge, R-005 import cost, R-006 expo-haptics dep), remainder low. NFRs: 60 FPS/never-throw/maintainability/FR-30 — each mapped to planned evidence.

## Step 4 — Coverage Plan
P0 7 groups (host unit, already 12 it() passing), P1 5 groups (engine-trace fixtures + App wiring + device smoke), P2 4 checks, P3 2 exploratory. Execution: host in PR (<5 s), one 15-min device pass pre-merge, no nightly needed for 8-1. Estimates ~10–20 h (~1.5–3 d).

## Step 5 — Generate Output (8-1)
Outputs: `_bmad-output/test-artifacts/test-design/test-design-epic-8-1-haptics.md` (canonical) + mirror at `_bmad-output/test-artifacts/test-design-epic-8-1-haptics.md` (workflow.yaml path). Validated against `checklist.md` — host checks green, device smoke flagged as manual waiver.

---

# Test Design Progress — 8-2 Punch Visual (Epic-Level)

## Step 1 — Detect Mode
Mode: **Epic-Level (Phase 4)**. Trigger: `sprint-status.yaml` exists + `spec-8-2-punch-visual.md` + `epic-8-context.md` provide accepted AC; `ef72635` delta is `src/feel` + `src/render/GameBoard` + `App.tsx` wiring, engine byte-identical. System-level prerequisites (PRD+ADR) not needed for this targeted story design.

## Step 2 — Load Context
Loaded: spec contract (intent/boundaries/I-O matrix, 7 rows, 5 ACs), epic-8 context (feel model, S8.1–8.6 deps), `triade/src/feel/feel.ts` (extended with `overshootScale` 1.08/1.12/1.15), `triade/src/feel/punch.ts` (47 LOC, 6 pure helpers), `triade/src/render/GameBoard.tsx` (480 LOC, `isMerge`/`reducedMotion`/`BurstView`/`ParticleDot`), `transitionPlan.ts:classify`, `triade/__tests__/feel/punch.test.ts` (8 cases, 105 LOC), `triade/App.tsx` wiring block, `_bmad/tea/config.yaml` (test_artifacts ` _bmad-output/test-artifacts`, test_design_output `_bmad-output/test-artifacts/test-design`). Stack detected: frontend-only (Expo RN 57 + Skia + Reanimated 4 + RNGH, no backend) — knowledge fragments: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix, nfr-criteria (extended).

## Step 3 — Risk and Testability
10 risks scored (P×I): 3 high (R-001 burst jank PERF 2×3=6, R-002 early-input orphan TECH 2×3=6, R-003 FR-30 gate BUS 2×3=6), 5 medium of score 3–4 (R-004 contract/chrome 2×2=4, R-005 only-glow 1×3=3, R-006 flash over-trigger 2×2=4, R-007 burst accumulation 2×2=4, R-008 overshoot vs early-input 2×2=4), remainder low. Testability: controllability high via `presetFor`/`punchProfileFor` pure + `applyPlan` with engine fixtures; observability partial (Reanimated worklet thin — host can assert `isPunch`/`hasFlash`/`hasGlow` booleans & `bursts` state, not spring timing); reliability good (never-throw, but `setTimeout` burst cleanup needs unmount guard). NFRs: 60 FPS/never-throw/maintainability/FR-30+chrome/offline — each mapped to planned evidence; no new network dep.

## Step 4 — Coverage Plan
P0 8 groups (host unit, already 8 it() passing — light/medium/heavy/glow/reduced/non-finite/multi-merge/finite-cap), P1 6 groups (engine-trace→isMerge fixtures + chrome guard + overshoot preset mapping + burst scaling/gating + early-input orphan + device smoke 3/6/12+/1536 + Reduced Motion flat + preview chrome), P2 5 checks (cleanup bench static NOOP), P3 3 exploratory (tuning/glow snapshot/clipping). Execution: host in PR (<5 s + <15 min gate), one 15-min device pass pre-merge, no nightly needed for 8-2. Estimates ~5.5–12 h host → ~12–22 h elapsed with device.

## Step 5 — Generate Output (8-2)
Outputs: `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` (canonical, per `test_design_output`) + mirror at `_bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md` (per `workflow.yaml` `test_design-epic-{epic_num}.md`). Validated against `checklist.md`: risk matrix P×I correct, high ≥6 flagged, mitigation/owner/timeline present, NFR planned evidence without PASS/FAIL, P0/P1/P2/P3 criteria present with priority-not-timing note, execution strategy PR/pre-merge/nightly-not-required, estimates as ranges, quality gates P0 100%/P1 ≥95%, no duplicate merge predicate, single-preset source invariant, entry/exit criteria derived from dependencies/gates.

---

# Test Design Progress — 8-3 Screen Shake (Epic-Level)

## Step 1 — Detect Mode
Mode: **Epic-Level (Phase 4)**. Trigger: `sprint-status.yaml` exists + `spec-8-3-screen-shake.md` + `epic-8-context.md` provide accepted AC; `721bf3a` delta is `triade/src/feel/shake.ts` + `triade/src/render/GameBoard.tsx` directional shake + `App.tsx` `lastDirectionRef` wiring, engine byte-identical. System-level prerequisites (PRD+ADR) not needed for this targeted story design. Working tree diff is metadata-only (`spec` final_revision + `sprint-status.yaml` 8-3 backlog→done); assessed delta is `HEAD` commit `721bf3a` vs baseline `e4629cd`.

## Step 2 — Load Context
Loaded: spec contract (intent/boundaries/I-O matrix 8 rows, 6 ACs), epic-8 context (feel model, S8.1–8.6 deps), `triade/src/feel/feel.ts` (97 LOC, shakeMs 2/2/5 cap 8 + REDUCED 0), `triade/src/feel/shake.ts` (81 LOC, 5 pure helpers + SHAKE_CAP, Number.isFinite + try/catch never-throw), `triade/src/render/GameBoard.tsx` (539 LOC, `direction` prop, `shakeX/Y` + `Animated.View` wrapper, `withSequence` 130 ms on swipe axis, bleed-cancel 20 ms, mid-animation `reducedMotion` snap), `transitionPlan.ts:classify`, `triade/__tests__/feel/shake.test.ts` (12 cases, 158 LOC, 757 pass / 4 expected RED from punch ATDD), `triade/App.tsx` wiring block (`lastDirectionRef` sync set before `move()` + clear on restart/lane), `_bmad/tea/config.yaml` (test_artifacts `_bmad-output/test-artifacts`, test_design_output `_bmad-output/test-artifacts/test-design`). Stack detected: frontend-only (Expo RN 57 + Skia + Reanimated 4 + RNGH, no backend) — knowledge fragments: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix, nfr-criteria (extended).

## Step 3 — Risk and Testability
10 risks scored (P×I): 3 high (R-001 overlap jank PERF 2×3=6, R-002 FR-30 gate BUS 2×3=6, R-003 direction wiring TECH 2×3=6), 5 medium score 3–4 (R-004 contract/chrome 2×2=4, R-005 NOOP bleed 1×3=3, R-006 cap divergence 1×3=3, R-007 clipping 2×2=4, R-008 max-wins 1×2=2 as medium), 2 low (R-009 non-finite fallback 1×1=1, R-010 reducedPresetFor identity 1×2=2). Testability: controllability high via `shakeMsFor`/`maxShakeForTrace`/`directionVector` pure + `maxShakeForTrace` host-inspectable; observability partial (Reanimated withSequence thin — host can assert amplitude/axis + bleed-cancel branch, not timing physics); reliability good (never-throw + Number.isFinite guards + try/catch). NFRs: 60 FPS/never-throw/maintainability/FR-30+chrome+cap/offline — each mapped to planned evidence; no new network dep. Deferred-work entries (overlap without cancelAnimation, overflow clipping) captured as R-001/R-007.

## Step 4 — Coverage Plan
P0 9 groups (host unit, already 12 it() passing — subtle 2 / heavy 5 / light 2 / cap 8 / Reduced Motion / NOOP/empty/spawn-only / multiple merges max / direction vectors / invalid dir / non-finite + presetFor alignment), P1 7 groups (engine-trace→maxShake fixtures + App lastDirectionRef sync/clear + axis mapping X/Y isolation + mid-flight Reduced Motion snap + chrome guard + bleed cancel + device smoke left/right X / up/down Y + Reduced Motion flat + preview chrome + NOOP), P2 6 checks (overlap timing artefact, bench, cap SHAKE_CAP scan, engine purity + predicate allowlist, clipping visual, NOOP complement), P3 3 exploratory (tuning rank 2/5/8, clip/chrome snapshot, rapid axis switch). Execution: host in PR (<5 s + <15 min gate), one 15-min device pass pre-merge, no nightly needed for 8-3. Estimates ~6–14 h host → ~11–23 h elapsed with device.

## Step 5 — Generate Output (8-3)
Outputs: `_bmad-output/test-artifacts/test-design/test-design-epic-8-3-screen-shake.md` (canonical, per `test_design_output`) + mirror at `_bmad-output/test-artifacts/test-design-epic-8-3-screen-shake.md` (per `workflow.yaml` `test_design-epic-{epic_num}.md`). Validated against `checklist.md`: risk matrix P×I correct, high ≥6 flagged, mitigation/owner/timeline present, NFR planned evidence without PASS/FAIL, P0/P1/P2/P3 criteria present with priority-not-timing note, execution strategy PR/pre-merge/nightly-not-required, estimates as ranges, quality gates P0 100%/P1 ≥95%, no duplicate merge predicate (3 sanctioned sites), single-preset + single-cap (SHAKE_CAP) invariant, entry/exit criteria derived from dependencies/gates, trace contract & chrome rule pinned.

---

# Test Design Progress — 8-4 Bullet Time (Epic-Level)

## Step 1 — Detect Mode
Mode: **Epic-Level (Phase 4)**. Trigger: `sprint-status.yaml` exists + `spec-8-4-bullet-time.md` + `epic-8-context.md` provide accepted AC; `0e2717e` delta is `src/feel/bulletTime.ts` (new pure helpers) + `src/render/GameBoard` bullet flash overlay + `App.tsx` `sessionBestMerge` Snapshot wiring, engine byte-identical. Working tree diff is metadata-only (`sprint-status.yaml` 8-4 `backlog→done`); assessed delta is `HEAD` commit `0e2717e` vs baseline `590e461` (spec `final_revision 12a3dcd` includes review patches). Frontend-only (Expo RN 57 + Skia + Reanimated 4 + RNGH, no backend).

## Step 2 — Load Context
Loaded: spec contract (intent/boundaries/I-O matrix 8 rows, 6 ACs), epic-8 context (feel model, S8.1–8.6 deps), `triade/src/feel/bulletTime.ts` (66 LOC, `BULLET_TIME_MS=200` + 4 pure helpers, Number.isFinite + try/catch never-throw, board-only filter), `triade/src/feel/feel.ts` (99 LOC, frozen presets + `BULLET_TIME_MS` comment), `triade/src/render/GameBoard.tsx` (576 LOC, `sessionBestMerge` prop, `bulletFlash` + overlay `#fff7e0` `60ms+140ms`, safeBest guard, Reduced Motion snap), `triade/src/game/matchOrchestrator.ts` (Snapshot `sessionBestMerge?`), `triade/__tests__/feel/bulletTime.test.ts` (9 cases, 133 LOC, 785 pass / 6 expected RED from punch ATDD), `triade/App.tsx` wiring block (`sessionBestMerge` state + Snapshot carry + functional `nextSessionBest` + 7 `Number.isFinite` restore sites + reset on restart/lane), `_bmad/tea/config.yaml` (test_artifacts `_bmad-output/test-artifacts`, test_design_output `_bmad-output/test-artifacts/test-design`, risk_threshold `p1`). Stack detected: frontend-only (Expo RN 57 + Skia + Reanimated 4 + RNGH) — knowledge fragments: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix, nfr-criteria.

## Step 3 — Risk and Testability
10 risks scored (P×I): 3 high (R-001 FR-30 gate BUS 2×3=6, R-002 Snapshot rewind DATA 2×3=6, R-003 trace contract + datum drift TECH 2×3=6), 4 medium score 3–4 (R-004 chrome guard 2×2=4, R-005 NOOP bleed 1×3=3, R-006 doMove identity 2×2=4, R-007 overlap truncation 2×2=4), 1 medium-low (R-008 migration `undefined→0` 1×2=2), 2 low (R-009 non-finite fallback 1×1=1, R-010 width NaN 1×2=2). Testability: controllability high via `maxMergeValue`/`isNewSessionBest`/`shouldTriggerBulletTime`/`nextSessionBest` pure + `BULLET_TIME_MS` export; observability partial (Reanimated `withSequence` thin — host can assert `shouldTrigger` + `safeBest` + overlay import, not timing physics); reliability good (never-throw + Number.isFinite guards + functional update mitigates EARLY_INPUT_MS race). NFRs: 60 FPS/never-throw/maintainability/FR-30+chrome+datum/offline — each mapped to planned evidence; no new network dep. Deferred-work entries (spawned undefined gap, value<3 pollutes, width NaN, doMove identity) captured as R-003/R-006/R-010.

## Step 4 — Coverage Plan
P0 9 groups (host unit, already 9 it() passing — datum 200 / maxMergeValue board-only / isNewSessionBest / Reduced Motion gate while nextSessionBest advances / multiple merges max wins single 200ms / NOOP/empty/spawn-only / non-finite never throw / nextSessionBest undo-rewind / first-merge-always rarity sequence), P1 7 groups (engine-trace→maxMerge fixtures + App Snapshot/undo functional wiring + 7 Number.isFinite restore guards + GameBoard overlay datum + board-only + Reduced Motion mid-flight + chrome guard + datum single-source + engine purity + device smoke first-3/6/12 + Reduced Motion flat + NOOP + undo rewind), P2 5 checks (overlap truncation within 200ms, datum bench, datum literal scan, engine purity 4-site predicate allowlist, width/overflow clipping), P3 4 exploratory (rarity tuning early-3 always fires, chrome snapshot, shake+bullet co-fire, old-history migration). Execution: host in PR (<5 s + <15 min gate), one 15-min device pass pre-merge, no nightly needed for 8-4. Estimates ~6–13.5 h host → ~10–22 h elapsed with device.

## Step 5 — Generate Output (8-4)
Outputs: `_bmad-output/test-artifacts/test-design/test-design-epic-8-4-bullet-time.md` (canonical, per `test_design_output`) + mirror at `_bmad-output/test-artifacts/test-design-epic-8-4-bullet-time.md` (per `workflow.yaml` `test_design-epic-{epic_num}.md`). Validated against `checklist.md`: risk matrix P×I correct, high ≥6 flagged, mitigation/owner/timeline present, NFR planned evidence without PASS/FAIL, P0/P1/P2/P3 criteria present with priority-not-timing note, execution strategy PR/pre-merge/nightly-not-required, estimates as ranges, quality gates P0 100%/P1 ≥95%, no duplicate merge predicate (4 sanctioned sites), single-datum (BULLET_TIME_MS=200) invariant, entry/exit criteria derived from dependencies/gates, Snapshot ADR-06 + FR-30 + chrome rule pinned.
