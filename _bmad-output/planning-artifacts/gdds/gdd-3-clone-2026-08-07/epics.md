# Tríade — Development Epics

Detailed breakdown for the epic summary table in `gdd.md`. Epics are ordered by dependency; E1 is the critical path (technical spike first). All rule changes trace to `gdd.md` pillars (P1 Maestro do Caos, P2 The Merge as Moment, P3 Fair by Design, P4 Identity over Clone) and the PRD's frozen engine spec.

## E1 — RN + Skia Platform Migration

**Goal:** Move the playable game from the web PWA to an installable iOS app without changing the rules. *(Serves P4 — establishes the primary identity surface.)*

**Stories:**
- S1.1 Technical spike: port `js/game.js` to TypeScript and render one 4×4 board in Skia (de-risk before full UI rewrite).
- S1.2 Port the rules engine to TypeScript with identical behavior (starting setup 9 tiles, merge-once, one-cell movement, 40/40/20 spawn, effective-move spawn, game-over detection, score/best).
- S1.3 Keep the engine a single source of truth — the UI never duplicates rules; the 26 existing unit tests pass against the ported engine.
- S1.4 Rewrite the UI as RN components + Skia: board, tiles, slide/merge/spawn animations driven by the engine's per-tile trace.
- S1.5 Offline capability + installability + persistence of best score and settings in app storage.
- S1.6 Portrait and landscape playable board.

## E2 — Adaptive Spawn

**Goal:** The game grows with the player — the signature mechanical difference from Threes (P4).

**Stories:**
- S2.1 Spawn ceiling detection (largest tile on board) drives the pot tier.
- S2.2 Fixed `1`/`2` weights at 40/40 at all ceilings.
- S2.3 Tiered pot: `<48` → 100% `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; doubling thereafter.
- S2.4 Halving-decay weights within the pot (`3=1`, `6=1/2`, …), normalized per tier so the pot sums to 20%.
- S2.5 Weight curve exposed as a single configurable parameter set (one number per tile value) for playtest calibration.
- S2.6 Respect merge-once and effective-move spawn rules.

## E3 — Two Lanes

**Goal:** Score integrity as a feature (P3) — Clean purity vs. Accelerated assistance, leaderboards never mix.

**Stories:**
- S3.1 Lane choice at game start; last lane remembered as default; changing lane starts a new game.
- S3.2 Clean lane: no undo/hint/ads/continue; board stays clean (no ceiling indicator, no stuck warning).
- S3.3 Accelerated lane ("Iniciante"): undo, hint, death-continue available; ads only between games.
- S3.4 Per-lane leaderboards (Clean / Assisted); lanes never mix.
- S3.5 Analytics: lane-choice event.

## E4 — Monetization Funnel

**Goal:** Revenue without corrupting score integrity (P3).

**Stories:**
- S4.1 Rewarded ad: undo (1 free per game, Accelerated lane).
- S4.2 Rewarded ad: death-continue (1 use per game over, Accelerated lane).
- S4.3 IAP: Hint 5-pack (US$0.99/R$4.90).
- S4.4 IAP: Undo 3-pack (US$0.99/R$4.90).
- S4.5 IAP: No Ads + Unlimited Undo (one-time US$2.99/R$14.90) — removes rewarded-ad prompts, grants unlimited undo.
- S4.6 Revenue-funnel analytics events (impressions/completions/purchases/usage).
- S4.7 App Store IAP + ads declarations.

## E5 — Tutorial & Onboarding

**Goal:** First merge within ~20s; teach the counterintuitive rule first (P1).

**Stories:**
- S5.1 3-guided-move tutorial: `1+2` merge rule, then one-cell movement; skippable.
- S5.2 Tone/identity screen ("control over chaos"), ~2s, skippable, first launch only.
- S5.3 Accelerated lane: first-session contextual help; Clean lane: minimal tutorial only.
- S5.4 Funnel analytics: first-merge time, first-game-over time, first-session completion.

## E6 — Failure Suite

**Goal:** Game over as information, not a wall (P1, P2).

**Stories:**
- S6.1 Game-over overlay shows immediately: score, best, max tile, merges, longest streak.
- S6.2 Soft fade; last move remains visible; no forced wait.
- S6.3 One-tap restart into a new game (same lane).
- S6.4 Death receives the same visual flourish care as the big merge (P2) — the "fall" is elegant, not abrupt.

## E7 — Next Piece Preview

**Goal:** Planable read phase (P1); shown in both lanes.

**Stories:**
- S7.1 HUD shows next spawn from the same distribution before each move.
- S7.2 60% of spawns show exact value; 40% show an ambiguous range (display roll separate from spawn).
- S7.3 Ambiguous range always contains the actual value: `1`/`2` → "1/2"; pot-only `3` → "3"; multiple pot values → up to 3 consecutive values.
- S7.4 Preview never alters the spawn.

## E8 — Core Feel Feedback

**Goal:** The Merge as Moment (P2) — within v1 scope.

**Stories:**
- S8.1 Scaled haptics: `3` light, `6` medium, `12+` heavy.
- S8.2 Visual punch: overshoot-and-snap, color flash + particles at merge point, splash scales with value.
- S8.3 Directional screen shake: subtle on medium, stronger on large; minimized for accessibility.
- S8.4 Bullet time: session's biggest merge slows ~200ms with a flash.
- S8.5 Reduced Motion mode disables/smooths shake and bullet time while keeping haptics and sound.
- S8.6 Sound + haptics coupled, scaling with tile value (minimal SFX: merge/spawn/game-over).

## E9 — Accessibility

**Goal:** Accessibility as product standard, not cost.

**Stories:**
- S9.1 All touchable elements ≥44×44pt.
- S9.2 Screen reader (VoiceOver/TalkBack) announces tile value + position, score changes, game over.
- S9.3 Merges communicated by shape/text beyond color; WCAG AA contrast in all themes.
- S9.4 Light, dark, and color-blind themes, all free.

## E10 — Telemetry & Observability

**Goal:** Evidence-driven retention and revenue. *(Serves P3 — score-integrity evidence and fair-lane measurement.)*

**Stories:**
- S10.1 Crashlytics with crash-free-session tracking.
- S10.2 Retention funnel events (first merge, first game over, lane choice, first-session completion).
- S10.3 Revenue funnel events (ad impressions/completions, IAP, continue/undo usage).
- S10.4 GDPR consent mode; ATT prompt on iOS if ad attribution is used.
- S10.5 Public privacy policy URL live before App Store review submission (blocking).

## E11 — Store Publication

**Goal:** Identity-first submission that never looks like Threes (P4).

**Stories:**
- S11.1 Icon + screenshots using the "Mineral Quente" identity (dark slate, amber→copper→emerald tiles, incandescent peak).
- S11.2 Metadata: description, keywords, age rating, IAP/ads declarations complete and accurate.
- S11.3 Confirm "Tríade: Merge Puzzle" name availability in App Store Connect before submission.
- S11.4 Store checklist carries the non-legal collision note (`triade.games` indie sci-fi title) and runs the INPI radical-search double-check for "TRIADE".
