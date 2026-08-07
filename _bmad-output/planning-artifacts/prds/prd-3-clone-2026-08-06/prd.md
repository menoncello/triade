---
title: Tríade (Merge Puzzle)
created: 2026-08-06
updated: 2026-08-07
---

# PRD: Tríade (Merge Puzzle)
*Working title — final name pending trademark + App Store Connect clearance.*

## 0. Document Purpose

This PRD governs the evolution of **3-clone**, a completed MVP web PWA clone of "Three!" (Threes-style sliding tiles), into a monetized, production-ready iOS app published on the App Store under the working identity **"Tríade: Merge Puzzle"**. Audience: the author-owner (solo, intermediate game dev), and downstream workflows (UX, architecture, epics/stories, QA). It is a *brownfield* document: the game already exists and is playable; this PRD specifies what is new or changing — the platform migration, monetization, the "Two Lanes" design, Adaptive Spawn, production readiness, and store publication. It builds on the brainstorming session recorded in `_bmad-output/brainstorming-session-2026-08-06.md` (design decisions are referenced, not relitigated) and on the frozen implementation spec `_bmad-output/implementation-artifacts/spec-three-clone.md` (rules, I/O matrix, boundaries). Structure: Glossary-anchored vocabulary, features grouped with FRs nested and numbered globally, assumptions tagged inline and indexed in §9. Game-design detail beyond requirements (mechanics tuning, audio direction) belongs to the GDD / addendum; this PRD does not own those decisions.

## 1. Vision

Tríade is a mobile puzzle game that turns the satisfaction of the big merge into a revenue engine. It keeps the proven Threes-style core — slide tiles, merge 1+2 and equal values ≥3, chase the ceiling — and adds a mechanical identity of its own: **Adaptive Spawn** makes the game grow with the player, and **Two Lanes** lets every player choose between a pure, ad-free challenge and a guided one that monetizes the moments of friction (undo, hint, continue) as a choice, not a punishment.

For the player it delivers a sessionable, installable, offline-capable puzzle with clean score integrity and a fair way to play: achievers compete on a pristine Clean leaderboard, beginners get assistance on an Assisted leaderboard without feeling they are "paying to win" — score integrity is a feature, not an afterthought. For the author it is a new revenue source: a free game with a three-layer funnel (free clean play attracts → rewarded ads earn without purchase → "No Ads + Unlimited Undo" IAP removes friction) distributed through the App Store. The MVP is already built and tested; this PRD is the shortest honest path from working PWA to published, monetized iOS app.

## 2. Target User

### 2.1 Primary Persona

**[ILLUSTRATIVE]** — no market research was run; the personas below are grounded in the player-psychology archetypes surfaced in the brainstorming session, not in field data.

- **The Achiever.** Plays to beat scores and climb the leaderboard. Values integrity: a clean run means more than a high number. Attracted by the Clean lane; suspicious of paid advantages. Wants a fair fight and a moment of recognition when they pull off the big merge.
- **The Beginner.** New to the genre or easily frustrated. Wants help without shame. Plays the Accelerated lane, uses undo and hints, and is the primary rewarded-ad / IAP audience — monetization happens at the moment of need, not as an upfront wall.
- **The Genre Veteran.** Knows Threes/2048. Skips the tutorial, plays fast, cares about variety (board sizes) and new mechanics over onboarding.

### 2.2 Jobs To Be Done

- Kill a few minutes anywhere, offline, one-handed.
- Feel mastery: control the board, anticipate merges, land a big tile.
- Compete fairly on a scoreboard that paid shortcuts cannot corrupt.
- Recover from a mistake (undo) or a death (continue) without breaking the game's integrity.
- Learn the game by playing, not by reading.

### 2.3 Non-Users (v1)

- Players who want deep multiplayer or accounts — out of scope (no backend).
- Players who want cosmetic-heavy personalization at launch — paid cosmetics are a future layer.
- Desktop-heavy audiences — the app is mobile-first; a web PWA remains available but is not the product.

### 2.4 Key User Journeys

- **UJ-1** — First Session: install, identity tone screen (~2s, skippable), skippable 3-move tutorial, first merge within ~20s, first game over within ~3min.
- **UJ-2** — Lane Choice: player picks Clean or Accelerated at the start of each game; leaderboard assignment follows the lane.
- **UJ-3** — Assisted Recovery (Accelerated): at death, player chooses to continue via rewarded ad (1 use) or IAP; mid-game, uses undo via rewarded ad (1 free per game) or IAP.
- **UJ-4** — Clean Run: no assistance, no ads, score goes to the Clean leaderboard; game-over overlay shows score, best, max tile, merges, longest streak.
- **UJ-5** — One More: game over → one-tap restart → immediately back in play.

## 3. Glossary

- **Merge** — The combination of two tiles: `1+2` produces `3`; two equal tiles `≥3` produce their double. `1+1` and `2+2` never merge.
- **Effective move** — A swipe that changes the board. Only an effective move spawns a tile.
- **Merge-once rule** — A tile merges at most once per swipe; a freshly merged tile cannot merge again in the same swipe. Each tile moves at most one cell.
- **Spawn** — A new tile placed in a uniformly random empty cell after an effective move.
- **Spawn ceiling** — The largest tile currently on the board; drives Adaptive Spawn tier.
- **Adaptive Spawn** — Spawn weighting that responds to the Spawn ceiling (see FR under §4.2). The game's signature mechanical identity vs. Threes.
- **Pot** — The 20% of spawn weight allocated to tiles `≥3` in Adaptive Spawn; distributed by value via the configurable weight curve.
- **Clean lane** — Game mode with no undo, hint, ads, or continue offers. Score goes to the Clean leaderboard.
- **Accelerated lane** — Game mode ("Beginner" level) with assistance available: undo, hint, and death-continue. Score goes to the Assisted leaderboard. Ads only between games, never during.
- **Death-continue** — The Accelerated-lane offer to resume a game over, once per game: rewarded ad (1 use) or IAP.
- **Rewarded ad** — A voluntary video ad the player watches for a benefit (undo or continue). Player choice, never forced.
- **IAP** — In-App Purchase. MVP: Hint 5-pack (US$0.99/R$4.90), Undo 3-pack (US$0.99/R$4.90), and No Ads + Unlimited Undo (one-time, US$2.99/R$14.90). Pricing set for MVP; launch-offer discounts are a later lever.
- **Leaderboard** — Scoreboard scoped per lane (Clean vs. Assisted). No cross-lane mixing.
- **Game over** — Grid full and no adjacent mergeable pair (any row/column: adjacent `1|2` or equal `≥3`).
- **Game Feel Suite** — Layered feedback on merges (haptics, visual punch, screen shake, bullet time). **Full suite is v2; see Non-Goals.**
- **Tier** — A tile value threshold (48, 96, 192, ...) that opens new Adaptive Spawn options and (v2) celebration moments.
- **Next piece preview** — HUD element showing the next spawn value (or ambiguous range) before each move; informational only, never changes the spawn.

## 4. Features

### 4.1 Platform Migration — React Native + Skia

**Description:** The MVP PWA (vanilla JS, DOM UI) migrates to React Native with `@shopify/react-native-skia` for rendering. The game rules engine (currently `js/game.js`, a pure framework-free UMD module) is ported to **TypeScript** inside the RN app with behavior preserved — including the starting setup (a fresh board opens with **9 starting tiles**), the 40/40/20 spawn distribution, and the game-over overlay's final + best score. The existing 26 unit tests keep passing against the ported engine. Only the UI layer (`js/ui.js`) is rewritten as RN components + Skia (board, sprites, animations). PWA assets (service worker, manifest, `localStorage`) are superseded by the RN runtime and iOS app storage; the web PWA itself is not retired — it remains a secondary distribution surface. `[ASSUMPTION: iOS first; Android from the same RN codebase is in the product plan but not the MVP target]` `[ASSUMPTION: the web PWA remains available as a secondary distribution surface; it is not retired]`

**Functional Requirements:**
- **FR-1** — The game rules engine from `js/game.js` is ported to TypeScript in the RN app with identical behavior — starting setup (9 tiles), merge, spawn, score, and game-over — and remains a single source of truth (UI never duplicates rules).
- **FR-2** — The 26 existing unit tests pass against the ported TypeScript engine (`node --test`).
- **FR-3** — The RN app renders a 4×4 board via Skia with tile slide/merge/spawn animations driven by the engine's per-tile trace; the board stays playable in both portrait and landscape.
- **FR-4** — The app ships installable from the App Store, runs offline, and persists best score and settings across launches.
- **FR-5** — A technical spike is performed first: port `game.js` + render one board in Skia, before committing to the full architecture. `[NOTE FOR PM] — de-risks the migration before the UI rewrite is greenlit.`

### 4.2 Adaptive Spawn

**Description:** Spawn weighting responds to the largest tile on the board (Spawn ceiling), so the late game opens up bigger pieces instead of grinding small ones — the game "grows with you." This is the first real mechanical difference vs. Threes and the core of the game's identity. Key spec: 1s and 2s keep appearing even at high ceilings (difficulty preserved — they only lose weight); their weights never change. A fixed 20% pot distributes pieces `≥3`, weighted by value (higher value = lower chance). Initial weight curve: **halving decay** — each value in the pot weighs half of the next-lower one (`3=1`, `6=1/2`, `12=1/4`, `24=1/8`, `48=1/16`, `96=1/32`…), normalized per ceiling tier so the pot always sums to 20%. Tiers by ceiling: `<48` → pot is 100% `3`; `≥48` opens `6`; `≥96` opens `12`; `≥192` opens `24`; `≥384` opens `48`; `≥768` opens `96`; doubling each tier.

**Functional Requirements:**
- **FR-6** — Spawn weights for `1` and `2` remain fixed at 40%/40% at all times, regardless of Spawn ceiling.
- **FR-7** — 20% of spawn weight is a pot for pieces `≥3`, opened per ceiling tier: `<48` → only `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; ceiling doubling continues thereafter.
- **FR-8** — Within the pot, higher values are less likely than lower values. **Initial curve:** halving decay — each value weighs half the next-lower (`3=1`, `6=1/2`, `12=1/4`, …), normalized per ceiling tier so the pot sums to 20%.
- **FR-9** — The pot weight curve is **configurable**: weights are driven by a single parameter set (one number per tile value) exposed in a config, so the curve can be tuned and playtest-calibrated without code changes. `[ASSUMPTION: initial values = halving decay (fixed below); retuned later if playtest demands]`
- **FR-10** — Adaptive Spawn respects the merge-once rule and effective-move spawn rules of the ported engine.

**Notes:**
- **FR-8/FR-9** weight curve is the single most delicate numeric in the product — it must not inflate scores on the leaderboards. `[NOTE FOR PM]`
- Adaptive Spawn **amends the frozen spawn-weight field** of `spec-three-clone.md` (its "Ask First" requires renegotiating spawn weights). The MVP's fixed 40/40/20 is the ceiling `<48` case of this spec; the new 20% pot redefines what the `3` weight becomes at higher ceilings. Recorded as decision-log #19. `[NOTE FOR PM]`

### 4.3 Two Lanes (Clean / Accelerated)

**Description:** At the start of each game the player chooses a lane. **Clean** — no undo, hint, ads, or continue offers; score goes to the Clean leaderboard; purity preserved. **Accelerated** (player-facing name: "Beginner") — assistance available: undo, hint, and death-continue; ads only between games, never during; score goes to the Assisted leaderboard. The lanes exist so monetization never corrupts score integrity: pay-to-win is resolved by design, not by trust. This realizes UJ-2 and is the top revenue structure of the game. **HUD rule:** in normal play the board stays clean — no spawn-ceiling indicator and no "stuck" warning appear in Clean (the clean board carries the fantasy); such learning aids are only shown in the Beginner lane.

**Functional Requirements:**
- **FR-11** — At game start, the player chooses Clean or Accelerated lane. The **last chosen lane is remembered** and becomes the default for the next game; changing the lane starts a new game. `[ASSUMPTION: lane choice is per-game; it persists across games as a default, not as a forced lock]`
- **FR-12** — Clean lane provides no undo, no hint, no ads, and no death-continue offer.
- **FR-13** — Accelerated lane provides undo (1 free per game via rewarded ad, or 3 via IAP), hint (via IAP), and death-continue (rewarded ad 1 use, or IAP).
- **FR-14** — Score from each lane goes only to its own leaderboard (Clean / Assisted); lanes never mix.
- **FR-15** — Ads appear only between games in the Accelerated lane, never during play.

### 4.4 Monetization Funnel (Ads + IAP)

**Description:** A three-layer revenue funnel: (1) free Clean lane attracts the achiever; (2) rewarded ads generate revenue without purchase — undo (1 free per game) and death-continue (1 use) in the Accelerated lane; (3) "No Ads + Unlimited Undo" IAP removes friction for the converting player, plus a hint IAP. Purchases happen at the moment of pain, not as an upfront wall. Cosmetics are deliberately *not* the revenue engine (they are an identity showcase for later). **MVP pricing (conversion-focused):** Hint 5-pack US$0.99/R$4.90 · Undo 3-pack US$0.99/R$4.90 · No Ads + Unlimited Undo (one-time) US$2.99/R$14.90. This realizes UJ-3.

**Functional Requirements:**
- **FR-16** — A rewarded ad grants exactly one undo per game in the Accelerated lane (no more than 1 free undo per game via ads).
- **FR-17** — An IAP grants 3 undos usable in the Accelerated lane (US$0.99/R$4.90); "No Ads + Unlimited Undo" IAP (US$2.99/R$14.90, one-time) grants unlimited undos and removes rewarded-ad prompts. `[ASSUMPTION: MVP pricing is set (conversion-focused); a launch-offer discount is a later tuning lever, not MVP]`
- **FR-18** — Death-continue in the Accelerated lane is offered once per game over: rewarded ad (1 use) or IAP. No continue offer appears in the Clean lane.
- **FR-19** — No forced or interstitial ads during gameplay in any lane; ads are always player-initiated rewards.
- **FR-20** — All purchases and ad placements are declared to the App Store (IAP/ads declarations) at submission.

### 4.5 Tutorial & Onboarding

**Description:** A 3-guided-move tutorial that teaches the counterintuitive rule first (1+2 merges), then the one-cell move (the difference from 2048). Learn by playing, no text wall. Skippable for genre veterans. Clean lane: minimal tutorial only. Accelerated lane (Beginner): contextual first-session help. Identity onboarding: a short tone screen ("control over chaos"), ~2s, skippable. Realizes UJ-1.

**Functional Requirements:**
- **FR-21** — A skippable tutorial teaches, in 3 guided moves: the 1+2 merge rule, then the one-cell movement rule.
- **FR-22** — Genre veterans can skip the tutorial entirely and play immediately.
- **FR-23** — The Accelerated lane shows contextual help during the first session; the Clean lane shows minimal tutorial only.
- **FR-24** — A ~2-second identity/tone screen ("control over chaos") shows at first launch and is skippable.

### 4.6 Failure Suite (Game Over)

**Description:** Game over becomes information, not a wall: score + max tile + number of merges + longest streak, all shown immediately (no forced wait), a one-tap restart, and a soft fade instead of an abrupt cutoff — the last move is always shown. Realizes UJ-4 and UJ-5. `[v2: "Grave of Stones" — the game's max stones displayed as relics on the defeat screen — deferred]`

**Functional Requirements:**
- **FR-25** — The game-over overlay shows immediately: score, **best score**, max tile, number of merges, and longest streak.
- **FR-26** — One-tap restart returns directly to a new game (same lane).
- **FR-27** — The game ends with a soft fade; the last move remains visible; no forced wait before the overlay.

### 4.7 Accessibility (Product Standard)

**Description:** Accessibility is a product standard, not a cost. Tap targets ≥44×44pt on all touchable elements; screen-reader state announcements (tile + position, game over, score); a Reduced Motion mode that softens Game Feel Suite effects (v2 suite); WCAG AA contrast; merges communicated by shape beyond color (color blindness); dark, light, and color-blind themes — all free. `[NON-GOAL for MVP: paid cosmetic themes]`

**Functional Requirements:**
- **FR-28** — All touchable elements have tap targets ≥44×44pt.
- **FR-29** — Screen readers (VoiceOver/TalkBack) announce tile value and position, score changes, and game-over state.
- **FR-30** — A Reduced Motion setting disables/smooths screen shake and bullet-time effects (v2 suite) while **keeping haptics and sound** — iOS accessibility requirement.
- **FR-31** — Tile value is communicated by shape/text in addition to color; contrast meets WCAG AA in all themes.
- **FR-32** — Light, dark, and color-blind themes are available and free.

### 4.8 Telemetry & Observability

**Description:** Firebase Analytics + Crashlytics via `react-native-firebase`. The retention funnel is the north star (first merge ~20s, first game over ≤3min in first session). Analytics is deliberately chosen beyond crash reporting. Privacy: Firebase consent mode (GDPR) + ATT prompt on iOS if ad attribution is used; a public privacy policy URL is mandatory before review submission.

**Functional Requirements:**
- **FR-33** — Crash reporting via Firebase Crashlytics, with crash-free-session tracking.
- **FR-34** — Analytics events cover the retention funnel: first merge time, first game-over time, lane choice, first-session completion.
- **FR-35** — Revenue-funnel events: rewarded-ad impressions/completions, IAP purchases, continue/undo usage.
- **FR-36** — GDPR consent mode is implemented; an ATT prompt appears on iOS if ad attribution is used.
- **FR-37** — A public privacy policy URL is live before App Store review submission. `[NOTE FOR PM — blocking for review]`

### 4.9 Store Publication (App Store)

**Description:** Submission readiness: identity-first store assets that never look like Threes, IAP/ads declarations, age rating, keywords, and description. App Store Connect is the final authority for name availability. **Name clearance (resolved 2026-08-07):** INPI shows no active "TRÍADE" mark in Class 9 (software/games) and the only two Class 41 (entertainment) filings were refused; no "Tríade" or "Tríade: Merge Puzzle" game exists on the App Store or Google Play. Non-legal naming collision to be aware of: `triade.games` (indie sci-fi "Triade" by Pixofamily). Final confirmation still happens in App Store Connect at submission. `[NOTE FOR PM] — run the INPI radical search "TRIADE" as a double-check and consider registering triadepuzzle.com.br before launch]`

**Functional Requirements:**
- **FR-38** — Store icon and screenshots use the "Mineral Quente" identity (dark slate, amber→copper→emerald tiles) and never resemble Threes branding.
- **FR-39** — App Store metadata (description, keywords, age rating, IAP/ads declarations) is complete and accurate at submission.
- **FR-40** — The App Store name and subtitle "Tríade: Merge Puzzle" are confirmed available in App Store Connect before submission.

### 4.10 Next Piece Preview

**Description:** Before each move, the HUD shows the next tile that will spawn (Threes-style "next card in hand"), so the player can plan the board. The preview is drawn from the same spawn distribution as the actual spawn (Adaptive Spawn curve when applicable) and is **informational only** — it never changes the spawn. 60% of spawns show the exact value; 40% of spawns (a separate display roll) show an ambiguous range that always contains the actual value. Applies in **both lanes** — it is core strategy information (like the original Threes' next card), not a learning aid. This realizes UJ-1 and complements the Adaptive Spawn planning fantasy (§4.2).

**Functional Requirements:**
- **FR-41** — Before each move, the HUD shows the next spawn value, drawn from the same distribution as the actual spawn.
- **FR-42** — The preview shows the exact value in 60% of spawns and an ambiguous range in 40% of spawns (separate display roll).
- **FR-43** — The ambiguous range always contains the actual value: for `1` or `2`, shows "1/2" together; for a pot value when only `3` is available, shows "3"; for pot values when more are available, shows up to 3 consecutive values (e.g., "3/6" or "3/6/12"), with the spawned tile being any one of the displayed values.
- **FR-44** — The preview never alters the spawn distribution or the actual spawned tile.
- **FR-45** — The preview is shown in both Clean and Accelerated lanes.

**Notes:**
- `[ASSUMPTION: the display range is a contiguous window of the tier sequence containing the actual value, capped at 3 values — the exact window-selection rule (e.g., whether it always starts at the pot's smallest value) is a tuning detail to confirm in UX/playtest]`

## 5. Non-Goals (Explicit)

- **No 2048-style rules** — no `2+2=4`, no equal merge of 1+1 or 2+2.
- **No backend, accounts, or multiplayer** — the game remains fully client-side and offline-capable.
- **No "Unearth" mechanic in MVP** — `[v2 — out of MVP]`, author to reconsider later.
- **No full Game Feel Suite (scaled haptics, screen shake, bullet time) in MVP** — `[v2 — out of MVP]`; MVP ships standard animations and haptics.
- **No full sound suite in MVP** — `[v2 — out of MVP]`; MVP ships **minimal sound effects** (merge/spawn/game-over feedback). The full Warm/Organic identity suite is v2 and is a hypothesis to validate with external players (author plays sound-off, so his taste is a weak signal only).
- **No celebration moments in MVP** — no new-record celebration, no tier-milestone celebration (crossing 48/96/192), no reward pacing. `[v2 — out of MVP]`; the "new best" is shown as a number, not as a celebratory event. `[NOTE FOR PM]` — emotionally load-bearing for the Achiever persona; revisit if timeline permits.
- **No Daily Puzzle in MVP** — `[v2 — out of MVP]`.
- **No "Grave of Stones" in MVP** — `[v2 — out of MVP]`.
- **No board sizes beyond 4×4 in MVP** — 3×3/5×5/6×6 are `[v2 — out of MVP]`.
- **No paid cosmetic themes in MVP** — accessibility themes are free; cosmetics are a future identity layer.
- **We are not becoming a Threes clone** — identity (name, visuals, sound, Adaptive Spawn) is the answer to clone/storefront risk.

## 6. MVP Scope

### 6.1 In Scope

- RN + Skia migration (**TypeScript** engine port + UI rewrite), 26 tests passing, technical spike first.
- Adaptive Spawn with the tiered pot (spec as defined; **configurable** weight curve, initial values pending).
- Two Lanes (Clean / Accelerated) with per-lane leaderboards.
- Monetization: rewarded ad undo (1/game), rewarded ad continue (1 use), IAP hint, IAP "No Ads + Unlimited Undo".
- Tutorial (3 moves, skippable) + tone screen.
- Failure Suite: game-over stats, one-tap restart, soft fade.
- Accessibility: 44pt targets, screen reader, Reduced Motion, WCAG AA, shape-beyond-color, light/dark/color-blind themes.
- Firebase Analytics + Crashlytics with the retention funnel.
- Store readiness: icon + screenshots (Mineral Quente), metadata, age rating, IAP/ads declarations, privacy policy URL, name clearance.
- Minimal sound effects (merge / spawn / game-over feedback) in the RN app. `[ASSUMPTION: "minimal" = short non-musical feedback SFX; scope confirmed with author]`
- Next Piece Preview: exact value 60% / ambiguous range 40%, shown in both lanes, informational only.

### 6.2 Out of Scope for MVP

- Full Game Feel Suite F–I (scaled haptics, visual punch, screen shake, bullet time) — `[v2]`.
- Full sound suite — `[v2]`; audio validated externally in playtest.
- Tile personality (named tiers: Basalto, Cobre, Esmeralda) — `[v2]`.
- Daily Puzzle (fixed seed, own scoreboard) — `[v2]`.
- "Grave of Stones" defeat screen — `[v2]`.
- Board sizes 3×3 / 5×5 / 6×6 — `[v2]`.
- "Unearth" mechanic — `[v2]`.
- Paid cosmetics — `[v2]`; the revenue engine is the ad/IAP funnel, not cosmetics.
- Launch-offer discounts / IAP bundles beyond the three MVP products — deferred; `[NOTE FOR PM]` (flags revisit).

## 7. Success Metrics

**Primary**
- Retention funnel north star: first merge in ~20s and first game over in ≤3min within the first session.
- D1 retention (percentage of new users returning day 2). `[ASSUMPTION: numeric target TBD — flagged in Open Questions]`

**Secondary**
- Revenue funnel conversion: rewarded-ad completion rate, IAP purchase rate, and % of players on the Accelerated lane.
- Crash-free sessions rate.
- App Store conversion: installs from store page views.

**Counter-metrics (do not optimize)**
- Do not optimize for score inflation — Adaptive Spawn raising leaderboard levels could cheapen achievements; measure and keep integrity.
- Do not optimize ad revenue by interrupting play — ads must stay between games and player-initiated; forced ads would betray the "player choice" identity.
- Do not optimize for IAP by pressuring death (Clean lane purity) — monetization lives in the Accelerated lane only.

**Metric → FR traceability**
- First merge ≤20s / first game over ≤3min → FR-21 (tutorial), FR-25 (game-over stats), FR-34 (funnel analytics).
- Lane choice → FR-11 (lane selection), FR-34 (analytics event).
- Rewarded-ad completion → FR-16, FR-18, FR-35.
- IAP purchase rate → FR-17, FR-20, FR-35.
- Crash-free sessions → FR-33.
- App Store install conversion → FR-38..FR-40 (store assets/metadata).

## 8. Open Questions

1. ~~Adaptive Spawn pot weight curve~~ — **RESOLVED (2026-08-07):** halving decay (`3=1`, `6=1/2`, …) normalized per tier; configurable and playtest-calibratable.
2. ~~IAP pricing~~ — **RESOLVED (2026-08-07):** Hint 5-pack US$0.99/R$4.90, Undo 3-pack US$0.99/R$4.90, No Ads + Unlimited Undo US$2.99/R$14.90. Launch-offer discounts deferred.
3. D1 retention numeric target.
4. Lane selection: per-game only, or switchable mid-game? `[ASSUMPTION used: per-game; last lane persisted as default for the next game; changing lane starts a new game]`
5. ~~Name/trademark clearance for "Tríade"~~ — **RESOLVED (2026-08-07):** INPI Class 9 clear, Class 41 filings refused; no competing puzzle game on App Store/Play. Final confirmation at App Store Connect submission; INPI radical-search double-check recommended.
6. Android launch timing (same RN codebase) vs. iOS-only MVP. `[ASSUMPTION used: iOS first]`
7. Fate of the web PWA's **debug panel** (`js/debug.js`, currently ships as a playtest aid): dev-only in the RN app, or replaced entirely by telemetry? `[ASSUMPTION used: telemetry (FR-33..35) supersedes the debug panel in the RN app]`
8. **Keyboard input** (arrow keys) is a web-PWA feature; the RN iOS app is touch-first. Is keyboard parity required anywhere in the app (e.g., iPad + hardware keyboard)? `[ASSUMPTION used: not required in the RN app]`
9. **PWA ↔ RN parity** — the web PWA keeps its own `js/game.js`. Do future rule changes (e.g., Adaptive Spawn) also land in the PWA, or is the web surface frozen as the current MVP version? `[ASSUMPTION used: the RN app is the product of record; the web PWA is a legacy secondary surface without mandated parity]`

## 9. Assumptions Index

- §4.1 — iOS first; Android from same RN codebase is future.
- §4.1 — web PWA remains available as a secondary surface; not retired.
- §4.2 — pot weight curve *mechanism* is configurable; initial values = halving decay (Open Question 1, resolved).
- §4.3 — lane is per-game; last lane persisted as default for the next game; changing lane starts a new game (Open Question 4).
- §4.4 — MVP IAP pricing is set (conversion-focused); launch-offer discounts are later (Open Question 2, resolved).
- §4.9 — name "Tríade" cleared by INPI/store research; final confirmation at App Store Connect (Open Question 5, resolved).
- §4.10 — preview display window is a contiguous tier window capped at 3 values; exact window-selection rule TBD in UX/playtest.
- §6.1 — "minimal sound" = short non-musical feedback SFX.
- §7 — D1 retention numeric target TBD (Open Question 3).
- §8 — Android launch after iOS MVP (Open Question 6).
- §8 — debug panel superseded by telemetry in the RN app (Open Question 7).
- §8 — keyboard input not required in the RN app (Open Question 8).
- §8 — web PWA is a legacy secondary surface without mandated parity (Open Question 9).
