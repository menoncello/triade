# Epic 1 Context: Plataforma RN + Skia jogável

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establish the playable foundation: a React Native app on Expo SDK 57 that installs from the App Store, runs a faithful 4×4 merge-puzzle board fully offline in portrait and landscape, with all rules owned by a pure TypeScript engine and all visuals derived from its per-tile trace — de-risked up front by a technical spike with benchmarks before the full build-out.

## Stories

- Story 1.1: Spike técnico engine + board + benchmark
- Story 1.2: Port completo do engine de regras para TypeScript
- Story 1.3: Board Skia declarativo dirigido pelo trace
- Story 1.4: Offline instalável e persistência
- Story 1.5: Layout portrait e landscape
- Story 1.6: Input por swipe com edge cases
- Story 1.7: Legibilidade dos numerais em landscape mínimo

## Requirements & Constraints

- Rules fidelity: 9 starting tiles; merges are 1+2 → 3 and equal ≥3 doubling only (1+1 and 2+2 never merge); each tile merges at most once per swipe and moves at most one cell; spawn goes to a uniform random empty cell only after an effective (board-changing) move; NOOP never spawns, scores, or consumes a turn; game over is full grid with no adjacent mergeable pair.
- Engine contract: `move(state, dir)` returns board, score, moved flag, and per-tile trace; engine never throws — returns ok/rejected results and stays silent to the player on rejection.
- Test gate: the 26 existing unit tests pass unchanged against the ported engine via `node --test`; the spike's benchmark ships in the same PR.
- Performance budgets: engine cost < 2ms per turn and frame logic worst case < 8ms in deterministic CI; device job p99 under one frame (~16.7ms) over a sustained 10-minute session with merges, spawns, and feel effects.
- Offline and installable: full session with no connection and no backend/accounts; instant boot and instant restart with no loading screens; best score, settings, and lane default survive kill/relaunch; entitlements survive separately from per-match state.
- Orientation: board stays playable and maximized in both portrait and landscape with safe-area handling; landscape uses a frozen single-row HUD band (score+best left, preview center-right, pause far right, small fixed gap).
- Input determinism: dominant-axis lock held until gesture end, small movement threshold, first-finger-wins, in-flight gestures rejected silently with no turn, off-board release resolves as captured, cancel/interruption costs no turn.
- Readability floor: 4+ digit tiles never clip even on the smallest landscape tile; visually similar values stay distinguishable at arm's length and without color; no portrait regression.
- iOS first from the same codebase; development build only (never Expo Go); no external CDN assets — everything ships self-contained.

## Technical Decisions

- Spike-first sequencing: port the engine plus one static Skia board with the CI benchmark before committing to the full architecture.
- Engine purity wall: framework-free TypeScript module with no RN/React/Skia imports; render, feel, audio, and telemetry are observers of typed past-tense engine events, never rule owners; frame math lives in pure testable functions with the worklet as a thin binding.
- Rendering split: declarative board derived only from the engine trace plus an imperative feel layer in worklets; UI never duplicates rule logic.
- Input isolation: gesture math lives in a pure framework-free input module; the pan recognizer mounts only on the board gesture view, never on HUD chrome.
- Persistence split: fast key-value store for settings, best score, and lane memory; secure store as the authoritative offline mirror for entitlements; per-match budgets kept in memory only and die with the match.
- Config as typed data: spawn, theme, and strings come from data modules rather than scattered literals; structured JSON logging with errors routed to crash reporting and no frame/worklet logging in release.
- Pinned stack: Expo SDK 57 blank-typescript with Skia, Reanimated/worklets, gesture-handler, MMKV for fast storage, secure-store for entitlements, and safe-area-context; exact versions come from the single pinned matrix in planning docs.
- Layout skeleton: pure-engine and orchestrator code separated from render, feel, UI, services, state (screens/settings only, never board), accessibility, theme, i18n, dev-only helpers, benchmarks, and tests.

## UX & Interaction Patterns

- Portrait places score top-center with muted best below, pause top-right, and a floating preview card; landscape freezes the compact top band geometry described above.
- Tile numerals use a stepped scale that shrinks with digit count down to a small floor reserved for 6-digit values; chrome follows a shared pressed fill+shadow and double-ring focus contract with disabled styling reserved for consumed offers.
- Touch-first with generous tap targets throughout; gestures live on the board only so HUD taps never leak into moves.

## Cross-Story Dependencies

- Story 1.1 (spike + benchmark) gates everything: 1.2 (full engine port) and 1.3 (trace-driven board) build directly on its proven engine snapshot and measurement harness.
- Story 1.2 is the foundation for 1.3 (trace rendering), 1.6 (deterministic input against the move contract), and all later spawn/preview/undo work that consumes snapshots and traces.
- Story 1.4 (offline persistence) and 1.5 (responsive layout) can proceed in parallel once the board renders, but both assume the engine contract from 1.2 is stable.
- Story 1.7 (numeral legibility) is a polish pass on top of 1.3 and 1.5 — verify smallest-landscape-tile readability last, without regressing portrait.
