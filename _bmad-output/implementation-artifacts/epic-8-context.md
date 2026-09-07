# Epic 8 Context: Feel como momento

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Every merge lands as a physical moment — hand, eye, and ear confirm what the engine decided — with the biggest merge of the session staged as a single quiet peak, all of it tunable as data and safe to switch off without losing information.

## Stories

- Story 8.1: Haptics escalados
- Story 8.2: Punch visual overshoot + flash + partículas
- Story 8.3: Screen shake direcional contido
- Story 8.4: Bullet time no session-best
- Story 8.5: Reduced Motion preset total
- Story 8.6: SFX mínimos cálidos + haptics acoplados

## Requirements & Constraints

- The full core feel suite ships in MVP: scaled haptics, visual punch, directional shake, and bullet time. Only depth (larger shake, extra celebrations) stays out.
- Haptic bands are fixed: light on 3, medium on 6, heavy on 12 and above; Reduced Motion always keeps haptics.
- Visual punch scales with merged value: overshoot-and-snap plus flash and particle burst, with a one-frame shadow compress on landing.
- Shake is subtle and capped: around 2ms on medium merges, 5ms on large, never above 8ms.
- Bullet time fires only on a new session-best merge: about 200ms slowdown plus a single flash; all other merges stay quiet.
- A Reduced Motion setting gates the entire visual feel layer (shake, bullet, flash, particles, overshoot, glow, fade) while keeping haptics and sound; it doubles as the sanctioned emergency 60 FPS fallback.
- Performance is evidence, not a slogan: 60 FPS sustained over a 10-minute play session, CI benchmark gates engine cost per turn under 2ms and frame logic worst case under 8ms, device job p99 under 16.7ms per frame with the full feel preset; the benchmark sweeps the full preset.
- MVP audio is minimal SFX only — merge, spawn, game-over — bundled locally with no external assets and no music; volume and timbre scale with tile value coupled to the haptic; warm organic timbre is a hypothesis to validate with external players.
- Feel magnitudes are starting values flagged for playtest calibration; tuning happens through config data, never code changes.

## Technical Decisions

- Hybrid rendering: declarative trace-derived board plus an imperative feel layer in UI-thread worklets; frame math lives in pure testable TypeScript functions, worklets are thin bindings.
- Feel, audio, haptics, and telemetry are observers of engine events; they never touch rules and never drive state.
- Haptic selection is a pure band function over merged value; audio is an observer manager with preloaded bundled SFX.
- Session-best merge lives in the immutable snapshot alongside PRNG state, so undo rewinds the golden moment together with the board and never re-triggers bullet time.
- Bloom ceiling: outer bloom at most 12% of tile width and 35% opacity, transient with the merge splash, never over chrome, fully off under Reduced Motion.
- Feel layer lives in its own module with worklet effects (flash, particles, shake, slow-mo); worklets and frame math log nothing in release builds.
- Version pins: expo-haptics via SDK 57, expo-audio 57.0.3, react-native-reanimated 4.3.x with react-native-worklets 0.8.x as the Skia peer pair.

## UX & Interaction Patterns

- Feel fires on the board only; chrome (preview card, score) never animates with feel effects.
- Merged tile overshoots and snaps back with a proportional splash; the landing frame compresses the tile shadow for tactile closure.
- The 1536+ glow is the only glow in the system — scarcity is the message — and legibility of the bright tile plus neighbors must hold during the flash.
- Tone is calm and precise: the record stays a highlighted number, no confetti, no hype; the quiet bullet-time peak is the only celebration.
- Reduced Motion replaces visual feel with stillness while haptics and sound persist; game-over soft fade is part of the gated set.

## Cross-Story Dependencies

- Builds on the Epic 1 board: per-tile engine trace drives all feel triggers, and the S1.1 CI plus device benchmark is the gate that proves the full preset holds 60 FPS.
- Within the epic, Reduced Motion (8.5) gates the visual stories (8.2 punch, 8.3 shake, 8.4 bullet); haptics (8.1) and sound (8.6) persist underneath it and are coupled per merge.
- Undo integration (Epic 4 / Epic 7 snapshot contract): undo rewinds session-best and pending spawn together with the board, and a rewound position must not re-fire bullet time.
- Shares the soft-fade treatment with Epic 6 game-over and the immediate-apply timing question with Epic 9 accessibility (whether the Reduced Motion toggle takes effect mid-run is deferred to architecture confirmation).
