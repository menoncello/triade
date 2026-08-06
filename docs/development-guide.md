# 3-clone - Development Guide

**Date:** 2026-08-06

## Prerequisites

- **Node.js 18+** — for the unit tests (`node:test`) and the icon generator. No other tools, no package managers, no global installs.
- **A modern browser** — for playing/testing; service worker support (HTTPS or `localhost`) for full PWA/offline behavior.
- **A phone on the same LAN** (optional) — for real touch testing.

## Environment Setup

There is **no setup**. The project has no `package.json`, no dependencies, no build step, no `.env`. Cloning/copying the folder is sufficient.

## Local Development Commands

### Serve the app

```bash
python3 -m http.server 8080
# or
npx serve
```

Then open `http://localhost:8080` (or the LAN IP from a phone). Serving over HTTP (not `file://`) is required for the service worker.

### Run the tests

```bash
node --test
```

Expected result: 26 tests pass (rules engine coverage).

### Generate icons

```bash
node scripts/make-icons.js
```

Regenerates `icons/icon-180.png`, `icons/icon-192.png`, `icons/icon-512.png` (zero-dep, uses Node's `zlib`).

## Build Process

There is **no build step**. The browser consumes source files directly from `index.html` in this order:

```
js/game.js → js/debug.js → js/ui.js
```

(The order matters: `game.js` must define `window.ThreeGame` and `debug.js` must define `window.ThreeDebug` before `ui.js` runs.)

## Testing Approach

- **Framework:** Node built-in test runner (`node --test`), `node:assert`. No external test libraries.
- **File:** `test/game.test.js` requires `../js/game.js` via its CommonJS/UMD export.
- **Determinism:** tests inject a fake RNG (`rngOf(...)` returning queued values then `0.5`) to make spawns and weighted values predictable.
- **Board helpers:** `emptyBoard()`, `staticBoard(row)` (fills rows 1–3 with an immobile `[3,6,12,24]` so tests isolate a row), `boardWith(matrix)`.
- **Coverage:** full I/O matrix (merges, one-cell movement, noops, game-over), higher-value merges, spawn-once, and trace-level assertions.

### Manual checks (not automated)

- **Swipe all 4 directions** on a phone (DevTools mobile emulation also works): verify merges match the I/O matrix, score increments, noop swipe spawns nothing.
- **Keyboard:** arrow keys produce identical boards to swipes.
- **Offline:** load once → go offline → reload → game still plays (service worker).
- **Installability:** "Add to Home Screen"/"Install" prompt; installed app opens standalone.
- **Game over:** fill the grid with no mergeable pair → overlay shows final + best score; "Play again" starts fresh.
- **Best score persistence:** reload after a high score → BEST restored from `localStorage`.

## Common Development Tasks

### Modify a merge rule

Edit **only** `js/game.js` (`canMerge` / `mergeValue` / `shiftLine`), then add/extend cases in `test/game.test.js` and run `node --test`. Never change rules in `ui.js`.

### Add a tile color tier

Add a `.tile-{value}` rule (and optionally a text tier) in `css/style.css`. Values > 768 automatically fall back to `.tile-big`.

### Change spawn weights / starting tile count

These are **"Ask First"** items per the spec (defaults: 9 starting tiles; weights 40/40/20 for 1/2/3). The weights live in `weightedValue` (`js/game.js`); the count lives in `newGame` (the `for (var i = 0; i < 9; i++)` loop).

### Force the service worker to update

Bump `CACHE_NAME` in `sw.js` (e.g. `'three-v4'` → `'three-v5'`) whenever the app shell changes. The SW's per-file install + full-shell gate keeps a broken partial cache from activating.

### Debug the game

Press **D** (or the on-screen **Debug** button) to toggle the in-app debug panel. It logs new games, moves (before/after boards, score deltas, movement traces), and game over. Ships in production as a playtest aid by current decision.

## Contribution Guidelines

No CONTRIBUTING file exists. Project conventions to respect:

- **Zero dependencies / no build step** — this is a hard boundary; do not add npm packages or a bundler.
- **Rules only in `js/game.js`** — the UI must not duplicate game logic.
- **Keep the UMD export** in `game.js` so `node --test` keeps working.
- **Plain ES5-compatible JS in browser files** (var, function IIFEs) — the codebase does not use modern module syntax in the browser scripts.
- **No emojis in code/comments; minimal comments** — code is meant to be read directly.
- **Test anything that touches merge/spawn/game-over logic** in `test/game.test.js`.

---

_Generated using BMAD Method `document-project` workflow_
