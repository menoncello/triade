# Epic 7 Context: Next Piece Preview

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give the player a trustworthy "next card in hand" before every move: the HUD shows the upcoming spawn — exact value 60% of the time, ambiguous range 40% — in both lanes, purely informational, so planning improves without any change to spawn fairness or records.

## Stories

- Story 7.1: PendingSpawn pré-resolvido no snapshot
- Story 7.2: Preview card no HUD 60/40
- Story 7.3: Faixa ambígua só com liberados
- Story 7.4: Invariante preview nunca altera spawn

## Requirements & Constraints

- Before each move the HUD shows the next spawn, drawn from the same live spawn distribution (count-balanced 1/2 weights plus tiered pot).
- Display roll is separate from spawn roll: 60% shows the exact value, 40% shows an ambiguous range; the split never biases what spawns.
- The range always contains the actual spawned value: 1/2 collapse to "1/2"; a pot with only 3 available shows "3"; larger pots show a window of up to 3 consecutive unlocked values containing the real one.
- Range windows use only ceiling-unlocked values (48-base tier ladder) and renormalize when the ceiling restricts valid windows; the detailed window-selection weighting is a tuning assumption to confirm in playtest.
- Preview is informational only and read-only: the materialized tile always equals the pre-resolved value regardless of what the card displayed; covered by an invariant test.
- Preview ships in both lanes as core strategy information, not a learning aid — including the no-assistance lane.
- Preview display parameters live in config data alongside spawn weights so the 60/40 split and window rule can be retuned without engine changes; invalid configs fail validation loudly.
- Screen-reader announcement order is score, then preview, then best; preview content is announced as value or range.

## Technical Decisions

- `pendingSpawn` (real value + display roll) lives in the immutable match snapshot alongside PRNG state, so undo rewinds board, randomness, and preview together as a true rewind.
- Data flow: on each effective move the engine pre-resolves the next pendingSpawn from the spawn distribution; the HUD only reads it; the board materializes the pending value on the following effective move. The UI never rolls its own randomness.
- Pure display mapping: display roll below 0.6 renders exact, otherwise renders the containing window for the value's tier; frame/display math stays in pure testable functions with thin UI bindings.
- Engine stays the single source of truth: spawn honors merge-once and effective-move-only rules; no-ops spawn nothing and resolve no new preview; the engine returns result objects and never throws.
- Depends on the prior spawn system (count auto-balance, 20% pot, halving curve, tier ladder) via its config module; preview adds no new spawn logic, only the pre-resolve slot and the display mapping.

## UX & Interaction Patterns

- Preview card is chrome, not board: it never animates with merge feel effects and never overlaps score or pause flourishes.
- Sizes: portrait value around 20pt; landscape 16pt with a small PRÓX chip (chip never reaches 18pt, score-to-preview size ratio stays at or above ~1.35x so the card never reads as a second score).
- Placement: portrait floats the card in a bottom corner near the swipe finger; landscape folds it into the frozen 56pt single-row top band (score+best left, preview center-right, pause far right, minimum gap between preview and pause, safe-area margins respected).
- Touches starting on the preview card or pause button never start a move; gesture handling mounts on the board view only.
- Preview content is announced to screen readers in the fixed score-to-preview-to-best order; silent no-ops stay silent.

## Cross-Story Dependencies

- Story 7.1 (snapshot + pre-resolve plumbing) precedes 7.2/7.3 (rendering and window rule), and 7.4 (invariant test) closes the epic by locking the read-only guarantee.
- Builds on the adaptive spawn system for the value distribution and tier ladder, and on the engine snapshot/undo contract for deterministic rewind including the preview.
- Shares the HUD band geometry and announcement-order contract with the board layout and accessibility work; changes to band sizes or order affect the preview card directly.
