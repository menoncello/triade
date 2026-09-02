---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/test-utils/helpers.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/ui/gesture-pipeline.test.ts'
  - 'triade/__tests__/ui/ui.norolls.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-test-scanner-helpers-hardening — Test-tooling scanner & RNG helpers hardening

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep bundle deep-dive for `dw-test-scanner-helpers-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-test-scanner-helpers-hardening`

> **Delta under assessment:** Working-tree `git diff` vs baseline `1fb45ca7437304db468f1193251c0c7560d60dd1` (`spec-test-scanner-helpers-hardening.md` `baseline_revision`). HEAD is `1fb45ca` (after `chore(sweep): close resolved deferred-work entries`); production engine is byte-identical (`git diff --stat -- triade/src/engine` empty). The sweep resolves DW-3 / DW-48 / DW-59 / DW-60 / DW-66 to `done` via `deferred-work.md` status updates and hardens the test helpers + one local spy:
> - `triade/test-utils/helpers.ts` — `rngOf(...values)` now throws `rngOf exhausted after N scripted draw(s) — …` when `i >= values.length` instead of returning `0.5`; `spyRng(...values)` same contract (shared, single source for draw-budget pins); `gameState(board, pendingSpawn = defaultPendingSpawn())` with exported `defaultPendingSpawn(): PendingSpawn { return { value: 1, displayRoll: 0 } }` replacing anonymous `{ value: 1, displayRoll: 0 }` literal; `stripComments(source)` now delegates to `stripCommentsInternal(source, false)` (shared `code/line/block/single/double/template/interp` scanner that respects string/template literals and preserves their contents intact, only blanking comment bodies) while `stripCommentsAndStrings(source)` delegates to `stripCommentsInternal(source, true)` (same scanner but `blankStrings=true` blanks string/template contents); both preserve newline-length; `stripCommentsAndStrings` doc expanded to describe regex-literal mode-desync blast radius (quote inside `/it's/` flips into string mode, blanks subsequent source, false NEGATIVE on `ui.norolls` guard; no current scanned view/service file contains such pattern; proper fix deferred — requires real lexer for division-vs-regex disambiguation)
> - `triade/__tests__/engine/adaptive-spawn-integration.test.ts` — local `spyRng` hardened to throw (was `calls.push(v === undefined ? 0.5 : v)`)
> - `triade/__tests__/engine/game.test.ts` — effective-move `rngOf(0,0)` → `rngOf(0,0,0.5)` (3-draw budget: `pickIndex` + `resolveSpawn` + `displayRoll`), `newGame` `rngOf(0,0, 9×0, ...)` → `rngOf(0,0, 9×0, 9×0.5)` i.e. 20 draws (`9 pickIndex` + `9 weightedValue` + `1 resolveSpawn` + `1 displayRoll`); `transitionPlan.test.ts` and `gesture-pipeline.test.ts` same `rngOf(0,0)→rngOf(0,0,0.5)` hardening (20+ sites)
> - `deferred-work.md` — DW-3 / DW-48 / DW-59 / DW-60 / DW-66 flipped `status: open` → `status: done 2026-09-01` + `resolution: resolved by sweep bundle dw-test-scanner-helpers-hardening` + `resolution-undo` hash; all other DW entries unchanged
> - No engine, UI, or `src/feel` logic change; `extractSpecifiers` / `extractNamedImports` continue to consume `stripComments(source)` (now comment-only) and still see real import specifiers; `mulberry32` / `runSeededSession` / `oppositeEdgeCandidates` untouched

---

## Executive Summary

**Scope:** Hardening the test-tooling helpers that underwrite the scanner tripwires (`ui.purity` / `thin-view` / `ui.norolls`) and the engine draw-budget contracts (`move()` 3-draw, `newGame` 20-draw). Before the sweep a sub-provisioned `rngOf(0,0)` for an effective move silently served `0.5` on the third `displayRoll` draw (producing a deterministic `1`-spawn and hiding under-budget drift), a URL-bearing string `const u="http://x"; // cmt` was corrupted by `stripComments` naive regex, and `gameState()` hid an anonymous magic `{1, 0}` driving two dozen assertions without ever exercising the realistic `pendingSpawn` flow. The sweep makes every helper fail-fast (throw with count) except the engine itself (which stays never-throw), preserves string contents through `stripComments`, exposes the magic as `defaultPendingSpawn()`, and documents the remaining regex-literal limitation as an acknowledged false-NEGATIVE risk with zero current blast radius.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (fail-fast budget + single scanner parser + draw-budget drift), BUS/TECH (scanner false-positive/negative on purity tripwires), OPS (deferred regex lexer gap)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit, pure helper layer — `rngOf`/`spyRng` throw + `stripComments` string-safe + `defaultPendingSpawn` identity + scanner guards green)
- P1 scenarios: 6 groups (engine→helper draw-budget fixtures + scanner pair `ui.norolls`/`engine.purity` + `gameState` factory wiring + `extractSpecifiers` preservation)
- P2/P3 scenarios: 7 groups (static grep gates for no `0.5` fallback / no magic literal / no duplicate parser + regex-literal doc scan + exploratory sweep for quote-in-regex)
- **Total effort**: ~5–9 hours (~0.7–1.2 days; host-only, no device lane)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score rules, `pendingSpawn`/`previewFor`/`undo`/`transitionPlan.ts:classify`, `spawn.ts` draw counts (3 effective / 20 newGame)** | Engine is byte-identical (`git diff --stat -- triade/src/engine` empty) and pure; sweep only changes the test harness that observes it. Draw-count contracts are pinned by existing engine tests, not re-derived here. | Engine invariants stay gated by 695+ existing tests + `git diff` empty check in this plan. Draw budgets are exercised via P1 fixtures, not re-implemented. |
| **`mulberry32`, `runSeededSession`, `oppositeEdgeCandidates`, `sigmaBound`, `assertNoLeak`, `preSpawnBoardOf`** | Untouched helpers; `runSeededSession` determinism and `sigmaBound` windows shared with 2.6+7.1 suites are not changed. | Existing suites remain gate; this plan only verifies they keep passing after fail-fast hardening. |
| **Real regex lexer for division-vs-regex disambiguation** | Explicitly deferred in spec: "Never introduce a real lexer for regex literals; silently alter imported specifier extraction semantics so purity guards break on the clean codebase" — Block If. Document only. | R-003 / R-009 capture the known false-NEGATIVE mode-desync; scanner stays green on the clean codebase (no current file contains `/'/` with quote). Proper lexer tracked as deferred work, not threshold. |
| **Production UI / feel / Skia / Reanimated / gesture wiring beyond `gesture-pipeline.test.ts` busy-gate** | Only `gesture-pipeline.test.ts` was touched (padding `0.5`); no App/GameBoard/feel logic changed. | Epic 8 feel suites remain gate; this plan does not re-test them. |
| **Deferred-work ledger edits beyond DW-3/48/59/60/66 status flips** | `deferred-work.md` already lists 80 entries; only 5 move to `done` this sweep, each with `resolution-undo` hash for reversibility. | Other DW entries (e.g. `boardSize` clamp, `ceilingDetector`, `pickIndex` NaN guards) remain `open`/`already resolved` and are not re-triaged here. |
| **`benchmark` script timing-sensitive lanes** | `package.json` `test`/`benchmark` scripts unchanged; benchmark lane is not part of this hardening. | No extra gate; host `npm test` stays `<15 min`. |
| **RevenueCat / AdMob / IAP / Epic 10-11 monetization** | No monetization code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `rngOf(...values)` and both `spyRng` variants are pure scripted draws with exact `calls` recording; `defaultPendingSpawn()` is a zero-arg factory; `stripComments`/`stripCommentsAndStrings` share one `stripCommentsInternal(source, blankStrings)` scanner with `blankStrings=false/true` toggle — every helper is host-testable without `expo-*` or device. `gameState(board, pendingSpawn?)` defaults via the factory so callers can inject any `PendingSpawn` for realistic `pendingSpawn` flow.

**Observability — Good.** Throw messages name the exhausted count (`after N scripted draw(s) — the engine drew more than expected`) and stack traces point to the exact `rngOf`/`spyRng` call site; `stripComments` output is length-preserving (newlines kept) so diffing `source` vs `cleaned` is trivial; scanner consumers (`extractSpecifiers`, `extractNamedImports`) expose specifier arrays directly for host assertions.

**Reliability — Strong (helpers throw, engine does not).** Engine stays never-throw (`pickIndex`/`weightedPicker` NaN guards + `spawnTile` empty-pool guard); helpers intentionally throw on misuse so a sub-provisioned budget cannot hide behind a silent `2`. `stripCommentsInternal` is `Number.isFinite`-free by design (it never touches RNG) and restores the prior length-preserving contract.

**Testability Risks:** Two surfaces are thin: (a) `stripCommentsInternal` in `blankStrings=false` mode must not blank string contents — a regression that blanks would re-corrupt URLs and hide imports; mitigated by `extractSpecifiers` preservation pin. (b) Draw-budget hardening is a literal `0.5` padding per effective move — a future engine draw-count change (e.g. `resolveSpawn` needing 2 draws for tier≥1 before 2.6) would make the `3` budget stale; mitigated by the exact `calls.length` exhaustion throw.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Fail-fast regression — unmigrated `rngOf`/`spyRng` site still provisioned with 2 draws for an effective `move()` now throws.** Sweep patched 4 files (`game.test.ts` 20+ sites, `transitionPlan.test.ts` 15 sites, `gesture-pipeline.test.ts` 5 sites, `adaptive-spawn-integration.test.ts` 1 local spy). Any other suite that calls `move(state, dir, rngOf(0,0))` for an effective move (e.g. a new `spawn-placement` scenario, a future `preview-invariant` case, or a copy-pasted fixture) now throws `rngOf exhausted after 2 scripted draw(s)` instead of silently returning `0.5` and materializing value `1`. CI goes RED on a previously-green suite with a message that looks like a product bug. Spec says blocks if existing tests would need re-baselining beyond the hardening contract — but the block is intentional: the silent `0.5` hid draw-budget drift. | 2 | 3 | **6** | Enforce 3-draw contract: (a) **host sweep** `rg -n "rngOf\([^)]*\)" triade/__tests__ --include="*.ts"` → every effective-move site must pass `rngOf(0, 0, 0.5)` (or `spyRng(...,0.5)`) — `rg -n "rngOf\(0, ?0\)" triade/__tests__/engine/game.test.ts` must be empty; (b) **static grep gate** `rg -n "return 0\.5\| \? 0\.5 :" triade/test-utils/helpers.ts` must be empty outside `defaultPendingSpawn` (no fallback literal remains); (c) **CI gate** `npm --prefix triade test` stays green — the 20-site patch already proves `game.test.ts`/`transitionPlan`/`gesture-pipeline` green after hardening; any new throw is a true budget pin, not a flake (fix by adding the `0.5` displayRoll pad). | FE lead | Immediate (gate this sweep; protects `move()` 3-draw + `newGame` 20-draw invariants) |
| R-002 | TECH | **Single-parser drift — `stripCommentsInternal(source, false)` for `stripComments` regresses and starts blanking string/template contents, corrupting `extractSpecifiers` or hiding purity imports.** Before sweep `stripComments` was naive `/\/\*[\s\S]*?\*\//` + `/\/\/.*$/gm` regex; after sweep it shares the same `code/line/block/single/double/template/interp` state machine as `stripCommentsAndStrings` but with `blankStrings=false` (preserve `out += ch` instead of `blank(ch)`). Risk: a later edit copies the `case 'double': blank(ch)` branch into the `false` path, or mishandles the `ch === '\\'` escape (`out += ch; if(next) out += next` vs `out += '  '`), causing `const u="http://x"; // cmt` to blank to `const u="          "; ` and `extractSpecifiers('import Foo from "bar" // cmt')` to miss `bar` because the quoted specifier was blanked. Purity guards (`engine.purity.test.ts` `FORBIDDEN_PREFIXES`) would then false-pass on a future `import { spawnTile }` that was blanked away. | 2 | 3 | **6** | Pin the dual mode: (a) **host unit** `stripComments('const u="http://x"; // cmt') === 'const u="http://x";       '` preserves URL and strips only the `// cmt` (existing spec AC) + `stripComments("const s='a /* b */ c'; /* real */")` preserves `'a /* b */ c'` and strips only `/* real */` (second AC); (b) **specifier preservation pin** `extractSpecifiers('import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */')` still returns `["bar","qux"]` after sweep (proves `stripComments` kept string contents); (c) **grep allowlist** `rg -n "stripCommentsInternal" triade/test-utils/helpers.ts` shows exactly 3 sites (`export stripComments → false`, `export stripCommentsAndStrings → true`, `function stripCommentsInternal`) — any inline regex fallback reintroduces DW-3 is a fail; (d) **escape pin** `stripComments('const s="a \\" // not comment"; // real')` keeps `a \"` intact. | FE | Immediate |
| R-003 | TECH | **Scanner false NEGATIVE via regex-literal mode-desync — `stripCommentsAndStrings` blanks subsequent source after `/'/` quote.** Doc already expanded: `stripCommentsAndStrings` treats regex literals as plain code (no division-vs-regex disambiguation); a quote/apostrophe inside a regex like `const re=/it's/; import { roll } from 'x'` flips the state machine into `'single'` string mode and blanks everything until the next `'` is seen, hiding the `roll` import from the `ui.norolls` guard (`src/ui` must not roll/spawn). Current blast radius is zero (no such pattern in any scanned view/service file per spec), but a future view that adds `const pat=/\"hi\"/ ` would silently make `ui.norolls` green while the file actually imports forbidden symbols. Spec forbids introducing a real lexer now — document only, so the risk is acknowledged residual. | 2 | 3 | **6** | Contain residual: (a) **doc pin** `stripCommentsAndStrings` JSDoc contains `Known limitation — regex literals: … flips the state machine into string mode … false NEGATIVES in the ui.norolls structural guard … No such pattern exists … proper fix requires lexer-grade regex detection` (already landed — verify via `rg -n "Known limitation — regex" triade/test-utils/helpers.ts`); (b) **clean-codebase scan** `rg -n "/[^/]*'[^/]*/" triade/src/ui triade/src/services --include="*.ts" --include="*.tsx"` must be empty (no regex with embedded quote); (c) **guard complement** keep `rg -n "from\.length.*spawned\|spawnTile\|weightedValue\|resolveSpawn" triade/src/ui` already empty per `ui.norolls` — the false-NEGATIVE only matters if someone adds a regex with quote, so the doc is the gate. | FE | Immediate (deferred lexer tracked as deferred work, not NFR threshold) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Draw-budget literal `0.5` padding is data, not contract — future engine draw-count change makes `rngOf(0,0,0.5)` stale.** `game.test.ts`/`transitionPlan`/`gesture-pipeline` pad every effective move with `0.5` (the old silent fallback value) for the `displayRoll` slot. If `move()` ever consumes 4 draws (e.g. `resolveSpawn` split back into 2 for tiered pot), every `rngOf(0,0,0.5)` would exhaust at 3 and throw, even though the test intent was correct — the suite fails on a product change that is not a helper bug. | 2 | 2 | 4 | Keep budget explicit: prefer `rngOf(0, 0.5 /* displayRoll */)` with comment or central `effectiveRng()` helper once a second caller needs it; for now the 3-draw literal is the contract (documented in `game.ts:53-64` plus `helpers.ts` throw message `after N`). On any `spawn.ts` draw-count change, bump all `rngOf(0,0,0.5)` → `rngOf(0,0,0.5,0.5)` in the same commit (treat as atomic). |
| R-005 | TECH | **`defaultPendingSpawn()` factory identity vs literal `1/0` drift.** `gameState(board)` previously defaulted to `{ value: 1, displayRoll: 0 }` literal; now it defaults to `defaultPendingSpawn()` and the literal only lives inside the factory. Risk: a future caller does `assert.deepStrictEqual(state.pendingSpawn, { value: 1, displayRoll: 0 })` (still green) but another does `state.pendingSpawn === defaultPendingSpawn()` reference check (always false — factory returns a new object) or mutates the returned object and expects `gameState(board)` next call to reflect the mutation (it does not — fresh object). | 1 | 3 | 3 | Pin identity: (a) **host** `gameState(emptyBoard()).pendingSpawn` deep-equals `defaultPendingSpawn()` but is not `===` (fresh object) — `sweep` already added `export function defaultPendingSpawn()` and wired `gameState(board, pendingSpawn = defaultPendingSpawn())`; (b) grep `rg -n "value: 1.*displayRoll: 0" triade/test-utils/helpers.ts` must show exactly one site (inside `defaultPendingSpawn`) — no duplicate literal in `gameState` param default; (c) doc that `gameState` never shares `PendingSpawn` references (each call clones via factory). |
| R-006 | TECH | **`newGame` 20-draw budget assumes fixed `9 + 9 + 1 + 1` layout; `pickIndex`/`weightedValue` helper change could shift count.** `newGame` does `9 × pickIndex(empty.length, rng)` + `9 × weightedValue(rng)` + `resolveSpawn(ceiling, rng)` + `displayRoll rng()` = 20. If `empty.length` tie-break or `weightedValue` tier plumbing changes draw count, the `rngOf(0,0, 9×0, 9×0.5)` patch in `game.test.ts` would exhaust at 20 and throw on a correct new board. | 1 | 3 | 3 | Keep `newGame` budget pinned by a single integration pin: `game.newGame(rngOf(...20 values)).board` has 9 tiles and `gameState` carries `value` from the 19th draw — the existing `newGame returns a board with exactly 9 starting tiles` test already provides this; on any `spawn.ts: weightedValue` draw-count change, update the `rngOf` literal together with the engine commit. |
| R-007 | BUS | **Purity/thin-view tripwire false-pass if `stripComments` regresses to regex — future `src/render` file with `const url="http://x"` would have its URL's `//` mis-stripped and trailing code hidden.** Same root as R-002 but impact is on `engine.purity.test.ts` `PURITY_FILES`/`FORBIDDEN_PREFIXES` rather than specifier extraction. A file that adds `import { something } from 'x' // comment with http://` could have the import blanked if `stripComments` still uses `/\/\/.*$/gm`. | 2 | 2 | 4 | Same pins as R-002 plus **purity gate** `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts` stays green on the clean codebase (already required by spec `scanner continues to pass`). Any future file that embeds `//` in a string and was previously false-passing will now correctly pass only when the string-safe `stripComments` is used. |
| R-008 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — sweep marked 5 DW entries `done` with a 64-hex `resolution-undo` hash; orchestrator's `sprint-status.yaml` is owned by the orchestrator and must not be reverted.** A follow-on `sweep` that reopens a DW entry without preserving the `resolution-undo` hash would lose the revert trail. | 1 | 2 | 2 | Ledger already records `resolution-undo: d03bd196… 2026-09-01 73746…` per entry; any reopen must keep the hash. `sprint-status.yaml` is orchestrator-owned per prompt — this plan never writes it. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Template/interp escape handling edge — `stripCommentsInternal` in `blankStrings=true` blanks `\\` as `'  '` but in `false` preserves `ch` + `next`.** A source like `` const s=`hi \${a ? "x" : "y"} // cmt` `` must preserve the `${}` boundary and the `// cmt` comment. The two `if(blankStrings)` branches already diverge correctly, but a future refactor that collapses them would regress either `stripComments` (corrupt escapes) or `stripCommentsAndStrings` (leak string contents). | 1 | 2 | 2 | Monitor — keep the `if(blankStrings)` branch split as landed; host already pins `stripComments('const s="a \\" // not comment"; // real')` and the sweep's `blankStrings` toggle is grep-pinned (R-002). No gate. |
| R-010 | DATA | **Magic default realism — `defaultPendingSpawn()` still returns `{1,0}` which never exercises the realistic tiered `pendingSpawn` flow; two dozen migrated assertions still run with `value:1`.** `gameState()` factory makes the magic explicit but does not change its value; realistic pending flow (tiered `resolveSpawn`) is still only covered by the `runSeededSession` / `adaptive-spawn-integration` suites, not by the 20+ `game.test.ts` cases that default. | 1 | 1 | 1 | Monitor — keep factory as landed (`export function defaultPendingSpawn()`), encourage new tests to pass explicit `pendingSpawn` (`gameState(board, { value: 9, displayRoll: 0 })`) when exercising tiered behaviour; no gate needed on existing assertions. |

### Risk Category Legend

- **TECH**: Technical/Architecture (draw budgets, single parser, predicate, never-throw vs throw, purity guards)
- **SEC**: Security — none this sweep (no auth/data exposure; `stripComments` is test-only)
- **PERF**: Performance — none standalone (helpers are `<1 ms`; no bench lane)
- **DATA**: Data Integrity — `defaultPendingSpawn` literal realism (R-010)
- **BUS**: Business Impact — tripwire false-pass would ship forbidden roll/spawn imports into `src/ui` (R-007)
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-test-scanner-helpers-hardening` touches the **test-tooling seam only**: **reliability/fail-fast** (helpers throw, engine never throws), **maintainability (single `stripCommentsInternal` + single `defaultPendingSpawn` literal + single 64-hex `resolution-undo`)**, **60 FPS/never-throw budget unchanged** (helpers <1 ms, no worklet), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — fail-fast vs never-throw | Engine `move()`/`newGame()`/`spawnTile()`/`pickIndex`/`weightedPicker` never throw (empty pool → `nulls`+0 draws, NaN → index 0 clamp, `moved:false` → no spawn). Helpers `rngOf`/`spyRng` throw `exhausted after N` when `i >= values.length`; `stripComments`/`stripCommentsAndStrings` never throw on any source (empty, unterminated string, unterminated `/*`). | R-001, R-004, R-006 | Unit negative-path sweeps: `rngOf(0.1)()` twice → throw on second; `spyRng(0.1)()` twice → throw; `spyRng()` local variant same; `stripComments('')`, `stripComments('/* unterminated')`, `stripComments('"unterminated')` never throw; engine `move()` with `mulberry32` never throws across 500 moves via `runSeededSession`. | `triade/__tests__/engine/adaptive-spawn-integration.test.ts` local `spyRng` throw branch + `triade/__tests__/engine/game.test.ts` `newGame`/`move` green + `npm --prefix triade test` (full) timing `<15 min` + `npx tsc --noEmit` clean |
| Maintainability | Single parser: `stripCommentsInternal(source, blankStrings)` only definition of the `code/line/block/single/double/template/interp` state machine; `stripComments` = `false`, `stripCommentsAndStrings` = `true`; `defaultPendingSpawn()` single literal `{ value: 1, displayRoll: 0 }`; merge predicate stays `!spawned && from.length===2` (no new site added) — still 4 feel sites + `transitionPlan` = 5 allowlist; `resolution-undo` 64-hex hash per resolved DW entry is single revert trail. | R-002, R-005, R-007, R-008 | Static-assert: `rg -n "stripCommentsInternal" triade/test-utils/helpers.ts` ==3 sites; `rg -n "value: 1.*displayRoll: 0" triade/test-utils/helpers.ts` ==1 site (inside `defaultPendingSpawn`); `rg -n "return 0\.5" triade/test-utils/helpers.ts` ==0; `rg -n "from\.length.*spawned" triade/src` ==4 feel +1 render; ledger `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` ==5 new entries. | Source scan + `helpers.ts:17-23,67-71,220-299` diff + ledger diff |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Helpers add `<1 ms` per test (pure string scan O(n) + RNG throw path is cold — only on misuse). No new worklet, no `Math.random` in helpers, no `setTimeout`. | R-001 (throw path must not be hot) | Host bench (existing `feel.bench.test.ts` both-profile) already in budget; helpers need no new bench — just verify `npm --prefix triade test` median per helper `<1 ms` (already `<0.1ms` for `stripComments`). | CI `npm test` timing + `feel.bench.test.ts` `median/p99` unchanged + `npx tsc --noEmit` clean |
| Compliance — scanner purity / thin-view / `ui.norolls` | `stripComments` strips only real comments (string/template `//`/`/*` preserved); `stripCommentsAndStrings` blanks both comments and string/template contents (length-preserving) so `ui.norolls.test.ts` bare-symbol scan sees neither false-positive on URL strings nor false-negative on trailing code after a URL. Known residual: regex `/'/` quote false NEGATIVE documented, no current scanned file contains it, proper lexer deferred. | R-002, R-003, R-007, R-009 | Unit: `stripComments('const u="http://x"; // cmt')` preserves URL; `stripComments("const s='a /* b */ c'; /* real */")` preserves inner; `extractSpecifiers('import Foo from "bar"; // cmt')` == `["bar"]`; integration: `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts` green on clean codebase. | `engine.purity.test.ts` + `ui.norolls.test.ts` green + `helpers.ts` JSDoc `Known limitation — regex literals` text + clean-repo scan `rg -n "/[^/]*'[^/]*/" triade/src/ui` empty |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (helpers are pure TS). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. `rngOf exhausted after N` message format is pinned by throw tests, not from PRD; `<1 ms` helper cost is observed, not threshold-invented. If a future sweep introduces a real regex lexer, record its measured scan cost as baseline rather than inventing a threshold (mark UNKNOWN only if no host timing collected).

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-test-scanner-helpers-hardening.md` intent/boundaries/I-O matrix 7 rows, 5 ACs signed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `mulberry32`)
- [ ] Test data available or factories ready (`rngOf`/`spyRng` with 2/3/20-draw budgets + `staticBoard`/`boardWith` + `defaultPendingSpawn()` + `stripComments` source strings with `//`/`/*` inside strings/templates)
- [ ] Feature deployed to test environment (working-tree `helpers.ts` + `adaptive-spawn-integration.test.ts` + `game.test.ts`/`transitionPlan.test.ts`/`gesture-pipeline.test.ts` patched; baseline `1fb45ca` committed)
- [ ] No engine edits (`git diff --stat -- triade/src/engine` empty) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`rngOf`/`spyRng` throw pins + `stripComments` string-safe + `defaultPendingSpawn` identity + `engine.purity`/`ui.norolls` green — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — trace→draw-budget fixtures + `newGame` 20-draw pin + `extractSpecifiers` preservation + `gameState` wiring
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on helper seam; `rg` allowlists for no `0.5` fallback / no magic literal / no duplicate parser green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both hit via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (fail-fast vs never-throw, single-parser maintainability, scanner purity green)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns helper P0 pins, scanner `purity`/`norolls` gates, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `helpers.ts` single parser + `defaultPendingSpawn` factory + `rngOf`/`spyRng` fail-fast contract, draw-budget migration |
| PM | PM | Signs DW-66 regex-literal deferred-lexer residual risk + accepts placeholder `sfx` absence (carry-over) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green

**Criteria**: Blocks helper scam-bypass + high risk (≥6) + no workaround (silent `0.5` or corrupted `//` ships false tripwire)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `rngOf` throws on exhaustion with `after N scripted draw(s)` (first returns `0.1`, second throws) | Unit | R-001 | 1 | QA (done) | `triade/test-utils/helpers.ts:35-46` — `rngOf(0.1)()` twice → `throw /rngOf exhausted after 1/`; `draws` counts only served draws, not attempted overrun; complements the `0.5` fallback removal (`rg -n "return 0\.5" ==0`). |
| AC — `spyRng` (shared) and local `spyRng` (adaptive-spawn) throw on exhaustion with `after N` (both variants) | Unit | R-001 | 1 | QA (done) | `helpers.ts:52-66` shared + `adaptive-spawn-integration.test.ts:16-24` local — both `throw /spyRng exhausted after 0\|N/`; local previously `calls.push(v === undefined ? 0.5 : v)` now `throw`. |
| AC — `stripComments('const u="http://x"; // cmt')` preserves `http://` and strips only `// cmt` (string `//` safe) | Unit | R-002, R-007 | 1 | QA (done) | Spec I/O matrix row 1 — `stripCommentsInternal(source, false)` preserves string contents (`out += ch` not `blank(ch)`); `rg` naive-regex fallback must stay absent. |
| AC — `stripComments("const s='a /* b */ c'; /* real */")` preserves `'a /* b */ c'` and strips only `/* real */` (block-in-string safe) | Unit | R-002 | 1 | QA (done) | Row 2 — same `false` mode; `extractSpecifiers` complement below proves specifier survives. |
| AC — `gameState(board)` defaults to `defaultPendingSpawn()` and factory exported, fresh object per call | Unit | R-005 | 1 | QA (done) | `helpers.ts:17-23` — `gameState(emptyBoard()).pendingSpawn` deep-equals `{ value: 1, displayRoll: 0 }` and `!== defaultPendingSpawn()` (fresh); `typeof defaultPendingSpawn === 'function'` and single literal grep `value: 1.*displayRoll: 0` ==1 site. |
| AC — `stripCommentsAndStrings` doc describes regex-literal quote mode-desync false NEGATIVE (DW-66 blast radius, no current file hit, lexer deferred) | Unit (doc) | R-003 | 1 | QA (done) | `helpers.ts:224-243` JSDoc contains `Known limitation — regex literals … flips the state machine … false NEGATIVES in the ui.norolls structural guard … No such pattern exists … division-vs-regex disambiguation`. Pin via `rg -n "Known limitation — regex"`. |
| AC — `engine.purity` and `ui.norolls` scanner guards stay green on the clean codebase after helper change | Integration (scanner) | R-002, R-003, R-007 | 1 | QA (done) | `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts` green — proves `stripComments` delegation did not break `extractSpecifiers` and `stripCommentsAndStrings` blanking still hides string contents from bare-symbol scan. |

**Total P0**: 7 checks (host unit + 2 scanner suites), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & scanner preservation

**Criteria**: Important helper→engine/scanner wiring + medium/high risk + common `move`/`newGame`/`purity` workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Engine→helper draw-budget fixtures — `move(board, dir, rngOf(0,0,0.5))` effective with `3` draws vs `move(..., rngOf(0,0))` now throws; `newGame(rngOf(0,0, 9×0, 9×0.5))` 20 draws has 9 tiles | Integration (engine→helper) | R-001, R-004, R-006 | 2 | QA | Reuse `game.test.ts` HAPPY_PATH/MERGE/EQUAL_GE3 suites + `transitionPlan.test.ts` slide/merge/noop + `gesture-pipeline.test.ts` handleSwipe — all migrated to `0,0,0.5`; assert `throw /exhausted/` when `rngOf(0,0)` used on effective move (negative pin) and `doesNotThrow` with `rngOf(0,0,0.5)`. |
| `extractSpecifiers` / `extractNamedImports` still see real specifiers after `stripComments` keeps string contents | Unit | R-002, R-007 | 1 | QA | `extractSpecifiers('import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */')` → `["bar","qux"]`; `extractNamedImports` variant with `default` + `* as ns` + `{ type spawnTile }` still parses — proves `blankStrings=false` preserved quoted specifiers. |
| `gameState(board, pendingSpawn)` overload — explicit tiered `pendingSpawn` (`{ value: 9, displayRoll: 0 }`) drives realistic flow vs default `{1,0}` | Integration | R-005, R-010 | 1 | QA | `gameState(boardWith(...), { value: 9, displayRoll: 0 })` then `move(..., rngOf(0,0.5,0.5))` asserts spawn uses `9` (materialized pending) — complements `runSeededSession` tiered coverage without duplicating 7.1 logic. |
| Scanner pair `engine.purity` + `ui.norolls` plus `laneSelect` + `app.restart` + `gameOverOverlay` suites that import `stripCommentsAndStrings` | Integration (scanner) | R-002, R-003 | 2 | QA | `ui.norolls.test.ts` (99: `cleaned = stripCommentsAndStrings(source)`) + `laneSelect.test.ts` (177) + `app.restart.test.ts` (103/146/291) + `gameOverOverlay` suites stay green — proves `blankStrings=true` still blanks string contents so bare-symbol scans do not false-positive on URL strings. |
| `spyRng` `calls` recording still exact per draw (`calls.length` equals draws, order preserved) after throw hardening | Unit | R-001 | 1 | QA | Already pinned by the exact `calls deepEqual` paths in `adaptive-spawn-integration.test.ts` P0 — `spyRng(0.1, 0.2)` after two draws `calls === [0.1,0.2]` and third throws; complements `rngOf` shared variant. |
| Ledger `deferred-work.md` 5 entries `done` with `resolution-undo` 64-hex hash, `sprint-status.yaml` untouched (orchestrator-owned) | Static | R-008 | 1 | QA | `rg -n "status: done 2026-09-01" _bmad-output/implementation-artifacts/deferred-work.md` shows 5 hits (DW-3/48/59/60/66) each with `resolution-undo: 64-hex…`; `git diff --stat` shows 5 files including `deferred-work.md` but not `sprint-status.yaml`. |

**Total P1**: 8 checks, ~0.5–1 h host (mostly existing suites, 2 new negative-path pins)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| No `0.5` fallback literal scan — `rg -n "return 0\.5\|\? 0\.5" triade/test-utils/helpers.ts triade/__tests__/engine/adaptive-spawn-integration.test.ts` ==0 (outside `defaultPendingSpawn` comment if any) | Static scan | R-001 | 1 | QA | Must show zero hits; the only `0.5` literals allowed are in `game.test.ts`/`transitionPlan`/`gesture-pipeline` call sites as `rngOf(...,0.5)` displayRoll pads (intentional data, not fallback code). |
| No magic `value:1 displayRoll:0` duplicate scan — exactly one `value: 1.*displayRoll` site in `helpers.ts` (inside `defaultPendingSpawn`) | Static scan | R-005 | 1 | QA | `rg -n "value: 1" triade/test-utils/helpers.ts` ==1; any second literal in `gameState` param default is a regression to anonymous magic. |
| Single-parser allowlist — `rg -n "stripCommentsInternal" triade/test-utils/helpers.ts` ==3 (delegate `false`, delegate `true`, definition) | Static scan | R-002 | 1 | QA | Any inline `/\/\*[\s\S]*?\*\//` fallback reintroduces DW-3 is a fail; length-preserving `blank()` vs `out+=ch` branch split is the gate. |
| Regex-literal guard complement — `stripComments('const s="a \\" // not comment"; // real')` preserves escaped quote and strips only `// real`; `stripCommentsAndStrings` with template `` `hi ${a ? "x" : "y"} // cmt` `` scans interpolation correctly | Unit | R-009 | 1 | QA | Escape pin lives in `helpers.ts:272-288` (`blankStrings` branch on `ch === '\\'`); `stripCommentsInternal` `template` → `interp` push on `${` and `braces` counting already correct — host confirms no throw and correct output. |

**Total P2**: 4 checks, ~0.3–0.5 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — sweep for quote-in-regex across scanned sources: `rg -n "/[^/]*'[^/]*/" triade/src/ui triade/src/services triade/src/render --include="*.ts" --include="*.tsx"` empty | Device exploratory (host `rg`) | 1 | QA | No assertion beyond empty; if a hit appears, file a deferred-work entry for lexer work (DW-66 follow-on). No gate on this sweep because blast radius is already zero. |
| Micro-bench — `stripComments` + `stripCommentsAndStrings` sweep 10k × 4k source (typical `App.tsx` slice) median `<0.5 ms` / `p99 <1 ms` | Unit (bench) | 1 | DEV | Helpers are O(n) single-pass; `feel.bench.test.ts` budget `<0.05 ms` is not exceeded — just confirm no `RegExp` backtracking regression from shared scanner. Not a new lane, just CI `npm test` timing. |
| No-music / no-monetization negative scan keep — `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/test-utils --include="*.ts"` empty (helper sweep did not introduce cross-cutting concerns) | Static scan | 1 | QA | Trivial hygiene; carry-over from Epic 8 — no new gate, just prove sweep stayed in scope. |

**Total P3**: 3 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `require`/helper regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts` green on clean codebase (<1 s) — includes `missing expo-audio` degrade analog (`stripComments` never throws on unterminated `/*`)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`)
- [ ] `rg -n "return 0\.5" triade/test-utils/helpers.ts triade/__tests__/engine/adaptive-spawn-integration.test.ts | wc -l` == 0 and `rg -n "stripCommentsInternal" triade/test-utils/helpers.ts | wc -l` == 3 (quick scan)

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical helper fail-fast + scanner preservation (host only)

- [ ] `rngOf`/`spyRng` throw on exhaustion with `after N` (2 cases — `0.1` twice → throw on second)
- [ ] `stripComments` string-safe `http://` + `/*` inside string (2 cases)
- [ ] `defaultPendingSpawn()` identity + fresh object vs `gameState(board)` default (1 case + grep)
- [ ] `stripCommentsAndStrings` doc `Known limitation — regex` present + `engine.purity`/`ui.norolls` green (2 cases)

**Total**: 7 P0 checks (already passing in working tree; `game.test.ts` 32/32 already green)

### P1 Tests (<30 min)

**Purpose**: Draw-budget fixtures + `extractSpecifiers` preservation + ledger

- [ ] Engine→helper draw-budget: `move(..., rngOf(0,0,0.5))` effective vs `rngOf(0,0)` throw + `newGame` 20-draw board has 9 tiles (2 fixtures)
- [ ] `extractSpecifiers('import Foo from "bar"; // cmt')` → `["bar"]` + `extractNamedImports` still parses `* as ns` / `{ type }` (1 case)
- [ ] `gameState(board, { value: 9, displayRoll: 0 })` realistic pending flow (1 case)
- [ ] Scanner importers `laneSelect`/`app.restart`/`gameOverOverlay` suites green (1 run)
- [ ] Ledger `resolution-undo` 64-hex 5 hits + `git diff --stat` shows 5 files, not `sprint-status.yaml` (1 scan)

**Total**: 6 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, bench, exploratory

- [ ] No `0.5` fallback / no magic duplicate / single-parser allowlist scans (<1 min)
- [ ] Escape `` `hi ${"x"} // cmt` `` pin + template interp correctness (<1 s)
- [ ] Quote-in-regex `rg` sweep empty + `stripComments` 10k bench `<1 ms` + cross-cutting negative scan (<2 min)

**Total**: 7 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 7 | ~0.2 | ~1–1.5 | Pure `helpers.ts` + scanner guards already green (done in sweep); throws + string-safe pins already landed |
| P1 | 6 | ~0.4 | ~2–3 | Engine fixtures (`move`/`newGame`) + `extractSpecifiers` preservation + ledger `resolution-undo` — mostly existing suites, 2 new negative-path pins for `rngOf(0,0)` throw |
| P2 | 4 | ~0.25 | ~0.8–1.2 | Static scans + escape/interp pin (single-parser allowlist, no-magic, no-0.5) |
| P3 | 3 | ~0.2 | ~0.4–0.7 | Quote-in-regex exploratory `rg` + micro-bench + cross-cutting scan |
| **Total** | **20** | **-** | **~4–6** | **~0.6–0.9 days host; no device lane — pure host TypeScript** |

### Prerequisites

**Test Data:**

- `rngOf`/`spyRng` scripted values `0 / 0.5 / 0.1` + `mulberry32` seeded `20260808` + `staticBoard`/`boardWith`/`emptyBoard` + `SIZE=4` + `defaultPendingSpawn()` factory
- `stripComments` source strings: `'const u="http://x"; // cmt'`, `"const s='a /* b */ c'; /* real */"`, `` '`hi ${a ? "x" : "y"} // cmt`' ``, escaped `'const s="a \\" // not comment"; // real'`
- `extractSpecifiers` string: `'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */'`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`return 0.5`, `stripCommentsInternal`, `value: 1`, `resolution-undo`, quote-in-regex)
- `npx tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — helpers are pure TS, no native module)
- Working tree on `1fb45ca` baseline + sweep diff; `triade/src/engine` byte-identical guard

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (helpers seam)
- **Scanner scenarios** (`engine.purity` + `ui.norolls`): 100%
- **Helper unit** (`rngOf`/`spyRng`/`stripComments`/`defaultPendingSpawn`): ≥90%
- **Edge cases** (escape/template/unterminated comment): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (throw with `after N`, string-safe `stripComments`, factory identity, doc + scanner green)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 mitigations green)
- [ ] Scanner tests (`engine.purity` + `ui.norolls`) pass 100% (no false pass/negative on clean codebase)
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (fail-fast vs never-throw, single-parser maintainability)

---

## Mitigation Plans

### R-001: Unmigrated `rngOf(0,0)` for effective `move()` now throws (Score: 6)

**Mitigation Strategy:**
1. Grep `rg -n "rngOf\([^)]*\)" triade/__tests__` and confirm every effective-move site supplies `rngOf(0, 0, 0.5)` (or `spyRng(...,0.5)`); any `rngOf(0,0)` left is a budget bug, not a helper bug — add the `0.5` displayRoll pad.
2. Keep `rg -n "return 0\.5\|\? 0\.5" triade/test-utils/helpers.ts ==0` as CI gate (no fallback literal may return).
3. Treat future `spawn.ts` draw-count changes atomically: bump all `rngOf(0,0,0.5)` call sites in the same commit and update the throw message count `after N`.
4. CI `npm --prefix triade test` stays green — the 20-site `game.test.ts`/`transitionPlan`/`gesture-pipeline` patch already proves the 3-draw contract correct.

**Owner:** FE lead
**Timeline:** Immediate (gate this sweep)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/engine/game.test.ts` 32/32 green + `rg -n "rngOf\(0, ?0\)" triade/__tests__/engine/game.test.ts` empty + throw message `after 2` on `rngOf(0,0)` negative pin.

### R-002: Single-parser `stripCommentsInternal(source,false)` regresses and blanks string contents (Score: 6)

**Mitigation Strategy:**
1. Host pins `stripComments('const u="http://x"; // cmt')` preserves URL and `stripComments("const s='a /* b */ c'; /* real */")` preserves inner.
2. Pin `extractSpecifiers('import Foo from "bar"; // cmt')` → `["bar"]` (proves quoted specifiers survived).
3. Grep allowlist `rg -n "stripCommentsInternal" ==3` and `rg -n "/\/\*[\s\S]*?\*\//" triade/test-utils/helpers.ts ==0` (no naive regex fallback).
4. Keep the `if(blankStrings)` split on `ch === '\\'` and on `blank(ch) vs out+=ch` as landed (do not collapse).

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** Host P0 `stripComments` + `extractSpecifiers` green + `rg` allowlists + `engine.purity.test.ts` green.

### R-003: Regex `/'/` quote flips `stripCommentsAndStrings` into string mode → false NEGATIVE on `ui.norolls` (Score: 6)

**Mitigation Strategy:**
1. Keep JSDoc `Known limitation — regex literals: … flips … false NEGATIVES … No such pattern exists … division-vs-regex disambiguation` verbatim (verify via `rg`).
2. Keep clean-repo scan `rg -n "/[^/]*'[^/]*/" triade/src/ui triade/src/services` empty (no current file contains the pattern).
3. Keep `ui.norolls` guard (`rg -n "spawnTile\|weightedValue" triade/src/ui ==0`) as is; do not introduce a real lexer this sweep (spec Block If).
4. If a future view adds `/it's/`, file a DW entry for the lexer and treat the scan hit as the gate.

**Owner:** FE
**Timeline:** Immediate (residual acknowledged; lexer deferred)
**Status:** Planned
**Verification:** JSDoc text present + clean scan empty + `ui.norolls.test.ts` green.

---

## Assumptions and Dependencies

### Assumptions

1. Effective `move()` always consumes exactly 3 RNG draws (`pickIndex` + `resolveSpawn` + `displayRoll`) and `newGame` 20 draws — pinned by `game.ts:53-64` and `spawn.ts:pickCombined` single-roll contract; any engine draw-count change is treated as a product change that must update helpers together.
2. No current scanned file (`triade/src/ui`, `triade/src/services`, `triade/src/render` per `PURITY_FILES` / `ui.norolls` allowlists) contains a regex literal with an embedded quote/apostrophe — sweep's `stripCommentsAndStrings` false NEGATIVE has zero blast radius today; assumption checked by `rg` scan.
3. `extractSpecifiers`/`extractNamedImports` callers only need `stripComments` to keep string/template contents intact (so import specifiers remain visible); `stripCommentsAndStrings` callers (bare-symbol scans) need string contents blanked — the `blankStrings` toggle satisfies both without duplication.
4. `defaultPendingSpawn()` returning a fresh `{ value: 1, displayRoll: 0 }` per call is intentional (no shared reference) — callers must not rely on `===` identity or mutation sharing.
5. `npx tsc --noEmit -p tsconfig.test.json` baseline is already clean after sweep (`spec` says `npx tsc --noEmit` clean) — any new `@ts-ignore` is a regression.

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/test-utils/helpers.ts` single-parser implementation — Required before P0 pins. Status: Done (working-tree).
3. `triade/__tests__/engine/engine.purity.test.ts` + `__tests__/ui/ui.norolls.test.ts` scanner fixtures — Required for P0 scanner green gate. Status: Ready (already in repo).
4. `deferred-work.md` ledger with `resolution-undo` hashes — Required for P1 ledger verification. Status: Done (5 entries flipped).

### Risks to Plan

- **Risk**: Engine `spawn.ts` draw-count changes without helper co-update.
  - **Impact**: `rngOf(0,0,0.5)` throws on correct moves → CI RED looks like helper bug.
  - **Contingency**: Treat `spawn.ts` + `helpers.ts` call-site migration as an atomic commit; update `newGame` 20-draw literal together.

- **Risk**: New view file adds `const re=/it's/` and `ui.norolls` false NEGATIVE ships.
  - **Impact**: Forbidden `spawnTile`/`weightedValue` import hidden inside blanked string tail → `ui.norolls` false-pass ships thin-view violation.
  - **Contingency**: The `Known limitation` doc is the gate; `rg` quote-in-regex scan in P3 catches it — file a lexer DW entry and do not ship the view until lexer lands.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests for any future helper seam (e.g. real regex lexer) — separate workflow; not auto-run.
- Run `*automate` for broader helper coverage once production lexer exists.
- Run `*nfr-assess` after implementation evidence (scanner runs) to validate NFR planning without inventing thresholds.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
- [ ] Tech Lead: ______________________ Date: __________
- [ ] QA Lead: ______________________ Date: __________

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|------------------|--------|------------------|
| `triade/test-utils/helpers.ts` (`rngOf`/`spyRng`/`defaultPendingSpawn`/`stripComments*`/`extractSpecifiers`) | Test-tooling scanner & RNG helpers hardened — single `stripCommentsInternal` parser, fail-fast throws with `after N`, factory `defaultPendingSpawn()` | `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts` + `game.test.ts`/`transitionPlan.test.ts`/`gesture-pipeline.test.ts`/`adaptive-spawn-integration.test.ts` green; `rg` allowlists for no `0.5` fallback / single parser / no magic duplicate |
| `triade/src/engine` (unchanged) | No impact — byte-identical (`git diff --stat -- triade/src/engine` empty); `move()` 3-draw / `newGame` 20-draw contracts observed only | 695+ engine tests remain gate; any new throw is a true budget pin (add `0.5` pad) |
| `triade/__tests__/engine/adaptive-spawn-integration.test.ts` local `spyRng` | Fail-fast now throws instead of silent `0.5` on over-draw | `adaptive-spawn-integration` + `weights` + `pot` suites green; `sigmaBound` windows shared with 7.1 unchanged |
| `triade/__tests__/ui` scanner consumers (`laneSelect`/`app.restart`/`gameOverOverlay.*`) | `stripCommentsAndStrings` blankStrings mode still blanks string contents, so bare-symbol scans keep `rg` parity | Those suites stay green; quote-in-regex residual monitored via `rg` empty scan |
| `_bmad-output/implementation-artifacts/deferred-work.md` ledger | 5 DW entries flip `open→done` with `resolution-undo` 64-hex hash | Ledger `done` count + `sprint-status.yaml` not written (orchestrator-owned) |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/SEC/PERF/DATA/BUS/OPS, P×I 1-9, ≥6 requires mitigation)
- `probability-impact.md` - Probability 1-3 (Unlikely/Possible/Likely) × Impact 1-3 (Minor/Degraded/Critical) → 1-9; ≥6 MITIGATE, 9 BLOCK
- `test-levels-framework.md` - Unit (pure helpers), Integration (engine→helper + scanner pair), Static scan (allowlists)
- `test-priorities-matrix.md` - P0 = blocks helper scam-bypass + high risk + no workaround; P1 = core wiring; P2 = secondary scans; P3 = exploratory
- `nfr-criteria.md` - NFR categories when in scope (reliability/maintainability/performance/compliance here)
- `test-quality.md` - Deterministic host tests, no flake, `Number.isFinite`/`try/catch` never-throw where required

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md` (intent/boundaries/I-O matrix 7 rows, 5 ACs, tasks 8 done)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-3/48/59/60/66 → `done 2026-09-01`)
- Engine contracts: `triade/src/engine/core/game.ts:53-64` (3-draw effective, 20-draw newGame), `triade/src/engine/core/spawn.ts:pickCombined` (single-roll, re-normalize)
- Prior TEA designs: `_bmad-output/test-artifacts/test-design/test-design-epic-8-{1..6}*.md` (same Epic-Level template, host-only PR gate, P0 100%/P1 ≥95%)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
