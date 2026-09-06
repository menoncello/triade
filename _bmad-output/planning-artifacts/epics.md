---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - '_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-09-04/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-09-04/EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md'
  - '_bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/addendum.md'
---

# 3-clone - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for 3-clone, decomposing the requirements from the GDD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The game rules engine from `js/game.js` is ported to TypeScript in the RN app with identical behavior — starting setup (9 tiles), merge, spawn, score, and game-over — and remains a single source of truth (UI never duplicates rules).
FR2: The 26 existing unit tests pass against the ported TypeScript engine (`node --test`).
FR3: The RN app renders a 4×4 board via Skia with tile slide/merge/spawn animations driven by the engine's per-tile trace; the board stays playable in both portrait and landscape.
FR4: The app ships installable from the App Store, runs offline, and persists best score and settings across launches.
FR5: A technical spike is performed first: port `game.js` + render one board in Skia, before committing to the full architecture.
FR6: Spawn weights for `1`/`2` auto-balance by board count: `w1 = 40 - 4*(count1-count2)`, `w2 = 40 + 4*(count1-count2)`, clamped to [8,72]; `w1+w2` always 80, pot always 20.
FR7: 20% of spawn weight is a pot for pieces `≥3`, opened per ceiling tier: `<48` → only `3`; `≥48` → `3,6`; `≥96` → `3,6,12`; `≥192` → `3,6,12,24`; `≥384` → `3,6,12,24,48`; `≥768` → `3,6,12,24,48,96`; ceiling doubling continues thereafter.
FR8: Within the pot, higher values are less likely than lower values. Initial curve: halving decay — each value weighs half the next-lower (`3=1`, `6=1/2`, `12=1/4`, …), normalized per ceiling tier so the pot sums to 20%.
FR9: The pot weight curve is configurable: weights are driven by a single parameter set (one number per tile value) exposed in a config, so the curve can be tuned and playtest-calibrated without code changes.
FR10: Adaptive Spawn respects the merge-once rule and effective-move spawn rules of the ported engine.
FR11: At game start, the player chooses Clean or Accelerated lane. The last chosen lane is remembered and becomes the default for the next game; changing the lane starts a new game.
FR12: Clean lane provides no undo, no hint, no ads, and no death-continue offer.
FR13: Accelerated lane provides undo (1 always free per game + up to 3 via rewarded ads, or 3 via IAP, or unlimited via No Ads IAP), hint (via IAP), and death-continue (rewarded ad 1 use, or IAP).
FR14: Score from each lane goes only to its own leaderboard (Clean / Assisted); lanes never mix.
FR15: Ads appear only between games in the Accelerated lane, never during play.
FR16: Undos per game in Accelerated lane: 1 always free + up to 3 via rewarded ads (each ad = 1 undo, max 4/game without IAP).
FR17: An IAP grants 3 undos usable in the Accelerated lane (US$0.99/R$4.90); "No Ads + Unlimited Undo" IAP (US$2.99/R$14.90, one-time) grants unlimited undos and removes rewarded-ad prompts.
FR18: Death-continue in the Accelerated lane is offered once per game over: rewarded ad (1 use) or IAP; continue erases 1 random small tile (1/2/3) and resumes same board. No continue offer appears in the Clean lane.
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
FR46 (UX-2026-09-04 carry): Lane Select is the main menu with one-tap Jogar shortcut on last/default lane; lane-switch with existing match warns "starts a new game".
FR47 (UX-2026-09-04 carry): Leaderboard is per-lane local top-10 with two tabs Melhores (best-ever + timestamps) and Recentes (last 10 + timestamps); skeleton rows while loading, never spinner.
FR48 (UX-2026-09-04 carry): Pause overlay offers Resume / Restart / Quit only; settings live in menu, never in pause; pause freezes board behind scrim.
FR49 (UX-2026-09-04 carry): Hint highlights one valid mergeable pair on the board, never suggests a direction nor reveals spawn.

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
NFR15: VoiceOver move path guaranteed: three-finger swipe + per-direction Custom Actions + VO-only D-pad; same `move()` contract; noop silent.
NFR16: Input determinism: dominant-axis lock at activation until onEnd; in-flight swipe rejected silent noop; ~20pt threshold; Pan mounted on board view only.
NFR17: HUD announcement order score → preview → best; tile labels from engine trace, chrome labels from i18n catalog.

### Additional Requirements

- Starter template: Expo SDK 57 (blank-typescript), development build (not Expo Go). Epic 1 Story 1 spike.
- Pinned Version Matrix (single source of truth): expo 57.0.11, react-native 0.86.2, @shopify/react-native-skia 2.11.0 (spike evidence: 2.6.2 via `npx expo install`), react-native-reanimated 4.3.x (spike: 4.5.1), react-native-worklets 0.8.x (spike: 0.10.1), expo-haptics (SDK 57), react-native-purchases 10.7.0, react-native-google-mobile-ads 16.4.0, @react-native-firebase/app+crashlytics+analytics 26.1.0, expo-audio 57.0.3, expo-secure-store (SDK 57), i18next 26.3.6, react-i18next, expo-localization (SDK 57), expo-tracking-transparency 57.0.1, react-native-safe-area-context (SDK 57), RNGH gesture-handler ~2.32.0, MMKV ^4.3.2 (S1.4 decision over AsyncStorage).
- S1.1 spike benchmark ships in the same PR as the spike (engine < 2ms/turn; frame logic worst case < 8ms; device p99 < 16.7ms).
- ADR-01 Engine purity: pure TS module; render/feel/audio/telemetry are observers; 26 tests as the gate.
- ADR-02 Monetization boundary: entitlements (IAP) vs per-match budgets (memory); engine exposes atomic contracts (`undo()` → `ok | rejected`); nothing purchasable changes spawn/merge/score. SecureStore mirror authoritative offline.
- ADR-03 Lane wall: Clean profile has no assistance path; leaderboards never mix; enforced by contracts, not trust.
- ADR-04 60 FPS as evidence: two-level benchmark (CI deterministic + scheduled device job); Reduced Motion as emergency profile.
- ADR-05 Hybrid rendering: declarative trace-derived board + imperative feel layer (worklets); frame math in pure TS.
- ADR-06 Deterministic undo: immutable snapshots include PRNG state + pendingSpawn + sessionBestMerge — undo is a true rewind.
- ADR-07 VoiceOver guaranteed path: Custom Actions + isolated a11y D-pad; three-finger shortcut.
- ADR-08 Input determinism: dominant-axis lock, rejected in-flight, threshold ~20pt, Pan only on BoardGestureView, buffer off/single-300ms.
- ADR-09 Frozen landscape HUD: 56pt single-row band (score+best left, preview center-right, pause far right); preview 16pt + PRÓX chip; 12pt preview↔pause gap.
- ADR-10 Chrome contract: pressed = fill+shadow pair; focus = double ring 2px accent + 1px scrim; disabled only on consumed offer (40%, no shadow).
- ADR-11 Feel ceiling + bridge: bloom ≤12% width / ≤35% opacity, transient, never over chrome, off in RM; RM gates whole feel layer; Skia→UIAccessibility bridge.
- Persistence layers: MMKV (settings, best score, lane memory) + expo-secure-store (entitlements, authoritative offline) + memory (per-match budgets, die with the match).
- Error handling: engine `ok | rejected`, never throws; I/O wrapped → global handler → Crashlytics, silent to player.
- Logging: structured JSON Logger; ERROR→Crashlytics; worklets/frame math log nothing in release.
- Config as typed data modules: `spawnConfig`, `theme`, `t()`; no scattered literals.
- Observer events: typed PascalCase past-tense EngineEvent with discriminated `type`; dev-only recorder.
- Project structure: `src/engine` pure, `src/game` orchestrator + pure `input.ts`, `src/a11y` top-level, `src/render/board/BoardGestureView` sole Pan mount, `src/feel` worklets, `src/ui`, `src/services`, `src/state` (screens/settings/mirror only, never board), `src/theme`, `src/i18n`, `src/dev` __DEV__-only, `benchmarks/`, `__tests__/`.

### UX Design Requirements

UX-DR1: Mineral Quente 13-tier ramp implemented (Areia→Ocre→Âmbar→Cobre→Bronze/Basalto→Ferro→Esmeralda→Obsidiana→Incandescente 1536/3072+) with distinct 1 vs 2; stepped tile numerals 32/24/18/13pt (11pt floor 6-digit only).
UX-DR2: Chrome state contract global on 7 components (button, pause-button, lane-card, menu-item, leaderboard-tab, settings-row, settings-toggle): pressed = fill+shadow pair; focus = double ring 2px accent + 1px scrim; disabled (40%, no shadow) only on consumed offer.
UX-DR3: Portrait HUD: score center-top display, best below muted caption tertiary rank lane-scoped, preview card bottom corner floating, pause top-right; nothing else (no timer/combo/ceiling bar).
UX-DR4: Landscape HUD frozen geometry: 56pt single-row top band (score+best left, preview center-right, pause far right), score 22pt/caption 12pt/600, preview 16pt + PRÓX 10pt chip (never ≥18pt, ratio ≥1.35x), 12pt preview↔pause gap, safe-margin 16pt over insets.
UX-DR5: Lane Select as main menu: Jogar shortcut + lane cards (Pura / Com ajuda) + exploration (Leaderboard, Settings); lane-switch with match warns new game; tone screen ~2s skippable, VO-aware auto-advance.
UX-DR6: Game-over overlay: frozen board thumbnail + max-tile hero (retrato), stats immediately (score/best/max/merges/streak), record as accent number, primary Jogar de novo, discreet Continue (Iniciante, once per game-over).
UX-DR7: Leaderboard two tabs Melhores/Recentes with rank+score+datetime rows, skeleton loading, empty "Sem registros ainda" with no funnel pressure.
UX-DR8: Settings rows (theme, reduced motion, language, lane default) stacked label-above/control-below, apply immediately + persist; toggle off = muted edge + I/O glyph.
UX-DR9: Reward prompt at moment of pain (rewarded ad first, IAP alternative, Cancel always); consumed CTA disabled; ad fail/cancel reverts losslessly.
UX-DR10: Iniciante-only prompt-banner (ceiling indicator + stuck warning) contextual, dismissible ≥44pt, announced on appear, never in Clean.
UX-DR11: Input: RNGH Pan on board only, dominant-axis lock until onEnd, ~20pt threshold, first-finger-wins, in-flight rejected silent noop, release-off-board resolves as captured, cancel/interruption = no turn.
UX-DR12: Screen-reader contract: per-tile elements via Skia bridge (tile value+row+column), move announcements from trace, score throttled on merge, preview announced, order score→preview→best, noop silent + one throttled hint/session.
UX-DR13: Feel suite as data presets (haptics 3-light/6-medium/12+-heavy, punch overshoot+snap + one-frame shadow compress, particles/flash scaled, shake 2/5 capped 8ms, bullet 200ms on session-best only, 1536+ bloom ceiling, death soft fade); RM preset gates all visual feel keeping haptics+sound.
UX-DR14: No time pressure; tone auto-advance pauses for VO announcement; Dynamic Type honored except fixed tile numerals; 44pt targets everywhere.
UX-DR15: i18n PT/EN microcopy calm ("controle sobre o caos", "Jogar", "Jogar de novo", "Novo recorde", "Continuar" discreet); no hype/celebration spam.

### FR Coverage Map

FR1: Epic 1 - TS engine port, single source of truth
FR2: Epic 1 - 26 tests passing on TS engine
FR3: Epic 1 - Skia 4x4 board from trace, portrait + landscape
FR4: Epic 1 - Installable offline, persists best + settings
FR5: Epic 1 - S1.1 spike first with CI benchmark in same PR
FR6: Epic 2 - Auto-balanced 1/2 weights by count, clamp [8,72]
FR7: Epic 2 - 20% pot opened per ceiling tier (48 base, GDD-aligned)
FR8: Epic 2 - Halving decay normalized to 20%
FR9: Epic 2 - Configurable curve (spawnConfig data)
FR10: Epic 2 - Respects merge-once + effective-move rules
FR11: Epic 3 - Lane choice per game + remembered default + new-game on switch
FR12: Epic 3 - Clean has no assistance path
FR13: Epic 3 - Accelerated offers undo/hint/continue
FR14: Epic 3 - Per-lane leaderboards never mix
FR15: Epic 3 - Ads only between games in Accelerated
FR16: Epic 4 - 1 free + up to 3 via ads (max 4/game)
FR17: Epic 4 - IAP undo 3-pack + No Ads Unlimited Undo
FR18: Epic 4 - Death-continue once per game-over (ad or IAP)
FR19: Epic 4 - No forced/interstitial ads, player-initiated only
FR20: Epic 4 - IAP/ads declarations at submission
FR21: Epic 5 - 3-move skippable tutorial (1+2 first, then one-cell)
FR22: Epic 5 - Veterans skip entirely
FR23: Epic 5 - Contextual first-session help in Accelerated only
FR24: Epic 5 - Tone screen ~2s skippable, VO-aware
FR25: Epic 6 - Game-over overlay immediate with 5 stats
FR26: Epic 6 - One-tap restart same lane
FR27: Epic 6 - Soft fade, last move visible, no forced wait
FR28: Epic 9 - 44pt tap targets everywhere
FR29: Epic 9 - Screen reader announces tiles/score/game-over
FR30: Epic 8 + Epic 9 - Reduced Motion preset gates feel, keeps haptics+sound
FR31: Epic 9 - Shape/text beyond color, WCAG AA all themes
FR32: Epic 9 - Light/dark/color-blind themes free
FR33: Epic 10 - Crashlytics + crash-free sessions
FR34: Epic 10 - Retention funnel events
FR35: Epic 10 - Revenue funnel events
FR36: Epic 10 - GDPR consent + ATT prompt
FR37: Epic 10 - Public privacy policy URL blocking
FR38: Epic 11 - Mineral Quente icon/screenshots, never Threes-like
FR39: Epic 11 - Metadata/keywords/age rating/IAP-ads declarations complete
FR40: Epic 11 - Name Tríade: Merge Puzzle confirmed in ASC
FR41: Epic 7 - HUD next-spawn preview from same distribution
FR42: Epic 7 - 60% exact / 40% range display roll
FR43: Epic 7 - Range always contains actual value, max 3 consecutive
FR44: Epic 7 - Preview never alters spawn
FR45: Epic 7 - Preview in both lanes
FR46: Epic 3 - Lane Select menu with Jogar shortcut + switch warning
FR47: Epic 3 - Local top-10 per lane, Melhores/Recentes tabs, skeleton loading
FR48: Epic 6 - Pause overlay Resume/Restart/Quit only
FR49: Epic 4 - Hint highlights one mergeable pair, never direction/spawn

## Epic List

### Epic 1: Plataforma RN + Skia jogável
Jogador instala, joga offline 4x4 com trace, retrato + paisagem.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 2: Adaptive Spawn
O jogo cresce com o jogador — pot tierado calibrável sem grind.
**FRs covered:** FR6, FR7, FR8, FR9, FR10

### Epic 3: Two Lanes + Menu + Leaderboards
Jogador escolhe Pura/Iniciante no menu, Jogar 1-tap, scores nunca misturam.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR46, FR47

### Epic 4: Monetização justa
Iniciante recupera de erro por escolha (ad/IAP); Clean nunca vê oferta; hint destaca par.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR49

### Epic 5: Tutorial & Onboarding
Primeira sessão: tone ~2s, 3 moves guiados, ajuda contextual só na Iniciante.
**FRs covered:** FR21, FR22, FR23, FR24

### Epic 6: Falha + Pausa
Game-over informa e volta em 1 tap; pause puro Resume/Restart/Quit.
**FRs covered:** FR25, FR26, FR27, FR48

### Epic 7: Next Piece Preview
HUD mostra próxima peça (60% exata / 40% range) nas duas pistas, sem alterar spawn.
**FRs covered:** FR41, FR42, FR43, FR44, FR45

### Epic 8: Feel como momento
Merge vira evento — haptics, punch, shake, bullet 200ms, tudo RM-aware.
**FRs covered:** FR30 (parte visual)

### Epic 9: Acessibilidade padrão
Todo corpo joga: 44pt, VO com path garantido, WCAG AA, 3 temas grátis.
**FRs covered:** FR28, FR29, FR30, FR31, FR32

### Epic 10: Telemetry & Confiança
Crash-free + funis retenção/receita, GDPR/ATT, privacy URL blocking.
**FRs covered:** FR33, FR34, FR35, FR36, FR37

### Epic 11: Publicação Store
Mineral Quente na loja, metadata + declarations corretas, nome confirmado.
**FRs covered:** FR38, FR39, FR40

## Epic 1: Plataforma RN + Skia jogável

Jogador instala, joga offline 4x4 com trace, retrato + paisagem.

### Story 1.1: Spike técnico engine + board + benchmark

As a jogador,
I want abrir o app e ver um board 4x4 renderizado do engine real,
So that a migração RN+Skia fica de-risked antes do rewrite.

**Acceptance Criteria:**

**Given** repo Expo SDK 57 blank-typescript
**When** porto `js/game.js` para `src/engine/core` puro TS
**Then** 26 testes passam via `node --test` sem alteração
**And** um board Skia estático renderiza de snapshot determinístico
**And** benchmark CI no mesmo PR mede engine <2ms/turn e frame worst <8ms

### Story 1.2: Port completo do engine de regras para TypeScript

As a jogador,
I want cada swipe obedecer merge 1+2, igual ≥3, merge-once, uma célula, spawn só em move efetivo,
So that o board se comporta idêntico ao PWA e a UI nunca duplica regra.

**Acceptance Criteria:**

**Given** engine TS puro sem imports RN/React/Skia
**When** aplico `move(state, dir)` com 9 tiles iniciais, merge, spawn, score, game-over
**Then** comportamento idêntico ao `js/game.js` em todos os casos
**And** `move()` retorna `{board, score, moved, trace}` com trace por tile
**And** NOOP não spawna, não pontua, não consome turno

### Story 1.3: Board Skia declarativo dirigido pelo trace

As a jogador,
I want ver slide/merge/spawn animados a partir do trace do engine,
So that o que eu vejo é sempre o que o engine decidiu.

**Acceptance Criteria:**

**Given** `move()` com trace por tile
**When** renderizo board 4×4 via Skia
**Then** slide/merge/spawn derivam só do trace, sem lógica duplicada na UI
**And** frame math vive em funções TS puras testáveis, worklet é binding fino

### Story 1.4: Offline instalável e persistência

As a jogador,
I want instalar da App Store, jogar sem rede e manter best + settings,
So that mato tempo em qualquer lugar sem perder progresso.

**Acceptance Criteria:**

**Given** build dev (não Expo Go) com prebuild + plugins
**When** jogo offline em airplane mode e mato/reabro o app
**Then** boot instantâneo sem loading, sessão completa sem rede
**And** best score + settings + lane default persistem (MMKV) e entitlements em SecureStore

### Story 1.5: Layout portrait e landscape

As a jogador,
I want board maximizado em retrato e paisagem com HUD legível,
So that jogo com uma mão no busão ou deitado sem quebrar.

**Acceptance Criteria:**

**Given** portrait e landscape com safe-area-context + 16pt over insets
**When** roto o device
**Then** board maximiza no meio (portrait) / domina (landscape banda 56pt single-row)
**And** score+best esquerda, preview centro-direita, pause extrema-direita, gap 12pt

### Story 1.6: Input por swipe com edge cases

As a jogador,
I want deslizar e ver o move resolver determinístico,
So that sinto controle, sem turno perdido por gesto fantasma.

**Acceptance Criteria:**

**Given** `Gesture.Pan` só em `BoardGestureView`, preview/pause fora do hit-rect
**When** deslizo com lock de eixo dominante até `onEnd`, threshold ~20pt, first-finger-wins
**Then** in-flight vira rejected silencioso sem turno/spawn, off-board resolve como capturado, cancel/interrupção sem turno
**And** `src/game/input.ts` puro sem imports RN, binding no BoardGestureView

### Story 1.7: Legibilidade dos numerais em landscape mínimo

As a jogador,
I want ler 48 vs 96 e 6 dígitos no menor tile landscape,
So that late-game continua legível sem cliff visual.

**Acceptance Criteria:**

**Given** escala stepped 32/24/18/13pt (floor 11pt só 6 dígitos)
**When** jogo em landscape no menor tile ~44pt
**Then** 4+ dígitos sem clip, 48-vs-96 distinguíveis a 40cm + grayscale
**And** sem regressão portrait

## Epic 2: Adaptive Spawn

O jogo cresce com o jogador — pot tierado calibrável sem grind.

### Story 2.1: Detecção de teto com limites GDD (48-base)

As a jogador,
I want o jogo só abrir o 6 quando eu chegar no 48,
So that o early-game respira e o big-merge chega no ritmo do GDD.

**Acceptance Criteria:**

**Given** board com tiles até 3072+
**When** calculo `ceiling = max(board)`
**Then** tier resolve `<48 → [3]; ≥48 → [3,6]; ≥96 → [3,6,12]; ≥192 → [+24]; ≥384 → [+48]; ≥768 → [+96]`
**And** pot contém só múltiplos liberados (ex: 96 → exatamente 3/6/12)
**And** função pura testável

### Story 2.2: Pesos 1/2 auto-balanceados por contagem

As a jogador,
I want 1 e 2 se reequilibrarem conforme a mesa,
So that nunca fico entupido do majoritário sem par.

**Acceptance Criteria:**

**Given** contagens `count1`, `count2` no board
**When** resolvo pesos base `w1 = 40 - 4*(count1-count2)`, `w2 = 40 + 4*(count1-count2)`, clamp [8,72]
**Then** `w1+w2 = 80` sempre, pot = 20 fixo (ex: 4x1+2x2 → 32/48/20)
**And** teste varre desbalanceamentos ±8+ com clamp

### Story 2.3: Pot tierizado pela nova escada

As a jogador,
I want pot só com múltiplos liberados pelo meu teto,
So that peças grandes chegam quando eu mereço.

**Acceptance Criteria:**

**Given** ceiling e escada `<48→[3]; ≥48→[3,6]; ≥96→[3,6,12]; ≥192→[+24]; ≥384→[+48]; ≥768→[+96]`
**When** resolvo pot
**Then** conjunto exato dos liberados, sem bloqueados (96 → exatamente 3/6/12)
**And** soma do pot sempre 20 após normalização

### Story 2.4: Curva halving decay normalizada

As a jogador,
I want valores altos mais raros que baixos dentro do pot,
So that o jackpot continua raro.

**Acceptance Criteria:**

**Given** pot liberado (ex: [3,6,12])
**When** aplico halving `3=1, 6=1/2, 12=1/4…`
**Then** normalizo para somar 20, com epsilon e `weightedPicker` sempre renormalizando
**And** teste garante pot=20 em todos os tiers 48 base

### Story 2.5: spawnConfig configurável

As a game designer,
I want tunar curva, passo 4pp e clamp sem mexer em código,
So that calibro por playtest sem PR de engine.

**Acceptance Criteria:**

**Given** `spawnConfig` como dados (pesos por valor, passo balanceamento, clamp, tiers)
**When** mudo um número e rodo testes
**Then** curva valida (pot=20 epsilon) ou falha com mensagem clara
**And** nenhum literal espalhado no engine

### Story 2.6: Integração com engine (merge-once + effective-move)

As a jogador,
I want spawn novo só após move que muda o board,
So that NOOP nunca me pune.

**Acceptance Criteria:**

**Given** engine com merge-once e `move()` efetivo
**When** swipe efetivo com nova distribuição 32/48/20-style + pot tierado
**Then** spawn em célula vazia uniforme, score pelo merged, trace inclui spawn
**And** 26 testes + novos de balance passam

## Epic 3: Two Lanes + Menu + Leaderboards

Jogador escolhe Pura/Iniciante no menu, Jogar 1-tap, scores nunca misturam.

### Story 3.1: Seleção de pista no menu com Jogar

As a jogador,
I want abrir e jogar em 1 tap na última pista, ou trocar com aviso,
So that entro rápido sem perder run por engano.

**Acceptance Criteria:**

**Given** menu Lane Select com cards Pura / Com ajuda + botão Jogar
**When** toco Jogar sem match / com match / troco de pista
**Then** entra na default memorizada; troca com match avisa "começa nova partida" e confirma
**And** default persiste

### Story 3.2: Clean lane pura

As a Théo (Achiever),
I want board nu sem ajuda, sem aviso, sem oferta,
So that meu recorde vale.

**Acceptance Criteria:**

**Given** perfil Clean
**When** jogo, pauso, morro
**Then** sem undo/hint/continue/ads, sem ceiling indicator, sem stuck warning
**And** sem code path de assistência (contrato, não confiança)

### Story 3.3: Accelerated lane com assistência

As a Lia (Beginner),
I want undo/hint/continue e ajudas contextuais,
So that aprendo sem vergonha.

**Acceptance Criteria:**

**Given** perfil Assisted
**When** jogo primeira sessão / travo / erro
**Then** ceiling indicator + stuck warning só quando relevante, undo/hint/continue disponíveis por policy
**And** HUD anuncia ajudas sem poluir

### Story 3.4: Leaderboards por pista (Melhores/Recentes)

As a Théo,
I want top-10 Clean e Assisted separados com datas,
So that subo sem desconfiar de pay-to-win.

**Acceptance Criteria:**

**Given** fim de run em cada pista
**When** abro Leaderboard
**Then** abas Melhores (best-ever + timestamps) e Recentes (últimos 10 + timestamps), top-10 local por pista
**And** loading com skeleton rows, vazio "Sem registros ainda" sem pressão

### Story 3.5: Contrato lane wall no orquestrador

As a jogador,
I want monetização nunca encostar em spawn/merge/score,
So that pago por segunda chance, nunca por vantagem.

**Acceptance Criteria:**

**Given** `MatchOrchestrator` único com `LaneProfile` + contratos `canUndo`, `undo(): ok|rejected`
**When** Clean tenta ajuda / Assisted consome budget
**Then** Clean rejeita por contrato (sem path), Assisted debita memória que morre com o match
**And** ads só entre games na Accelerated, nunca durante

## Epic 4: Monetização justa

Iniciante recupera de erro por escolha (ad/IAP); Clean nunca vê oferta; hint destaca par.

### Story 4.1: Undo 1 free + até 3 via ads

As a Ana,
I want 1 undo garantido + até 3 via ads por game,
So that erro sem virar paywall.

**Acceptance Criteria:**

**Given** Accelerated com budget `free=1` + `ads=0/3` por match
**When** uso free / assisto ad (player-initiated, 1 ad = 1 undo)
**Then** rewind exato (snapshot + PRNG + pendingSpawn); free zera 1x; ads incrementam até 3 (teto 4/game sem IAP)
**And** CTA consumido vira disabled 40% sem sombra; sem IAP No-Ads os prompts seguem

### Story 4.2: Death-continue apaga 1 peça pequena

As a Ana,
I want continuar apagando 1 peça pequena aleatória (1/2/3),
So that desentope sem rebobinar tudo.

**Acceptance Criteria:**

**Given** game-over na Accelerated (1ª morte do game-over)
**When** toco Continuar via rewarded ad (1 uso) ou IAP
**Then** remove 1 tile aleatório entre 1/2/3 via `snapshot.prng`, resume no mesmo board com mesmo score; undo traz a peça apagada de volta (rewind verdadeiro) mas congela por 3 turnos após o continue (anti-farm); 2ª morte sem oferta, só Jogar de novo
**And** ad fail/cancel reverte sem perda; Clean nunca vê Continue

### Story 4.3: Hint IAP destaca 1 par

As a Lia,
I want dica que mostra um merge possível sem jogar por mim,
So that aprendo a ler o board.

**Acceptance Criteria:**

**Given** Accelerated com hint pack (5-pack US$0.99/R$4.90)
**When** ativo hint
**Then** destaca 1 par mergeável (`1|2` adjacente ou igual ≥3), nunca sugere direção, nunca revela spawn
**And** consome 1 do pack; sem hint no Clean

### Story 4.4: IAP undo 3-pack + No Ads Unlimited

As a Ana,
I want comprar undos ou remover ads de vez,
So that escolho meu atrito.

**Acceptance Criteria:**

**Given** loja com Undo 3-pack (US$0.99/R$4.90) + No Ads + Unlimited Undo (US$2.99/R$14.90 one-time)
**When** compro e restauro
**Then** 3-pack credita 3 undos na Accelerated; No-Ads libera undo infinito e remove prompts de rewarded ad
**And** nada comprável altera spawn/merge/score

### Story 4.5: Entitlements + restore offline-first

As a Ana,
I want meus packs valerem sem rede e após reinstall,
So that compra não some.

**Acceptance Criteria:**

**Given** RevenueCat + espelho SecureStore autoritativo offline
**When** compro / reinstalo / volto online
**Then** reconcilia sem downgrade do held; budgets por match morrem com o match
**And** restore restaura No-Ads/packs

### Story 4.6: Declarations App Store player-initiated

As a Eduardo (owner),
I want IAP/ads declarados e ads só por escolha,
So that passo na review sem fricção.

**Acceptance Criteria:**

**Given** AdMob UMP + placements só Iniciante entre games
**When** submeto
**Then** IAP/ads/age declarados, sem interstitial/forçado em qualquer pista
**And** privacy URL + consent antes de tracking

## Epic 5: Tutorial & Onboarding

Primeira sessão ensina jogando, veterano pula, tone marca.

### Story 5.1: Tutorial 3 moves guiados

As a Lia,
I want aprender 1+2 e 1-célula jogando,
So that primeiro merge em ~20s.

**Acceptance Criteria:**

**Given** primeiro game por pista
**When** faço 3 moves guiados (1+2 primeiro, depois 1-célula vs 2048)
**Then** board responde de verdade, sem text wall; completa ou skip libera run padrão
**And** métrica first-merge dispara

### Story 5.2: Skip total para veteranos

As a Dora (veterana),
I want pular tudo e jogar,
So that busão de 2min não vira aula.

**Acceptance Criteria:**

**Given** oferta de tutorial na 1ª sessão
**When** toco skip mid-move
**Then** libera board imediatamente, sem gating, sem texto residual
**And** skip persiste por pista

### Story 5.3: Ajuda contextual Iniciante 1ª sessão

As a Lia,
I want avisos só quando preciso na Iniciante,
So that aprendo sem ser tratada como incapaz.

**Acceptance Criteria:**

**Given** Accelerated primeira sessão
**When** board perto de travar / teto sobe
**Then** banner muted/accent dismissível ≥44pt, anunciado 1x; Clean nunca mostra
**And** dispensa não volta a naggear

### Story 5.4: Tone screen identidade

As a jogador novo,
I want sentir "controle sobre o caos" em ~2s puláveis,
So that entendo o tom sem tutorial de marca.

**Acceptance Criteria:**

**Given** 1º launch
**When** tone toca (slate + tile incandescente + 1 linha)
**Then** auto-avança ~2s, tap skip sem outro alvo; retorno pula direto ao menu
**And** auto-advance pausa com VO ativo / anúncio em voo

## Epic 6: Falha + Pausa

Morrer informa, restart é 1 tap, pause não atrapalha.

### Story 6.1: Overlay game-over com stats imediatos

As a Théo,
I want score/best/max/merges/streak na hora, recorde como número,
So that sei se bati sem esperar.

**Acceptance Criteria:**

**Given** grid full + sem par mergeável
**When** morro
**Then** overlay imediato com 5 stats + thumbnail frozen + max-tile hero; recorde em accent, sem confete
**And** sem wait forçado

### Story 6.2: Morte elegante em soft fade

As a jogador,
I want fade suave com último move visível,
So that morte não corta na cara.

**Acceptance Criteria:**

**Given** board final
**When** game-over dispara
**Then** soft fade sobre board congelado, stats entram quietos, sem cutoff
**And** RM preset amacia/remove fade mantendo info

### Story 6.3: Restart 1-tap mesma pista

As a Théo,
I want Jogar de novo direto,
So that o "one more" não esfria.

**Acceptance Criteria:**

**Given** overlay game-over
**When** toco Jogar de novo
**Then** novo game mesma pista imediato, sem loading, sem menu
**And** budgets por match resetam

### Story 6.4: Pause puro Resume/Restart/Quit

As a Dora,
I want pausar e voltar/sair sem config no meio,
So that busão não me pune.

**Acceptance Criteria:**

**Given** jogo em curso, tap pause 48×48
**When** abro pause (tap mid-animation deixa settle, depois congela atrás do scrim)
**Then** só Resume / Restart / Quit; settings só no menu; Quit volta ao menu sem guilt
**And** pause é estado, não router

## Epic 7: Next Piece Preview

Planejo vendo a próxima peça, sem trapaça.

### Story 7.1: PendingSpawn pré-resolvido no snapshot

As a jogador,
I want próxima peça decidida no move efetivo e guardada,
So that undo rebobina preview junto.

**Acceptance Criteria:**

**Given** snapshot imutável com PRNG + pendingSpawn (valor real + display roll)
**When** move efetivo resolve próximo spawn da distribuição (1/2 balance + pot tierado 48 base)
**Then** HUD lê pending, board materializa pending no próximo efetivo; undo reverte junto
**And** UI nunca rola

### Story 7.2: Preview card no HUD 60/40

As a jogador,
I want ver valor exato 60% ou range 40% nas duas pistas,
So that planejo o próximo swipe.

**Acceptance Criteria:**

**Given** pendingSpawn com display roll separado
**When** renderizo card (portrait 20pt / landscape 16pt + chip PRÓX, ratio ≥1.35x)
**Then** `<0.6` exato, senão range; card nunca anima com feel (chrome, não board)
**And** anúncio segue score→preview→best

### Story 7.3: Faixa ambígua só com liberados

As a jogador,
I want range sempre contendo o real e só com liberados,
So that confio no card.

**Acceptance Criteria:**

**Given** valor real + tier liberado (48 base)
**When** display roll cai nos 40%
**Then** 1/2 → "1/2"; pot só-[3] → "3"; pot maior → janela aleatória de até 3 consecutivos contendo o real, só liberados (ex: real 24 → 50% [6,12,24] / 30% [12,24,48] / 20% [24,48,96]; se teto limita, só janelas válidas, renormalizando)
**And** nunca exibe bloqueado

### Story 7.4: Invariante preview nunca altera spawn

As a Théo,
I want garantia que card é só leitura,
So that recorde não é contaminado.

**Acceptance Criteria:**

**Given** 60/40 display separado do spawn
**When** rodo teste de invariante
**Then** tile materializado == `pendingSpawn.value` sempre, independente do display
**And** preview nas duas pistas (info estratégica, não ajuda)

## Epic 8: Feel como momento

Merge grande vira pico emocional, calibrável por dados.

### Story 8.1: Haptics escalados

As a jogador,
I want sentir 3 leve, 6 médio, 12+ pesado,
So that mão confirma o que olho vê.

**Acceptance Criteria:**

**Given** `presetFor(value)` puro por banda
**When** merge resolve
**Then** dispara light/medium/heavy via expo-haptics; RM mantém haptics
**And** teste varre presets

### Story 8.2: Punch visual overshoot + flash + partículas

As a jogador,
I want tile estourar e voltar com splash proporcional,
So that big merge tem peso.

**Acceptance Criteria:**

**Given** merge via trace (overshoot declarativo no render; flash/partículas worklet)
**When** merge Landing
**Then** overshoot-and-snap + flash + burst escala com valor; sombra comprime 1 frame; 1536+ bloom ≤12%/≤35% transiente nunca sobre chrome
**And** benchmark varre preset full

### Story 8.3: Screen shake direcional contido

As a jogador,
I want tremor sutil no médio, mais forte no grande, nunca enjoo,
So that impacto sem perder leitura.

**Acceptance Criteria:**

**Given** presets shake 2ms médio / 5ms grande, teto 8ms
**When** merge médio/grande
**Then** shake direcional dentro do teto; RM desliga
**And** device valida sem drop p99

### Story 8.4: Bullet time no session-best

As a Théo,
I want ~200ms lentos + flash só no meu maior merge da sessão,
So that persigo o golden moment.

**Acceptance Criteria:**

**Given** `sessionBestMerge` no snapshot
**When** novo recorde de merge na sessão
**Then** bullet 200ms + flash 1x; undo reverte best junto; demais merges sem bullet
**And** RM desliga mantendo haptics+som

### Story 8.5: Reduced Motion preset total

As a jogador sensível a movimento,
I want desligar shake/bullet/flash/overshoot/glow/fade e manter haptics+som,
So that jogo sem mal-estar e com 60 FPS fallback.

**Acceptance Criteria:**

**Given** setting reducedMotion
**When** ativo
**Then** gateia toda camada feel visual, mantém haptics+som; é o fallback oficial se full estourar p99
**And** teste garante RM sem worklet visual

### Story 8.6: SFX mínimos cálidos + haptics acoplados

As a jogador,
I want merge/spawn/game-over com thock suave escalando com valor,
So that ouvido confirma sem música.

**Acceptance Criteria:**

**Given** expo-audio manager observer, 3 SFX bundled preload, sem CDN
**When** merge/spawn/morte
**Then** volume/timbre escala com tile, acoplado ao haptic; sem música no MVP
**And** RM mantém som; identidade validada em playtest externo

## Epic 9: Acessibilidade padrão

Todo corpo joga sem barreira.

### Story 9.1: Tap targets ≥44pt + focus visível

As a jogador,
I want todo toque com 44pt e foco em anel duplo,
So that acerto de primeira com Switch/VO/teclado.

**Acceptance Criteria:**

**Given** chrome 7 componentes com contrato pressed par + focus ring 2px accent + 1px scrim
**When** navego por toque/teclado/VO/Switch
**Then** todo alvo ≥44×44pt incluindo tab/banner/skip; foco nunca só por fill
**And** audit por componente, não por tela

### Story 9.2: Screen reader path garantido

As a Beatriz (VO),
I want ler board por tile e mover por gesto ou ação garantida,
So that jogo full sem enxergar.

**Acceptance Criteria:**

**Given** bridge Skia→UIAccessibility (labels do trace) + Custom Actions i18n + D-pad VO-only
**When** exploro tile / 3-dedos / ação "Mover…" / D-pad
**Then** ouço valor+linha+coluna, merge "X plus Y equals Z", score throttled, game-over score+best, preview; NOOP silencioso + 1 hint throttled/sessão se gesto não chegou
**And** aceitação: 3 moves só por ações com VO ligado (device); CI espelha com VO mockado

### Story 9.3: Shape além de cor + WCAG AA

As a daltônico,
I want valor por forma/texto, não só cor,
So that 48 vs 96 não somem.

**Acceptance Criteria:**

**Given** tokens + glyph layer por valor, tintas dark/light por tier
**When** varro todos os temas
**Then** contraste AA em tudo; 1 vs 2 distintos de relance; merges legíveis sem cor
**And** bronze-vs-ferro + tier→facet validados em device

### Story 9.4: Temas light/dark/color-blind grátis

As a jogador,
I want trocar tema no menu aplicando na próxima match,
So that jogo do meu jeito sem pagar.

**Acceptance Criteria:**

**Given** settings tema (menu, stacked label-acima)
**When** troco e persisto
**Then** aplica next match sem quebrar run; 3 temas grátis, nunca paywall
**And** light/color-blind deltas + Dynamic Type sem truncate (tile numeral exceção fixa)

## Epic 10: Telemetry & Confiança

Sei que não quebra e por que ficam/pagam.

### Story 10.1: Crashlytics com crash-free

As a Eduardo,
I want crash reportado silencioso sem travar jogo,
So that durmo sem page 3am.

**Acceptance Criteria:**

**Given** Firebase Crashlytics observer (I/O com try/catch → handler global)
**When** nativo/I/O estoura em release
**Then** loga ERROR→Crashlytics, jogador não vê; rejected engine nunca loga ERROR
**And** crash-free sessions no dashboard; worklets/frame sem log release

### Story 10.2: Funil retenção north-star

As a Eduardo,
I want first-merge ~20s, first-gameover ≤3min, lane, 1ª sessão,
So that sei se o hook prende.

**Acceptance Criteria:**

**Given** Analytics observer nunca bloqueia gameplay
**When** sessão roda
**Then** eventos first-merge-time, first-gameover-time, lane-choice, first-session-complete
**And** dashboard north-star; D1 target TBD fora do gate

### Story 10.3: Funil receita

As a Eduardo,
I want impress/completa de ad, compra IAP, uso undo/continue,
So that sei onde o funil vaza.

**Acceptance Criteria:**

**Given** monetização emite eventos no momento da dor/uso
**When** ad/ compra / consumo
**Then** rewarded-impression/completion, IAP-purchase, continue/undo-usage por pista
**And** % Accelerated trackeado; sem PII

### Story 10.4: GDPR consent + ATT

As a jogador EU/BR,
I want consentir antes de tracking e ver ATT se houver attribution,
So that privacidade sem dark pattern.

**Acceptance Criteria:**

**Given** UMP + `expo-tracking-transparency`
**When** 1º launch / uso de attribution
**Then** consent mode antes de Firebase/Ads; ATT só se attribution; sem tracking antes do opt-in
**And** settings permite revisar

### Story 10.5: Privacy policy pública blocking

As a Eduardo,
I want URL pública viva antes da review,
So that não tomo reject bobo.

**Acceptance Criteria:**

**Given** policy hospedada pública
**When** submeto
**Then** URL viva linkada em ASC + settings; cobre Firebase/Ads/IAP sem conta/backend
**And** submission bloqueada sem URL

### Story 10.6: Gate de calibração da curva (dono: Eduardo)

As a Eduardo (dono da curva),
I want gatilhos numéricos para retunar escada 48/passo 4pp/clamp/halving/janelas 50-30-20 só via `spawnConfig`,
So that a curva evolui por dado, sem PR de engine.

**Acceptance Criteria:**

**Given** telemetria 10.2/10.3 deste epic (first-merge p50, first-gameover p50, max-tile mediana, clog 1/2)
**When** first-merge p50 >25s ou first-gameover p50 >3min30 ou max-tile mediana cai >1 tier vs baseline playtest
**Then** Eduardo decide retune só em dados (`spawnConfig`/previewConfig); engine intocado; decisão logada com antes/depois
**And** curva revalida (pot=20 epsilon, clamp, janelas renormalizadas) ou CI falha

## Epic 11: Publicação Store

Loja com identidade própria, sem cara de clone, sem reject.

### Story 11.1: Ícone + screenshots Mineral Quente

As a jogador na loja,
I want ver pedra quente no slate e entender o jogo,
So that baixo sem confundir com Threes.

**Acceptance Criteria:**

**Given** rampa 13 tiers + tile incandescente + slate
**When** gero icon 180/192/512 + shots portrait/landscape/gameover/leaderboard
**Then** zero pastel Threes/paper-tile; 1 vs 2 distintos nos shots
**And** review P4 passa

### Story 11.2: Metadata completa

As a Eduardo,
I want descrição/keywords/age/IAP-ads tudo certo,
So that review anda de primeira.

**Acceptance Criteria:**

**Given** ASC com IAPs (hint, undo, no-ads) + ads + privacy URL
**When** preencho metadata PT/EN
**Then** descrição sem hype, keywords sem "Threes", age + declarations IAP/ads corretas
**And** checklist bloqueia submit incompleto

### Story 11.3: Confirmação de nome double-check

As a Eduardo,
I want "Tríade: Merge Puzzle" garantido no ASC + INPI radical + domínio,
So that lanço sem colisão.

**Acceptance Criteria:**

**Given** pesquisa INPI Class 9 limpa + sem jogo "Tríade" nas lojas + triade.games ciente (sci-fi, sem colisão)
**When** reservo no ASC
**Then** nome+subtítulo confirmados; radical "TRIADE" re-checado; triadepuzzle.com.br considerado
**And** sem confirmação, sem submit
