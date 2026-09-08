---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-06'
storyId: '1.7'
storyKey: '1-7-legibilidade-dos-numerais-em-landscape'
storyFile: '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-7-legibilidade-dos-numerais-em-landscape-tea.atdd-1.md'
generatedTestFiles: ['_bmad-output/test-artifacts/atdd-1-7-numeral-legibility.red.test.ts']
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/tileNumerals.test.ts'
  - 'triade/__tests__/ui/layout.test.ts'
---

# ATDD Checklist — Story 1.7: Legibilidade dos numerais em landscape (TEA ATDD run, 2026-09-06)

## Step 1: Preflight & Context — Complete

- **detected_stack:** `frontend` (RN app + PWA legado congelado; testes puros via `node:test`)
- **test_stack_type config:** `auto` → resolved `frontend`
- **Test framework:** `node:test` + `node:assert` (`node --test`, sem Playwright/Cypress)
- **TEA flags:** `tea_use_playwright_utils: true` (N/A — sem browser), `tea_use_pactjs_utils: false`, `tea_pact_mcp: none`, `tea_browser_automation: auto`, `tea_execution_mode: auto`
- **Story:** `1.7` / key `1-7-legibilidade-dos-numerais-em-landscape`, status `awaiting-operator`, `final_revision 3e8a021`
- **Working tree (this run):** `git diff --stat HEAD` shows ONLY the orchestrator-owned `_bmad-output/implementation-artifacts/sprint-status.yaml` (`ready-for-dev` → `awaiting-operator`). Untouched per instructions — never written, never reverted. **No production diff.** All contract assessment below is against the shipped state (`tileNumerals.ts`, `layout.ts`, `GameBoard.tsx`, committed suites).
- **Prior artifacts reused:** `_bmad-output/test-artifacts/atdd-checklist-1-7-legibilidade-dos-numerais-em-landscape.md` (2026-08-19, RED-phase origin), `_bmad-output/test-artifacts/test-design/test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md` (2026-09-06, epic-level risks/coverage). This run does NOT overwrite them — it adds the red-phase scaffold + verify-only checklist for the current tree.

### Acceptance Criteria (from story file)

1. **AC-1:** Landscape com board minimizado → tiles com min ~44pt; abaixo disso o layout re-executa o check de legibilidade numeral/ink (UX-DR-18).
2. **AC-2:** Numerais 13pt (4 dígitos) e 9pt (6 dígitos) só usados em larguras que comportam — senão o check de ink-contrast re-executa.
3. **AC-3:** Tier 9pt 6-dígitos (`1536`/`3072+`) é o risk point explícito e permanece legível no menor tile landscape.
4. **AC-4:** Numerais fixos legíveis no maior setting de texto acessível (exceção deliberada ao Dynamic Type, UX-DR-18).

## Step 2: Generation Mode — Complete

**Mode:** AI Generation (sequential; subagent/API-E2E dispatch N/A).

**Justification:** ACs claros e mapeados a funções puras (`numeralTokenFor`, `numeralFits`, `numeralSizeFor`, `tileInkFor`, `layoutFor` + `BOARD_SIZE_FLOOR`); framework `node:test` sem browser; sem gravação necessária (render Skia real é validação manual T3.2 por regra do projeto).

## Step 3: Test Strategy — Complete

| AC | Scenario | Level | Priority | Rationale |
|---|---|---|---|---|
| AC-1 | `MIN_TILE_WIDTH === 44` pin | Unit | P0 | Floor contratual |
| AC-1 | `BOARD_SIZE_FLOOR === 216` + landscape ≥ floor | Unit | P0 | Floor enforcement |
| AC-1 | Degenerate container → valid sub-floor board, no NaN | Unit | P1 | Fallback path |
| AC-2 | Digit buckets 32/800 · 13/700 · 9/700 | Unit | P0 | DESIGN.md:228-232 |
| AC-2 | `numeralSizeFor` gates on `numeralFits` (1000@30 → exatamente 13) | Unit | P0 | Regressão de review |
| AC-2 | Scaling path (< 13pt quando não cabe) | Unit | P0 | "Re-run" do check |
| AC-3 | Risk point 6-dígitos @44pt → ≥ 9pt, sem clip | Unit | P0 | Risk explícito |
| AC-3 | Tiny-tile fallback finito-positivo, largest-fitting | Unit | P1 | Degenerate guard |
| ink | `tileInkFor` E9 canonical (`#1C1206`/`#F6F0E1`, 1536/3072 dark) | Unit | P0 | Single-source renderer↔module; NÃO reverter p/ hexes 2-tier da story-time |
| AC-4 | Max Dynamic Type legibility | Manual | P1 | Exceção deliberada; parte do T3.2 |

Duplicate coverage avoided: wiring `GameBoard` (font via `numeralSizeFor`, ink via `tileInkFor`) verified by inspection this run (`GameBoard.tsx:8,17-18,201,270`) — no new component test; static tripwire proposed only if churn resumes. Render Skia real → manual T3.2 only.

## Step 4: Test Generation — Complete

- **Resolved mode:** `sequential` (pure-TS unit scaffolds; API/E2E subagents N/A).
- **Scaffold:** `_bmad-output/test-artifacts/atdd-1-7-numeral-legibility.red.test.ts` — **11 tests, all `test.skip()`** (4× AC-1, 3× AC-2, 2× AC-3, 1× ink, 1× AC-4 manual).
- **RED-phase evidence (this run):** `node --test _bmad-output/test-artifacts/atdd-1-7-numeral-legibility.red.test.ts` → **11 skipped / 0 pass / 0 fail**. Scaffolds stay skipped until a developer activates the task at hand.
- **Activation guidance:** remove `test.skip` (→ `test`) for the task under verification, run `node --test <file>`, confirm RED (fail) before implementing / GREEN (pass) after. Against the current shipped tree, activated scaffolds go GREEN (proved by the committed suites: `tileNumerals.test.ts` + `layout.test.ts` → **36/36 pass** this run); a revert of `tileNumerals.ts`/`layout.ts`/wiring turns them RED.
- **Baseline verification (this run):** `triade/node_modules/.bin/tsc --noEmit -p triade/tsconfig.json` → clean (exit 0).

## Step 4C: Aggregation — Complete

| Metric | Value |
|---|---|
| TDD phase | RED (scaffolds skipped by convention) |
| Total scaffold tests | 11 (8 P0, 3 P1) |
| Fixtures / factories | 0 (pure functions; N/A) |
| Mocks | 0 (no external services) |
| data-testid | N/A (pure math + manual render gate) |
| AC coverage | AC-1, AC-2, AC-3, ink single-source automated; AC-4 manual |

## Step 5: Validate & Complete — Complete

### Implementation Checklist (working-tree scoped)

The tree has **no production diff** — every code task below is **verify-only** against the shipped state, except the human-only T3.2 session. Do NOT re-implement; do NOT touch `sprint-status.yaml`.

- [x] I-1 (verify) `triade/src/ui/tileNumerals.ts` exports `TILE_NUMERAL_TOKENS` (32/800 · 13/700 · 9/700), `MIN_TILE_WIDTH=44`, `FIT_INSET_FACTOR=0.5`, `ESTIMATED_WIDTH_FACTOR` (0.55), `numeralTokenFor`/`numeralFits`/`numeralSizeFor` (fits-gated; finite-positive guards; 9pt floor holds only when 9pt fits, else largest-fitting), E9 canonical `tileInkFor`/`tileFillFor` + shape/contrast utils — pure, no RN/Skia imports. Evidence: file read this run; `tileNumerals.test.ts` green.
- [x] I-2 (verify) `triade/src/ui/layout.ts` imports `MIN_TILE_WIDTH`, exports `BOARD_SIZE_FLOOR=216`, `layoutFor` applies the container-fit-guarded clamp — floor only raises the minimum, never grows beyond the container. Evidence: file read this run; `layout.test.ts` floor anchors green.
- [x] I-3 (verify) `triade/src/render/GameBoard.tsx` sizes fonts via `numeralSizeFor(value, cell)` (line 201) and routes `tileTextColor` through `tileInkFor` (lines 17-18, 270) — single source, no duplicated ink literal; 1.6 settle-timer/`tilesRef` invariants intact. Evidence: grep this run.
- [x] I-4 (verify) `triade/__tests__/ui/ui.purity.test.ts` scans `tileNumerals.ts` in `PURE_MODULES` (ADR-01/05). Evidence: committed suite green (part of 36/36).
- [x] I-5 (verify) `npx tsc --noEmit`-equivalent clean + committed `tileNumerals`/`layout` suites 36/36 green (this run). Full `npm test` (1454 tests) recorded green by the prior TD run; not re-run here (scoped verification only).
- [ ] I-6 (HUMAN-ONLY) **T3.2 manual simulator/device session** — rotate to landscape; confirm 32pt (1–3 digits), 13pt (4–5 digits), 9pt 6-digit (`1536`/`3072+`) legible at the smallest tile; confirm floor keeps tiles ≥ ~44pt on a typical landscape window with no clipping; confirm max-Dynamic-Type legibility (AC-4 exception); record evidence in the story completion note. Owner: Eduardo. Story stays `awaiting-operator` until recorded.
- [ ] I-7 (guard) Any future change to `ESTIMATED_WIDTH_FACTOR`, `FIT_INSET_FACTOR`, the 9pt floor, or `layoutFor` must re-run the AC-3 risk-point tests + a fresh T3.2-style render check (estimator is ~10% optimistic sub-floor by design; sub-44pt illegible-by-design per AC-3).

### Red-Green-Refactor workflow

- **RED (TEA, done):** scaffolds written as `test.skip()` + skip-run evidence above. Activation rule documented in the scaffold header.
- **GREEN (DEV):** nothing to implement — tree already green. If a scaffold is activated and goes RED, fix the regression in `tileNumerals.ts`/`layout.ts`/wiring (never weaken the test to match a regression; never restore story-time 2-tier ink hexes — E9 canonical is the source of truth).
- **REFACTOR:** extract/shared-constant hygiene only (`ESTIMATED_WIDTH_FACTOR` pattern); keep estimator documented; keep `tsc` + `node --test` green.

### Execution commands

- `node --test _bmad-output/test-artifacts/atdd-1-7-numeral-legibility.red.test.ts` — RED-phase scaffold (expect 11 skipped)
- `node --test triade/__tests__/ui/tileNumerals.test.ts triade/__tests__/ui/layout.test.ts` — contract suites (expect 36 pass)
- `./triade/node_modules/.bin/tsc --noEmit -p triade/tsconfig.json` — type gate (expect exit 0)

### Validation against checklist.md

- [x] Story ACs analyzed and mapped to levels/priorities (table above)
- [x] Red-phase scaffolds created, all `test.skip()`, none shipped as active passing tests
- [x] Activation guidance documented (scaffold header + Step 4)
- [x] Given-When-Then comments in every scaffold; atomic (one assertion focus per test)
- [x] Deterministic, isolated (pure imports, no shared state, no waits)
- [x] Frontmatter populated (`storyId`, `storyKey`, `storyFile`, `atddChecklistPath`, `generatedTestFiles`, `inputDocuments`)
- [x] Assumptions documented: estimator conservative-at-floor-by-design; sub-44pt illegible-by-design; E9 ink canonical supersedes story-time hexes; Skia render provable only via manual T3.2
- [x] Next workflow: operator T3.2 session → story close; `automate` only if new coverage gaps emerge

### Summary

- **Story:** 1.7 `1-7-legibilidade-dos-numerais-em-landscape` (`awaiting-operator`, T3.2 owed)
- **Primary level:** Unit (`node:test`) + 1 manual gate
- **Scaffolds:** 11 (8 P0, 3 P1) in `_bmad-output/test-artifacts/atdd-1-7-numeral-legibility.red.test.ts` — RED (skipped) by design
- **Implementation tasks:** 7 (5 verify-only done + 1 human-only owed + 1 ongoing guard)
- **Estimated effort remaining:** ~1–2h operator session (T3.2 + AC-4 bundled); automation ~0h (green)
- **Key risk:** R-001 — real Skia render legibility unproven until T3.2 evidence is recorded (see TD plan)
- **Outputs:** this checklist + the red scaffold, both under `_bmad-output/test-artifacts/` (TEA `test_artifacts`)
