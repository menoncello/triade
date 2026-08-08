---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/review-rubric.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/review-hud-input.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/review-accessibility.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/validation-report.md'
  - '_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md'
  - '_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/addendum.md'
---

# Tríade (3-clone) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Tríade (3-clone), decomposing the requirements from the GDD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The game rules engine from `js/game.js` is ported to TypeScript in the RN app with identical behavior — starting setup (9 tiles), merge, spawn, score, and game-over — and remains a single source of truth (UI never duplicates rules).
FR2: The 26 existing unit tests pass against the ported TypeScript engine (`node --test`).
FR3: The RN app renders a 4×4 board via Skia with tile slide/merge/spawn animations driven by the engine's per-tile trace; the board stays playable in both portrait and landscape.
FR4: The app ships installable from the App Store, runs offline, and persists best score and settings across launches.
FR5: A technical spike is performed first: port `game.js` + render one board in Skia, before committing to the full architecture.
FR6: Spawn weights for `1` and `2` remain fixed at 40%/40% at all times, regardless of Spawn ceiling.
FR7: 20% of spawn weight is a pot for pieces `≥3`, opened per ceiling tier: `<48` → only `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; ceiling doubling continues thereafter.
FR8: Within the pot, higher values are less likely than lower values. Initial curve: halving decay — each value weighs half the next-lower (`3=1`, `6=1/2`, `12=1/4`, …), normalized per ceiling tier so the pot sums to 20%.
FR9: The pot weight curve is configurable: weights are driven by a single parameter set (one number per tile value) exposed in a config, so the curve can be tuned and playtest-calibrated without code changes.
FR10: Adaptive Spawn respects the merge-once rule and effective-move spawn rules of the ported engine.
FR11: At game start, the player chooses Clean or Accelerated lane. The last chosen lane is remembered and becomes the default for the next game; changing the lane starts a new game.
FR12: Clean lane provides no undo, no hint, no ads, and no death-continue offer.
FR13: Accelerated lane provides undo (1 free per game via rewarded ad, or 3 via IAP), hint (via IAP), and death-continue (rewarded ad 1 use, or IAP).
FR14: Score from each lane goes only to its own leaderboard (Clean / Assisted); lanes never mix.
FR15: Ads appear only between games in the Accelerated lane, never during play.
FR16: A rewarded ad grants exactly one undo per game in the Accelerated lane (no more than 1 free undo per game via ads).
FR17: An IAP grants 3 undos usable in the Accelerated lane (US$0.99/R$4.90); "No Ads + Unlimited Undo" IAP (US$2.99/R$14.90, one-time) grants unlimited undos and removes rewarded-ad prompts.
FR18: Death-continue in the Accelerated lane is offered once per game over: rewarded ad (1 use) or IAP. No continue offer appears in the Clean lane.
FR19: No forced or interstitial ads during gameplay in any lane; ads are always player-initiated rewards.
FR20: All purchases and ad placements are declared to the App Store (IAP/ads declarations) at submission.
FR21: A skippable tutorial teaches, in 3 guided moves: the 1+2 merge rule, then the one-cell movement rule.
FR22: Genre veterans can skip the tutorial entirely and play immediately.
FR23: The Accelerated lane shows contextual help during the first session; the Clean lane shows minimal tutorial only.
FR24: A ~2-second identity/tone screen ("control over chaos") shows at first launch and is skippable.
FR25: The game-over overlay shows immediately: score, best score, max tile, number of merges, and longest streak.
FR26: One-tap restart returns directly to a new game (same lane).
FR27: The game ends with a soft fade; the last move remains visible; no forced wait before the overlay.
FR28: All touchable elements have tap targets ≥44×44pt.
FR29: Screen readers (VoiceOver/TalkBack) announce tile value and position, score changes, and game-over state.
FR30: A Reduced Motion setting disables/smooths screen shake and bullet-time effects while keeping haptics and sound — iOS accessibility requirement.
FR31: Tile value is communicated by shape/text in addition to color; contrast meets WCAG AA in all themes.
FR32: Light, dark, and color-blind themes are available and free.
FR33: Crash reporting via Firebase Crashlytics, with crash-free-session tracking.
FR34: Analytics events cover the retention funnel: first merge time, first game-over time, lane choice, first-session completion.
FR35: Revenue-funnel events: rewarded-ad impressions/completions, IAP purchases, continue/undo usage.
FR36: GDPR consent mode is implemented; an ATT prompt appears on iOS if ad attribution is used.
FR37: A public privacy policy URL is live before App Store review submission. (Blocking)
FR38: Store icon and screenshots use the "Mineral Quente" identity (dark slate, amber→copper→emerald tiles) and never resemble Threes branding.
FR39: App Store metadata (description, keywords, age rating, IAP/ads declarations) is complete and accurate at submission.
FR40: The App Store name and subtitle "Tríade: Merge Puzzle" are confirmed available in App Store Connect before submission.
FR41: Before each move, the HUD shows the next spawn value, drawn from the same distribution as the actual spawn.
FR42: The preview shows the exact value in 60% of spawns and an ambiguous range in 40% of spawns (separate display roll).
FR43: The ambiguous range always contains the actual value: for `1` or `2`, shows "1/2" together; for a pot value when only `3` is available, shows "3"; for pot values when more are available, shows up to 3 consecutive values (e.g., "3/6" or "3/6/12"), with the spawned tile being any one of the displayed values.
FR44: The preview never alters the spawn distribution or the actual spawned tile.
FR45: The preview is shown in both Clean and Accelerated lanes.

### NonFunctional Requirements

NFR1: 60 FPS sustained during play on target iOS devices, measured over a continuous 10-minute play session with merges, spawns, and feel effects.
NFR2: Offline-capable: full play without a connection (single-player, no backend, no accounts, no networking).
NFR3: Instant startup and instant restart; no loading screens during a session.
NFR4: Engine as single source of truth; UI consumes per-tile trace only (UI never duplicates rules).
NFR5: IAP/ads declarations + public privacy policy URL are mandatory before App Store submission (blocking).
NFR6: No external CDN assets; the game ships self-contained and offline.
NFR7: Touch-first; arrow keys / keyboard not required in the RN app.
NFR8: iOS first; Android (same RN codebase) is future, not MVP target.
NFR9: Web PWA remains a secondary surface with no mandated parity with the RN app.
NFR10: Expo Go is not a target — development build only (required for 60 FPS, Skia, native modules).
NFR11: CI benchmark deterministic (engine cost per turn < 2ms; frame logic worst case < 8ms); device job p99 < 16.7ms/frame with full feel preset.
NFR12: Engine never throws; returns `Result` objects (`ok | rejected`); errors never player-visible.
NFR13: i18n PT/EN in v1; strings never leak into board logic.
NFR14: Reduced Motion is the sanctioned emergency 60 FPS fallback profile.

### Additional Requirements

- Starter template: Expo SDK 57 (blank-typescript), development build (not Expo Go). This is the starting point for Epic 1 Story 1 (S1.1 spike).
- Pinned Version Matrix (single source of truth): expo 57.0.11, react-native 0.86.2, @shopify/react-native-skia 2.11.0, react-native-reanimated 4.3.x, react-native-worklets 0.8.x, expo-haptics (SDK 57), react-native-purchases 10.7.0, react-native-google-mobile-ads 16.4.0, @react-native-firebase/app+crashlytics+analytics 26.1.0, expo-audio 57.0.3, expo-secure-store (SDK 57), i18next 26.3.6, react-i18next, expo-localization (SDK 57), expo-tracking-transparency 57.0.1, react-native-safe-area-context (SDK 57).
- S1.1 spike benchmark ships in the same PR as the spike (engine < 2ms/turn; frame logic worst case < 8ms; device p99 < 16.7ms).
- ADR-01 Engine purity: pure TS module; render/feel/audio/telemetry are observers; 26 tests as the gate.
- ADR-02 Monetization boundary: entitlements (IAP) vs per-match budgets (memory); engine exposes atomic contracts (`undo()` → `ok | rejected`); nothing purchasable changes spawn/merge/score.
- ADR-03 Lane wall: Clean profile has no assistance path; leaderboards never mix; enforced by contracts, not trust.
- ADR-04 60 FPS as evidence: two-level benchmark (CI deterministic + scheduled device job); Reduced Motion as emergency profile.
- ADR-05 Hybrid rendering: declarative trace-derived board + imperative feel layer (worklets); frame math in pure TS.
- ADR-06 Deterministic undo: immutable snapshots include PRNG state — undo is a true rewind (prereq for v2 seeded Daily Puzzle).
- Persistence layers: AsyncStorage/MMKV (settings, best score, lane memory) + expo-secure-store (entitlements, authoritative offline) + memory (per-match budgets, die with the match).
- Navigation: screen-state machine (tone → lane select → game); game over is an overlay; restart = reset store, no navigation.
- Monetization: RevenueCat (3 IAP products + restore/entitlements) + AdMob rewarded ads + UMP GDPR consent.
- Telemetry: Firebase Crashlytics + Analytics as observer; consent mode; ATT via expo-tracking-transparency.
- Audio: expo-audio minimal SFX manager (merge/spawn/game-over), volume scaled by tile value, coupled with expo-haptics; swappable layer.
- Theming/A11y: theme tokens as pure data (light/dark/color-blind); merges by shape+text beyond color; WCAG AA; 44pt targets; VoiceOver labels from engine-derived sources.
- Asset loading: preload all (13 tile tiers, board, icon, 3 SFX) via expo-asset; no CDN.
- Directory structure: Domain-driven — `src/engine` (pure TS, no RN/React/Skia), `src/game` (orchestrator), `src/render` (Skia), `src/feel` (worklets), `src/ui`, `src/services` (monetization/telemetry/audio/storage), `src/state`, `src/theme`, `src/i18n`, `src/dev` (__DEV__ only).
- Architectural boundaries: engine never imports RN; render/feel/ui/services only consume events/trace; spawnConfig is data validated by tests; board never lives in `src/state`; feel presets are data (`presetFor` pure).
- Debug tools __DEV__-only (state inspector, event recorder, perf hooks, seed control, spawn override); telemetry supersedes the web debug panel in the RN app.
- Errors: hybrid — recoverable (rejected result, no crash log) vs unexpected (I/O/native → global handler → Crashlytics); game over is a state, not an error.
- Events: typed Observer pattern, PascalCase discriminated `type` (e.g., `TilesMerged`, `PieceSpawned`, `ScoreChanged`, `MatchOver`, `LaneChanged`); sync dispatch; dev-only recorder.

### UX Design Requirements

UX-DR1: Screen Reader Contract (D-018): move = three-finger swipe; read = tap a tile (value + position); per-tile `accessibilityElement`s exposed from Skia to `UIAccessibility` via a bridge; labels always match the board.
UX-DR2: Announcement contract table (event → VoiceOver message → source): move resolved, merge ("Merged: 3 plus 3 equals 6"), noop swipe silent, score on merge only (throttled), spawn ("New tile 1"), game over ("Game over. Score X, best Y"), new record, preview card, banners (Iniciante), reward prompt. Board labels engine-derived; chrome labels i18n-authored, never ad-hoc UI strings.
UX-DR3: Input mechanism pinned: RNGH `Gesture.Pan()` (RN core has no pointer-capture); edge-case contract — cancel → no move/no turn; release off-board → resolve as captured; concurrent second finger → ignored (first finger wins); swipe during in-flight animation → queued/rejected (D-017).
UX-DR4: Safe areas via `react-native-safe-area-context`; `{spacing.safe-margin}` (16pt) applied on top of per-edge insets in both orientations, including preview card and pause button (D-017).
UX-DR5: Landscape layout (D-015/D-006): board dominates; HUD collapses to a thin top edge band — score+best left, preview right, pause top-right — at `{typography.score-landscape}` (22pt) / `{typography.caption-landscape}` (11pt); min ~44pt tile width before the numeral/ink check re-runs; clear of notch and home indicator.
UX-DR6: Pause button fixed top-right in both orientations, outside the board swipe rect, ≥44×44, inside safe margins (D-016).
UX-DR7: Portrait HUD (D-007): score center-top (34pt display), best below small (lane-scoped, muted), preview card bottom corner near the swipe finger, pause top-right; nothing else — no timer, no combo meter, no spawn-ceiling bar, no minimap. Learning aids (ceiling indicator, stuck warning) are Iniciante-only, contextual, never in Clean (P1).
UX-DR8: Preview card "card in hand" (N3): value in accent ink at 20pt; reads the pre-resolved pending spawn, never re-rolls; exact 60% / ambiguous range 40% always containing the actual value ("1/2", "3", up to 3 consecutive values); shown in both lanes; informational only; never alters the spawn; feel effects never fire on the preview card or score (chrome).
UX-DR9: Lane Select = main menu, functional/vivo (D-011): Jogar is a one-tap shortcut into a game on the last/default lane; lane cards (Clean "Pura" / Iniciante "Com ajuda") with one tone line each, default highlighted with accent bar; footer warns "changing lane starts a new game" when a match exists (D-008).
UX-DR10: Tone screen (D-009): ~2s, first launch only, tap to skip; dark slate, one large incandescent tile lighting up, copy "controle sobre o caos"; auto-advance pauses while a screen-reader announcement is in flight / VoiceOver active.
UX-DR11: Pause is pure (D-012): Resume / Restart / Quit only; settings live in the main menu; pause is a state, not a router; a pause tap mid-animation lets the in-flight swipe settle, then freezes — the board under the scrim is the post-animation snapshot.
UX-DR12: Game-over overlay (D-010): soft fade, last move visible, stats immediately (score, best, max tile, merges, longest streak); single primary "Jogar de novo" (1-tap restart, same lane); Iniciante adds a discreet death-continue offer (once per game over, rewarded ad or IAP); new record = number highlighted in accent, not a celebration (D-013).
UX-DR13: Leaderboard (D-014/D-005): per-lane top-10 local, two tabs — "Melhores" (best-ever with timestamps) and "Recentes" (last 10 with timestamps); surfaced in menu and game-over overlay; global leaderboard = v2; leaderboard tab ≥44×44 hit area, active tab accent fill with dark-ink label (≈8.6:1); empty state "Sem registros ainda".
UX-DR14: Reward prompt at the moment of pain (Iniciante only): undo (1/game rewarded ad, S4.1) and death-continue (1 use, S4.2); rewarded ad first, IAP as alternative, Cancel always available; ad fail/cancel → revert to primary CTA, nothing lost, no blocking error; ads only between games (FR-19).
UX-DR15: Iniciante learning aids: ceiling indicator + stuck warning as contextual, dismissible prompt-banner (surface-raised strip, accent edge, muted copy), appear only when relevant; never in Clean.
UX-DR16: Feel data model: `FeelPreset` per tier band (haptic light/medium/heavy via expo-haptics; shakeMs 2/5 capped 8; particleBurst; overshootMs; flash); `presetFor(value)` pure and tested; Reduced Motion is a preset, not a flag — gates the whole feel layer (shake, bullet time, flash/particles, overshoot scale, 1536+ glow, game-over soft fade) while keeping haptics and sound (S8.5, FR-30).
UX-DR17: Theme tokens as pure data: dark (canonical), light, color-blind palettes, all free; 13 tile tiers with assigned hexes and per-tier ink (dark/light) holding ≥4.5:1 numerals; weakest pair 384 deep emerald (≈4.7:1) flagged; merges communicated by shape/text beyond color (E9).
UX-DR18: Typography tokens: display 34/700, title 22/700, body 17/500, caption 13/500, tile 32/800, tile-4digit 13/700, tile-6digit 9/700, score-landscape 22/700, caption-landscape 11/500; tile numerals fixed (deliberate Dynamic Type exception, Skia-rendered) and must stay legible at the largest accessibility text setting and smallest landscape tile (min ~44pt); dynamic type honored for labels/copy.
UX-DR19: Tile rendering: chamfered lapidary facets (faceted octagon, ~10pt radius) with bright top-left / dark bottom-right bevel, subtle grain; shape carries value beyond color (facet geometry/grain vary by tier band); `1536`/`3072+` add the incandescent glow (the only glow in the system); ink per tier.
UX-DR20: Spacing/layout: 4px base grid; board gap 8pt; safe-margin 16pt; touch-target 44pt floor; menus center a single column max ~420pt wide; tile size derives from container.
UX-DR21: Voice and tone: calm, precise, low-temper "controle sobre o caos"; microcopy informs, then gets out of the way; no encouragement system, no "Amazing!"; per-lane tone — Clean silent/trustful, Iniciante plain-spoken help at the moment of need.
UX-DR22: i18n PT/EN v1 (i18next): lane names ("Iniciante"/"Beginner", "Pura"/"Clean"), tutorial copy, HUD, chrome labels all from the catalog; no inline UI strings.
UX-DR23: Noop swipe = silent control flow: no spawn, no score, no turn consumed; the board simply doesn't move; no punish animation.
UX-DR24: Dynamic type honored for HUD labels and menu copy — largest accessibility text setting must render without truncation.
UX-DR25: Death treatment (S6.4): elegant "fall" — soft fade over the frozen board, stats drift in quietly, no abrupt cutoff, no forced wait; death receives the same care as the big merge.
UX-DR26: Tutorial (S5.1): 3 guided moves, skippable, teaching the counterintuitive rule first (`1+2` merge) then the one-cell movement; skip mid-move → tutorial releases the board immediately, standard run begins; first merge target ~20s.
UX-DR27: Feel effects fire on the board only; the preview card and score are chrome and never animate with feel effects.
UX-DR28: Bullet time (S8.4): only a *new* session-best merge triggers it (~200ms slow with flash); `sessionBestMerge` lives in the snapshot so undo rewinds it with the board.
UX-DR29: Sound + haptics coupled, scaling with tile value (S8.6); MVP = minimal SFX only (merge, spawn, game-over), cálido/orgânico "thock" timbre, no music.
UX-DR30: Settings (main menu): theme, reduced motion, language, lane default — apply immediately and persist; no settings inside pause.

### FR Coverage Map

FR1: Epic 1 - Engine portado para TS (9 tiles, merge, spawn, score, game-over; fonte única de verdade)
FR2: Epic 1 - 26 testes unitários passando contra o engine TS portado
FR3: Epic 1 - Board 4×4 em Skia com animações dirigidas pelo trace; portrait + landscape
FR4: Epic 1 - Instalável da App Store, offline, persiste best score e settings
FR5: Epic 1 - Spike técnico primeiro (port game.js + render board em Skia)
FR6: Epic 2 - Pesos 1/2 fixos 40/40 em todos os tetos
FR7: Epic 2 - Pot 20% para ≥3 por tier de teto (48/96/192/...)
FR8: Epic 2 - Curva halving-decay normalizada por tier (pot soma 20%)
FR9: Epic 2 - Curva de peso configurável (um número por valor de tile)
FR10: Epic 2 - Adaptive Spawn respeita merge-once e effective-move spawn
FR11: Epic 3 - Escolha de pista por partida; última lembrada; trocar inicia nova partida
FR12: Epic 3 - Clean lane: sem undo/hint/ads/death-continue
FR13: Epic 3 - Accelerated lane: undo (1 free ad / 3 IAP), hint (IAP), death-continue (ad/IAP)
FR14: Epic 3 - Score de cada pista só para seu leaderboard; pistas nunca misturam
FR15: Epic 3 - Ads só entre partidas na Accelerated lane, nunca durante o jogo
FR16: Epic 4 - Rewarded ad concede exatamente 1 undo por partida (Accelerated)
FR17: Epic 4 - IAP Undo 3-pack; No Ads + Unlimited Undo remove prompts e concede undos ilimitados
FR18: Epic 4 - Death-continue 1 vez por game over (ad/IAP); nunca na Clean
FR19: Epic 4 - Sem ads forçados/intersticiais durante gameplay em nenhuma pista
FR20: Epic 4 - Declarações IAP/ads na submissão da App Store
FR21: Epic 5 - Tutorial skippable, 3 moves guiados (1+2 primeiro, depois one-cell)
FR22: Epic 5 - Veteranos pulam o tutorial e jogam imediatamente
FR23: Epic 5 - Accelerated: ajuda contextual 1ª sessão; Clean: tutorial mínimo
FR24: Epic 5 - Tone screen ~2s no primeiro launch, skippable
FR25: Epic 6 - Overlay de game over imediato: score, best, max tile, merges, longest streak
FR26: Epic 6 - Restart 1-tap para nova partida (mesma pista)
FR27: Epic 6 - Soft fade; último movimento visível; sem espera forçada
FR28: Epic 9 - Tap targets ≥44×44pt em todos os elementos tocáveis
FR29: Epic 9 - Screen readers anunciam valor+posição do tile, score, game over
FR30: Epic 9 - Reduced Motion desativa/suaviza shake e bullet time, mantendo haptics e som
FR31: Epic 9 - Valor do tile por shape/texto além de cor; WCAG AA em todos os temas
FR32: Epic 9 - Temas light, dark e color-blind gratuitos
FR33: Epic 10 - Crash reporting via Firebase Crashlytics; crash-free sessions
FR34: Epic 10 - Eventos do funil de retenção (first merge, first game over, lane choice, first-session)
FR35: Epic 10 - Eventos do funil de receita (ad impressions/completions, IAP, continue/undo)
FR36: Epic 10 - GDPR consent mode; ATT prompt no iOS se atribuição de ad for usada
FR37: Epic 10 - Privacy policy URL pública antes do review da App Store (bloqueante)
FR38: Epic 11 - Ícone/screenshots com identidade Mineral Quente, nunca como Threes
FR39: Epic 11 - Metadata completa e precisa na submissão (descrição, keywords, age rating, declarações)
FR40: Epic 11 - Nome "Tríade: Merge Puzzle" confirmado disponível no App Store Connect
FR41: Epic 7 - HUD mostra próximo spawn antes de cada move, mesma distribuição
FR42: Epic 7 - Preview: exato 60% / faixa ambígua 40% (display roll separado)
FR43: Epic 7 - Faixa ambígua sempre contém o valor real (1/2, 3, até 3 valores consecutivos)
FR44: Epic 7 - Preview nunca altera a distribuição ou o tile spawnado
FR45: Epic 7 - Preview nas duas pistas
(Epic 8 - Core Feel Feedback cobre a feel suite S8.1-S8.6, UX-DR16/27/28/29: haptics escalados, visual punch, shake direcional, bullet time, Reduced Motion aware, som+haptics acoplados)

## Epic List

### Epic 1: Jogo Jogável no iOS — Migração RN + Skia
Jogadores instalam e jogam Tríade completo no iOS com as mesmas regras do PWA provado: board Skia 4×4, animações por trace, offline/instalável, portrait e landscape.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 2: Adaptive Spawn — O Jogo Cresce com o Jogador
Jogadores sentem a mecânica assinatura: o pot de tiles ≥3 abre conforme o teto do board sobe, com 1/2 fixos em 40/40 e curva configurável.
**FRs covered:** FR6, FR7, FR8, FR9, FR10

### Epic 3: Duas Pistas — Integridade de Score como Feature
Jogadores escolhem entre Clean (pura) e Accelerated/Iniciante (com ajuda), com leaderboards por pista que nunca misturam.
**FRs covered:** FR11, FR12, FR13, FR14, FR15

### Epic 4: Funil de Monetização — Ganhar Sem Corromper
Jogadores recuperam erros (undo) e mortes (continue) via rewarded ads e removem atrito via IAP na pista Iniciante, sem ads durante o jogo.
**FRs covered:** FR16, FR17, FR18, FR19, FR20

### Epic 5: Tutorial & Onboarding
Novos jogadores aprendem a regra contra-intuitiva (1+2) jogando, com primeiro merge em ~20s, e veteranos pulam direto para o jogo.
**FRs covered:** FR21, FR22, FR23, FR24

### Epic 6: Failure Suite — Game Over como Informação
Jogadores veem stats completos imediatamente e reiniciam com 1 tap após uma morte elegante em soft fade.
**FRs covered:** FR25, FR26, FR27

### Epic 7: Next Piece Preview — Planeje o Board
Jogadores planejam a leitura vendo o próximo spawn (exato 60% ou faixa ambígua 40%) nas duas pistas, sem nunca alterar o spawn.
**FRs covered:** FR41, FR42, FR43, FR44, FR45

### Epic 8: Core Feel Feedback — O Merge como Momento
Jogadores sentem o grande merge via haptics escalados, punch visual, shake direcional e bullet time (Reduced Motion aware), com som e haptics acoplados.
**FRs covered:** S8.1-S8.6 (feel suite; UX-DR16/27/28/29)

### Epic 9: Acessibilidade — Jogável por Todos
Todos os jogadores, incluindo usuários de VoiceOver e de temas de contraste, jogam integralmente com 44pt, WCAG AA e três temas gratuitos.
**FRs covered:** FR28, FR29, FR30, FR31, FR32

### Epic 10: Telemetria & Observabilidade
O autor mede funis de retenção e receita, crash-free sessions, e cumpre GDPR/ATT com privacy policy pública antes do review.
**FRs covered:** FR33, FR34, FR35, FR36, FR37

### Epic 11: Publicação na App Store
O jogo shipa na App Store com identidade Mineral Quente, metadata completa e nome confirmado.
**FRs covered:** FR38, FR39, FR40

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Jogo Jogável no iOS — Migração RN + Skia

Jogadores instalam e jogam Tríade completo no iOS com as mesmas regras do PWA provado: board Skia 4×4, animações por trace, offline/instalável, portrait e landscape.

### Story 1.1: Technical spike — engine TS + board Skia + benchmark CI

As a game developer,
I want to de-risk the RN + Skia migration before committing to the full UI rewrite,
So that I know the engine ports cleanly, one board renders at 60fps, and the CI benchmark gate exists.

**Acceptance Criteria:**

**Given** a new Expo SDK 57 (blank-typescript) development build project with the Pinned Version Matrix installed,
**When** I port `js/game.js` to TypeScript in `src/engine/core` and render one 4×4 board in Skia,
**Then** the 26 existing unit tests pass unchanged against the ported engine (`node --test`).
**And** the ported engine is a pure TS module with no RN/React/Skia imports (ADR-01 boundary).
**And** the CI benchmark ships in the same PR: engine cost per turn < 2ms and frame-logic worst case < 8ms, deterministic on Node.
**And** one Skia board renders on a physical iOS device with a real frame rate recorded (baseline for the device-level p99 < 16.7ms job).
**And** the spike result is recorded in the architecture document before the full UI rewrite is greenlit (FR-5).

### Story 1.2: Port completo do engine de regras para TypeScript

As a player,
I want the exact rules I know from the web PWA to run in the iOS app,
So that my skill transfers and the game behaves identically on every surface.

**Acceptance Criteria:**

**Given** the TypeScript engine from the spike,
**When** all rules are ported from `js/game.js` with identical behavior,
**Then** a fresh board opens with exactly 9 starting tiles.
**And** merges follow the predicate `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)` with value `a <= 2 ? 3 : a*2`; `1+1` and `2+2` never merge.
**And** each tile moves at most one cell per swipe and merge-once locks freshly merged tiles (`[3,3,3,3] → [6,3,3,_]`, `[1,2,3,_] → [3,3,_,_]`).
**And** spawn happens only after an effective move (`boardsEqual` noop spawns nothing, scores nothing, consumes no turn); weights 40/40/20 for 1/2/3.
**And** `move()` returns `{ board, score, moved, trace }` preserving the exact per-tile trace contract, and `isGameOver` reuses the same merge predicate.
**And** score increments by the merged tile's value, and best score persists.
**And** all 26 existing unit tests pass against the ported engine (`node --test`), covering the full I/O matrix (FR-1, FR-2).

### Story 1.3: Board Skia declarativo dirigido pelo trace

As a player,
I want smooth slide/merge/spawn animations that always match the engine's result,
So that the board feels responsive and never shows a state the engine didn't produce.

**Acceptance Criteria:**

**Given** the pure engine emitting typed events and a per-tile trace,
**When** the Skia render layer consumes the trace,
**Then** the board renders 100% from the trace with no heuristic matching in the UI.
**And** slide tiles animate from their `from` cells to their `to` cells; merged tiles vanish after the merge; spawned tiles appear at `spawned` cells.
**And** tile overshoot-and-snap follows the trace (declarative, `src/render`); flash/particles/shake/slow-mo are imperative worklets in `src/feel` (hybrid boundary).
**And** no DOM/DOM-equivalent leak: every tile rendered from the trace maps to an Skia object, and orphaned elements are removed (mirrors the `tileEls` no-leak rule).
**And** rendering stays at 60 FPS sustained during a 10-minute play session on target iOS devices (NFR-1).
**And** UI never duplicates rules: no merge/spawn/game-over logic outside `src/engine` (FR-3, NFR-4).

### Story 1.4: Offline capability, instalável e persistência

As a player,
I want the app to install from the App Store, run fully offline, and remember my best score and settings,
So that I can play anywhere and never lose my progress.

**Acceptance Criteria:**

**Given** the Expo development build,
**When** the app is installed on a physical iOS device,
**Then** it launches instantly with no loading screens and plays the full game with no network connection (NFR-2, NFR-3).
**And** best score and player settings persist across launches via app storage (AsyncStorage/MMKV decision from the spike benchmark).
**And** entitlements (IAP) mirror to SecureStore and are authoritative offline (ADR-02).
**And** per-match budgets (free undo/continue/hint counts) live in memory only and die with the match.
**And** all assets (13 tile tiers, board, icon, 3 SFX) are bundled and preloaded — no CDN, self-contained offline (NFR-6).

### Story 1.5: Layout portrait e landscape

As a player,
I want a playable board in both orientations,
So that I can play one-handed in portrait or on a landscape screen without losing the HUD.

**Acceptance Criteria:**

**Given** the app running on iOS in portrait,
**When** the HUD renders,
**Then** score is center-top (34pt display), best below small (lane-scoped, muted), preview card bottom corner, pause top-right — nothing else (UX-DR-7).
**And** when rotated to landscape, the HUD collapses to a thin top edge band: score+best left, preview right, pause top-right (opposite the preview), at 22pt/11pt (UX-DR-5).
**And** pause is top-right in both orientations, outside the board swipe rect, ≥44×44, inside safe margins (UX-DR-6).
**And** safe areas come from `react-native-safe-area-context` with a 16pt safe margin on top of per-edge insets in both orientations (UX-DR-4, UX-DR-20).
**And** the board maximizes in the space left; tiles scale with the container in both orientations (tile size derives from the container, never hand-set) (UX-DR-20).
**And** in landscape the HUD collapses to the thin top edge band and the board dominates the space below it (D-006).

### Story 1.7: Legibilidade dos numerais em landscape

As a player,
I want tile numerals to stay legible when the board shrinks in landscape,
So that I can always read every tile value.

**Acceptance Criteria:**

**Given** the landscape layout with a minimized board,
**When** the board width drops below the tile threshold,
**Then** tiles have a min ~44pt width; below that the layout re-runs the numeral/ink legibility check (UX-DR-18).
**And** the 13pt (4-digit) and 9pt (6-digit) tile numerals are only used at tile widths that fit them — otherwise the ink-contrast check re-runs (UX-DR-18, review-hud-input).
**And** the 9pt 6-digit tier (`1536`/`3072+`) is the explicit risk point and stays legible at the smallest landscape tile (review-hud-input).
**And** fixed tile numerals remain legible at the largest accessibility text setting (deliberate Dynamic Type exception) (UX-DR-18).

### Story 1.6: Input por swipe RNGH + edge-cases contract

As a player,
I want reliable swipe input that never loses a move,
So that my swipes always resolve predictably, even under interruptions.

**Acceptance Criteria:**

**Given** the game board active,
**When** the player swipes,
**Then** the move resolves via RNGH `Gesture.Pan()` with a ~20px activation threshold, and direction maps to the engine `move()` (UX-DR-3).
**And** a cancelled gesture / system interruption causes no move, no spawn, no turn consumed — the board stays as it was.
**And** releasing off the board mid-gesture resolves the swipe as captured (the gesture owns the move).
**And** a concurrent second finger is ignored (first finger wins); no second `move()` while a swipe or its animation is in flight.
**And** a swipe during an in-flight animation is queued/rejected per the engine `ok | rejected` contract — never a mid-animation board mutation.
**And** the pause button is always reachable during a match (top-right), letting the in-flight swipe settle before freezing (UX-DR-11).

<!-- End story repeat -->

## Epic 2: Adaptive Spawn — O Jogo Cresce com o Jogador

Jogadores sentem a mecânica assinatura: o pot de tiles ≥3 abre conforme o teto do board sobe, com 1/2 fixos em 40/40 e curva configurável.

### Story 2.1: Detecção de teto de spawn (spawn ceiling)

As a player,
I want the game to open bigger pieces as my largest tile grows,
So that the late game grows with my mastery instead of grinding small tiles.

**Acceptance Criteria:**

**Given** a board state,
**When** the spawn ceiling is computed,
**Then** the ceiling is the largest tile value currently on the board.
**And** the ceiling maps to a tier via a pure `ceilingDetector` function (N1), returning the correct pot tier for `<48`, `≥48`, `≥96`, `≥192`, `≥384`, `≥768`, and doubling thereafter.
**And** the ceiling is derived from the board in the immutable snapshot, so undo rewinds it with the board (ADR-06).
**And** an empty-board edge case returns the `<48` tier (pot = 100% `3`).

### Story 2.2: Pesos fixos 1/2 em 40/40

As a player,
I want `1` and `2` tiles to keep spawning at the same rate even at high ceilings,
So that the board keeps asking for attention and late-game tension is preserved.

**Acceptance Criteria:**

**Given** any spawn ceiling tier,
**When** a spawn is resolved,
**Then** the weights for `1` and `2` remain fixed at 40%/40% at all times, regardless of ceiling (FR-6).
**And** the fixed weights never change as the pot opens new values.
**And** the combined distribution always sums to 1.0 (1=0.4, 2=0.4, pot=0.2), verified by unit test with epsilon tolerance.

### Story 2.3: Pot tierizado por teto

As a player,
I want the 20% pot to offer bigger pieces as my ceiling crosses each tier,
So that the run stays ambitious and the big merge arrives sooner.

**Acceptance Criteria:**

**Given** the ceiling tier,
**When** the pot is resolved,
**Then** 20% of spawn weight is a pot for pieces ≥3, opened per ceiling tier (FR-7).
**And** `<48` → only `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; tiers double thereafter.
**And** the `potResolver` is a pure function keyed by the validated `spawnConfig` — never scattered literals (boundary rule 4).
**And** the pot always sums to 20% of total spawn weight, verified with epsilon tolerance.

### Story 2.4: Curva halving-decay normalizada

As a player,
I want higher pot values to be rarer than lower ones,
So that bigger tiles stay special and the run keeps its pace.

**Acceptance Criteria:**

**Given** a pot of values for a tier,
**When** weights are assigned within the pot,
**Then** each value weighs half the next-lower one: `3=1`, `6=1/2`, `12=1/4`, `24=1/8`, `48=1/16`, `96=1/32` (FR-8).
**And** the pot weights are normalized per tier so the pot always sums to 20% of total spawn weight.
**And** the weights are monotonic — higher value never weighs more than a lower one.
**And** the combined distribution (fixed 40/40 + normalized pot) is picked by a `weightedPicker` that always re-normalizes and never trusts its input to sum exactly (N1 float rule).
**And** the halving-decay curve is validated by unit tests against the full I/O matrix (FR-8).

### Story 2.5: spawnConfig configurável

As a developer,
I want the pot weight curve driven by a single configurable parameter set,
So that the curve can be tuned and playtest-calibrated without code changes.

**Acceptance Criteria:**

**Given** the `spawnConfig` module,
**When** the curve is defined,
**Then** weights are driven by one parameter per tile value (e.g., `{3: 1.0, 6: 0.5, 12: 0.25, ...}`) exposed in a config (FR-9).
**And** the config is data, not code, validated by engine tests (pot sums to 20%, epsilon tolerance).
**And** changing a weight value requires no code change and no rebuild beyond the config.
**And** the initial values are the halving decay (documented in the config and the architecture ADR/decision log).
**And** the config is the single access point — no scattered weight literals anywhere in `src/engine` (data pattern).

### Story 2.6: Integração com o engine — merge-once e effective-move

As a player,
I want Adaptive Spawn to respect the rules I already know,
So that the new mechanic never breaks the game's core behavior.

**Acceptance Criteria:**

**Given** the ported engine,
**When** Adaptive Spawn is integrated,
**Then** a new tile spawns only after an effective move (a swipe that changes the board); a noop spawns nothing, scores nothing, and consumes no turn (FR-10).
**And** spawn position is a uniformly random empty cell.
**And** merge-once and one-cell movement rules are unchanged by Adaptive Spawn.
**And** the RNG is injected via the `rng` parameter (never `Math.random`), keeping the deterministic test suite green.
**And** `move()` still returns `{ board, score, moved, trace }` and the trace is assertable, including the spawned tile.
**And** the spawn resolver is structured so the pre-resolved `pendingSpawn` (real value + display roll) lives in the immutable snapshot from day one — the exact shape the architecture's Ambiguous Preview pattern (N3) consumes — so the preview lands without refactoring the resolver (N3, ADR-06).
**And** `pendingSpawn` is resolved on every effective move from the same Adaptive Spawn distribution (fixed 40/40 + pot), and rewound by undo with the board.

<!-- End story repeat -->

## Epic 3: Duas Pistas — Integridade de Score como Feature

Jogadores escolhem entre Clean (pura) e Accelerated/Iniciante (com ajuda), com leaderboards por pista que nunca misturam.

### Story 3.1: Seleção de pista no menu (Lane Select)

As a player,
I want to choose my lane at game start and have my last choice remembered,
So that I can pick between a pure challenge and a guided one without re-choosing every game.

**Acceptance Criteria:**

**Given** the main menu (Lane Select) as the functional home surface,
**When** I open the app,
**Then** I see two lane cards side by side — Clean ("Pura") and Accelerated ("Iniciante"/"Com ajuda") — each with one tone line, the default lane highlighted with the accent bar (UX-DR-9).
**And** a "Jogar" button is a one-tap shortcut straight into a game on the last/default lane, present even when a lane card is highlighted (D-011).
**And** tapping a lane card with an existing match on the other lane triggers the "changing lane starts a new game" warning with confirm (FR-11, D-008).
**And** the last chosen lane is remembered and becomes the default for the next game; changing lane starts a new game (FR-11).
**And** the last lane is persisted across launches (lane memory in storage).

### Story 3.2: Clean lane pura

As an Achiever,
I want a clean board with no assistance and no offers,
So that my score is a pure measure of skill.

**Acceptance Criteria:**

**Given** a match started on the Clean lane,
**When** I play,
**Then** no undo, no hint, no ads, and no death-continue offer are ever available (FR-12).
**And** the board stays clean — no spawn-ceiling indicator and no stuck warning appear (P1, D-007).
**And** no reward prompt or ad appears at any point during or between Clean matches.
**And** the HUD shows only score, best (lane-scoped), preview card, and pause (UX-DR-7).
**And** nothing in the Clean lane ever routes to monetization — by profile contract, not by restraint (ADR-03).

### Story 3.3: Accelerated lane com assistência

As a Beginner,
I want help available exactly when I need it,
So that I can recover from mistakes and keep learning without shame.

**Acceptance Criteria:**

**Given** a match started on the Accelerated lane,
**When** I encounter friction (bad move or death),
**Then** undo is available: 1 free per game via rewarded ad, or 3 via IAP (FR-13).
**And** hint is available via IAP (5-pack); a hint highlights one valid mergeable pair on the board and never suggests a direction or reveals spawn.
**And** death-continue is offered once per game over (rewarded ad 1 use or IAP) (FR-13).
**And** the ceiling indicator and stuck warning appear contextually as dismissible prompt-banners, only when relevant (UX-DR-15).
**And** reward prompts appear at the moment of need with rewarded ad first, IAP as alternative, Cancel always available (UX-DR-14).
**And** ads appear only between games, never during play (FR-15).

### Story 3.4: Leaderboards por pista

As a player,
I want my scores ranked only against the same lane,
So that paid or assisted help never corrupts the purity of a Clean score.

**Acceptance Criteria:**

**Given** the leaderboard surface,
**When** a match ends,
**Then** the score goes only to the lane's own leaderboard (Clean / Assisted); lanes never mix (FR-14).
**And** the leaderboard is a per-lane local top-10 with two tabs — "Melhores" (best-ever with timestamps) and "Recentes" (last 10 with timestamps) (UX-DR-13, D-014).
**And** the HUD "best" readout is the active lane's best, never a merged/global figure (P3).
**And** the leaderboard tab has a ≥44×44 hit area; active tab uses accent fill with dark-ink label (≈8.6:1) (UX-DR-13).
**And** the empty state reads "Sem registros ainda"; the first run's score seeds it (UX-DR-13).
**And** leaderboard is surfaced in both the main menu and the game-over overlay (D-005).

### Story 3.5: Contrato Lane Wall no orquestrador

As a developer,
I want lane rules enforced by contract, not by trust,
So that score integrity holds even as features are added.

**Acceptance Criteria:**

**Given** the `MatchOrchestrator` in `src/game`,
**When** a player interacts (undo, hint, continue, ad offer),
**Then** the orchestrator gates each interaction per the active `LaneProfile` (N2).
**And** Clean has no code path for undo/hint/continue/ad — a `LaneProfile` with `{ id: 'clean', undo: false, leaderboard: 'clean' }`.
**And** Accelerated exposes atomic contracts — `canUndo`, `undo(): ok | rejected` — and the engine stays monetization-agnostic (ADR-02, ADR-03).
**And** the lane is exposed to the app layer (services/monetization) — never to the engine; the engine sees only the atomic contract (N2 boundary).
**And** per-match budgets (free undo, continue, hint counts) live in memory and die with the match (ADR-02).
**And** changing lane always starts a new game; leaderboards never mix regardless of state (FR-11, FR-14).

<!-- End story repeat -->

## Epic 4: Funil de Monetização — Ganhar Sem Corromper

Jogadores recuperam erros (undo) e mortes (continue) via rewarded ads e removem atrito via IAP na pista Iniciante, sem ads durante o jogo.

### Story 4.1: Rewarded ad — undo (1 free per game)

As a Beginner player,
I want to watch a rewarded ad to undo my last move once per game,
So that I can recover from a mistake at the moment of pain without paying.

**Acceptance Criteria:**

**Given** an Accelerated-lane match with a free undo remaining,
**When** I mis-swipe and choose to undo,
**Then** a discrete reward prompt appears at the moment of need — rewarded ad first, IAP as alternative, Cancel always available (UX-DR-14).
**And** watching the rewarded ad grants exactly one undo per game — no more than 1 free undo per game via ads (FR-16).
**And** the board rewinds exactly (true rewind, ADR-06) and the free undo of the game is consumed.
**And** after consuming the free undo, further undo attempts route to IAP or are blocked — never a second free ad-undo in the same game (FR-16).
**And** the ad plays between games, never during play; nothing is lost if the ad fails or is cancelled (FR-19, UX-DR-14).
**And** no reward prompt or ad appears in the Clean lane (FR-12).

### Story 4.2: Rewarded ad — death-continue (1 use per game over)

As a Beginner player,
I want to continue after death by watching a rewarded ad once,
So that a near-perfect run isn't wasted on one mistake.

**Acceptance Criteria:**

**Given** a game over in the Accelerated lane,
**When** I choose to continue,
**Then** a discreet Continue offer appears beneath the primary "Jogar de novo" (rewarded ad, 1 use per game over) (D-010).
**And** watching the rewarded ad rewinds the board to the pre-death state (true rewind, ADR-06).
**And** a second death offers no Continue — the once-per-game-over budget is spent; "Jogar de novo" stands alone (FR-18).
**And** the ad fails or is cancelled → Continue reverts to the primary CTA; nothing is lost, no blocking error state (UX-DR-14).
**And** no continue offer appears in the Clean lane (FR-18).
**And** ads are player-initiated and appear only between games, never during play (FR-19).

### Story 4.3: IAP Hint 5-pack

As a Beginner player,
I want to buy a hint pack,
So that I can see a valid merge when I'm stuck.

**Acceptance Criteria:**

**Given** an Accelerated-lane match,
**When** I purchase the Hint 5-pack (US$0.99/R$4.90),
**Then** I receive 5 hints usable in the Accelerated lane (FR-13).
**And** a hint highlights one valid mergeable pair on the board and never suggests a direction or reveals spawn (FR-13).
**And** the hint is consumed on use; per-match hint count is tracked in memory and dies with the match.
**And** the purchase is recorded as an entitlement (SecureStore mirror) and survives app reinstall via RevenueCat restore (ADR-02).
**And** the hint IAP never changes spawn, merge, or score rules (P3).

### Story 4.4: IAP Undo 3-pack + No Ads + Unlimited Undo

As a converting player,
I want to buy undos or remove ads entirely,
So that friction disappears without breaking my run.

**Acceptance Criteria:**

**Given** an Accelerated-lane match,
**When** I purchase an IAP,
**Then** the Undo 3-pack (US$0.99/R$4.90) grants 3 undos usable in the Accelerated lane (FR-17).
**And** the "No Ads + Unlimited Undo" IAP (US$2.99/R$14.90, one-time) grants unlimited undos and removes all rewarded-ad prompts (FR-17).
**And** owning "No Ads + Unlimited Undo" suppresses the undo and continue ad prompts entirely (FR-17).
**And** unlimited-undo owners never see an ad, but other rewarded ads (if any) still only appear between games, player-initiated (FR-19).
**And** both IAPs are recorded as entitlements and survive restore; per-match undo consumption is still enforced (ADR-02).
**And** nothing purchasable alters spawn, merge, or score rules in either lane (P3).

### Story 4.5: Entitlements + restore com precedência offline

As a paying player,
I want my purchases to survive reinstall and offline play,
So that I never lose what I paid for.

**Acceptance Criteria:**

**Given** RevenueCat (`react-native-purchases`) + SecureStore,
**When** I purchase or restore an entitlement,
**Then** the SecureStore mirror is authoritative offline (ADR-02).
**And** when the network returns, RevenueCat reconciles and never downgrades a held entitlement (ADR-02).
**And** restore recovers the Hint pack, Undo pack, and No Ads + Unlimited Undo entitlements on a fresh install.
**And** per-match budgets (free undo, continue, hint counts) are NOT restored — they die with the match (ADR-02).
**And** entitlement state never blocks or alters gameplay; monetization lives in the app layer, never the engine (ADR-02).

### Story 4.6: Declarações App Store + ads player-initiated only

As a developer,
I want IAP and ad placements declared correctly,
So that the app passes App Store certification.

**Acceptance Criteria:**

**Given** the monetization implementation,
**When** preparing the App Store submission,
**Then** all purchases (Hint 5-pack, Undo 3-pack, No Ads + Unlimited Undo) and ad placements are declared in App Store Connect (IAP/ads declarations) (FR-20).
**And** no forced or interstitial ads appear during gameplay in any lane — ads are always player-initiated rewards between games (FR-19).
**And** the privacy policy URL covers ad and IAP data use and is live before review (FR-37, blocking).
**And** GDPR consent mode (UMP) and the ATT prompt are configured for ad attribution (FR-36).
**And** nothing in the monetization path can alter spawn, merge, or score rules in either lane (P3, counter-metric).

<!-- End story repeat -->

## Epic 5: Tutorial & Onboarding

Novos jogadores aprendem a regra contra-intuitiva (1+2) jogando, com primeiro merge em ~20s, e veteranos pulam direto para o jogo.

### Story 5.1: Tutorial de 3 moves guiados

As a new player,
I want a short guided tutorial that teaches the counterintuitive rule first,
So that I make my first merge within ~20 seconds by playing, not reading.

**Acceptance Criteria:**

**Given** a first game on a lane with no tutorial completed,
**When** I start playing,
**Then** a skippable tutorial teaches, in 3 guided moves: the `1+2` merge rule first, then the one-cell movement rule (FR-21).
**And** the tutorial is learn-by-playing — no text wall; the climax is me swiping a `1` and `2` together and seeing the `3` merge with a light haptic (UX-DR-26).
**And** the first merge happens within ~20 seconds of the first session (north-star retention funnel).
**And** skipping the tutorial (including mid-move) releases the board immediately and the standard run begins — no gating (UX-DR-26, FR-22).
**And** the tutorial is shown per-lane (first game per lane), skippable by genre veterans (FR-22).
**And** a NOOP swipe during the tutorial is silent control flow — no spawn, no score, no turn consumed (UX-DR-23).

### Story 5.2: Tone screen de identidade

As a new player,
I want a brief identity moment on first launch,
So that I absorb the game's brand promise ("controle sobre o caos") before playing.

**Acceptance Criteria:**

**Given** a first launch of the app,
**When** the app opens,
**Then** a ~2-second tone screen shows: dark slate, one large incandescent tile lighting up, and the single line "controle sobre o caos" (PT) / "control over chaos" (EN) (UX-DR-10, FR-24).
**And** the tone screen is skippable by tap — no other tap target exists (UX-DR-10).
**And** the ~2s auto-advance pauses while a screen-reader announcement is in flight or while VoiceOver is active (UX-DR-10, accessibility).
**And** returning launches skip the tone screen entirely (first launch only) (FR-24).
**And** the tone screen is a non-informational title beat — exempt from the no-time-pressure rule (UX-DR-10).

### Story 5.3: Ajuda contextual por pista na primeira sessão

As a player,
I want onboarding that matches my lane,
So that Beginners get help exactly when needed and Clean players get nothing but the game.

**Acceptance Criteria:**

**Given** the first session,
**When** I play,
**Then** the Accelerated lane shows contextual first-session help (ceiling indicator and stuck warning only when relevant) (FR-23).
**And** the Clean lane shows the minimal tutorial only — no contextual aids, no warnings (FR-23, P1).
**And** the contextual help uses the plain-spoken Iniciante tone — factual, never scolding (UX-DR-21, D-007).
**And** the help aids are dismissible prompt-banners that appear only when relevant (UX-DR-15).
**And** the tutorial/contextual help never blocks play — always skippable and non-gating (FR-22).

### Story 5.4: i18n PT/EN para onboarding

As a player,
I want onboarding and lane copy in my language,
So that I understand the rules and identity without friction.

**Acceptance Criteria:**

**Given** the i18n layer (i18next + expo-localization),
**When** the device locale is PT or EN,
**Then** tutorial copy, tone-screen line, and lane names ("Iniciante"/"Beginner", "Pura"/"Clean") resolve from the i18n catalog (UX-DR-22, NFR-13).
**And** no inline UI strings exist — all copy uses `t('key')` (NFR-13, i18n pattern).
**And** the device locale is picked up by `expo-localization` with the pinned i18next/react-i18next versions.
**And** strings never leak into board logic (NFR-13, boundary).
**And** switching language in Settings applies immediately and persists (UX-DR-30).

<!-- End story repeat -->

## Epic 6: Failure Suite — Game Over como Informação

Jogadores veem stats completos imediatamente e reiniciam com 1 tap após uma morte elegante em soft fade.

### Story 6.1: Overlay de game over com stats imediatos

As a player,
I want my run's full stats the moment it ends,
So that I can understand what happened and what to chase next.

**Acceptance Criteria:**

**Given** a match that reaches game over (grid full and no adjacent mergeable pair),
**When** the game-over state fires,
**Then** the overlay shows immediately: score, best score, max tile, number of merges, and longest streak (FR-25, UX-DR-12).
**And** the stats appear without any forced wait — no timer gates the overlay (FR-27).
**And** the stats are lane-scoped where relevant (best = active lane's best) (P3).
**And** game over is a state, not an error — the engine emits a `MatchOver` event and the overlay renders from it (architecture, error handling).

### Story 6.2: Morte elegante em soft fade

As a player,
I want the game over to feel like a graceful ending,
So that a loss doesn't feel like an abrupt cutoff.

**Acceptance Criteria:**

**Given** a game over,
**When** the overlay appears,
**Then** the board soft-fades and the last move stays visible behind the stats (FR-27, D-010).
**And** the stats drift in quietly over the frozen board — no abrupt cutoff, no forced wait (UX-DR-25, S6.4).
**And** the death treatment receives the same care as the big merge — the "fall" is elegant, not abrupt (UX-DR-25).
**And** under Reduced Motion, the game-over soft fade is cut or smoothed while haptics and sound stay (UX-DR-16, FR-30).
**And** no celebration, confetti, or reward pacing appears on the overlay (D-013).

### Story 6.3: Restart 1-tap

As a player,
I want to start over with one tap,
So that the "one more" loop is frictionless.

**Acceptance Criteria:**

**Given** the game-over overlay,
**When** I tap "Jogar de novo",
**Then** a new match starts immediately on the same lane (FR-26, UJ-5).
**And** the restart resets the store and creates a new match — no navigation, zero loading screens (architecture, NFR-3).
**And** the restart is one tap from the overlay — no confirmation dialog.
**And** the new match starts with the 9-tile setup and the same lane rules as the finished match (FR-26).
**And** in the Accelerated lane, a discreet Continue offer sits beneath the primary Jogar de novo when a continue remains (D-010, FR-18); in Clean, no offer appears (FR-12).
**And** tapping "Jogar de novo" while a continue remains starts the new match immediately and the unused continue is forfeited — the once-per-game-over budget dies with the game-over state (ADR-02, per-match budgets).
**And** the forfeited continue is never carried into the next match and never re-offered.

### Story 6.4: Novo recorde como número destacado

As an Achiever,
I want my new record to be visible,
So that I feel the milestone without cheap celebration.

**Acceptance Criteria:**

**Given** a game over where the score exceeds the lane's best,
**When** the stats render,
**Then** the new-record figure is highlighted in the accent color — a number, not an event (D-013, UX-DR-12).
**And** no confetti, banner, or celebration animation fires for a new record in MVP (D-013, GDD).
**And** the record milestone is shown as a number even across the ceiling-tier ladder (no tier-crossing celebration in MVP).
**And** the record highlight respects both theme contrast (accent on surface-raised ≈ 6.2:1) and the color-blind theme's shape/text encoding (E9).

<!-- End story repeat -->

## Epic 7: Next Piece Preview — Planeje o Board

Jogadores planejam a leitura vendo o próximo spawn (exato 60% ou faixa ambígua 40%) nas duas pistas, sem nunca alterar o spawn.

### Story 7.1: pendingSpawn pre-resolvido no snapshot

As a player,
I want the game to know my next piece before I move,
So that I can plan the board in advance.

**Acceptance Criteria:**

**Given** the engine resolving a spawn on an effective move,
**When** the spawn is resolved,
**Then** the engine pre-resolves the *next* pendingSpawn and stores it in the immutable snapshot — real value plus display roll (N3).
**And** the pendingSpawn is drawn from the same distribution as the actual spawn (Adaptive Spawn curve when applicable) (FR-41).
**And** `pendingSpawn` lives in the snapshot so undo rewinds it with the board (ADR-06).
**And** the UI never rolls — it only reads `pendingSpawn`; the placed tile always equals the pre-resolved `pendingSpawn.value`.
**And** a NOOP move does not change the pendingSpawn (no new preview on a rejected move) (UX-DR-23).

### Story 7.2: Preview card no HUD (60/40) nas duas pistas

As a player,
I want to see my next piece in the HUD,
So that I can plan each swipe.

**Acceptance Criteria:**

**Given** an active match on either lane,
**When** the HUD renders,
**Then** the preview card shows the next spawn value, drawn from the same distribution as the actual spawn (FR-41).
**And** the preview shows the exact value in 60% of spawns and an ambiguous range in 40% of spawns (separate display roll) (FR-42).
**And** the preview card is shown in both Clean and Accelerated lanes — core strategy information, not a learning aid (FR-45, UX-DR-8).
**And** the preview card sits in the portrait bottom corner near the swipe finger and in the landscape top edge band (right side) (UX-DR-7, UX-DR-5).
**And** the card renders the value in accent ink at 20pt — a chip, not a tile (UX-DR-8).
**And** feel effects never fire on the preview card — it is chrome, not the board (UX-DR-8).

### Story 7.3: Faixa ambígua correta

As a player,
I want the ambiguous preview to always contain the truth,
So that I can trust the card even when it hides the exact value.

**Acceptance Criteria:**

**Given** a spawn where the display roll lands in the 40% ambiguous case,
**When** the preview renders,
**Then** the ambiguous range always contains the actual value (FR-43).
**And** for `1` or `2`, it shows "1/2" together (FR-43).
**And** for a pot value when only `3` is available, it shows "3" (FR-43).
**And** for pot values when more are available, it shows up to 3 consecutive values (e.g., "3/6" or "3/6/12"), with the spawned tile being any one of the displayed values (FR-43).
**And** the display window is a contiguous window of the tier sequence capped at 3 values (documented assumption, confirmed in UX).
**And** the actual spawn is unaffected by which display form was shown (FR-44).

### Story 7.4: Invariante — preview nunca altera o spawn

As a developer,
I want a hard guarantee that the preview is informational only,
So that strategy display can never corrupt the game's randomness.

**Acceptance Criteria:**

**Given** the preview renderer and the spawn resolver,
**When** any display decision is made (exact or ambiguous),
**Then** the 60/40 display decision never alters the materialized spawn — the placed tile always equals the pre-resolved `pendingSpawn.value` (N3 invariant).
**And** a unit test asserts the invariant across the full distribution (exact, ambiguous-`1/2`, ambiguous-`3`, ambiguous-range) (FR-44).
**And** undo rewinds the preview with the board (pendingSpawn in snapshot) (ADR-06).
**And** the preview never influences spawn position, spawn value, or spawn timing (FR-44).
**And** changing the display logic requires no change to the spawn resolver (N3 separation).

<!-- End story repeat -->

## Epic 8: Core Feel Feedback — O Merge como Momento

Jogadores sentem o grande merge via haptics escalados, punch visual, shake direcional e bullet time (Reduced Motion aware), com som e haptics acoplados.

### Story 8.1: Haptics escalados por valor de merge

As a player,
I want the device to tap with the weight of my merge,
So that a big merge feels physically earned.

**Acceptance Criteria:**

**Given** a merge resolves in the engine,
**When** the feel layer observes the `TilesMerged` event,
**Then** haptics fire via expo-haptics scaled by merge value: `3` light, `6` medium, `12+` heavy (S8.1, UX-DR-16).
**And** the haptic mapping comes from the `FeelPreset` for the merge value's tier band — data, not code (UX-DR-16).
**And** `presetFor(value)` is a pure, tested function; the mapping is covered by tests sweeping all presets.
**And** haptics stay enabled under Reduced Motion (FR-30).

### Story 8.2: Punch visual — overshoot, flash e partículas

As a player,
I want the merge to visibly pop,
So that the moment lands visually, not just numerically.

**Acceptance Criteria:**

**Given** a merge resolves,
**When** the render and feel layers react,
**Then** the merged tile overshoots its size and snaps back — driven declaratively from the trace in `src/render` (S8.2, hybrid boundary).
**And** a color flash + particle burst fire at the merge point, scaled by value (splash scales with value) as imperative worklets in `src/feel` (S8.2).
**And** feel effects fire on the board only — the preview card and score never animate with feel effects (UX-DR-27, chrome rule).
**And** the `1536`/`3072+` tiers add the incandescent glow (the only glow in the system) (S8.2, DESIGN).
**And** under Reduced Motion, flash/particles and the overshoot scale are cut or smoothed (UX-DR-16, FR-30).

### Story 8.3: Screen shake direcional

As a player,
I want the screen to shake in the swipe direction,
So that the move feels directional and alive.

**Acceptance Criteria:**

**Given** a merge resolves,
**When** the feel layer fires shake,
**Then** a directional screen shake plays: subtle on medium merges (~2ms), stronger on large (~5ms), capped at ~8ms (S8.3, UX-DR-16).
**And** the shake amplitude is minimized for accessibility and never exceeds the cap.
**And** the shake is driven by the `FeelPreset` `shakeMs` field — a tuning datum, not code (UX-DR-16).
**And** under Reduced Motion the shake is smoothed or disabled (FR-30, UX-DR-16).
**And** the shake is imperceptible or absent for a NOOP move (no feel on rejected moves) (UX-DR-23).

### Story 8.4: Bullet time no novo session-best merge

As a player,
I want the biggest merge of my run to slow time for a moment,
So that the golden moment feels earned and rare.

**Acceptance Criteria:**

**Given** a merge that sets a new session best,
**When** the merge resolves,
**Then** a ~200ms bullet-time slow with a flash fires — the emotional peak (S8.4, UX-DR-28).
**And** only a *new* session-best merge triggers it; ordinary merges don't (UX-DR-28).
**And** `sessionBestMerge` lives in the snapshot so undo rewinds it with the board (UX-DR-28, ADR-06).
**And** the bullet time is a 200ms timing config on the merge event (architecture, no fixed-step loop).
**And** under Reduced Motion the bullet time is smoothed or disabled while haptics and sound stay (FR-30, UX-DR-16).

### Story 8.5: Reduced Motion como preset

As a player with motion sensitivity,
I want to reduce screen effects without losing the game's feedback,
So that I can play comfortably without losing haptics and sound.

**Acceptance Criteria:**

**Given** the Reduced Motion setting enabled,
**When** feel effects are scheduled,
**Then** the full feel layer is gated: screen shake, bullet time, flash/particles, overshoot-and-snap scale, the `1536+` glow, and the game-over soft fade are cut or smoothed (UX-DR-16, FR-30).
**And** haptics and sound remain fully active (FR-30, UX-DR-16).
**And** Reduced Motion is a preset, not a flag — the feel system selects the reduced `FeelPreset` profile (UX-DR-16, ADR-04).
**And** the reduced preset is the sanctioned 60 FPS emergency fallback: if the full preset exceeds budget, the reduced preset is used, never game-killing code (ADR-04, NFR-14).
**And** the benchmark sweeps both full and reduced profiles (architecture).

### Story 8.6: SFX mínimos + haptics acoplados

As a player,
I want subtle sound that matches the game's warm identity,
So that audio reinforces the merge moment without a full soundtrack.

**Acceptance Criteria:**

**Given** a merge, spawn, or game over,
**When** the audio observer reacts,
**Then** minimal SFX play via expo-audio: merge, spawn, game-over — no music in MVP (S8.6, UX-DR-29).
**And** sound scales with tile value, mirroring the haptic scale (`3` light → `12+` heavy); sound and haptics are coupled (S8.6, UX-DR-29).
**And** the timbre is cálido/orgânico — a soft "thock", explicitly not Threes' sound (P4, UX-DR-29).
**And** the audio layer is a thin, swappable observer — never blocks or alters gameplay (architecture, audio).
**And** reduced motion keeps sound (FR-30, UX-DR-16).

<!-- End story repeat -->

## Epic 9: Acessibilidade — Jogável por Todos

Todos os jogadores, incluindo usuários de VoiceOver e de temas de contraste, jogam integralmente com 44pt, WCAG AA e três temas gratuitos.

### Story 9.1: Tap targets ≥44×44pt

As a player with motor constraints,
I want every tappable element big enough to hit reliably,
So that I never miss a button.

**Acceptance Criteria:**

**Given** every touchable element in the app,
**When** the UI renders,
**Then** all touchable elements have tap targets ≥44×44pt — enforced at the component level, not per screen (FR-28, S9.1).
**And** this includes the leaderboard tab (44pt hit area), the banner dismiss target, the tone-screen skip, and every menu row (48pt min height) (UX-DR-13, D-008).
**And** the pause button is ≥44×44 and outside the board swipe rect (UX-DR-6).
**And** touch targets never overlap the board swipe-capture zone (UX-DR-6).

### Story 9.2: Screen Reader Contract

As a VoiceOver user,
I want full screen-reader support for moving, reading, and hearing the game,
So that I can play the game with the same agency as a sighted player.

**Acceptance Criteria:**

**Given** VoiceOver/TalkBack active,
**When** I interact with the game,
**Then** move = three-finger swipe in a direction (VoiceOver reserves single-finger swipes for navigation) (FR-29, UX-DR-1, D-018).
**And** read the board = tap a tile to hear its value + position (row/column) (FR-29, UX-DR-1).
**And** per-tile `accessibilityElement`s are exposed from Skia to `UIAccessibility` via a bridge, so labels always match the board (UX-DR-1, S9.2).
**And** board labels are engine-derived (board grid + per-move events); chrome labels (Resume/Restart/Quit, theme names, leaderboard rows, banner copy, reward-prompt copy) are i18n-authored — never ad-hoc strings in UI (UX-DR-2).
**And** the announcement contract holds: move resolved (direction + changed tiles), merge ("Merged: 3 plus 3 equals 6"), noop silent, score on merge only (throttled), spawn ("New tile 1"), game over ("Game over. Score X, best Y"), new record, preview card, banners (UX-DR-2).
**And** the tone screen auto-advance pauses while an announcement is in flight / VoiceOver active (UX-DR-10).
**And** focus management follows tiles as they move (UX-DR-1).
**And** dynamic type is honored for HUD labels and menu copy — the largest accessibility text setting must render without truncation (UX-DR-24).

### Story 9.3: Merges por shape/texto além de cor + WCAG AA

As a color-blind player,
I want merges readable without relying on color,
So that I can distinguish tiles in every theme.

**Acceptance Criteria:**

**Given** the tile catalog,
**When** tiles render,
**Then** tile value is communicated by shape/text in addition to color — facet geometry and grain density vary by tier band (FR-31, S9.3, UX-DR-19).
**And** the glyph/facet mapping per tier is defined and validated for the color-blind theme (especially the `192` emerald vs `1536` incandescent pair where lightness alone is ambiguous) (UX-DR-17, DESIGN note).
**And** contrast meets WCAG AA in the canonical dark theme — body text on surface ≈ 13.1:1, muted ≈ 5.6:1, accent ≈ 7.0:1; tile ink ≥ 4.5:1 with the weakest pair (`384` deep emerald ≈ 4.7:1) still passing (FR-31, UX-DR-17).
**And** the 3:1 large-text exemption applies to 32pt tile numerals; the 13pt/9pt numerals hold ≥4.5:1 (UX-DR-18).
**And** merges are announced to screen readers as shape/text beyond color (FR-31).
**And** the all-themes WCAG AA gate (light + color-blind) runs in Story 9.4, where those hexes are defined — this story validates against the canonical dark palette only (dependency order).

### Story 9.4: Temas light, dark e color-blind

As a player,
I want free light, dark, and color-blind themes,
So that I can play in any environment and see the board clearly.

**Acceptance Criteria:**

**Given** the theme system,
**When** I open Settings and choose a theme,
**Then** light, dark, and color-blind themes are available and free (FR-32, S9.4).
**And** theme tokens are pure data (palettes) consumed by both Skia and RN views (UX-DR-17, architecture).
**And** the dark theme is the canonical identity; light flips the surfaces; color-blind re-serves the ramp distinguishable by value step, not hue (UX-DR-17).
**And** the light and color-blind 13-tier hexes are defined in this story (derived deltas, generated by the asset script) (UX-DR-17).
**And** themes never block play — switching is instant from Settings, applies next match, persists (UX-DR-30).
**And** all three themes pass the WCAG AA gate and hold the tile-ink contrast rule (FR-31, FR-32) — this is where the light + color-blind hexes defined here are validated (S9.3 scoped its check to the canonical dark palette).

<!-- End story repeat -->

## Epic 10: Telemetria & Observabilidade

O autor mede funis de retenção e receita, crash-free sessions, e cumpre GDPR/ATT com privacy policy pública antes do review.

### Story 10.1: Crashlytics com crash-free sessions

As a developer,
I want crash visibility with session-level tracking,
So that I know when and where players hit failures.

**Acceptance Criteria:**

**Given** Firebase Crashlytics configured in the app,
**When** a crash occurs in production,
**Then** the crash is reported with crash-free-session tracking (FR-33).
**And** unexpected errors (I/O, native, purchase, ad, storage, telemetry) are wrapped and funneled to a global handler that logs and forwards to Crashlytics (architecture, error handling).
**And** recoverable engine `rejected` results are NOT crash-logged (normal control flow) (architecture).
**And** telemetry never blocks or alters gameplay (architecture, observer boundary).
**And** ERROR logs route to Crashlytics in release; DEBUG/TRACE are dev-build only (`__DEV__`) (architecture, logging).

### Story 10.2: Funil de retenção

As a developer,
I want the retention funnel instrumented,
So that I can validate the north-star targets (first merge ~20s, first game over ≤3min).

**Acceptance Criteria:**

**Given** Firebase Analytics as an observer,
**When** a player plays their first session,
**Then** analytics events cover the retention funnel: first merge time, first game-over time, lane choice, first-session completion (FR-34).
**And** the events fire from engine/observer events (e.g., `PieceSpawned`, `MatchOver`, `LaneChanged`), never by instrumenting game logic (architecture, observer).
**And** analytics is a pure observer — it never alters spawn, merge, score, or flow (counter-metric, P3).
**And** first-session completion is defined and logged when the first run ends.

### Story 10.3: Funil de receita

As a developer,
I want revenue-funnel events instrumented,
So that I can measure rewarded-ad completion, IAP purchase, and assistance usage.

**Acceptance Criteria:**

**Given** the monetization layer,
**When** a player interacts with ads or IAP,
**Then** revenue-funnel events fire: rewarded-ad impressions/completions, IAP purchases, continue/undo usage (FR-35).
**And** ad impressions are recorded only for player-initiated rewarded ads — never for forced ads (FR-19, counter-metric).
**And** undo/continue usage is tracked per interaction, mapped to the entitlement or budget source (ad/IAP/free).
**And** revenue events are observed from the app layer (monetization), never from the engine (ADR-02).
**And** telemetry never influences whether an ad or purchase offer is shown.

### Story 10.4: GDPR consent mode + ATT prompt

As a developer,
I want privacy-compliant tracking,
So that the app meets GDPR and App Store requirements.

**Acceptance Criteria:**

**Given** Firebase + AdMob configured,
**When** the app first runs,
**Then** GDPR consent mode is implemented (paired with AdMob UMP) (FR-36).
**And** an ATT prompt appears on iOS if ad attribution is used (via `expo-tracking-transparency`) (FR-36).
**And** consent state gates analytics/ad attribution; telemetry respects user choice (FR-36).
**And** consent management never blocks gameplay — the game is fully playable offline regardless of consent state (NFR-2, P3).
**And** the pinned `expo-tracking-transparency` 57.0.1 version is used (Pinned Version Matrix).

### Story 10.5: Privacy policy pública

As a developer,
I want a public privacy policy live before submission,
So that App Store review is not blocked.

**Acceptance Criteria:**

**Given** the app preparing for App Store review,
**When** review is submitted,
**Then** a public privacy policy URL is live and covers ad and IAP data use (FR-37, blocking).
**And** the URL is provided in App Store Connect metadata before review submission (FR-37).
**And** the policy is linked from within the app (i18n PT/EN) as required.
**And** the policy URL is verified live before the review submission (blocking gate).
**And** consent mode + ATT prompt details are consistent with the policy (FR-36, FR-37).

<!-- End story repeat -->

## Epic 11: Publicação na App Store

O jogo shipa na App Store com identidade Mineral Quente, metadata completa e nome confirmado.

### Story 11.1: Ícone + screenshots Mineral Quente

As a store browser,
I want an icon and screenshots that look like Tríade,
So that the game stands out without resembling a Threes clone.

**Acceptance Criteria:**

**Given** the Mineral Quente identity,
**When** store assets are produced,
**Then** the store icon and screenshots use the "Mineral Quente" identity — dark slate, amber→copper→emerald tiles, incandescent peak (FR-38, P4).
**And** the visuals never resemble Threes branding (FR-38).
**And** the icon is a hot mineral tile on slate; screenshots show the board, lane select, and the big merge moment (UX-DR-17, DESIGN).
**And** the self-generated PNG set (180/192/512) is bundled — no external CDN (NFR-6).
**And** the store assets are reviewed against the "not a Threes clone" guardrail before submission (P4).

### Story 11.2: Metadata completa

As a developer,
I want complete and accurate App Store metadata,
So that review is not rejected for missing declarations.

**Acceptance Criteria:**

**Given** the App Store Connect submission,
**When** metadata is prepared,
**Then** the App Store metadata is complete and accurate at submission: description, keywords, age rating, IAP/ads declarations (FR-39).
**And** the three IAP products (Hint 5-pack, Undo 3-pack, No Ads + Unlimited Undo) and rewarded-ad placements are declared (FR-20, FR-39).
**And** the public privacy policy URL is provided and live (FR-37, blocking — covered in Epic 10).
**And** age rating is completed accurately (FR-39).
**And** the metadata carries the identity-first framing ("control over chaos", Mineral Quente) (P4).

### Story 11.3: Confirmação de nome + double-check

As a developer,
I want the name confirmed available,
So that the submission is not rejected for trademark conflict.

**Acceptance Criteria:**

**Given** the App Store name "Tríade: Merge Puzzle",
**When** preparing to submit,
**Then** the name and subtitle "Tríade: Merge Puzzle" are confirmed available in App Store Connect before submission (FR-40).
**And** the INPI radical search "TRIADE" double-check is run as recommended (PRD, §4.9).
**And** the store checklist carries the non-legal collision note (`triade.games` indie sci-fi title by Pixofamily) so the submission reviewers are aware (E11, PRD §4.9).
**And** the final name confirmation happens in App Store Connect at submission (PRD assumption, resolved 2026-08-07).
**And** the name, icon, and screenshots together are reviewed to never read as a Threes clone (P4).

<!-- End story repeat -->
