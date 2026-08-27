# Automation Summary — Story 7.1

**Engine**: Custom TypeScript + React Native (Expo SDK 57, `node:test` via tsx loader, Node 26)
**Story**: 7.1 — pendingSpawn pre-resolvido no snapshot
**Tests Verified**: 287 triade · `npx tsc --noEmit` clean · `-p tsconfig.test.json` fails PRE-EXISTING at baseline `870c9ab` (TS5101 + masked stub-typing errors — waived by owner 2026-08-24, deferred to ledger)
**Date**: 2026-08-24

## Scope of This Pass

Story 7.1 is **test-only by design**: the engine forward contract already landed in story 2.6 (`PendingSpawn { value, displayRoll }` in the immutable snapshot, place-not-roll `spawnTile`, post-merge-ceiling ordering, noop shallow-copy 0-draw). This pass verified the two new artifacts are **active and green** (zero `test.skip(`):

1. **`pending-spawn-contract.test.ts`** (6 tests) — dedicated per-AC contract suite pinning every 7.1 AC by name (`[P0] AC{n}` labels), so a regression in `pendingSpawn` semantics fails under 7.1's own label instead of inside 2.6's integration suite.
2. **`ui.norolls.test.ts`** (1 test) — the previously missing structural "UI never rolls" guard (AC4 enforcement): static scan of `App.tsx` + `src/ui/**` + `src/render/**` (10 files today) forbidding imports/references of the roll symbols (`resolveSpawn`, `weightedValue`, `spawnTile`, `weightedPicker`) and any `Math.random` in view source.

No engine or production source changed — `git diff HEAD -- src/` is empty; engine purity suite stays green.

## Verification Results

- Isolated new suites → **7/7 pass** (~0.2s): `pending-spawn-contract.test.ts` ×6, `ui.norolls.test.ts` ×1.
- Full suite `npm test` (from `triade/`) → **287 pass / 0 fail / 0 skip** (~2.5s; baseline pré-story era 280).
- `grep -rn "test.skip(" triade/__tests__/` → **0 matches**.
- `npx tsc --noEmit` (default CI gate) → **clean**.
- `npx tsc --noEmit -p tsconfig.test.json` → TS5101 abort (`baseUrl` deprecated, TS 6.0.3) — reproduced at clean HEAD before dev; owner waived and deferred with evidence to `deferred-work.md`.
- Engine files untouched (tracked tree clean except the two new test files + status/docs).

## Test Distribution (story 7.1 surface)

| Type | Count | Coverage |
| ----- | ----- | -------- |
| Unit/contract AC1 | 1 | Next-pending shape `{ value, displayRoll }` resolved from post-merge ceiling (96 case, pot membership); `newGame` initial pending within exactly 20 draws; same-seed determinism over `{ board, pendingSpawn }` sequence |
| Statistical/AC2+FR-41 | 1 | ≥10k effective moves seeded (`0x71c7`), 5σ `sigmaBound` gates on 40/40/pot-20 bands + pot-by-ceiling membership & conditional frequencies; same-run N3 equality assert on EVERY materialization |
| Unit/rewind AC3+ADR-06 | 1 | Snapshot reconstruction replay reproduces identical next result (zero hidden state); snapshot keys exactly `{board, pendingSpawn}` |
| Unit/isolation AC3 | 1 | Shallow-copy isolation: noop returns copy-not-reference; effective path fresh object per resolution; later mutation never rewrites earlier snapshots |
| Unit/place-not-roll AC4 | 1 | `spawnTile(board, 42)` survives boundary draws 0/0.5/0.9999 with exactly 1 cell draw; value sweep [1,2,3,6,12,24] through live move path materializes unchanged |
| Unit/noop AC5+UX-DR-23 | 1 | NOOP keeps pendingSpawn deep-equal to input, consumes 0 rng draws, never re-resolves the preview |
| Static guard AC4 (UI never rolls) | 1 | Recursive walk of view layers: no named import of roll symbols from `/engine/`, no bare source reference after comment-stripping (catches `game.spawnTile(...)` namespace calls), no `Math.random`; uniform rule for runtime-bound files |

**Files** (all active, NEW this story):

- `triade/__tests__/engine/pending-spawn-contract.test.ts` (6 tests — P0×6)
- `triade/__tests__/ui/ui.norolls.test.ts` (new sibling of `ui.purity.test.ts`; orthogonal concern kept separate)

## Story 7.1 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | Effective move pre-resolves NEXT pending into the immutable snapshot (real value + display roll, N3); post-merge ceiling; deterministic | FULL — AC1 contract test (shape, ceiling tier pot, budget-20 newGame, seed determinism) + ordering pin via pre-spawn board reconstruction |
| 2  | Pending drawn from same distribution as actual spawn (FR-41) | FULL — statistical gate ≥10k seeded effective moves at 5σ (40/40/pot shares + per-tier conditional frequencies); dead-gate lesson applied (bounds auto-scale with N against pinned seed) |
| 3  | `pendingSpawn` lives in the snapshot so undo rewinds it (ADR-06) | FULL — rewind-shape reconstruction replay + shallow-copy isolation on noop and effective paths |
| 4  | UI never rolls — placed tile equals pre-resolved `pendingSpawn.value` | FULL — engine half pinned (place-not-roll boundary + sweep); UI half enforced structurally by `ui.norolls.test.ts` static guard |
| 5  | NOOP doesn't change pendingSpawn (UX-DR-23) | FULL — deep-equality + 0-draw spy pin |

## Validation Checklist

- [x] Test framework initialized (`node:test` via tsx, project-mandated)
- [x] Engine detected (custom TS/RN pure-engine module, ADR-01 — same precedent as 2.3–2.6)
- [x] Testable systems identified (`newGame`, `move`, `resolveSpawn`, `spawnTile`, snapshot types, view-layer sources)
- [x] Existing tests located + patterns understood (`rngOf`, `mulberry32`, `staticBoard`, `boardWith`, `sigmaBound` replication convention, `[P0]/[P1]` prefixes)
- [x] Coverage gaps identified (none for 7.1's scope — HUD preview card é 7.2, ambiguous range 7.3, invariant suite 7.4)
- [x] Tests deterministic (seeded `mulberry32`/`rngOf`; zero `Math.random` nos caminhos de teste)
- [x] Arrange-Act-Assert pattern used
- [x] No hard-coded waits; pure logic, zero teardown leaks
- [x] Tests isolated, sem dependência de ordem
- [x] Assertions have descriptive messages
- [x] Files in correct directories (`__tests__/engine/`, `__tests__/ui/`)
- [x] No duplicate coverage — `adaptive-spawn-integration.test.ts` intocado; `sigmaBound`/`runSeededSession` replicados module-local por convenção (nunca importados entre arquivos de teste)
- [x] Engine purity preserved (`engine.purity.test.ts` green dentro das 287)
- [x] `tsc --noEmit` default gate clean; `-p tsconfig.test.json` pre-existing failure documented + waived (deferred-work ledger)

## Next Steps

1. Feed this summary into the upcoming code review (story está em `review`).
2. Do not pull forward: HUD preview card lendo `pendingSpawn.displayRoll` (Story 7.2), janela de range ambíguo (7.3), suíte de invariante completa (7.4).
3. `-p tsconfig.test.json` gate repair lives in `deferred-work.md` — do not silently fix inside Epic 7 stories.
