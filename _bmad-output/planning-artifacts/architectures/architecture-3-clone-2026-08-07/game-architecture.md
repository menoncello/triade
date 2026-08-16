---
title: 'Game Architecture'
project: '3-clone'
date: '2026-08-07'
author: 'Eduardo'
version: '1.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'React Native 0.86 + @shopify/react-native-skia 2.11 (Expo SDK 57)'
platform: 'iOS'

# Source Documents
gdd: '_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md'
epics: '_bmad-output/planning-artifacts/epics.md'
brief: 'null'
---

# Game Architecture

## Document Status

This architecture document is being created through the GDS Architecture Workflow.

**Steps Completed:** 9 of 9 (Complete)

---

## Executive Summary

**Tríade** is a mobile-first merge-puzzle game (4×4 slide board, `1+2` and equal
`≥3` merges) targeting iOS via React Native 0.86 + Skia 2.11 (Expo 57).

**Key Architectural Decisions:**
- A **pure TypeScript rules engine** behind a typed event/observer wall —
  render, feel, audio, and telemetry never touch rules (26 tests as the gate).
- **Score integrity by design** via a two-lane contract (Clean / Accelerated);
  monetization (RevenueCat + AdMob) and telemetry (Firebase) live in the app
  layer and can never alter spawn, merge, or score rules.
- **60 FPS as evidence** through a two-level benchmark (CI deterministic +
  scheduled device job); feel is data (presets) with Reduced Motion as the
  emergency profile.

**Project Structure:** Domain-driven organization with 15 core systems mapped
to explicit locations and hard architectural boundaries.

**Implementation Patterns:** 7 patterns defined (3 novel — Adaptive Spawn
Resolver, Lane Wall, Ambiguous Preview) plus a feel data model, ensuring AI
agent consistency.

**Ready for:** implementation via the S1.1 spike (engine port + Skia board +
CI benchmark).

---

## Project Context

### Game Overview

**Tríade** - mobile-first merge-puzzle game in the Threes tradition (4×4 slide board,
1+2 and equal ≥3 merges, merge-once, one-cell movement). Signature mechanic:
**Adaptive Spawn** (the game grows with the player's ceiling). Structural identity:
**Two Lanes** (Clean / Accelerated) with score integrity enforced by architecture.

### Technical Scope

**Platform:** iOS (React Native + Skia, touch-first); Web PWA secondary (frozen, no parity mandate)
**Genre:** Puzzle (score attack)
**Project Level:** High (production iOS release, monetized, accessibility + telemetry)

### Core Systems

| System | Complexity | Notes |
|---|---|---|
| Rules Engine (TypeScript) | High | Single source of truth; 26 tests; UI never duplicates rules |
| Skia Rendering + Animation | High | 60 FPS sustained; slide/merge/spawn driven by engine per-tile trace |
| Adaptive Spawn | Medium | Tiered pot by ceiling; fixed 40/40 1/2; configurable halving-decay curve |
| Two Lanes + Persistence | Medium | Lane rules, per-lane local leaderboards, lane memory |
| Monetization | High | Rewarded ads (undo/continue), IAP (hint/undo/no-ads); nothing alters rules |
| Game Feel | Medium | Scaled haptics, visual punch, shake, bullet time; Reduced Motion aware |
| Persistence | Medium | Best score, settings, purchases (app storage) |
| Telemetry | Medium | Crashlytics, retention/revenue funnel, GDPR consent, ATT |
| Accessibility | Medium | 44pt targets, VoiceOver, WCAG AA, light/dark/color-blind themes |

### Technical Requirements

- 60 FPS sustained during 10-min play on target iOS devices.
- Fully offline, single-player, no backend/accounts/networking.
- Instant startup and instant restart; no loading screens.
- Engine as single source of truth; UI consumes per-tile trace only.
- IAP/ads declarations + public privacy policy URL before submission (blocking).

### Complexity Drivers

- **High:** engine port fidelity (26 tests, identical behavior); Skia performance;
  monetization state (entitlements, restore, ad gating); score integrity across lanes.
- **Novel:** Adaptive Spawn (signature mechanic, configurable curve); Two Lanes integrity;
  ambiguous next-piece preview (60/40 exact/range, display roll separate from spawn).

### Architectural Principles (emerging)

- **Engine puro + eventos + observadores.** Rules engine owns state and emits
  events; render/feel/audio/telemetry observe. UI never duplicates rules.
- **Monetização no app, nunca no engine.** Entitlements (IAP, survive restore)
  vs. per-match budgets (free undo/continue, die with the match). Engine exposes
  atomic contracts (`undo()` → ok|rejected); the app decides policy.
- **Parede de lanes por contrato, não por confiança.** Clean profile has no
  assistance path; leaderboards never mix; nothing purchasable changes
  spawn/merge/score.
- **60 FPS as evidence, not a slogan.** Two-level benchmark: deterministic CI
  (engine + frame logic, declared budgets, from spike S1.1) and scheduled
  device job (p99, worst-case max-merge + full feel; Reduced Motion as the
  emergency profile).

### Technical Risks

- Skia rendering meeting 60 FPS with feel effects on iOS.
- Store certification (age rating, IAP/ads/privacy declarations).
- Integrity leak: anything purchasable must never change spawn/merge/score rules.
- Rule drift between engine and UI (mitigated by single-source-of-truth + tests).
- IAP restore edge cases (entitlements must survive reinstall; per-match budgets must not).
- Benchmark noise/flakiness making the 60 FPS gate untrustworthy.

---

## Engine & Framework

### Selected Engine

**React Native v0.86 + @shopify/react-native-skia v2.11** (via Expo SDK 57)

**Rationale:** Mandated by the GDD (RN + Skia for iOS). Verified current via
web/npm: RN 0.86.2, @shopify/react-native-skia 2.11.0 (MIT, active — 8.5k stars),
Expo SDK 57 (bundles RN 0.86). RN + Skia is a UI framework + GPU 2D library —
**not** a game engine — so the game's architectural decisions stay explicit
(see Remaining Architectural Decisions). Skia 2.11 peers: react >=19,
react-native >=0.78, react-native-reanimated >=4.0, react-native-worklets >=0.7.

### Pinned Version Matrix

Single source of truth for dependency versions (update only via spike/CI evidence).

| Package | Version | Notes |
|---|---|---|
| expo | 57.0.11 | SDK lockstep |
| react-native | 0.86.2 | Pinned by Expo 57 |
| @shopify/react-native-skia | 2.11.0 | MIT, active |
| react-native-reanimated | 4.3.x | Peer for Skia 2.11 |
| react-native-worklets | 0.8.x | Peer for Skia 2.11 |
| react-native-mmkv | ^4.3.2 | Storage (S1.4 decision: MMKV over AsyncStorage) |
| expo-secure-store | ~57.0.1 | Entitlements mirror (S1.4) |
| expo-asset | ~57.0.11 | Asset preload (S1.4) |
| expo-haptics | (SDK 57) | Scaled feel |
| react-native-purchases | 10.7.0 | RevenueCat IAP |
| react-native-google-mobile-ads | 16.4.0 | AdMob rewarded + UMP |
| @react-native-firebase/app + crashlytics + analytics | 26.1.0 | Telemetry |
| expo-audio | 57.0.3 | Minimal SFX |
| expo-secure-store | ~57.0.1 | Entitlements mirror |
| i18next + react-i18next | 26.3.6 | i18n (v1) |
| expo-localization | (SDK 57) | Device locale |
| expo-tracking-transparency | 57.0.1 | ATT prompt |

Rules: `npx expo install` respects this matrix; no ad/IAP/telemetry lib may
lag the SDK. Expo Go is **not** a target — development build only.

### Project Initialization

Starter: **Expo SDK 57** (TypeScript). Use a **development build**, not Expo Go
(required for 60 FPS, Skia, and native modules).

```bash
npx create-expo-app@latest triade --template blank-typescript
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets expo-haptics
```

### Engine-Provided Architecture

| Component | Solution | Notes |
|---|---|---|
| Rendering | Skia via CanvasKit (Ganesh; Graphite experimental) | GPU 2D; 60 FPS target |
| Input | RN touch/gesture system | Swipe ~20px threshold; pointer capture |
| Build | Expo prebuild + Xcode + Metro | Native iOS build via CNG |
| JS Runtime | Hermes + Reanimated 4 (worklets) | 60 FPS animation on UI thread |
| UI Tree | React declarative components | Views never duplicate engine rules |
| Haptics | expo-haptics (native) | Scaled by merge value (S8.1) |

### S1.1 Spike Benchmark (two-level, from day 1)

**Level 1 — deterministic (CI, every PR):** pure TypeScript, no device.
Frame math isolated in pure functions; worklet is a thin binding over the same
math. Measures:
- **Engine cost per turn** (spawn + merge-once + game-over detection + Adaptive
  Spawn pot): budget **< 2 ms**.
- **Frame logic worst case** (slide merging 4 locked pairs simultaneously):
  budget **< 8 ms**.

**Level 2 — device job (scheduled, physical iOS):** real GPU, p99. Includes the
**worst case**: max-merge + full feel suite (flash + particles + shake +
overshoot-and-snap + bullet time). Budget: **p99 < 16.7 ms/frame** with feel
preset "full". Feel is **data, not code** — declarative presets (duration,
easing, intensity per tile value) that the benchmark sweeps. **Reduced Motion**
is the official emergency profile: if the full preset exceeds budget, the
reduced preset (already required for accessibility) is the sanctioned fallback,
never game-killing code.

Deliverable: the benchmark ships **in the same PR as the S1.1 spike**, not as
a follow-up. Initial numeric budgets are hypotheses to be tuned by spike
evidence (accepted as starting hypotheses 2026-08-07).

### S1.1 Spike Results (2026-08-08)

**Result: PASS — the RN + Skia migration is de-risked. Engine ports cleanly,
one Skia board renders from the engine snapshot, and the deterministic CI
benchmark gate ships in the same PR. Full UI rewrite greenlit on this basis
(FR-5 satisfied).**

**Engine port (ADR-01 verified):** `js/game.js` (233 lines, UMD dual-env)
ported to `triade/src/engine/core/` as pure TypeScript — `canMerge`,
`mergeValue`, `shiftLine` (front-to-back, merge-once, one-cell),
`movementLines`, `boardFromLines` + trace, `boardsEqual`, `spawnTile`,
`newGame`, `move` (effective-move-only spawn), `isGameOver`. `move()` returns
`{ board, score, moved, trace }` with the exact per-tile trace contract; `rng`
remains injectable (default `Math.random`). The 26 web unit tests pass
**unchanged** against the TS engine via `node --test` (Node 26 native type
stripping, no build step). The engine module tree imports nothing from
RN/React/Skia/Expo — ADR-01 is enforced physically by the directory layout.
Web PWA (`js/game.js` + `test/game.test.js`) remains frozen and green (65/65
tests across both suites when run from the repo root — 26 web + 39 triade).

**Deterministic CI benchmark (Level 1, ships in this PR):**
- Engine cost per turn (spawn + merge-once + game-over detection, 10k effective
  turns, mulberry32 fixed seed): measured median **~0.001 ms** (budget gate
  **< 0.1 ms**, ~100x headroom).
- Frame-logic worst case (slide merging 4 locked pairs simultaneously):
  measured p99 **~0.001 ms** (budget gate **< 0.2 ms**, ~100x headroom).
- Deterministic on Node (fixed seed, median/p99 of samples, no wall-clock flake);
  budgets assert-fail the PR via `node --test`. Gate wired into
  `.github/workflows/ci.yml` (Node 26, `npm ci`, `tsc --noEmit`, `node --test`).

**Dev-build viability:** Expo SDK 57 `blank-typescript` scaffolded at
`triade/`; spike-scoped deps only (`@shopify/react-native-skia`,
`react-native-reanimated`, `react-native-worklets`). `expo prebuild` generated
the native iOS/Android projects; `expo export --platform ios` bundles the full
app including the Skia board (1208 modules) — Metro/Skia import chain verified
without a device. One static 4×4 Skia board renders from a deterministic engine
snapshot in `triade/src/render/GameBoard.tsx`; a Reanimated
`useFrameCallback` hook (`useFrameRateBaseline`) records the on-device
baseline (fps, p99) — the AC 4 device job remains a physical-device gate to be
run by the developer on the bench.

**Storage decision (S1.4 dependency):** NOT measured in this spike. The
optional AsyncStorage vs MMKV micro-benchmark (T4.5) is deferred — installing
the storage stack is out of spike scope (T1.2). S1.4 will run it.

**Storage decision (S1.4 resolved, 2026-08-14):** AsyncStorage vs MMKV
micro-benchmark (T4.5) completed. Native differential measured on the iOS
Simulator (iPhone 17 Pro, Xcode 26.6) via a temporary in-app harness over 10
keys / 2000 reads:
- **AsyncStorage (`@react-native-async-storage/async-storage` 2.2.0):**
  write `setItem` median 0.2813 ms (p99 0.2957 ms); read `getItem` median
  0.0270 ms (p99 0.0450 ms).
- **MMKV (`react-native-mmkv` 4.3.2):** write `set` median 0.0019 ms
  (p99 0.0048 ms); read `getString` median 0.0008 ms (p99 0.0010 ms);
  `getAllKeys` (10 keys) 0.0099 ms.
- **Decision: MMKV.** Read ~34x faster, write ~148x faster (median) on the
  native startup/read path, which the S1.1 spike designated as the decisive
  measurement (the Node JS-layer cost is the CI gate). MMKV reads are
  synchronous (no async bridge), matching the settings/best-score hot read at
  session start. The CI-gated JS payload layer (pure `schema.ts`
  serialize→load round-trip) measured < 0.1 ms median under `node --test`.
  Pinned: `react-native-mmkv` ^4.3.2 (promoted to `dependencies`;
  AsyncStorage removed).

**Pinned Version Matrix correction (spike evidence):** `npx expo install`
resolves SDK-57 lockstep versions that differ from the matrix's earlier
hypotheses — `@shopify/react-native-skia` **2.6.2** (not 2.11.0),
`react-native-reanimated` **4.5.1** (not 4.3.x), `react-native-worklets`
**0.10.1** (not 0.8.x). These are the versions pinned for the RN app and
must be the source of truth going forward.

**Open device gates (story 1-1, status: review):**
- T1.4 — dev-build boot on a physical iOS device (Metro + Xcode via Expo
  prebuild; requires connected device + CocoaPods).
- T5.2 — on-device frame-rate baseline (fps + p99) via the shipped
  `useFrameRateBaseline` hook in `triade/src/render/`. This is the baseline for
  the device-level p99 < 16.7 ms job (S1.1 Level 2).
- T4.5 — AsyncStorage vs MMKV micro-benchmark **resolved 2026-08-14 in S1.4**
  → **MMKV** (see "Storage decision (S1.4 resolved)" note above).

**Simulator validation (2026-08-10, iOS Simulator — iPhone 17 Pro, Xcode 26.6):**
- T1.4 partial — the Expo SDK 57 dev build boots and the static 4×4 Skia board
  renders in the **iOS Simulator** (native runtime; no Apple Developer account
  needed). Metro/Skia/Reanimated import chain verified end-to-end on an iOS
  runtime. A Worklets bug surfaced during recording — `setStats` called from the
  UI thread worklet (Remote Function error) — fixed by wrapping the state update
  in `runOnJS` (`useFrameRateBaseline.ts`).
- T5.2 informative — `useFrameRateBaseline` recorded **60 fps · p99 16.67ms ·
  120 frames** (simulator). This is a smoke/informative reading only: the
  simulator renders on the Mac GPU, so the numbers do not reflect device
  performance. The **physical-device p99 < 16.7 ms baseline remains open** (AC-4
  strict evidence still requires an iPhone + Apple Developer account for code
  signing).

### Remaining Architectural Decisions

The following decisions were identified here in Step 3 and **resolved in
Step 4 — see [Architectural Decisions](#architectural-decisions)** for the
chosen approaches:
- Game loop / timing (turn-based; no fixed-step loop required)
- Rendering architecture: imperative Skia draw loop vs declarative (per-tile trace)
- Animation strategy on Reanimated 4 (slide/merge/spawn, bullet time)
- State management (engine purity; per-tile trace as the render contract)
- Navigation/flow (tone screen → lane select → game → game over)
- Persistence layer (best score, settings, entitlements, per-match budgets)
- Service boundaries (monetization gateway, telemetry as observers)
- Monetization integration (expo-in-app-purchases + rewarded ads)
- Telemetry (Crashlytics, funnel events, GDPR consent, ATT)
- Theming + accessibility (light/dark/color-blind, WCAG AA, VoiceOver, 44pt)

### AI Development Tools (MCP)

- **Context7** (`upstash/context7`) — current docs for RN/Skia/Reanimated/Expo
  via MCP. Installed in the user's global opencode config. No Skia-specific
  MCP exists (verified 2026-08 — 0 GitHub results).

---

## Architectural Decisions

### Decision Summary

| Category | Decision | Version | Rationale |
|---|---|---|---|
| Rendering | Hybrid: declarative board (from trace) + imperative feel layer (worklets) | Skia 2.11 / Reanimated 4 | Testable + feel control; observers |
| State & Undo | Immutable snapshots; `move(state,dir) → {state',events}`; undo stack (Accelerated) | — | Deterministic; trivial cost on 4×4 |
| Game Loop | Turn-based, event-driven; no fixed-step loop | — | Board is discrete; Reanimated owns animation |
| Persistence | Layers: AsyncStorage/MMKV + SecureStore (entitlements) + memory (budgets) | — | Entitlements survive restore; budgets die with match |
| Navigation | Screen-state machine; game-over as overlay | — | Instant restart; zero loading screens |
| Monetization | RevenueCat (IAP) + AdMob rewarded | purchases 10.7.0 / ads 16.4.0 | Entitlements/restore first-class; UMP consent |
| Telemetry | Firebase Crashlytics + Analytics | @react-native-firebase 26.1.0 | GDD-mandated; one vendor; consent mode |
| Audio | expo-audio minimal SFX manager (observer) | expo-audio 57.0.3 | MVP minimal; swappable layer |
| Theming/A11y | Theme tokens as data; shape+text beyond color; WCAG AA; 44pt | — | E9 as standard |
| i18n | i18next + react-i18next + expo-localization | i18next 26.3.6 | PT/EN v1; tier names ready for v2 |
| Asset Loading | Preload all (bundled, no CDN) | expo-asset | Tiny asset set; offline self-contained |

### Rendering — Hybrid

Board, tiles, slide/merge/spawn are **declarative, derived from the engine's
per-tile trace** (single source of truth; testable). The **feel layer**
(particles, shake, flash, bullet time) is **imperative in worklets** on the UI
thread. Frame math lives in **pure TS functions** (host-testable); the worklet
is a thin binding — the same split that powers the CI benchmark.
**Boundary rule:** *"estado vem do trace, espetáculo é worklet"* — tile motion
from the trace is declarative; scene effects (flash, particles, camera, slow-mo)
are imperative worklets.

### State Management & Undo

Engine is a **pure TS module**: `move(state, dir) → { state', events }`.
State is **immutable** and **includes the PRNG state**; the Accelerated lane
keeps an **undo stack of snapshots** so undo is a **true rewind** (same next
spawn — prerequisite for seeded Daily Puzzle in v2). `undo()` is the atomic
contract `ok | rejected` (app decides policy via entitlement; engine never
knows about monetization).

### Game Loop & Timing

**Turn-based, event-driven. No simulation loop.** Input → `move()` → events →
observers (render, feel, audio, haptics, telemetry) animate via Reanimated 4
springs/timings. Bullet time = a 200ms timing config on the session's biggest
merge. A tiny sequencer may stagger spawn/feel effects; no fixed tick.

### Data Persistence

- **Settings / best score / lane memory** → AsyncStorage or MMKV — **decided by
  the S1.1 spike benchmark** (startup/read cost), not by preference. **Resolved
  in S1.4: MMKV** (see "Storage decision (S1.4 resolved)" above).
- **Entitlements** (IAP: no-ads, packs) → `expo-secure-store`. **Precedence:**
  the SecureStore mirror is **authoritative offline**; RevenueCat reconciles
  when the network returns and **never downgrades** a held entitlement.
- **Per-match budgets** (free undo, continue, hint counts) → memory only;
  die with the match.

**Device offline validation (S1.4, 2026-08-15):** dev build (Release,
`npx expo run:ios --device --configuration Release`) booted on **iPhone 14 Pro,
iOS 26.6**. Airplane mode on (Wi-Fi off): app launched instantly (no loading
screen, NFR-3), full play session with no network, no crash. Best score + a
settings write survived a full process kill/reload while still offline (2 runs;
MMKV on-device store restored the persisted best, NFR-2 / FR-4 / AC-2). AC-1
(NFR-2/NFR-3) closed on hardware; SecureStore entitlement mirror verified on
simulator previously. Native runtime = manual validation per project rules —
evidence recorded here, not in CI.

### Navigation & Flow

**Screen-state machine** (no nav library): Tone (~2s, first launch) → Lane
Select → Game. **Game over is an overlay** in the GameScreen (S6.1 stats shown
immediately). Restart = reset store → new match, no navigation.

### Monetization

**RevenueCat** (`react-native-purchases` 10.7.0) for the 3 products (hint
5-pack, undo 3-pack, no-ads+unlimited undo) with restore/entitlements;
**AdMob** (`react-native-google-mobile-ads` 16.4.0) for rewarded ads (undo,
death-continue) + UMP GDPR consent. Both via Expo config plugins. Nothing
purchasable alters spawn/merge/score; leaderboards never mix lanes.

### Telemetry

**Firebase Crashlytics + Analytics** (`@react-native-firebase` 26.1.0) as an
**observer**. Crash-free sessions + retention/revenue funnel events. Consent
mode pairs with AdMob UMP; ATT via `expo-tracking-transparency` 57.0.1.
Telemetry never blocks or alters gameplay.

### Audio

**expo-audio 57.0.3** AudioManager — minimal SFX (merge/spawn/game-over),
volume scaled by tile value, coupled with `expo-haptics`. Thin, swappable
layer; full sound identity deferred to v2.

### Theming & Accessibility

Theme tokens as **pure data** (light/dark/color-blind palettes), consumed by
Skia and RN views. Merges communicated by **shape + text** beyond color (WCAG
AA). Touch targets ≥44pt. VoiceOver announces tile value + position via
engine-derived labels. Reduced Motion flag is the sanctioned feel fallback.

### Internationalization

**i18next** (26.3.6) + react-i18next + `expo-localization`, in v1. String keys
for lane names ("Iniciante"/"Beginner"), tutorial copy, HUD. i18n is a single
layer — strings never leak into board logic. Ready for named tier strings in v2.

### Asset Management

**Preload all** at startup — 13 tile color tiers, board, icon, 3 SFX —
bundled via expo-asset. No CDN, offline self-contained (GDD constraint).

### Architecture Decision Records (key)

- **ADR-01 Engine purity:** rules live in a pure TS module; UI/feel/audio/
  telemetry are observers; UI never duplicates rules (26 tests as the gate).
- **ADR-02 Monetization boundary:** entitlements vs per-match budgets; engine
  exposes atomic contracts; nothing purchasable changes rules (P3 by
  architecture). SecureStore mirror authoritative offline; RevenueCat
  reconciles without downgrading.
- **ADR-03 Lane wall:** Clean profile has no assistance path; leaderboards
  never mix; enforced by contracts, not trust.
- **ADR-04 60 FPS as evidence:** two-level benchmark (CI deterministic +
  scheduled device job); Reduced Motion as emergency profile.
- **ADR-05 Hybrid rendering:** declarative trace-derived board + imperative
  feel layer; frame math pure and host-testable.
- **ADR-06 Deterministic undo:** immutable snapshots include PRNG state, so
  undo is a true rewind and seeded runs (v2 Daily Puzzle) stay reproducible.

---

## Cross-cutting Concerns

These patterns apply to ALL systems and must be followed by every implementation.

### Error Handling

**Strategy:** Hybrid — the **engine never throws**; it returns `Result`
objects (the same `ok | rejected` atomic contract as `undo()`). I/O and native
calls (purchase, ad, storage, telemetry) are wrapped and funneled to a
**global handler** that logs and forwards to Crashlytics. Recoverable errors
never pause gameplay; **game over is a state, not an error**; errors are never
player-visible.

**Error Levels:**
- **Recoverable** (engine `rejected` result): normal control flow — NOOP move,
  rejected undo, declined purchase. No crash logging.
- **Unexpected** (I/O, native): try/catch → global handler → ERROR log →
  Crashlytics. Silent to the player.

**Example (engine, pure):**
```ts
type MoveResult =
  | { ok: true; state: GameState; events: EngineEvent[] }
  | { ok: false; reason: 'noop' | 'game-over' | 'locked' }

function move(state: GameState, dir: Direction): MoveResult {
  // pure — never throws, never touches UI/monetization/storage
}
```

### Logging

**Format:** structured JSON via a single `Logger` service
**Destination:** console (dev); ERRORs routed to Crashlytics (release)
**Log Levels:**
- **ERROR** — unexpected (goes to Crashlytics)
- **WARN** — handled anomaly (e.g., entitlement reconciliation drift)
- **INFO** — milestones: match start/end, purchase, rewarded-ad complete
- **DEBUG / TRACE** — dev builds only (`__DEV__`)

Performance-critical paths (frame math, worklets) **log nothing in release**.

### Configuration

**Approach:** typed modules — no magic strings or scattered literals.

**Configuration Structure:**
- **Engine constants** — immutable rules: 4×4 grid, merge-once, fixed 40/40 `1/2`
  weights. Compiled into the engine module.
- **`spawnConfig`** — the Adaptive Spawn curve (one weight per tile value);
  **data, not code**, validated by engine tests (pot always sums to 20%).
- **Player settings** — theme, reduced motion, language, lane default;
  persisted (AsyncStorage) via a typed settings store.
- **Platform** — Expo `app.json` + config plugins.

### Event System

**Pattern:** typed **Observer** — engine emits typed event objects; observers
subscribe directly. No central stringly-typed bus; sync dispatch; a
dev-only recorder captures history for debugging. No message queue.

**Event Naming:** PascalCase past-tense event objects with a discriminated
`type` field.

**Example:**
```ts
interface TilesMerged {
  type: 'TilesMerged'
  value: number
  from: [Cell, Cell]
  to: Cell
}
type EngineEvent =
  | TilesMerged | PieceSpawned | ScoreChanged | MatchOver | LaneChanged
// observers: render, feel, audio, haptics, telemetry — subscribe to the stream
```

### Debug Tools

**Available Tools (dev builds only, `__DEV__`):**
- **State inspector** — current immutable snapshot view.
- **Event recorder** — replay engine events for diagnosis.
- **Perf hooks** — frame timings feeding the benchmark.
- **Seed control** — set PRNG seed for reproducible runs (pairs with ADR-06).
- **Spawn override** — force tile values for playtest.

**Activation:** dev gesture (shake / long-press on logo). **Never compiled into
release builds.** (Production observability is telemetry, per GDD.)

---

## Project Structure

### Organization Pattern

**Pattern:** Domain-Driven

**Rationale:** The rules engine is an **isolated pure domain** (`src/engine`, no
RN/React/Skia imports); observers (`render`, `feel`, `ui`, `services`) are
separate domains. This makes the engine/UI wall physically enforce ADR-01 —
no agent can slip rules into the view layer.

### Directory Structure

```
triade/
├── src/
│   ├── engine/                  # PURA TS — rules, no RN/React/Skia
│   │   ├── core/                # grid, move, merge, spawn, game-over, RNG
│   │   ├── config/              # spawnConfig.ts (curve), constants.ts
│   │   └── events.ts            # typed EngineEvent (discriminated)
│   ├── game/                    # orchestration: state machine, undo stack, lanes
│   ├── render/                  # Skia board — declarative, derived from trace
│   ├── feel/                    # worklet effects — particles, shake, bullet time
│   ├── ui/                      # RN views: HUD, lane select, tone, game-over, settings
│   ├── services/                # app layer: native SDKs
│   │   ├── monetization/        # RevenueCat + AdMob gateways
│   │   ├── telemetry/           # Firebase observer
│   │   ├── audio/               # expo-audio observer
│   │   └── storage/             # AsyncStorage/MMKV + SecureStore
│   ├── state/                   # app store: screens, settings, entitlement mirror
│   │                            #   (NOT the board — see Boundaries)
│   ├── theme/                   # tokens (light/dark/color-blind)
│   ├── i18n/                    # i18next strings
│   ├── dev/                     # __DEV__ tools: inspector, recorder, seed, perf
│   └── utils/                   # logger, result.ts, helpers
├── assets/
│   ├── tiles/                   # 13 color tiers, generated by script
│   ├── audio/sfx/               # merge, spawn, game-over
│   └── ui/                      # board, icon
├── benchmarks/                  # deterministic CI benchmark (Node, pure math)
├── __tests__/                   # engine/ (26 ported) + services/ + render/
├── app.json                     # Expo config + plugins
├── package.json
└── tsconfig.json
```

### System Location Mapping

| System | Location | Responsibility |
|---|---|---|
| Rules engine | `src/engine/core` | Pure rules; the 26 tests |
| Adaptive Spawn | `src/engine/config/spawnConfig.ts` | Curve (data) + pot resolution |
| Render (Skia) | `src/render` | Declarative board from trace; **tile overshoot/snap** |
| Feel effects | `src/feel` | Imperative worklets: **flash, particles, shake, slow-mo** |
| HUD/UI | `src/ui` | Views; a11y; i18n |
| Screen-state machine | `src/game` | Flow; lanes; undo stack |
| Monetization | `src/services/monetization` | RevenueCat/AdMob gateways |
| Telemetry | `src/services/telemetry` | Firebase observer |
| Audio | `src/services/audio` | expo-audio observer |
| Persistence | `src/services/storage` | AsyncStorage/MMKV + SecureStore |
| Theme | `src/theme` | Tokens |
| i18n | `src/i18n` | Strings |
| Dev tools | `src/dev` | Inspector, recorder, seed, perf (`__DEV__`) |
| CI Benchmark | `benchmarks/` | Deterministic, Node, every PR |
| Engine tests | `__tests__/engine` | 26 ported tests |

### Naming Conventions

#### Files
- **TS modules:** camelCase — `move.ts`, `spawn.ts`
- **RN/Skia components:** PascalCase — `GameBoard.tsx`, `LaneSelectScreen.tsx`
- **Assets:** kebab-case — `tile-48.png`, `sfx-merge.wav`
- **Tests:** `.test.ts` — `move.test.ts`

#### Code Elements
| Element | Convention | Example |
|---|---|---|
| Classes | PascalCase | `AudioManager` |
| Functions | camelCase | `applyMove(state, dir)` |
| Variables | camelCase | `undoStack` |
| True constants | UPPER_SNAKE | `GRID_SIZE = 4` |
| Config (data) | camelCase | `spawnConfig` |
| Events | PascalCase + `type` | `TilesMerged`, `MatchOver` |

#### Game Assets
- Tile tiers by value: `tile-<value>.png` (e.g. `tile-48.png`)
- SFX by action: `sfx-<action>.wav` (e.g. `sfx-merge.wav`, `sfx-spawn.wav`)

### Architectural Boundaries

1. `src/engine` **never imports** RN/React/Skia/Expo — it is the only place
   with game rules.
2. `render`, `feel`, `ui`, `services` only **consume events/trace**; they never
   mutate engine state.
3. `src/game` is the **only orchestrator** (undo stack + lane wall).
4. `spawnConfig` is **data**, validated by tests; never scattered literals.
5. `src/dev` tooling is `__DEV__`-only; never compiled into release.
6. **The board never lives in `src/state`.** The store holds screens, settings,
   and the entitlement mirror only — engine snapshots stay in the engine.
7. **Feel boundary:** tile overshoot/snap follows the trace (declarative →
   `render`); scene spectacle (flash, particles, shake, slow-mo) → `feel`
   (imperative worklets).
8. `benchmarks/` runs in CI on pure engine math (Node), independent of `__DEV__`
   and of the RN runtime.

---

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents.

### Novel Patterns

#### N1 — Adaptive Spawn Resolver

**Purpose:** The signature mechanic — the spawn pot grows with the board
ceiling, driven entirely by data, never by scattered literals.

**Components:**
- `spawnConfig` — the curve (one weight per tile value); data, validated.
- `ceilingDetector` — largest tile on the board → tier.
- `potResolver` — tier → pot values with halving decay.
- `weightedPicker` — picks from the combined distribution (uses RNG state).

**Data Flow:** ceiling → tier → pot (halving decay normalized to the 20% pot
weight) + fixed 40/40 `1`/`2` → weighted pick → `PieceSpawned` event.

**State Management:** pure function — no state; RNG state lives in the
immutable snapshot (ADR-06).

**Implementation Guide:**
```ts
function resolveSpawn(config: SpawnConfig, ceiling: number, rng: RngState): SpawnResult {
  const fixed = { 1: 0.4, 2: 0.4 }
  const pot = potForTier(config, tierForCeiling(ceiling))   // {3:1, 6:0.5, ...}
  const norm = normalizeTo(config.potWeight, pot)           // sums to 0.2
  return pick(rng, { ...fixed, ...norm })
}
```

**Usage:** anywhere a spawn happens (effective move only); the next-piece
preview reads the pre-resolved pending spawn (N3), never re-rolls.
**Float rule:** the pot test uses **epsilon tolerance**, and `weightedPicker`
**always re-normalizes** — it never trusts its input to sum exactly.

#### N2 — Lane Wall (profile + contracts)

**Purpose:** score integrity enforced by architecture (P3) — Clean never sees
assistance; leaderboards never mix.

**Components:**
- `LaneProfile` — data describing allowed actions + leaderboard id.
- `MatchOrchestrator` (`src/game`) — the only layer that knows lanes.
- Atomic contracts — `canUndo`, `undo(): ok | rejected`; engine stays
  monetization-agnostic.

**Data Flow:** lane select → profile → orchestrator gates actions per turn →
leaderboard routed on match end.

**State Management:** profile is data; per-match budgets live in memory
(Accelerated only) and die with the match.

**Boundary:** the lane is exposed to the **app (services)** — monetization
reads the app state to decide ad/IAP offers — **never to the engine**. The
engine sees only the atomic contract.

**Implementation Guide:**
```ts
type LaneProfile =
  | { id: 'clean'; undo: false; leaderboard: 'clean' }
  | { id: 'assisted'; undo: { free: number; iap: number }; leaderboard: 'assisted' }
```

**Usage:** the profile is read by the orchestrator at every interaction point
(undo, hint, continue, ad offer); Clean has no code path for these.

#### N3 — Ambiguous Preview (display roll)

**Purpose:** the preview is informational only — it never alters the spawn.

**Components:**
- Spawn resolver (source of truth) — **pre-resolves the next spawn**.
- `pendingSpawn` in the immutable snapshot — real value + display roll.
- Preview renderer — **reads** pendingSpawn, never re-rolls.

**Data Flow:** on effective move, engine resolves the *next* pendingSpawn →
HUD reads it (60% exact / 40% contiguous range containing the real value) →
board spawn materializes the pending value on the following effective move.

**State Management:** `pendingSpawn` lives in the snapshot (so undo rewinds it
with the board — ADR-06). The UI **never rolls**; it only displays.

**Invariant test:** *the 60/40 display decision never alters the materialized
spawn* — the placed tile always equals the pre-resolved `pendingSpawn.value`.

**Implementation Guide:**
```ts
function previewFor(pending: PendingSpawn): Preview {
  return pending.displayRoll < 0.6
    ? { kind: 'exact', value: pending.value }
    : { kind: 'range', values: contiguousWindowContaining(pending.value, tierFor(pending.value)) }
}
```

**Usage:** HUD only, both lanes (strategy info, not a learning aid).

### Feel Data Model

**`FeelPreset`** — feel is **data, not code**. Per tier band:
```ts
type FeelPreset = {
  haptic: 'light' | 'medium' | 'heavy'   // expo-haptics mapping
  shakeMs: number                        // 2 / 5, capped 8
  particleBurst: number                  // splash scale
  overshootMs: number                    // render-side (declarative)
  flash: boolean
}
const FEEL_PRESETS: Record<TierBand, FeelPreset> = { ... }
```
- `presetFor(value)` is a **pure, tested** function — no logic inside presets.
- **Reduced Motion is a preset**, not a flag (reduces shake, cuts flash/slow-mo,
  keeps haptics + sound).
- The benchmark **sweeps every preset** (full and reduced profiles).
- **`sessionBestMerge` lives in the snapshot** — bullet time fires only on a new
  session record; undo rewinds it with the board.

**Master rule — state placement:** *anything the undo must revert lives in the
snapshot.* One criterion for every future state field (longest streak, etc.).

### Communication Patterns

**Pattern:** Typed Observer — engine emits typed event objects; observers
subscribe directly. Sync dispatch; no stringly-typed bus; dev-only recorder.

**Example:**
```ts
engine.on('TilesMerged', (e) => { feel.celebrate(e); audio.play('merge', e.value) })
```

### Entity Patterns

**Creation:** Tiles are **data-driven values** from a 13-tier catalog
(`tileFor(value)`), not instantiated objects — no factory needed. **Object
pooling only for particles** in the feel layer (worklets).

**Example:**
```ts
const tile = tileFor(48) // { value: 48, color: theme.tiles[48], glyph: shapeFor(48) }
```

### State Patterns

**Pattern:** Explicit state machine — match lifecycle
(`playing → game-over`, undo/hint only in `playing`) plus the screen-state
machine (tone → lane select → game).

**Example:**
```ts
type MatchState = 'playing' | 'game-over'
```

### Data Patterns

**Access:** Typed module access — single access points for `spawnConfig`,
`theme`, `i18n`, settings. No scattered literals; config is data validated by
tests.

**Example:**
```ts
const pot = spawnConfig.potWeight       // data, not magic number
const label = t('lane.beginner')        // i18n, never inline
```

### Consistency Rules

| Pattern | Convention | Enforcement |
|---|---|---|
| Game rules | only in `src/engine/core` | import rule: engine never imports RN; UI never imports core |
| Events | typed, discriminated `type` | TS exhaustiveness; stringly bus forbidden |
| Result | `ok \| rejected`; engine never throws | lint: no `throw` in engine |
| Config | data in camelCase module, validated | unit test (pot sums to 20%, epsilon) |
| Feel | presets are data; `presetFor` pure | test sweeps all presets |
| State placement | undo-reversible state lives in snapshot | review: no counter outside snapshot |
| i18n | always `t('key')` | review: no inline UI strings |

---

## Architecture Validation

### Validation Summary

| Check | Result | Notes |
|---|---|---|
| Decision Compatibility | PASS | Engine purity + patterns + cross-cutting align; no conflicts |
| GDD Coverage | PASS | All core systems + technical requirements supported |
| Pattern Completeness | PASS | Creation, communication, state, error, data, events |
| Epic Mapping | PASS | All 11 epics mapped to locations + patterns |
| Document Completeness | PASS | Executive summary added; stale section updated |

### Coverage Report

**Systems Covered:** 15/15
**Patterns Defined:** 7 (3 novel + 4 standard) + feel data model
**Decisions Made:** 11

### Issues Resolved

1. Missing executive summary → added (2-3 sentences).
2. Stale "Remaining Architectural Decisions" (Step 3) → repointed to Step 4 resolutions.

### Validation Date

2026-08-07

---

## Development Environment

### Prerequisites

- **Node.js ^20.19.4** (React Native 0.86 requirement)
- **Xcode + CocoaPods** (iOS builds; Expo prebuild)
- **Expo CLI** (via `npx`); development build — **Expo Go is not a target**
- **Watchman** (dev file watching)
- **Physical iOS device** for the scheduled device benchmark job

### AI Tooling (MCP Servers)

| MCP Server | Purpose | Install Type |
|---|---|---|
| Context7 (`upstash/context7`) | Current docs for RN/Skia/Reanimated/Expo | Local (npx), installed in the user's global opencode config |

**Setup:** already installed in `~/.config/opencode/opencode.jsonc` — restart
opencode to load it. No engine-specific MCP exists for RN/Skia (verified
2026-08); Context7 covers current API docs.

### Setup Commands

```bash
npx create-expo-app@latest triade --template blank-typescript
cd triade
npx expo install @shopify/react-native-skia react-native-reanimated \
  react-native-worklets expo-haptics expo-secure-store expo-audio \
  expo-localization expo-tracking-transparency
npx expo install react-native-purchases react-native-google-mobile-ads \
  @react-native-firebase/app @react-native-firebase/crashlytics \
  @react-native-firebase/analytics i18next react-i18next
```

Then configure Expo **config plugins** in `app.json` (skia, reanimated,
worklets, google-mobile-ads, revenuecat, firebase) and verify the **Pinned
Version Matrix**.

### First Steps

1. Run the setup commands above (versions per the Pinned Version Matrix).
2. **S1.1 spike:** port the engine to TypeScript (26 tests passing), render one
   4×4 board in Skia, and plant the **CI benchmark in the same PR**.
3. Configure MCP (Context7 already installed; restart opencode).
4. Validate the config plugins and build the iOS development build.
