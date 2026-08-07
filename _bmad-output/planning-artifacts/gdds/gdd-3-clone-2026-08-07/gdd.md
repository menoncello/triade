---
title: Tríade (Merge Puzzle)
game_type: Puzzle
platforms: iOS (App Store), Web PWA (secondary)
created: 2026-08-07
updated: 2026-08-07
---

# Tríade - Game Design Document

**Author:** Eduardo
**Game Type:** Puzzle
**Target Platform(s):** iOS (App Store), Web PWA (secondary)

---

## Executive Summary

### Core Concept

**Tríade** is a mobile-first merge-puzzle game in the Threes tradition: slide tiles on a 4×4 board, merge `1+2` and equal `≥3`, chase the ceiling. Its mechanical identity is **Adaptive Spawn** — the game grows with the player, opening bigger pieces as the board's ceiling rises — and its structural identity is **Two Lanes**: a pure, ad-free **Clean** lane and a guided **Accelerated** lane where assistance (undo/hint/continue) monetizes moments of friction as a choice, never a punishment. The core fantasy is **"control over chaos"** — the Maestro who reads the board, anticipates merges, and lands the big merge.

### Target Audience

- **The Achiever** — plays to beat scores and climb the leaderboard; values integrity; a clean run means more than a high number. Attracted by the Clean lane.
- **The Beginner** — new to the genre or easily frustrated; wants help without shame; plays the Accelerated lane; the primary rewarded-ad / IAP audience.
- **The Genre Veteran** — knows Threes/2048; skips the tutorial, plays fast, cares about variety (board sizes, v2).
- **Jobs to be done:** kill a few minutes anywhere, offline, one-handed; feel mastery; compete fairly; recover from a mistake without breaking integrity; learn by playing, not reading. Non-users (v1): deep multiplayer/accounts, heavy cosmetic personalization, desktop-first play.

### Unique Selling Points (USPs)

- **Adaptive Spawn** — the first real mechanical difference from Threes: the game grows with the player's ceiling instead of grinding small tiles.
- **Two Lanes with score integrity** — pay-to-win resolved by design: Clean purity vs. Accelerated assistance, leaderboards that never mix.
- **"Mineral Quente" identity** — a distinct visual/audio language (slate, amber→copper→emerald, incandescent peak) that never reads as a Threes clone.

---

## Goals and Context

### Project Goals

- Ship a monetized, production-ready iOS app (React Native + Skia) from a working, tested PWA MVP.
- Establish a three-layer revenue funnel: free Clean lane attracts → rewarded ads earn without purchase → "No Ads + Unlimited Undo" IAP removes friction.
- Protect score integrity as a feature (P3) so monetization never corrupts the leaderboard.
- North-star retention funnel: first merge within ~20s, first game over within ≤3min in the first session.

### Background and Rationale

The MVP PWA is complete and playable (vanilla JS engine, 26 passing tests). This GDD governs the evolution into a published, monetized iOS product, building on the frozen engine spec and the brainstorming session (design decisions referenced, not relitigated). Identity — name, visuals, sound, Adaptive Spawn — is the answer to clone/storefront risk (P4).

---

## Core Gameplay

### Game Pillars

**P1 — Maestro do Caos.** The fantasy of mastery: read the board, anticipate merges, keep large tiles alive. Steers: the clean board carries the fantasy (no spawn-ceiling indicator, no "stuck" warning in the Clean lane); feel numbers exist to make control feel real.

**P2 — The Merge as Moment.** The big merge is the emotional payoff. Steers: Game Feel Suite amplifies the moment (scaled haptics, visual punch, directional shake, bullet time); Adaptive Spawn makes the moment arrive sooner as mastery grows ("the game grows with you").

**P3 — Fair by Design.** Score integrity as identity. Steers: two lanes (Clean / Accelerated), leaderboards never mix, monetization never corrupts scores — pay-to-win resolved by architecture, not by trust.

**P4 — Identity over Clone.** Stand apart from Threes/2048. Steers: Mineral Quente visual identity, cálido/orgânico audio with own timbre, own mechanics (Adaptive Spawn). Mitigates review/storefront risk.

### Core Gameplay Loop

**Reading-driven micro-loop (each turn):**
1. **Read** the board — identify mergeable pairs (adjacent `1|2`, or equal `≥3`) and the **next-piece preview** (what will spawn).
2. **Plan** — choose the swipe direction: protect large tiles, set up the desired merge, keep breathing room.
3. **Effective swipe** — slide; each tile moves at most one cell; merges resolve once per swipe.
4. **Spawn** — a new weighted tile appears (Adaptive Spawn: `1`/`2` fixed at 40/40; 20% pot for `≥3` by ceiling tier).
5. **Repeat** — until the board fills and no mergeable pair remains → game over.

**Emotional engine:** the session's biggest merge triggers a short bullet-time moment (~200ms) — the "golden moment" the player chases each turn (feeds P2).

**Macro-loop (across sessions):** choose lane → play → game over → stats (score, max tile, merges, longest streak) → one-tap restart (or continue in Accelerated lane) → best score persisted → per-lane leaderboard.

### Win/Loss Conditions

- **No formal win condition** — score attack; the run ends only in **loss** (game over): grid full **and** no adjacent mergeable pair (adjacent `1|2`, or equal `≥3`).
- **Mini-victories within a run:** crossing the spawn-ceiling tier opens new pot values (48/96/192…) and new color tiers — the player's in-run "journey of victory."
- **Record milestone** (new best score) is shown as a number, not an event, in MVP.

---

## Game Mechanics

### Primary Mechanics

**Board & movement.** 4×4 grid. A fresh board opens with **9 starting tiles**. Each tile moves **at most one cell** per swipe. **Merge-once rule:** a tile merges at most once per swipe; a freshly merged tile is locked for that swipe (e.g., `[3,3,3,3] → [6,3,3,_]`, `[1,2,3,_] → [3,3,_,_]`). No compaction cascade.

**Merge rules.** `1+2` merges to `3` (order-independent). Two equal tiles `≥3` merge to their double. `1+1` and `2+2` never merge (explicitly not 2048 rules). Value series: `1, 2, 3`, then ×2: `6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072`… The RN app renders one color tier per value up to `3072+`; the frozen web build reuses a final color tier above `768`.

**Spawn.** A new tile spawns **only after an effective move** (a swipe that changes the board); a NOOP swipe spawns nothing, scores nothing, and does not consume a turn. Spawn position: uniformly random empty cell. **Base weights `1:40%, 2:40%, 3:20%`** — this is the ceiling `<48` case of Adaptive Spawn below, so both descriptions are the same rule.

**Adaptive Spawn (RN app; the frozen web PWA keeps fixed 40/40/20).** `1` and `2` weights never change (fixed 40/40). A **20% pot** is allocated to tiles `≥3`, opened by the **spawn ceiling** (largest tile on the board): `<48` → pot is 100% `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; tiers double thereafter. Within the pot, weights follow **halving decay** — each value weighs half the next-lower (`3=1`, `6=1/2`, `12=1/4`, …), normalized per tier so the pot always sums to 20%. The curve is **configurable** (one number per tile value) for playtest calibration.

**Next-piece preview.** Before each move, the HUD shows the next spawn from the same distribution (Threes-style "next card in hand" that complements the Adaptive Spawn planning fantasy). 60% of spawns display the exact value; 40% display an ambiguous range that always contains the actual value (for `1`/`2`: "1/2"; for pot: up to 3 consecutive values, e.g., "3/6" or "3/6/12"). Informational only — never alters the spawn. Shown in **both** lanes (core strategy info, not a learning aid).

**Score & best.** Score increments by the merged tile's value. Best score persisted across launches (web: `localStorage`; RN: app storage — see Technical Specifications). Game-over overlay shows score + best + max tile + merge count + longest streak, immediately, no forced wait.

**Game over.** Grid full **and** no adjacent mergeable pair (adjacent `1|2`, or equal `≥3`). Ends with a soft fade; the last move stays visible; one-tap restart.

**Two Lanes.** At each game start, the player chooses **Clean** or **Accelerated** (player-facing i18n name: "Iniciante" / "Beginner"). Last choice is remembered as default; changing lane starts a new game. Clean: no undo/hint/ads/continue; score → Clean leaderboard. Accelerated: assistance available; score → Assisted leaderboard. Ads only between games, never during. HUD rule: no spawn-ceiling indicator and no stuck warning in Clean; such aids only in Accelerated.

**Assistance tools (Accelerated only).** Undo: 1 free per game via rewarded ad, or 3 via IAP, or unlimited with "No Ads + Unlimited Undo" IAP. Hint: via IAP (5-pack); **a hint highlights one valid mergeable pair on the board** (never suggests a direction or reveals spawn). Death-continue: once per game over — rewarded ad (1 use) or IAP. Clean lane shows no offers.

### Controls and Input

- **Touch swipe** (primary, both platforms): slide in a direction; ~20px activation threshold; pointer capture.
- **Arrow keys**: web PWA only; **not required** in the RN app (touch-first; iPad hardware keyboard not required).
- **One-tap restart** from the game-over overlay.
- **Tap targets ≥44×44pt** on all touchable elements (accessibility standard).

### Feel (P2 — The Merge as Moment)

- **Haptics:** scaled by merge value — `3` light, `6` medium, `12+` heavy.
- **Visual punch:** tile overshoots size then snaps back; color flash + particles at the merge point; splash scales with value.
- **Directional screen shake:** subtle on medium merges (~2ms amplitude), stronger on large (~5ms), capped ~8ms; minimized for accessibility.
- **Bullet time:** the session's biggest merge slows ~200ms with a flash — the emotional peak.
- **Reduced Motion** setting disables/smooths shake and bullet time **while keeping haptics and sound** (iOS accessibility requirement).

---

## Puzzle Game Specific Elements

### Core Puzzle Mechanics

- **Primary mechanic:** tile merging by slide — `1+2` and equal `≥3`, one cell per swipe, merge-once. The read-plan-swipe loop (see Core Gameplay Loop).
- **Supporting mechanics:** next-piece preview (strategy info, both lanes); Adaptive Spawn (the game grows with the player); Two Lanes (Clean / Accelerated) as the assistance layer.
- **Mechanic interactions:** Adaptive Spawn raises the ceiling as mastery grows, so the big-merge moment arrives sooner while `1`/`2` at fixed 40/40 keep late-game tension; the next-piece preview makes the read phase planable; assistance (undo/hint) relieves tension while learning without touching spawn or score.
- **Constraint systems:** one-cell movement, merge-once lock, effective-move-only spawn, fixed `1/2` weights — these are what make the board "controllable chaos" (P1).

### Puzzle Progression

- **Tutorial/introduction (first session, skippable):** 3 guided moves teaching the counterintuitive rule first (`1+2`), then the one-cell movement (the difference from 2048). Learn by playing, no text wall. Clean lane: minimal tutorial; Accelerated ("Iniciante"): first-session contextual aids.
- **Core concept:** the standard run — first merge within ~20s, first game over within ≤3min.
- **Combined/advanced:** ceiling-tier crossings open new pot values (48/96/192…), new color tiers, larger merges — the mastery journey.
- **Pacing and difficulty curve:** smooth entry; late game resolved by Adaptive Spawn (not spikes). `1`/`2` never stop spawning, so difficulty is preserved at high ceilings — tension rises with mastery (P1/P2).

### Level Structure

- **v1: no discrete levels** — a single endless 4×4 board per run; "progression" is the ceiling-tier ladder within a run and the best-score chase across runs.
- **Structure elements in v1:** tutorial (guided), standard run (endless), two lanes. **v2 (deferred):** board sizes 3×3/5×5/6×6; Daily Puzzle in **two variants** — (a) a no-leaderboard, pre-arranged board solved in N moves ("pure thinking") and (b) a fixed-seed standard run with its own leaderboard; "Grave of Stones" defeat screen.

### Player Assistance

- **Accelerated lane:** undo (1 free per game via rewarded ad / 3 via IAP / unlimited via No Ads IAP), hint (IAP 5-pack), death-continue (once per game over: rewarded ad or IAP). First-session contextual help.
- **Clean lane:** no assistance; the clean board carries the fantasy (no ceiling indicator, no stuck warning).
- **Tutorial integration:** 3 guided moves, skippable; veterans can skip entirely and play immediately.

### Replayability

- **v1:** score chase on per-lane leaderboards; best score + stats (max tile, merges, longest streak) persistence; the "one more" restart loop; Adaptive Spawn variance (big-merge lottery at high ceilings).
- **v2 (deferred):** Daily Puzzle in two variants (N-move brainteaser without leaderboard; fixed-seed run with own leaderboard), board sizes, challenge modes/celebrations.

### Solution-space guarantees & fairness

- Spawn is uniform-random in an empty cell, **never** reads the board for "help" or "punishment" beyond the ceiling tier — the player's skill is the only variable the game responds to (P3).
- No solve-gating: every board state with a mergeable pair is playable; the run ends only when no merge is possible (fair loss, P3).

---

## Progression and Balance

### Player Progression

- **No meta-leveling, no unlocks-gated content** in v1 — the game is a pure skill chase. Progression lives in two places:
  - **Within a run (ceiling-tier ladder):** crossing the spawn ceiling opens new pot values (`48 → 6`, `96 → 12`, `192 → 24`, …) and new color tiers — the "grows with the player" journey (P2). New record milestones are shown as numbers, not events, in v1.
  - **Across runs (skill + collection):** best score, max tile, merges, longest streak persist; per-lane leaderboard climb. **v2 (deferred):** named tile tiers as a collection fantasy (e.g., 48 Basalto, 96 Cobre, 192 Esmeralda).

### Difficulty Curve

- **Entry (first session):** first merge within ~20s (3-move tutorial teaches `1+2` first), first game over within ≤3min. Smooth ramp — no spikes.
- **Mid/late game:** difficulty is preserved by the **fixed 40/40 `1`/`2` spawn weights** — small tiles keep coming at high ceilings, so the board keeps asking for attention. Adaptive Spawn opens bigger pieces so the run stays ambitious rather than grinding, keeping tension and aspiration in balance (P1/P2).
- **Calibratable late-game targets:** median **max tile** per session and median **run duration** drive the configurable spawn curve — tune so the average player's ceiling rises at a healthy rate without score inflation (feeds the Success Metrics counter-metrics).
- **Assistance as difficulty relief:** the Accelerated lane's undo/hint/continue relieve tension while learning, without touching spawn or score rules (P3).

### Economy and Resources

- **Score** is the only in-run resource; it feeds the per-lane leaderboards and the best-score persistence.
- **Monetization economy (Accelerated lane only):** rewarded ads — undo (1 free per game), death-continue (1 use per game over); IAP — Hint 5-pack, Undo 3-pack, No Ads + Unlimited Undo (one-time). Ads never appear during play, only between games. **Design principle: purchase happens at the moment of pain** — friction monetized as a choice, not a wall (P3).
- **Integrity rule:** nothing purchasable ever changes spawn, merge, or score rules in either lane; leaderboards never mix lanes.

---

## Level Design Framework

### Level Types

- **v1 has no authored levels.** The only structured content is the **tutorial** (3 guided moves, skippable) plus the **tone/identity screen** (~2s, skippable, copy: "control over chaos").
- The "level" the player actually experiences is the **ceiling-tier ladder inside a run** — the board starts accessible and grows its spawn pot as the ceiling rises. Difficulty is emergent from the fixed 40/40 `1`/`2` weights, not from authored layouts.

### Level Progression

- Tutorial (teaches `1+2` then one-cell movement) → standard endless run on 4×4.
- Within a run: tier crossings (`48 → 6` opens, `96 → 12`, `192 → 24`, …) pace difficulty and aspiration.
- Across runs: best score, max tile, merges, longest streak persist; leaderboard climb per lane.

---

## Art and Audio Direction

### Art Style

- **Identity: "Mineral Quente"** — dark slate board; tiles as hot lapidary stones. Own visual language, never reads as Threes/2048 (P4).
- **Tile color ramp (13 tiers, one per value):** 1 Areia pálida → 2 Ocre → 3 Âmbar claro → 6 Âmbar → 12 Cobre claro → 24 Cobre → 48 Bronze (Basalto) → 96 Ferro → 192 Esmeralda → 384 Esmeralda profunda → 768 Obsidiana verde-escura → 1536 Incandescente → 3072+ Núcleo incandescente. `1` and `2` are deliberately distinct colors (readability of the imminent `1|2` merge). The incandescent peak makes the biggest merge visually rare (P2).
- **Tile rendering:** lapidary-stone chamfered corners; subtle grain texture; medium-heavy sans-serif with large numerals. Values with 4+ digits use extra-small numerals (~13pt), 6+ digits smaller still.
- **Beyond color:** merges are communicated by shape/text in addition to color (color-blind accessibility, WCAG AA in all themes). Light, dark, and color-blind themes, all free.
- **Icon & store:** a hot mineral tile on slate; screenshots never resemble Threes branding (P4).
- **Named tier collection fantasy (v2, deferred):** named stones aligned to the ramp (e.g., Cobre = 12/24, Basalto = 48, Ferro = 96, Esmeralda = 192); full naming scheme deferred. Cosmetics are an **identity showcase**, not the revenue engine (revenue = ad/IAP funnel).

### Audio and Music

- **Identity: "Cálido/Orgânico"** — wood, soft textures, a soft "thock" timbre; explicitly **not** Threes' sound (P4).
- **Sound scales with tile value**, mirroring the haptic scale (3 light → 12+ heavy); sound and haptics coupled.
- **MVP scope: minimal feedback SFX** — merge, spawn, game-over. No music in MVP.
- **Author caveat:** the author plays sound-off, so audio taste is a weak signal — the sound identity is a **hypothesis to validate externally** in playtest; full sound suite is v2.

---

## Technical Specifications

### Performance Requirements

- **60 FPS sustained** during play on target iOS devices, measured over a continuous 10-minute play session with merges, spawns, and feel effects.
- Offline-capable: full play without a connection (single-player, no backend).
- Instant startup and instant restart; no loading screens during a session.

### Platform-Specific Details

- **Target platform:** iOS (App Store), touch-first, React Native + Skia. Installable, offline, best score + settings persisted in app storage.
- **Secondary surface:** web PWA (existing vanilla JS build) remains available but is **not** the product of record and has **no mandated parity** with the RN app.
- **Certification constraints:** IAP/ads declarations, age rating, and a public privacy policy URL are mandatory before App Store submission.

### Asset Requirements

- Tile art: 13 color tiers + board + icon (self-generated PNG set 180/192/512).
- Minimal feedback SFX: merge, spawn, game-over. No music in MVP.
- No external CDN assets; the game ships self-contained and offline.

---

## Development Epics

### Epic Structure

| # | Epic | Delivers | Size |
|---|---|---|---|
| E1 | RN + Skia Platform Migration | TypeScript engine port (26 tests passing), Skia board render, offline/install, spike-first | XL |
| E2 | Adaptive Spawn | Tiered pot, configurable halving-decay curve, ceiling detection | M |
| E3 | Two Lanes | Clean/Accelerated selection, per-lane leaderboards, lane rules | M |
| E4 | Monetization Funnel | Rewarded ads (undo, continue), IAP products (hint, undo pack, no-ads) | M |
| E5 | Tutorial & Onboarding | 3-move tutorial, tone screen, first-session contextual help | S |
| E6 | Failure Suite | Game-over stats, one-tap restart, soft fade, last-move shown | S |
| E7 | Next Piece Preview | HUD next-spawn preview (60/40 exact/range), both lanes | S |
| E8 | Core Feel Feedback | Scaled haptics, visual punch, directional shake, bullet time (Reduced Motion aware) | M |
| E9 | Accessibility | 44pt targets, screen reader, WCAG AA, shape-beyond-color, light/dark/color-blind themes | M |
| E10 | Telemetry & Observability | Crashlytics, retention/revenue funnel events, GDPR consent, ATT prompt | M |
| E11 | Store Publication | Identity-first icon/screenshots, metadata, age rating, IAP/ads declarations, privacy policy URL | S |

Detailed epic breakdown: see `epics.md` in this folder.

---

## Success Metrics

### Technical Metrics

- Crash-free sessions (Firebase Crashlytics).
- 60 FPS sustained target on iOS.

### Gameplay Metrics

- **Retention funnel (north star):** first merge within ~20s; first game over within ≤3min in the first session.
- **D1 retention** (percentage of new users returning day 2). `[ASSUMPTION: numeric target TBD]`
- **Late-game calibration targets:** median max tile per session and median run duration (drive the configurable spawn curve).
- **Revenue funnel:** rewarded-ad completion rate, IAP purchase rate, % of players on the Accelerated lane.
- **App Store conversion:** installs from store-page views.

### Counter-metrics (do not optimize)

- Do not optimize for score inflation (Adaptive Spawn must not cheapen leaderboard achievements).
- Do not optimize ad revenue by interrupting play (ads only between games, player-initiated).
- Do not optimize IAP by pressuring death in the Clean lane (monetization lives in the Accelerated lane only).

---

## Out of Scope

**Deferred to v2 (post-launch):**
- Game Feel Suite depth beyond MVP (deeper scaled-haptic ranges, bigger screen-shake intensity, celebration moments around tier crossings/records).
- Full sound suite; audio identity validated externally in playtest.
- Tile personality / named stone collection tiers.
- Daily Puzzle — two v2 variants: N-move no-leaderboard brainteaser; fixed-seed run with own leaderboard.
- "Grave of Stones" defeat screen.
- Board sizes beyond 4×4 (3×3 / 5×5 / 6×6).
- "Unearth" mechanic.
- Paid cosmetics / themes (accessibility themes stay free).
- Launch-offer discounts / additional IAP bundles beyond the three MVP products.

**Explicitly never (identity guardrails):**
- No 2048-style rules (no `2+2=4`, no `1+1`/`2+2` merges).
- No backend, accounts, or multiplayer — fully client-side and offline-capable.
- No forced or interstitial ads during gameplay in any lane.
- Nothing purchasable ever changes spawn, merge, or score rules (P3).

---

## Assumptions and Dependencies

- **iOS first**; Android from the same RN codebase is future (not MVP target).
- **Web PWA** remains a secondary surface; no mandated parity with the RN app (web frozen at its current MVP version).
- **Adaptive Spawn curve** is configurable (one weight number per tile value); initial values = halving decay, retuned via playtest if needed.
- **Lane choice** is per-game; the last chosen lane is remembered as the next game's default; changing lane starts a new game.
- **MVP IAP pricing** is set (Hint 5-pack US$0.99/R$4.90, Undo 3-pack US$0.99/R$4.90, No Ads + Unlimited Undo US$2.99/R$14.90); launch-offer discounts deferred.
- **Name "Tríade"** cleared by INPI/store research (2026-08-07); final confirmation at App Store Connect submission.
- **Preview display window** is a contiguous tier window capped at 3 values; exact window-selection rule TBD in UX/playtest.
- **Minimal sound** = short non-musical feedback SFX.
- **D1 retention** numeric target TBD.
- **Keyboard input** not required in the RN app (touch-first).
- **Debug panel** superseded by telemetry in the RN app.
