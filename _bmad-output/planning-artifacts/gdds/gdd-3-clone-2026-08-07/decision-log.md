# Decision Log — Tríade (3-clone) GDD

**Workspace:** `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/`

## D-001 — Workspace created
- **Date:** 2026-08-07
- **Decision:** Create intent confirmed; workspace created with `gdd.md` skeleton (Puzzle game type) and `decision-log.md`.
- **Rationale:** No existing GDD; PRD (`prd-3-clone-2026-08-06`) exists and explicitly delegates mechanics tuning, audio direction, progression to the GDD.
- **Status:** Closed

## D-002 — Game type confirmed: Puzzle
- **Date:** 2026-08-07
- **Decision:** Game type is **Puzzle** (medium complexity). Puzzle genre sections (Core Puzzle Mechanics, Puzzle Progression, Level Structure, Player Assistance, Replayability) loaded from the genre guide.
- **Status:** Closed

## D-003 — Working mode: Facilitative
- **Date:** 2026-08-07
- **Decision:** Facilitative mode — walk design-requiring sections section by section; user authors the design.
- **Status:** Closed

## D-004 — Game pillars defined
- **Date:** 2026-08-07
- **Decision:** Four pillars confirmed by author: **P1 Maestro do Caos**, **P2 The Merge as Moment**, **P3 Fair by Design**, **P4 Identity over Clone**. P4 framed as identity/context pillar, not pure gameplay.
- **Status:** Closed

## D-005 — Core Gameplay Loop confirmed
- **Date:** 2026-08-07
- **Decision:** Reading-driven micro-loop (Read → Plan → Swipe → Spawn → Repeat), with the session's biggest merge (bullet time ~200ms) as the emotional engine; macro-loop across sessions with lane choice, game-over stats, one-tap restart, per-lane leaderboard. **Win/Loss:** no formal win — score attack; loss = game over (grid full, no mergeable pair); mini-victories = ceiling-tier crossings and new color tiers.
- **Status:** Closed

## D-006 — Mechanics transcribed from frozen spec + PRD
- **Date:** 2026-08-07
- **Decision:** Primary mechanics written at GDD precision from the frozen engine spec and PRD FRs: board/movement, merge rules, spawn, Adaptive Spawn (tiers + halving decay, configurable curve), next-piece preview (60/40 exact/range, both lanes), score/best, game over, Two Lanes, assistance tools, controls (swipe ~20px primary; arrow keys PWA-only), accessibility (44pt targets).
- **Note:** Feel values (haptics light/medium/heavy, shake subtle/strong, bullet time ~200ms) transcribed from brainstorm approval — flagged for playtest calibration.
- **Status:** Closed

## D-007 — Puzzle-specific sections drafted
- **Date:** 2026-08-07
- **Decision:** Core Puzzle Mechanics, Puzzle Progression, Level Structure, Player Assistance, Replayability drafted. **v1: no discrete levels** (single endless 4×4 board; progression = ceiling-tier ladder + best-score chase). **Replayability v1:** leaderboard score chase + stats + Adaptive Spawn variance; Daily Puzzle/board sizes/challenge modes are v2. Solution-space fairness: spawn never "helps" or "punishes" beyond the ceiling tier (P3).
- **Status:** Closed

## D-008 — Difficulty, replayability, art-todo confirmed
- **Date:** 2026-08-07
- **Decision:** Confirmed — difficulty target = north-star pacing (first merge ~20s, first game over ≤3min) with tension preserved by fixed 1/2 weights; replayability v1 sufficient; value→color/tier mapping finalized in Art Direction section (F2).
- **Status:** Closed

## D-009 — Value→color/tier mapping expanded to 13 tiers
- **Date:** 2026-08-07
- **Decision:** One color tier per value in the series (13 tiers): 1 Areia pálida, 2 Ocre, 3 Âmbar claro, 6 Âmbar, 12 Cobre claro, 24 Cobre, 48 Bronze (Basalto), 96 Ferro, 192 Esmeralda, 384 Esmeralda profunda, 768 Obsidiana verde-escura, 1536 Incandescente, 3072+ Núcleo incandescente. `1` and `2` are distinct colors (readability of the `1|2` merge pair). Warm→green→incandescent ramp; the incandescent peak makes the biggest merge visually rare (feeds P2). **Named tier scheme (v2) realigns to this mapping** (e.g., Cobre now = 12/24, Basalto = 48, Ferro = 96, Esmeralda = 192) — v2 collection fantasy, full naming scheme deferred.
- **Status:** Closed

## D-010 — Draft complete; 11 development epics defined
- **Date:** 2026-08-07
- **Decision:** Draft of all GDD sections complete. 11 epics (E1 RN+Skia migration with spike-first, E2 Adaptive Spawn, E3 Two Lanes, E4 Monetization, E5 Tutorial/Onboarding, E6 Failure Suite, E7 Next Piece Preview, E8 Core Feel, E9 Accessibility, E10 Telemetry, E11 Store Publication) — summary table in `gdd.md`, detailed stories in `epics.md`. Out of Scope and Assumptions written from PRD + brainstorm.
- **Status:** Closed

## D-011 — Game Feel Suite scope resolved: MVP carries the full suite
- **Date:** 2026-08-07
- **Decision:** Conflict between PRD (§5: "no full Game Feel Suite in MVP") and brainstorm (F–I suite approved). **Author decided: MVP ships the full core suite** — scaled haptics (3 light / 6 medium / 12+ heavy), visual punch (overshoot-and-snap, flash + particles), directional screen shake, and bullet time (~200ms on the session's biggest merge). Out of Scope adjusted: v2 keeps only *depth* (bigger shake, celebration moments) and the full sound suite.
- **Note:** This supersedes the PRD's MVP-scope statement; the GDD is the design authority for feel. **Extends to audio:** the brainstorm's "complete sound in product" intent is re-scoped for the RN MVP to **minimal feedback SFX** (merge/spawn/game-over); full sound suite is v2 (author plays sound-off — audio is a hypothesis to validate externally).
- **Status:** Closed

## D-012 — "Mineral Quente" promoted from v2 to v1 identity
- **Date:** 2026-08-07
- **Decision:** The brainstorm consistently tagged the Mineral Quente visual system "(V2)". The GDD promotes it to the **v1 shipped identity** (P4, Art Direction, E11 store assets). Rationale: identity is the answer to clone/storefront risk and the store icon/screenshots ship in v1.
- **Status:** Closed

## D-013 — RN-only vs frozen-web scoping clarified
- **Date:** 2026-08-07
- **Decision:** All post-spec mechanics are tagged **RN app** and explicitly excluded from the frozen web PWA (which keeps fixed 40/40/20 spawn, no Adaptive Spawn, no lanes/assistance/monetization, no preview, no sound/haptics): Adaptive Spawn, Two Lanes, assistance/monetization, next-piece preview, game-over stats, feel suite, and the distinct incandescent color tiers above 768 (web reuses a final tier above 768). The GDD describes the RN product of record; the web PWA is a legacy secondary surface.
- **Status:** Closed

## D-014 — Finalize validation: blocker fixed, improvements applied
- **Date:** 2026-08-07
- **Decision:** Discipline validator found the Executive Summary/Goals sections empty (blocker) — now filled from PRD + brainstorm. Improvements applied: 9-tile starting setup in mechanics; spawn reconciled as `<48` case of Adaptive Spawn; hint gap, lane-name, Daily Puzzle variant, and difficulty-target questions deferred to author; `localStorage` moved to Technical; shake amplitudes (2/5/8ms); tone-screen copy; purchase-at-pain principle; cosmetics-as-identity framing; death flourish parity (E6); E1/E10 pillar rationale; `triade.games` store-checklist note.
- **Status:** Closed

## D-015 — Author decisions on open items (Finalize step 4)
- **Date:** 2026-08-07
- **Decision:** (1) **Hint behavior:** highlights one valid mergeable pair; never suggests direction or reveals spawn. (2) **Lane name:** canonical localized string "Iniciante" (PT) / "Beginner" (EN) — GDD + PRD aligned. (3) **Daily Puzzle v2:** both brainstorm variants kept — N-move no-leaderboard brainteaser + fixed-seed run with own leaderboard. (4) **Late-game difficulty targets added:** median max tile per session and median run duration drive the configurable spawn curve.
- **Status:** Closed

## D-016 — GDD finalization
- **Date:** 2026-08-07
- **Decision:** Decision log audited (D-001→D-015 all captured in `gdd.md`/`epics.md`). Discipline validation passed (blocker fixed); input reconciliation done (PRD, brainstorming, spec) with all deltas either applied or logged. Open items triaged: **D1 retention numeric target** and **preview window-selection rule** remain `[ASSUMPTION] TBD` — both are tuning targets, **not phase-blockers**; deferred to UX/playtest. Narrative handoff: N/A (puzzle genre carries no narrative flag). External handoffs: none configured. **GDD v1.0 considered ready.**
- **Status:** Closed

## D-017 — Story 1.2 scope: best-score state in-memory only
- **Date:** 2026-08-10
- **Decision:** Story 1.2 delivers best-score tracking **in-memory only** (`src/game/matchScore.ts`, pure orchestration state). App-storage persistence (AsyncStorage/MMKV decision from the spike benchmark) ships in **Story 1.4** (FR-4 / Epic 1 AC). This is an intentional refinement of the epic AC ("best score persists" → in-memory now, persisted in 1.4), not a dropped requirement.
- **Rationale:** Keeps Story 1.2 (engine parity proof + score state) free of a storage dependency; persistence is bundled with the offline/persistence story where storage infrastructure lands.
- **Status:** Closed
