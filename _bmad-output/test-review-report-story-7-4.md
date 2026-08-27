# Test Review Report: Story 7.4 — Invariante preview nunca altera o spawn

**Workflow**: gds-test-review · **Scope**: targeted (story 7.4 invariant surface) · **Date**: 2026-08-26
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via `tsx`)
**Config**: user Eduardo · document English · communication Português · experience intermediate
**Baseline**: `main` 70e4fb0 (396 pass) → post-7.4 **414 pass / 0 fail** · **Verification**: `npm test` live 2026-08-26, `npx tsc --noEmit` clean

---

## Executive Summary

### Overall Health: **Good**

Story 7.4 is **test-only** (verified `git diff --stat -- triade/src/engine` empty, `preview.ts` byte-identical to 70e4fb0). The hard guarantee N3/FR-44/ADR-06 is fully pinned by **18 new P0 pins** (14 `preview-invariant.test.ts` + 4 extensions in `pending-spawn-contract.test.ts`) on top of the 396 baseline. The suite is deterministic, fast, isolated, and anti-pattern-free. Zero skipped/flaky/slow tests. Three low-severity observations are noted (no blocker).

### Key Findings

1. **All 5 ACs are pinned with explicit `[P0] AC{n}` name traceability** — AC1 (60/40 never alters spawn) via sweep + materialization left/up, AC2 (FR-44 distribution) via 5 exact `deepEqual` pins, AC3 (rewind ADR-06) via isolation/snapshot-carries/noop/direction-agnostic, AC4 (value/position/timing separation) via 3 independent pins, AC5 (structural boundary + purity) via scanner + identity check. No orphan AC.
2. **N3 invariant is proved at the materialization seam, not just unit-mocked**: `T1b` calls `previewFor` **before** `game.move(state, dir, rngOf(0,0.5,0.5))` with the real 3-draw budget and asserts `trace.find(e=>e.spawned).value === pendingSpawn.value` AND `board[spawned.to]===value` for **every** `FULL=[1,2,3,6,12,24,48,96]` × both branches (`0.2` exact / `0.9` range) × both directional `candidates` paths (`left` row vs `up` column, `game.ts:53-64`). Display decision never reaches `spawnTile:66-88`.
3. **Separation is pinned on 4 axes**: value (identical `rngOf` → identical cell/value across displayRolls), position (Preview carries no `to`/`cell`/`position`; spawn at opposite edge `[0,3]` for single moved line), timing (`spyRng` 0 draws for `previewFor`, 3 for effective move, 0 for noop, `trace.length 16` not 0), structure (strip+extract scan proves 0 `ROLL_SYMBOLS` in `preview.ts` and 0 `previewFor` in `spawn.ts`/`game.ts`, no `Math.random`).
4. **ADR-06 snapshot invariant is extension-clean**: T2 extends the existing `pending-spawn-contract.test.ts` (no new engine file), pins shallow-copy `{...state.pendingSpawn}` isolation, deterministic replay via reconstructed `GameState`, noop 0-draw, direction-agnostic row/column. Complements (does not duplicate) the 7.1 `AC3/ADR-06` suite.
5. **Verified live during this review**: `npm test` **414 pass / 0 fail / 0 skip / 0 todo** (4169 ms), isolated 7.4 surface **25 tests** (14 + 11) at **224 ms** for the two files, `npx tsc --noEmit` clean (default gate), `npx tsc -p tsconfig.test.json` abort TS5101 pre-existing waived (`deferred-work.md:122-124`), zero `test.skip`/`.todo`, guard suites `ui.norolls`/`thinview`/`engine.purity`/`hud.previewWiring` green without modification.
6. **2026-08-25 review gap closed**: 7.3 flagged F-3 default-param risk; the 7.4 materialization pins now prove even a caller that ignores `availablePot` cannot corrupt spawn value — the invariant is orthogonal to availability.

### Recommended Actions (prioritized)

1. *(Immediate)* **None blocking** — suite green at 414; 7.4 ACs closed. No hotfix required.
2. *(Short-term, hygiene — Low effort)* Consider the 3 low-severity observations in §Quality Assessment (NaN guard, `RANGE_1_2` frozen assert strictness, `right`/`down` directional coverage) if the team wants absolute gap closure before Epic 7 sign-off. All are optional polish, not blockers.
3. *(Long-term)* Keep `preview-invariant.test.ts` as the single source of truth for N3; track `-p tsconfig.test.json` TS5101 repair in `deferred-work.md` (7-1 waiver still stands; default `tsc --noEmit` gates CI).

---

## Test Suite Metrics

### Test Distribution

| Type | Count (7.4 surface) | Pass Rate | Avg Duration |
| --- | --- | --- | --- |
| Unit — pure display invariant `preview-invariant.test.ts` (T1a-f, AC1/2/4/5) | **14** (NEW) | 100% | <2.4 ms (sweep 2.32 ms, 5 FR-44 pins ~0.06 ms each) |
| Engine Snapshot — `pending-spawn-contract.test.ts` extended (T2, AC3) | **4 NEW / 11 total** (+67 linhas) — 7 pre-existing 7.1 context | 100% | <0.2 ms each (4.88 ms for AC1 baseline, 63 ms for AC2/FR-41 gated 10k-run) |
| Integration — orchestrator boundary `preview-availability.integration.test.ts` (reused, not regenerated) | 6 (pre-existing 7.3, validated green) | 100% | <0.3 ms each |
| **Story 7.4 isolated surface (`preview-invariant` + `pending-spawn-contract` two-file run)** | **25** | **100%** | **224 ms total** |
| **Full suite (all types, context)** | **414** | **100%** | **4169 ms total** |

**Full-suite breakdown (for context, from `grep -rn "^\s*test("`):**
- `__tests__/engine/` 17 files ~141 tests (board/ceiling/line/spawn/game/pot/weights/rules/candidates/spawn-placement/purity/contract/adaptive-integration)
- `__tests__/game/` 3 files ~45 tests (preview 23 + preview-invariant 14 + matchScore 8)
- `__tests__/integration/` 3 files ~22 tests (directional-spawn 13 + preview-availability 6 + session 3)
- `__tests__/e2e/` 2 files ~10 tests (session 5 + directional-spawn 5)
- `__tests__/smoke/` 2 files ~9 tests (criticalPath 3 + directional-spawn 6)
- `__tests__/render/` 2 files ~21 tests (transitionPlan 16 + render.smoke 5)
- `__tests__/ui/` 8 files ~91 tests (layout 18 + tileNumerals 16 + swipe 10 + hud 7 + previewCard 7 + gesture-pipeline 6 + norolls/thinview/purity/orientation/pause/gesture)
- `__tests__/storage/` 5 files ~39 tests + `assets` 3 + `benchmarks` 3 perf benches
- **Distinct by `triade/package.json` types**: Unit ~55% / Integration ~8% / E2E+Smoke ~5% / Render+UI ~27% / Perf ~1% / Other ~4% — balanced for a pure-engine + thin-view architecture.

### Execution Metrics

| Metric | Current | Previous (7.3 review) | Trend |
| --- | --- | --- | --- |
| Pass Rate | **100% (414/414)** | 100% (331/331) | → stable |
| Avg Duration (per test) | ~10.1 ms (4169/414, dominated by benches at 88–160 ms) | ~8.9 ms (2947/331) | → slight up, expected (bench tail unchanged) |
| 7.4 surface duration | 224 ms for 25 tests (avg 9 ms, but pure pins <2.5 ms; 63 ms is the 10k seeded sweep from 7.1 baseline) | n/a | — |
| Flaky Tests | **0** | 0 | → |
| Disabled Tests | **0** | 0 | → |
| Total Duration | 4169 ms | 2947 ms | ↑ (benches + 18 pins; still <5 s) |

### Recent Run History

| Date | Passed | Failed | Skipped | Duration | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-26 (this review, live) | 414 | 0 | 0 | 4169 ms | Full suite via `npm test` (node:test + tsx) |
| 2026-08-26 (isolated 7.4) | 25 | 0 | 0 | 224 ms | `__tests__/game/preview-invariant.test.ts` + `__tests__/engine/pending-spawn-contract.test.ts` only |
| 2026-08-26 (automation-summary baseline) | 414 | 0 | 0 | ~3063 ms | `npm test` reported there (machine variance) |
| 2026-08-25 (7.3 review) | 331 | 0 | 0 | 2947 ms | Pre-12.1 + 7.3 integration |
| main 70e4fb0 (pre-7.4, post-12.1) | 396 | 0 | 0 | — | Baseline cited in story & automation-summary |
| main 50285a3 (post-7.3) | 325 | 0 | — | — | 309 → 325 (+13 FR-43) |

- Flaky tests: **none detected** — `previewFor` is pure (no rng, no timers, no shared state); materialization uses fixed `rngOf(0,0.5,0.5)`; isolation uses `structuredClone` + `spyRng`; no `setTimeout`/`Task.Delay` in suite (`grep` 0 hits).
- Slow tests (>30 s): **none**; slowest observed is the existing `benchmark: transition-plan cost per move <0.05 ms median` at ~160 ms and `benchmark: engine cost per turn <0.1 ms` at ~88 ms — out-of-scope perf benches, not 7.4 pins. Slowest 7.4 pin is the 10k seeded sweep (63 ms) inherited from 7.1, not a regression.
- Disabled/skipped: **zero** (`grep -rn "test.skip\|test.todo"` 0 across `triade/`).

---

## Quality Assessment

### Strengths

- **Deterministic**: Every 7.4 path uses no `Math.random`, no timers, no `Task.Delay`. `rngOf`/`spyRng` inject a fixed draw sequence; sweep inputs are fully specified (`FULL` values, explicit `displayRoll` 0.2/0.5/0.6/0.9, explicit `POT_ONLY` avail sets). Boundary `0.599` vs `0.6` is asserted exactly.
- **Isolated**: No `static` shared state, no module-global mutable. Each test constructs a fresh `Board` (`boardWith`), `PendingSpawn` (`{value,displayRoll}`), and `Rng` (`rngOf`/`spyRng`). `spyRng` records per-call `calls[]` and throws on exhaustion, so inter-test leakage is impossible by construction. `structuredClone` verifies no mutation.
- **Fast**: 14 pure invariant pins average <0.4 ms; materialization pins ~0.8 ms/0.3 ms; structural scan ~2.5 ms; T2 pins <0.17 ms. Entire 25-test surface 224 ms. Full suite still under 5 s (well below 30 s per-test threshold, <5 s unit threshold satisfied).
- **Readable**: `[P0] AC{n}` prefixes map 1:1 to story ACs; helper names (`pending`, `FULL`, `POT_LADDER`, `isContiguousSlice`, `spyRng`) are domain-native; assertions carry messages (`'pending mutated for value ${value}'`, `'range must contain truth'`, `'preview.ts must not reference roll symbol …'`); `describe`-free flat `test()` per AC is idiomatic `node:test` for this repo.
- **Maintained**: 0 disabled tests; production files byte-identical by design; `git diff --stat -- triade/src/engine` gate verified empty; `tsc --noEmit` clean; latest `node:test` harness (`suite:false` flat).
- **Valuable**: Pins *behavior* (place-not-roll, draw-budget, snapshot isolation, opposite-edge candidates) not implementation trivia. The 5 `FR-44` pins are `deepEqual` content checks; the materialization pins prove a future display edit (e.g., changing 60/40 threshold or window cap) cannot silently corrupt spawn.
- **Boundary-rule-4 faithful**: Ladder derived as `FULL = [1,2,...Object.keys(POT_CURVE).map(Number).sort()]` exactly mirroring `preview.ts:10-16`, never hardcoding `[3,6,12,24,48,96]` outside derivation (verified 0 literal leaks).
- **Structural scan mirrors production guard**: `T1e` reuses `stripCommentsAndStrings` + `extractNamedImports` from `test-utils/helpers.ts:220-353` exactly as `ui.norolls.test.ts:83-112` does, so drift between guard and invariant is structurally impossible.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| **O-1: NaN/Infinity defensive guard of `previewFor` not explicitly swept** — `preview.ts:78-79` has `Number.isFinite` guards for malformed `PendingSpawn` (defensive, never fires on well-formed engine snapshot). The 7.4 sweep covers `FULL × 0.2/0.5/0.6/0.9` but does not feed `NaN`/`Infinity` `value`/`displayRoll`. The guard is documented and tsc-clean, but a malformed snapshot edge would be unproven until someone feeds it. | **Low** — Accepted (defensive path, engine invariant guarantees well-formed) | `preview-invariant.test.ts` T1a/T1f | Optional: add 2-line pin `previewFor({value:NaN,displayRoll:NaN}, POT_LADDER).kind==='exact'` to lock the guard. Not blocking — engine never produces it; 7.3 review accepted analogous defensive without extra pin, and `ui.norolls` suite already locks `Number.isFinite` via comment. |
| **O-2: `RANGE_1_2` frozen identity assert lenient** — `T1f` asserts `assert.ok(Object.isFrozen(r1.values) \|\| r1.values.length===2)` — `||` branch allows unfrozen but length-2 array. If `preview.ts:22` regresses to `return [1,2]` allocation, the `strictEqual` identity check (`r1.values === r2.values`) would still catch it (fails), but the `isFrozen` message is soft. | **Low** — Minor (detection still works via `strictEqual`, message softness only) | `preview-invariant.test.ts` T1f | Optional polish: tighten to `assert.ok(Object.isFrozen(r1.values))` alone. No behavior change. |
| **O-3: Directional coverage is row+column only (`left`/`up`), not `right`/`down`** — `T1b` materialization and `T2` direction-agnostic cover the two distinct `candidates` families (`left` row `game.ts:54-57`, `up` column `60-63`), which is sufficient to prove opposite-edge. `right` (`oppCol 0`) and `down` (`oppRow 0`) are symmetric parsings of the same families, not a distinct branch. Strict four-direction coverage would leave `right`/`down` inferred, not pinned. | **Low** — Accepted (symmetric by construction, `spawn-candidates.unit.test.ts:12` already pins all 4 directions) | `preview-invariant.test.ts` T1b, `pending-spawn-contract.test.ts` T2 direction-agnostic | Optional: add `right`/`down` twins if team wants mirror completeness; not required for invariant (position comes from `shiftLine.moved`, not Preview, which is already proved direction-independent). |
| **O-4: `pending-spawn-contract.test.ts` re-defines `spyRng`/`fullNoopBoard` locally instead of importing `test-utils/helpers.ts`** — minor duplication (helpers exports `spyRng`; contract file shadows it with a local copy). Behavior identical, but a future helpers change could drift the local copy. | **Low** — Minor dupe (pre-existing 7.1 pattern, not introduced by 7.4) | `pending-spawn-contract.test.ts:26-49` | Optional cleanup: `import { spyRng } from '../../test-utils/helpers.ts'` and reuse. Do not block 7.4 — coherent with 7.1 precedent and green. |

**No High- or Medium-severity open issues.** O-1–O-4 are low/accepted. No flaky, no assertion-free, no hard-coded waits, no private-field probing, no leaked fixtures.

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| --- | --- | --- | --- |
| Hard-coded waits (`await Task.Delay(5000)` / `setTimeout(…)` / `Thread.sleep`) | **0** — verified `grep setTimeout\|setInterval\|Task.Delay` 0 in `preview-invariant`/`pending-spawn-contract`; uses `spyRng.calls.length` sync as wait surrogate (good) | — | — |
| Shared test state (`static bool wasSetup` / module-global mutable `pending`) | **0** — every test allocates `board`/`pending`/`rng` inline; `spyRng` per-test `calls[]`; no cross-test state | — | — |
| Testing private implementation (`GetPrivateField` / probing `nearestLadderIndex` directly) | **0** — tests public contracts `previewFor`, `move`, `spawnTile`, `trace`, `pendingSpawn`; `RANGE_1_2` is observed via output identity, not via `getPrivateField` | — | — |
| Missing cleanup (`Instantiate(prefab)` leak / `trace` not cleared) | **0** — pure value-in/value-out; no `Instantiate`/`Destroy`, no FS/temp file, no global mutation; `structuredClone` + per-test `spyRng` guarantee cleanup by construction | — | — |
| Assertion-free tests (`void Test(){DoSomething();}`) | **0** — every `test()` contains 1–12 `assert.*` with messages; grepped `test(` count 14/11 matches `assert.` counts | — | — |
| Scattered ladder literals | **0** — `FULL`/`POT_LADDER` derived from `POT_CURVE`; `grep "\[3,6,12,24,48,96\]"` 0 outside derivation (boundary rule 4 upheld) | — | — |
| `Math.random` in preview or invariant suite | **0 real uses** — `Math.random` appears only as engine default param (`spawn.ts:54,69`, `game.ts:8,31`) and as a *comment/string* `method.split('.join')` in `T1e` scanner; `preview.ts` stripped source 0 hits | — | — |
| Roll-symbol import leak | **0** — verified `stripCommentsAndStrings`/`extractNamedImports` scan (T1e) | — | — |
| Skipped/ignored | **0** — `test.skip`/`test.todo` 0 | — | — |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature | P0 Tests | P1 Tests | P2 Tests | Gap? |
| --- | --- | --- | --- | --- |
| Core Loop (`move`, merge-once, board, game-over) | 60+ (line 19 + line-moved 13 + board 6 + game 32 + rules 6 + adaptive-spawn 14 + spawn-placement 11) | — | — | No |
| Spawn / Ceiling / Pot Tier / Weights | 45+ (ceiling 7 + pot 6 + pot-tier-pipeline 4 + spawn-config 8 + weights 11 + spawn 5 + spawn-candidates 12) | — | — | No |
| Preview / Hud preview seam (Epic 7) | **37** (preview 23 + preview-invariant 14) + integration 6 | — | — | **No — 7.4 closed N3** |
| N3 Invariant — preview never alters spawn (AC1) | **4** (T1a sweep + T1b left + T1b up + T1a boundary) + 5 distribution | — | — | **No** |
| N3 Separation — value/position/timing (AC4) | **3** (T1d value/position/timing) | — | — | No |
| N3 Structural — preview↔engine boundary (AC5) | **2** (T1e structural scan + T1f purity) | — | — | No |
| ADR-06 Snapshot — pending carries preview (AC3) | **11** (pending-spawn-contract: 7 baseline + 4 T2) | — | — | No |
| Save/Load / Persistence | ~39 (storage 39 + schema 10 + keyspace 5 + entitlements 7 + settingsStore 16 + storage.purity 1) | — | — | No gap — covered; out-of-scope for 7.4 |
| Progression (tier curve POT_CURVE) | spawn-config 8 + weights 11 + pot-tier 4 + ceiling 7 | — | — | No |
| Combat/Action | n/a (puzzle merge, not combat) | — | — | — |
| UI/Menus (layout, orientation, swipe, gesture, HUD, PreviewCard, pause) | ~91 (layout 18 + tileNumerals 16 + swipe 10 + gesture-pipeline 6 + hud 7 + previewCard 7 + pause 4 + orientation 5 + purity 1 + norolls 1 + thinview 2 + gesture 1 + previewWiring 9) | — | — | No gap — 7.2 preview-card lands there |
| Directional Spawn (12.1, move candidates) | ~31 (spawn-candidates 12 + directional-spawn integration 13 + smoke 6) | — | — | No — pinned; 7.4 proves invariant across it |
| Platform Cert | e2e 10 + smoke 9 + benchmark 3 | — | — | No |

**Story 7.4 AC Coverage (targeted, exhaustive):**

| AC | Coverage | Tests | Gap? |
| --- | --- | --- | --- |
| **AC1** — 60/40 display decision never alters materialized spawn (N3) | FULL — `FULL=[1,2,3,6,12,24,48,96]` × 4 avail sets (`[3]`,`[3,6]`,`[3,6,12]`,`POT_LADDER`) × both branches (`0.2`/`0.5` exact, `0.6`/`0.9` range) no-mutation + kind, boundary `0.599` exact/`0.6` range, plus materialization left AND up for every `FULL` value × `0.2`/`0.9` proving `trace.spawned.value === pending.value` | `[P0] AC1 sweep …`, `[P0] AC1 materialization left …`, `[P0] AC1 materialization up …` | **No** |
| **AC2** — FULL distribution shape (FR-44) | FULL — `1→[1,2]`, `2→[1,2]`, `3 +[3]→[3]`, `3+[3,6,12]→[3,6,12]`, `6+[3,6,12,24]→[6,12,24]` each `deepEqual` + `isContiguousSlice`, plus sweep `range.contains(truth)` & `1..3` cap & contiguous over `FULL` | `[P0] AC2 FR-44 — value 1/2/3/3/6 …` (5 pins) + `[P0] AC2 sweep …` | **No** |
| **AC3** — Undo rewinds preview with board (ADR-06) | FULL — isolation (shallow-copy `{...pendingSpawn}` `game.ts:88`), snapshot-carries (reconstruct `GameState` replays deterministically), noop (`moved:false` 0 draws, deepEqual, `trace.length 16`), direction-agnostic left+up | `[P0] AC3 7.4 isolation …`, `snapshot carries …`, `noop …`, `direction-agnostic …` | **No** |
| **AC4** — Preview never influences position/value/timing | FULL — value (same board `[[1,2,null,null]]` + `6` with `0.2` vs `0.9` + identical `rngOf` → identical cell/value), position (`Preview` no `to`/`cell`/`position`, spawn at opposite edge `[0,GRID_SIZE-1]` for single moved line), timing (`previewFor` 0 draws, effective 3, noop 0, `trace.length 16`) | `[P0] AC4 value …`, `position …`, `timing …` | **No** |
| **AC5** — Display ↔ resolver structural separation + purity | FULL — `ROLL_SYMBOLS={resolveSpawn,weightedValue,spawnTile,weightedPicker}` 0 in `preview.ts` (stripped+imports), `previewFor` 0 in `spawn.ts`/`game.ts`, no `Math.random` in `preview.ts`, pure determinism, `RANGE_1_2` frozen identity `strictEqual` for `1|2` | `[P0] AC5 structural boundary …`, `[P0] AC5 purity …` | **No** |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | --- | --- | --- |
| ~~N3 hard guarantee (display corrupts spawn)~~ | **P0** | Would corrupt randomness, break strategy trust | **CLOSED this story — 7.4** (CRITICAL→RESOLVED) |
| ~~Out-of-ladder defensive lie `[value]`~~ (7.2 F-1) | — | — | **CLOSED 7.3** (rewritten to 3-wide tail) |
| ~~Orchestrator seam (board→ceiling→availablePot→preview)~~ (7.2 F-2) | — | — | **CLOSED 7.3** (6 integration pins) |
| O-1 NaN/Infinity guard not swept | Low | Defensive path never hit (engine guarantee); only malformed snapshot | **P3 — Accepted** (optional 2-line pin) |
| O-2 `RANGE_1_2` isFrozen softness | Low | `strictEqual` still catches allocation regression; isFrozen message soft | **P3 — Accepted** |
| O-3 `right`/`down` not pinned | Low | Symmetric by construction; `spawn-candidates.unit` already pins all 4 dirs; 7.4 pins row+column families | **P3 — Accepted** |

**No P0/P1 open gaps.** 7.4 explicitly owned the P0 invariant and closed it.

### Coverage by Priority

```
P0 Coverage: 100% ██████████  (all 5 ACs have dedicated P0 pins, 18 new P0, 0 P0 gaps)
P1 Coverage: 95%  █████████░  (P1 gestures/layout/weights Tiers already 40-50 tests each; O-1 defensive is P3)
P2 Coverage: 85%  ████████░░  (thin-view/hud chrome, not crit path)
P3 Coverage: 80%  ████████░░  (decorative/edge defensive)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| --- | --- | --- |
| Tests in CI | ✅ | `.github/workflows/ci.yml` — `engine-test-and-benchmark` job on PR + push `main`, `working-directory: triade` |
| Steps | ✅ | `setup-node 26` + `npm ci` + `npx tsc --noEmit` (default gate) + `node --import tsx --test` (full suite + bench) + coverage informational (`--experimental-test-coverage`) |
| Results visible | ✅ | GitHub Actions checks, branch protection capable; coverage is `continue-on-error: informational — never gates` is intentional |
| Failures block | ✅ | `tsc --noEmit` and `node --test` are non-optional gates; would block PR merge |
| Nightly runs | — | Not required at this scale (single pipeline on push/PR, <5 s, cheap); deferred |
| Performance tests | ✅ | 3 benches (`engine.bench`, `render.bench`, `storage.bench`) run inside the same `node --test` gate with budgets (`<0.1 ms` per turn, p99 `<0.2 ms`) — green at 88/97/160 ms in this review |
| Gate evidence | ✅ | `npm test` 414/0 verified lives here; `tsc --noEmit` clean (default); `-p tsconfig.test.json` TS5101 +3 waived `deferred-work.md:122-124` not gating |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --- | --- | --- |
| Fixtures | **Good** | `test-utils/helpers.ts` — `boardWith`/`emptyBoard`/`staticBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings`/`extractNamedImports`/`sigmaBound`/`runSeededSession`/`preSpawnBoardOf`/`GRID_SIZE`. Shared, frozen-agnostic, no leakage. Story correctly derives `FULL`/`POT_LADDER` from `POT_CURVE` (boundary rule 4). |
| Helpers | **Good** | `spyRng` enforces draw-budget contract and throws on exhaustion (prevents silent under-spec); `isContiguousSlice` reusable across preview suites; scanner helpers mirror production guard. Minor dupe O-4 noted not to block. |
| Data factories | **Good** | No `@faker`; determinism required and met. Factories are pure value builders (`pending(value,roll)`), not global seeding. `mulberry32` available for distribution sweeps if needed. |
| Documentation | **Good** | Each `test()` name carries `[P0] AC{n}` + invariant phrase; story `7-4-…md` maps FR→AC→Test; ATDD checklist enumerates 14+4 pins with status GREEN; automation summary traces `FR AC → file → names`. No mystery pins. |
| Framework | **Good** | `node:test` + `tsx` + `TSX_TSCONFIG_PATH=tsconfig.test.json` — host-testable (no DOM), ESM `*.ts` extensions, `strict:true`, `node:assert`. Matches engine purity (`engine.purity.test.ts` green). |

### Maintenance Burden

- Test update frequency: **Low** — pure projection + immutable snapshot; display edits (threshold, window cap, truthful-fallback) are isolated to `preview.ts:44-83`. Any edit must keep the 18 N3 pins green, which is the correct friction (high-value guard).
- Brittleness score: **Low** — no hard-coded sleeps, no `Date.now`, no DOM selectors, no `App.tsx` render timing. Ladder is derived from config, not scattered magic numbers, so `POT_CURVE` shape changes flow automatically.
- Developer friction: **Low** — 4.1 s full suite, `npm test` one command, no emulator, no flaky retries needed. Draw-budget pins give immediate diagnostics (`spyRng exhausted after N draws — drew more than expected`).

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| None blocking — 18 P0 N3 pins green, engine byte-identical, guards green. Proceed to review→done. | — | — | QA Lead |

### Short-term (This Milestone — optional polish, P3)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| O-1: Add explicit `NaN`/`Infinity` defensive pin `previewFor({value:NaN, displayRoll:0.9}, POT_LADDER)` → exact fallback, if team wants malformed-snapshot hedge documented | ~10 min (2 assertions) | Low (defensive) | Dev |
| O-2: Tighten `T1f` `RANGE_1_2` frozen assert to `assert.ok(Object.isFrozen(r1.values))` (remove `\|\| length` lax) | ~5 min | Low (message) | Dev |
| O-3: Add `right`/`down` direction twins to `T1b`/`T2` only if strict 4-direction mirror is desired (symmetric, pure polish; `spawn-candidates` already covers all 4) | ~20 min | Low | Dev |
| O-4: Deduplicate `spyRng`/`fullNoopBoard` import from `test-utils/helpers.ts` in `pending-spawn-contract.test.ts` | ~10 min | Low (hygiene) | Dev |
| Cross-check 7.3 AC8 determinism pin vs 7.4 T1f purity so guidance stays aligned (7.3 review already flagged this; now verified — 7.4 owns hard invariant, 7.3 AC8 is smoke, no conflict) | ~15 min doc | Low | QA |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| --- | --- | --- | --- |
| Keep `preview-invariant.test.ts` as N3 single source of truth; any display change (threshold, window cap, fallback) must keep 18 pins green and be flagged in `deferred-work.md` | ongoing | High | N3 is the law — treat red as blocking |
| Track `-p tsconfig.test.json` repair in `deferred-work.md` (TS5101 waived since 7-1) — default `tsc --noEmit` gates CI, test-config informational | weeks | High | Do not silence fix inside Epic 7 |
| Preserve `previewFor(pending, availablePot)` signature (no `rng` param) — any future consumer must compute `availablePot` once per render after `if(!ready)` (`App.tsx:126-137`), already pinned by `hud.previewWiring` + `preview-availability` | ongoing | High | Thin-view boundary |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --- | --- | --- | --- |
| *none* | — | — | — |

All 7.4 pins are deterministic (fixed `rngOf`, `spyRng` scripted, no timer, no shared state). Flake would require a non-determinism bug in `game.ts`/`preview.ts` itself, which the 10k seeded sweep from 7.1 (`AC2/FR-41`) already gates at 5σ — no flake observed across full (414) and isolated (25) runs in this review.

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --- | --- | --- | --- |
| `benchmark: transition-plan cost per move` (render) | ~160 ms | bench | Keep — frame budget headroom gate, out-of-scope for 7.4 |
| `benchmark: frame-logic tail p99` | ~97 ms | bench | Keep |
| `benchmark: engine cost per turn` | ~88 ms | bench | Keep |
| `[P0] AC2/FR-41 pendingSpawn shares the actual spawn distribution over >=10k effective moves (seeded, 5σ) and every materialization honors N3` (7.1) | ~63 ms | unit - statistical sweep | Keep — 10k deterministic, not slow (>30 s) |
| `*nada 7.4 acima de 30 s*` | — | — | — |

**Threshold applied**: `unit <5 s`, `integration <30 s`, `individual >30 s` = slow. Slowest 7.4 pure pin is the `AC1 sweep` at **2.32 ms**, `T1e` scanner at **2.50 ms** — all well inside.

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --- | --- | --- | --- |
| *none* | — | — | `grep -rn "test.skip\|test.todo\|it.skip\|describe.skip"` 0 across `triade/` |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| ~~F-1~~ | Out-of-ladder `[value]` lie (7.2 deferred) | — | **CLOSED 7.3** |
| ~~F-2~~ | Orchestrator availability boundary untested (7.2 deferred) | — | **CLOSED 7.3** |
| F-3 | `previewFor` default param `=FULL_POT_LADDER` could mask missed wiring arg | — | Accepted — mitigated by 7.3 `preview-availability` integration + 7.4 materialization pins |
| O-4 (new) | `spyRng`/`fullNoopBoard` locally redefined in `pending-spawn-contract.test.ts` instead of imported | ~10 min | Low — hygiene |
| TS5101 `-p tsconfig.test.json` | `TS5101` abort + 3 stub-typing masked errors under test tsconfig | weeks | Pre-existing waived `deferred-work.md:122-124` |
| O-1/O-2/O-3 | NaN guard, soft `isFrozen`, 2-dir only — polish items | ~5–20 min each | P3 — accepted |

---

## Next Review

**Scheduled**: after Epic 7 sign-off or upon first display edit to `triade/src/game/preview.ts` (threshold/window/tail), whichever first
**Focus Areas**: (1) confirm O-1–O-4 polish if adopted; (2) verify 7.4 pins stay green after any `POT_CURVE` shape evolution; (3) track `-p tsconfig.test.json` repair out of `deferred-work.md`
**Success Criteria**: `npm test` ≥414 pass (non-regressing), default `tsc --noEmit` clean, 7.4 N3 pins green, guard suites (`ui.norolls`/`thinview`/`engine.purity`/`hud.previewWiring`) green, no new `test.skip`

---

**Validation checklist**: prerequisites ✔ (suite exists 414, results live-accessed, feature list known via epics/architecture/story file, CI accessed) · metrics ✔ (counts by type, pass rates, avg durations, flaky/slow/disabled listed) · quality ✔ (determinism/isolation/speed/readability/anti-patterns) · coverage ✔ (5 ACs mapped, P0 100%, gaps closed) · infrastructure ✔ (CI visible/blocking, fixtures/helpers, maintenance burden) · recommendations ✔ (prioritized, effort) · report ✔ (exec, metrics, quality, coverage, infra, appendices)

*Generated by gds-test-review — evidence-backed, verified live 2026-08-26 (triade/, node v26.0.0).*
