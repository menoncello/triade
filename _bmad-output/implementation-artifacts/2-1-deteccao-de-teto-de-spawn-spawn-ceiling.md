---
baseline_commit: 7fc15d1143e5a7bbb5658b32f3d6d87e70dcd53b
---

# Story 2.1: Detecção de teto de spawn (spawn ceiling)

Status: done

## Story

As a player,
I want the game to open bigger pieces as my largest tile grows,
So that the late game grows with my mastery instead of grinding small tiles.

## Acceptance Criteria

1. **Given** a board state, **When** the spawn ceiling is computed, **Then** the ceiling is the largest tile value currently on the board.
2. **And** the ceiling maps to a tier via a pure `ceilingDetector` function (architecture pattern N1), returning the correct pot tier for `<48`, `≥48`, `≥96`, `≥192`, `≥384`, `≥768`, and doubling thereafter (`≥1536`, `≥3072`, …).
3. **And** the ceiling is **derived** from the board (a pure read of board state), so undo rewinds it together with the board (ADR-06) — there is **no stored ceiling field** and **no snapshot refactor** in this story.
4. **And** an empty-board edge case returns the `<48` tier (pot = 100% `3`).

## Tasks / Subtasks

- [x] Add `src/engine/core/ceiling.ts` with two pure functions (AC: 1, 2, 4)
  - [x] `ceilingDetector(board: Board): number` — returns the largest tile value on the board; returns `0` when the board has no tiles (empty board → falls into the `<48` tier).
  - [x] `tierForCeiling(ceiling: number): CeilingTier` — pure mapping to the enumerated tiers:
    - `0` → ceiling `< 48` (pot = 100% `3`)
    - `1` → `≥ 48`
    - `2` → `≥ 96`
    - `3` → `≥ 192`
    - `4` → `≥ 384`
    - `5` → `≥ 768`
    - `k ≥ 1` → `ceiling ≥ 48 * 2^(k-1)` (doubling thereafter: `6` → `≥1536`, `7` → `≥3072`, …)
    - Suggested closed form (safe against float drift): `if (ceiling < 48) return 0; return Math.floor(Math.log2(ceiling / 48) + 1e-9) + 1;`. The `+ 1e-9` protects exact boundary values (e.g. `1536 = 48 * 2^5`) from rounding up past the floor. The contract is the enumerated set above; unit tests pin every boundary (`48, 96, 192, 384, 768, 1536, 3072`).
- [x] Export `ceilingDetector` and `tierForCeiling` from `src/engine/core/index.ts` (AC: 2)
- [x] Add `__tests__/engine/ceiling.test.ts` (AC: 1, 2, 4)
  - [x] empty board → `ceilingDetector` returns `0` → `tierForCeiling` returns `0`
  - [x] board whose max is `24` → tier `0`; `48` → `1`; `96` → `2`; `192` → `3`; `384` → `4`; `768` → `5`; `1536` → `6`
  - [x] `ceilingDetector` returns the *actual* max, e.g. a board containing `3` and `768` returns `768`
  - [x] use existing helpers from `../../test-utils/helpers.ts` (`boardWith`, `SIZE`); no RNG needed (pure)
- [x] **Scope guard:** do **NOT** modify `weightedValue`, `spawnTile`, or the spawn distribution in this story — that is Stories 2.2–2.5. This story only establishes detection.

## Dev Notes

- This is the foundation of the Adaptive Spawn signature mechanic (Epic 2 / FR6–FR10). It is intentionally minimal: detect the ceiling and its tier. The pot values and weights that *consume* the tier arrive in 2.2–2.5.
- `tierForCeiling` output is the single source of truth the future `potResolver` (2.3) and `spawnConfig` (2.5) will read. Keep the function pure and side-effect free.
- **Derived, not stored:** ADR-06 (deterministic undo) requires undo-reversible state to live in the immutable snapshot. A *derived* value (computed from the board each time) needs no storage — undo rewinds it for free because the board rewinds. Do not add a `ceiling` field to any state/snapshot in this story. (Review rule: "no counter/state outside snapshot".)
- `src/engine` **never** imports RN/React/Skia/Expo — `ceiling.ts` is a pure TS module, consistent with `board.ts` / `rules.ts` / `spawn.ts` / `line.ts`.

### Project Structure Notes

- New module mirrors the existing single-responsibility pure-module pattern: `src/engine/core/ceiling.ts`, exported via `src/engine/core/index.ts`.
- Tests live beside the ported engine suite in `triade/__tests__/engine/` and run with `node --test` (Node 26+). Import from `../../src/engine/core/index.ts` and `../../test-utils/helpers.ts` exactly as `game.test.ts` does.
- **CRITICAL — wrong codebase trap:** the repository also contains a legacy vanilla-JS web PWA under the root `js/`, `css/`, `index.html` (described by the stale root `_bmad-output/project-context.md`). **Implement in `triade/`.** Do not edit `js/game.js` or add npm dependencies / a build step — `triade/` is the active RN + Expo + Skia + TypeScript app.

### Project Context Rules

> **Authoritative source for Epic 2:** the `triade/` codebase + `game-architecture.md` (N1 resolver, ADR-06) + `epics.md`. The root `_bmad-output/project-context.md` describes the **legacy vanilla-JS PWA** (`js/game.js`, UMD, zero-build, no TS) and is **STALE for Epic 2** — do **not** apply its rules (e.g. "implement only inside `js/game.js`", "no TS", "UMD export") to this story. The "wrong codebase trap" note in Project Structure Notes is the binding directive.

- Implement game rules only inside `triade/src/engine` (never in `ui`/`render`/`services`). Rule duplication breaks the deterministic test suite.
- Randomness already flows through an injectable `rng` param (`Rng = () => number`); this story needs no RNG (pure detection). Keep that boundary intact.
- `move()` returns a new board (light immutability) and `{ board, score, moved, trace }` — preserved as a contract; untouched here.
- TS imports use explicit `.ts` extensions (ESM). `strict: true` is on — type the `CeilingTier` return (recommend `export type CeilingTier = number;` with the semantics documented above).
- Do not add external dependencies or a build step. Tests use the built-in `node:test` runner (`npm test` → `node --test`).

### References

- Epic 2 + Story 2.1 spec: `_bmad-output/planning-artifacts/epics.md` (Epic 2, lines ~365–383)
- Adaptive Spawn design (N1 resolver, ADR-06): `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (N1, lines ~663–693; ADR-06, line ~454; boundaries, lines ~638–653)
- GDD spawn tiers: `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md` (Adaptive Spawn, line ~96)
- Engine source to read before editing: `triade/src/engine/core/{spawn.ts,board.ts,types.ts,index.ts,game.ts}`
- Test conventions: `triade/__tests__/engine/game.test.ts` (imports from `index.ts` + `../../test-utils/helpers.ts`)

## Dev Agent Record

### Agent Model Used

gds-create-story (BMAD) — context assembled from epics, architecture, GDD, and the live `triade/` engine source.

### Debug Log References

### Completion Notes List
- Implemented `src/engine/core/ceiling.ts` with two pure functions following the single-responsibility pattern of the existing engine core modules.
  - `ceilingDetector(board: Board): number` iterates all cells (not just first row/column) and returns the largest tile value, or `0` for an empty board.
  - `tierForCeiling(ceiling: number): CeilingTier` uses `Math.floor(Math.log2(ceiling / 48) + 1e-9) + 1`, with the `+ 1e-9` epsilon to protect exact boundary values (e.g. `1536 = 48 * 2^5`) from floating-point rounding past the floor. This function is the single source of truth future `potResolver` (2.3) and `spawnConfig` (2.5) will read.
- Exported both functions (and the `CeilingTier` type) from `src/engine/core/index.ts`; no other module touched.
- `tierForCeiling` is **derived** from board state — no `ceiling` field added to any state/snapshot (ADR-06, undo-reversible invariant preserved). Scope guard honored: `weightedValue`, `spawnTile`, and the spawn distribution were not modified.
- Added `__tests__/engine/ceiling.test.ts` covering: empty board → tier 0; every enumerated boundary (`24/48/96/192/384/768/1536` plus doubling `3072/6144`); `ceilingDetector` returns the actual max across all cells; and a board-max-against-each-boundary table test. All tests use existing `boardWith`/`SIZE` helpers and no RNG (pure detection).
- Full suite: `node --test` → 167 passed, 0 failed, no regressions.

### File List
- triade/src/engine/core/ceiling.ts (added)
- triade/src/engine/core/index.ts (modified: exports added)
- triade/__tests__/engine/ceiling.test.ts (added)

### Review Findings

> Code review (adversarial, 3 camadas: Blind Hunter + Edge Case Hunter + Acceptance Auditor). Todas as ACs satisfeitas; implementação espelha fielmente o spec (fórmula fechada prescrita). Achados são quase inteiramente edge cases teóricos inalcançáveis num jogo 2048 com tiles positivos potências de 2 num board retangular fixo.

- [x] [Review][Patch] Test coverage gap: testes cobrem só fronteiras exatas de tier; adicionar asserções de valores entre tiers (ex.: 50→1, 100→2) para travar regressões no `< 48` e no `Math.floor(log2)` [triade/__tests__/engine/ceiling.test.ts] — applied (teste mid-tier)
- [x] [Review][Patch] Adicionar teste de board não-quadrado/jagged para travar o comportamento (já correto) de varrer toda célula [triade/src/engine/core/ceiling.ts:4-7] — applied (teste jagged board)

- [x] [Review][Defer] `ceilingDetector` quebra em row ausente/undefined (`row.length` em undefined) [triade/src/engine/core/ceiling.ts:5-7] — deferred, pre-existing (contrato de board retangular do engine)
- [x] [Review][Defer] Fragilidade de ponto flutuante em `tierForCeiling` para ceilings muito grandes / >MAX_SAFE_INTEGER [triade/src/engine/core/ceiling.ts:19] — deferred, pre-existing (fórmula fechada endossada pelo spec; negligible dado o bound de tiles do jogo)
- [x] [Review][Defer] Sem guard de teto superior nos tiers; crescimento ilimitado com o ceiling [triade/src/engine/core/ceiling.ts:19] — deferred, pre-existing (sem bug atual; risco de acoplamento)
- [x] [Review][Defer] Valores de tile inválidos (NaN/negativo/0) silenciosamente tratados como sem-tile [triade/src/engine/core/ceiling.ts:9] — deferred, pre-existing (inalcançável com tiles válidos positivos)
- [x] [Review][Defer] `tierForCeiling` não testado para entradas negativo/0/fracionário/Infinity [triade/src/engine/core/ceiling.ts:18-19] — deferred, pre-existing (entradas sempre são ceilings válidos de `ceilingDetector`)

#### Re-review (2026-08-20, gds-code-review — 3 camadas: Blind Hunter + Edge Case Hunter + Acceptance Auditor)

As 3 camadas confirmaram as ACs 1–4 e a ausência de bugs reais. Os defers acima (pré-existentes, teóricos, inalcançáveis no fluxo do engine) seguem válidos e já registrados em `deferred-work.md`. Novos achados acionáveis:

- [x] [Review][Patch] Remover import `SIZE` não utilizado em `ceiling.test.ts` (importado mas nunca referenciado) [triade/__tests__/engine/ceiling.test.ts:3]
- [x] [Review][Patch] Estender o teste "board max at each boundary" para derivar `3072`/`6144` a partir de um board (AC2 lista `3072`; hoje `3072`/`6144` só são cobertos via `tierForCeiling` direto, não via `ceilingDetector`+board) [triade/__tests__/engine/ceiling.test.ts:60-69]

> **Nota de processo:** os patches da revisão anterior (testes mid-tier e jagged board) constam como "applied" acima, mas estão **não commitados** no working tree (`git diff HEAD` em `ceiling.test.ts`) — não no commit `cc35f18` desta revisão. O Edge Case Hunter confirmou que ambos os testes passam no arquivo vivo e fecham as únicas lacunas de cobertura reais. Recomenda-se commitar o `ceiling.test.ts` junto com os 2 patches acima.

