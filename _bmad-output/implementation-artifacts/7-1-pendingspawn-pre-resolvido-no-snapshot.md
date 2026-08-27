---
baseline_commit: 870c9ab147d34dad91343486b17a0fc30dcb837e
---

# Story 7.1: pendingSpawn pre-resolvido no snapshot

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the game to know my next piece before I move,
So that I can plan the board in advance.

## Acceptance Criteria

1. **Given** the engine resolving a spawn on an effective move, **When** the spawn is resolved, **Then** the engine pre-resolves the *next* pendingSpawn and stores it in the immutable snapshot — real value plus display roll (N3).
2. **And** the pendingSpawn is drawn from the same distribution as the actual spawn (Adaptive Spawn curve when applicable) (FR-41).
3. **And** `pendingSpawn` lives in the snapshot so undo rewinds it with the board (ADR-06).
4. **And** the UI never rolls — it only reads `pendingSpawn`; the placed tile always equals the pre-resolved `pendingSpawn.value`.
5. **And** a NOOP move does not change the pendingSpawn (no new preview on a rejected move) (UX-DR-23).

## Tasks / Subtasks

> **Scope reality (read before dev):** the engine-side forward contract for this story ALREADY landed in Story 2.6 — `PendingSpawn { value, displayRoll }` lives in the immutable `GameState` snapshot, `newGame`/`move` pre-resolve it, `spawnTile` is place-not-roll, and the N3 invariant, draw-budget, determinism, and rewind-shape are tested in `adaptive-spawn-integration.test.ts`. **Do NOT rewrite the engine.** This story's real work is (a) a dedicated story-level contract suite that pins every 7.1 AC by name and (b) the "UI never rolls" structural guard that does NOT exist yet.

- [x] T1 — Create `triade/__tests__/engine/pending-spawn-contract.test.ts`: a dedicated suite pinning each 7.1 AC explicitly (AC: 1–5). Reuse `gameState`, `rngOf`, `mulberry32`, `staticBoard`, `boardWith` from `triade/test-utils/helpers.ts`; reuse the `sigmaBound` 5σ statistical pattern from `adaptive-spawn-integration.test.ts` where a distribution gate is needed (story 2.6's convention). Note: `sigmaBound` and the `runSeededSession` harness are module-local in that file (not exported) — replicate the pattern inside the new suite (or lift them into a shared test util if cleaner), never import from another test file. Do NOT delete or duplicate `adaptive-spawn-integration.test.ts` — that suite pins the *integration* of the resolver; this one pins the *7.1 contract* by AC.
  - [x] AC1 pin: on an effective move, `result.pendingSpawn` is the NEXT pending (deep shape `{ value, displayRoll }`), resolved from the post-merge board's ceiling; `newGame` returns an initial resolved pending (draw budget 20). Deterministic: identical seed → identical `{ board, pendingSpawn }` sequence.
  - [x] AC2 pin (FR-41): pendingSpawn draws come from the same distribution as the actual spawn — statistical gate over ≥ 10k effective moves (seeded, 5σ) asserting the materialized spawns match fixed 40/40 + pot-by-ceiling, AND a same-run assertion that each materialized spawn equals the previously resolved `pendingSpawn.value` (N3 forward invariant).
  - [x] AC3 pin (ADR-06): `pendingSpawn` is a field of the `GameState` snapshot — reconstructing `GameState` from `{ result.board, result.pendingSpawn }` and replaying the same rng reproduces the identical next result (rewind shape). Shallow-copy: mutating a caller's `result.pendingSpawn` never rewrites prior history (noop path returns a copy, not a live reference).
  - [x] AC4 pin: the materialized spawn tile always equals the pre-resolved `pendingSpawn.value` — assert across the full distribution sweep; `spawnTile` never rolls its own value (place-not-roll contract).
  - [x] AC5 pin (UX-DR-23): a NOOP move returns `pendingSpawn` deep-equal to the input state's, consumes 0 rng draws, and never re-resolves the preview.
- [x] T2 — Create the "UI never rolls" structural guard as a new test in `triade/__tests__/ui/ui.purity.test.ts` (or a new `ui.norolls.test.ts` if it reads cleaner): scan `App.tsx` + `src/ui/**` + `src/render/**` (the thin-view + render layers) and assert they never import the roll/resolve functions from the engine (`resolveSpawn`, `weightedValue`, `spawnTile`, `weightedPicker`) and never reference `Math.random` in source. This is AC4's "the UI never rolls" enforcement — the engine already guarantees it by construction; this guard makes it structural so a future UI edit cannot silently re-roll. (AC: 4)
  - [x] Follow the existing static-scan pattern (`extractSpecifiers`/`extractNamedImports` from `triade/test-utils/helpers.ts`; same style as `ui.thinview.test.ts`). Thin views may consume `newGame`/`move`/types — only the *roll* symbols are forbidden.
  - [x] Runtime-bound files (`GameBoard.tsx`, `useFrameRateBaseline.ts`) are exempt from the RN-import rule but must still never import roll symbols.
- [x] T3 — Verify no engine changes and no regressions:
  - [x] Confirm `triade/src/engine/core/{types,spawn,game,index}.ts` need NO edits for this story (the 2.6 forward contract already satisfies ACs 1–5 at the engine level).
  - [x] `npm test` (inside `triade/`) → all green, including the new `pending-spawn-contract.test.ts` and the new UI guard. Baseline: **280 pass / 0 fail** before this story.
  - [x] `npx tsc --noEmit` (default tsconfig — the CI gate) AND `npx tsc --noEmit -p tsconfig.test.json` → clean. **Run both** (2.5-review trap: the default tsconfig catches what the test config masks). *(WAIVED by owner 2026-08-24: default gate CLEAN; `-p` gate fails PRE-EXISTING at baseline `870c9ab` (TS5101 abort + 3 masked stub-typing errors) — deferred to ledger with evidence, out of this story's no-production-change scope.)*
  - [x] `engine.purity.test.ts` stays green (no engine source touched).

## Dev Notes

- **Scope guard (CRITICAL):** Story 2.6 intentionally planted this story's engine contract as a forward obligation (its AC 6: *"the pre-resolved `pendingSpawn` (real value + display roll) lives in the immutable snapshot from day one — the exact shape the architecture's Ambiguous Preview pattern (N3) consumes — so the preview lands without refactoring the resolver"*). That obligation is FULFILLED. The remaining gap is test/guard coverage, not engine work. **Do NOT change engine signatures, draw budgets, or the resolver.** Do NOT build the HUD preview card (that is Story 7.2), the ambiguous-range window (7.3), or the full invariant suite (7.4).
- **What the 2.6 forward contract already provides (cite in completion notes):**
  - `PendingSpawn { value, displayRoll }` — `types.ts:34-37`; `GameState { board, pendingSpawn }` — `types.ts:24-27`; `MoveResult.pendingSpawn` — `types.ts:46-53`.
  - `newGame(rng)` resolves the initial pending from the post-placement ceiling + a separate displayRoll — `game.ts:8-25` (draw budget exactly 20, documented on `Rng` at `types.ts:7-18`).
  - `move(state, dir, rng)` materializes `state.pendingSpawn.value` on effective moves (`spawnTile(newBoard, state.pendingSpawn.value, rng)` — place-not-roll, `game.ts:53`), resolves the next pending from the POST-MERGE ceiling BEFORE placing the spawn (ordering invariant, `game.ts:46-52`), and on a NOOP returns a shallow copy of the input pending with 0 draws (`game.ts:66-70`).
  - Combined single-roll resolver (`pickCombined`/`resolveSpawn`/`weightedValue`) — `spawn.ts:16-56`; one draw per call; same distribution as the actual spawn by construction (FR-41).
- **Why a story-level contract suite (T1):** the 2.6 integration suite covers these mechanics as *its own* ACs. 7.1 must own its acceptance contract by name so the AC→test traceability is explicit and a future regression in `pendingSpawn` semantics fails under 7.1's own label. Name tests `[P0]/[P1] AC{n} …` matching the 7.1 AC numbers. Statistical gates: follow the 5σ `sigmaBound` convention from story 2.6 (floors verified to execute against the pinned seed — the dead-gate lesson from the 2.6 third pass).
- **Why the "UI never rolls" guard (T2):** AC4 is a *structural* property — the UI only reads `pendingSpawn` and never re-rolls. The engine's place-not-roll `spawnTile` enforces half of it; the other half (no UI consumer imports the roll functions) has NO automated guard today. This is the concrete new enforcement this story adds, and it protects Story 7.2 (the HUD preview card) from accidentally importing a roll function when the renderer lands.
- **Engine purity stays:** `src/engine` never imports RN/React/Skia/Expo (ADR-01; `engine.purity.test.ts` auto-scans). Relative imports only. TS imports use explicit `.ts` extensions (ESM); `strict: true`. The engine never throws.
- **Legacy PWA removed — no parity concern:** the old vanilla-JS web PWA (`js/game.js`) and its parity suite were removed from the repo in commit `e500e21` (2026-08-20); the root now contains only `_bmad`, `_bmad-output` and `triade`. Do NOT expect or recreate a parity suite — none runs in `npm test`. All work happens in `triade/`.
- **No new dependencies; no build step.** Nothing new imported. `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (run inside `triade/`).
- **Deferred-work note:** do not close any ledger entries with this story unless a genuine closure is verified (the engine contract items were closed by 2.6). If a new gap is found, add it to `_bmad-output/implementation-artifacts/deferred-work.md` with a `## Deferred from: code review of story 7-1…` header.

### Project Structure Notes

- New file `triade/__tests__/engine/pending-spawn-contract.test.ts` (engine contract suite — mirrors the `__tests__/engine/` pattern of 2.3–2.6).
- Guard added inside `triade/__tests__/ui/ui.purity.test.ts` (or a sibling `ui.norolls.test.ts`) — matches the existing static-scan `ui` test family.
- No production source files are expected to change; if a genuine engine gap is found, it belongs in `src/engine/core/*` and MUST be flagged to the reviewer (do not silently expand scope).

### Project Context Rules

> No `project-context.md` exists in the repo (verified 2026-08-23) — these rules are carried from story 2.6's conventions and the architecture's ADRs/boundary rules, which are the authoritative sources.

- Game rules only inside `triade/src/engine` — never in `ui`/`render`/`services` (ADR-01). The UI never rolls (AC 4); it only reads `pendingSpawn`.
- Randomness flows through the injectable `rng` param — never `Math.random` in the spawn path; default params (`= Math.random`) stay for API ergonomics exactly as the ported engine has them.
- `spawnConfig` is data validated by tests; no scattered weight literals in `src/engine` (boundary rule 4).
- State placement master rule: *anything the undo must revert lives in the snapshot.* `pendingSpawn` is the engine-owned piece; cumulative score is app-owned. Enforce at review.
- Engine consistency rule: `Result: ok | rejected`; the engine never throws; game over is a state, not an error.
- `triade/AGENTS.md` requires reading Expo v57 docs before writing code — N/A here (no Expo surface; same call as 2.4–2.6).

### References

- Story 7.1 spec: `_bmad-output/planning-artifacts/epics.md` (Epic 7 header + "Story 7.1: pendingSpawn pre-resolvido no snapshot", lines ~803–821).
- Story 7.2 scope note (CC 2026-08-23): preview card lands single-lane first; FR-45 (both lanes) with Epic 3 — `epics.md` line ~825. Story 7.3 (ambiguous range) and 7.4 (invariant) follow in this epic.
- Architecture — N3 Ambiguous Preview (pendingSpawn in snapshot, invariant, previewFor guide): `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` lines ~726–754. ADR-06 deterministic undo (snapshots, true rewind): lines ~454–455. State-placement master rule: lines ~776–777. Directory structure: lines ~563–594.
- GDD next-piece preview: `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md` line ~98.
- PRD FR-41–45: `_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md` lines ~177–181.
- UX preview card: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md` (preview card table row ~67, portrait/landscape HUD ~144–148); `DESIGN.md` (preview-card component ~274, placement ~240–242).
- Forward contract already landed: `_bmad-output/implementation-artifacts/2-6-integracao-com-o-engine-merge-once-e-effective-move.md` (AC 6 + T1–T8; draw-budget contract §R2; N3 forward invariant in T8).
- Engine source (read before any edit): `triade/src/engine/core/{types,spawn,game,index}.ts`, `triade/src/engine/config/spawnConfig.ts`.
- Test conventions to reuse: `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (sigmaBound, seeded sessions, runSeededSession harness), `triade/test-utils/helpers.ts` (gameState, rngOf, mulberry32, staticBoard, boardWith, extractSpecifiers, extractNamedImports), `triade/__tests__/ui/ui.thinview.test.ts` (static-scan guard pattern).

## Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (gds-create-story — ultimate context engine)

### Debug Log References

- RED→GREEN note: this story is test-only by design (engine contract landed in 2.6), so both new suites were authored against the live engine and validated green in the same pass — `npm test`: 288 pass / 0 fail (baseline 280 + 8 new: 7 contract + 1 UI guard).
- `ui.norolls.test.ts` iteration 1: scan roots resolved relative to the test file incorrectly (`../App.tsx` → `__tests__/App.tsx` ENOENT; then App.tsx treated as a directory, ENOTDIR). Fixed with `../../`-rooted paths plus a stat-based file/dir dispatch in the walker.
- `npx tsc --noEmit -p tsconfig.test.json` FAILED — investigated before any fix decision: reproduced at clean HEAD via `git stash -u` (pre-existing, commit `870c9ab`). Root cause is two-layer: TS 6.0.3 aborts on TS5101 (`baseUrl` deprecated in `tsconfig.test.json`); bypassing it (`ignoreDeprecations`) exposes 3 masked errors caused by the `react-native` → minimal-stub paths mapping (`useWindowDimensions`, `GestureHandlerRootViewProps.style`, `Platform`). A temporary local fix (removing `baseUrl`; TS ≥4.1 resolves relative `paths`) restored the exact old semantics but the 3 masked errors persisted → full cleanliness requires production typing changes = out of scope. Reverted the config to its committed state; owner (Eduardo) chose "defer and document" — entry added to `deferred-work.md`.

### Completion Notes List

- **Scope held exactly as specced:** zero engine/production edits. The 2.6 forward contract fulfills ACs 1–5 engine-side (`PendingSpawn { value, displayRoll }` types.ts:34-37; snapshot field types.ts:24-27; `newGame` 20-draw budget game.ts:8-25; place-not-roll `spawnTile(newBoard, state.pendingSpawn.value)` + post-merge-ceiling ordering game.ts:46-52; noop shallow-copy 0-draw game.ts:66-70; combined single-roll resolver spawn.ts:16-56). This story delivered only the two missing artifacts: the per-AC contract suite and the structural UI guard.
- **T1** — `pending-spawn-contract.test.ts` (7 tests): AC1 pins next-pending shape/post-merge-ceiling resolution + newGame budget 20 + seed determinism; AC2 pins FR-41 via a seeded ≥10k-effective-move session gated at sigma-scaled 5σ (40/40/pot shares + pot-by-ceiling membership & conditional frequencies) with a same-run N3 equality assert on EVERY materialization; AC3 pins rewind-shape reconstruction AND shallow-copy isolation on both noop (copy-not-reference) and effective paths (later mutation never rewrites earlier snapshots); AC4 pins place-not-roll directly on `spawnTile` (value survives boundary draws 0/0.5/0.9999 with exactly 1 cell draw) plus a value sweep through the live move path plus combined-resolver band edges; AC5 pins noop deep-equality + 0 draws. `sigmaBound`/`runSeededSession` were LIFTED into shared `test-utils/helpers.ts` (the alternative clause T1 explicitly allows — test files never import from other *test* files); `adaptive-spawn-integration.test.ts` had its module-local copies removed in favor of the shared utils but retains all of its tests.
- **T2** — `ui.norolls.test.ts` (new sibling rather than growing `ui.purity.test.ts`, whose RN-import concern is orthogonal): recursive walk of `App.tsx` + `src/ui/**` + `src/render/**` + `src/services/**` (14 files today — services added as an architecture-aligned superset per ADR-01 boundary rule) asserting (a) no import of `resolveSpawn`/`weightedValue`/`spawnTile`/`weightedPicker` from any `/engine/` specifier, (b) no bare source reference to those symbols after comment-and-string stripping (catches namespace calls like `game.spawnTile(...)`), (c) no `Math.random` in view source. Runtime-bound files get no exemption they don't already need — the roll-symbol rule applies uniformly.
- **T3** — engine files byte-identical (git-tracked tree clean except the two new test files plus the test-infra lift: `test-utils/helpers.ts` and `adaptive-spawn-integration.test.ts` modified, no production source touched); `npm test` 288/288 including `engine.purity.test.ts`; default `npx tsc --noEmit` CLEAN. The `-p tsconfig.test.json` gate fails pre-existing at baseline (TS5101 + masked stub-typing errors) — waived by owner, deferred with evidence to `deferred-work.md` ("Deferred from: dev of story 7-1…", 2026-08-24).
- No ledger entries were closed (nothing in this story's diff genuinely closes prior deferrals).

### File List

- triade/__tests__/engine/pending-spawn-contract.test.ts (new)
- triade/__tests__/ui/ui.norolls.test.ts (new)
- triade/test-utils/helpers.ts (modified — sigmaBound/runSeededSession lifted in, preSpawnBoardOf/stripCommentsAndStrings added, extractNamedImports extended, mulberry32 re-export rewritten as import+export) *(omitted in the original record; corrected by review)*
- triade/__tests__/engine/adaptive-spawn-integration.test.ts (modified — module-local copies replaced by shared-util imports; all tests retained) *(omitted in the original record; corrected by review)*
- _bmad-output/implementation-artifacts/sprint-status.yaml (status tracking)
- _bmad-output/implementation-artifacts/deferred-work.md (new deferral entry)
- _bmad-output/implementation-artifacts/7-1-pendingspawn-pre-resolvido-no-snapshot.md (this story)

## Change Log

- 2026-08-24: Story 7.1 implemented (test-only). Added `triade/__tests__/engine/pending-spawn-contract.test.ts` pinning ACs 1–5 by name (7 tests) and `triade/__tests__/ui/ui.norolls.test.ts` adding the "UI never rolls" structural guard (AC4 enforcement). Shared test utils lifted into `triade/test-utils/helpers.ts` (adaptive-spawn-integration switched to them, tests retained). No engine or production source changed. Suite count 280 → 288, all green; default tsc gate clean. Pre-existing failure of the `-p tsconfig.test.json` gate documented and deferred per owner decision.
- 2026-08-24: Code review executed (Blind Hunter + Edge Case Hunter + Acceptance Auditor, parallel layers). Findings appended below; Dev Agent Record factual corrections applied (file list omissions, scan-root/count description, test totals); review patches applied to test infra (fp-safe band-edge probes, session move cap, sigmaBound guards, string-aware scanner cleaning, hardened walker, namespace/default import capture, strict spyRng).

### Review Findings

> Review of branch diff `870c9ab..feature/7-1-pendingspawn-pre-resolvido-no-snapshot`. Verified non-findings: no production/engine source changed; all ACs 1–5 pinned by named tests matching `[P0] AC{n}` convention; baseline 280 green at `870c9ab`, working tree 288 green including `engine.purity.test.ts`; scanning `src/services/**` is an architecture-aligned superset, not a violation.

- [x] [Review][Patch] Band-edge test relies on unguaranteed float round-trip `(acc/total)*total === acc`; if it rounds low, the edge probe selects band `i` and fails — plus the clamp `Math.min(edgeDraw - 1e-12, …)` can go negative and the last band's upper edge (~1.0) is never exercised [triade/__tests__/engine/pending-spawn-contract.test.ts:204]
- [x] [Review][Patch] `runSeededSession` has no iteration cap — any future regression producing permanent stuck states turns the loop into a CI hang instead of a fast failure [triade/test-utils/helpers.ts:93]
- [x] [Review][Patch] `sigmaBound` input guards missing: `n <= 0` yields Infinity (vacuous pass), `expected` ∈ {0,1} yields zero-tolerance exact gates [triade/test-utils/helpers.ts:83]
- [x] [Review][Patch] UI scanner precision: bare-symbol regex matches roll names inside string/template literals (false positives), while `stripComments`'s `/\/\/.*$/gm` treats `://` inside strings as comments and can delete real trailing code from the scanned text (false negatives) [triade/__tests__/ui/ui.norolls.test.ts:63, triade/test-utils/helpers.ts]
- [x] [Review][Patch] Walker robustness: no pruning of `node_modules`/dot-directories, no symlink-cycle protection (`stat` follows links, no visited set), silent skip of non-`.ts/.tsx` files (a `.js` view file escapes the guard), raw ENOENT on dangling paths kills suite without context [triade/__tests__/ui/ui.norolls.test.ts:27]
- [x] [Review][Patch] `extractNamedImports` misses brace-less namespace imports (`import * as ns`) — an unused namespace import of an engine module evades guard rule #1 (rule #2 only catches referenced usage) [triade/test-utils/helpers.ts:161]
- [x] [Review][Patch] `isEngineSpecifier` requires a literal `/engine/` substring — bare or aliased engine specifiers evade rule #1's named-import prohibition [triade/__tests__/ui/ui.norolls.test.ts:50]
- [x] [Review][Patch] `spyRng` exhaustion silently substitutes 0.5 — an unexpected extra engine draw passes quietly in order-sensitive sweeps until the draw-count assert fires with a confusing message; make exhaustion throw in this suite [triade/__tests__/engine/pending-spawn-contract.test.ts:25]
- [x] [Review][Patch] Dev Agent Record inaccuracies: "`adaptive-spawn-integration.test.ts` untouched" is false (modified: lifted ~73 lines out); File List omits the two modified tracked files; completion notes claim "replicated module-local" while the code lifted to shared utils (mutually contradictory); scan described as 3 roots / 10 files but implements 4 roots / 14 files; recorded 287 pass / 6 contract tests vs actual 288 / 7 [story file: Dev Agent Record, File List, Change Log]
- [x] [Review][Patch] Header comment "never imported across test files" contradicts the shared-lift design this diff performs — reword to state they live in shared test utils, never imported from another *test* file [triade/__tests__/engine/pending-spawn-contract.test.ts:21]
- [x] [Review][Patch] Tautological `assert.ok(N >= 10000)` — length equals target by harness construction; remove or replace with a meaningful invariant [triade/__tests__/engine/pending-spawn-contract.test.ts:86]
- [x] [Review][Patch] AC1 re-implements the pre-spawn-board tier-reconstruction inline although the lift was motivated by anti-drift sharing — extract to a shared helper or cross-reference to prevent divergence [triade/__tests__/engine/pending-spawn-contract.test.ts:63]

Dismissed during triage (2): (a) AC2 statistical gates treat autocorrelated trajectory samples as iid Bernoulli — the 5σ `sigmaBound` pattern is explicitly mandated by the story spec as the 2.6 convention; changing methodology exceeds story scope. (b) AC2 covers only tiers visited by the single fixed seed — same spec-mandated single-seeded-session convention; optional future enhancement, not a defect against this story's contract.

### Review Findings — Pass 2 (2026-08-24, verification pass over post-patch state)

> Second full review of branch diff `870c9ab..feature/7-1-pendingspawn-pre-resolvido-no-snapshot` (working tree incl. pass-1 patches). All 12 pass-1 patches verified genuinely implemented (Auditor: ✅ #127–#138); all ACs 1–5 confirmed properly pinned (8/8 tests green). New findings below are residual gaps introduced or left open by the patches themselves.

- [x] [Review][Patch] `stripCommentsAndStrings`: `${` pushes `'code'` mode but nothing pops back to `'template'` — template tail stays visible as code (false positives in norolls guard) AND the closing backtick then pushes a bogus `'template'` mode that swallows subsequent real code (false-negative hole; empirically demonstrated: `` `error ${e} can't happen`; resolveSpawn(48, rng) `` hides the `resolveSpawn` call). Also breaks the length-preserving invariant (emits 3 spaces for the 2-char `${`) [triade/test-utils/helpers.ts:213-285]
- [x] [Review][Patch] `extractNamedImports` drops the default binding in mixed imports (`import Foo, { Bar } from '…'`) — brace branch wins so `Foo` is never captured, contradicting the new comment "guards see every imported name"; layer 1 of the norolls guard misses it [triade/test-utils/helpers.ts:266-309]
- [x] [Review][Patch] `extractNamedImports`: inline-type named imports (`import { type spawnTile } from '…'`) produce the unparsed name `"type spawnTile"` which misses `ROLL_SYMBOLS.has(name)` — only `import type { … }` is handled [triade/test-utils/helpers.ts:296-300]
- [x] [Review][Patch] `isEngineSpecifier` under-matches barrel specifiers without a trailing slash (`'../src/engine'`, `'./src/engine'`) — an engine-barrel import of roll symbols evades guard rule #1 [triade/__tests__/ui/ui.norolls.test.ts:50-54]
- [x] [Review][Patch] `runSeededSession` has no guard on `targetSpawns <= 0` — silently returns empty arrays; callers divide by `N=0` surfacing as a confusing `sigmaBound requires n > 0` throw instead of a harness error [triade/test-utils/helpers.ts:124-127]
- [x] [Review][Patch] Noop-isolation test never asserts `noopRes.moved === false` — copy-isolation asserts pass for any result, so if the board ever stopped being a noop board the test silently stops testing what its title claims [triade/__tests__/engine/pending-spawn-contract.test.ts:151-157]
- [x] [Review][Patch] Near-vacuous precondition `assert.ok(spawn.cell && spawn.value !== null)` — truthy-array check passes `undefined`; cannot fail before the stricter `strictEqual(spawn.value, 42)` two lines later [triade/__tests__/engine/pending-spawn-contract.test.ts:179]
- [x] [Review][Patch] Per-tier composition gates silently vanish below 50 samples (`potValues.length < 50` → `continue`) with no report of gated-vs-skipped tiers — a regression that skews tier traffic converts the strictest gates into silent skips behind a green run [triade/__tests__/engine/pending-spawn-contract.test.ts:123]
- [x] [Review][Defer] Scanner treats regex literals as plain code — an apostrophe inside a regex (e.g. `/it's/`) flips `stripCommentsAndStrings` into string mode and blanks remaining real code (guard false negatives); documented limitation but blast radius understated — deferred, not caused by this story's contract (no such pattern exists in scanned sources today) [triade/test-utils/helpers.ts:168]

Dismissed during triage (8): (a) claimed ULP-stepping stall via round-to-even ties — increments are ≥ 1 ulp of `r` by construction, progress guaranteed; (b) claimed aliased-import gap — `extractNamedImports` splits BEFORE `\s+as\s+`, so aliases ARE caught by rule #1; (c) string-keyed references (`handlers['spawnTile']`) escaping rule 2 — deliberate tradeoff of string-blanking (avoids false positives on error-message text); (d) top-level `pots` bucket accepting illegal values ≥ 3 — per-tier `pot.includes(v)` membership check validates them; (e) unused `displayRolls` in the 7.1 suite — consumed and asserted by the 2.6 integration suite; (f) AC1 hardcoded draw scripts coupling to config constants — exact-budget pinning (20 draws) is explicitly mandated by this story's spec; (g) AC3 "rewind" test never rewinds — reconstruction+replay IS the spec's own ADR-06 rewind-shape definition; (h) `sigmaBound` guards change failure-mode diagnostics at caller sites — message still identifies the violated precondition.
