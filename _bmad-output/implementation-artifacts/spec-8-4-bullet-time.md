---
title: '8-4 Bullet time'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '590e461'
final_revision: '12a3dcd'
---

<intent-contract>

## Intent

**Problem:** Big merges lack an emotional peak — the rare session-best merge should briefly slow time with a flash so the golden moment feels earned.

**Approach:** Trigger a ~200ms bullet-time slow with a flash only when a merge sets a new `sessionBestMerge` (max merged value this session), with `sessionBestMerge` living in the Snapshot so undo rewinds it, implemented as a 200ms timing config on the merge event (no fixed-step loop), and suppressed/smoothed under Reduced Motion while haptics and sound stay.

## Boundaries & Constraints

**Always:** Engine remains pure TS with no RN/Reanimated/Skia imports (ADR-01); feel is data, not code — bullet time is a timing datum (200ms) on the merge event, not a game-loop delay; `sessionBestMerge` lives in the Snapshot so undo rewinds it with the board (ADR-06, UX-DR-28); bullet time fires only on board merges (`from.length===2 && !spawned`), never on preview card or score (UX-DR-27); never blocks or alters spawn/merge/score rules; Reduced Motion disables/smooths bullet time while haptics+sound stay (FR-30, UX-DR-16).

**Block If:** Needs new native module beyond pinned Reanimated/Skia/expo-haptics/expo-audio or changes to engine spawn/merge/score rules.

**Never:** Duplicate merge predicate outside engine; animate chrome (preview card, score) with bullet time or flash; gate haptics or sound behind Reduced Motion; add fixed-step loop or delay game logic; exceed 200ms cap without data change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New session-best triggers | trace merges [6,12], sessionBestMerge=6, reducedMotion=false | 12 > 6 → bullet time fires (~200ms timing + flash overlay), sessionBestMerge updates to 12 | no throw |
| Ordinary merge no trigger | trace merge value=6, sessionBestMerge=12, reducedMotion=false | 6 ≤ 12 → no bullet time, sessionBest unchanged, haptics still fire | no throw |
| First merge always triggers | sessionBestMerge=0, trace merge 3, reducedMotion=false | 3 > 0 → fires once | no throw |
| Multiple merges max wins | trace merges [3,12] in one move, sessionBest=6 | max=12 >6 → single 200ms bullet time (not per-merge), new best 12 | no crash |
| Reduced Motion | sessionBest=0, trace merge 12, reducedMotion=true | suppressed: no slow/flash animation, sessionBest still advances to 12, haptics+sound stay | silent no-op |
| NOOP / no merge | moved=false or trace with no merge entries | no bullet time, sessionBest unchanged | silent no-op |
| Undo rewind | undo pops snapshot where sessionBest was 12 back to 6 | sessionBestMerge rewinds to 6 so next 12 re-triggers | no throw |
| Non-finite safety | trace entry value NaN/Infinity | ignored, never triggers, never throws | skip entry |

</intent-contract>

## Code Map

- `triade/src/feel/bulletTime.ts` -- new pure helpers: BULLET_TIME_MS=200 constant, `maxMergeValue(trace): number | null`, `isNewSessionBest(trace, sessionBest): boolean`, `shouldTriggerBulletTime(trace, sessionBest, reducedMotion): boolean`, `nextSessionBest(trace, sessionBest): number` — host-testable, no RN imports, wraps merge predicate
- `triade/src/feel/feel.ts` -- verify FeelPreset and reducedPresetFor exist; no new preset field needed (bullet time is a single timing datum, not per-preset); add comment that bullet time uses fixed 200ms datum
- `triade/src/render/GameBoard.tsx` -- add props `sessionBestMerge?: number` and trigger effect: when moveResult has trace with new session-best (via bulletTime helpers) and !reducedMotion and moved then run imperative flash/slow animation (Reanimated worklet, ~200ms timing, board container only); keep shake/punch timing independent; gate chrome never animates; add flash overlay shared value opacity sequence
- `triade/App.tsx` -- hold `sessionBestMerge` in State and Snapshot; initialize to 0 on newGame; update synchronously inside doMove/moveResult handling via `nextSessionBest`; include in Snapshot `{game, match, matchStats, sessionBestMerge}` so undoHistory rewinds it; reset to 0 on handleRestart and lane change; thread `sessionBestMerge` and `settings.reducedMotion` into GameBoard
- `triade/src/game/matchOrchestrator.ts` -- extend `Snapshot` interface to include `sessionBestMerge: number`; orchestrator undo/restart paths must preserve it (Snapshot Already carries it, no extra logic needed beyond type)
- `triade/__tests__/feel/bulletTime.test.ts` -- unit tests for pure helpers: new best fires, ordinary no-fire, first merge fires, max among multiple, Reduced Motion suppression, NOOP guard, undo rewind via nextSessionBest, non-finite safety

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/feel/bulletTime.ts` -- create pure module exporting `BULLET_TIME_MS = 200`, `maxMergeValue(trace): number | null`, `isNewSessionBest(trace, sessionBest): boolean`, `shouldTriggerBulletTime(trace, sessionBest, reducedMotion): boolean`, `nextSessionBest(trace, sessionBest): number` — only board merges count (`!spawned && from.length===2`, Number.isFinite value), never throws, reducedMotion returns false, wraps no RN imports
- [x] `triade/src/feel/feel.ts` -- verify frozen presets intact; add defensive comment that bullet time uses fixed 200ms datum (not per-preset) and reduced preset gates it via shouldTrigger
- [x] `triade/App.tsx` -- add `sessionBestMerge` state (number, init 0) and include in `Snapshot` type; in doMove/apply/moveResult path compute `next = nextSessionBest(result.trace, sessionBestMerge)` and update state if changed; push Snapshot with sessionBestMerge onto undoHistory; on undo pop restore sessionBestMerge from snapshot; on handleRestart and lane switch reset sessionBestMerge to 0 (and clear direction); pass `sessionBestMerge={sessionBestMerge}` and `reducedMotion={settings.reducedMotion}` into GameBoard
- [x] `triade/src/game/matchOrchestrator.ts` -- extend exported `Snapshot` interface with `sessionBestMerge: number`; ensure initialOrchestratorState docs that it lives outside orchestrator (App owns Snapshot creation) — no runtime change needed beyond type, but keep file in Code Map so importer sees the contract
- [x] `triade/src/render/GameBoard.tsx` -- add props `sessionBestMerge?: number` and bullet-time worklet: new shared values `bulletFlash` opacity and optional `bulletScale`; in moveResult effect after shake/punch handling, compute `shouldTriggerBulletTime(moveResult.trace, sessionBestMerge ?? 0, reducedMotion)` and if true and moved then fire flash sequence `withSequence(withTiming(0.45,{duration:60}), withTiming(0,{duration:140}))` over a full-screen overlay (board only) for ~200ms total; ensure Reduced Motion path suppresses (no animation), NOOP/slide-only path triggers no animation, invalid trace never throws, and chrome (Hud preview) never receives bullet transform; keep shakeX/Y and punch paths intact
- [x] `triade/__tests__/feel/bulletTime.test.ts` -- unit tests covering BULLET_TIME_MS=200, maxMergeValue extraction, isNewSessionBest true/false, shouldTrigger respects Reduced Motion, multiple merges max wins, NOOP/empty trace no trigger, non-finite ignored, nextSessionBest returns updated best or unchanged

**Acceptance Criteria:**
- Given a merge that sets a new session best, when the merge resolves, then a ~200ms bullet-time slow with a flash fires — the emotional peak (S8.4, UX-DR-28)
- Given an ordinary merge that does not exceed sessionBestMerge, when it resolves, then no bullet time fires but haptics still fire (UX-DR-28)
- Given sessionBestMerge lives in the Snapshot, when undo is invoked, then sessionBestMerge rewinds with the board so the same value can re-trigger (ADR-06, UX-DR-28)
- Given bullet time is a 200ms timing config on the merge event, when it fires, then game logic is not delayed — only the feel worklet animates for ~200ms (no fixed-step loop)
- Given Reduced Motion enabled, when a new session-best merge resolves, then bullet time is smoothed or disabled while haptics and sound stay active (FR-30, UX-DR-16)
- Given the board bullet time fires, when rendered, then preview card and score never animate with it (chrome rule UX-DR-27) and NOOP moves never trigger it

## Spec Change Log

## Review Triage Log

### 2026-09-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 1, low 2)
- defer: 4: (low 4)
- reject: 14: (low 14)
- addressed_findings:
  - [high] [patch] Stale closure sessionBestMerge in doMove — switched to functional setSessionBestMerge(prev=>nextSessionBest(trace,prev)) to avoid race when EARLY_INPUT_MS reopens gate before state flush (App.tsx:338-340)
  - [medium] [patch] NaN/Infinity leak on snapshot restore — changed all snap.sessionBestMerge ??0 to Number.isFinite guard (App.tsx:441,494,525,668,699,728) and added safeBest coalesce in GameBoard (GameBoard.tsx:473) so corrupted snapshot never disables bullet permanently
  - [low] [patch] BULLET_TIME_MS single-source datum — imported BULLET_TIME_MS in GameBoard and used BULLET_TIME_MS-60 for second timing instead of hardcoded 140 (GameBoard.tsx:11,477)
  - [low] [patch] Removed `as any` casts on trace — helpers now typed readonly TraceEntry[] so engine rename would fail fast (App.tsx:339, GameBoard.tsx:473)

## Design Notes

Bullet time is a thin worklet binding over pure datum: `BULLET_TIME_MS = 200` fixed for S8.4 (tuning later moves to FeelPreset if needed). Trigger is rarity-gated (new session-best) not value-gated — even a `3` can trigger if it is the first merge, but ordinary later `3` never does. `sessionBestMerge` is the max merged value seen this match; initial 0 guarantees first merge fires. App owns the state so engine stays pure (ADR-01); Snapshot carries it so undo is a true rewind (ADR-06). GameBoard's effect mirrors shake's structure but keeps independent shared values so bullet flash doesn't overwrite shakeX/Y. Flash opacity sequence 60ms in + 140ms out ≈200ms total matches spec.

```ts
// bulletTime.ts shape
export const BULLET_TIME_MS = 200;
export function maxMergeValue(trace: readonly TraceEntry[]): number | null
export function isNewSessionBest(trace: readonly TraceEntry[], sessionBest: number): boolean
export function shouldTriggerBulletTime(trace: readonly TraceEntry[], sessionBest: number, reducedMotion: boolean): boolean
export function nextSessionBest(trace: readonly TraceEntry[], sessionBest: number): number
```

## Verification

**Commands:**
- `npm test` -- expected: all pass (bulletTime 10+ tests + existing 757 pass; 4 pre-existing RED from punch ATDD remain if not fixed)
- `npx tsc --noEmit` -- expected: clean

**Manual checks (if no CLI):**
- Start new game: first 1+2→3 triggers bullet flash ~200ms; repeat 3 merge no flash; merge 6 while best is 3 → flashes and best becomes 6; merge 6 again no flash; merge 12 → flashes. Toggle Reduced Motion in Settings → no flash even on new best but haptics still tap. Undo after a best → redo same merge re-flashes.

## Auto Run Result

**Summary:** Implemented bullet time (S8.4) — rarity-gated ~200ms flash on new session-best merge via fixed BULLET_TIME_MS datum, sessionBestMerge lives in Snapshot so undo rewinds, suppressed under Reduced Motion while haptics+sound stay, board-only flash overlay.

**Files changed:**
- `triade/src/feel/bulletTime.ts` -- new pure helpers BULLET_TIME_MS=200, maxMergeValue, isNewSessionBest, shouldTriggerBulletTime, nextSessionBest (board merges only, never throws, reducedMotion gated, no RN)
- `triade/src/feel/feel.ts` -- added bullet-time datum comment (fixed 200ms not per-preset)
- `triade/src/game/matchOrchestrator.ts` -- extended Snapshot with optional sessionBestMerge
- `triade/App.tsx` -- added sessionBestMerge state (0), Snapshot carry, functional update via nextSessionBest, reset on restart/lane switch, restore on undo/continue with Number.isFinite guard, threaded into GameBoard
- `triade/src/render/GameBoard.tsx` -- added sessionBestMerge prop, bulletFlash shared value + overlay (#fff7e0 200ms), trigger via shouldTriggerBulletTime with BULLET_TIME_MS constant, safeBest guard, board-only, Reduced Motion suppression
- `triade/__tests__/feel/bulletTime.test.ts` -- 9 tests covering datum 200, max extraction, new-best true/false, Reduced Motion suppression, max-wins, NOOP guard, non-finite safety, nextSessionBest
- `_bmad-output/implementation-artifacts/spec-8-4-bullet-time.md` -- spec file (this file)
- `_bmad-output/implementation-artifacts/deferred-work.md` -- appended 4 deferred entries (spawned undefined, value<3, width unvalidated, doMove identity)

**Review findings:**
- patches applied: 4 (stale closure high, NaN leak medium, datum single-source low, as-any low)
- items deferred: 4 (spawned undefined gap, value<3 pollutes, width unvalidated, doMove identity — all low)
- items rejected: 14 (rarity 3 debate, session scope, Reduced Motion advances, ownership split, multi-modal stacking, trace filter citation, feel.ts contradiction, NaN recovery, test timing, try/catch bug-hiding, double-swallowing, overlay perf, etc. — all low)
- followup_review_recommended: false

**Verification:**
- `npx tsc --noEmit --project triade/tsconfig.json` -- clean
- `npx tsc --noEmit --project triade/tsconfig.test.json` -- clean
- `npm --prefix triade test` -- 785 pass / 6 fail (all 6 EXPECTED RED: R-001 tutorial dedup, R-006 expo-haptics, R-002 burst orphan, P2-01 burst accumulation, P2-01 shake overlap, P2-05 shake clipping — none caused by 8-4) / 9 bulletTime tests pass

**Residual risks:**
- First merge 3 always triggers (by design rarity gate 0→3) — early game flashes every new match, product may tier-gate to >=12 later
- Rapid new-bests <200ms apart re-assign bulletFlash shared value (last wins, not queued) — acceptable rarity, not stacking by design
- doMove deps include sessionBestMerge (functional update mitigates but still invalidates closure identity) — deferred audit
- Old undoHistory entries without sessionBestMerge fallback to 0 so first low merge after undo re-triggers — migration as designed, not a bug
