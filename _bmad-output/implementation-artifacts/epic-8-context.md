# Epic 8 Context: Core Feel Feedback — O Merge como Momento

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Players feel the big merge as a physical and visual event — scaled haptics, punch, directional shake, and rare bullet time — with Reduced Motion as a graceful fallback and sound+haptics coupled, so the moment lands without breaking 60 FPS.

## Stories

- Story 8.1: Haptics
- Story 8.2: Punch visual
- Story 8.3: Screen shake
- Story 8.4: Bullet time
- Story 8.5: Reduced Motion
- Story 8.6: SFX haptics

## Requirements & Constraints

- Haptics fire via expo-haptics scaled by merge value: 3 light, 6 medium, 12+ heavy; mapping from FeelPreset tier band (data, not code); presetFor(value) pure and tested; haptics remain enabled under Reduced Motion (FR-30, S8.1, UX-DR-16).
- FeelPreset model: haptic type, shakeMs (2/5 capped 8), particleBurst, overshootMs, flash boolean per tier band; data-driven tuning.
- Visual punch: merged tile overshoots/snap driven declaratively from trace in src/render; flash+particles as imperative worklets in src/feel; only on board, never chrome; 1536/3072+ incandescent glow is the only glow (S8.2).
- Directional shake on merge, subtle ~2ms medium, ~5ms large capped 8ms, from FeelPreset shakeMs, disabled/smoothed under Reduced Motion, silent on NOOP (S8.3).
- Bullet time ~200ms+flash only on new session-best merge; sessionBestMerge lives in snapshot so undo rewinds it (S8.4, UX-DR-28).
- Reduced Motion gates entire feel layer (shake, bullet time, flash/particles, overshoot scale, 1536+ glow, game-over soft fade) but keeps haptics+sound; Reduced Motion is a preset, not a flag (FR-30, UX-DR-16).
- Sound+haptics coupled, scaling with value; minimal SFX via expo-audio (merge/spawn/game-over), cálido thock, no music, swappable observer (S8.6).

## Technical Decisions

- Hybrid rendering: declarative board from trace (src/render) + imperative feel layer worklets (src/feel); frame math in pure TS host-testable functions; worklet is thin binding.
- Pure TS FeelPreset + presetFor(value) — no logic inside presets; benchmark sweeps every preset (full and reduced).
- Engine remains pure TS single source of truth; feel/audio/haptics are observers of TilesMerged events; engine never throws, returns ok|rejected.
- State placement master rule: anything undo must revert lives in snapshot (ADR-06); sessionBestMerge in snapshot.
- Two-level benchmark (CI deterministic <2ms engine/<8ms frame + device p99 <16.7ms); Reduced Motion is sanctioned emergency fallback (ADR-04).
- expo-haptics SDK 57 pinned (impactAsync); expo-audio 57.0.3 SFX; Reanimated 4 worklets for feel.

## UX & Interaction Patterns

- Haptics map directly to merge weight; light tap for 3, decisive for heavy 12+; always tactile.
- Feel effects fire only on board tiles, never on preview card or score (chrome rule UX-DR-27).
- Bullet time is rare emotional peak; ordinary merges don't slow.
- Reduced Motion keeps game feel via haptics+sound while removing motion.

## Cross-Story Dependencies

- 8.1 (haptics data model + presetFor) is prerequisite for 8.2–8.4 (visual/shake/bullet use same FeelPreset) and 8.5 (Reduced Motion preset).
- 8.5 depends on 8.1–8.4 being present to gate.
- 8.6 (audio) couples to same value scaling as haptics but is swappable observer.
- All 8.x depend on Epic 1 (engine+board+trace) and respect ADR-01 purity boundaries.
