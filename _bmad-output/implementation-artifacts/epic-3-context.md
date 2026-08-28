# Epic 3 Context: Duas Pistas — Integridade de Score como Feature

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Players choose between a pure Clean lane and an assisted Accelerated/Iniciante lane at game start, with per-lane leaderboards that never mix — score integrity enforced by architecture so monetization never corrupts a clean run. Last lane choice is remembered as default; changing lane always starts a new game.

## Stories

- Story 3.1: Seleção de pista no menu (Lane Select)
- Story 3.2: Clean lane pura
- Story 3.3: Accelerated lane com assistência
- Story 3.4: Leaderboards por pista
- Story 3.5: Contrato Lane Wall no orquestrador

## Requirements & Constraints

- At game start player chooses Clean ("Pura") or Accelerated ("Iniciante"/"Com ajuda"); last chosen lane becomes default next game; changing lane starts a new game (FR11).
- Clean lane: no undo, no hint, no ads, no death-continue (FR12); no spawn-ceiling indicator or stuck warning (P1); no learning aids.
- Accelerated lane: undo (1 free via rewarded ad + 3 via IAP), hint (IAP 5-pack), death-continue (rewarded ad 1 use or IAP) (FR13); ceiling indicator + stuck warning as contextual dismissible prompt-banners only when relevant.
- Per-lane leaderboards: score goes only to its own leaderboard; lanes never mix; HUD best is lane-scoped (FR14).
- Ads only between games in Accelerated lane, never during play (FR15); rewarded prompts at moment of need with ad first, IAP alternative, Cancel always.
- Lane memory persisted across launches; per-match budgets (free undo/continue/hint) live in memory and die with match (ADR-02 persistence layers).
- i18n PT/EN for lane names, HUD, chrome labels via i18next catalog — no inline strings (UX-DR22).

## Technical Decisions

- Lane Wall pattern (N2): LaneProfile data ({id, undo, leaderboard}) + MatchOrchestrator in src/game as only layer that knows lanes; atomic contracts canUndo/undo(): ok|rejected keep engine monetization-agnostic (ADR-02/ADR-03).
- Boundary: lane exposed to app layer (services/monetization) never to engine; engine sees only atomic contracts.
- Persistence layers: settings/best score/lane memory → MMKV (sync reads); entitlements → SecureStore authoritative offline with RevenueCat reconcile; per-match budgets → memory.
- Navigation: screen-state machine tone → lane select → game; game over is overlay; restart = reset store no navigation.
- Screen-state + Settings stores in src/state (board never lives in src/state); engine snapshots stay in engine per ADR-06.
- Storage decision resolved to MMKV (S1.4); lane memory uses same typed settings store.

## UX & Interaction Patterns

- Lane Select is the functional home surface: two side-by-side cards (Clean "Pura" / Iniciante "Com ajuda" with one tone line each), default highlighted with accent bar; Jogar one-tap shortcut into game on last/default lane even when a card highlighted (UX-DR9/D-011).
- Footer warning "changing lane starts a new game" when a match exists and user taps other lane card (D-008); confirm required.
- Pause is pure (Resume/Restart/Quit only, settings in main menu); safe areas via react-native-safe-area-context + 16pt safe-margin; 44pt tap targets; typography/spacing tokens.
- Voice and tone calm, precise "controle sobre o caos"; no encouragement system.
- Preview card shown in both lanes (both lanes share HUD: score center-top, best muted, preview card, pause top-right in portrait; thin edge band in landscape — already built in Epic 1).

## Cross-Story Dependencies

- 3.1 (Lane Select) is prerequisite for 3.2/3.3/3.4/3.5 — establishes LaneProfile, lane memory persistence, lane-select screen, Jogar shortcut, and lane-change warning.
- 3.4 (Leaderboards) depends on lane-scoped best persistence; 3.5 (Lane Wall contract) gates all assistance interactions and depends on 3.1 profile being in place.
- Epic 7 (Preview) and Epic 6 (Game Over) already delivered on single-lane board — 3.1 must integrate without breaking their HUD/overlay contracts; epic 3 retrospectively makes those features lane-aware only where required (preview already dual-lane).
