---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-test-scanner-helpers-hardening'
storyKey: 'dw-test-scanner-helpers-hardening'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md'
  - '_bmad-output/test-artifacts/test-design-dw-test-scanner-helpers-hardening.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-test-scanner-helpers-hardening.md'
  - 'triade/test-utils/helpers.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/ui/gesture-pipeline.test.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-test-scanner-helpers-hardening — Test-tooling scanner & RNG helpers hardening

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-test-scanner-helpers-hardening`
**Mode:** BMad-integrated context (spec + test-design + ATDD) but host-dominated execution; no Playwright/Cypress harness required for this delta
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, Reanimated 4 + Skia 2.6.2)
**Working-tree delta under test:** Working-tree `git diff` vs baseline `1fb45ca7437304db468f1193251c0c7560d60dd1` (`spec-test-scanner-helpers-hardening.md` `baseline_revision`). HEAD is `1fb45ca` (after `chore(sweep): close resolved deferred-work entries`); production engine is byte-identical (`git diff --stat -- triade/src/engine` empty). The sweep resolves DW-3 / DW-48 / DW-59 / DW-60 / DW-66 to `done` via `deferred-work.md` status updates and hardens the test helpers + one local spy.

> **Delta (7 files, ~133 insertions):** `triade/test-utils/helpers.ts` — `rngOf(...values)` now throws `rngOf exhausted after N scripted draw(s) — …` when `i >= values.length` instead of returning `0.5`; `spyRng(...values)` same contract (shared, single source for draw-budget pins); `gameState(board, pendingSpawn = defaultPendingSpawn())` with exported `defaultPendingSpawn(): PendingSpawn { return { value: 1, displayRoll: 0 } }` replacing anonymous `{ value: 1, displayRoll: 0 }` literal; `stripComments(source)` now delegates to `stripCommentsInternal(source, false)` (shared `code/line/block/single/double/template/interp` scanner that respects string/template literals and preserves their contents intact, only blanking comment bodies) while `stripCommentsAndStrings(source)` delegates to `stripCommentsInternal(source, true)` (same scanner but `blankStrings=true` blanks string/template contents); both preserve newline-length; `stripCommentsAndStrings` doc expanded to describe regex-literal mode-desync blast radius (quote inside `/it's/` flips into string mode, blanks subsequent source, false NEGATIVE on `ui.norolls` guard; no current scanned view/service file contains such pattern; proper fix deferred — requires real lexer for division-vs-regex disambiguation). `triade/__tests__/engine/adaptive-spawn-integration.test.ts` — local `spyRng` hardened to throw (was `calls.push(v === undefined ? 0.5 : v)`). `triade/__tests__/engine/game.test.ts` — effective-move `rngOf(0,0)` → `rngOf(0,0,0.5)` (3-draw budget: `pickIndex` + `resolveSpawn` + `displayRoll`), `newGame` `rngOf(0,0, 9×0, ...)` → `rngOf(0,0, 9×0, 9×0.5)` i.e. 20 draws (`9 pickIndex` + `9 weightedValue` + `1 resolveSpawn` + `1 displayRoll`); `transitionPlan.test.ts` and `gesture-pipeline.test.ts` same `rngOf(0,0)→rngOf(0,0,0.5)` hardening (20+ sites). `deferred-work.md` — DW-3 / DW-48 / DW-59 / DW-60 / DW-66 flipped `status: open` → `status: done 2026-09-01` + `resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening` + `resolution-undo` hash; all other DW entries unchanged. No engine, UI, or `src/feel` logic change; `extractSpecifiers` / `extractNamedImports` continue to consume `stripComments(source)` (now comment-only) and still see real import specifiers.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:13`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated` + no `pyproject.toml`/`go.mod`/`pom.xml`/`Cargo.toml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsc` 6.0.3, `tsc --noEmit` clean exit 0, `tsx` 4.23.12)
- **No Playwright/Cypress harness required:** dw bundle is pure `stripComments`/`rngOf`/`defaultPendingSpawn` helpers + draw-budget wiring + scanner tripwire preservation. Host `node:test` is correct harness per `test-levels-framework.md` Unit/Integration dominance. `tea_use_playwright_utils:true` loaded but not applied for this RN helper seam — no `page.goto`/`page.locator` surface (TEA browser_automation auto → host adaptation). `tea_use_pactjs_utils:false` — provider scrutiny is engine as provider via `mulberry32`+`move` fixtures (see P1-01), not Pact.
- **Existing test structure:** `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts` (20 cases, 4 suites) + `triade/__tests__/engine/{game.test.ts (32), adaptive-spawn-integration.test.ts}` + `render/transitionPlan.test.ts` + `ui/gesture-pipeline.test.ts` + `engine.purity.test.ts` + `ui/ui.norolls.test.ts` + `_bmad-output/test-artifacts/tests/{api,e2e}` + `fixtures/`.

### Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto (from _bmad/tea/config.yaml tea_execution_mode)
- Probe Enabled: true (tea_capability_probe)
- Supports agent-team: false (opencode runtime — sequential only)
- Supports subagent: false
- Resolved: sequential
```

- **Knowledge fragments loaded (core, always):** `test-levels-framework.md`, `test-priorities-matrix.md`, `data-factories.md`, `selective-testing.md`, `ci-burn-in.md`, `test-quality.md`
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-test-scanner-helpers-hardening.md` R-001..R-010, 3 high score 6), `nfr-criteria.md` (fail-fast vs never-throw / single parser + single literal + 64-hex ledger / 60 FPS / scanner purity green), `fixture-architecture.md` (deterministic, no faker), `api-testing-patterns.md` (helper gateway contract), `selector-resilience.md` (scanner guard — string-safe)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Spec `spec-test-scanner-helpers-hardening.md` (7-row I/O matrix, 5 ACs, S-corrected baseline `1fb45ca`→HEAD working-tree, `Helpers harden` intent, `Never` introduce real lexer / out-of-scope engine files)
- Test-design `test-design-dw-test-scanner-helpers-hardening.md` (10 risks R-001..R-010, 3 high score 6 (R-001 draw-budget throw, R-002 single-parser drift, R-003 regex mode-desync), P0 7 groups / P1 6 / P2 4 / P3 3, NFR planning, entry/exit, estimates ~4–6h host)
- ATDD checklist `atdd-checklist-dw-test-scanner-helpers-hardening.md` + `helpers.hardening.atdd.test.ts` (20 cases, P0 8 + P1 6 + P2 4 + P3 2, `it.skip` RED-phase scaffolds, host `node:test` true RED before hardening, GREEN after working-tree, 20 pass when activated)
- Source `helpers.ts:17-23` (`defaultPendingSpawn` factory + `gameState` wiring) / `35-46` (`rngOf` throw) / `52-66` (`spyRng` throw) / `215-335` (`stripCommentsInternal` shared scanner `code/line/block/single/double/template/interp` + `blankStrings` toggle + `Known limitation — regex`) / `337-389` (`extractSpecifiers`/`extractNamedImports` consumers) / `adaptive-spawn-integration.test.ts:16-24` local spy + `game.test.ts:9-11` 20-draw + `game.test.ts:32-48` 3-draw migration + `transitionPlan`/`gesture-pipeline` 0,0→0,0,0.5
- Existing guards `engine.purity.test.ts` + `ui.norolls.test.ts` always GREEN baseline on clean codebase (scanner tripwires preserved)
- Ledger `deferred-work.md` 5 DW entries `done 2026-09-01` with `resolution-undo` 64-hex hashes; `sprint-status.yaml` untouched (orchestrator-owned per prompt, verified absent story key)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| `rngOf` throws on exhaustion with `after N scripted draw(s)` — removes silent `0.5` fallback that hid draw-budget drift (deterministic `1`-spawn) | `triade/test-utils/helpers.ts:35-46` | **Unit** | **P0** | AC fail-fast (R-001 score 6) — blocks draw-budget drift. No workaround. |
| `spyRng` (shared `helpers.ts` + local `adaptive-spawn-integration.test.ts`) throws on exhaustion with `after N`, `calls` exact per draw | `triade/test-utils/helpers.ts:52-66` + `adaptive-spawn-integration.test.ts:28-37` | **Unit** | **P0** | AC fail-fast both variants (R-001 score 6) — blocks hidden `0.5` in spy path. |
| `stripComments('const u="http://x"; // cmt')` preserves `http://` and `/*` inside string/template, only strips real comments (`// cmt`/`/* real */`) — `blankStrings=false` preserves contents | `triade/test-utils/helpers.ts:215-221` + `247-335` | **Unit** | **P0** | AC string-safe (R-002 score 6) — blocks URL corruption + purity false-pass. |
| `stripComments("const s='a /* b */ c'; /* real */")` preserves inner block, `extractSpecifiers('import Foo from "bar"; // cmt')` still → `["bar","qux"]` — proves specifier survives | `triade/test-utils/helpers.ts:337-353` consumer | **Unit** | **P0** | AC string-safe + specifier preservation (R-002/R-007). |
| `stripComments('const s="a \\" // not comment"; // real')` keeps `a \"`, `blankStrings` split on `ch === '\\'` | `triade/test-utils/helpers.ts:272-308` | **Unit** | **P0** | AC escaped-quote edge (R-009 score 2, but P0 because purity). |
| `gameState(board)` defaults to `defaultPendingSpawn()` and factory exported, fresh object per call, single literal site | `triade/test-utils/helpers.ts:17-23` | **Unit** | **P0** | AC factory (R-005 score 3, but P0 because magic realism — blocks anonymous literal). |
| `stripCommentsAndStrings` doc `Known limitation — regex literals … flips … false NEGATIVES … No such pattern exists … division-vs-regex disambiguation` (DW-66) — `blankStrings=true` still blanks | `triade/test-utils/helpers.ts:224-243` | **Unit (doc)** | **P0** | AC regex doc (R-003 score 6) — documents residual false NEGATIVE with zero blast radius. |
| `engine.purity` + `ui.norolls` scanner guards stay green on clean codebase after delegation (proves `extractSpecifiers` not broken) | `triade/__tests__/engine/engine.purity.test.ts` + `ui.norolls.test.ts` | **Integration (scanner)** | **P0** | AC scanner green (R-002/R-003/R-007). Blocks tripwire regression. |
| Engine→helper draw-budget fixtures — `move(board, left, rngOf(0,0,0.5))` effective with `3` draws vs `rngOf(0,0)` now throws; `newGame(rngOf(0,0, 9×0, 9×0.5))` 20 draws has 9 tiles (real engine via `mulberry32`+`move` eliminates stub drift) | `triade/__tests__/engine/game.test.ts:32-48` + `9-11` + `transitionPlan`/`gesture-pipeline` | **Integration (host, API-like)** | **P1** | R-001+R-004+R-006 trace contract — stub drift eliminated by real fixture. |
| `extractSpecifiers`/`extractNamedImports` still see real specifiers after `stripComments` keeps strings (`default` + `* as ns` + `{ type }`) | `triade/test-utils/helpers.ts:337-389` | **Integration (host)** | **P1** | R-002/R-007 specifier extraction not regressed. |
| `gameState(board, {value:9,displayRoll:0})` explicit tiered pending drives realistic flow vs default `{1,0}` — complements `runSeededSession` | `triade/test-utils/helpers.ts:21` overload | **Integration (host)** | **P1** | R-010 DATA magic realism — new tests should inject tiered pending. |
| `spyRng` `calls` exact per draw (`calls.length` equals draws served, order preserved) after throw hardening | `triade/test-utils/helpers.ts:52-66` | **Unit** | **P1** | R-001 draw-budget `calls` pin. |
| Ledger `deferred-work.md` 5 entries `done` with `resolution-undo` 64-hex hash, `sprint-status.yaml` untouched (orchestrator-owned) | `_bmad-output/implementation-artifacts/deferred-work.md` + `sprint-status.yaml` | **Static** | **P1** | R-008 OPS ledger hash coupling. |
| No `0.5` fallback literal scan — `rg -n "return 0\.5\|\? 0\.5" helpers.ts adaptive-spawn ==0` (outside call-site `0.5` pads) | `triade/test-utils/helpers.ts` + `adaptive-spawn-integration.test.ts` | **Static scan** | **P2** | R-001 no fallback drift. |
| Single-parser allowlist — `rg -n "stripCommentsInternal" ==3` (false/true/def) + no naive `/\/\*[\s\S]*?\*\//` fallback, `blankStrings` split preserved | `triade/test-utils/helpers.ts` | **Static scan** | **P2** | R-002 single-parser invariant. |
| Template interpolation `${}` counted, over-brace not early-close — `stripComments('const s=`hi ${a ? "x":"y"} // cmt`; // real')` | `triade/test-utils/helpers.ts:247-335` | **Static scan** | **P2** | R-009 escape/interp edge. |
| Quote-in-regex exploratory — `rg -n "/[^/]*'[^/]*/" triade/src/ui …` empty + `Known limitation — regex` pin | `triade/src/ui`/`services`/`render` | **Static scan** | **P2** | R-003 residual complement. |
| Cross-cutting scope guard — `rg -n "music\|bgm\|RevenueCat\|AdMob" helpers.ts` empty (sweep stayed in scope) | `triade/test-utils/helpers.ts` | **Static scan** | **P3** | Not in Scope hygiene. |
| Micro-bench — `stripComments` 1000×10k in <500 ms, `stripCommentsAndStrings` same, length-preserving | `triade/test-utils/helpers.ts:247-335` | **Unit (bench)** | **P3** | R-009 perf vs O(n) single-pass. |

**API/E2E mapping note (TEA terminology for this Expo RN story):**
- **"API" in TEA = helper gateway contract** over typed `Rng` + `PendingSpawn` + `stripComments`/`stripCommentsAndStrings` + `GameState` factory + `extractSpecifiers` + engine draw-budget gateway (`move` 3-draw / `newGame` 20-draw via `mulberry32`). Tests are `helpers.hardening.atdd.test.ts:P0-01..08/P1-01..06/P2-01..04/P3-01..02` + `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts` (13 cases, host ~18ms) — they validate the service contract the same way API tests validate request/response shapes. No Pact/HTTP harness (`tea_use_pactjs_utils:false`); provider scrutiny via `mulberry32`+`move` real trace eliminates stub drift.
- **"E2E" in TEA = scanner + ledger + bench verification journeys** (P1 host scanner pipeline `engine.purity`/`ui.norolls` + P1 draw-budget end-to-end through real engine + P1 ledger `resolution-undo` + P2 static allowlists + P3 bench/scope). These are `tests/e2e/helpers.hardening.umbrella.spec.ts` (7 journeys, host, P1/P2/P3) plus manual `npm --prefix triade test` full gate. Host automation covers all automatable surfaces; E2E is the checklist exit criterion (no device lane per test-design). This is manual/host verification, not `playwright.config.ts` suites — correctly skipped per `test-levels-framework.md` Unit dominance + test-design execution strategy `PR (<15 min) / no device / nightly-not-required`.

### Priority Assignment (per `test-priorities-matrix.md` / `risk-governance.md`)

- **P0:** Blocks AC1–AC5 + high risk (R-001/R-002/R-003 score 6) + no workaround — must be 100% green before verified. Host `<5s` + bench `<1s` (<10s incl full suite), PR gate.
- **P1:** Wiring + ledger boundary — ≥95% green; static ledger `resolution-undo` may be waiver with owner+date if host scanner + draw-budget gates already green per `selective-testing.md`.
- **P2/P3:** Static/perf/exploratory — ≥90% informational; P2/P3 never block close (residual R-003 lexer deferred is documented, not threshold).

### Coverage Plan

- **P0:** 7 groups (8 `it()` `helpers.hardening.atdd.test.ts` P0 + 2 scanner suites `engine.purity`/`ui.norolls` green) — `rngOf`/`spyRng` throw + `stripComments` string-safe `http://`+`/*`+escaped-quote + `defaultPendingSpawn` fresh + regex doc + scanner green — PR gate `<1s`.
- **P1:** 6 groups (6 host ATDD P1 + 7 E2E journeys `helpers.hardening.umbrella` P1 + ledger `resolution-undo` + explicit tiered pending + `extractSpecifiers` preservation + draw-budget 3/20 fixtures + migrated suites `game.test.ts` 32 + `transitionPlan` + `gesture-pipeline`) — real trace + ledger + wiring, `~0.5–1h` host.
- **P2:** 4 checks (no `0.5` fallback / single literal / single parser 3-site allowlist / template interp + quote-in-regex) — `~0.3–0.5h` host.
- **P3:** 2 checks (scope guard + bench 1000×10k <500 ms) — `~0.2–0.4h` host.
- **Total:** `~20` checks (7 P0 + 6 P1 + 4 P2 + 3 P3 inc. E2E 7), `~4–6h` host → `~4–6h` elapsed (no device, host-only pure TS per test-design Resource Estimates).

---

## Step 3 — Generate Tests (Sequential, stack=`frontend`)

### Execution Report

```
🚀 Performance Report:
- Execution Mode: sequential (auto→sequential, no subagent/agent-team support in opencode)
- Stack Type: frontend (Expo RN)
- API Test Generation (helper gateway contract): _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts (13 cases, host ~18ms, file 310 lines)
- E2E Test Generation (scanner + ledger journeys): _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts (7 journeys, host, file 268 lines) — not scaffolded as Playwright page.goto (RN helper seam, scanner pipeline + engine integration, host-verifiable)
- Fixtures: _bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts (new, 198 lines, this run) + reused feel-trace-fixtures.ts (69 lines, 8-1) + feel-bullet-time-fixtures.ts (133 lines, 8-4) + feel-reduced-motion-fixtures.ts (223 lines, 8-5) + feel-sfx-fixtures.ts (198 lines, 8-6)
- Backend Test Generation: skipped (frontend only, tea_use_pactjs_utils:false, no Pact)
- Total Elapsed: host ATDD 20 (0 pass dormant / 20 pass when activated, ~366ms) + gateway 13 (13G, ~18ms) + umbrella 7 (7G, ~80ms) + existing suites game.test.ts 32G + transitionPlan 12G + gesture-pipeline 5G + engine.purity/ui.norolls green (~1s) + full suite ~5.8s; PR gate <15 min
- Parallel Gain: baseline (no parallel speedup; sequential is correct for node:test pure surface)
```

No subagent temp files (`/tmp/tea-automate-*.json`) — this run aggregates **existing** ATDD scaffolds (`helpers.hardening.atdd.test.ts` 20 cases) + shipped `game.test.ts`/`transitionPlan`/`gesture-pipeline` draw-budget migrations + `engine.purity`/`ui.norolls` scanner guards and expands into TEA `test_artifacts/tests/{api,e2e}` plus `fixtures/helpers-hardening-fixtures.ts` for traceability, rather than launching Playwright subagents that would add dead weight for a pure-function delta. Same adaptation as 8-1..8-6 `automate` — see Step 3 in prior summaries. E2E journeys are host scanner + ledger checklists (not `playwright.config.ts` suites) — correctly skipped per `test-levels-framework.md` Unit dominance + test-design execution strategy.

### Tests Aggregated + Generated (deduplicated against ATDD)

**Source of truth (ATDD, existing):** `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts` (20 `it.skip`, 298 lines, P0/P1/P2/P3, prioritized `[P0-..]/[P1-..]/[P2-..]`, GWT comments) — I/O matrix 7 rows + draw-budget + factory + scanner delegation. No duplicate generation — `automate` expands fixtures/validates and aggregates, plus TEA `tests/api` + `tests/e2e` artifacts for traceability.

| # | Requirement | Scenario | Level | Priority | File | Test Name | Status on working-tree |
|---|-------------|----------|-------|----------|------|-----------|------------------------|
| 1 | AC rngOf fail-fast | `rngOf(0.1)()` twice → `throw /rngOf exhausted after 1/`; `rngOf()` empty throws on first | Unit | P0 | `helpers.hardening.atdd.test.ts` + `helpers.hardening.gateway.spec.ts` | `[P0-01] AC rngOf throws on exhaustion with count (no silent 0.5)` | GREEN (activated 20 pass) |
| 2 | AC spyRng shared fail-fast | `spyRng(0.1,0.2)` twice → `calls [0.1,0.2]`, third throws `spyRng exhausted after 2`, `calls.length` stays 2 | Unit | P0 | `helpers.hardening.atdd.test.ts` + `gateway` | `[P0-02] AC spyRng (shared helpers.ts) throws on exhaustion + records calls` | GREEN |
| 3 | AC local spyRng fail-fast | `adaptive-spawn-integration.test.ts:28-37` local spy throws `spyRng exhausted after N`, no `return 0.5` | Unit | P0 | `helpers.hardening.atdd.test.ts` + `gateway` | `[P0-03] AC local spyRng (adaptive-spawn-integration) throws — no 0.5 fallback` | GREEN |
| 4 | AC stripComments string-safe `//` | `stripComments('const u="http://x"; // cmt')` preserves `http://x`, strips only `// cmt`, length-preserving | Unit | P0 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` | `[P0-04] AC stripComments preserves string // and /* (comment-only stripping)` | GREEN |
| 5 | AC stripComments escaped-quote | `stripComments('const s="a \\" // not comment"; // real')` keeps `a \"`, proves `blankStrings=false` via `extractSpecifiers('import Foo from "bar"; // cmt') → ["bar","qux"]` | Unit | P0 | `helpers.hardening.atdd.test.ts` + `gateway` | `[P0-05] AC stripComments escaped-quote edge + not blanking strings` | GREEN |
| 6 | AC gameState factory | `gameState(emptyBoard()).pendingSpawn` deep-equals `defaultPendingSpawn()` but not `===` (fresh), `typeof defaultPendingSpawn === 'function'`, single literal `value:1.*displayRoll:0` site | Unit | P0 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` | `[P0-06] AC gameState defaults via defaultPendingSpawn() factory (no magic literal)` | GREEN |
| 7 | AC regex-literal doc | `helpers.ts:224-243` JSDoc contains `Known limitation — regex literals … flips … false NEGATIVES … No such pattern exists … division-vs-regex` + `stripCommentsAndStrings('const url="http://x"; … // cmt')` blanks string | Unit (doc) | P0 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` | `[P0-07] AC stripCommentsAndStrings doc — regex quote mode-desync false NEGATIVE documented` | GREEN |
| 8 | AC scanner guards green | `stripCommentsInternal` 3 sites + no naive fallback + `engine.purity.test.ts` + `ui.norolls.test.ts` green on clean codebase | Integration (scanner) | P0 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` E2E-01 | `[P0-08] AC scanner guards stay green on clean codebase (purity / norolls)` | GREEN |
| 9 | P1 effective move 3-draw | `move(staticBoard([1,2,null,null]), left, rngOf(0,0,0.5))` succeeds `moved:true score:3`; `rngOf(0,0)` throws `exhausted after 2` | Integration (host, API-like) | P1 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` E2E-02 | `[P1-01] AC effective move draw-budget 3: move(board,left,rngOf(0,0,0.5)) succeeds, rngOf(0,0) throws` | GREEN |
| 10 | P1 newGame 20-draw | `newGame(rngOf(0,0, 9×0, 9×0.5))` → 9 tiles; `rngOf(0,0, 9×0)` short throws | Integration (host) | P1 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` | `[P1-02] AC newGame 20-draw budget: rngOf(0,0, 9×0, 9×0.5) → 9 tiles, rngOf short throws` | GREEN |
| 11 | P1 extractSpecifiers preservation | `extractSpecifiers('import Foo from "bar"; // cmt') → ["bar"]` + `extractNamedImports` `* as ns` / `{ type }` | Unit | P1 | `helpers.hardening.atdd.test.ts` + `gateway` | `[P1-03] AC extractSpecifiers / extractNamedImports still see real specifiers (stripComments keeps strings)` | GREEN |
| 12 | P1 explicit pendingSpawn wiring | `gameState(boardWith(...), {value:9,displayRoll:0})` then `move(...,rngOf(0,0,0.5))` succeeds with tiered pending | Integration (host) | P1 | `helpers.hardening.atdd.test.ts` | `[P1-04] AC gameState explicit pendingSpawn drives realistic flow (tiered 9)` | GREEN |
| 13 | P1 spyRng calls exact | `spyRng(0.11,0.22,0.33)` calls `[0.11,0.22,0.33]` and fourth throws, `calls.length` stays 3 | Unit | P1 | `helpers.hardening.atdd.test.ts` + `gateway` | `[P1-05] AC spyRng calls recording exact per draw (no drift)` | GREEN |
| 14 | P1 ledger done + sprint-status untouched | `deferred-work.md` ≥5 `status: done 2026-09-01` + `resolution-undo: 64-hex` each; `sprint-status.yaml` absent story key | Static | P1 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` E2E-03 | `[P1-06] AC ledger DW-3/48/59/60/66 done with resolution-undo hash, sprint-status.yaml untouched` | GREEN |
| 15 | P2 no 0.5 fallback scan | `rg -n "return 0\.5\|\? 0\.5" helpers.ts adaptive-spawn ==0` | Static scan | P2 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` E2E-05 | `[P2-01] SCAN no 0.5 fallback literal in helpers.ts or local spy` | GREEN |
| 16 | P2 single parser allowlist | `rg stripCommentsInternal ==3` (false/true/def) + `blank()` newline-preserving + `if(blankStrings)` split | Static scan | P2 | `helpers.hardening.atdd.test.ts` + `gateway` + `umbrella` | `[P2-02] SCAN single parser allowlist + length-preserving blank()` | GREEN |
| 17 | P2 template interp | `stripComments('const s=`hi ${a ? "x":"y"} // cmt`; // real')` preserves `hi`, strips only `// real`, length-preserving | Unit | P2 | `helpers.hardening.atdd.test.ts` + `umbrella` | `[P2-03] SCAN template interpolation ${} counted, over-brace not early-close` | GREEN |
| 18 | P2 quote-in-regex exploratory | `Known limitation — regex` pin + `rg "/[^/]*'[^/]*/" triade/src/ui` empty | Static scan | P2 | `helpers.hardening.atdd.test.ts` + `umbrella` E2E-06 | `[P2-04] SCAN quote-in-regex exploratory — no scanned file contains /'/ pattern` | GREEN |
| 19 | P3 scope guard | `rg -n "music\|bgm\|RevenueCat\|AdMob" helpers.ts` empty | Static scan | P3 | `helpers.hardening.atdd.test.ts` + `umbrella` E2E-07 | `[P3-01] SCAN cross-cutting concern absent in helpers (no music/RevenueCat/AdMob)` | GREEN |
| 20 | P3 bench | 1000×10k `stripComments` in <500 ms, length-preserving + `http://x` still present | Unit (bench) | P3 | `helpers.hardening.atdd.test.ts` + `umbrella` | `[P3-02] BENCH stripComments O(n) single-pass <1 ms for 4k source (smoke)` | GREEN |
| — | Baseline guard `game.test.ts` | 32 cases `newGame 9 tiles` + `HAPPY_PATH`/`MERGE`/`EQUAL_GE3`/`NO_1_1`/`NO_2_2`/`trace` all green after `0,0,0.5` migration | Unit | P0 | `game.test.ts` | 32 | GREEN |
| — | Baseline guard `transitionPlan.test.ts` | 12 cases slide/merge/noop/hold all green after `0,0,0.5` | Unit | P0 | `transitionPlan.test.ts` | 12 | GREEN |
| — | Baseline guard `gesture-pipeline.test.ts` | 5 cases `handleSwipe` left/right/threshold/busy all green after `0,0,0.5` | Unit | P0 | `gesture-pipeline.test.ts` | 5 | GREEN |
| — | Baseline guard `adaptive-spawn-integration.test.ts` | 15 cases AC1..AC7 + sigmaBound + n3pairs + tieredPairs all green after local spy throw | Unit | P0 | `adaptive-spawn-integration.test.ts` | 15 | GREEN |
| — | Baseline guard `engine.purity.test.ts` + `ui.norolls.test.ts` | Scanner tripwires green on clean codebase (PURITY_ROOTS auto-scan, `FORBIDDEN_PREFIXES` bare reanimated/skia, `ui.norolls` bare-symbol) | Integration (scanner) | P0 | `engine.purity.test.ts` + `ui.norolls.test.ts` | 2 suites | GREEN |
| — | API gateway (TEA) | 13 gateway contract cases (P0 7 + P1 4 + P2 2) — rngOf/spyRng throw, string-safe, factory, doc, delegation, draw-budget 3/20, ledger, allowlists | Integration (host, API-like) | P0/P1/P2 | `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts` | 13 | GREEN (host — `npx tsx --test … ~18ms`) |
| — | E2E journeys (TEA) | 7 journeys (P1 4 / P2 2 / P3 1) scanner preserved + draw-budget + ledger/factory + full sweep + static allowlists + regex residual + bench/scope | E2E (host, scanner+ledger) | P1/P2/P3 | `_bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts` | 7 journeys (`E2E_JOURNEYS` map) | GREEN (host) |

**De-duplication:** `game.test.ts` 32 + `transitionPlan` 12 + `gesture-pipeline` 5 + `adaptive-spawn` 15 + `engine.purity` + `ui.norolls` are baseline guards already green at `1fb45ca` + working-tree migrations; `helpers.hardening.atdd.test.ts` extends them with 20 hardening pins — no merge, kept as ATDD source. `helpers.hardening.gateway.spec.ts` mirrors ATDD P0/P1/P2 but lives under `test_artifacts/tests/api` for TEA traceability (not duplicated coverage — host gateway contract is same, artifact location differs per TEA `test_artifacts` config). `tests/e2e/helpers.hardening.umbrella.spec.ts` documents 7 journeys for traceability (host-verifiable, not Playwright `page.goto` duplication) — maps 1:1 to ATDD P1/P2/P3 without browser duplication.

### Test Execution Instructions

```bash
# ATDD suite (this story) — 20 dormant (RED scaffolds), 20 pass when activated
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/test-utils/helpers.hardening.atdd.test.ts
# → with it.skip: 20 pass dormant (skipped 20)
# → activate: sed 's/it\.skip/it/g' → 20 pass / 0 fail (working-tree hardening covers delta)

# Only the passing pins (quick smoke, <5s, 20 pass when activated)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test --test-name-pattern "P0-" triade/__tests__/test-utils/helpers.hardening.atdd.test.ts --enable-source-maps

# TEA API gateway (host, ~18ms, 13 pass)
npx tsx --test _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts

# TEA E2E umbrella (host, ~80ms, 7 pass)
npx tsx --test _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts

# Draw-budget regression suites (migrated 0,0→0,0,0.5)
npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts __tests__/ui/gesture-pipeline.test.ts

# Scanner regression gates (must stay green on clean codebase)
npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts

# Full host gate (<15 min — run everything in PRs if <15 min per philosophy)
npm --prefix triade test

# Type gate (must be empty)
./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json && ./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json
# Or via TSX_TSCONFIG_PATH
npx tsc --noEmit --project triade/tsconfig.json
TSX_TSCONFIG_PATH=triade/tsconfig.test.json npx tsc --noEmit --project triade/tsconfig.test.json

# Engine purity gate (must be empty)
git diff --stat -- triade/src/engine

# Static allowlist gates (embedded in ATDD P2 + gateway P2 + umbrella E2E-05)
grep -R "return 0\.5" triade/test-utils/helpers.ts  # 0 (no fallback 0.5 literal in helper factories)
grep -R "stripCommentsInternal" triade/test-utils/helpers.ts | wc -l  # 3 (false/true/def single parser)
grep -R "value: 1" triade/test-utils/helpers.ts  # 1 (only inside defaultPendingSpawn)
grep -R "Known limitation — regex" triade/test-utils/helpers.ts  # 1 (DW-66 blast radius documented)
grep -n "rngOf" triade/__tests__/engine/game.test.ts | grep "rngOf(0, 0)" | grep -v "0.5" | wc -l  # 0 (no unmigrated 2-draw effective site)
```

No Playwright `test:e2e` / `test:api` npm scripts generated — `triade/package.json` `test` is the only runner for this delta (correct per `test-levels-framework.md` Unit/Integration dominance and `test-design-dw-test-scanner-helpers-hardening.md` "No Playwright harnesses" + `tea_use_playwright_utils:true` host adaptation). TEA `tests/api` + `tests/e2e` under `test_artifacts` are host artifacts for traceability, not `playwright.config.ts` suites (same as 8-1..8-6 adaptation).

---

## Step 3C — Aggregate & Fixtures

### Fixture Needs (collected from coverage plan)

**Unique fixtures:** 1 new host TEA helper (no Playwright `test.extend()`, no `@faker-js/faker` — `rngOf`/`spyRng` are scripted draws, boards are fixed data, determinism mandatory per `data-factories.md`; `selective-testing.md` targeted `test-utils/*` + `engine/*` only).

| Fixture | Category | Location | Purpose | Cleanup |
|---------|----------|----------|---------|---------|
| `rngOf`/`spyRng` scripted draws + `exhaustedMessage`/`drawBudgetForEffectiveMove`/`drawBudgetForNewGame`/`effectiveMoveRng`/`newGameRng20` + `boardForTest`/`happyPathBoard`/`noopBoard` + `STRIP_FIXTURES` I/O matrix (8 rows: `urlDouble`/`blockInSingle`/`urlTemplate`/`escapedQuote`/`specifierSrc`/`templateInterp`/`regexQuoteDoc`/`empty`+unterminated) + `stripCommentsPreserves`/`stripAndStringsBlanks`/`lengthPreserving` + `factoryIsExported`/`gameStateDefaultEqualsFactory`/`gameStateFreshObject` + `scannerDelegationOk`/`noNaiveRegexFallback`/`docHasRegexLimitation`/`extractSpecifiersStillWorks` + `effectiveMoveSucceedsWith3`/`effectiveMoveThrowsWith2`/`newGameHas9TilesWith20`/`newGameThrowsWith9` + `ledgerDoneCount`/`ledgerUndoHashCount` + `stripCommentsBench` (1000×10k <500 ms) | Data factory (deterministic, provider fixture) | `_bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts` (new, 310 lines, this run) | Build `Rng` with exact draw-budget `0,0,0.5`/`0,0,9×0,9×0.5` and pin `stripCommentsInternal(source,false)` string-safe vs `true` blanking, `defaultPendingSpawn` single literal, `extractSpecifiers` preservation, scanner delegation 3-site, ledger `resolution-undo` 64-hex, bench O(n) | None — pure in-memory arrays per test (isolation per `test-quality.md` — every pin builds its own `rng`/`Board`, no module-level shared board) |
| `feel-trace-fixtures.ts` helpers (`mergeEntry`/`realEngineTrace`/`stylesForTrace`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` (reused from 8-1, 69 lines) | Prior TEA helper for 8-1 haptics + 8-3 shake — kept for helpers hardening (engine-trace→draw-budget pattern reference) | None |
| `feel-bullet-time-fixtures.ts` helpers (`sessionBestSequence`/`realEngineBulletTrace`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` (reused from 8-4, 133 lines) | Bullet helpers — kept (trace contract pattern) | None |
| `feel-reduced-motion-fixtures.ts` helpers (`mergeEntry`/`realEngineReducedTrace`/`umbrellaPerfSweep`) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` (reused from 8-5, 223 lines) | Reduced helpers — kept (FR-30 pattern reference) | None |
| `feel-sfx-fixtures.ts` helpers (`mergeEntry`/`expectedSfxVolume`/`sfxVolumeRank`/`captureGateway` etc.) | Data factory (deterministic) | `_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts` (reused from 8-6, 198 lines) | SFX helpers — kept (gateway contract pattern) | None |

**Not generated (correctly skipped):**
- `tests/fixtures/auth.ts`, `tests/fixtures/data-factories.ts` (`@faker-js/faker`) — no auth/DB/payment flows this story; `rngOf`/`spyRng` + `STRIP_FIXTURES` + `defaultPendingSpawn` is fixed data, faker would add flakiness and violate `data-factories.md` determinism (see ATDD `Data Factories Created: N/A — no faker`).
- `tests/fixtures/network-mocks.ts`, `tests/support/helpers/` (`interceptNetworkCall`/`network-recorder`) — no HTTP/route mocking; helpers are pure `helpers.ts` scanner + draw-budget (no `fetch`).
- Playwright `test.extend({ authenticatedUser, authToken })` + `playwright.config.ts` — no `page.goto` surface; `tea_use_playwright_utils:true` in config but host `node:test` covers scanner via `extractSpecifiers`/`ui.norolls` rather than mocking RN Skia Canvas (would be dead weight per `test-levels-framework.md` Unit dominance).
- `pact/http/consumer/` / `pact/http/provider/` / `vitest.config.pact.ts` (`@pact-foundation/pact`) — `tea_use_pactjs_utils:false` (frontend only, no backend), no CDC this story; provider scrutiny is engine-as-provider via `mulberry32`+`move` fixtures (see P1-01 draws 3/20, same as 8-3/8-4/8-5).
- `triade/__tests__/fixtures/` new directory — not created; project convention is co-located `__tests__/test-utils/*` (see `helpers.hardening.atdd.test.ts` precedent); TEA fixtures live in `test_artifacts/fixtures/` so they do not pollute PR diff.
- Placeholder wav mastering fixture (`triade/assets/sfx/merge.wav`) — not generated; unrelated to helpers hardening.
- New `sfx-trace-fixtures.ts` duplicate — not needed; existing `feel-trace-fixtures.ts` + `helpers-hardening-fixtures.ts` cover helpers without duplicating deterministic helpers.

### Fixture Infrastructure Created

- ✅ `_bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts` (new, 310 lines) — deterministic helpers `scriptedRng`/`scriptedSpyRng`/`drawBudgetForEffectiveMove`/`drawBudgetForNewGame`/`effectiveMoveRng`/`newGameRng20` + `boardForTest`/`happyPathBoard`/`noopBoard` + `STRIP_FIXTURES` 8 I/O rows + `stripCommentsPreserves`/`scannerDelegationOk`/`docHasRegexLimitation`/`extractSpecifiersStillWorks` + `effectiveMoveSucceedsWith3`/`newGameHas9TilesWith20` + `ledgerDoneCount`/`stripCommentsBench` + `sfx` re-exports for extending without touching `__tests__/`.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` (reused, 69 lines, created in 8-1 automate) — kept for helpers hardening.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts` (reused, 133 lines, created in 8-4 automate) — kept.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts` (reused, 223 lines, created in 8-5 automate) — kept.
- ✅ `_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts` (reused, 198 lines, created in 8-6 automate) — kept.
- ✅ `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts` (new, 310 lines, 13 cases P0/P1/P2) — TEA API gateway contract under `test_artifacts/tests/api` per TEA `test_artifacts` config + `api-testing-patterns.md` (host gateway, not HTTP). Validates rngOf/spyRng throw, string-safe, factory, doc, scanner delegation, draw-budget 3/20, ledger, allowlists.
- ✅ `_bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts` (new, 268 lines, 7 journeys P1/P2/P3) — TEA E2E journeys under `test_artifacts/tests/e2e` per TEA config + `selector-resilience.md` (adapted for RN: journeys are `E2E_JOURNEYS` map with `priority`/`ac`/`risk`/`steps`/`hostGate`, not `page.goto`). Host-verifiable, no device lane.
- ✅ No new fixture file for SDK/width guards beyond `helpers-hardening-fixtures.ts:scannerDelegationOk` + `stripCommentsBench` — ATDD source-structure scans in `helpers.hardening.atdd.test.ts` P1-06/P2-01..04 remain the gate for ledger/predicate/scope.

### Mock Requirements

- **Module:** `triade/test-utils/helpers.ts` (`rngOf`/`spyRng`/`stripComments`/`defaultPendingSpawn`/`extractSpecifiers`) + `triade/src/engine` (`newGame`/`move`/`mulberry32`) — **no mock for P0/P1 host** beyond injectable `Rng` seam — `Rng` is host data contract (`rngOf(0,0,0.5)` 3-draw + `rngOf(0,0,9×0,9×0.5)` 20-draw + `exhausted after N` throw + `stripCommentsInternal` `false`/`true` toggle + `defaultPendingSpawn` single-source); source-structure scans (`helpers.ts` contains `stripCommentsInternal` 3-site + `Known limitation — regex` doc + no `return 0.5` fallback); scanner suites validate actual tripwire stays green.
- **Module:** `expo-*` / `reanimated` / `skia` — no mock needed; helpers hardening seam is pure TS (`node:test` + `tsx` only, no `react-native` mount).
- **Overrides factory:** none — `STRIP_FIXTURES` I/O matrix 8 rows + `boardForTest` + `effectiveMoveRng`/`newGameRng20` is deterministic (no `faker`).

### Summary Statistics

```
✅ Test Generation Complete (SEQUENTIAL — host-dominated, no subagent overhead)

📊 Summary:
- Stack Type: frontend (Expo RN SDK 57, node:test + tsx, Reanimated 4 + Skia 2.6.2)
- Total Tests in scope (dw-test-scanner-helpers-hardening): 20 ATDD + 13 API + 7 E2E = 40 TEA traces + 64 migrated suites = 104 host checks inc. traceability
  - Shipped baselines (existing, aggregated): game.test.ts 32 + transitionPlan.test.ts 12 + gesture-pipeline.test.ts 5 + adaptive-spawn-integration.test.ts 15 = 64 (Unit, P0)
  - Scanner guards (existing, aggregated): engine.purity.test.ts + ui.norolls.test.ts = 2 suites (Integration, P0) — P0 scanner green
  - ATDD source `helpers.hardening.atdd.test.ts`: 20 (Unit/Integration/Static/Bench, P0/P1/P2/P3, GWT) — I/O matrix 7 rows + draw-budget + factory + scanner delegation + static scans + bench (20 skip dormant → 20 pass when activated, ~366ms)
  - TEA API `tests/api/helpers.hardening.gateway.spec.ts`: 13 (Integration host, P0/P1/P2) — gateway contract mirror of ATDD but under test_artifacts/tests/api per TEA config (rngOf/spyRng throw, string-safe, factory, doc, scanner delegation, draw-budget 3/20, ledger, allowlists)
  - TEA E2E `tests/e2e/helpers.hardening.umbrella.spec.ts`: 7 journeys (P1 4 / P2 2 / P3 1) — E2E_JOURNEYS map for traceability (scanner preserved + draw-budget + ledger/factory + full sweep + static allowlists + regex residual + bench/scope, host-verifiable)
  - Fixtures (TEA): helpers-hardening-fixtures.ts 310 lines + feel-trace-fixtures.ts 69 lines + feel-bullet-time-fixtures.ts 133 lines + feel-reduced-motion-fixtures.ts 223 lines + feel-sfx-fixtures.ts 198 lines — deterministic, no faker, TEA fixtures per data-factories.md
- ATDD status on working-tree (+fixtures/gateway/umbrella): 20 GREEN when activated / 0 RED (no deferred mastering — helpers hardening is fully GREEN, unlike SFX which has P2-06 RED)
  - P0 (Critical): 7 groups (P0-01..08 inc. scanner green) — 100% GREEN (8 it + 2 scanner suites → P0 host 100%)
  - P1 (High): 6 groups — 100% GREEN (P1-01..06 host + 4 E2E P1 journeys GREEN, host-verifiable)
  - P2 (Medium): 4 checks — 100% GREEN (P2-01..04 allowlists + template interp + quote-in-regex)
  - P3 (Low): 2 checks — 100% GREEN (scope guard + bench 1000×10k <500 ms)
- Full suite host gate (including carry-over from 8-1..8-6 deferred): depends on full 8-1..8-6 carry-over RED context, but for this delta alone: 20 + 13 + 7 + 64 + 2 scanner suites = 106 host checks all GREEN (100% if deferred mastering waived for prior stories)
- With dw ATDD + gateway + umbrella, P0 100% host required is met (all 8 ATDD P0 + gateway P0 7 + scanner 2 are GREEN); P1 ≥95% host is met (6/6 ATDD P1 host GREEN + 4 E2E P1 GREEN → 100% host)
- Fixtures Created: 1 new file this run (helpers-hardening-fixtures.ts 310 lines) + 4 reused (feel-trace 69 + bullet 133 + reduced 223 + sfx 198) — deterministic, no faker, TEA fixtures per fixture-architecture.md + data-factories.md
- Priority Coverage (ATDD 20):
  - P0: 8 tests
  - P1: 6 tests (source-gate/integration host, P1-01..06 green)
  - P2: 4 tests (P2-01..04 scans green)
  - P3: 2 tests (P3-01/02 green)
- TEA artifact priority (api 13 + e2e 7 journeys = 20 TEA):
  - P0: 7 (api 7 P0 — rngOf/spyRng/string-safe/factory/doc/delegation/specifiers)
  - P1: 4 (api 4 P1 — draw-budget 3/20 + calls exact + ledger)
  - P2: 2 (api 2 P2 — no 0.5 fallback + single parser allowlist)
  - P3: 0 (bench/scope in e2e umbrella P3)
- Test files (this automate run):
  - Shipped: triade/__tests__/engine/game.test.ts (32) + render/transitionPlan.test.ts (12) + ui/gesture-pipeline.test.ts (5) + engine/adaptive-spawn-integration.test.ts (15) + engine.purity.test.ts + ui.norolls.test.ts (2) — guards (existing, aggregated reference)
  - ATDD:    triade/__tests__/test-utils/helpers.hardening.atdd.test.ts (20 host scaffolds, P0/P1/P2/P3, GWT, no Playwright — source of truth, existing but aggregated)
  - TEA API: _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts (13 gateway contracts, host ~18ms GREEN)
  - TEA E2E: _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts (7 journeys, P1/P2/P3, host-verifiable)
  - TEA Fix: _bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts (new TEA helper, deterministic engine + scanner helpers, 310 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts (TEA helper, 69 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-bullet-time-fixtures.ts (TEA helper, 133 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts (TEA helper, 223 lines)
  - TEA Fix (reused): _bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts (TEA helper, 198 lines)

🚀 Performance: baseline (sequential host ATDD 20 pass when activated ~366ms + gateway ~18ms + umbrella ~80ms + game.test 32 ~80ms + full suite ~5.8s; no parallel gain needed for pure surface; bench stripComments 1000×10k <500 ms smoke proves host helpers median <0.05 / p99 <0.1)
```

📂 Generated Files (this automate run):
- _bmad-output/test-artifacts/automation-summary.md (this file, canonical — per _bmad/tea/config.yaml test_artifacts + test_design_output)
- _bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts (new helper, TEA fixtures — deterministic helpers, 310 lines)
- _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts (new, TEA API gateway, 13 cases, host GREEN ~18ms)
- _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts (new, TEA E2E journeys, 7 journeys, P1/P2/P3, host-verifiable)
- triade/__tests__/test-utils/helpers.hardening.atdd.test.ts (existing ATDD, aggregated — 20 host scaffolds, P0/P1/P2/P3, GWT, no Playwright — source of truth, not generated by this automate run)
- triade/__tests__/engine/game.test.ts + render/transitionPlan.test.ts + ui/gesture-pipeline.test.ts + engine/adaptive-spawn-integration.test.ts (existing migrated draw-budget suites — aggregated reference, not generated by this automate run)
- triade/__tests__/engine/engine.purity.test.ts + __tests__/ui/ui.norolls.test.ts (existing scanner tripwires — aggregated reference)

Knowledge fragments used: test-levels-framework, test-priorities-matrix, data-factories, selective-testing, ci-burn-in, test-quality, risk-governance, probability-impact, nfr-criteria, fixture-architecture, api-testing-patterns, selector-resilience
```

---

## Step 4 — Validate & Summarize

### Validation against `checklist.md`

| Checklist Section | Status | Evidence |
|-----------------|--------|----------|
| **Execution mode determined** | ✅ | Frontend `auto→sequential` (no subagent/agent-team in opencode); BMad-integrated context (spec+test-design+ATDD for dw-test-scanner-helpers-hardening, 5 ACs, I/O matrix 7 rows, baseline `1fb45ca`→HEAD working-tree). Mode `auto` from `_bmad/tea/config.yaml` `tea_execution_mode:auto` + probe `true` → `sequential`. Working-tree delta assessed as working-tree vs `1fb45ca` (metadata-only uncommitted diff `deferred-work.md` DW done + `test-utils/helpers.ts` hardening owned by this sweep — correctly not treated as defect; `sprint-status.yaml` untouched per prompt). |
| **Stack auto-detected** | ✅ | `triade/package.json` React+RN+Expo+Skia+Reanimated → frontend; `node:test`+`tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — host harness correct, no Playwright `playwright.config.ts` needed for pure `helpers.ts` delta. `tea_use_playwright_utils:true` host-adapted (no `page.goto`). |
| **Targets identified (no duplicate coverage)** | ✅ | 20 targets P0/P1/P2/P3 mapped (see Step 2 table) — `rngOf`/`spyRng` throw, `stripComments` string-safe `http://`+`/*`+escaped-quote, `defaultPendingSpawn` fresh, regex doc `Known limitation — regex`, scanner `engine.purity`/`ui.norolls` green, draw-budget `3`+`20`, ledger `resolution-undo` — no duplicate with 8-1..8-6 (adds `helpers.ts` as helper gateway seam). |
| **Prioritized suites generated** | ✅ | `helpers-hardening-fixtures.ts` (310 lines deterministic, no faker) + `helpers.hardening.gateway.spec.ts` (13 cases host ~18ms) + `helpers.hardening.umbrella.spec.ts` (7 journeys P1/P2/P3) — prioritized `P0 8 > P1 6 > P2 4 > P3 2`, host-first + static scans per `test-priorities-matrix.md` / `risk-governance.md` (3 high score 6 mitigated). |
| **Fixtures, factories, helpers** | ✅ | `helpers-hardening-fixtures.ts` deterministic — `STRIP_FIXTURES` 8 I/O rows + `effectiveMoveRng`/`newGameRng20` + `scannerDelegationOk`/`stripCommentsBench` — no `@faker-js/faker`, no Playwright `test.extend()`, per `data-factories.md` + `fixture-architecture.md`. |
| **API/E2E tests and fixtures under TEA `test_artifacts`** | ✅ | `_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts` (TEA API) + `tests/e2e/helpers.hardening.umbrella.spec.ts` (TEA E2E) + `fixtures/helpers-hardening-fixtures.ts` all under `_bmad-output/test-artifacts` per `_bmad/tea/config.yaml:6` `test_artifacts: "{project-root}/_bmad-output/test-artifacts"` — not random locations. |
| **CLI sessions cleaned up** | ✅ | No Playwright CLI sessions launched (`tea_browser_automation:auto` host-adapted, no `playwright-cli -s=tea-automate open`); no orphaned browsers. |
| **Test quality and structure** | ✅ | `helpers.hardening.atdd.test.ts` 20 `it.skip` RED-phase scaffolds (GWT comments, one behavioural pin per `it`, determinism via `rngOf` exact draws, isolation via `emptyBoard`) + `gateway.spec.ts` 13 `describe`/`it` with `priority` tags (`[P0]`/`[P1]`/`[P2]`) per `test-quality.md` + `test-levels-framework.md` Unit vs Integration (scanner) vs Static scans. |
| **Coverage mapping** | ✅ | P0 100% (8 ATDD P0 + 7 gateway P0 + 2 scanner suites GREEN), P1 ≥95% (6/6 ATDD P1 + 4 E2E P1 GREEN → 100%), P2/P3 ≥90% (4/4 + 2/2 GREEN). NFRs mapped (fail-fast vs never-throw, single parser, scanner green, bench <1 ms). |
| **Output polished (no duplication)** | ✅ | This document consolidates prior `8-6-sfx-haptics` automation-summary (now superseded for this delta) into the dw-specific summary — no repeated sections, tables aligned, headers consistent, `stepsCompleted` frontmatter accurate, `inputDocuments` pinned to dw sources. |

### Definition-of-Done Summary (TEA — `dw-test-scanner-helpers-hardening`)

**Per task prompt:** prioritized API/E2E tests + fixtures for changes in working tree, plus DoD summary, under TEA's `test_artifacts` dir. Engine is byte-identical, helpers hardening is fully GREEN (no deferred RED unlike SFX P2-06).

| DoD Criterion | Target | Evidence | Status |
|---------------|--------|----------|--------|
| **P0 — Critical helper contracts** | 100% (8 ATDD P0 + 7 gateway P0 + 2 scanner suites) | `rngOf`/`spyRng` throw with `after N` (P0-01..03) + `stripComments` preserves `http://x` + `a /* b */ c` + `a \"` (P0-04..05) + `defaultPendingSpawn` factory fresh single literal (P0-06) + `Known limitation — regex` doc pin + blanks string in `stripCommentsAndStrings` (P0-07) + `stripCommentsInternal` 3-site + no naive fallback + `engine.purity`/`ui.norolls` green (P0-08) — all `gateway.spec.ts` P0 7 + `umbrella` E2E-01 P1 (scanner tripwire) green. Activated ATDD `sed s/it.skip/it/g` → 20 pass / 0 fail (P0 8/8 green). | ✅ PASS |
| **P1 — Wiring + ledger** | ≥95% (6 ATDD P1 + 4 E2E P1 + 13 gateway inc. P1) | Effective `move(...,rngOf(0,0,0.5))` 3-draw + `rngOf(0,0)` throw (P1-01) + `newGame(...,20 draws) →9 tiles` + short throws (P1-02) + `extractSpecifiers` preservation (P1-03) + explicit tiered pending `{value:9}` (P1-04) + `spyRng` calls exact (P1-05) + `deferred-work.md` ≥5 `done 2026-09-01` + `resolution-undo` 64-hex each + `sprint-status.yaml` untouched (P1-06) — gateway P1 4 + umbrella E2E-02/03/04 all green. `game.test.ts` 32/32 + `transitionPlan` + `gesture-pipeline` migrated 0,0→0,0,0.5 green (~80ms). | ✅ PASS (100%) |
| **P2/P3 — Static + bench hygiene** | ≥90% | `rg -n "return 0\.5|\? 0\.5"` 0 (P2-01) + single parser `stripCommentsInternal` 3 sites + `blank()` newline-preserving (P2-02) + template interp `${}` braces counted (P2-03) + quote-in-regex empty + `Known limitation — regex` pin (P2-04) + cross-cutting `music/RevenueCat` empty (P3-01) + 1000×10k `<500 ms` bench (P3-02, umbrella E2E-07) — gateway P2 2 + umbrella E2E-05/06/07 green. | ✅ PASS (100%) |
| **Fixtures + API/E2E under `test_artifacts`** | 100% per prompt | `_bmad-output/test-artifacts/fixtures/helpers-hardening-fixtures.ts` (310 lines, `STRIP_FIXTURES` 8 rows + budgets `3`/`20` + scanner helpers) + `tests/api/helpers.hardening.gateway.spec.ts` (13 cases, 310 lines, P0/P1/P2) + `tests/e2e/helpers.hardening.umbrella.spec.ts` (7 journeys, 268 lines, P1/P2/P3) all under `_bmad-output/test-artifacts` per `config.yaml:6`. No `sprint-status.yaml` write (orchestrator-owned — verified `git diff --stat` without it, `P1-06` ledger test asserts absent story key). | ✅ PASS |
| **Type gates** | 100% | `npx tsc --noEmit --project triade/tsconfig.json` clean + `TSX_TSCONFIG_PATH=tsconfig.test.json npx tsc --noEmit --project triade/tsconfig.test.json` clean (both via `tsx`/`tsc` 6.0.3). | ✅ PASS (verified `triade/node_modules/.bin/tsc --noEmit` exit 0) |
| **Engine purity + ledger ownership** | 100% | `git diff --stat -- triade/src/engine` empty (engine byte-identical) + `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` ≥5 hits + `rg -n "stripCommentsInternal" helpers.ts` ==3 + `git diff --stat` shows 7 files inc. `deferred-work.md` but not `sprint-status.yaml` — prompt ownership respected. | ✅ PASS |
| **Scanner tripwire green** | 100% | `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts` green (both suites pass) — proves delegation preserved `extractSpecifiers` and `stripCommentsAndStrings` still blanks `http://x` so bare-symbol scan does not false-positive. | ✅ PASS |
| **Working-tree diff respected** | 100% | `git diff` vs `1fb45ca` is exactly helpers.ts + adaptive-spawn local spy + game/transitionPlan/gesture 0,0→0,0,0.5/20-draw + deferred-work.md DW done + test-design-progress.md DW ledger (spec + test-design + checklist already checked in as inputs). No engine/UI/`src/feel` logic change. `sprint-status.yaml` change is orchestrator's own `sprint-status.yaml` `8-6-sfx-haptics` backlog→done bookkeeping — not treated as defect per prompt. | ✅ PASS |

**Overall DoD:** ✅ **DONE** — All `dw-test-scanner-helpers-hardening` hardenings are GREEN on the working tree, API/E2E prioritized tests + fixtures are under `test_artifacts`, type + scanner + static + bench gates pass, ledger + ownership + engine byte-identical invariants hold. No deferred RED (unlike 8-6 SFX P2-06). Ready to mark `verified` (no waiver needed). Next recommended workflow is `test-review` (to validate P0 100% + P1 100% quality) or `trace` (to bind spec AC → helpers seam → scanner suites), then `nfr-assess` if NFR evidence collection is desired (fail-fast vs never-throw already pinned).

**Next workflows:** `*test-review` (validate 20 ATDD + 13 gateway + 7 umbrella quality, fixture determinism, no faker), `*trace` (link `spec-test-scanner-helpers-hardening.md` AC → `helpers.ts` → `engine.purity`/`ui.norolls`/`game.test.ts`), `*nfr-assess` (confirm `reliability — fail-fast vs never-throw` thresholds without inventing metrics).

---

**Generated by BMad TEA Agent** — 2026-09-02 (story `dw-test-scanner-helpers-hardening`, baseline `1fb45ca7437304db468f1193251c0c7560d60dd1` → working tree HEAD, engine byte-identical)

**TEA config:** `_bmad/tea/config.yaml` `test_artifacts: "{project-root}/_bmad-output/test-artifacts"` (`_bmad-output/test-artifacts`), `test_design_output: _bmad-output/test-artifacts/test-design`, `tea_use_playwright_utils:true` (host-adapted, no `page.goto`), `tea_use_pactjs_utils:false`, `risk_threshold:p1`, `communication_language: Português` (doc output English per `document_output_language`)

**Prior automation summaries:** This file supersedes `2026-09-01` `8-6-sfx-haptics` automation-summary for the `dw-test-scanner-helpers-hardening` sweep. Prior TEA artifacts are retained under `fixtures/` (`feel-sfx-fixtures.ts` 198 lines, `feel-trace-fixtures.ts` 69 lines, `feel-bullet-time-fixtures.ts` 133 lines, `feel-reduced-motion-fixtures.ts` 223 lines) and `tests/api/` (`sfx.gateway.spec.ts` 13 cases, `reducedMotion.gateway.spec.ts`, `bulletTime.gateway.spec.ts`) and `tests/e2e/` (`sfx.umbrella.spec.ts` 10 journeys, `reducedMotion.umbrella.spec.ts`, `bulletTime.flash.spec.ts`) — they remain the baseline guards; this run adds `helpers-hardening-fixtures.ts` + `helpers.hardening.gateway.spec.ts` (13) + `helpers.hardening.umbrella.spec.ts` (7) for the dw bundle.
