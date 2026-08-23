# Automation Summary — Story 2.6

**Engine**: Custom TypeScript + React Native (Expo SDK 57, `node:test` via tsx loader, Node 26)
**Story**: 2.6 — Integração com o engine (merge-once e effective-move)
**Tests Verified**: 278 triade · `npx tsc --noEmit` clean · `npx tsc --noEmit -p tsconfig.test.json` clean (apenas o aviso pré-existente de `baseUrl` TS 6)
**Date**: 2026-08-22

## Scope of This Pass

Story 2.6 wired Adaptive Spawn into the live move path: immutable `GameState` snapshot `{ board, pendingSpawn }` (N3/ADR-06), combined single-roll resolver (`pickCombined`/`resolveSpawn`), place-not-roll `spawnTile`, fixed draw budget (effective=3 / noop=0 / newGame=20 / resolver=1). This pass verifies the 13 ATDD red-phase scaffolds are **active and green** (zero `test.skip(` in the suite), confirms ACs 1–7 coverage including the N3 forward invariant, and verifies the 5 R1 two-stage pins were rewritten to the single-roll contract. No further gaps closed — undo rewind orchestration is Epic 3 and the HUD preview read of `displayRoll` is Epic 7, both out of scope by guard.

## Verification Results

- `npm test` (from `triade/`) → **278 pass / 0 fail / 0 skip** (~2.2s; baseline pré-story era 266 pass + 13 skipped).
- Story-2.6 file isolated: `adaptive-spawn-integration.test.ts` → **13/13 pass** (~0.27s).
- R1 rewritten pins + compat surface isolated (`pot.test.ts` + `pot-tier-pipeline.test.ts` + `weights.test.ts` + `game.test.ts`) → **52/52 pass**; single-roll draw-count pin confirmado no disco (`pot.test.ts:66`: "every weightedValue call consumes exactly one roll").
- `grep -rn "test.skip(" triade/__tests__/` → **0 matches**.
- `npx tsc --noEmit` → clean (CI gate); `-p tsconfig.test.json` → only pre-existing TS 6 `baseUrl` deprecation notice.
- CI (`ci.yml`) picks up all tests automatically (`node --test` in `triade/`); informational coverage already includes `src/engine/**`.

## Test Distribution (story 2.6 surface)

| Type | Count | Coverage |
| ----- | ----- | -------- |
| Integration/noop | 1 | AC 1 — noop em full board: `moved:false`, `score:0`, nenhum trace spawned, `pendingSpawn` deep-equals input, **0 draws** (spy) |
| Unit/draw contract | 3 | AC 4 — effective move = exatamente 3 draws em ordem (cell, next value, displayRoll); `newGame` = 20; determinismo mesma seed → sequência idêntica de `{ board, pendingSpawn }` |
| Unit/tier wiring | 2 | AC 7 — pin determinístico ceiling pós-merge 96 → tier 2 (`0.9→3`, `0.93→6`, `0.99→12`) + ladder variants 48/192/384 (`pendingSpawn.value` ∈ pot do tier do ceiling) |
| Unit/merge-once | 1 | AC 3 — merge-once intocado com pot tile pendente (`[3,3,3,3] left`), sem cascata |
| Unit/return shape | 1 | AC 5 — `{ board, score, moved, trace, pendingSpawn }`; trace entry `spawned:true`, `value === input.pendingSpawn.value`, `from: []` |
| Unit/snapshot shape | 1 | AC 6 — snapshot exatamente `{board, pendingSpawn}`; pending exatamente `{value, displayRoll}`; valor inicial válido; `displayRoll ∈ [0,1)` |
| Statistical/cell | 1 | AC 2 — célula uniforme entre vazias ±2% (10k amostras seeded `mulberry32`); `spawnTile` coloca o valor dado, não rola |
| Integration/statistical + N3 | 1 | AC 7 — ≥10k spawns: freq(1)≈0.4, freq(2)≈0.4, banda pot ≈0.2 (±2%) **+ N3 invariant** (materializado no move N == pending resolvido no move N−1, mesma run) |
| Unit/rewind + ordering | 2 | AC 7 — rewind shape (reconstruir `GameState` do resultado e replay reproduz idêntico — zero hidden state); ordering invariant (`resolveSpawn(ceiling)` nunca > ceiling) |
| R1 rewrites | 5 | Two-stage → single-roll: bandas combinadas tier 1/5 por fórmula, single-roll draw-count pin (tiers 0/1/5), midpoint reachability, within-pot conditional frequencies vs `norm[i]/POT_WEIGHT` |

**Files** (all active):

- `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (13 tests — NEW this story, P0×8 / P1×5)
- `triade/__tests__/engine/pot.test.ts` (R1 rewrites ×2 + 1 deletion per spec)
- `triade/__tests__/engine/pot-tier-pipeline.test.ts` (R1 rewrite: combined-band midpoints)
- `triade/__tests__/engine/weights.test.ts` (R1 rewrite: conditional within-pot frequencies)
- `triade/__tests__/engine/game.test.ts` (mechanical GameState port + `calls === 3` spawn-once update)

## Story 2.6 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | Spawn só após effective move; noop não spawna/pontua/consome turno (FR-10) | FULL (automated) — noop pin com 0-draw spy + pending intacto |
| 2  | Posição uniforme entre células vazias | FULL — ±2% sobre 10k amostras seeded; `spawnTile` place-not-roll |
| 3  | Merge-once e one-cell inalterados | FULL — suíte existente green sem edição (exceto R1/mechanical ports) + pin explícito com pot pendente |
| 4  | RNG injetado, nunca `Math.random`; suíte determinística green | FULL — draw budget fixo 3/0/20/1 pinado em ordem; determinismo same-seed |
| 5  | `move()` retorna `{ board, score, moved, trace }` + trace assertável com o spawned tile | FULL — shape pin + trace entry assertions |
| 6  | `pendingSpawn` no snapshot imutável desde o dia um (N3/ADR-06) | FULL — snapshot/pending shape pins + initial pending válido |
| 7  | Mesma distribuição (40/40+pot), rewound por undo com o board | FULL — estatístico 10k + N3 invariant + rewind-shape replay + ordering invariant |

## Validation Checklist

- [x] Test framework initialized (`node:test` via tsx, project-mandated)
- [x] Engine detected (custom TS/RN; pure-engine module, ADR-01 — backend stack, mesmos precedentes 2.3–2.5)
- [x] Testable systems identified (`newGame`, `move`, `resolveSpawn`, `weightedValue`, `spawnTile`, snapshot types)
- [x] Existing tests located + patterns understood (`rngOf`, `mulberry32`, `staticBoard`, `boardWith`, `[P0]/[P1]` prefixes)
- [x] Coverage gaps identified (none — 13/13 scaffolds ativos cobrem as 7 ACs + N3 + draw contract; undo é Epic 3, preview Epic 7)
- [x] Tests deterministic (seeded `mulberry32`/`rngOf`, zero `Math.random` nos caminhos de teste)
- [x] Arrange-Act-Assert pattern used
- [x] No hard-coded waits; sem teardown leaks (pure logic, zero hidden state pinado)
- [x] Tests isolated, sem dependência de ordem
- [x] Assertions have descriptive messages
- [x] Files in correct directories (`triade/__tests__/engine/`), engine-appropriate syntax
- [x] `tsc --noEmit` clean (ambos os gates); triade 278/278
- [x] CI picks up new tests automatically; informational coverage includes `src/engine/**`
- [x] Anti-patterns avoided (no engine-under-test, no duplicate coverage — boundary pins/drift tripwire permanecem apenas nos arquivos originais, `js/` congelado intocado)
- [x] Engine purity preserved (`engine.purity.test.ts` green dentro da suíte completa)

## Next Steps

1. Review the activated 2.6 suites (done — 13/13 green, 278/278 total).
2. Feed this summary into the upcoming code review (story is in `review`).
3. Do not pull forward: undo rewind orchestrator (Epic 3), HUD ambiguous-preview reading `pendingSpawn.displayRoll` (Epic 7).
