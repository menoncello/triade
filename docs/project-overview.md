# 3-clone - Project Overview

**Date:** 2026-08-06
**Type:** Web (PWA)
**Architecture:** Single-page application, vanilla JS, zero dependencies

## Executive Summary

**3-clone** is a mobile-first Progressive Web App that clones the puzzle game "Three!" (Threes-style sliding tiles). The goal is a playable, installable, offline-capable game with score tracking. The game logic is a pure, framework-free module (`js/game.js`) that is fully unit-tested in Node via `node:test`; the UI layer (`js/ui.js`) renders the board and drives input, but never duplicates game rules. The app ships as a static PWA with a service worker (`sw.js`) for offline caching and a self-generated PNG icon set (no external CDN assets).

The MVP is complete: core rules engine, 26 passing tests, UI with swipe + keyboard input, score/best-score persistence via `localStorage`, game-over overlay, service worker offline support, and web-manifest installability.

## Project Classification

- **Repository Type:** Monolith
- **Project Type(s):** Web (PWA)
- **Primary Language(s):** JavaScript (vanilla ES5/ES6), HTML, CSS
- **Architecture Pattern:** Layered client-only — pure game logic consumed by a thin DOM/UI layer; no backend

## Technology Stack Summary

| Category | Technology | Version | Justification |
|----------|-----------|---------|---------------|
| Language | JavaScript (vanilla) | ES5 + some ES6 | Zero build step, no runtime dependencies, runs in browser and Node |
| Runtime | Browser + Node.js (tests) | Node 18+ (node:test) | Logic module is UMD-exported for `node:test` coverage |
| Markup | HTML5 | — | App shell in `index.html` |
| Styling | CSS3 (custom properties) | — | Mobile-first, CSS `min()` board sizing, animations |
| Storage | `localStorage` | — | Best-score persistence (`three_best`) |
| Offline | Service Worker | — | Precaches app shell; cache-first with network fallback |
| Installability | Web App Manifest | — | `manifest.webmanifest`, standalone display, icons |
| Icons | Self-generated PNGs | — | `scripts/make-icons.js` (zero-dep Node script using `zlib`) |
| Testing | Node built-in test runner | `node:test` | 26 tests, no framework dependency |

## Key Features

- **Threes-style merge rules**: 1+2 = 3; equal tiles ≥ 3 merge (3+3=6, 6+6=12…); 1+1 and 2+2 never merge.
- **One-cell movement**: each tile moves at most one cell per swipe; no compaction, no cascading merges.
- **Weighted spawn**: 40/40/20 distribution of 1/2/3 in a uniformly random empty cell, only after an effective move.
- **Score & best score**: score increments by merged tile value; best persisted in `localStorage`.
- **Game-over detection**: grid full and no adjacent mergeable pair triggers overlay with final/best score.
- **Dual input**: touch swipe (pointer events, 20px threshold, pointer capture) + arrow keys.
- **PWA**: installable via manifest, offline play via service worker, responsive landscape/portrait board.
- **Debug panel**: `js/debug.js` ships a toggleable in-app debug log (playtest aid; toggle `D` key or Debug button).

## Architecture Highlights

- **Single source of truth for rules**: `js/game.js` is a pure, dependency-free module exposing `newGame`, `move`, `spawnTile`, `weightedValue`, `isGameOver`, `canMerge`, `mergeValue`. The UI never re-implements rules.
- **Trace-driven rendering**: `move()` returns a per-tile trace (source → destination, merge partners, spawn flag) that `ui.js` renders as slides/merges/spawns, fixing animation attribution issues.
- **UMD pattern**: `game.js` exports to `module.exports` in Node and `window.ThreeGame` in the browser — the same file powers the game and the test suite.
- **Resilient service worker**: per-file install (partial failure keeps previous SW active), app-prefixed cache pruning, guarded offline fallbacks.

## Development Overview

### Prerequisites

- Node.js 18+ (for tests and icon generation). No other tools required.
- A modern browser with service worker support for full PWA functionality.
- No build step, no package.json, no npm dependencies.

### Getting Started

1. Serve the project root over HTTP (e.g. `python3 -m http.server 8080`).
2. Open in a browser; swipe or use arrow keys to play.
3. For touch testing, open on a phone over the LAN.

### Key Commands

- **Test:** `node --test`
- **Generate icons:** `node scripts/make-icons.js`
- **Dev server:** `python3 -m http.server 8080` (or `npx serve`)
- **Install:** N/A (no dependencies)

## Repository Structure

```
3-clone/
├── index.html              # App shell
├── css/style.css           # Mobile-first styles + animations
├── js/game.js              # Pure game logic (rules engine)
├── js/ui.js                # DOM rendering + input
├── js/debug.js             # In-app debug panel
├── manifest.webmanifest    # PWA metadata
├── sw.js                   # Service worker (offline cache)
├── icons/                  # Generated PNG icons (180/192/512)
├── scripts/make-icons.js   # Zero-dep icon generator
├── test/game.test.js       # node:test unit tests
├── docs/                   # Project documentation (this set)
└── _bmad-output/           # BMad workflow artifacts
```

## Documentation Map

For detailed information, see:

- [index.md](./index.md) - Master documentation index
- [architecture.md](./architecture.md) - Detailed architecture
- [source-tree-analysis.md](./source-tree-analysis.md) - Directory structure
- [component-inventory.md](./component-inventory.md) - Component catalog
- [development-guide.md](./development-guide.md) - Development workflow

---

_Generated using BMAD Method `document-project` workflow_
