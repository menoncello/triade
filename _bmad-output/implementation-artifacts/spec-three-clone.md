---
title: 'Three! (3!) PWA Clone MVP'
type: 'feature'
created: '2026-08-06'
baseline_commit: NO_VCS
status: 'done'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user wants a playable clone of the mobile puzzle game "Three!" (3!) — a Threes-like sliding-tile game. The MVP must be a mobile-first PWA with score tracking.

**Approach:** Build a dependency-free vanilla JS PWA: 4x4 grid, swipe/keyboard input, Threes-style tile merging (1+2=3, then equal values 3+3=6, 6+6=12…), score + best-score persistence, game-over detection, offline support via service worker, and installable via web manifest.

## Boundaries & Constraints

**Always:**
- Pure client-side, zero runtime dependencies, no build step.
- Game logic in `js/game.js` as a pure, framework-free module (testable in Node).
- New tile spawns ONLY after an effective move (grid changed); a tile produced by a merge cannot merge again in the same swipe.
- All core input paths (touch swipe + arrow keys) must play the same rules.
- Score increments by the merged tile's value; best score persisted in `localStorage`.
- PWA installable: `manifest.webmanifest` + service worker with offline cache + PNG icons.

**Ask First:**
- Changing the starting tile count (default 9) or spawn weights (default 1/2/3 at 40/40/20).
- Adding any feature beyond the MVP scope listed in the I/O matrix (e.g. undo, daily challenge, sound).

**Never:**
- No 2048-style rules (2+2=4). No equal-value merge of 1+1 or 2+2.
- No backend/server logic, accounts, or multiplayer.
- No game engines, frameworks, or external CDN assets (icons must be self-generated).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Swipe left on row `[1,2,_,_]` | Row becomes `[3,_,_,_]`, score +3, new tile spawns in a random empty cell | N/A |
| MERGE_1_2 | Row `[2,1,_,_]` swipe left | Row becomes `[3,_,_,_]` (1 and 2 merge regardless of order) | N/A |
| NO_1_1_MERGE | Row `[1,1,_,_]` swipe left | Row becomes `[1,1,_,_]` — 1+1 does NOT merge, tiles just slide | N/A |
| NO_2_2_MERGE | Row `[2,2,_,_]` swipe left | Row becomes `[2,2,_,_]` — 2+2 does NOT merge | N/A |
| EQUAL_GE3 | Row `[3,3,3,3]` swipe left | Row becomes `[6,3,3,_]` — wall pair merges once into 6; trailing tiles advance one cell (each tile moves at most one cell per swipe) | N/A |
| NEW_TILE_NOT_REMERGED | Row `[1,2,3,_]` swipe left | Row becomes `[3,3,_,_]` — the 3 created from 1+2 does NOT merge with the existing 3 in the same swipe | N/A |
| NOOP_SWIPE | Grid `[[1,2,3,6],[...]]` swipe in a direction that changes nothing | No spawn, no score change, turn not consumed | N/A |
| GAME_OVER | Grid full and no adjacent mergeable pair (any row/col, 1 adjacent 2 or equal ≥3) | Game-over overlay with final score + best; "Play again" starts fresh grid | N/A |

</frozen-after-approval>

## Code Map

- `index.html` -- App shell: header (title, score, best), 4x4 board container, overlay; loads CSS/JS; registers service worker
- `css/style.css` -- Mobile-first layout, tile color tiers per value, slide/spawn/pop animations, overlay styling
- `js/game.js` -- Pure logic: board state, `move(dir)`, merge rules, spawn (weighted 40/40/20), score, game-over check; UMD-ish export for Node testing
- `js/ui.js` -- Render board, touch swipe + arrow-key input, spawn/slide animation hooks, score/best DOM updates, overlay + new-game flow
- `manifest.webmanifest` -- PWA metadata, `display: standalone`, theme colors, icons
- `sw.js` -- Service worker: precache app shell on install, cache-first with network fallback
- `scripts/make-icons.js` -- Zero-dep Node script (uses built-in `zlib`) generating PNG icons (512, 192, 180) with a pixel-font "3" design
- `test/game.test.js` -- `node:test` unit tests covering the I/O matrix merge rules, spawn-after-effective-move, game-over detection

## Tasks & Acceptance

**Execution:**
- [x] `js/game.js` -- implement pure board state + `move(dir)` + merge rules + weighted spawn + score + game-over detection -- core rules engine, must be dependency-free for Node testing
- [x] `test/game.test.js` -- unit-test every I/O matrix row and game-over logic -- lock the tricky merge rules before UI exists
- [x] `index.html` + `css/style.css` + `js/ui.js` -- board rendering, touch swipe + arrow keys, animations, score/best display, game-over overlay + new game -- the playable game shell
- [x] `manifest.webmanifest` + `sw.js` + `scripts/make-icons.js` + icons -- installability + offline -- turns it into a real PWA
- [x] Wire `ui.js` to `game.js` (pure logic consumed by DOM layer; UI never duplicates rules) -- single source of truth for rules

**Acceptance Criteria:**
- Given a fresh board with 9 starting tiles, when I swipe in any direction, then all movable tiles slide, valid merges apply once, and exactly one weighted tile spawns.
- Given I merge 1+2 or equal tiles ≥3, when the swipe completes, then the score increases by the merged value and the board reflects the result per the I/O matrix.
- Given the grid is full with no mergeable pair, when I make any swipe, then a game-over overlay appears showing final and best score with a play-again button.
- Given I reload or reopen the PWA, when a best score exists, then it is restored from `localStorage` and shown.
- Given I install the PWA, when offline, then the game still loads and is fully playable.
- Given touch swipe and arrow keys, when either performs the same gesture on the same board, then both produce identical resulting boards.

## Spec Change Log

- **Finding:** Acceptance auditor flagged `node --test test/` fails on Node 26 (bare directory args dropped). **Amended:** Verification command changed to `node --test` in the non-frozen Verification section. **Avoids:** a stale command that misleads future implementation agents. **KEEP:** the game must stay runnable with Node's built-in test runner; do not introduce a test framework dependency.
- **Finding:** Acceptance auditor flagged the frozen EQUAL_GE3 I/O row (`[3,3,3,3] → [6,6,_,_]`) contradicts the implementation's Threes-authentic one-cell movement (`[6,3,3,_]`) and the Design Note's "at most one cell per swipe" invariant. **Amended (human renegotiated, 2026-08-06):** I/O row EQUAL_GE3 and Design Note updated to `[6,3,3,_]`. **Avoids:** a spec that mandates impossible full compaction while claiming one-cell movement. **KEEP:** each tile moves at most one cell per swipe; freshly merged tiles never merge again in the same swipe.

## Design Notes

- **Merge-once rule (critical):** during a swipe each tile may merge at most once, and a tile just created by a merge is locked for that swipe. This is what makes `[3,3,3,3] → [6,3,3,_]` (only the wall pair merges; trailing tiles advance one cell) and `[1,2,3,_] → [3,3,_,_]` correct.
- **Merge predicate:** `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)`.
- **Value series:** 1, 2, 3, then ×2: 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072. Values above 768 reuse a final color tier.
- **Spawn:** weighted `{1: 40%, 2: 40%, 3: 20%}` in a uniformly random empty cell.
- **Layout:** centered square board sized via CSS `min(90vw, 520px)`; swipe threshold ~20px on `pointerdown/pointerup` delta (or touch events); board remains playable both portrait and landscape.

## Verification

**Commands:**
- `node --test` -- expected: all I/O matrix + game-over tests pass
- `node scripts/make-icons.js` -- expected: PNGs generated under `icons/`
- `python3 -m http.server 8080` (or `npx serve`) -- expected: game loads; open on phone via LAN for touch testing

**Manual checks (if no CLI):**
- In browser (DevTools mobile emulation + a real phone over LAN): swipe all 4 directions, verify merges match the I/O matrix, score increments, noop swipe spawns nothing.
- Verify offline: load once, go offline, reload — game still works.
- Verify installability: browser shows "Add to Home Screen" / "Install" prompt; installed app opens standalone.
- Confirm keyboard arrows work as touch-swipes in desktop mode.

## Suggested Review Order

**Core rules engine**

- Entry point: movement produces board + score + a per-tile movement trace the UI renders from
  [`game.js:164`](../../js/game.js#L164)

- Merge predicate and merge-once rule locked here
  [`game.js:76`](../../js/game.js#L76)

- Direction handling: lines collected toward movement, rebuilt with source coordinates
  [`game.js:49`](../../js/game.js#L49)

- Spawn only after effective move, returns spawned cell for animation
  [`game.js:135`](../../js/game.js#L135)

- Game-over check reuses the same merge predicate as movement
  [`game.js:192`](../../js/game.js#L192)

**Trace-driven rendering**

- Replaces value-matching heuristic: render slides/merges/spawns from the game trace (fixes animation attribution bugs)
  [`ui.js:80`](../../js/ui.js#L80)

- Slide commits source position then transitions to target next frame
  [`ui.js:125`](../../js/ui.js#L125)

- Tile text and size classes updated on every render so merges re-label correctly
  [`ui.js:71`](../../js/ui.js#L71)

**Input handling**

- Single-pointer tracking with pointer capture so releases outside the board register
  [`ui.js:199`](../../js/ui.js#L199)

- Arrow keys route through the same move path as swipes
  [`ui.js:226`](../../js/ui.js#L226)

**PWA shell**

- Resilient precache (per-file, install never aborts on a single miss) + redirected/offline fallbacks
  [`sw.js:16`](../../sw.js#L16)

- Manifest removed portrait lock so the board stays playable in landscape
  [`manifest.webmanifest:7`](../../manifest.webmanifest#L7)

- App shell, service worker registration, overlay hookup
  [`index.html:30`](../../index.html#L30)

**Responsive visuals**

- Board sized with `min(90vw, 60vh, 520px)` so landscape/short viewports never clip the grid
  [`style.css:88`](../../css/style.css#L88)

- Tile slide transition moved to left/top; large-value text tiers added
  [`style.css:106`](../../css/style.css#L106)

**Tests**

- Trace-level assertions (merge sources, spawn flags, noop) added alongside the I/O matrix coverage
  [`game.test.js:243`](../../test/game.test.js#L243)

## Review Findings (gds-code-review, 2026-08-06)

### decision_needed

- [x] [Review][Decision] EQUAL_GE3 movement model — **RESOLVED (2026-08-06):** keep Threes-authentic one-cell movement (`[6,3,3,_]`). Spec I/O row and Design Note amended to match implementation; tests unchanged (already correct). [game.js:75](../game.js) / [game.test.js:106](../../test/game.test.js#L106)
- [x] [Review][Decision] Debug console ships in production — **RESOLVED (2026-08-06):** keep as playtest aid for this phase. [index.html:45](../../index.html#L45) / [ui.js:195](../../js/ui.js#L195)

### patch

- [x] [Review][Patch] Pointer tracking can deadlock board input permanently — **FIXED:** added `lostpointercapture` handler + window-level `pointerup` safety reset. [ui.js:270](../../js/ui.js#L270)
- [x] [Review][Patch] SW navigate fallback can `respondWith(undefined)` → TypeError — **FIXED:** fallback now guards `cached ||` with an offline 503 Response. [sw.js:62](../../sw.js#L62)
- [x] [Review][Patch] SW `activate` deletes every cache on the origin, not just this app's — **FIXED:** now only prunes caches under this app's `three-` prefix. [sw.js:33](../../sw.js#L33)
- [x] [Review][Patch] `cache.put` in fetch handler is fire-and-forget with no rejection handling — **FIXED:** `.catch(() => {})` added. [sw.js:56](../../sw.js#L56)
- [x] [Review][Patch] Install swallows all `cache.add` failures — **FIXED:** install only calls `skipWaiting()` when the entire shell cached; partial installs keep the previous SW active. [sw.js:20](../../sw.js#L20)
- [x] [Review][Patch] Debug panel auto-scroll targets wrong element — **FIXED:** scrolls `.dbg-list` instead of `#dbg-panel`. [debug.js:65](../../js/debug.js#L65)
- [x] [Review][Patch] Spawn tile overlays a sliding tile at its source cell for the first 1–2 frames — **FIXED:** sliding tiles get `z-index:1`, spawn `z-index:0`, so slides render above spawn. [ui.js:94](../../js/ui.js#L94) / [style.css:106](../../css/style.css#L106)
- [x] [Review][Patch] Large tile values (5+ digits) clip — **FIXED:** new `tile-text-xxs` (0.85rem) tier for 6+ digits; 4+ digit tier retained. [ui.js:75](../../js/ui.js#L75) / [style.css:135](../../css/style.css#L135)

### defer

- [x] [Review][Defer] `user-scalable=no` + `maximum-scale=1.0` block zoom — accessibility tradeoff for a swipe game; revisit for a11y pass. [index.html:5](../../index.html#L5)
- [x] [Review][Defer] Board `role="grid"` has no row/gridcell semantics or live-region score announcements — screen readers get an empty grid. [index.html:30](../../index.html#L30)
