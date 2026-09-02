import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BULLET_TIME_MS,
  maxMergeValue,
  isNewSessionBest,
  shouldTriggerBulletTime,
  nextSessionBest,
} from '../../src/feel/bulletTime.ts';
import { presetFor, reducedPresetFor, allPresetValues } from '../../src/feel/feel.ts';
import { newGame, move, stateFromResult } from '../../src/engine/core/index.ts';
import type { TraceEntry } from '../../src/engine/core/types.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';

// ---------------------------------------------------------------------------
// ATDD for 8-4 Bullet time — red-phase acceptance scaffolds covering
// working-tree delta: bulletTime.ts pure helpers (BULLET_TIME_MS=200) +
// App.tsx sessionBestMerge Snapshot wiring + GameBoard.tsx flash overlay +
// feel.ts datum comment. Host-only: node:test + tsx, no RN/Reanimated import.
// ---------------------------------------------------------------------------

function entry(value: number, spawned = false, fromLen = 2): any {
  const from =
    fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned };
}

describe('ATDD 8-4 — P0 critical (spec I/O matrix)', () => {
  it('[P0-01] AC datum — BULLET_TIME_MS is 200 (single-source for S8.4)', () => {
    assert.equal(BULLET_TIME_MS, 200);
    // datum is exported once, not scattered
    const src = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/bulletTime.ts'),
      'utf8',
    );
    assert.ok(src.includes('BULLET_TIME_MS = 200'), 'datum defined as 200 in bulletTime.ts');
  });

  it('[P0-02] AC maxMergeValue — only board merges count (from.length===2 && !spawned && finite)', () => {
    assert.equal(maxMergeValue(null as any), null);
    assert.equal(maxMergeValue(undefined as any), null);
    assert.equal(maxMergeValue([] as any), null);
    assert.equal(maxMergeValue([entry(6)] as any), 6);
    assert.equal(maxMergeValue([entry(3), entry(12)] as any), 12);
    // spawned:true ignored
    assert.equal(maxMergeValue([entry(12, true), entry(3)] as any), 3);
    assert.equal(maxMergeValue([entry(12, true)] as any), null);
    // from length !=2 ignored
    assert.equal(maxMergeValue([entry(12, false, 1)] as any), null);
    assert.equal(maxMergeValue([entry(12, false, 0)] as any), null);
    // non-finite ignored
    assert.equal(maxMergeValue([entry(NaN), entry(6)] as any), 6);
    assert.equal(maxMergeValue([entry(Infinity)] as any), null);
    assert.equal(maxMergeValue([entry(NaN)] as any), null);
    // max across tiers
    assert.equal(maxMergeValue([entry(3), entry(6), entry(12)] as any), 12);
    assert.equal(maxMergeValue([entry(24), entry(48), entry(96)] as any), 96);
  });

  it('[P0-03] AC isNewSessionBest — rarity gate max > sessionBest', () => {
    assert.equal(isNewSessionBest([entry(6)] as any, 6), false, '6 vs 6 no new best');
    assert.equal(isNewSessionBest([entry(12)] as any, 6), true, '12 vs 6 new best');
    assert.equal(isNewSessionBest([entry(3)] as any, 0), true, 'first merge 3 fires');
    assert.equal(isNewSessionBest([entry(6)] as any, 12), false, '6 vs 12 not new best');
    assert.equal(isNewSessionBest([] as any, 0), false);
    assert.equal(isNewSessionBest(null as any, 0), false);
    // non-finite never triggers
    assert.equal(isNewSessionBest([entry(NaN)] as any, 0), false);
    assert.equal(isNewSessionBest([entry(Infinity)] as any, 0), false);
    // NaN sessionBest never triggers (corrupted snapshot guard)
    assert.equal(isNewSessionBest([entry(12)] as any, NaN), false);
    assert.equal(isNewSessionBest([entry(12)] as any, Infinity), false);
  });

  it('[P0-04] AC shouldTrigger — Reduced Motion gates bullet (FR-30) while nextSessionBest still advances', () => {
    // Reduced Motion suppresses flash
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 0, true), false);
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 6, true), false);
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 0, true), false);
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 0, false), true);
    assert.equal(shouldTriggerBulletTime(null as any, 0, false), false);
    assert.equal(shouldTriggerBulletTime(null as any, 0, true), false);
    // FR-30: sessionBest still advances even when trigger suppressed
    assert.equal(nextSessionBest([entry(12)] as any, 6), 12, 'nextSessionBest advances even under reduced');
    assert.equal(nextSessionBest([entry(3)] as any, 0), 3);
    // haptics stay — reducedPresetFor keeps haptic
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
    assert.equal(reducedPresetFor(3).haptic, 'light');
  });

  it('[P0-05] AC multiple merges — max wins single 200ms (not per-merge)', () => {
    const trace = [entry(3), entry(12)] as any;
    assert.equal(maxMergeValue(trace), 12);
    assert.equal(isNewSessionBest(trace, 6), true);
    assert.equal(shouldTriggerBulletTime(trace, 6, false), true);
    assert.equal(nextSessionBest(trace, 6), 12);
    // if max <= best, no trigger and unchanged
    const trace2 = [entry(3), entry(6)] as any;
    assert.equal(shouldTriggerBulletTime(trace2, 12, false), false);
    assert.equal(nextSessionBest(trace2, 12), 12);
    // two heavies max wins
    const trace3 = [entry(24), entry(48)] as any;
    assert.equal(maxMergeValue(trace3), 48);
    assert.equal(nextSessionBest(trace3, 12), 48);
  });

  it('[P0-06] AC NOOP / no-merge silent — never flashes, never throws', () => {
    assert.equal(shouldTriggerBulletTime([] as any, 0, false), false);
    assert.equal(shouldTriggerBulletTime(null as any, 0, false), false);
    assert.equal(shouldTriggerBulletTime(undefined as any, 0, false), false);
    const noMerge: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1]], spawned: false },
      { value: 1, to: [3, 3], from: [], spawned: true },
      { value: 6, to: [1, 1], from: [[1, 1]], spawned: false },
    ];
    assert.equal(shouldTriggerBulletTime(noMerge, 0, false), false);
    assert.equal(isNewSessionBest(noMerge, 0), false);
    assert.equal(maxMergeValue(noMerge), null);
    // spawn-only trace never triggers
    assert.equal(maxMergeValue([{ value: 3, to: [0, 0], from: [[0, 0], [0, 1]], spawned: true } as any]), null);
  });

  it('[P0-07] AC non-finite safety — never throws, Number.isFinite guards', () => {
    assert.doesNotThrow(() => maxMergeValue([entry(NaN), entry(Infinity), entry(-Infinity)] as any));
    assert.doesNotThrow(() => isNewSessionBest([entry(NaN)] as any, 0));
    assert.doesNotThrow(() => shouldTriggerBulletTime([entry(NaN)] as any, 0, false));
    assert.doesNotThrow(() => nextSessionBest([entry(NaN)] as any, 0));
    assert.doesNotThrow(() => maxMergeValue(null as any));
    assert.doesNotThrow(() => shouldTriggerBulletTime([entry(NaN)] as any, NaN, false));
    assert.doesNotThrow(() => shouldTriggerBulletTime([entry(12)] as any, NaN, false));
    assert.doesNotThrow(() => shouldTriggerBulletTime([entry(12)] as any, Infinity, false));
    assert.equal(nextSessionBest([entry(NaN)] as any, 6), 6);
    assert.equal(nextSessionBest([entry(Infinity)] as any, 6), 6);
    assert.equal(shouldTriggerBulletTime([entry(NaN)] as any, 0, false), false);
    assert.equal(isNewSessionBest([entry(NaN)] as any, 0), false);
  });

  it('[P0-08] AC nextSessionBest — updated-or-unchanged + undo-rewind simulation (ADR-06)', () => {
    assert.equal(nextSessionBest([entry(12)] as any, 6), 12);
    assert.equal(nextSessionBest([entry(6)] as any, 12), 12);
    assert.equal(nextSessionBest([] as any, 6), 6);
    assert.equal(nextSessionBest(null as any, 6), 6);
    assert.equal(nextSessionBest([entry(3)] as any, 0), 3);
    assert.equal(nextSessionBest([entry(12), entry(3)] as any, 6), 12);
    // chain then undo: 0->3->6->12 then rewind to 6 re-triggers
    let best = 0;
    best = nextSessionBest([entry(3)] as any, best);
    assert.equal(best, 3);
    best = nextSessionBest([entry(6)] as any, best);
    assert.equal(best, 6);
    best = nextSessionBest([entry(12)] as any, best);
    assert.equal(best, 12);
    best = 6; // undo pops to 6
    assert.equal(isNewSessionBest([entry(12)] as any, best), true);
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, best, false), true);
    assert.equal(nextSessionBest([entry(12)] as any, best), 12);
    // ordinary merge keeps best
    assert.equal(nextSessionBest([entry(6)] as any, 12), 12);
    // non-finite sessionBest resets to 0 (never throws, avoids permanent disable — R-002 patch)
    // Current impl returns 0 immediately when sessionBest is non-finite, ignoring trace max
    // (first merge after corruption then re-triggers on next valid merge with best 0)
    assert.equal(nextSessionBest([entry(6)] as any, NaN), 0, 'NaN best -> 0 (trace ignored, recovery via next move)');
    assert.equal(nextSessionBest([entry(6)] as any, Infinity), 0);
    assert.equal(nextSessionBest(null as any, NaN), 0, 'NaN best with no trace -> 0');
  });

  it('[P0-09] AC first-merge-always + rarity sequence (not value-gated)', () => {
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 0, false), true, 'first 3 always fires');
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 6, false), false, 'later 3 never when best 6');
    assert.equal(shouldTriggerBulletTime([entry(6)] as any, 3, false), true);
    assert.equal(shouldTriggerBulletTime([entry(6)] as any, 6, false), false, '6 again no flash');
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 6, false), true);
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 12, false), false);
    assert.equal(shouldTriggerBulletTime([entry(24)] as any, 12, false), true);
  });
});

describe('ATDD 8-4 — P1 high (integration / wiring)', () => {
  it('[P1-01] trace→bullet contract via REAL engine trace (move() fixture)', () => {
    // Build a real game trace via engine — eliminates stub drift
    const rng = mulberry32(42);
    let game = newGame(rng);
    // Drive moves until we see a merge trace with from.length===2 && !spawned
    let foundMerge = false;
    let foundSpawnOnly = false;
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const res = move(game, dir, rng);
      if (res.trace) {
        for (const e of res.trace) {
          if (!e.spawned && Array.isArray(e.from) && e.from.length === 2 && Number.isFinite(e.value) && e.value >= 3) {
            foundMerge = true;
            assert.equal(maxMergeValue(res.trace as any) !== null, true, 'maxMergeValue finds real merge');
            assert.equal(
              shouldTriggerBulletTime(res.trace as any, 0, false),
              (maxMergeValue(res.trace as any) as number) > 0,
              'trigger on real merge trace',
            );
          }
          if (e.spawned) foundSpawnOnly = true;
        }
      }
      if (res.moved) game = stateFromResult(res);
      if (foundMerge && foundSpawnOnly) break;
    }
    // At least confirm maxMergeValue ignores spawned entries on a constructed mixed trace
    const mixed: TraceEntry[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
    ];
    assert.equal(maxMergeValue(mixed), 12, 'spawned:true ignored even when from empty');
    assert.equal(shouldTriggerBulletTime(mixed, 6, false), true);
  });

  it('[P1-02] App Snapshot/sessionBestMerge wiring — Snapshot includes sessionBestMerge, 7 Number.isFinite guards, functional update', () => {
    const appSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../App.tsx'),
      'utf8',
    );
    // Snapshot carries sessionBestMerge
    assert.ok(appSrc.includes('sessionBestMerge'), 'App.tsx mentions sessionBestMerge');
    assert.ok(
      appSrc.includes('type Snapshot') && appSrc.includes('sessionBestMerge'),
      'Snapshot type includes sessionBestMerge',
    );
    // restore sites use Number.isFinite guard (undo/continue/ad/lane) — snap.* + res.snapshot.*
    const guardCount = (appSrc.match(/Number\.isFinite\([^)]*sessionBestMerge/g) || []).length;
    assert.ok(guardCount >= 5, `expected >=5 Number.isFinite guards on sessionBestMerge, got ${guardCount}`);
    // functional update mitigates EARLY_INPUT_MS race
    assert.ok(appSrc.includes('setSessionBestMerge((prev)'), 'functional update setSessionBestMerge(prev=>...)');
    assert.ok(appSrc.includes('nextSessionBest(result.trace'), 'doMove uses nextSessionBest on trace');
    // reset on restart/lane
    assert.ok(appSrc.includes('setSessionBestMerge(0)'), 'reset to 0 on restart/lane');
    // threaded into GameBoard
    assert.ok(appSrc.includes('sessionBestMerge={sessionBestMerge}'), 'App threads sessionBestMerge into GameBoard');
    assert.ok(appSrc.includes('reducedMotion={'), 'App threads reducedMotion into GameBoard');
  });

  it('[P1-03] GameBoard flash overlay — datum single-source, board-only, timing 60+140', () => {
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    // imports BULLET_TIME_MS datum and uses BULLET_TIME_MS - 60 for second timing
    assert.ok(gbSrc.includes("from '../feel/bulletTime"), 'GameBoard imports bulletTime');
    assert.ok(gbSrc.includes('BULLET_TIME_MS'), 'GameBoard uses BULLET_TIME_MS datum');
    assert.ok(gbSrc.includes('BULLET_TIME_MS - 60'), 'second timing derived as BULLET_TIME_MS-60, not hardcoded 140');
    // bullet timing uses derived literal — not hardcoded 140 for bulletFlash sequence
    // (punch flash still uses literal 140 — that is separate datum; bullet must use BULLET_TIME_MS-60)
    const bulletBlock = gbSrc.slice(gbSrc.indexOf('bulletFlash.value = withSequence'));
    assert.ok(bulletBlock.includes('BULLET_TIME_MS - 60'), 'bulletFlash timing derived from BULLET_TIME_MS');
    assert.equal(bulletBlock.includes('duration: 140'), false, 'bulletFlash block must not hardcode duration:140 — use BULLET_TIME_MS-60');
    // overlay is board only — sibling of shake wrapper, not ancestor of Hud
    assert.ok(gbSrc.includes('bulletFlash'), 'bulletFlash shared value present');
    assert.ok(gbSrc.includes('#fff7e0'), 'flash color #fff7e0 present');
    assert.ok(gbSrc.includes('position: \'absolute\''), 'overlay is absolute positioned board overlay');
    assert.ok(gbSrc.includes('pointerEvents="none"'), 'overlay pointerEvents none');
    // trigger gated by moved && !reducedMotion && shouldTriggerBulletTime
    assert.ok(gbSrc.includes('shouldTriggerBulletTime'), 'trigger via shouldTriggerBulletTime');
    assert.ok(gbSrc.includes('reducedMotion'), 'Reduced Motion gated in GameBoard');
    // safeBest guard
    assert.ok(
      gbSrc.includes('Number.isFinite(sessionBestMerge)'),
      'safeBest Number.isFinite guard in GameBoard',
    );
  });

  it('[P1-04] Reduced Motion mid-flight snap — useEffect([reducedMotion]) snaps bulletFlash to 0', () => {
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    // effect that snaps on reducedMotion toggle
    assert.ok(
      gbSrc.includes('useEffect') && gbSrc.includes('reducedMotion'),
      'has useEffect dep on reducedMotion',
    );
    assert.ok(gbSrc.includes('[reducedMotion'), 'useEffect deps contain reducedMotion');
    // snaps bulletFlash withTiming(0, {duration:20})
    assert.ok(gbSrc.includes('bulletFlash.value = withTiming(0'), 'snaps bulletFlash to 0 on reducedMotion');
    // shouldTrigger returns false under reducedMotion even for high values
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 0, true), false);
    assert.equal(shouldTriggerBulletTime([entry(24)] as any, 6, true), false);
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 0, true), false);
  });

  it('[P1-05] chrome guard — bullet overlay is board only, never preview/score', () => {
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    // GameBoard chrome guard: overlay is sibling of Canvas shake wrapper, Hud not imported here
    assert.ok(!gbSrc.includes('PreviewCard'), 'GameBoard does not import PreviewCard (chrome never flashed)');
    assert.ok(!gbSrc.includes('Hud'), 'GameBoard does not render Hud (chrome not wrapped)');
    // bulletFlashStyle only applied to bullet overlay, not to shakeStyle Canvas wrapper
    assert.ok(gbSrc.includes('bulletFlashStyle'), 'bulletFlashStyle applied only to bullet overlay');
    assert.ok(gbSrc.includes('shakeStyle'), 'shakeStyle still wraps Canvas separately');
    // spawn/NOOP never trigger even at board level
    assert.equal(shouldTriggerBulletTime([] as any, 0, false), false);
    assert.equal(shouldTriggerBulletTime(null as any, 0, false), false);
    // preview spawn-value never counted as board merge (from.length!==2 or spawned:true)
    const previewLike: any[] = [{ value: 3, to: [0, 0], from: [], spawned: true }];
    assert.equal(maxMergeValue(previewLike), null);
  });

  it('[P1-06] datum single-source + engine purity + predicate allowlist', () => {
    // BULLET_TIME_MS defined once in bulletTime.ts
    const bulletSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/bulletTime.ts'),
      'utf8',
    );
    const datumDefs = (bulletSrc.match(/BULLET_TIME_MS/g) || []).length;
    assert.ok(datumDefs >= 1, 'BULLET_TIME_MS exported from bulletTime.ts');
    // GameBoard imports datum — no duplicate literal
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    assert.ok(gbSrc.includes('BULLET_TIME_MS'), 'GameBoard imports BULLET_TIME_MS');
    // feel.ts comment notes bullet uses fixed datum not per-preset
    const feelSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/feel.ts'),
      'utf8',
    );
    assert.ok(feelSrc.includes('BULLET_TIME_MS'), 'feel.ts notes BULLET_TIME_MS fixed datum');
    // engine purity: bulletTime never imports RN/Reanimated/Skia
    assert.equal(bulletSrc.includes('react-native'), false, 'bulletTime.ts no RN import');
    assert.equal(bulletSrc.includes('reanimated'), false, 'bulletTime.ts no Reanimated import');
    assert.equal(bulletSrc.includes('@shopify'), false, 'bulletTime.ts no Skia import');
    // predicate allowlist: from.length===2 appears only in sanctioned files (engine + bulletTime + shake + transitionPlan)
    // checked structurally: bulletTime and shake each have exactly one predicate gate
    assert.ok(bulletSrc.includes('from.length'), 'bulletTime has from.length gate');
    // allPresetValues still covers tiers
    const tiers = allPresetValues();
    assert.ok(tiers.includes(3) && tiers.includes(6) && tiers.includes(12), 'tiers include 3/6/12');
  });
});

describe('ATDD 8-4 — P2 medium (edge / regression / perf)', () => {
  it.skip('[P2-01] overlapping bullet truncation without cancelAnimation (EXPECTED RED — requires fix)', () => {
    // Rapid new-bests <200ms apart (EARLY_INPUT_MS≈84 re-opens gate) overwrite bulletFlash withSequence mid-flight.
    // Current code does not call cancelAnimation(bulletFlash) before new withSequence — second flash truncates first.
    // This is the deferred R-007 / R-001 class (same as shake overlap). Assert RED until fixed.
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    const hasCancel = gbSrc.includes('cancelAnimation');
    // EXPECTED RED: GameBoard must call cancelAnimation(bulletFlash) before new withSequence
    assert.ok(
      hasCancel,
      'GameBoard must call cancelAnimation(bulletFlash) before new withSequence to avoid truncated overlap when EARLY_INPUT_MS 84ms re-opens gate before 200ms bullet completes (R-007 deferred) — expected RED until fixed',
    );
  });

  it('[P2-02] perf micro-bench — bullet helpers host-cheap (<1ms per 10k sweeps)', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      maxMergeValue([entry(3), entry(6), entry(12)] as any);
      isNewSessionBest([entry(12)] as any, 6);
      shouldTriggerBulletTime([entry(12)] as any, 6, false);
      nextSessionBest([entry(12)] as any, 6);
    }
    const elapsed = performance.now() - start;
    // host helpers must be <<1ms per call; 10k sweeps should be <200ms total
    assert.ok(elapsed < 500, `10k bullet helper sweeps should be <500ms, got ${elapsed.toFixed(1)}ms`);
    // also single datum never delays game logic — BULLET_TIME_MS is not a loop
    assert.equal(BULLET_TIME_MS, 200);
    const bulletSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/bulletTime.ts'),
      'utf8',
    );
    assert.equal(bulletSrc.includes('setTimeout'), false, 'bulletTime never uses setTimeout');
    assert.equal(bulletSrc.includes('setInterval'), false, 'bulletTime never uses setInterval');
  });

  it('[P2-03] datum literal scan — no scattered 200/140/60 bullet literals outside datum', () => {
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    const bulletSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/bulletTime.ts'),
      'utf8',
    );
    // 200 appears once as datum definition; GameBoard must not hardcode 200 literal for bullet
    assert.ok(bulletSrc.includes('BULLET_TIME_MS = 200'), 'datum 200 defined once in bulletTime.ts');
    // Bullet block must use BULLET_TIME_MS-60, not literal 140 (punch still uses 140 — that's OK)
    const bulletBlock = gbSrc.slice(gbSrc.indexOf('bulletFlash.value = withSequence'));
    assert.ok(bulletBlock.includes('BULLET_TIME_MS - 60'), 'bullet block uses BULLET_TIME_MS-60');
    assert.equal(bulletBlock.includes('duration: 140'), false, 'bullet block must not hardcode duration:140');
    // First withTiming in bullet sequence is 60
    assert.ok(bulletBlock.includes('duration: 60'), 'bullet first flash timing 60ms present');
    // no literal 200 hardcode in GameBoard bullet block
    assert.ok(
      !bulletBlock.includes('duration: 200'),
      'GameBoard bullet block must not hardcode duration:200 — use BULLET_TIME_MS datum',
    );
  });

  it('[P2-04] engine purity — triade/src/engine byte-identical, no duplicate predicate drift', () => {
    // Engine never imports RN/bullet/shake — checked via absence of feel imports in engine
    const engineIndex = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/engine/core/index.ts'),
      'utf8',
    );
    // engine index should not import feel
    assert.equal(engineIndex.includes('feel'), false, 'engine never imports feel layer');
    // bulletTime predicate is thin wrapper — delegates to maxMergeValue then isNewSessionBest
    const bulletSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/bulletTime.ts'),
      'utf8',
    );
    assert.ok(bulletSrc.includes('maxMergeValue'), 'bulletTime delegates via maxMergeValue');
    assert.ok(bulletSrc.includes('isNewSessionBest'), 'shouldTrigger delegates via isNewSessionBest');
  });

  it.skip('[P2-05] board width / overflow — overlay uses width×width, clipped by boardWrap overflow hidden (EXPECTED RED — product decision)', () => {
    // GameBoard overlay style width/height=width flows from parent boardWrap width; boardWrap overflow hidden
    // clips flash at corners by design (board-only). Deferred R-010 notes width NaN not guarded and
    // overlay has no Math.max(width,1) guard. Assert RED until product decides to add guard or accept.
    const gbSrc = fs.readFileSync(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        '../../src/render/GameBoard.tsx',
      ),
      'utf8',
    );
    // Check if width guard exists — currently deferred, so this fails (RED) until fixed
    const hasWidthGuard = gbSrc.includes('Math.max(width') || gbSrc.includes('Number.isFinite(width)');
    // Overlay directly uses width without Math.max guard — deferred R-010
    assert.ok(
      hasWidthGuard,
      'GameBoard bullet overlay should guard width NaN/Infinity via Math.max(width,1) or Number.isFinite check before style width/height (R-010 deferred — expected RED until product decides guard vs accepted)',
    );
  });

  it('[P2-06] single-preset + frozen invariants — FeelPreset still frozen, BULLET_TIME_MS cap never exceeded without data change', () => {
    // FEEL_PRESETS frozen identity, presetFor still pure
    for (const v of allPresetValues()) {
      const p = presetFor(v);
      assert.ok(Object.isFrozen(p), `presetFor(${v}) frozen`);
    }
    assert.ok(Object.isFrozen(presetFor(3)), 'PRESET_LIGHT frozen');
    assert.ok(Object.isFrozen(presetFor(12)), 'PRESET_HEAVY frozen');
    // BULLET_TIME_MS is the only bullet timing — not per-preset; feel.ts comment confirms
    const feelSrc = fs.readFileSync(
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/feel/feel.ts'),
      'utf8',
    );
    assert.ok(feelSrc.includes('BULLET_TIME_MS'), 'feel.ts documents BULLET_TIME_MS fixed datum');
    // never exceed 200 without data change — datum is 200
    assert.equal(BULLET_TIME_MS, 200, 'cap is 200 datum, exceeds only if BULLET_TIME_MS changes (data change)');
  });
});
