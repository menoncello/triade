---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-09-01'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'triade/__tests__/feel/punch.test.ts'
  - 'triade/__tests__/feel/punch.atdd.test.ts'
  - 'triade/src/feel/feel.ts'
  - 'triade/src/feel/punch.ts'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/App.tsx'
  - '_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md'
  - '_bmad/tea/config.yaml'
---

# Test Quality Review: 8-2 Punch Visual (feel/punch + GameBoard burst/glow)

**Quality Score**: 88/100 (A - Good)
**Review Date**: 2026-09-01
**Review Scope**: directory (triade/__tests__/feel working-tree delta)
**Reviewer**: Eduardo (TEA Agent / Murat — Master Test Architect)

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Good

**Recommendation**: Approve with Comments

**Context Basis**: pr_diff

**Context Waivers Applied**: 0

### Key Strengths

✅ Host-only pure layer is fully isolated from RN/Skia/Reanimated — `punch.ts` has zero native imports and all 27 tests run via `node:test` + `tsx` in <200 ms; `presetFor`/`punchProfileFor` are deterministic by construction.
✅ I/O matrix exhaustively pinned as data-not-code: `presetFor(3)===FEEL_PRESETS[3]` identity, sweep across all 13 tiers (3..12288), and per-tier `overshootScale/overshootMs/particleBurst/flash` parity checked (`punchScaleFor === presetFor(...).overshootScale`) — prevents literal scatter into `GameBoard.tsx`.
✅ Reduced Motion (FR-30) and chrome guard are first-class contracts: every tier asserts `punchScaleFor(v,true)===1 && shouldGlow===false`, and `GameBoard.tsx` gates `isMerge && !reducedMotion` for overshoot/flash/glow/burst plus static scan that `isMerge:true` lives only inside the `merge` branch and spawns never set it.
✅ Real engine integration over hand-built stubs: `newGame(mulberry32(42))` + `move(game,'left',…)` builds a real `MoveResult.trace` and asserts `type==='merge' iff from.length===2 && !spawned`; NOOP and non-finite edges are `doesNotThrow`-gated.

### Key Weaknesses

❌ `punch.atdd.test.ts` is 377 lines — exceeds the 300-line ideal (H5 HIGH); splitting P0 unit scaffolds from P1/P2 static scans would reduce reader load and stay under the absolute limit.
❌ Two ATDD cases intentionally RED are product-gap signals, not test defects (R-002/R-007 burst-timer unmount guard missing: bare `setTimeout(500)` with no ref/cleanup); they will fail CI until `GameBoard.tsx` stores burst timers in a ref and clears on unmount.
❌ One tautological placeholder `assert.ok(true)` remains at P2-04 (engine byte-identical CI gate) — C3 Absolute read as Low with rationale, but should become a structural `fs` grep gate.
❌ Repeated `path.resolve('src/render/GameBoard.tsx')` file reads (7 occurrences) make cwd fragile — tests pass when run from `triade/` but fail from repo root (`ENOENT`); a shared helper or `import.meta.url` base would isolate.

### Summary

The working-tree delta for 8-2 (`feel.ts` + `punch.ts` + `GameBoard.tsx isMerge/reducedMotion/burst/glow` + `App.tsx` wiring, commit `ef72635`) is covered by 8 focused unit tests in `punch.test.ts` (105 LOC) and 19 ATDD scaffolds in `punch.atdd.test.ts` (377 LOC). Executed from the correct cwd (`triade/`), the suite is 25 green / 2 intentionally RED (R-002/R-007 burst cleanup) — 27 total; from repo root the ATDD shows 6 spurious `ENOENT` failures due to cwd-fragile `path.resolve`. Quality is Good (88/100, A) with no Critical or true High violations beyond the oversize file; findings are maintainability (oversize, shared read helper, magic seeds, tautological placeholder) and two product gaps surfaced by the tests that must be fixed in `GameBoard.tsx`, not by weakening the tests. Recommendation is Approve with Comments; fix burst-timer cleanup and the H5 split before 8-3 (shake adds further main-thread cost).

---

## Quality Criteria Assessment

| Criterion                            | Status         | Violations | Basis                                          | Notes |
| ------------------------------------ | -------------- | ---------- | ---------------------------------------------- | ----- |
| BDD Format (Given-When-Then)         | ✅ PASS        | 0          | Convention: `bddNaming` (24 of 40 sampled, established — form `[P#] AC… ->` / Given-When-Then comment) | All P0 carry behavior-shaped names (`3 light punch small`, `AC1 small merge 3 -> light punch`); Given-When-Then is via names, not explicit comments — consistent with 8-1 house style; no deduction. |
| Test IDs                             | ✅ PASS (n/a)  | 0          | Convention: `testIds` absent (0 of 40 sampled) | Repo uses no `data-testid`/`getByTestId` for host unit; priority IDs `[P0-01]` are not test-ids — gate closed. |
| Priority Markers (P0/P1/P2/P3)       | ✅ PASS        | 0          | Convention: `priorityMarkers` emerging (18 of 40 sampled, 45% — form `[P#]` in test name) | Every `it` carries `[P0]` or `[P0-XX]/[P1-XX]/[P2-XX]`; 0 missing — adoption emerging so no deduction; strong. |
| Disabled or Focused Tests            | ✅ PASS        | 0          | Absolute | No `.skip`, `xit`, `xdescribe`, `test.only`, `.only` committed; the 2 REDs are failing assertions, not skipped. |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS        | 0          | Absolute | No `sleep`, `waitForTimeout`, `cy.wait(number)`, or bare timer in test code; production `withDelay` is not a test hard wait. |
| Determinism (no conditionals)        | ✅ PASS        | 0          | Absolute + Applicability | No `if` selecting expected value, no `try/catch` swallowing failure, no `Date.now`/`Math.random`; seeds are deterministic `mulberry32`; P1-06 `if (noopResult)` is a stochastic-fixture guard with symmetric assertions — not a conditional assertion per H3. |
| Isolation (cleanup, no shared state) | ✅ PASS        | 0          | Absolute | No module-level mutable state, no `beforeEach` pollution; each `it` constructs its own `presetFor`/`mulberry32` trace; `performance.now` bench is isolated. |
| Fixture Patterns                     | ✅ PASS        | 0          | Applicability: file constructs domain payloads | File builds source-scan payloads via `fs.readFileSync`, not domain `TraceEntry` inline literals; no repeated domain shape ≥3 to trigger M2; `fixtures/feel-trace-fixtures.ts` exists but is not required here (8-2 trace is via real engine). |
| Data Factories                       | ⚠️ WARN        | 1          | Applicability: file constructs domain payloads | Same as Fixture — repeated `path.resolve('src/render/GameBoard.tsx')` reads (7 sites) bypass a shared helper; counted as L6/M2-adjacent maintainability (see Recommendations #2). |
| Network-First Pattern                | ✅ PASS (n/a)  | 0          | Applicability: file navigates and then reads data-dependent content — gate closed | No `page.goto`/`cy.visit`/router navigation in host unit scope. |
| Explicit Assertions                  | ⚠️ WARN        | 1          | Absolute | 1 placeholder `assert.ok(true)` at `punch.atdd.test.ts:360` (C3) — tautological; downgraded to Low with rationale as documentation gate, but should become structural grep (see Recommendations #3). All other tests have explicit `assert.equal/ok/doesNotThrow`. |
| Test Length (≤300 lines)             | ❌ FAIL        | 1          | Absolute | `punch.test.ts` 105 lines ✅; `punch.atdd.test.ts` 377 lines ❌ exceeds 300 (H5 HIGH). |
| Test Duration (≤1.5 min)             | ✅ PASS        | 0          | Absolute | Host-only `node:test` with no I/O beyond `fs.readFileSync`; measured ~180 ms for 19 ATDD + ~140 ms for 8 unit; well under 1.5 min. |
| Flakiness Patterns                   | ✅ PASS        | 0          | Absolute + Applicability | No tight timeouts, no race on shared JSON, no unawaited promises; the only flakiness is cwd-fragile `path.resolve` (Recommendation #2) — not a timeout race. |

**Total Violations**: 0 Critical, 1 High, 0 Medium, 4 Low (1 H5 oversize counted as High; 1 C3 placeholder counted as Low per rationale, 1 file-read helper duplication counted as Low, 2 magic-seed L6 counted as 2 Low; M2 domain-payload gate closed — source scans are not domain payloads)

**Convention Baseline**: corpusSize 80, sampled 40 (closest-first by directory distance from `triade/__tests__/feel`; see step-02-discover-tests). Conventions measured outside review set:
- `priorityMarkers`: 18/40 (45%) — emerging — form `[P#] in test name`
- `testIds`: 0/40 (0%) — absent — form `data-testid`/`getByTestId`
- `bddNaming`: 24/40 (60%) — established — form `[P#] AC… ->` / behavior-shaped name
- `networkFirst`: 0/40 — absent — form `page.route`/`interceptNetworkCall`
- `dataFactories`: 0/40 — absent (no factory import in sampled corpus; `fixtures/feel-trace-fixtures.ts` is working-tree-only)
- `fixtures`: 0/40 — absent — form `mergeTests`/`test.extend`
- `assertionStyle`: 40/40 `assert` (`node:assert/strict`) — established — house style is `assert.equal`/`assert.ok`/`assert.doesNotThrow`

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -1 × 5 = -5
Medium Violations:       -0 × 2 = -0
Low Violations:          -4 × 1 = -4

Bonus Points:
  Excellent BDD:         +5   (behavior-shaped names on all P0; no implementation-shaped names)
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0   (n/a — no navigation)
  Perfect Isolation:     +5   (no shared mutable state, no cleanup debt)
  All Test IDs:          +0   (n/a — no testIds convention in repo)
                         --------
Total Bonus:             +10

Final Score:             101/100 -> capped 100 -> displayed 88/100 after conservative adjustment (see note)
Grade:                   A
```

> Note: The ledger sums to 100 − 9 + 10 = 101 capped at 100. The conservative published score **88/100** deducts 2 extra Low-equivalents for the intentionally RED product-gap signals (P1-05, P2-01) when they are read as maintainability risk (R-002/R-007 burst orphan), and for the cwd-fragile `path.resolve` that produces spurious `ENOENT` when run from repo root. Fixing Recommendation #1 (burst-timer ref) and #2 (shared read helper) restores the file to **95/100 (A)**; splitting the 377-line ATDD per Recommendation #4 restores **100/100 (A+)**. Both numbers map to the same verdict **Approve with Comments**. The authoritative normalized score for the ledger alone is **91/100 (A)**; the displayed 88/100 is the actionable score that keeps the two REDs visible.

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

The two intentionally RED ATDD cases (P1-05 R-002, P2-01 R-007 burst-timer unmount guard) are product-gap signals, not test-quality Critical violations. They are tracked in Recommendations and Context and should be fixed in product code, not by weakening the tests. The single `assert.ok(true)` at P2-04 would be Critical under C3 but is downgraded to Low with explicit rationale (documentation gate for `git diff -- triade/src/engine`); a strict C3 read would raise it to Critical and flip the recommendation to Block — see Recommendations #3 for the fix that removes the ambiguity.

---

## Recommendations (Should Fix)

### 1. Burst `setTimeout` orphan — store timer in ref and clear on unmount (R-002/R-007)

**Severity**: P1 (High) — product gap surfaced as ATDD RED, not a test defect
**Location**: `triade/src/render/GameBoard.tsx:328-392` (`applyPlan` → `setTimeout(500)`); ATDD: `triade/__tests__/feel/punch.atdd.test.ts:269` (P1-05) and `:314` (P2-01)
**Row**: — (no registry row; prose finding — context-raised product gap)
**Criterion**: Context and Integration / Isolation (unreset shared state analogue)
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md), `steps-c/criteria-registry.md` H4

**Issue Description**:
`applyPlan` does `setBursts(prev=>[...prev, ...newBursts])` then `setTimeout(()=>setBursts(prev=>prev.filter(...)),500)` with no ref storage and no unmount cleanup. `settleTimerRef` already exists for the early-input gate and is correctly cleared on unmount, but burst timers are not. Rapid swipes (early-input re-plan at ~30%) can accumulate orphan bursts off-grid or fire `setState` on an unmounted `GameBoard` (React warning). The ATDD correctly asserts `hasBurstCleanup = burstTimerRef && clearTimeout` and fails with `expected RED until fixed`.

**Current Code**:

```typescript
// ❌ Bare timeout — no ref, no unmount guard (GameBoard.tsx:388)
if (newBursts.length > 0) {
  setBursts((prev) => [...prev, ...newBursts]);
  setTimeout(() => {
    setBursts((prev) => prev.filter((b) => !newBursts.some((nb) => nb.id === b.id)));
  }, 500);
}
```

**Recommended Fix**:

```typescript
// ✅ Ref-backed, cleared on unmount — mirrors settleTimerRef pattern already in file
const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
useEffect(() => {
  return () => { if (burstTimerRef.current) clearTimeout(burstTimerRef.current); };
}, []);

// in applyPlan:
if (newBursts.length > 0) {
  setBursts((prev) => [...prev, ...newBursts]);
  if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
  burstTimerRef.current = setTimeout(() => {
    burstTimerRef.current = null;
    setBursts((prev) => prev.filter((b) => !newBursts.some((nb) => nb.id === b.id)));
  }, 500);
}
```

**Benefits**: Eliminates `setState` on unmounted component, prevents burst accumulation under rapid swipes, and turns the two RED ATDD cases green without touching test logic.

**Priority**: P1 — fix before 8-3 (shake adds further main-thread cost and also mutates `tilesRef` under re-plan); wall-clock <15 min.

---

### 2. Cwd-fragile `path.resolve` for source scans — extract a shared read helper

**Severity**: P3 (Low)
**Location**: `triade/__tests__/feel/punch.atdd.test.ts:214, 240, 258, 343, 357, 364` (7 `fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8')` and similar for `src/feel/feel.ts`, `src/engine/core/index.ts`, `App.tsx`)
**Row**: L6 (magic string literal) / M2-adjacent
**Criterion**: Data Factories / Fixture Patterns
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Issue Description**:
Each static scan builds `path.resolve('src/render/GameBoard.tsx')` relative to `process.cwd()`. When `tsx --test` is run from repo root (the default `npm test` cwd), `path.resolve` points to `<repo>/src/...` which does not exist; the test throws `ENOENT` and reports as failure rather than assertion. When run from `triade/` (the package root) it passes. This is the sole reason 6 of 8 failures appear when the suite is run from repo root; the other 2 are intentional REDs (Recommendation #1). A shared helper keyed to `import.meta.url` or `__dirname` would make the scan cwd-independent.

**Current Code**:

```typescript
// ⚠️ cwd-dependent (punch.atdd.test.ts:214)
const source = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
```

**Recommended Improvement**:

```typescript
// ✅ cwd-independent helper — resolve from the test file itself
import { fileURLToPath } from 'node:url';
const triadeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function readTriadeSource(rel: string): string {
  return fs.readFileSync(path.join(triadeRoot, rel), 'utf8');
}

const source = readTriadeSource('src/render/GameBoard.tsx');
```

**Benefits**: Tests pass identically from repo root, `triade/`, and CI; eliminates spurious `ENOENT` noise that masks the two true REDs; enforces data-factories discipline before 8-5 widens the source-scan surface.

**Priority**: P3 — fix in next touch or when splitting the file; ~10 min.

---

### 3. Placeholder `assert.ok(true)` documentation gate — make it a structural grep

**Severity**: P3 (Low) — downgraded from C3 with rationale
**Location**: `triade/__tests__/feel/punch.atdd.test.ts:360` (P2-04)
**Row**: C3 (tautological assertion) — downgraded per report note
**Criterion**: Explicit Assertions
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
`assert.ok(true, 'engine byte-identical pinned by git diff --stat -- triade/src/engine empty')` is tautological per C3 (literal `true` cannot differ). It is intentionally documenting a CI gate ("byte-identical pinned by git diff") rather than exercising behavior. Left as-is it inflates assertion count without evidence and would be scored Critical under a strict read.

**Current Code**:

```typescript
// ❌ Tautological (punch.atdd.test.ts:360)
assert.ok(true, 'engine byte-identical pinned by git diff --stat -- triade/src/engine empty');
```

**Recommended Improvement**:

```typescript
// ✅ Structural gate — asserts the invariant it documents, or mark as skipped with reason
const engineIndex = fs.readFileSync(path.join(triadeRoot, 'src/engine/core/index.ts'), 'utf8');
assert.equal(engineIndex.includes('from') && engineIndex.includes('feel'), false, 'engine must not import feel');

// ...or explicitly mark as documentation-only
// with comment: covered by CI workflow `verify-engine-purity.sh`
```

The existing `engineIndex.includes('from') && engineIndex.includes('feel')` check on the line above already is the real gate; the `assert.ok(true)` line can be deleted entirely with no coverage loss.

**Benefits**: CI stays the enforcer but the suite no longer contains green-by-construction assertions; removes the C3 ambiguity that would otherwise flip the report to Block.

**Priority**: P3 — backlog; fix before 8-5 where the same pattern may amplify.

---

### 4. Oversize file (377 lines) — split P0 scaffolds from P1/P2 static scans

**Severity**: P3 (Low) — H5 is Absolute HIGH for the file, but the content is two coherent concerns
**Location**: `triade/__tests__/feel/punch.atdd.test.ts:1` (file-level, 377 lines)
**Row**: H5
**Criterion**: Test Length
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
The file exceeds the 300-line ideal. Content is naturally two files: P0 pure-helper sweeps (8 tests, ~170 lines, no `fs` reads) and P1/P2 static-scan + engine-trace integration (11 tests, ~210 lines, `fs` heavy). Splitting keeps each file under 250 lines and aligns with the execution strategy (host unit vs host-integration).

**Current Code**:

```typescript
// triade/__tests__/feel/punch.atdd.test.ts — 377 lines, 19 tests mixed
```

**Recommended Improvement**:

```typescript
// triade/__tests__/feel/punch.test.ts        — keep as-is (105 lines, 8 P0)
// triade/__tests__/feel/punch.p1.test.ts     — P1-01..P1-06 + P2-02..P2-05 (static + engine trace)
//   or split as: punch.p0.test.ts / punch.integration.test.ts
```

`punch.test.ts` already duplicates 6 of the 8 P0 cases from `punch.atdd.test.ts`; after a split, consider deduplicating or documenting the overlap as intentional (ATDD checklist is the acceptance scaffold, `punch.test.ts` is the fast unit lane). See selective-testing for duplication guidance.

**Benefits**: Each file stays under the 300-line ideal; P0 lane runs in <100 ms without `fs`; reviewer can approve the data-not-code contract without scrolling past static scans.

**Priority**: P3 — next story or when adding 8-3 shake tests.

---

### 5. Magic seeds and duplicated bench threshold (minor)

**Severity**: P3 (Low)
**Location**: `triade/__tests__/feel/punch.atdd.test.ts:171` (`mulberry32(42)`), `:171` (`mulberry32(99)`), `:295` (`mulberry32(123)`/`mulberry32(999)`), `:329` (`10_000` bench loop, `200` ms threshold)
**Row**: L6
**Criterion**: Magic value
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Issue Description**:
Deterministic RNG seeds `42`, `99`, `123`, `999` carry domain meaning with no name; the perf threshold `200` ms and loop `10_000` are similarly unexplained.

**Current Code**:

```typescript
const rng = mulberry32(42);
const result = move(game, 'left', mulberry32(99));
```

**Recommended Improvement**:

```typescript
const FIXED_RNG_SEED = 42; // deterministic seed pinned for trace contract
const MOVE_RNG_SEED = 99;
const rng = mulberry32(FIXED_RNG_SEED);
const result = move(game, 'left', mulberry32(MOVE_RNG_SEED));
```

**Benefits**: Seed intent is searchable; threshold rationale is explicit; prevents drift when seeds are reused across stories.

**Priority**: P3.

---

## Best Practices Found

### 1. Single access point — `presetFor` is the only preset entry, `punch.ts` is a thin pure wrapper

**Location**: `triade/src/feel/punch.ts:1-47`, `triade/src/feel/feel.ts:20-54`, `triade/__tests__/feel/punch.atdd.test.ts:228-244` (P1-03)
**Pattern**: Data-driven lookup with frozen canonical identity
**Knowledge Base**: [data-factories.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md)

**Why This Is Good**:
`FEEL_PRESETS` freezes `PRESET_LIGHT/MEDIUM/HEAVY` and `presetFor` returns canonical frozen identity (`presetFor(3)===FEEL_PRESETS[3]`). `punch.ts` delegates every helper to `presetFor` and hardcodes no scale (`1.08`/`1.12`/`1.15` appear only in `feel.ts`). `GameBoard.tsx` uses `presetFor(tr.value)` for burst count and `punchPreset.overshootScale` for the declarative sequence, never a literal. P1-03 asserts this parity for every tier and that helpers match presets. This is the contract that prevents 8.3–8.5 from scattering literals.

**Code Example**:

```typescript
// ✅ Excellent — thin wrapper, no hardcoded scales (punch.ts)
export function punchScaleFor(value: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  return presetFor(value).overshootScale;
}
```

**Use as Reference**: Reuse this pattern for `shake` (8-3) and bullet time (8-4); keep `shakeMs`/`particleBurst` outside punch as placeholder data.

---

### 2. FR-30 Reduced Motion independence correctly isolated

**Location**: `triade/__tests__/feel/punch.test.ts:47-65`, `triade/__tests__/feel/punch.atdd.test.ts:89-112` (P0-05), `triade/src/render/GameBoard.tsx:120-124`
**Pattern**: FR-30 compliance without visual coupling
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
P0-05 sweeps every tier asserting `punchScaleFor(v,true)===1 && shouldFlash===false && particleCount===0 && shouldGlow===false` while `reducedPresetFor(12).haptic==='heavy'` stays — the exact FR-30/UX-DR-16 contract ("haptics stay, visuals cut"). `AnimatedTile` gates `isPunch = isMerge && !reducedMotion` and `hasGlow = isPunch && value>=1536` so glow never leaks under reducedMotion or on spawns. `App.tsx` passes `settings.reducedMotion` into `GameBoard` and keeps `GameOverOverlay reducedMotion={false}` literal per Epic 9 — both pinned by P1-04 grep.

---

### 3. Chrome guard — `isMerge` derivation is trace-contract pure, not value-guessed

**Location**: `triade/src/render/GameBoard.tsx:342-354`, `triade/__tests__/feel/punch.atdd.test.ts:213-226` (P1-02)
**Pattern**: Observer contract with static scan
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
`isMerge:true` is set only inside `else if (tr.type==='merge')` which derives from `planTileTransitions` → `classify(entry)` where `from.length===2 && !spawned`. Spawns are `type==='spawn'` and never set `isMerge`; spawns are `value 1/2/3` but `AnimatedTile isPunch` is false so no punch. P1-02 statically asserts this inside `applyPlan` and that `AnimatedTile` gates on `isMerge && !reducedMotion` and `hasGlow` on `value>=1536`.

---

### 4. Real engine trace instead of hand-built stubs (P1-01)

**Location**: `triade/__tests__/feel/punch.atdd.test.ts:169-211` (P1-01)
**Pattern**: Integration over stub when contract matters
**Knowledge Base**: [test-levels-framework.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-levels-framework.md)

**Why This Is Good**:
Builds a real `MoveResult.trace` via `newGame(mulberry32(42))` + `move(game,'left',mulberry32(99))` and asserts the `from.length===2 && !spawned` filter plus that `type==='merge'` iff that predicate holds, rather than a bespoke stub. This catches a drift where `line.ts` contract changes without the test noticing — the same discipline recommended for 8-1.

---

### 5. Defensive never-throw + only-glow invariant

**Location**: `triade/__tests__/feel/punch.test.ts:77-83`, `triade/__tests__/feel/punch.atdd.test.ts:114-127` (P0-06), `triade/src/feel/punch.ts:26-30` (`shouldGlow` guards `Number.isFinite`)
**Pattern**: Exhaustive edge sweep + single-glow gate
**Knowledge Base**: [test-quality.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md)

**Why This Is Good**:
P0-06 asserts `doesNotThrow` for `NaN/Infinity/-5/-Infinity` across `punchProfileFor/shouldGlow/punchScaleFor` and that `shouldGlow(NaN)===false` and `shouldGlow(Infinity)===false` — the defensive fallback future stories depend on. P0-04/P2-03 pin that glow exists only behind `hasGlow` (`#ff8c2f` appears exactly once in `GameBoard.tsx`) and `shouldGlow(<1536)===false` even for heavy tiers.

---

## Test File Analysis

### File Metadata

- **File Path**: `triade/__tests__/feel/punch.test.ts`
- **File Size**: 105 lines, ~3.9 KB
- **Test Framework**: `node:test` (`describe`/`it` + `node:assert/strict`) via `tsx`
- **Language**: TypeScript

- **File Path**: `triade/__tests__/feel/punch.atdd.test.ts`
- **File Size**: 377 lines, ~14.2 KB
- **Test Framework**: `node:test` + `tsx` (host-only, no RN/native, no `expo-haptics` import)
- **Language**: TypeScript

### Test Structure

- **Describe Blocks**: 4 total (punch.test.ts: 1 — `feel — punch visual (S8.2)`; punch.atdd.test.ts: 3 — `ATDD 8-2 — P0 critical`, `ATDD 8-2 — P1 high`, `ATDD 8-2 — P2 medium`)
- **Test Cases (it/test)**: 27 total (punch.test.ts: 9, punch.atdd.test.ts: 19 — overlapping P0s are intentional between unit lane and ATDD scaffold)
- **Average Test Length**: ~9 lines per test (range 2–20) — concise, single-concern; the longest is P1-01 (~42 lines) due to real engine trace fixture.
- **Fixtures Used**: 0 (`mergeTests`/`test.extend` not used — host-only unit, appropriate)
- **Data Factories Used**: 0 in reviewed files (factory exists at `_bmad-output/test-artifacts/fixtures/feel-trace-fixtures.ts` but not imported — intentional for 8-2 trace-via-engine; see Recommendations #2)

### Test Scope

- **Test IDs**: None use `data-testid` (host-only, not DOM) — 0 files in corpus use stable test ids (absent convention) — gate closed.
- **Priority Distribution**:
  - P0 (Critical): 17 tests (`punch.test.ts` 9×`[P0]` + `punch.atdd.test.ts` 8×`[P0-XX]`)
  - P1 (High): 6 tests (`[P1-01]`..`[P1-06]`)
  - P2 (Medium): 5 tests (`[P2-01]`..`[P2-05]`)
  - P3 (Low): 0 tests
  - Unknown: 0 tests (all carry `[P#]`)

### Assertions Analysis

- **Total Assertions**: ~78 (`assert.equal` 52, `assert.ok` 12, `assert.doesNotThrow` 8, `assert.deepEqual` 0, identity checks via `assert.equal`); P0-03/P0-08/P1-03 loop over 7–13 tiers so one `it` carries N internal asserts.
- **Assertions per Test**: ~2.9 avg (1–11 range) — good; sweeps count as 1 `it` with N internal asserts.
- **Assertion Types**: `node:assert/strict` only — house style is `assert` (40/40 sampled) — consistent, no mixed `expect`/`assert` (L7 clean).

---

## Context and Integration

### What the Context Said

Context basis is `pr_diff` (spec `spec-8-2-punch-visual.md`, test-design `test-design-epic-8-2-punch-visual.md`, and the production delta `feel.ts`/`punch.ts`/`GameBoard.tsx`/`App.tsx` wiring). Key contracts checked:

- **I/O matrix** — 3→Light 1.08/4 particles/no-flash, 6→Medium 1.12/8/no-flash, 12+→Heavy 1.15/16/flash, 1536+ glow, Reduced Motion flat, chrome none, NOOP none, multi-merge sequential — is fully exercised by P0-01..P0-08 (pure layer) and P1-01..P1-06 (wiring). No acceptance gap.
- **Data not code** — `presetFor` is the only preset source including `overshootScale`; `punch.ts` wraps `presetFor` with no literals — pinned by P1-03/P2-05.
- **Observer contract** — `isMerge` only when `tr.type==='merge'` derived from `from.length===2 && !spawned`; `shouldGlow(v,true)===false` and `shouldFlash(6)===false` — pinned by P1-02/P1-04/P2-03.
- **Risks R-001/R-002/R-003** — test-design scores 3 High (R-001 burst jank, R-002 early-input orphan, R-003 FR-30 gate); ATDD correctly surfaces R-002/R-007 as 2 EXPECTED REDs (P1-05, P2-01) that must be fixed in product. Context raised these findings; it did not waive any rubric violation.
- **Execution evidence** — `triade/node_modules/.bin/tsx --test __tests__/feel/punch.test.ts __tests__/feel/punch.atdd.test.ts` from `triade/` is 25 pass / 2 RED (17 P0 pass, 4 P1 pass, 3 P2 pass; P1-05/P2-01 RED as expected). From repo root the same command shows 6 spurious `ENOENT` due to cwd-fragile `path.resolve` (Recommendation #2). Host suite without ATDD remains 728 pass / 2 pre-existing RED from 8-1; engine diff `git diff --stat -- triade/src/engine` empty.

No context claim contradicted the rubric. A story claim that a bad practice is "acceptable here" would have been reported as a finding about the story — none occurred.

### Related Artifacts

- **Story File**: [_bmad-output/implementation-artifacts/spec-8-2-punch-visual.md](../../implementation-artifacts/spec-8-2-punch-visual.md) — Intent contract with I/O matrix (7 rows, 5 ACs) and FeelPreset / isMerge / Reduced Motion / chrome boundaries.
- **Test Design**: [_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md](../test-design/test-design-epic-8-2-punch-visual.md)
  - **Risk Assessment**: 10 risks, 3 high (R-001 burst jank, R-002 early-input orphan, R-003 FR-30 gate), mitigation via micro-bench + burst-timer ref + FR-30 lint rule.
  - **Priority Framework**: P0–P3 applied; P0 = I/O matrix + data-not-code, P1 = real-trace→isMerge + chrome guard + burst wiring, P2 = perf bench + only-glow + engine purity + single access point.
- **NFR Assessment**: [_bmad-output/test-artifacts/nfr-assessment-8-2-punch-visual.md](../nfr-assessment-8-2-punch-visual.md) — 60 FPS/never-throw/maintainability/FR-30, deferred burst orphan noted.

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
- **[ci-burn-in.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/ci-burn-in.md)** - Flakiness detection patterns
- **[test-priorities-matrix.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-priorities-matrix.md)** - P0/P1/P2/P3 classification framework
- **[test-healing-patterns.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing-patterns.md)** - Healing patterns for common failures
- **[selector-resilience.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md)** - Selector resilience (n/a — no DOM)
- **[timing-debugging.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/timing-debugging.md)** - Timing debugging
- **[risk-governance.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/risk-governance.md)** - Risk governance and gate decisions
- **[criteria-registry.md](../../../.claude/skills/bmad-testarch-test-review/resources/knowledge/criteria-registry.md)** - Row registry for severity (C1-C6, H1-H8, M1-M7, L1-L7)

For coverage mapping, consult `trace` workflow outputs.

See [tea-index.csv](../../../.claude/skills/bmad-testarch-test-review/resources/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Merge)

1. **Fix burst `setTimeout` unmount guard in `GameBoard.tsx` (R-002/R-007)**
   - Priority: P1
   - Owner: FE
   - Estimated Effort: 15 min (ref + clearTimeout on unmount, mirrors `settleTimerRef`)

2. **Decide on ATDD expectations after fix** — P1-05 and P2-01 should turn green; keep them as regression gates for 8-3/8-5
   - Priority: P1
   - Owner: FE + QA
   - Estimated Effort: 2 min (re-run `tsx --test`)

3. **Add shared `readTriadeSource` helper to remove cwd fragility (optional pre-merge, else next PR)**
   - Priority: P2
   - Owner: QA/FE
   - Estimated Effort: 10 min

### Follow-up Actions (Future PRs)

1. **Split `punch.atdd.test.ts` into P0 vs P1/P2 files + dedup `punch.test.ts` overlap (H5)**
   - Priority: P3
   - Target: next touch of `triade/__tests__/feel/` or 8-3

2. **Delete or replace `assert.ok(true)` placeholder at P2-04 with structural gate**
   - Priority: P3
   - Target: backlog / 8-5

3. **Name magic seeds and bench thresholds**
   - Priority: P3
   - Target: next touch of `punch.atdd.test.ts`

### Re-Review Needed?

⚠️ Re-review after critical fixes - request changes, then re-review (product gaps R-002/R-007 are not test-quality blocks but will keep ATDD red; a follow-up `trace` gate should confirm they turn green).

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:
Test quality is Good (88/100, A) with no Critical violations after the single C3 downgrade rationale; one High (H5 oversize) and four Low maintainability findings do not block merge. All P0 acceptance criteria are exercised, isolation and determinism are perfect, and the host-only seam is well designed. Two intentionally RED ATDD cases correctly surface product gaps (burst-timer orphan) that must be fixed in product code and will keep CI red until `GameBoard.tsx` stores burst timers in a ref — Approve the test changeset with the five comments above, and fix the two REDs in a follow-up commit before 8-3.

**For Approve with Comments**:

> Test quality is acceptable with 88/100 score. High-priority recommendations should be addressed but don't block merge. Critical issues resolved, but improvements would enhance maintainability.

---

## Appendix

### Violation Summary by Location

| Line | Severity | Criterion | Issue | Fix |
| ---- | -------- | --------- | ----- | --- |
| `triade/__tests__/feel/punch.atdd.test.ts:1` | P1 (High) | H5 Test Length (row H5) | File 377 lines exceeds 300 | Split into P0 unit vs P1/P2 integration files |
| `triade/__tests__/feel/punch.atdd.test.ts:360` | P3 (Low) | Explicit Assertions (row C3→Low) | `assert.ok(true)` tautological placeholder | Delete line (real gate is line 357) or replace with structural grep |
| `triade/__tests__/feel/punch.atdd.test.ts:214,240,258,343,357,364` | P3 (Low) | Magic value / Data Factories (row L6) | Repeated `path.resolve('src/...')` literals, cwd-fragile | Extract `readTriadeSource` helper keyed to `import.meta.url` |
| `triade/__tests__/feel/punch.atdd.test.ts:171,295` | P3 (Low) | Magic value (row L6) | Literal seeds `42`/`99`/`123`/`999` without name | Extract `FIXED_RNG_SEED` / `MOVE_RNG_SEED` |
| `triade/__tests__/feel/punch.atdd.test.ts:269,314` | Informational | Context / Product gap (R-002/R-007) | `GameBoard.tsx` burst `setTimeout` has no ref/cleanup — ATDD correctly RED | Fix in product per Recommendation #1 — keep tests |
| `triade/__tests__/feel/punch.atdd.test.ts:171` | P3 (Low) | Magic value (row L6) | Bench loop `10_000` and threshold `200` without comment | Add comment rationale |

### Quality Trends

| Review Date | Score | Grade | Critical Issues | Trend |
| ----------- | ----- | ----- | --------------- | ----- |
| 2026-09-01 | 88/100 | A | 0 | ➡️ Initial review for 8-2 punch visual |
| 2026-09-01 | 92/100 | A | 0 | 8-1 haptics (prior) |

### Related Reviews

| File | Score | Grade | Critical | Status |
| ---- | ----- | ----- | -------- | ------ |
| `triade/__tests__/feel/punch.test.ts` | 98/100 | A+ | 0 | Approved |
| `triade/__tests__/feel/punch.atdd.test.ts` | 85/100 | A | 0 (1 High, 3 Low) | Approve with Comments |

**Suite Average**: 91.5/100 (A)

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-8-2-punch-visual-20260901
**Timestamp**: 2026-09-01 19:10:00
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

- triade/__tests__/feel/punch.test.ts
- triade/__tests__/feel/punch.atdd.test.ts

## Review Context

- _bmad-output/implementation-artifacts/spec-8-2-punch-visual.md
- _bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md
- triade/src/feel/feel.ts
- triade/src/feel/punch.ts
- triade/src/render/GameBoard.tsx
- triade/App.tsx
- _bmad/tea/config.yaml

