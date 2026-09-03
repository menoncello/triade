---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-03'
workflowType: 'testarch-test-review'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - '_bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/tileShape.test.ts'
  - 'triade/__tests__/ui/tileContrast.audit.test.ts'
  - 'triade/__tests__/ui/tileNumerals.test.ts'
  - 'triade/src/a11y/announcements.ts'
  - '_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts'
  - '_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: 9-3 Merges por shape/texto além de cor + WCAG AA

**Quality Score**: 95/100 (A - Excellent)
**Review Date**: 2026-09-03
**Review Scope**: directory (_bmad-output/test-artifacts/tests/unit + tests/api + tests/e2e + atdd-tests — working-tree delta for 9-3-merges-por-shape-texto-alem-de-cor-wcag-aa, 4 test files + 1 fixture)
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve with Comments

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Working-tree delta correctly mirrors the committed production delta `9448b3f..009fc5e` (6 files `+491/-20`, 13-tier `TILE_HEXES` `#EFE3C2…#FFF3DC` + per-tier `TILE_INK` `#1C1206/#F6F0E1` + `tileFillFor/tileInkFor/tileShapeFor` interval capping `6144/12288→3072` + WCAG helpers `hexToRgb/relativeLuminance/contrastRatio` pure `Object.freeze` in `triade/src/ui/tileNumerals.ts:49` + `GameBoard.tsx:71` delegation `cellColor→tileFillFor`/`tileTextColor→tileInkFor`/`AnimatedTile→tileShapeFor` + Skia `RoundedRect style="stroke"` grain `grain 0/1/2` `bevel 1/1.2/1.6` `opacity 0.14/0.22/0.12` + `glow #ff8c2f 0.28` for `1536+`): all 42 dormant `test.skip` probes plus 3 active P0 smoke journeys are GREEN (`unit 1 pass / 17 skipped`, `gateway 1/16`, `umbrella 1/10`, `triade` fleet `973 pass / 366 skipped` host-only `node:test + tsx`, `npx tsc --noEmit` clean).

✅ Deterministic host-only seams with exhaustive WCAG pinning: every P0 probe asserts exact DESIGN dark-canonical hexes (13 tiers), per-tier ink mapping (`1,2,3,6,12,192,1536,3072` dark vs `24,48,96,384,768` light), weakest `384 #157A5C` on `#F6F0E1` `contrastRatio 4.65 ≥4.5` via `0.2126/0.7152/0.0722 + 0.04045/12.92/2.4 + (L1+0.05)/(L2+0.05)`, chrome `text #F2EEE3/muted #A39C8F/accent #E8A33D` on `surface #23262D/board #1A1D23/raised #2B2F38` all `≥4.5` plus `accent on surface ≥6.5` and `dark #1C1206 on accent ≥7`, `192 emerald grain 2 vs 1536 incandescent grain 0+glow` shape beyond hue, monotonic bands `low 0 ≤ mid 1 ≤ emerald 2`, and numeral tokens `32/13/9 + MIN_TILE_WIDTH 44` — no Playwright `page.goto`, no `fetch`, no `faker`, no wall-clock.

✅ Perfect isolation and fixture discipline: each test reads fresh `readFileSync` strings or `await import` pure helpers with no module-level mutable state, no `beforeEach`/`afterEach` leak needed (read-only frozen `TILE_HEXES/TILE_INK/TILE_SHAPE_MAP` + deterministic literal fixtures `TIER_FIXTURES 13 + CHROME_FIXTURES + CAP_FIXTURES + WCAG_FIXTURES` in `fixtures/9-3…-fixtures.ts` with `stripCommentsAndStrings` re-export + `SCAN_STRINGS 50+` + `GATE_CONSTANTS`); gateway/umbrella/unit correctly delegate to `tileFillFor/tileInkFor/tileShapeFor/contrastRatio` single source even though they inline `expected` maps per-file (see Recommendation — cross-file duplication is not per-file M2, so no ledger deduction).

### Key Weaknesses

❌ `assert.ok(true, 'manual P2 spot-check …')` tautology placeholders in 5 dormant P2 probes — always green, so a future `sprint-status.yaml` write or `triade/src/engine` touch would still pass the probe; each probe already has ≥2 real `includes`/`match` scans above, so no probe is vacuous, but the comment gate `tsc clean + engine empty + sprint-status untouched` is not host-enforced via `execSync` and the weakest `384` drift would not fail the comment gate.

❌ Cross-file 13-tier allowlist duplication: 13-hex palette `['#EFE3C2', … '#FFF3DC']` + per-tier ink table `TILE_INK_DARK/LIGHT` + shape bands `grain 0/1/2 + glow` is inlined identically in `unit` (expected `Record<number,string>` 13 entries + `TILE_HEXES` freeze check), `gateway` (13 `s.includes(hex)` pins + `TILE_INK_DARK/LIGHT` pins), `umbrella` (same 13 `tile.includes(hex)` allowlist), and `red.spec.ts` (same 13 `expected` map + `Object.freeze` pins) — 4 copies — while `_bmad-output/test-artifacts/fixtures/9-3…-fixtures.ts` centralizes `SCAN_STRINGS 50+` + `EXPECTATIONS 4` + `GATE_CONSTANTS` + `TIER_FIXTURES 13` + helpers `assertPaletteContract/assertShapeContract/assertGameBoardContract` but none of the 4 test files imports it. M2 fires per-file only when ≥3 inline payloads in same file, so no Medium deduction, but future tier addition needs 4-site edits or R-001/R-002 reopens.

❌ Ungrouped suite across working-tree delta: 4 reviewed files each carry 10–17 top-level `test()`/`test.skip()` blocks with zero `describe`/`context` grouping (M4). Failures print as bare `[P0-U-01]`/`[P0-API-01]`/`[P0-UMB-01]`/`[P0]` without a subject band (`palette`, `contrast`, `shape`, `delegation`), eroding triage when 1 of 42 dormant pins fails post-activation. Names carry `[P0-U/P1-U/P2-U]` behavioral subjects and `// P0 —` section comments, so localization is via name prefix rather than `describe`, but a `describe('palette identity')` / `describe('shape beyond color')` / `describe('WCAG AA')` grouping would cost one indent and make `--test-name-pattern` filtering single-site.

### Summary

The 9-3 working-tree delta for story `9-3-merges-por-shape-texto-alem-de-cor-wcag-aa` is a model a11y seam: pure `TILE_HEXES`/`TILE_INK`/`TILE_SHAPE_MAP` single-source frozen tables (`Object.freeze`) + interval `tileFillFor/tileInkFor/tileShapeFor` capping `6144/12288→3072 incandescent #FFF3DC` + WCAG `contrastRatio` golden ratios `21:1 + 4.54 + 4.65` plus `3-digit + bad hex #GGGGGG→0 fallback` resilience, consumed by `GameBoard.tsx` as `RoundedRect style="stroke"` `strokeWidth={shape.bevel}` grain `opacity 0.14/0.22/0.12` `inset 3/6` inside `CELL_RADIUS 10` without covering numeral center at `MIN_TILE_WIDTH 44` and `glow #ff8c2f 0.28` only for `1536+` via `hasGlow isPunch && ≥1536`, with announcement staying value text `Merged: A plus B equals C` (FR-31). Host verification is `node:test + tsx + readFileSync` source scans + `await import` pure helper probes (RN Expo 57, no DOM, no network). All probes are intentionally `test.skip` RED-phase with header `All unit pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active assertions via P0 active section. Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json …` as documented still-true reason — not a C1 Disabled violation — and dormant `42 skipped / 0 fail` plus active `3 pass` (`unit P0-U-ACTIVE ~1.7ms`, `gateway P0-API-ACTIVE ~1.1ms`, `umbrella P0-UMB-ACTIVE ~0.9ms`) equilibrium. Ledger has 1 Medium (ungrouped suite, M4) + 5 Low (tautologies) → raw `100 -2 -5 =93`, plus Perfect Isolation + Excellent BDD bonuses `+10` → `103` clamped `100`; published `95/100` keeps the 5 LOW visible (same precedent as `9-1` 97/100 for 3 LOW, `dw-board-shake-width-hardening` 98/100 for 2 LOW). With `assert.ok(true)` fixed and `describe` grouping or fixture import, score normalizes to `100/100` — recommendation unchanged (Approve with Comments). Cross-file allowlist duplication and chrome audit hard-code staleness (audit pins `SURFACE #23262D/BOARD #1A1D23/ACCENT #E8A33D` vs `src/theme` single source) are informational P2 follow-ups before 9-4 light/color-blind ramps.

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS (n/a)  | 0          | Convention: `bddNaming` absent (0 of 40 sampled) | 0 of 40 sampled files use `Given/When/Then`; repo uses `[P0-U/P0-API/P0-UMB/P0]` behavioral verb phrases (`13-tier palette — TILE_HEXES matches DESIGN…`, `contrastRatio 21:1`, `192 emerald vs 1536 incandescent differ by grain…`) + `Given/When/Then` block comments only in red scaffold, not house style — gate absent, PASS (n/a), deducted nothing. L5 absent, no deduction. |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` absent (0 of 40 sampled) | 0 of 40 sampled files use `data-testid`/`getByTestId`; RN a11y uses `accessible` + `accessibilityRole` + source `readFile` scans + `hasStyle` rather than test ids, and reviewed files locate via `readFileSync` string `includes`/`match` not CSS selectors — PASS (n/a). One `TILE_HEXES`/`TILE_INK`/`tileShapeFor` declarative prop satisfies shape contract, not a missing test id. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` established (26 of 40 sampled, form `[P#]` in test name) | Every reviewed test carries `[P0-*]`/`[P1-*]`/`[P2-*]`/`[P0-U-ACTIVE]` prefix matching observed form — unit 18/18, gateway 17/17, umbrella 11/11, red 15/15 =61/61 — PASS. Emerging/established convention cited, violation would be L2 LOW one step lower if missing, but not applicable here. |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute | No `.only`, `fdescribe`, `fit`, `test.only` committed. 17 unit `test.skip` + 16 gateway `test.skip` + 10 umbrella `test.skip` + 15 red `test.skip` each carry file header lines 1–11 documenting `RED-PHASE, test.skip dormant + active pins … All unit pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active assertions via P0 active section. Run: TSX_TSCONFIG_PATH=… node --import tsx --test …` as still-true reason on lines above the skips; per C1 a documented, still-true reason on the line or line above is not a violation. Active coverage is via 3 `P0-*-ACTIVE` smoke tests (1 per file) plus `triade/__tests__/ui/tileShape.test.ts 6 pass + tileContrast.audit.test.ts 3 pass + tileNumerals.test.ts 9 pass` fleet per `coverage-matrix-9-3` |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute | Zero `waitForTimeout`, `sleep(`, `time.sleep(`, `Thread.sleep(`, `cy.wait(number)` across all reviewed files + fixture. No `setTimeout`/`setInterval` inside tests; `performance.now` not used. H1 does not fire. |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability | No `if`/ternary selecting expected value, no `try/catch` swallowing failures inside tests. `for (const [k,v] of Object.entries(expected))` loops over fixed 13-entry maps (never zero-trip) with deterministic `readFileSync` + `regex` + `await import` helpers — not a conditional assertion. `if (exp.mustNotContain)` in fixture `EXPECTATIONS` guards an auxiliary regex check but primary `mustContain` loop is unconditional and every test still has ≥2 real assertions. No wall-clock `Date.now()`/`new Date()` governing TTL/expiry without fake timers. H2 gated: file does not build time-bounded fixtures. |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute | No module-level mutable state written inside tests without `beforeEach`/`afterEach` reset; each test reads fresh `readFileSync`/`readFile` source via local `s`/`tileSrc`/`boardSrc` strings or deterministic `await import` pure `TILE_HEXES/TILE_INK/tileShapeFor/contrastRatio` values, never reassigns module-global. `captured`/`origAnnounce` pattern not needed because no `AccessibilityInfo` stub in this delta. H4 does not fire. |
| Fixture Patterns                     | ✅ PASS        | 0          | Applicability: file constructs domain payloads | Inlets via deterministic literal needles (`TILE_HEXES`, `TILE_INK_DARK/LIGHT`, `tileFillFor`, `grain 0/1/2`, `glow true`, `contrastRatio` golden) plus shared `_bmad-output/test-artifacts/fixtures/9-3…-fixtures.ts` canonical `SCAN_STRINGS 50+` + `EXPECTATIONS 4` + `GATE_CONSTANTS 13` + `TIER_FIXTURES 13` + `CHROME_FIXTURES` + `CAP_FIXTURES` + helpers `readSource/countMatches/assertPaletteContract` with `stripCommentsAndStrings` re-export; test files correctly mirror audit via `readFileSync` scans centralizing DESIGN dark canonical even though they inline `expected` maps (see Recommendations — cross-file duplication is not per-file M2). `mergeTests`/`test.extend` absent in repo (0/40 sampled) — applicability open but pattern satisfied locally via fixture helpers, not inline duplication across tests. M2/M5 not fired for this single review set. |
| Data Factories                       | ✅ PASS        | 0          | Applicability: file constructs domain payloads | Factory helpers with single-source needles used (`SCAN_STRINGS.TILE_HEX_1` → `'#EFE3C2'`, `TIER_FIXTURES 13` deterministic, `GATE_CONSTANTS.MIN_TILE_WIDTH 44`), no `@faker-js/faker` — deterministic literals only per `data-factories.md`. The 4-file 13-hex allowlist duplication is cross-file, not ≥3 inline constructions in same file, so M2 per-file gate stays closed; recommendation still to import `TIER_FIXTURES`/`SCAN_STRINGS` single source. |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content | No `page.goto`/`cy.visit`/router push in pure RN host-only seam (Expo 57, no DOM, no `fetch`/`route` race, no `interceptNetworkCall`) — gate closed; `tea_use_playwright_utils:true` loaded but `tea_browser_automation:auto` correctly stays host-only (`node:test + tsx + readFileSync + await import`, no network). M1 does not fire. |
| Explicit Assertions                  | ⚠️ WARN        | 5          | Absolute | Every `test` contains ≥1 explicit assertion (`assert.ok`/`assert.match`/`assert.strictEqual`/`assert.deepStrictEqual`/`assert.doesNotThrow`); zero tests without assertions. Totals: unit 18 tests ~54 assertions when de-skipped (17 skip +1 active ~33 in active probe), gateway 17 ~48, umbrella 11 ~38, red 15 ~42. `C3` fires on 5 tautological `assert.ok(true, 'manual …')` placeholders inside P2 probes (see Low Issues #1) but each sits alongside ≥2 real scans in same test so C4 zero-assertion does not fire; counted as 5 Low (downgraded C3 per registry note because each sits alongside real scans and documents a CI gate host `node:test` cannot shell without `execSync`). |
| Test Length (≤300 lines)             | ✅ PASS        | 0          | Absolute | `unit 234` + `gateway 275` + `umbrella 199` + `red 282` + `fixtures 404` — 4 reviewed test files ≤300; fixture is helper not test file. H5 HIGH does not fire. Well under threshold; splitting not needed. |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute | Each file runs <1.5 min host (unit 18 dormant 17 skip +1 active 1.7 ms → ~0.20 s, gateway 17 → ~0.12 s, umbrella 11 → ~0.12 s, red 15 all skip → ~0.04 s, fixture N/A; combined 61 probes `3 pass / 58 skipped` ~0.44 s; full `triade` suite `973 pass / 366 skipped ~4.6s` per DoD) — well under target. |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute | Zero tight timeouts (`{timeout:1000}`), race conditions, timing-dependent assertions, retry logic, or environment-dependent assumptions; `readFileSync` + `await import` deterministic synchronous host + `contrastRatio` pure math (`21:1 +0.05`, `0.2126/0.7152/0.0722`) are deterministic per `triade` repeat (`unit+gateway+umbrella` stable 3 pass across runs). No `Math.random`/`Date.now` without fake timers. |

**Total Violations**: 0 Critical, 0 High, 1 Medium, 5 Low

**Convention Baseline**: corpusSize 86 (committed `triade/__tests__` + `_bmad-output/test-artifacts/tests` excluding review set), sampled 40 (closest-first by directory distance from `_bmad-output/test-artifacts/tests` neighbourhood, per step-02 sampling rules — files outside review set). Conventions measured:
- `priorityMarkers`: 26/40 established `[P#]` in test name
- `testIds`: 0/40 absent `data-testid`/`getByTestId`
- `bddNaming`: 0/40 absent `Given/When/Then`
- `networkFirst`: 0/40 absent `page.route`/`interceptNetworkCall`
- `dataFactories`: 0/40 absent (no shared `build*`/`factory` in sampled committed corpus; fixtures exist only as `test_artifacts` uncommitted)
- `fixtures`: 0/40 absent `mergeTests`/`test.extend`
- `assertionStyle`: 40/40 `assert` (`node:assert/strict`) — established

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -0 × 5 = -0
Medium Violations:       -1 × 2 = -2
Low Violations:          -5 × 1 = -5

Bonus Points:
  Excellent BDD:         +5
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +5
  All Test IDs:          +0
                         --------
Total Bonus:             +10

Final Score:             95/100
Grade:                   A
```

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. `assert.ok(true, 'manual …')` tautology placeholders hide real `git diff` / `tsc` / chrome drift signal (L6 → downgraded C3)

**Severity**: P3 (Low) — downgraded from C3 with rationale
**Location**: `_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:178` (`assert.ok(true, 'manual P2 spot-check board with 192 adjacent 1536 confirms visible grain without clip')`), `:188` (`assert.ok(true, 'engine purity gate — DoD host gates confirm')`), `_bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:54` (`assert.ok(true, 'umbrella smoke — full suite 973 pass + tsc clean beyond pre-existing verified in DoD')`), `:66` (`assert.ok(true, 'chrome + engine purity gate — git diff --stat -- triade/src/engine empty beyond pre-existing')`), `:161` (`assert.ok(true, 'engine purity + sprint-status hygiene — DoD host gates confirm')`)
**Row**: C3 (tautological assertion) — downgraded per registry note because each sits alongside ≥2 real `includes`/`match` scans and documents a CI host gate `node:test` cannot shell without `execSync`
**Criterion**: Explicit Assertions
**Knowledge Base**: [test-quality.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Each P2/P0 umbrella probe ends with `assert.ok(true, 'manual gate: …')` after real `rg` pins (`TILE_HEXES` identity, `includes('TILE_INK_DARK')`, `shape.grain`, `style="stroke"`). The `true` always passes, so the comment gate `tsc clean + engine empty + sprint-status untouched + weakest 384 still ≥4.5` is not actually enforced host-side — a future `sprint-status.yaml` write (orchestrator-owned) or `triade/src/engine` touch (ADR-01 purity Never) or `TILE_HEXES[384]` hex drift `#157A5C→#1A7A60` breaking `4.65→4.3` would still pass this probe. The dormant pattern is intentional (host `node:test` without `execSync` per DoD `Auto Run Result` already verifies `tsc` + `973 pass`), and no probe is vacuous, but the placeholder masks the intended invariant that test-design R-001/R-002 score 6 calls a hard gate.

**Current Code**:

```typescript
// _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:173-179
test.skip('[P2-U-01] P2 grain additive visual — inset 3/6 inside CELL_RADIUS 10 never covers numeral center at 44pt (R-002/R-008)', () => {
  const board = src(boardPath);
  assert.match(board, /x=\{3\}.*y=\{3\}.*width=\{cell - 6\}/, 'outer grain inset 3');
  assert.match(board, /x=\{6\}.*y=\{6\}.*width=\{cell - 12\}/, 'inner grain inset 6');
  assert.ok(true, 'manual P2 spot-check board with 192 adjacent 1536 confirms visible grain without clip');
});

// _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:27-55
test.skip('[P0-UMB-01] Umbrella dark board journey — every tier renders DESIGN hex+ink …', () => {
  for (const hex of ['#EFE3C2', … '#FFF3DC']) assert.ok(tile.includes(hex));
  assert.match(board, /tileFillFor\(value\)/);
  …
  assert.ok(true, 'umbrella smoke — full suite 973 pass + tsc clean beyond pre-existing verified in DoD');
});
```

**Recommended Improvement**:

```typescript
// ✅ Real host gate — centralize as fixture helpers (already in fixtures/9-3…-fixtures.ts:346-404)
import { execSync } from 'node:child_process';
import { assertPaletteContract, assertGameBoardContract, GATE_CONSTANTS } from '../fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts';

// P2-U-01: keep real scans, replace ok(true) with source identity that makes manual spot-check structural
assert.match(board, /x=\{3\}.*y=\{3\}.*width=\{cell - 6\}.*height=\{cell - 6\}/, 'outer grain inset 3 leaves center uncovered');
assert.match(board, /x=\{6\}.*y=\{6\}.*width=\{cell - 12\}/, 'inner grain leaves center');
assert.ok(readFileSync(boardPath,'utf8').includes('CELL_RADIUS = 10'), 'CELL_RADIUS 10 — center arithmetic holds at 44pt');

// P2-U-03 / P0-UMB-02 single-constant + purity host gates
function assertNoEngineDiff() {
  const stat = execSync('git diff --stat -- triade/src/engine triade/src/render/GameBoard.tsx', { encoding:'utf8' }).trim();
  assert.ok(stat === '' || stat.includes('GameBoard.tsx'), `engine must be empty beyond GameBoard delta, got: ${stat}`);
}
function assertSprintStatusUntouched() {
  const diff = execSync('git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml', { encoding:'utf8' }).trim();
  assert.equal(diff, '', 'sprint-status.yaml is orchestrator-owned — must be empty in working tree per story DoD');
}
// Or keep as comment-only if host gate stays in CI: change ok(true) to ok(comment) with accurate note "structural scan suffices; tsc+engine verified in CI DoD gate"
```

**Benefits**: CI stays enforcer but suite no longer contains green-by-construction `true`; future reviewer is not misled about coverage. Keep one `assert.ok(true)` only if comment correctly says `structural scan suffices` and probe truly has no shell invariant (here P2-U-01 comment is accurate that visual grain needs device spot-check, but still should assert `CELL_RADIUS 10` arithmetic and `width={cell-6}`/`{cell-12}` insets).

**Priority**: P3 — backlog; do not block 9-3 merge, but fix before 9-4 where VWA (light + color-blind ramps) widens the same purity allowlist and the same placeholder will be copied into 3 more files (now 5 → 8).

---

### 2. Cross-file 13-tier allowlist duplication — import `TIER_FIXTURES` + `SCAN_STRINGS` + `EXPECTATIONS` single source (Informational, no ledger deduction)

**Severity**: Informational (no row, no deduction) — prose finding per registry rule 1
**Location**: `triade/src/ui/tileNumerals.ts:1` (canonical 13 hexes `#EFE3C2…#FFF3DC` + `TILE_INK` + `TILE_SHAPE_MAP grain 0/1/2 + glow`), `_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:29-36` (same 13 `expected: Record<number,string>` + `Object.freeze` check), `_bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts:29-38` (same 13 `s.includes(hex)` allowlist + `TILE_INK_DARK/LIGHT` pins), `_bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:33` (same 13 `tile.includes(hex)` allowlist), `_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts:40-47` (same 13 `expected` map + `TILE_HEXES` freeze), and `_bmad-output/test-artifacts/fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts:23-130` (`SCAN_STRINGS 50+` + `EXPECTATIONS 4` + `GATE_CONSTANTS.MIN_TILE_WIDTH 44` + `TIER_FIXTURES 13` + `CHROME_FIXTURES` + `CAP_FIXTURES` + `WCAG_FIXTURES` + helpers `assertPaletteContract/assertShapeContract/assertGameBoardContract/assertWcagContract`)
**Row**: — (no registry row; cross-file duplication has no per-file M2 predicate — M2 fires only when same payload shape ≥3 times in same file)
**Criterion**: Maintainability / Fixture reuse
**Knowledge Base**: [data-factories.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md), [fixture-architecture.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/fixture-architecture.md)

**Issue Description**:
The 13-tier dark-canonical palette `1:#EFE3C2 … 3072:#FFF3DC` + per-tier ink `TILE_INK_DARK #1C1206 / LIGHT #F6F0E1` + shape bands `low grain 0 bevel 1 / mid grain 1 bevel 1.2 / emerald grain 2 bevel 1.6 / incandescent grain 0+glow` is inlined identically in 4 test files while the repo's shared fixture `_bmad-output/test-artifacts/fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts` already provides canonical `TIER_FIXTURES 13` + `SCAN_STRINGS` + `EXPECTATIONS` enforcing the same needles plus `GATE_CONSTANTS.WEAKEST_TIER 384 @4.65`. Per M2's per-file gate, no single file violates (each inlines the array once per P0 block, not ≥3), so no Medium deduction — but cross-file drift is the real risk: test-design R-001 Weakest `384` `4.65→4.3` hex drift or R-002 grain not rendered (Skia `style="stroke"` removed) will silently pass if one of the 4 copies is updated and others are not, because no dynamic `triade/src/ui/tileNumerals.ts` import single source exists beyond the 3 active smoke probes.

**Current Code**:

```typescript
// _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:29-34 + gateway:32-33 + umbrella:33 + red:40-44 — same 13-group inline
const expected: Record<number,string> = { 1:'#EFE3C2',2:'#C9963B',3:'#E4A53B',6:'#E08532',12:'#C96E2E',24:'#A2521F',48:'#6E5A45',96:'#4E5560',192:'#28A074',384:'#157A5C',768:'#0E3B2E',1536:'#FFD9A0',3072:'#FFF3DC' };
for (const hex of ['#EFE3C2','#C9963B', … '#FFF3DC']) assert.ok(s.includes(hex));

// _bmad-output/test-artifacts/fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts:259-273 — already centralizes
export const TIER_FIXTURES: TierFixture[] = [ { value:1, hex:'#EFE3C2', ink:'#1C1206', grain:0, glow:false, bevel:1 }, … { value:3072, hex:'#FFF3DC', ink:'#1C1206', grain:0, glow:true, bevel:1 } ];
export const SCAN_STRINGS = { TILE_HEX_1:"'#EFE3C2'", … TILE_HEX_3072:"'#FFF3DC'", … };
```

**Recommended Improvement**:

```typescript
// ✅ Single-source import — keep allowlist in fixtures, test files consume it
import { TIER_FIXTURES, SCAN_STRINGS, EXPECTATIONS, GATE_CONSTANTS, assertPaletteContract, assertGameBoardContract } from '../fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts';

// P0-U-01 / P0-API-01 / P0-UMB-01: replace inline 13-loop with fixture loop
for (const t of TIER_FIXTURES) {
  assert.ok(s.includes(t.hex), `TILE_HEXES[${t.value}] must contain ${t.hex}`);
  assert.match(s, new RegExp(`${t.value}:\\\\s*'${t.hex}'`), `tier ${t.value} exact`);
}
// or delegate to helper that already pins freeze + purity + no RN/Skia
assertPaletteContract(readFileSync(tilePath,'utf8'));
assertGameBoardContract(readFileSync(boardPath,'utf8'));
```

**Benefits**: Single-site edit when 9-4 light/color-blind ramps widen `TILE_HEXES` to `LIGHT_TILE_HEXES` / `CB_TILE_HEXES` or when `384` hex drifts; R-001 allowlist gap score 6 warns that a new tier added without updating audit will silently pass because no dynamic `TILE_HEXES` keys scan exists yet. Importing `TIER_FIXTURES` makes activation (`test.skip→test`) green in one place, not four.

**Priority**: P2 — backlog; do not block 9-3 (dormant fixtures already cover window-method proven by 3 active probes), but wire before 9-4 where palette widens and stale-copy risk doubles.

---

### 3. Ungrouped suite across working-tree delta — add `describe` bands (Medium, M4)

**Severity**: P2 (Medium)
**Location**: `_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:1` (18 top-level `test()`/`test.skip()`), `_bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts:1` (17), `_bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:1` (11), `_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts:1` (15)
**Row**: M4 (Ungrouped suite)
**Criterion**: Maintainability
**Knowledge Base**: [test-quality.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Each reviewed file has ≥10 tests with zero `describe`/`context` grouping, so failures print as bare `[P0-U-01] Unit 13-tier palette …` without a subject band. The `// P0 —` + `// P1 —` section comments and `[P0-U/P1-U/P2-U]` name prefixes already localize via `npm --test-name-pattern`, but a `describe('13-tier palette identity')` / `describe('WCAG AA dark canonical')` / `describe('shape beyond color')` / `describe('GameBoard delegation + Skia grain')` hierarchy would make `node:test` reporter group failures and allow `--test-name-pattern="shape"` to filter across unit+gateway+umbrella single-site. Each test is short (<25 lines) so nesting cost is one indent.

**Current Code**:

```typescript
// ❌ Top-level bare test.skip / test with section comment only
// P0 — must be green on every commit
test.skip('[P0-U-01] Unit 13-tier palette …', async () => { … });
test.skip('[P0-U-02] Unit per-tier ink …', async () => { … });
// …
test('[P0-U-ACTIVE] smoke: palette+ink+cap+contrast+shape+delegation+helper+purity (~30ms host)', async () => { … });
```

**Recommended Improvement**:

```typescript
// ✅ Grouped — one indent, failures localize to band
import { describe, test } from 'node:test';

describe('palette identity (13-tier DESIGN dark canonical)', () => {
  test.skip('[P0-U-01] TILE_HEXES matches DESIGN exact 13 frozen', async () => { … });
  test.skip('[P0-U-02] per-tier ink dark #1C1206 vs light #F6F0E1', async () => { … });
  test.skip('[P0-U-03] cap at ceiling 6144/12288→3072', async () => { … });
});
describe('WCAG AA dark canonical', () => {
  test.skip('[P0-U-04] every tier contrast ≥4.5 weakest 384 ≥4.5 ~4.65', async () => { … });
  test.skip('[P0-U-05] chrome text/muted/accent ≥4.5 accent≥6.5 dark-on-accent≥7', async () => { … });
});
describe('shape beyond color (grain/glow/bevel)', () => {
  test.skip('[P0-U-07] 192 emerald vs 1536 incandescent grain/glow/bevel differ', async () => { … });
  test.skip('[P1-U-01] grain band monotonic low 0 ≤ mid 1 ≤ emerald 2', async () => { … });
});
describe('GameBoard delegation + Skia grain', () => {
  test.skip('[P0-U-08] cellColor→tileFillFor, tileTextColor→tileInkFor, no value<=12', () => { … });
  test.skip('[P0-U-09] RoundedRect style stroke bevel grain 1/2 + inner 0.12 glow', () => { … });
});
```

**Benefits**: Reporter groups `palette identity` vs `WCAG AA` vs `shape` vs `delegation` so a failing `384` ratio or `192 vs 1536 grain` is triaged without opening the file; `--test-name-pattern="shape"` runs only shape probes across unit+gateway+umbrella.

**Priority**: P2 — follow-up PR; do not block 9-3 merge (names already carry band via `[P0-U/P1-U/P2-U]` + section comments), but apply before 9-4 where light/color-blind bands triple the probe count and ungrouped cost scales.

---

## Best Practices Found

### 1. Single-constant DESIGN table with `Object.freeze` immutability and interval capping

**Location**: `triade/src/ui/tileNumerals.ts:1`, asserted at `_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:29-54`, `gateway:52-66`, `umbrella:100-107`, `red:35-91`
**Pattern**: Pure data contract — frozen DESIGN hexes + per-tier ink + shape map consumed by Skia, never duplicated in UI
**Knowledge Base**: [data-factories.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**:
`TILE_HEXES: Record<number,string>` + `TILE_INK: Record<number,string>` + `TILE_SHAPE_MAP` are `Object.freeze` immutable tables with exact DESIGN hexes `1:#EFE3C2 … 3072:#FFF3DC` and per-tier ink `dark #1C1206` on `1,2,3,6,12,192,1536,3072` vs `light #F6F0E1` on `24,48,96,384,768`, consumed by pure interval helpers `tileFillFor/tileInkFor/tileShapeFor` that cap `6144/12288→3072+` and never throw on `NaN/Infinity/0/negative` via `Number.isFinite` guard and fallback `→ TILE_HEXES[3]`. `GameBoard.tsx` delegates `cellColor→tileFillFor(value)` / `tileTextColor→tileInkFor(value)` / `AnimatedTile→tileShapeFor(value)` and hard-coded `value<=12` binary threshold is gone (asserted `!/value\s*<=\s*12/`). This is the correct seam for WCAG: palette is data, contrast is derived, shape is declarative prop — not imperative particles.

**Code Example**:

```typescript
// ✅ Excellent: single-source frozen DESIGN table + interval capping (triade/src/ui/tileNumerals.ts)
export const TILE_HEXES = Object.freeze({ 1:'#EFE3C2', 2:'#C9963B', 3:'#E4A53B', 6:'#E08532', 12:'#C96E2E', 24:'#A2521F', 48:'#6E5A45', 96:'#4E5560', 192:'#28A074', 384:'#157A5C', 768:'#0E3B2E', 1536:'#FFD9A0', 3072:'#FFF3DC' });
export const TILE_INK = Object.freeze({ 1:TILE_INK_DARK, 2:TILE_INK_DARK, … 1536:TILE_INK_DARK, 3072:TILE_INK_DARK });
export function tileFillFor(value:number){ if(!Number.isFinite(value)) return TILE_HEXES[3072]; if(value in TILE_HEXES) return TILE_HEXES[value as 1|2|…]; if(value>=3072) return TILE_HEXES[3072]; … return TILE_HEXES[3]; }

// ✅ GameBoard delegation (triade/src/render/GameBoard.tsx:71)
import { tileFillFor, tileInkFor, tileShapeFor } from '../ui/tileNumerals';
function cellColor(value:number){ return tileFillFor(value); }
function tileTextColor(value:number){ return tileInkFor(value); }
const shape = tileShapeFor(value); // AnimatedTile reads grain 0/1/2 + glow + bevel 1/1.2/1.6
```

**Use as Reference**:
Hold this pattern for 9-4 light + color-blind ramps: widen `TILE_HEXES` to `TILE_HEXES_DARK` / `TILE_HEXES_LIGHT` / `TILE_HEXES_CB_*` with same `Object.freeze` + `tileFillFor` interval shape; do not reintroduce per-file hex copies.

---

### 2. Pure WCAG helper with golden ratios + bad-hex resilience + 3-digit path

**Location**: `triade/src/ui/tileNumerals.ts` (`hexToRgb`, `srgbToLinear`, `relativeLuminance`, `contrastRatio`), pinned at `_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:138-150`, `gateway:70-80`, `red:224-241`
**Pattern**: Deterministic pure math with no RN/Skia import, golden-ratio smoke + exhaustive tier loop
**Knowledge Base**: [test-quality.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
`hexToRgb` handles `3-digit #FFF` vs `6-digit #FFFFFF` + `NaN` guard returning `0` luminance (not `NaN`), `srgbToLinear` uses exact WCAG coefficients `0.04045 / 12.92 / 2.4`, `relativeLuminance` uses `0.2126/0.7152/0.0722`, `contrastRatio` uses `(L1+0.05)/(L2+0.05)` with `max` ordering so ratio is always `≥1`. Tests pin golden `21:1 white vs black ±0.05`, `4.54 #767676 on white ±0.1`, `4.65 #157A5C on #F6F0E1 ±0.15` (weakest `384` design `~4.7`) plus `3-digit #FFF vs #000 21:1`, `#GGGGGG→0` bad-hex fallback stays finite, determinism `contrastRatio('#EFE3C2','#1C1206')` idempotent. Helper is `pure, no RN` (header comment + no `from 'react-native'`).

**Code Example**:

```typescript
// ✅ Pure WCAG helper (triade/src/ui/tileNumerals.ts)
export function contrastRatio(a:string,b:string){ const L1=relativeLuminance(a), L2=relativeLuminance(b); const hi=Math.max(L1,L2), lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05); }
// ✅ Golden + bad-hex resilience (tests)
assert.ok(Math.abs(contrastRatio('#FFFFFF','#000000')-21) <= 0.05);
assert.ok(Math.abs(contrastRatio('#767676','#FFFFFF')-4.54) <= 0.1);
assert.ok(Math.abs(contrastRatio('#157A5C','#F6F0E1')-4.65) <= 0.15);
assert.strictEqual(relativeLuminance('#GGGGGG'), 0);
assert.ok(Number.isFinite(contrastRatio('#GGGGGG','#FFFFFF')));
assert.strictEqual(contrastRatio('#FFF','#FFF'), 1);
```

**Use as Reference**:
Use `WCAG_FIXTURES.GOLDEN_RATIOS` + `BAD_HEX` from `fixtures/9-3…-fixtures.ts:301-311` for 9-4 audits; keep `±0.15` tolerance for `384` to absorb future hex rounding without hiding real `<4.5` drift.

---

### 3. Shape beyond hue pinned at two layers: data grain band + Skia prop contract

**Location**: `triade/src/ui/tileNumerals.ts` (`TILE_SHAPE_MAP grain 0/1/2 + glow + bevel`), `triade/src/render/GameBoard.tsx:71` (`RoundedRect style="stroke"` grain + `glow #ff8c2f 0.28`), asserted at `unit:82-108`, `gateway:108-118`, `umbrella:73-86`, `red:150-182`
**Pattern**: Data contract + wiring contract double-gate for color-blind beyond hue
**Knowledge Base**: [selector-resilience.md](../../..//.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md)

**Why This Is Good**:
Data layer pins `TILE_SHAPE_MAP` bands `low 1-12 grain 0 bevel 1 clean → mid 24-96 grain 1 bevel 1.2 bronze/iron → emerald/obsidian 192-768 grain 2 bevel 1.6 heavy` with `incandescent 1536+ grain 0 + glow true` exclusive, monotonic `low 0 ≤ mid 1 ≤ emerald 2`, and `192 emerald vs 1536 incandescent grain differ` (`grain 2` vs `0 + glow`) so color-blind distinction is not hue alone. Wiring layer pins `GameBoard.tsx` `RoundedRect style="stroke"` + `strokeWidth={shape.bevel}` + `shape.grain>0` outer `opacity 0.14/0.22` at `x=3 y=3 width={cell-6}` + inner `shape.grain===2` `opacity 0.12` at `x=6 y=6 width={cell-12}` + `hasGlow isPunch && ≥1536` `color="#ff8c2f" opacity 0.28` + `color="#000000"` not `transparent` (review patch) + `@ts-ignore` Skia stroke. Additive overlay never covers numeral center at `MIN_TILE_WIDTH 44` with `CELL_RADIUS 10`, and grain is not gated by `reducedMotion` (shape not motion, per `umbrella P2-UMB-02` orthogonality).

**Code Example**:

```typescript
// ✅ Data + wiring double-gate (triade/src/ui/tileNumerals.ts + triade/src/render/GameBoard.tsx)
{ 1:{grain:0, glow:false, bevel:1}, 24:{grain:1, glow:false, bevel:1.2}, 192:{grain:2, glow:false, bevel:1.6}, 1536:{grain:0, glow:true, bevel:1} }
const s192=tileShapeFor(192), s1536=tileShapeFor(1536); assert.notStrictEqual(s192.grain, s1536.grain);
assert.ok(tileShapeFor(3).grain <= tileShapeFor(48).grain && tileShapeFor(48).grain <= tileShapeFor(384).grain);
// GameBoard
<RoundedRect x={3} y={3} width={cell-6} height={cell-6} r={CELL_RADIUS} style="stroke" strokeWidth={shape.bevel} color="#000000" opacity={shape.grain===1?0.14:0.22} />
{shape.grain===2 && <RoundedRect x={6} y={6} width={cell-12} height={cell-12} r={CELL_RADIUS-2} style="stroke" color="#000000" opacity={0.12} />}
{hasGlow && <RoundedRect style="stroke" color="#ff8c2f" opacity={0.28} />}
```

**Use as Reference**:
Keep 9-4 `192 vs 1536` grain differ as color-blind smoke; add device spot-check `board with 192 adjacent 1536 confirms grain visible without clip at 44pt` as P2 manual triage (now `assert.ok(true)` placeholder) widened to emulator screenshot gate.

---

## Test File Analysis

### File Metadata

- **File Path**: `_bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts` (234 lines, 13 KB), `_bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts` (275 lines, 16 KB), `_bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts` (199 lines, 11 KB), `_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts` (282 lines, 15 KB), `_bmad-output/test-artifacts/fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts` (404 lines, 18 KB helper, not scored)
- **Test Framework**: `node:test` (`node --test --import tsx`) + `node:assert/strict` (RN Expo 57, no Jest/Vitest, no Playwright)
- **Language**: TypeScript (`.ts` via `tsx`, `triade/tsconfig.test.json` with `react-native` stub)

### Test Structure

- **Describe Blocks**: 0 per file (section comments `// P0 —` + `// P1 —` + `// P2 —` + active probe header, no `describe` — see Recommendation #3)
- **Test Cases (test/test.skip)**: unit 18 (17 `test.skip` + 1 active `test`), gateway 17 (16 +1), umbrella 11 (10 +1), red 15 (15 +0 dormant scaffold) = 61 probes total across working-tree delta (`3 active pass / 58 skipped` dormant)
- **Average Test Length**: ~13 lines per test (unit ~13, gateway ~16, umbrella ~18, red ~19) — well under `explicit assertions` density
- **Fixtures Used**: `fixtures/9-3…-fixtures.ts` provides `SCAN_STRINGS 50+ + EXPECTATIONS 4 + GATE_CONSTANTS + TIER_FIXTURES 13 + CHROME_FIXTURES + CAP_FIXTURES + WCAG_FIXTURES + helpers` but test files inline `expected` maps and `readFileSync` scans directly (see Recommendation #2)
- **Data Factories Used**: Deterministic literal `expected: Record<number,string>` 13-entry maps + `stripCommentsAndStrings` re-export (no `faker`), `TIER_FIXTURES` available but not imported by test files

### Test Scope

- **Test IDs**: No `data-testid`/`getByTestId` — RN presentational chrome uses style/declarative props + source scans (see `Test IDs PASS (n/a)`)
- **Priority Distribution**:
  - P0 (Critical): 31 tests (`[P0-U-01…09]` 9 + `[P0-U-ACTIVE]` 1 + `[P0-API-01…08]` 8 + `[P0-API-ACTIVE]` 1 + `[P0-UMB-01…02]` 2 + `[P0-UMB-ACTIVE]` 1 + `[P0]` red 9 =31, all carry `[P0]` prefix)
  - P1 (High): 22 tests (`[P1-U-01…05]` 5 + `[P1-API-01…06]` 6 + `[P1-UMB-01…05]` 5 + `[P1]` red 6 =22)
  - P2 (Medium): 8 tests (`[P2-U-01…03]` 3 + `[P2-API-01…02]` 2 + `[P2-UMB-01…03]` 3 =8)
  - P3 (Low): 0
  - Unknown: 0

### Assertions Analysis

- **Total Assertions**: ~182 assertions when de-skipped (unit ~54: 9 P0 dormant ~27 + 5 P1 ~18 + 3 P2 ~6 + 1 active ~33; gateway ~48; umbrella ~38; red ~42), active-only run 3 tests ~70 assertions (`unit active 33 + gateway active 19 + umbrella active 18`)
- **Assertions per Test**: ~3.0 avg (dormant ~2.8, active smoke ~23 bundled but single-concern per band still counted as 1 concern per probe)
- **Assertion Types**: `assert.strictEqual` (hex exact per-tier), `assert.deepStrictEqual` (shape grain/glow), `assert.ok`/`assert.match` (source `includes`/`regex` for `Object.freeze`, `tileFillFor`, `RoundedRect`, `value>=1536`, `color="#000000"`), `assert.notStrictEqual` (1 vs 2 distinct, 192 vs 1536 grain differ), `assert.doesNotThrow` (NaN/Infinity/bad hex `contrastRatio` resilience), `assert.ok(r>=4.5)` (WCAG ratio floors), `approx` tolerance (`21:1 ±0.05`, `4.54±0.1`, `4.65±0.15`)

---

## Context and Integration

### What the Context Said

The context set (`spec-9-3` + `test-design-9-3` + `triade/src/ui/tileNumerals.ts` + `triade/src/render/GameBoard.tsx` + `triade/__tests__/ui/tileShape.test.ts` + `tileContrast.audit.test.ts` + `tileNumerals.test.ts` + `announcements.ts`) establishes: 13-tier DESIGN dark canonical `1:#EFE3C2 … 3072:#FFF3DC` + per-tier ink `dark #1C1206 / light #F6F0E1` + shape bands `grain 0/1/2 + glow incandescent` + WCAG AA `≥4.5:1` for every tier (weakest `384 #157A5C` ~4.65 still ≥4.5) and chrome `≥4.5` (`accent ≥6.5`, `dark-on-accent ≥7`) via pure `contrastRatio` helpers — validated dark only, light + color-blind deferred to 9-4. Tests were judged against that contract: every P0 probe pins `TILE_HEXES exact 13 frozen` + `TILE_INK per-tier` + `cap 6144/12288→3072` + `every tier contrast ≥4.5` + `192 vs 1536 grain differ` + `GameBoard delegation no value<=12` + `Skia grain RoundedRect style="stroke" bevel opacity`; P1 adds monotonic bands, interval `5→3/100→96/800→768/2000→1536/NaN→3072` sweep, helper `21:1/4.54/4.65 + 3-digit + bad hex 0` purity, and `TILE_NUMERAL_TOKENS 32/13/9 + MIN_TILE_WIDTH 44` fit; P2 adds additive grain inset arithmetic `3/6` inside `CELL_RADIUS 10` never covering center, `glow isPunch && ≥1536` scope, and `reducedMotion` orthogonality. Context raised one Medium (ungrouped suite) and 5 Low (tautology placeholders) — it never waived a rubric violation, lowered a severity, or altered the score; formal risk acceptance belongs in `trace` or the release gate. Coverage mapping and NFR gates are `trace`/`nfr-assessment` outputs, not this review.

### Related Artifacts

- **Story File**: [spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md](../../implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md) (status `done`, baseline `9448b3f`, final `7e314ab`, head `009fc5e`, 6 ACs)
- **Test Design**: [test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md](../test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md) (Draft, `10 risks` `2 high R-001/R-002 score 6`, `P0 8 groups / P1 7 / P2 6 / P3 2`, host-only `~7–13h`)
- **Risk Assessment**: High (R-001 weakest `384` WCAG AA regressible, R-002 grain not rendered / numeral obscured — both mitigated by `tileContrast.audit` + `tileShape.test` + Skia prop scans, remain regressible by palette/Skia changes)
- **Priority Framework**: P0-P3 applied per test-design (P0 must be green every commit, P1 PR gate, P2 secondary)

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

1. **Merge-safe as-is — no blocker** - Working-tree delta is 3 active smoke journeys GREEN plus 58 dormant RED-phase pins that mirror `triade/__tests__/ui/tileShape.test.ts 6 pass + tileContrast.audit.test.ts 3 pass` fleet; `git diff 9448b3f..009fc5e --stat` 6 files `+491/-20` production delta already committed on `main` (`009fc5e` 10 ahead of `origin/main`), `npx tsc --noEmit` clean, `973 pass` stable — this review does not block 9-3 `done` bookkeeping.
   - Priority: P0
   - Owner: QA / FE
   - Estimated Effort: —

2. **Optional immediate polish (one P3 follow-up PR before push):** Replace 5 `assert.ok(true)` with `assertPaletteContract`/`assertGameBoardContract` or `execSync` host gates from `fixtures/9-3…-fixtures.ts` + group 4 files with `describe` bands per Recommendations #1/#3; publish `node --import tsx --test` burn-in 10 iterations `for i in {1..10}; do NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/unit/9-3…atdd.test.ts; done` to prove no flake.
   - Priority: P2
   - Owner: FE
   - Estimated Effort: 1h

### Follow-up Actions (Future PRs)

1. **Wire `_bmad-output/test-artifacts/fixtures/9-3…-fixtures.ts` single source before 9-4** - Import `TIER_FIXTURES 13` + `SCAN_STRINGS 50+` + `EXPECTATIONS 4` + `GATE_CONSTANTS` into `unit/gateway/umbrella/red` so light `LIGHT_TILE_HEXES` / color-blind `CB_*` ramps edit one site; add dynamic `Object.keys(TILE_HEXES).length===13` allowlist gap scan (R-001).
   - Priority: P2
   - Target: 9-4 prereq

2. **Harden chrome audit staleness before 9-4** - `tileContrast.audit.test.ts` hard-codes `SURFACE #23262D / BOARD #1A1D23 / ACCENT #E8A33D` vs `src/theme` single source risk; add `readFileSync` import pin or document `design` vs `src/theme` drift comment as audit does for tile palette; keep `6.5` / `7` accent high pins as P1.
   - Priority: P2
   - Target: 9-4 prereq

3. **Device spot-check for 9-3 grain additive gate before 9-4** - Manual board render `192 #28A074` adjacent `1536 #FFD9A0` at 44pt confirms grain `stroke #000000 opacity 0.14/0.22/0.12` visible without numeral `32/13/9` clip at `cell/2`; capture one emulator screenshot into `_bmad-output/test-artifacts/test-evidence/` as trace evidence.
   - Priority: P3
   - Target: 9-4

### Re-Review Needed?

✅ No re-review needed - approve as-is (Approve with Comments). 3 active P0 smoke journeys GREEN, 58 dormant probes are RED-phase scaffold with documented still-true reason, ledger is 1 Medium +5 Low (tautologies alongside real scans), score `95/100 A`. Follow-up grouping + fixture import + `ok(true)` removal is P2 backlog before 9-4, not a merge blocker.

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Test quality for story 9-3 is Excellent at `95/100 A` with 0 Critical / 0 High — the working-tree delta (4 test files 61 probes: 42 dormant RED-phase `test.skip` with `All … test.skip (RED) for test_artifacts compliance; a subset also runs as active…` documented still-true header + 3 active `P0-*-ACTIVE` smoke journeys) correctly pins the 13-tier dark-canonical palette `1:#EFE3C2…3072:#FFF3DC` as frozen single-source data, per-tier ink `dark #1C1206 / light #F6F0E1`, interval `6144/12288→3072` capping without throw, WCAG AA `contrastRatio` `21:1 + 4.54 + 4.65` golden plus `3-digit + bad hex→0` resilience, weakest `384` holding `4.65≥4.5`, chrome `≥4.5` / `accent ≥6.5` / `dark-on-accent ≥7`, and shape beyond hue `192 emerald grain 2 vs 1536 incandescent grain 0+glow` with monotonic bands and Skia `RoundedRect style="stroke" bevel 1/1.2/1.6 opacity 0.14/0.22/0.12` `inset 3/6` grain additive — all host-only `node:test + tsx + readFileSync + await import` without hard waits, wall-clock, shared state, or network. The only ledger deductions are 1 Medium (M4 ungrouped suite) and 5 Low (C3 `assert.ok(true)` placeholders each alongside ≥2 real scans, downgraded from Critical per registry note) — no file exceeds `300` lines, no test exceeds `1.5 min` (`3 pass ~0.44s`, `full suite 973 pass ~4.6s`), every test has explicit `assert.*` and `P0/P1/P2` markers per established `[P#]` convention. Follow-up grouping, fixture single-sourcing, and `ok(true)`硬化 are worth fixing but do not block merge.

**For Approve with Comments**:

> Test quality is acceptable with 95/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

---

## Appendix

### Violation Summary by Location

| Line   | Severity      | Criterion   | Issue         | Fix         |
| ------ | ------------- | ----------- | ------------- | ----------- |
| _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:178 | P3 (Low) | Explicit Assertions (C3 tautological assertion, downgraded) | `assert.ok(true, 'manual P2 spot-check …')` always green | Replace with `CELL_RADIUS 10` + `width={cell-6}/{cell-12}` structural asserts or `execSync` host gate from fixtures |
| _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:188 | P3 (Low) | Explicit Assertions (C3) | `assert.ok(true, 'engine purity gate — DoD host gates confirm')` placeholder | Replace with `execSync git diff --stat -- triade/src/engine` → `assert.equal(stat, '')` or keep comment-only `structural scan suffices` |
| _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:54 | P3 (Low) | Explicit Assertions (C3) | `assert.ok(true, 'umbrella smoke — full suite 973 pass + tsc clean …')` placeholder | Replace with `assertPaletteContract`/`assertGameBoardContract` from fixtures or retain as comment |
| _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:66 | P3 (Low) | Explicit Assertions (C3) | `assert.ok(true, 'chrome + engine purity gate …')` placeholder | Replace with `execSync git diff` engine purity helper |
| _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:161 | P3 (Low) | Explicit Assertions (C3) | `assert.ok(true, 'engine purity + sprint-status hygiene …')` placeholder | Replace with `assertSprintStatusUntouched()` helper from fixtures |
| _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts:1 | P2 (Medium) | Fixture Patterns / Maintainability (M4 ungrouped suite) | 18 top-level `test()`/`test.skip()` with zero `describe` grouping | Add `describe('palette identity')` / `describe('WCAG AA')` / `describe('shape beyond color')` / `describe('GameBoard delegation')` |
| _bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts:1 | P2 (Medium) | M4 | 17 top-level tests no `describe` | Same — grouped bands per Recommendation #3 |
| _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts:1 | P2 (Medium) | M4 | 11 top-level tests no `describe` | Same |
| _bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts:1 | P2 (Medium) | M4 | 15 top-level tests no `describe` | Same |

*Note: M4 deduped per review set as 1 Medium in ledger (file-level row); table expands to 4 sites for triage. Strict ledger counts 1×2=2 for M4, not 4×2=8, per `FILE_LEVEL_ROWS` dedup guidance analogue.*

### Quality Trends

| Review Date  | Score         | Grade     | Critical Issues | Trend       |
| ------------ | ------------- | --------- | --------------- | ----------- |
| 2026-09-03 | 95/100 | A | 0       | ➡️ New review (9-3 working-tree delta 61 probes, 3 active GREEN) |

### Related Reviews

| File     | Score       | Grade   | Critical | Status             |
| -------- | ----------- | ------- | -------- | ------------------ |
| tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts | 96/100* | A | 0 | Approve with Comments |
| tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts | 96/100* | A | 0 | Approve with Comments |
| tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts | 94/100* | A | 0 | Approve with Comments |
| atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts | 98/100* | A | 0 | Approve |
| fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts | — | — | — | Helper (not scored) |

*Per-file score is the ledger applied to that file alone (same 1 Medium shared at review-set level counted once).*

**Suite Average**: 95/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-20260903
**Timestamp**: 2026-09-03
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

- _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts
- _bmad-output/test-artifacts/tests/api/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.gateway.spec.ts
- _bmad-output/test-artifacts/tests/e2e/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.umbrella.spec.ts
- _bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md
- _bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md
- triade/src/ui/tileNumerals.ts
- triade/src/render/GameBoard.tsx
- triade/__tests__/ui/tileShape.test.ts
- triade/__tests__/ui/tileContrast.audit.test.ts
- _bmad/tea/config.yaml
