# 3-clone - Architecture

**Date:** 2026-08-06

## Executive Summary

**3-clone** is a mobile-first, dependency-free PWA that plays a Threes-style sliding-tile puzzle. The architecture enforces a strict separation between **pure game logic** (`js/game.js` — a framework-free, UMD-exported module that is fully unit-testable in Node) and a **thin presentation layer** (`js/ui.js` — DOM rendering and input only). The UI consumes a movement *trace* produced by the logic engine, so animations are attributed from real movement data rather than heuristics. The app is a static site (no backend, no build step) made installable and offline-capable via a web manifest and service worker.

## Technology Stack

| Category | Technology | Version | Justification |
|----------|-----------|---------|---------------|
| Language | JavaScript (vanilla) | ES5 + ES6 | No deps, no build; runs in browser + Node |
| Runtime | Browser + Node.js | Node 18+ | UMD module enables `node:test` unit tests |
| Markup/Styling | HTML5 / CSS3 | — | Static shell; CSS custom properties for theming |
| Persistence | `localStorage` | — | Best-score (`three_best`) |
| PWA | Service Worker + Manifest | — | Offline cache, installability |
| Icons | Self-generated PNG | — | `scripts/make-icons.js` (zero-dep, uses `zlib`) |
| Testing | `node:test` | built-in | 26 tests, no framework dependency |

## Architecture Pattern

**Layered client-only (rules engine → presentation).**

```
┌─────────────────────────────────────────────────────────┐
│ index.html (app shell)                                  │
│   header (title, SCORE, BEST) · board · game-over overlay│
└───────────────┬──────────────────────────────┬──────────┘
                │ loads                      │ registers
┌───────────────▼──────────┐     ┌────────────▼────────────┐
│ js/game.js (PURE LOGIC)  │     │ sw.js (service worker)  │
│  board state · move(dir) │     │  precache · cache-first │
│  merge rules · spawn     │     │  fetch · cache pruning  │
│  score · game-over       │     └─────────────────────────┘
│  UMD export              │
│  ↑ consumed by           │     ┌─────────────────────────┐
│  js/ui.js (PRESENTATION) │     │ manifest.webmanifest    │
│   renderBoard(trace)     │     │  installability         │
│   swipe + keyboard       │     └─────────────────────────┘
│   score/best/overlay     │
└────────────┬─────────────┘
             │ uses
┌────────────▼─────────────┐
│ js/debug.js (ThreeDebug) │  dev/playtest aid
└──────────────────────────┘
```

## Data Architecture

There is **no server, no database, no API**. The only persistent state is:

- **Best score**: `localStorage['three_best']`, an integer. Read at startup (`loadBest`, safe parse with fallback `0`) and written whenever the current score exceeds it (`saveBest`). Both wrapped in try/catch to tolerate storage unavailability.

The in-memory game state consists of:

- **Board**: a `4×4` array of `null` (empty) or a tile value (1, 2, 3, then doubles: 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, …).
- **Score**: integer, summed per effective move.
- **Trace** (per move): array of `{ value, to: [r,c], from: [[r,c]…], spawned: bool }` describing every tile's destination, source(s), and whether it was spawned — the contract between logic and UI.

## API Design

No API. This is a purely client-side application.

## Component Overview

See [component-inventory.md](./component-inventory.md) for the full catalog. Key runtime components:

- **`ThreeGame`** (`js/game.js`): pure rules engine — `newGame`, `move`, `spawnTile`, `weightedValue`, `isGameOver`, `canMerge`, `mergeValue`, `SIZE`.
- **UI bootstrap** (`js/ui.js` IIFE): owns DOM references, board/tile rendering, input, score, game-over flow.
- **`ThreeDebug`** (`js/debug.js`): in-app logging panel; `log`, `boardToString`, `traceSummary`, `toggle`.
- **Service worker** (`sw.js`): install/activate/fetch lifecycle for offline caching.
- **Icon generator** (`scripts/make-icons.js`): standalone Node tool producing `icons/icon-{180,192,512}.png`.

## Source Tree

See [source-tree-analysis.md](./source-tree-analysis.md) for the annotated directory tree.

## Core Design Decisions

### 1. Pure logic module with UMD export (critical)

`js/game.js` has zero DOM/globals and uses a UMD wrapper: `module.exports` in Node (for `node:test`) and `window.ThreeGame` in the browser. This is what makes the tricky merge rules testable before/without any UI. **Invariant:** rules live only here; `ui.js` never re-implements merge/spawn/game-over logic.

### 2. One-cell movement, merge-once (the Threes-authentic model)

During a swipe each tile moves **at most one cell** toward the wall; it may merge **once**; a tile just created by a merge is locked for that swipe. This yields `[3,3,3,3] → [6,3,3,_]` (only the wall pair merges, trailing tiles advance one cell) and `[1,2,3,_] → [3,3,_,_]` (the new 3 does not re-merge). Implemented front-to-back in `shiftLine` with simultaneous-tile semantics (see `game.js`).

**Merge predicate:** `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)`. **Merge value:** `a<=2 ? 3 : a*2`.

### 3. Trace-driven rendering

`move()` returns `{ board, score, moved, trace }`. `ui.js` renders purely from the trace: source → destination slides, merge partners folded in then removed, spawn flagged. Two `requestAnimationFrame` commits force the browser to render source positions before transitioning, so animations are correct without value-matching heuristics.

### 4. Spawn only after an effective move

`move()` compares the board before/after (`boardsEqual`); a tile is spawned (weighted 40/40/20 for 1/2/3) in a uniformly random empty cell **only if** the grid changed. Noop swipes spawn nothing and don't consume a turn.

### 5. Resilient service worker

- **Install**: caches each shell file individually; only calls `skipWaiting()` if the whole shell cached — a partial failure keeps the previous SW active.
- **Activate**: prunes only caches under this app's `three-` prefix (never other apps' caches).
- **Fetch**: cache-first, network fallback with runtime caching of successful GETs (guarded, non-redirected); offline navigate falls back to cached `index.html`, else a 503 Response (never `respondWith(undefined)`).

### 6. Robust pointer input

Single-pointer tracking with `setPointerCapture` so releases outside the board still register; `pointercancel`, `lostpointercapture`, and a window-level `pointerup` safety net prevent the board from deadlocking into ignoring swipes. Arrow keys route through the same `doMove(dir)` path as swipes (shared rules).

## Development Workflow

See [development-guide.md](./development-guide.md) for setup, commands, and testing.

## Deployment Architecture

- **Deployment**: static hosting of the project root (any static host / HTTP server). No Docker, no CI/CD, no server-side config.
- **Runtime requirements**: HTTPS (or `localhost`) for service workers, modern browser for PWA installability.
- **Offline**: once the app has been loaded, the service worker serves the app shell and runtime-cached assets cache-first.
- **Cache versioning**: bump `CACHE_NAME` in `sw.js` when the shell changes to force re-caching.

## Testing Strategy

- **Framework**: Node built-in test runner (`node --test`) — no external test deps.
- **Scope**: `test/game.test.js` covers the full I/O matrix: happy-path merge, `1+2` in either order, no-merge for `1+1`/`2+2`, equal-≥3 merges, blocked cascades, one-cell movement (left/right/up), noop swipes, game-over detection (empty cell / row 1-2 adjacency / column 1-2 adjacency / equal ≥3 adjacency), higher-value merges, spawn-once-after-effective-move, and trace-level assertions (merge sources, spawn flags, noop).
- **Determinism**: tests inject a `rng` (values in sequence, then `0.5`) so spawns and weighted values are predictable.
- **Known tradeoff**: UI, service worker, and manifest behavior are covered by manual browser checks, not automated tests.

---

_Generated using BMAD Method `document-project` workflow_
