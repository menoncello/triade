# Epic 5 Context: Tutorial & Onboarding

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

New players learn the counterintuitive rule first (1+2) by playing, with first merge within ~20s, while genre veterans can skip entirely. First launch shows a brief identity tone moment, and lane-matched onboarding keeps Clean pure and Accelerated helpfully guided.

## Stories

- Story 5.1: Tutorial de 3 moves guiados
- Story 5.2: Tone screen de identidade
- Story 5.3: Ajuda contextual por pista na primeira sessão
- Story 5.4: i18n PT/EN para onboarding

## Requirements & Constraints

- Skippable 3-guided-move tutorial teaches 1+2 merge first, then one-cell movement; learn-by-playing, no text wall, climax is swiping 1+2 into a 3 merge with light haptic (FR21, UX-DR26).
- First merge within ~20s of first session (north-star retention funnel); veteran can skip entirely and play immediately (FR22).
- Skipping mid-move releases board immediately, standard run begins — no gating.
- Tutorial shown per-lane (first game per lane), contextual first-session help for Accelerated only; Clean shows minimal tutorial only (FR23).
- NOOP swipe during tutorial is silent control flow — no spawn, no score, no turn consumed (UX-DR23).
- Tone screen ~2s on first launch only, dark slate + incandescent tile + "controle sobre o caos" line, skippable by tap, auto-advance pauses while VoiceOver announcement in flight (FR24, UX-DR10), exempt from no-time-pressure rule.
- i18n PT/EN via i18next + expo-localization for tutorial copy, tone line, lane names; no inline strings — all `t('key')`, strings never leak into board logic (NFR13, UX-DR22); language switch applies immediately and persists.
- Contextual help uses calm, precise "controle sobre o caos" voice, plain-spoken for Iniciante, dismissible prompt-banners only when relevant (UX-DR15,21).
- Engine remains pure TS single source of truth; tutorial never duplicates rules.

## Technical Decisions

- Tutorial state lives outside engine — engine stays pure (move/spawn/merge only); orchestration in `src/game` screen-state machine (tone → lane-select → game) or tutorial overlay state in `src/ui`/`src/game`.
- Persistence for onboarding completion: MMKV via typed settings store (same layer as lane memory/best score); per-lane tutorial flag (tutorial completed per lane) vs first-launch flag for tone screen.
- Screen-state machine owns onboarding flow; game-over stays overlay; restart resets store.
- Theme tokens as pure data; Skia board declarative from trace, feel/haptics observers; Reduced Motion semantics apply but tutorial keeps haptics.
- i18n catalog consumption via `t()`; boundaries: board never in `src/state`, strings never in engine.

## UX & Interaction Patterns

- 3-move guided sequence: highlight/swipe cue for 1+2 merge, then one-cell movement teaching (2048 difference); minimal text, action over explanation; skip affordance always visible.
- Skip mid-move → immediate release, no animation gating; NOOP silent (UX-DR23).
- Tone screen: dark slate, large tile lighting up, single line; tap anywhere skips; 2s auto-dismiss; VoiceOver pauses timer.
- Per-lane differentiation: Clean = silent/trustful minimal chrome; Accelerated = plain-spoken banners when relevant (ceiling indicator, stuck warning deferred to 5.3).
- Touch targets ≥44pt, safe areas, no time pressure except tone beat (exempt).

## Cross-Story Dependencies

- 5.1 (guided moves) is prerequisite for 5.3 (contextual help per lane) and 5.4 (i18n strings for tutorial copy).
- 5.2 (tone screen) is independent of 5.1 but both share first-launch persistence; 5.2 lands on tone → lane-select → game chain.
- All 5.x depend on Epic 1 (engine+board+layout+input) and Epic 3 (lane select/profile) being done — which they are.
