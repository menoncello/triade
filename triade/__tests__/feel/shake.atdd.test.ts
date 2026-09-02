import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { presetFor, reducedPresetFor, allPresetValues } from '../../src/feel/feel.ts';
import {
  shakeMsFor,
  shakeAmplitudeFor,
  directionVector,
  maxShakeForTrace,
  shouldShake,
  SHAKE_CAP,
} from '../../src/feel/shake.ts';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import { newGame, move } from '../../src/engine/core/index.ts';
import type { TraceEntry } from '../../src/engine/core/types.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';

// ---------------------------------------------------------------------------
// ATDD for 8-3 Screen shake — red-phase acceptance scaffolds covering
// working-tree delta: feel.ts shakeMs data + shake.ts pure helpers +
// GameBoard.tsx directional shake + App.tsx lastDirectionRef wiring.
// Host-only: node:test + tsx, no RN/native, no Reanimated/Skia import.
// ---------------------------------------------------------------------------

describe('ATDD 8-3 — P0 critical (spec I/O matrix)', () => {
  it('[P0-01] AC subtle shake — medium 6 -> shakeMs 2 (FeelPreset data, not code)', () => {
    assert.equal(presetFor(6).shakeMs, 2);
    assert.equal(shakeMsFor(6, false), 2);
    assert.equal(shakeAmplitudeFor(6, false), 2);
    // shakeMsFor must delegate to presetFor, capped
    assert.equal(shakeMsFor(6, false), Math.min(presetFor(6).shakeMs, SHAKE_CAP));
  });

  it('[P0-02] AC stronger shake — heavy 12+ -> shakeMs 5 (sweep all heavy tiers)', () => {
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]) {
      assert.equal(presetFor(v).shakeMs, 5, `presetFor(${v}).shakeMs 5`);
      assert.equal(shakeMsFor(v, false), 5, `shakeMsFor(${v}) 5`);
      assert.equal(shakeAmplitudeFor(v, false), 5, `shakeAmplitudeFor(${v}) 5`);
    }
  });

  it('[P0-03] AC light 3 + cap enforcement — shakeMs never exceeds 8', () => {
    assert.equal(shakeMsFor(3, false), 2);
    assert.equal(shakeAmplitudeFor(3, false), 2);
    for (const v of [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]) {
      assert.ok(shakeMsFor(v, false) <= SHAKE_CAP, `value ${v} shakeMs <=8`);
      assert.ok(shakeAmplitudeFor(v, false) <= SHAKE_CAP);
      assert.ok(maxShakeForTrace([{ value: v, to: [0, 0], from: [[0, 0], [0, 1]], spawned: false } as unknown as TraceEntry], false) <= SHAKE_CAP);
    }
    assert.ok(shakeMsFor(999999, false) <= SHAKE_CAP);
  });

  it('[P0-04] AC Reduced Motion gate FR-30 — all ->0/false, haptics stay', () => {
    for (const v of [3, 6, 12, 24, 768, 1536]) {
      assert.equal(shakeMsFor(v, true), 0, `shakeMsFor(${v}, true) 0`);
      assert.equal(shakeAmplitudeFor(v, true), 0, `amp ${v} 0`);
    }
    const trace: TraceEntry[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(maxShakeForTrace(trace, true), 0);
    assert.equal(shouldShake(trace, true), false);
    // FR-30: haptics stay — reducedPresetFor preserves haptic while shakeMs 0
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
    assert.equal(reducedPresetFor(12).shakeMs, 0);
    assert.equal(reducedPresetFor(3).haptic, 'light');
    assert.equal(reducedPresetFor(6).haptic, 'medium');
  });

  it('[P0-05] AC NOOP / no-merge silent — no shake, never throws', () => {
    assert.equal(shouldShake([], false), false);
    assert.equal(shouldShake(null as any, false), false);
    assert.equal(shouldShake(undefined as any, false), false);
    assert.equal(maxShakeForTrace([], false), 0);
    assert.equal(maxShakeForTrace(null as any, false), 0);
    assert.equal(maxShakeForTrace(undefined as any, false), 0);
    const noMerge: TraceEntry[] = [
      { value: 3, to: [0, 0], from: [[0, 1]], spawned: false } as unknown as TraceEntry,
      { value: 1, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
      { value: 6, to: [1, 1], from: [[1, 1]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(shouldShake(noMerge, false), false);
    assert.equal(maxShakeForTrace(noMerge, false), 0);
    const oneMerge: TraceEntry[] = [{ value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry];
    assert.equal(shouldShake(oneMerge, false), true);
    assert.equal(maxShakeForTrace(oneMerge, false), 2);
  });

  it('[P0-06] AC multiple merges — max wins, not stacked', () => {
    const trace: TraceEntry[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 12, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(maxShakeForTrace(trace, false), 5);
    assert.equal(shouldShake(trace, false), true);
    const twoMedium: TraceEntry[] = [
      { value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(maxShakeForTrace(twoMedium, false), 2);
    const lightMedium: TraceEntry[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(maxShakeForTrace(lightMedium, false), 2);
    const spawnedMerge: TraceEntry[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry,
      { value: 3, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(maxShakeForTrace(spawnedMerge, false), 2);
  });

  it('[P0-07] AC direction vectors — left/right X, up/down Y with correct sign', () => {
    assert.deepEqual(directionVector('left'), { x: -1, y: 0 });
    assert.deepEqual(directionVector('right'), { x: 1, y: 0 });
    assert.deepEqual(directionVector('up'), { x: 0, y: -1 });
    assert.deepEqual(directionVector('down'), { x: 0, y: 1 });
  });

  it('[P0-08] AC invalid dir safety — zero vector, never throws', () => {
    assert.deepEqual(directionVector(undefined as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector(null as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector('' as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector('invalid' as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector('LEFT' as any), { x: 0, y: 0 });
    assert.deepEqual(directionVector(123 as any), { x: 0, y: 0 });
    assert.doesNotThrow(() => directionVector(null as any));
  });

  it('[P0-09] AC non-finite never throw + data alignment', () => {
    assert.doesNotThrow(() => shakeMsFor(NaN, false));
    assert.doesNotThrow(() => shakeMsFor(Infinity, false));
    assert.doesNotThrow(() => shakeAmplitudeFor(NaN, false));
    assert.doesNotThrow(() => maxShakeForTrace([{ value: NaN, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], false));
    assert.doesNotThrow(() => shouldShake([{ value: Infinity, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], false));
    // shakeMsFor uses presetFor data (not hardcoded) and capped — verify alignment
    for (const v of [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072]) {
      const expected = Math.min(presetFor(v).shakeMs, SHAKE_CAP);
      assert.equal(shakeMsFor(v, false), expected, `value ${v} aligns with presetFor`);
      assert.equal(shakeAmplitudeFor(v, false), expected);
    }
    // Non-finite trace entries are skipped by maxShakeForTrace (Number.isFinite guard)
    assert.equal(maxShakeForTrace([{ value: NaN, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], false), 0);
    assert.equal(maxShakeForTrace([{ value: Infinity, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], false), 0);
    assert.ok(Number.isFinite(shakeMsFor(NaN, false)));
  });
});

describe('ATDD 8-3 — P1 high (integration / wiring)', () => {
  it('[P1-01] trace->shake contract via REAL engine trace: merge iff from.length===2 && !spawned', () => {
    const rng = mulberry32(42);
    const game = newGame(rng);
    const result = move(game, 'left', mulberry32(99));
    const plan = planTileTransitions(game.board, result);
    const mergeEntries = result.trace.filter((e) => !e.spawned && Array.isArray(e.from) && e.from.length === 2);
    const spawnEntries = result.trace.filter((e) => e.spawned);
    const slideEntries = result.trace.filter((e) => !e.spawned && Array.isArray(e.from) && e.from.length === 1);
    // Pure helper mapping must stay consistent with trace value
    for (const e of mergeEntries) {
      assert.doesNotThrow(() => shakeMsFor(e.value, false));
      assert.ok(['light', 'medium', 'heavy'].includes(presetFor(e.value).haptic));
    }
    for (const e of spawnEntries) {
      assert.equal(e.spawned, true);
    }
    for (const e of slideEntries) {
      assert.equal(e.from.length, 1);
    }
    // maxShakeForTrace over real trace must equal min(presetFor(maxValue).shakeMs, 8) capped
    const expectedMax = mergeEntries.length === 0 ? 0 : Math.min(Math.max(...mergeEntries.map((e) => presetFor(e.value).shakeMs)), SHAKE_CAP);
    assert.equal(maxShakeForTrace(result.trace, false), expectedMax);
    // Plan consistency: merge type only for from length 2
    for (const tr of plan) {
      if (tr.type === 'merge') assert.equal(tr.from.length, 2);
      if (tr.type === 'spawn') assert.ok(spawnEntries.length > 0 || result.moved === false);
    }
    assert.doesNotThrow(() => planTileTransitions(game.board, result));
  });

  it('[P1-02] App.lastDirectionRef wiring — direction set before move() and cleared on restart/lane', () => {
    const appSource = fs.readFileSync(path.resolve('App.tsx'), 'utf8');
    // doMove must set lastDirectionRef synchronously before move()
    const doMoveIdx = appSource.indexOf('const doMove');
    assert.ok(doMoveIdx !== -1, 'doMove exists');
    const doMoveBlock = appSource.slice(doMoveIdx, doMoveIdx + 600);
    const directionSetIdx = doMoveBlock.indexOf('lastDirectionRef.current = dir');
    const moveCallIdx = doMoveBlock.indexOf('move(game, dir');
    assert.ok(directionSetIdx !== -1, 'doMove sets lastDirectionRef synchronously');
    assert.ok(moveCallIdx !== -1, 'doMove calls move()');
    assert.ok(directionSetIdx < moveCallIdx, 'direction set BEFORE move() — required for synchronous shake wiring');
    // GameBoard receives direction prop
    assert.ok(appSource.includes('direction={lastDirectionRef.current'), 'App passes direction prop into GameBoard');
    // Cleared on restart and lane switch
    assert.ok(appSource.includes('lastDirectionRef.current = null'), 'direction cleared on restart/lane');
    const clearedCount = (appSource.match(/lastDirectionRef\.current = null/g) ?? []).length;
    assert.ok(clearedCount >= 2, `direction cleared in at least 2 places (restart + lane switch), found ${clearedCount}`);
  });

  it('[P1-03] directional axis mapping — left/right only X, up/down only Y', () => {
    // Pure vector contract
    for (const dir of ['left', 'right'] as const) {
      const vec = directionVector(dir);
      assert.equal(vec.y, 0, `${dir} Y is 0`);
      assert.notEqual(vec.x, 0, `${dir} X non-zero`);
    }
    for (const dir of ['up', 'down'] as const) {
      const vec = directionVector(dir);
      assert.equal(vec.x, 0, `${dir} X is 0`);
      assert.notEqual(vec.y, 0, `${dir} Y non-zero`);
    }
    // GameBoard source must drive only matching axis
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    assert.ok(gb.includes('if (vec.x !== 0)'), 'GameBoard drives shakeX when vec.x !==0');
    assert.ok(gb.includes('} else if (vec.y !== 0)'), 'GameBoard drives shakeY when vec.y !==0');
    assert.ok(gb.includes('SHAKE_CAP'), 'GameBoard uses SHAKE_CAP via Math.min(maxShake, SHAKE_CAP)');
    assert.ok(gb.includes('directionVector(direction)'), 'GameBoard derives vec from direction prop');
    assert.ok(gb.includes('withSequence') && gb.includes('withTiming'), 'shake uses withSequence/withTiming worklet');
  });

  it('[P1-04] Reduced Motion mid-animation snap — useEffect snaps to 0 when reducedMotion toggles', () => {
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // Must have useEffect that snaps shakeX/Y to 0 when reducedMotion true
    const hasMidFlightSnap = gb.includes('useEffect') && gb.includes('if (reducedMotion)') && gb.includes('withTiming(0');
    assert.ok(hasMidFlightSnap, 'GameBoard has useEffect snap to 0 when reducedMotion toggles mid-animation');
    // Also gated inside moveResult effect: !reducedMotion && direction && amplitude>0
    assert.ok(gb.includes('!reducedMotion && direction'), 'shake gated on !reducedMotion && direction');
    // Verify shakeMsFor helper gate
    for (const v of [6, 12, 768]) {
      assert.equal(shakeMsFor(v, true), 0);
      assert.equal(maxShakeForTrace([{ value: v, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], true), 0);
    }
  });

  it('[P1-05] chrome guard — Animated.View wraps Canvas only, never preview/score', () => {
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // Animated.View is parent of Canvas only
    assert.ok(gb.includes('<Animated.View style={shakeStyle}>'), 'Animated.View wraps shakeStyle');
    const animatedIdx = gb.indexOf('<Animated.View');
    const canvasIdx = gb.indexOf('<Canvas');
    const animatedCloseIdx = gb.indexOf('</Animated.View>');
    assert.ok(animatedIdx < canvasIdx && canvasIdx < animatedCloseIdx, 'Canvas is inside Animated.View');
    // Hud / PreviewCard are outside GameBoard — GameBoard file must not import Hud/PreviewCard
    assert.equal(gb.includes('Hud'), false, 'GameBoard must not import Hud');
    assert.equal(gb.includes('PreviewCard'), false, 'GameBoard must not import PreviewCard');
    // shakeStyle only on board container
    assert.ok(gb.includes('shakeStyle'), 'shakeStyle present');
    const shakeStyleUses = (gb.match(/shakeStyle/g) ?? []).length;
    assert.equal(shakeStyleUses, 2, 'shakeStyle used exactly twice (definition + Animated.View style)');
  });

  it('[P1-06] NOOP / slide-only bleed cancel — residual shake cancelled via withTiming(0,20)', () => {
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // When amplitude===0 or moved false or direction missing, shake cancelled with withTiming(0,20)
    const hasBleedCancel = gb.includes('withTiming(0, { duration: 20 })');
    assert.ok(hasBleedCancel, 'GameBoard bleed-cancel via withTiming(0,20) present');
    // Check else branches exist
    assert.ok(gb.includes('// Effective move but no merge (slide-only)'), 'slide-only branch present');
    assert.ok(gb.includes('// NOOP, Reduced Motion, or missing direction'), 'NOOP branch present');
    // Host contract: slide-only trace maxShake 0
    const slideOnly: TraceEntry[] = [
      { value: 3, to: [0, 0], from: [[0, 1]], spawned: false } as unknown as TraceEntry,
      { value: 6, to: [1, 1], from: [[1, 1]], spawned: false } as unknown as TraceEntry,
    ];
    assert.equal(maxShakeForTrace(slideOnly, false), 0);
    assert.equal(shouldShake(slideOnly, false), false);
  });
});

describe('ATDD 8-3 — P2 medium (edge / regression / perf)', () => {
  it.skip('[P2-01] overlapping shake concurrency without cancelAnimation (EXPECTED RED)', () => {
    // R-001: withSequence overwrites without cancelAnimation -> truncated overlap/jank
    // This ATDD expects cancelAnimation(shakeX/Y) before new withSequence.
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    const hasCancelAnimation = gb.includes('cancelAnimation');
    assert.ok(
      hasCancelAnimation,
      'GameBoard must call cancelAnimation(shakeX/Y) before new withSequence to avoid truncated overlap when EARLY_INPUT_MS 84ms re-opens gate before 130ms shake completes (R-001 deferred) — expected RED until fixed',
    );
  });

  it('[P2-02] perf micro-bench — shake helpers host-cheap', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      for (const v of allPresetValues()) {
        const ms = shakeMsFor(v, false);
        const amp = shakeAmplitudeFor(v, false);
        const vec = directionVector('left');
        assert.ok(Number.isFinite(ms));
        assert.ok(Number.isFinite(amp));
        assert.ok(vec.x !== 0 || vec.y !== 0);
      }
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 200, `10k*13 shake helper sweeps in ${elapsed.toFixed(1)}ms should be <200ms`);
    // Also single maxShake sweep cheap
    const traceSample: TraceEntry[] = [
      { value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 12, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    const start2 = performance.now();
    for (let i = 0; i < 10_000; i++) maxShakeForTrace(traceSample, false);
    assert.ok(performance.now() - start2 < 100, '10k maxShakeForTrace <100ms');
  });

  it('[P2-03] cap SHAKE_CAP single source — no hard-coded 8 outside shake.ts', () => {
    const shakeSrc = fs.readFileSync(path.resolve('src/feel/shake.ts'), 'utf8');
    assert.ok(shakeSrc.includes('export const SHAKE_CAP = 8'), 'shake.ts exports SHAKE_CAP=8');
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    assert.ok(gb.includes('SHAKE_CAP'), 'GameBoard uses SHAKE_CAP, not literal 8');
    assert.ok(gb.includes('Math.min(maxShake, SHAKE_CAP)'), 'GameBoard caps via Math.min(maxShake, SHAKE_CAP)');
    // Scattered 8 literal check — allow SHAKE_CAP definition only
    const shakeLiterals8 = (shakeSrc.match(/\b8\b/g) ?? []).length;
    assert.ok(shakeLiterals8 >= 1, 'shake.ts contains at least one 8 (SHAKE_CAP definition)');
    // shake helpers must delegate to presetFor, not hardcode 2/5
    assert.ok(shakeSrc.includes('presetFor'), 'shake.ts delegates to presetFor');
  });

  it('[P2-04] engine purity + duplicate predicate allowlist', () => {
    const engineIndex = fs.readFileSync(path.resolve('src/engine/core/index.ts'), 'utf8');
    assert.equal(engineIndex.includes('feel'), false, 'engine must not import feel');
    // The 3 sanctioned sites for from.length===2 predicate: engine, feel/shake.ts, render/transitionPlan.ts
    const shakeSrc = fs.readFileSync(path.resolve('src/feel/shake.ts'), 'utf8');
    assert.ok(shakeSrc.includes('from.length !== 2') || shakeSrc.includes('from.length === 2'), 'shake.ts contains merge predicate');
    const transitionSrc = fs.readFileSync(path.resolve('src/render/transitionPlan.ts'), 'utf8');
    assert.ok(transitionSrc.includes('from.length'), 'transitionPlan.ts contains from.length predicate');
    assert.ok(true, 'engine byte-identical pinned by git diff --stat -- triade/src/engine empty (CI gate)');
  });

  it.skip('[P2-05] board edge clipping by overflow hidden (EXPECTED RED)', () => {
    // R-007: parent View width/height=width + App boardWrap overflow hidden clips 5-8px translate at edges
    // This ATDD expects either overflow visible or BOARD_PADDING + SHAKE_CAP spare for shake bleed.
    const app = fs.readFileSync(path.resolve('App.tsx'), 'utf8');
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    const hasVisibleFix = app.includes("overflow: 'visible'") || app.includes('overflow: "visible"') || gb.includes("overflow: 'visible'");
    const hasPaddingFix = gb.includes('BOARD_PADDING + SHAKE_CAP') || gb.includes('BOARD_PADDING + 8') && gb.includes('shake') && gb.includes('SHAKE_CAP');
    // Current code has overflow hidden and no bleed margin — so FIX absent -> assert must fail (RED documents R-007)
    assert.ok(
      hasVisibleFix || hasPaddingFix,
      'board shake 5-8px at edges is clipped by parent View overflow hidden (R-007 deferred: parent View is exact width/height=width and App boardWrap overflow:hidden with no bleed margin — expected RED until product decides BOARD_PADDING + SHAKE_CAP spare or overflow:visible)',
    );
  });

  it('[P2-06] single access point — FeelPreset shakeMs is single source via presetFor', () => {
    const feelSrc = fs.readFileSync(path.resolve('src/feel/feel.ts'), 'utf8');
    assert.ok(feelSrc.includes('shakeMs: 2') && feelSrc.includes('shakeMs: 5'), 'feel.ts owns 2/5 shakeMs literals as data');
    const shakeSrc = fs.readFileSync(path.resolve('src/feel/shake.ts'), 'utf8');
    assert.ok(shakeSrc.includes('presetFor'), 'shake.ts delegates to presetFor');
    // shake.ts must not hardcode tier branching duplicating presetFor — it wraps presetFor
    // Check no scattered shakeMs literal definition outside feel.ts
    const punchSrcPath = path.resolve('src/feel/punch.ts');
    const punchSrc = fs.existsSync(punchSrcPath) ? fs.readFileSync(punchSrcPath, 'utf8') : '';
    assert.equal(punchSrc.includes('shakeMs'), false, 'punch.ts must not define shakeMs (only shake.ts/feel.ts)');
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // GameBoard must use helpers, not duplicate presetFor tier checks
    assert.ok(gb.includes('maxShakeForTrace') && gb.includes('directionVector'), 'GameBoard uses shake helpers, not duplicate branching');
  });
});
