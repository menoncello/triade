# 3-clone - Component Inventory

**Date:** 2026-08-06

## Overview

The project has no framework component system. "Components" are the discrete, re-usable units of behavior and structure in the vanilla JS app. They fall into three groups: **runtime modules** (global JS modules), **UI elements** (DOM/CSS pieces rendered dynamically), and **tooling scripts**.

## Runtime Modules (Global JS)

| Component | Location | Type | Role | Exposed API |
|-----------|----------|------|------|-------------|
| `ThreeGame` | `js/game.js` | Pure logic module (UMD) | Rules engine — board state, movement, merging, spawn, scoring, game-over | `SIZE`, `canMerge`, `mergeValue`, `newGame`, `move`, `spawnTile`, `weightedValue`, `isGameOver` |
| UI bootstrap | `js/ui.js` | IIFE (no export) | Renders board, handles input, updates score, manages overlay | (internal; reads `window.ThreeGame`, `window.ThreeDebug`) |
| `ThreeDebug` | `js/debug.js` | IIFE (global) | In-app debug log panel | `log`, `boardToString`, `traceSummary`, `toggle` |
| Service worker | `sw.js` | Service worker | Offline caching | `install`/`activate`/`fetch` handlers |

### `ThreeGame` (rules engine)

The core, framework-free module. All game rules are implemented here and consumed by the UI.

| Function | Purpose |
|----------|---------|
| `newGame(rng)` | Builds a fresh board with 9 weighted starting tiles in uniformly random cells |
| `move(board, dir, rng)` | Applies a swipe (left/right/up/down); returns `{ board, score, moved, trace }` |
| `spawnTile(board, rng)` | Spawns one weighted tile in a random empty cell; returns `{ board, cell, value }` |
| `weightedValue(rng)` | Returns 1/2/3 with 40/40/20 probability |
| `isGameOver(board)` | True when grid is full and no adjacent mergeable pair exists (rows/cols, `1`-adjacent-`2` or equal ≥3) |
| `canMerge(a, b)` | Merge predicate: `(1&&2)` either order or `(a>=3 && a===b)` |
| `mergeValue(a, b)` | `3` if a ≤ 2, else `a*2` |
| `SIZE` | Grid dimension (4) |

## UI Elements (Rendered DOM)

| Element | Created by | Class / Id | Purpose |
|---------|-----------|-----------|---------|
| Board container | `index.html` | `#board.board` | 4×4 grid container; swipe target; `role="grid"` |
| Cell (background) | `ui.js` `buildCells()` | `.cell` | Static 4×4 background grid |
| Tile | `ui.js` `createTile()` | `.tile.tile-{value}` (+ `tile-spawn` / `tile-merge`) | Movable game tiles; value class drives color tier; text sizing tiers (`tile-text-sm/xs/xxs`) |
| Score box | `index.html` | `.score-box` → `#score`, `#best` | Current score and best score |
| Game-over overlay | `index.html` | `#overlay.overlay` → `#final-score`, `#final-best`, `#play-again` | End-of-game dialog with play-again |
| Debug toggle button | `debug.js` `createPanel()` | `#dbg-toggle` | Opens/closes debug panel |
| Debug panel | `debug.js` | `#dbg-panel.dbg-list.dbg-entry` | Logs move/merge/spawn/over events with board dumps |

### Tile color tiers (CSS)

Values 1 and 2 have distinct colors; 3+ use a warm palette darkening as values grow; values above 768 reuse a final "big" tier:

| Value | Class | Visual |
|-------|-------|--------|
| 1 | `.tile-1` | blue |
| 2 | `.tile-2` | red |
| 3, 6, 12, … 768 | `.tile-{value}` | warm amber → deep brown scale |
| > 768 | `.tile-big` | darkest tier |

### Animations (CSS)

| Animation | Applied to | Purpose |
|-----------|-----------|---------|
| `tile-pop` | `.tile-spawn` | New tile scales in (180ms) |
| `tile-merge-pop` | `.tile-merge` | Merge pulse (180ms) |
| `left/top` transition | `.tile` | Slide movement (120ms) |
| `fade-in` | `.overlay` | Overlay fade (200ms) |

## State Management

No external state library. State lives in the `ui.js` closure:

- **`board`** — current 4×4 grid (`null` = empty).
- **`score`** — current run score.
- **`best`** — best score, loaded from/saved to `localStorage['three_best']`.
- **`gameOver`** — flag gating input.
- **`tileEls`** — `Map<"r,c", HTMLElement>` mapping occupied cells to their DOM tiles (rebuilt each render).

The rules engine (`ThreeGame`) is stateless — it takes a board and returns a new board + trace. All mutable game state is owned by the UI layer, which is the single consumer of the engine.

## Re-usable vs Specific

- **Re-usable**: `ThreeGame` (pure, framework-free, UMD — usable anywhere), `scripts/make-icons.js` (standalone PNG generator).
- **Specific**: `ui.js` (tightly bound to this app's DOM structure), `debug.js` (playtest aid shipping in this build), `sw.js` (cache strategy specific to this app's file list).

## Design System Elements

Minimal, hand-rolled design tokens via CSS custom properties in `:root` (`css/style.css`):

| Token | Value |
|-------|-------|
| `--bg` | `#14161f` |
| `--panel` | `#1c1f2b` |
| `--cell` | `#262a3a` |
| `--text` | `#f4f1e8` |
| `--muted` | `#8b8f9e` |
| `--accent` | `#ff8c42` |

Board and tile geometry is expressed in percentage units (cells/tiles `23%`, positioned via `left/top` in `%`), making the layout fully responsive without media queries.

---

_Generated using BMAD Method `document-project` workflow_
