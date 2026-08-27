---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-24'
workflowType: 'testarch-trace'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md', '_bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md']
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: '/tmp/tea-trace-coverage-matrix-7-2.json'
---

# Traceability Report — Story 7.2: Preview card no HUD (60/40)

**Target:** Story 7.2
**Date:** 2026-08-24 (corrigido via modo Edit após validação)
**Evaluator:** Eduardo (TEA Master Test Architect)
**Coverage Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — story file ACs 1–7
**Oracle Sources:** `_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`, ATDD checklist 7.2
**Re-verification:** 7 suítes mapeadas executadas ao vivo — **40 pass / 0 fail**.

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (7/7 acceptance criteria fully covered by active, green tests — incluindo o AC3 two-lane, agora implementado e testado), no P1 requirements are in scope (effective target met), and overall coverage is 100% (minimum: 80%). All 26 mapped tests are active (0 skipped/fixme/pending); mapeadas suites verificadas verdes em execução (40 pass / 0 fail nos 7 arquivos referenciados; suite completo re-run: 311 pass / 0 fail).

---

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
|----------|----------------|---------------|------------|--------|
| P0       | 7              | 7             | 100%       | ✅ PASS |
| P1       | 0              | 0             | 100%*      | ✅ PASS |
| P2       | 0              | 0             | 100%*      | ✅ PASS |
| P3       | 0              | 0             | 100%*      | ✅ PASS |
| **Total**| **7**          | **7**         | **100%**   | ✅ PASS |

\* No P1/P2/P3 requirements in scope for this story; effective coverage treated as 100% per gate rules.

---

## Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 7.2-AC1 | Reads `game.pendingSpawn`, never re-rolls (pure fn of pre-resolved pending) | P0 | FULL | 7.2-U-007, 7.2-U-008, 7.2-U-011, 7.2-S-001, 7.2-C-009, 7.2-C-011 |
| 7.2-AC2 | `<0.6` exact / `≥0.6` range; range = contiguous window ≤3, joined `/` | P0 | FULL | 7.2-U-001…006, 7.2-U-010, 7.2-C-001, 7.2-C-002, 7.2-C-010 |
| 7.2-AC3 | Both lanes (Clean + Accelerated) show the preview | P0 | FULL | 7.2-C-012, 7.2-C-013 |
| 7.2-AC4 | Portrait bottom corner / landscape top band placement | P0 | FULL | 7.2-C-007, 7.2-C-008, 7.2-C-011 |
| 7.2-AC5 | Accent `#E8A33D` @20pt, chrome `#f1eee6`/`#c9c4b8`/12pt | P0 | FULL | 7.2-C-003, 7.2-C-004, 7.2-C-005, 7.2-U-009 |
| 7.2-AC6 | No feel/animation on card (chrome, not board) | P0 | FULL | 7.2-C-006 |
| 7.2-AC7 | NOOP move never changes pendingSpawn | P0 | FULL | 7.2-U-009, 7.2-E-001 |

### Test Inventory (deduplicated)

| ID | Level | File:Line | Title |
|---|---|---|---|
| 7.2-U-001 | unit | triade/__tests__/game/preview.test.ts:29 | [P0] AC2 — displayRoll below 0.6 yields the exact value |
| 7.2-U-002 | unit | triade/__tests__/game/preview.test.ts:34 | [P0] AC2 — displayRoll at 0.6 (boundary) yields a range |
| 7.2-U-010 | unit | triade/__tests__/game/preview.test.ts:41 | [P0] AC2/F-2 — displayRoll exactly 0.6 produces a valid window |
| 7.2-U-011 | unit | triade/__tests__/game/preview.test.ts:55 | [P0] AC1/F-3 — out-of-ladder value yields a defensive single-element range |
| 7.2-U-003 | unit | triade/__tests__/game/preview.test.ts:61 | [P0] AC2 — exact path echoes pendingSpawn.value verbatim |
| 7.2-U-004 | unit | triade/__tests__/game/preview.test.ts:67 | [P0] AC2 — range path always contains the pending value |
| 7.2-U-005 | unit | triade/__tests__/game/preview.test.ts:75 | [P0] AC2 — range is capped at 3 values and ascending |
| 7.2-U-006 | unit | triade/__tests__/game/preview.test.ts:86 | [P0] AC2 — range is a contiguous window of the tier sequence |
| 7.2-U-007 | unit | triade/__tests__/game/preview.test.ts:93 | [P0] AC1/AC7 — previewFor is pure: identical input yields deep-equal output |
| 7.2-U-008 | unit | triade/__tests__/game/preview.test.ts:99 | [P0] AC1 — previewFor never re-rolls: distinct displayRoll values do not collide on exact |
| 7.2-C-001 | component | triade/__tests__/ui/components/previewCard.test.ts:49 | [P0] AC2 — exact preview renders the value as its own Text node |
| 7.2-C-002 | component | triade/__tests__/ui/components/previewCard.test.ts:55 | [P0] AC2 — range preview renders values joined by '/' |
| 7.2-C-003 | component | triade/__tests__/ui/components/previewCard.test.ts:63 | [P0] AC5 — value text uses accent ink #E8A33D at 20pt |
| 7.2-C-004 | component | triade/__tests__/ui/components/previewCard.test.ts:71 | [P0] AC5 — card chrome (light theme shipped): #f1eee6 fill, #c9c4b8 border, 12pt radius |
| 7.2-C-005 | component | triade/__tests__/ui/components/previewCard.test.ts:79 | [P0] AC5 — accessibilityLabel announces the next spawn |
| 7.2-C-006 | component | triade/__tests__/ui/components/previewCard.test.ts:92 | [P0] AC6 — card carries no animation/transform props (chrome, not board) |
| 7.2-C-007 | component | triade/__tests__/ui/components/hud.test.ts:66 | [P0] AC4 — portrait renders the square 76×76 preview panel (assert within 'Hud renders a pause button in portrait', ~line 72) |
| 7.2-C-008 | component | triade/__tests__/ui/components/hud.test.ts:77 | [P0] AC4 — landscape renders the compact 60×44 preview band (assert within 'Hud switches to the landscape layout', ~line 87) |
| 7.2-C-012 | component | triade/__tests__/ui/components/hud.test.ts:119 | [P0] AC3/F-4 — Hud renders labeled previews for both Clean and Accelerated lanes |
| 7.2-C-009 | component | triade/__tests__/ui/components/hud.previewWiring.test.ts:56 | [P0] AC1/AC2 — exact pending (displayRoll < 0.6) renders its value through the Hud |
| 7.2-C-010 | component | triade/__tests__/ui/components/hud.previewWiring.test.ts:68 | [P0] AC1/AC2 — range pending (displayRoll >= 0.6) renders a joined window through the Hud |
| 7.2-C-011 | component | triade/__tests__/ui/components/hud.previewWiring.test.ts:76 | [P0] AC1/AC4 — landscape wiring reuses the same previewFor output (compact 60x44 band) |
| 7.2-C-013 | component | triade/__tests__/ui/components/hud.previewWiring.test.ts:89 | [P0] AC1/AC3/F-4 — two distinct lane previews render through previewFor wiring |
| 7.2-S-001 | unit | triade/__tests__/ui/ui.norolls.test.ts:83 | [P0] AC4 UI never rolls: App/src-ui/src-render/src-services never import or reference roll symbols and never use Math.random |
| 7.2-U-009 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:212 | [P0] AC5/UX-DR-23 NOOP never re-resolves the preview: pendingSpawn deep-equal to input, 0 rng draws |
| 7.2-E-001 | e2e | triade/__tests__/e2e/session.e2e.test.ts:35 | [P0] AC7 — noop keeps the pending preview unchanged (assertion embedded in 'e2e: core loop — moves accumulate score, gate opens after settle', ~line 67) |

Files: 7 · Cases: 26 · Skipped/Fixme/Pending: 0/0/0

### Coverage Validation Notes

- AC1 (reads `game.pendingSpawn`, never re-rolls) is enforced at three layers: `previewFor` purity + no-roll unit tests (`preview.test.ts`), the structural UI guard (`ui.norolls.test.ts`), and the confirmed `App.tsx` wiring `preview={previewFor(game.pendingSpawn)}`. No single-suite fragility. (Linhas corrigidas: U-003→61, U-004→67, U-005→75, U-006→86, U-007→93, U-008→99, U-011→55, S-001→83.)
- AC2 spans the pure resolver (`preview.test.ts` boundary/exact/range/contiguity + F-2/F-3) and the renderer (`previewCard.test.ts` exact/range-join) — both directions covered.
- AC3 (both lanes) is now implemented and pinned at the HUD-wiring level: `hud.test.ts:119` (labeled Clean/Accelerated lanes) and `hud.previewWiring.test.ts:89` (two distinct lane previews). Deferral original fechado.
- AC4 placement is pinned by the 76×76 (portrait, assert ~line 72 em `hud.test.ts:66`) and 60×44 (landscape, assert ~line 87 em `hud.test.ts:77`) style assertions, preservando os marcadores de HUD pré-7.2. (IDs C-007/C-008 apontam para o teste correto; título anterior não batia — corrigido.)
- AC5 chrome/accent pinned em `previewCard.test.ts` (C-003/004/005) e NOOP em `pending-spawn-contract.test.ts:212` (U-009).
- AC7 NOOP reinforced at contract (U-009) and end-to-end (E-001) level. E-001 é um assert embutido no teste 'e2e: core loop' (`session.e2e.test.ts:35`, assert ~line 67) — rotulado corretamente como assertion embutida, não teste standalone.
- Heuristics: endpoint/auth N/A (pure renderer + engine story); happy-path-only gaps: 0; UI journey/state gaps: 0 within this story's oracle.

---

## Gaps & Recommendations

**Coverage gaps (in-scope):** none (critical: 0, high: 0).

**Sanctioned deferral — CLOSED:** 7.2-AC3 (both lanes preview) estava marcado como deferral. O codebase agora implementa e testa o two-lane (`hud.test.ts:119`, `hud.previewWiring.test.ts:89`), portanto AC3 entra em escopo como FULL. Nenhuma lacuna de cobertura permanece.

**Recommendations:**
1. **LOW** — Run `/bmad:tea:test-review` on the 7.2 suites for quality DoD validation.
2. ~~**LOW (CLOSED)**~~ App-level composition test (`hud.previewWiring.test.ts`, 7.2-C-009/010/011) — seam already covered.
3. **INFO** — AC3 deferral closed; trace atualizado para 7 critérios P0 em escopo.

---

## Next Actions

Gate **PASS** — Story 7.2 aprovada do ponto de vista de cobertura/traceabilidade, agora com AC3 (two-lane) em escopo e verde. O norolls guard de 7.1 continua protegendo o renderer contra re-roll acidental. Suite completo reconfirmado: 311 pass / 0 fail.

---

_Gate decision summary (step-05):_

🚨 GATE DECISION: **PASS**

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (PASS target: 90%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale: All 7 in-scope acceptance criteria traced to active, green tests across unit, component, and e2e layers; zero uncovered requirements; mapped 7.2 suites 40 pass / 0 fail.

⚠️ Critical Gaps: 0

📂 Machine-readable outputs:
- `_bmad-output/test-artifacts/traceability/coverage-matrix-7-2.json`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-7-2.json`
- `_bmad-output/test-artifacts/traceability/gate-decision-7-2.json`
