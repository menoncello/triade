---
title: 'EXPERIENCE.md — Tríade (Merge Puzzle)'
status: final
updated: 2026-08-07
sources:
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/.decision-log.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/epics.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/decision-log.md
  - _bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md
  - _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md
  - _bmad-output/brainstorming-session-2026-08-06.md
---

# EXPERIENCE.md — Tríade (Merge Puzzle)

## Foundation

iOS App Store mobile MVP, **touch-first**, fully offline, no backend and no accounts. Playable in both **portrait and landscape** (landscape is a first-class orientation, not a rotated afterthought — D-006). Engine/UI system: React Native 0.86 + Skia 2.11 (Expo 57), Reanimated 4 for animations and the imperative feel layer, i18next for PT/EN. Safe areas come from `react-native-safe-area-context` (bundled with Expo SDK 57; pinned in the architecture matrix) — `{spacing.safe-margin}` is applied **on top of** the per-edge insets in both orientations. The web PWA is a frozen legacy secondary surface with **no mandated parity** — the arrow-key scheme lives only there. Visual identity: `DESIGN.md` (Mineral Quente) is the reference; this spine owns how it behaves. Both spines win over any mock.

## Information Architecture

Lane Select **is** the main menu — a functional, "vivo" surface, not a title screen and not a portal (D-011). `Jogar` is a one-tap shortcut straight into a game on the last/default lane; everything else is one tap away in the exploration zone. Game over is an overlay in the GameScreen, not a new screen — instant restart, zero loading (S6.1).

| Surface | Reached from | Purpose |
| --- | --- | --- |
| Tone screen | First launch only (~2s, tap to skip) | Identity moment: dark slate, one large incandescent tile lighting up, copy "controle sobre o caos". No other text (D-009) |
| Main menu / Lane Select | App open (post-tone) | Lane cards + **Jogar** shortcut + exploration: Leaderboard, Lane choice (new-game warning), Settings (D-011, D-008) |
| Game screen HUD | Jogar / lane card | Score center-top, best below small, preview card bottom corner, pause top-right; the 4×4 board. Iniciante adds ceiling indicator + stuck warning only when relevant (D-007) |
| Tutorial | First game (per-lane, skippable) | 3 guided moves: `1+2` rule first, then one-cell movement (E5/S5.1) |
| Pause | Pause control in-game | **Resume / Restart / Quit only** (D-012). Settings live in the menu, not here |
| Game-over overlay | Match end (soft fade) | Stats + single **Jogar de novo** (1-tap restart, same lane). Iniciante: discreet death-continue offer (D-010) |
| Leaderboard | Menu + game-over | Per-lane top-10 local, **two tabs**: "Melhores" (best-ever with timestamps) and "Recentes" (last 10 with timestamps) (D-014) |
| Settings | Menu exploration zone | Theme, reduced motion, language, lane default — persisted (D-012) |
| Reward prompt | In-game, Iniciante only | Undo (rewarded ad, 1/game) and death-continue (rewarded ad, 1 use) or IAP; never forced, ads only between games (E4, PRD FR-19) |

→ Composition references: `mockups/key-game-portrait.html` (game HUD portrait), `mockups/key-game-landscape.html` (landscape edge band), `mockups/key-gameover.html` (game-over overlay), `mockups/key-tone-tutorial.html` (tone + tutorial), `mockups/key-leaderboard.html` (leaderboard). Spine wins on conflict.

**Navigation flow:** Tone → Menu → Game. Restart is one tap from game-over (same lane). Quit from pause or game-over returns to the menu. Lane switching happens **only** from the menu and always warns that it starts a new game when a match exists (D-012, D-008 footer). Nothing is deeper than two levels from the menu; pause is one tap from anywhere in a match.

**`[NOTE FOR UX]`** — Global leaderboard is **v2** (D-005): it requires a backend, which collides with the GDD/PRD hard boundary (offline, no accounts, no server). This run's IA is entirely local.

## Voice and Tone

Calm, precise, low-temper "controle sobre o caos" — control over chaos. The tone screen is the whole brand promise in two words and one glowing tile. Microcopy does not hype: it informs, then gets out of the way. There is no encouragement system, no "Amazing!", no level-up fanfare — the game's biggest celebration is a quiet 200ms of bullet time on a merge the player earned (see Game Feel & Juice).

| Do | Don't |
| --- | --- |
| "controle sobre o caos" (PT) / "control over chaos" (EN) — tone screen | "Get ready to play!" onboarding copy |
| "Jogar" / "Play", "Jogar de novo" / "Play again" | "Tap to start your adventure!" |
| "Trocar de pista começa uma nova partida" / "Changing lane starts a new game" | Un-hedged lane switching |
| "Novo recorde" / "New record" — a highlighted number (D-013) | "NEW BEST!! 🎉" |
| Stuck warning (Iniciante): plain, factual, contextual | Scolding or "sweating" the player |
| "Continuar" / "Continue" as the discreet secondary on game-over (Iniciante) | "Only $0.99 to keep playing!" urgency framing |

**Per-lane tone.** Clean ("Pura") is silent and trustful — no aids, no warnings, no offers; the board speaks. Iniciante ("Beginner") is plain-spoken help — ceiling indicator, stuck warning, undo/hint/continue offered *at the moment of need*, never as a wall. Both share the same neutral, unhyped voice.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md` Components.

| Component | Surface | Behavioral rules |
| --- | --- | --- |
| Menu item (`{components.menu-item}`) | Main menu / Settings | Full-width row, 48pt min height; tap navigates or toggles; default-lane card carries the accent bar |
| Jogar button (`{components.button}`) | Main menu | One tap → game on last/default lane. Present even when a lane card is highlighted; the shortcut is the point (D-011) |
| Tile (`{components.tile}`) | Game board | Swipe to move; merges resolve per engine trace; never tappable (touch is for swiping, not picking) |
| Preview card (`{components.preview-card}`) | HUD, both lanes | Reads the pre-resolved pending spawn (N3). Shows exact value (60%) or ambiguous range (40%) — `1/2`, `3`, or up to 3 consecutive values — always containing the actual value. Never alters the spawn (FR-41..44) |
| Lane card (`{components.lane-card}`) | Main menu | Clean "Pura" / Iniciante "Com ajuda" ("Beginner"), one tone line each, default highlighted; tapping with an existing match triggers the new-game warning (D-008) |
| Leaderboard tab (`{components.leaderboard-tab}`) | Leaderboard | "Melhores" / "Recentes" toggle; rows show rank, score, date+time (D-014) |
| Settings row (`{components.settings-row}`) | Settings | Tap → theme, reduced motion, language, lane default; changes apply immediately and persist |
| Reward prompt (`{components.reward-prompt}`) | In-game, Iniciante | Appears at the moment of pain (undo consumed / death). Rewarded ad first, IAP as the alternative; Cancel always available; no ad during play, only between games (FR-15, FR-19) |
| Prompt/banner (`{components.prompt-banner}`) | HUD, Iniciante only | Ceiling indicator and stuck warning; contextual, dismissible, appears only when relevant; never in Clean (P1, D-007) |
| Game-over stat row (`{components.game-over-stat-row}`) | Game-over overlay | Score, best, max tile, merges, longest streak shown immediately; new record highlighted as a number (D-010, D-013) |
| Pause button (`{components.pause-button}`) | Game screen | One tap → Pause overlay (Resume / Restart / Quit). Pause is a state, not a router (D-012) |

## State Patterns

| State | Surface | Treatment |
| --- | --- | --- |
| First launch | Tone screen | Tone plays ~2s, tap to skip; no other tap target. Auto-advance pauses while a screen-reader announcement is in flight / while VoiceOver is active. Returning launches skip it entirely (D-009) |
| Playing | Game screen | Full HUD; score live, preview card live. Iniciante: learning aids contextual |
| Noop swipe | Game screen | No spawn, no score, no turn consumed — a rejected `move()` is silent control flow (architecture `ok \| rejected`). No punish animation; the board simply doesn't move |
| Paused | Pause overlay | Frozen board + scrim behind; Resume / Restart / Quit. No settings here (D-012). A pause tap mid-animation lets the in-flight swipe settle, then freezes — the board under the scrim is the post-animation snapshot |
| Game over | Game-over overlay | Soft fade, last move visible; stats immediately; single Jogar de novo; Iniciante adds discreet continue |
| New record | Game-over overlay | Score highlighted in `{colors.accent}` — number, not event (D-013); celebration variants deferred to playtest |
| Empty leaderboard | Leaderboard | "Sem registros ainda" / "No scores yet" — friendly, no funnel pressure; the first run's score seeds it |
| Lane-switch warning | Main menu | "Trocar de pista começa uma nova partida" with confirm; only when a match/best exists on the other lane (D-008, D-012) |
| Settings change mid-match | Settings (menu) | Impossible by construction — settings live in the menu, pause is pure (D-012). Theme changes apply next match; no mid-run visual breaks |
| Death-continue consumed | Game-over overlay | Continue offer disappears after one use per game over; revert to the single Jogar de novo |
| Reward ad fail / cancel | Reward prompt | Revert to the primary CTA; nothing lost, no blocking error state (Ana failure branch) |
| Tutorial active | Tutorial overlay | 3 guided moves, skippable; first merge target ~20s |
| Ceiling-tier crossing | In-game | No celebration in MVP (GDD); the new pot values and color tiers *are* the reward the player sees as tiles get bigger |

## Interaction Primitives

- **Swipe** (primary, both orientations) — slide on the board; ~20px activation threshold; **mechanism: `react-native-gesture-handler` `Gesture.Pan()`** (pinned in the architecture version matrix — RN core has no Pointer Events pointer-capture). Direction resolves the move; a swipe that doesn't reach the threshold is a no-op.
- **Tap** — buttons, menu items, toggles, leaderboard tabs, pause, skip (tone screen, tutorial).
- **1-tap restart** — from game-over, straight back into a new game on the same lane (UJ-5 "one more").
- **Banned:** forced interstitials, mid-game ads in any lane, celebration spam, account/login walls, push notifications. Ads are always player-initiated rewards and live between games in Iniciante only (GDD identity guardrails; FR-19).

**Input edge-cases contract (E1 must not invent these):**
- **Gesture cancelled / system interruption** (RNGH `onEnd` with `success:false`, phone call, app switch) → no move, no spawn, no turn consumed; the board stays as it was.
- **Release off the board mid-gesture** → resolve the swipe as captured (the gesture owns the move regardless of where the finger lifts).
- **Concurrent second finger** → ignored (first finger wins); no second `move()` while a swipe or its animation is in flight.
- **Swipe during an in-flight animation** → queued/rejected per engine contract (architecture `ok | rejected`); never a mid-animation board mutation.

## Accessibility Floor

Behavioral. Contrast and visual tokens live in `DESIGN.md` Colors.

- **Tap targets** ≥ 44×44pt on every touchable element (S9.1) — enforced at the component level, not per screen. Includes the leaderboard tab (44pt hit area), banner dismiss target, and tone-screen skip.
- **Reduced Motion is a preset, not a flag** (architecture): it gates the **whole feel layer** — screen shake, bullet time, flash/particles, overshoot-and-snap scale, the `1536+` glow, and the game-over soft fade — **while keeping haptics and sound** (S8.5, FR-30). It is also the sanctioned 60 FPS fallback profile. (Visual counterpart: DESIGN.md Elevation & Depth — the feel layer.)
- **Themes:** light, dark, and color-blind, all free (S9.4). Theme is a menu setting; it never blocks play.
- **Dynamic type** honored for HUD labels and menu copy — the largest accessibility text setting must still render without truncation (DESIGN.md Typography). Tile numerals are a deliberate, flagged exception (fixed, Skia-rendered) and must stay legible at the largest text setting and smallest landscape tile (see DESIGN.md Typography).
- **No time pressure anywhere** — nothing expires a turn, an offer, or a run. The tone screen's ~2s auto-advance is the single exception and is **exempt as non-informational** (it is a title beat, not content); it **pauses while a screen-reader announcement is in flight** (or while VoiceOver is active), so the reader is never raced.

### Screen Reader Contract (S9.2)

VoiceOver/TalkBack is a first-class input path, not a bolt-on. **Move = three-finger swipe** in a direction (VoiceOver reserves single-finger swipes for navigation — the primary move gesture has no single-finger path). **Read the board = tap a tile** to hear its value + position (row/column). The grid exposes per-tile `accessibilityElement`s with **engine-derived labels** — because tiles render in Skia (not React views), E9 exposes them to `UIAccessibility` via a bridge so the label always matches the board.

**Label provenance (re-scoped rule):**
- **Board labels** (tile value + position, merge results, noop) come from **engine state and per-move events** (board grid + the per-tile trace) — never ad-hoc strings typed in UI. What the reader says always matches the board.
- **Chrome labels** (Resume/Restart/Quit, theme names, leaderboard rank/score/date, banner copy, reward-prompt copy) are **i18n-authored strings** — they are not derivable from the engine and are not "invented in UI"; they live in the i18n catalog.

**Announcement contract** (event → what VoiceOver says → source):

| Event | Announcement | Source |
| --- | --- | --- |
| Move resolved | Direction, then changed tiles (e.g. "tile 3, row 2, column 1") | Engine move result |
| Merge | "Merged: 3 plus 3 equals 6" | Trace (`from` length ≥ 2) |
| Noop swipe | Silent — no announcement, no turn (rejected `move()`) | Engine `ok \| rejected` |
| Score change | Announced on merge only (not per-tile), throttled — never a per-tile stream | Engine score field |
| Spawn | "New tile 1" | Spawn event |
| Game over | "Game over. Score X, best Y" | Game-over event |
| New record | "New record: X" | Record check |
| Preview card | Announced with the next spawn (value or range) | Pending spawn (N3) |
| Banner (Iniciante) | Announce on appear; the banner's dismiss target is a labeled control | i18n |
| Reward prompt | Announce the offer and each action (Continue / Cancel) | i18n |

## HUD & Diegetic UI

The **board is the diegetic surface** — the stones, the well, the chamfered facets are the world the player reads. Everything else is **non-diegetic overlay**: the score band and preview card are chrome the Maestro consults, not part of the game world.

**Portrait HUD (D-007):** score center-top (`{typography.display}`), best below in `{colors.muted}` small, preview card bottom corner near the swipe finger, pause top-right — **nothing else**. No timer, no combo meter, no spawn-ceiling bar, no minimap. The information hierarchy is: the board (always), the score (always), the preview (always, both lanes), best (small, always — and **lane-scoped**: the HUD "best" is the active lane's best, never a merged/global figure, per P3). Learning aids are **Iniciante-only** and contextual: a ceiling indicator and a stuck warning appear *only when relevant*, in `{colors.muted}`/`{colors.accent}` banner form (DESIGN.md prompt-banner), and never in Clean (the clean board carries the fantasy — P1).

**Landscape (D-006):** the board dominates; the HUD collapses to a **thin top edge band** — score + best left, preview right, pause opposite the preview (top-right), at `{typography.score-landscape}` / `{typography.caption-landscape}` sizes, all inside safe margins clear of the notch and home indicator. Nothing dies in landscape; everything shrinks.

**What hides or shows:** during pause and game-over the board freezes beneath the scrim (the last move stays visible behind the game-over stats — D-010); the feel layer's particles/flash come and go without ever persisting as UI. There is no idle-fade of HUD in this game — the score and preview are always worth reading.

## Input Schemes

- **Touch swipe (primary)** — portrait and landscape; ~20px threshold; RNGH `Gesture.Pan`; works with either thumb; first-finger-wins on concurrent touch.
- **Tap** — all non-board interactions.
- **1-tap restart** — game-over overlay.
- **Arrow keys — web PWA only**, not the RN app; iPad hardware keyboard is not required (PRD assumption 8, GDD).
- No remapping in v1 (single input scheme). No multi-touch requirements (a second finger is ignored, never a second move).

## Game Feel & Juice

The Merge as Moment (P2), shipped as the **full core suite in MVP** (GDD D-011 supersedes the PRD's "no full suite" note). Feel is **data, not code** — declarative presets per tier band, swept by the CI/device benchmark.

- **Haptics, scaled by merge value:** `3` light, `6` medium, `12+` heavy (S8.1).
- **Visual punch:** the merged tile overshoots its size and snaps back; color flash + particles at the merge point; splash scales with value (S8.2). Overshoot/snap follows the trace (declarative); particles/flash are imperative worklets.
- **Directional screen shake:** subtle on medium merges (~2ms), stronger on large (~5ms), **capped ~8ms**, minimized for accessibility (S8.3).
- **Bullet time:** the session's biggest merge slows ~200ms with a flash — the golden moment (S8.4, GDD Core Gameplay Loop). Only a *new* session-best merge triggers it; undo rewinds it with the board.
- **Sound + haptics coupled**, scaling with tile value. **MVP audio = minimal SFX only: merge, spawn, game-over. No music.** Cálido/Orgânico timbre — soft "thock", wood/warm — explicitly **not** Threes' sound (P4).
- **Death treatment (S6.4):** game over is an **elegant "fall"** — the soft fade over the frozen board, the stats drifting in quietly, no abrupt cutoff, no forced wait; the death receives the same care as the big merge (D-010).
- **Reduced Motion preset** gates the **whole feel layer** — shake, bullet time, flash/particles, overshoot scale, `1536+` glow, and the game-over soft fade — **while keeping haptics and sound** (S8.5, FR-30; full set in Accessibility Floor and DESIGN.md Elevation & Depth).
- **`[NOTE FOR UX]`** — haptic/shake/bullet-time magnitudes are transcribed from the brainstorm as starting values and are **flagged for playtest calibration** (GDD D-006 note); the config-driven preset system exists exactly so these are tuning data, not code changes. **`[NOTE FOR UX]`** — the cálido/orgânico audio identity is a **hypothesis to validate externally** (the author plays sound-off; his taste is a weak audio signal — brainstorm Note de Autoria).

## Inspiration & Anti-patterns

- **Lifted from Threes (the authentic thing):** the "next card in hand" preview as core strategy information in *both* lanes; the feel language — merges are moments, moves are one cell, the board rewards reading.
- **Lifted from Threes (identity):** chamfered stones and a dark slate forge instead of pastel tiles — the Mineral Quente ramp is the storefront answer to "we are not a Threes clone" (P4).
- **Rejected — 2048's rules and grammar:** no `2+2`, no `1+1`/`2+2`, no compaction cascades; no pastel gradient chips, no pills, no celebratory banners on every merge.
- **Rejected — celebrating everything:** the record is a highlighted number, not an event (D-013); no confetti on tier crossings; the only "celebration" in the feel suite is the quiet bullet time on the session's biggest merge.
- **Rejected — pun-laden or hype UI:** "controle sobre o caos" is the whole identity; no "burning hot!" copy, no gem-pun economy.
- **Rejected — menu friction:** Jogar is one tap from the menu (D-011); pause is pure (D-012); settings never interrupt a run; ads are never forced.

## Responsive & Platform

- **Portrait** — full HUD band (score center-top, best below, preview bottom corner, pause top-right); board maximized in the middle.
- **Landscape** — board dominates; HUD collapses to a thin **top edge band** (score+best left, preview right, pause top-right) at `{typography.score-landscape}` / `{typography.caption-landscape}` (D-006).
- **iOS safe areas** via `react-native-safe-area-context`, applied in both orientations (notch, home indicator); `{spacing.safe-margin}` = 16pt **on top of** per-edge insets, including the preview card and pause button.
- **Dynamic type** honored for labels and copy (DESIGN.md Typography); tile numerals fixed for in-tile legibility.
- **Touch targets** ≥ 44×44pt everywhere (S9.1).
- One codebase, iOS MVP; Android (same RN codebase) is future, not target. Web PWA stays frozen as the legacy secondary surface.

## Key Flows

### Lia — first session, Beginner (Iniciante) lane, first merge under 20s

Lia has never played a slide-merge puzzle. The app is her first launch.

1. **Tone:** dark slate screen, one large incandescent tile lights up, "controle sobre o caos". She lets it play its ~2s; it ends on its own. (She could have tapped to skip — no other tap target exists.)
2. **Menu:** the main menu is Lane Select. "Iniciante" ("Beginner") is the default, highlighted. She taps **Jogar** — one tap, she's in.
3. **Tutorial:** three guided moves, the counterintuitive rule first — she's shown a `1` and a `2` touching, told *these* merge. **Climax:** she swipes them together; the board makes the merge, the `3` slides in, the haptic is light — first merge inside 20 seconds.
4. The tutorial teaches one-cell movement; she swipes a few more times and it dismisses. Iniciante's ceiling indicator and stuck warning appear quietly only when a board is near-stuck.
5. Around three minutes she hits her first game over: soft fade, last move visible, stats (score, best, max tile, merges, longest streak). **Continue** shows as a discreet secondary; **Jogar de novo** is the primary. She taps continue once, then later lets the run end and taps Jogar de novo.

*Failure branch:* tutorial tap-through — Lia skips mid-move → the tutorial releases the board immediately and the standard run begins (no text wall, no gating).

### Théo — Achiever on the Clean lane, hunting his record

Théo has been chasing the same best score for two sessions.

1. He opens the app; the menu remembers **Pura** (Clean) as his last lane. The **Jogar** shortcut is pre-armed for it — he taps once, straight in, no lane re-confirmation.
2. The Clean board is bare: score, best, preview card, and 16 quiet cells. No aids, no warnings — that's the contract (P1).
3. He plays a long reading-driven run. Around the 768 ceiling the pot opens `96`; tiles he's never held appear.
4. **Climax:** a pair of 1536s lines up. He swipes; the session's biggest merge fires — overshoot-and-snap, particle splash, heavy haptic, a low cálido **"thock"**, directional shake, and the ~200ms bullet-time flash. That is the golden moment; it is the whole reason he's here.
5. A few moves later the grid locks. Game over: soft fade, last move visible. His score clears his record.
6. **New record** is a number highlighted in `{colors.accent}` on the stats — no confetti, no fanfare (D-013). He taps **Jogar de novo** immediately.
7. Later he opens **Leaderboard** → **Melhores** and sees his timestamped top-10 entry on the Clean board — no assisted score will ever sit beside it (P3).

*Integrity beat:* nothing in the Clean lane ever offers undo, hint, continue, or an ad — by profile contract, not by restraint (ADR-03).

### Dora — veteran, skips the tutorial, two minutes on the bus

Dora knows Threes; she wants the bus stop to pass quietly.

1. She opens the app — tone screen already seen, straight to the menu.
2. She taps **Jogar**. A first-session tutorial offers itself; she taps **skip** — instantly in, no walkthrough (FR-22).
3. She plays in **landscape**, one-handed: the board dominates, the HUD is a thin top edge band (score+best left, preview right), numerals smaller (D-006).
4. She makes a swipe that wouldn't change the board — **noop**: nothing spawns, nothing scores, no turn consumed. The board simply doesn't move; no friction, no punish.
5. She lands a 384 deep-emerald; the emerald band is new to her screen.
6. Two minutes in, she quits — **Pause** → **Quit** to the menu, no save-guilt, no "come back!" prompt.

### Ana — Beginner, death-continue via rewarded ad (Iniciante)

Ana is mid-run in Iniciante, near the top of her skill, and the grid just filled with no mergeable pair.

1. She mis-swipes a 384 into the dead zone; the row it sat in reshuffles against her. **Undo** appears at the moment of need — a discrete reward prompt (the frequent touchpoint, S4.1). She taps it; a rewarded ad plays between games; the board rewinds exactly (true rewind, ADR-06), the free undo of the game consumed.
2. Later the grid fills with no mergeable pair.
3. Game over: soft fade over the last move; stats immediately.
4. Primary **Jogar de novo**; beneath it, a discreet **Continue** (rewarded ad, once per game over — D-010, FR-18).
5. Ana taps Continue → rewarded ad plays (player-initiated) → the board rewinds to the pre-death state.
6. She plays on; a second death offers **no** Continue — the once-per-game-over budget is spent; Jogar de novo stands alone.
7. **Climax:** the rewind feels like an earned second chance, not a crutch — the board is exactly as she left it, and the run continues toward a bigger tile.

*Failure branch:* the ad fails or is cancelled → Continue returns to Jogar de novo; nothing is lost, no blocking error state.

### Beatriz — VoiceOver user, Clean lane

Beatriz is blind and uses VoiceOver full-time; she learned slide puzzles in the Threes era.

1. She opens the app; the tone screen plays with its incandescent tile and the single line "controle sobre o caos" — VoiceOver announces it fully (the ~2s auto-advance waited for the announcement to finish). She taps once to skip if she's heard it before.
2. The menu items — Jogar, leaderboard, lane choice, settings — are labeled i18n controls; she swipes through them and activates **Jogar**. The default lane (Pura) is pre-armed; she doesn't need to read the lane cards.
3. The board exposes each tile as an accessibility element; she taps tiles to hear "tile 1, row 1, column 2" — the labels come from engine state, so they always match what the sighted board shows.
4. **Climax:** she performs a **three-finger swipe** left; VoiceOver is in a mode that lets the three-finger gesture reach the game — the board moves, and the merge announces "Merged: 1 plus 2 equals 3". A noop swipe she makes by accident is silent — no turn lost, no score change.
5. She hits game over: "Game over. Score 420, best 420." The **Jogar de novo** button is a labeled control; she activates it and is instantly in a new run.

*Failure branch:* VoiceOver's three-finger swipe is intercepted by the system gesture → the move never registers; the board does not move and no turn is consumed — the same as a noop (no feedback, no punishment).

---

*Open items carried forward for playtest/art direction: preview window-selection rule (GDD/PRD assumption), D1 retention numeric target, feel-value calibration, and the audio identity hypothesis — all `[NOTE FOR UX]` in their sections above.*
