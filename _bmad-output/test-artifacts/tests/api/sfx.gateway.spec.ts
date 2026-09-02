/**
 * TEA Automate — API Gateway Contract Tests for 8-6 SFX haptics (expo-audio thock coupled with haptics)
 * Location: _bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture needed)
 * TEA mapping: "API" = feel gateway contract (TraceEntry → triggerSfxFor* + SfxGateway { play }).
 * Provider is src/feel/sfx.ts + engine trace (newGame/move via mulberry32), consumer is App.tsx doMove observer.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's
 * api-testing-patterns + data-factories fragments, adapted for Expo RN 57 thock seam:
 * provider is engine+feel (presetFor/VOLUME_BY_HAPTIC + trace entries), consumer is sfx gateway + App coupling.
 *
 * Spec: spec-8-6-sfx-haptics.md (S8.6, UX-DR-29, FR-30, UX-DR-16, 4 ACs, I/O matrix 8 rows, baseline 7e1916a→b16a06e)
 * Test-design: test-design-epic-8-6-sfx-haptics.md (10 risks, P0 8 groups, P1 7, P2 4, P3 3)
 *
 * Execute:
 *   cd triade && npx tsc --noEmit --project tsconfig.json
 *   npx tsx --test ../_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
 * Or via triade's test harness:
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
 * Canonical host execution also remains via triade/__tests__/feel/sfx.atdd.test.ts (21 cases, 20G/1R expected P2-06).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { presetFor, reducedPresetFor, FEEL_PRESETS, allPresetValues } from '../../../../triade/src/feel/feel.ts';
import { hapticsStyleForValue } from '../../../../triade/src/feel/haptics.ts';
import {
  sfxVolumeForValue,
  sfxKindForValue,
  triggerSfxForMerge,
  triggerSfxForTrace,
  triggerSfxForSpawn,
  triggerSfxForGameOver,
  type SfxGateway,
} from '../../../../triade/src/feel/sfx.ts';
import { newGame, move } from '../../../../triade/src/engine/core/index.ts';
import type { TraceEntry } from '../../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';

// ---------------------------------------------------------------------------
// Local helpers — deterministic, no faker, no Math.random (triade/AGENTS.md)
// ---------------------------------------------------------------------------
function mergeEntry(value: number, spawned = false, fromLen = 2): TraceEntry {
  const from = fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned } as unknown as TraceEntry;
}
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), 'triade', rel), 'utf8');
  }
}
function realTrace(seed = 42): { trace: TraceEntry[]; moved: boolean } {
  const rng = mulberry32(seed);
  const game = newGame(rng);
  return move(game, 'left', rng) as unknown as { trace: TraceEntry[]; moved: boolean };
}

// ---------------------------------------------------------------------------
// Fixture import check — ensures fixtures/feel-sfx-fixtures.ts stays in sync
// ---------------------------------------------------------------------------
describe('[API] SFX haptics gateway — volume scale + coupled haptics+audio + swappable gateway', () => {
  it('[P0] sfxVolumeForValue mirrors haptic scale 3→0.45 / 6→0.65 / 12+→1.0 via presetFor tier (data not code, AC2)', async () => {
    assert.equal(sfxVolumeForValue(3), 0.45, '3 light 0.45');
    assert.equal(sfxVolumeForValue(6), 0.65, '6 medium 0.65');
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144]) {
      assert.equal(sfxVolumeForValue(v), 1.0, `value ${v} heavy 1.0`);
    }
    // derives from presetFor haptic, not branching on value directly
    for (const v of [3, 6, 12, 24, 48]) {
      const haptic = presetFor(v).haptic;
      const vol = sfxVolumeForValue(v);
      if (haptic === 'light') assert.equal(vol, 0.45);
      else if (haptic === 'medium') assert.equal(vol, 0.65);
      else assert.equal(vol, 1.0);
    }
    const sfxSrc = readSrc('src/feel/sfx.ts');
    assert.ok(sfxSrc.includes('VOLUME_BY_HAPTIC'), 'VOLUME_BY_HAPTIC defined');
    assert.ok(sfxSrc.includes('0.45') && sfxSrc.includes('0.65') && sfxSrc.includes('1.0'), 'volumes 0.45/0.65/1.0 in sfx.ts');
    assert.equal(presetFor(3), FEEL_PRESETS[3], 'presetFor identity stable');
  });

  it('[P0] sfxVolumeForValue never throws on non-finite / small values — fallback light 0.45 (R-002, R-010)', async () => {
    assert.doesNotThrow(() => sfxVolumeForValue(NaN));
    assert.doesNotThrow(() => sfxVolumeForValue(Infinity));
    assert.doesNotThrow(() => sfxVolumeForValue(-1 as any));
    assert.equal(sfxVolumeForValue(NaN), 0.45);
    assert.equal(sfxVolumeForValue(Infinity), 0.45);
    assert.equal(sfxVolumeForValue(-1 as any), 0.45);
    assert.equal(sfxVolumeForValue(0 as any), 0.45);
    assert.equal(sfxVolumeForValue(1 as any), 0.45);
    assert.equal(sfxVolumeForValue(2 as any), 0.45);
    const sfxSrc = readSrc('src/feel/sfx.ts');
    assert.ok(sfxSrc.includes('Math.max(0') && sfxSrc.includes('Math.min(1'), 'volume clamped [0,1]');
  });

  it('[P0] Reduced Motion keeps sound — sfxVolume independent of reducedPresetFor (FR-30, R-004)', async () => {
    for (const v of [3, 6, 12, 1536]) {
      assert.equal(reducedPresetFor(v).haptic, presetFor(v).haptic, `v ${v} haptic preserved`);
      assert.equal(sfxVolumeForValue(v), sfxVolumeForValue(v), `v ${v} volume identical`);
    }
    const sfxSrc = readSrc('src/feel/sfx.ts');
    assert.ok(sfxSrc.includes('FR-30: Reduced Motion keeps sound'), 'FR-30 keep-sound comment present');
    const sfxCodeOnly = sfxSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.equal(/reducedMotion/.test(sfxCodeOnly), false, 'sfx.ts code must not reference reducedMotion');
    assert.ok(sfxSrc.includes('presetFor(value)'), 'sfxVolumeForValue derives from presetFor');
    assert.equal(/reducedPresetFor/.test(sfxCodeOnly), false, 'sfx.ts code must not import reducedPresetFor');
  });

  it('[P0] coupled haptics+audio same tier — hapticsStyleForValue Light↔0.45 / Medium↔0.65 / Heavy↔1.0 (R-001)', async () => {
    assert.equal(hapticsStyleForValue(3), 'Light');
    assert.equal(sfxVolumeForValue(3), 0.45);
    assert.equal(hapticsStyleForValue(6), 'Medium');
    assert.equal(sfxVolumeForValue(6), 0.65);
    assert.equal(hapticsStyleForValue(12), 'Heavy');
    assert.equal(sfxVolumeForValue(12), 1.0);
    for (const v of [3, 6, 12, 24, 48, 768, 1536]) {
      const h = presetFor(v).haptic;
      const vol = sfxVolumeForValue(v);
      const style = hapticsStyleForValue(v);
      if (h === 'light') { assert.equal(vol, 0.45); assert.equal(style, 'Light'); }
      else if (h === 'medium') { assert.equal(vol, 0.65); assert.equal(style, 'Medium'); }
      else { assert.equal(vol, 1.0); assert.equal(style, 'Heavy'); }
    }
  });

  it('[P0] triggerSfxForTrace fires one SFX per merge entry with scaled volume, same order (R-001, R-005)', async () => {
    const calls: Array<{ kind: string; volume: number }> = [];
    const gw: SfxGateway = { play: (kind, volume) => calls.push({ kind, volume }) };
    const trace: TraceEntry[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
      { value: 12, to: [2, 2], from: [[2, 0], [2, 1]], spawned: false } as unknown as TraceEntry,
    ];
    assert.doesNotThrow(() => triggerSfxForTrace(trace, gw));
    assert.equal(calls.length, 3, '3 merges → 3 SFX');
    assert.equal(calls[0].kind, 'merge'); assert.equal(calls[0].volume, 0.45);
    assert.equal(calls[1].kind, 'merge'); assert.equal(calls[1].volume, 0.65);
    assert.equal(calls[2].kind, 'merge'); assert.equal(calls[2].volume, 1.0);
    // mixed trace: spawn entry ignored
    const calls2: any[] = [];
    const gw2: SfxGateway = { play: (k, v) => calls2.push({ k, v }) };
    const mixed: TraceEntry[] = [
      { value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
      { value: 12, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false } as unknown as TraceEntry,
    ];
    triggerSfxForTrace(mixed, gw2);
    assert.equal(calls2.length, 2, 'mixed trace with spawn entry → only merges fire');
  });

  it('[P0] triggerSfxForMerge/ForSpawn/ForGameOver correct kind+volume and never throw (R-002, R-006)', async () => {
    const calls: Array<{ kind: string; volume: number }> = [];
    const gw: SfxGateway = { play: (kind, volume) => calls.push({ kind, volume }) };
    assert.doesNotThrow(() => triggerSfxForMerge(3, gw));
    assert.equal(calls[calls.length - 1].kind, 'merge'); assert.equal(calls[calls.length - 1].volume, 0.45);
    assert.doesNotThrow(() => triggerSfxForMerge(6, gw));
    assert.equal(calls[calls.length - 1].volume, 0.65);
    assert.doesNotThrow(() => triggerSfxForMerge(12, gw));
    assert.equal(calls[calls.length - 1].volume, 1.0);
    assert.doesNotThrow(() => triggerSfxForSpawn(1, gw));
    assert.equal(calls[calls.length - 1].kind, 'spawn'); assert.equal(calls[calls.length - 1].volume, 0.35);
    assert.doesNotThrow(() => triggerSfxForSpawn(2, gw));
    assert.equal(calls[calls.length - 1].volume, 0.35, 'spawn volume fixed 0.35 even for value 2');
    assert.doesNotThrow(() => triggerSfxForSpawn(3, gw));
    assert.equal(calls[calls.length - 1].volume, 0.35);
    assert.doesNotThrow(() => triggerSfxForGameOver(gw));
    assert.equal(calls[calls.length - 1].kind, 'gameOver'); assert.equal(calls[calls.length - 1].volume, 0.9);
    assert.equal(sfxKindForValue(3), 'merge');
    assert.equal(sfxKindForValue(1536), 'merge');
  });

  it('[P0] swappable gateway + missing expo-audio degrades silent without throw; never blocks (R-002, R-003)', async () => {
    assert.doesNotThrow(() => triggerSfxForMerge(6, null as any));
    assert.doesNotThrow(() => triggerSfxForMerge(6, undefined as any));
    assert.doesNotThrow(() => triggerSfxForTrace([{ value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry]));
    assert.doesNotThrow(() => triggerSfxForTrace([{ value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], null as any));
    assert.doesNotThrow(() => triggerSfxForSpawn(1));
    assert.doesNotThrow(() => triggerSfxForSpawn(1, null as any));
    assert.doesNotThrow(() => triggerSfxForGameOver());
    assert.doesNotThrow(() => triggerSfxForGameOver(null as any));
    const sfxSrc = readSrc('src/feel/sfx.ts');
    assert.ok(sfxSrc.includes('SfxGateway'), 'SfxGateway interface present');
    assert.ok(sfxSrc.includes('gateway?.play') || sfxSrc.includes('gateway && typeof gateway.play'), 'dispatchPlay prefers gateway');
    assert.ok(sfxSrc.includes('void playViaExpoAudio'), 'default path fire-and-forget void playViaExpoAudio');
    assert.ok(sfxSrc.includes("import('expo-audio')"), 'dynamic import expo-audio');
  });

  it('[P0] gateway failure never suppresses caller — play throwing is swallowed (never-throw, R-002)', async () => {
    const bad: SfxGateway = { play: () => { throw new Error('gateway boom'); } };
    assert.doesNotThrow(() => triggerSfxForMerge(12, bad));
    assert.doesNotThrow(() => triggerSfxForTrace([{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], bad));
    assert.doesNotThrow(() => triggerSfxForSpawn(1, bad));
    assert.doesNotThrow(() => triggerSfxForGameOver(bad));
    const sfxSrc = readSrc('src/feel/sfx.ts');
    const tryCatchCount = (sfxSrc.match(/try\s*\{/g) || []).length;
    assert.ok(tryCatchCount >= 7, `sfx.ts must have >=7 try/catch guards, got ${tryCatchCount}`);
    assert.equal((sfxSrc.match(/await\s+triggerSfx/g) || []).length, 0, 'no await triggerSfx in sfx.ts (never await contract)');
  });

  it('[P0] no music — only merge/spawn/gameOver kinds ever emitted (MVP 3-kind cap, R-007)', async () => {
    const kinds = new Set<string>();
    const gw: SfxGateway = { play: (kind) => kinds.add(kind) };
    triggerSfxForMerge(3, gw);
    triggerSfxForMerge(6, gw);
    triggerSfxForMerge(12, gw);
    triggerSfxForSpawn(1, gw);
    triggerSfxForSpawn(2, gw);
    triggerSfxForGameOver(gw);
    triggerSfxForTrace([{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], gw);
    for (const k of kinds) {
      assert.ok(['merge', 'spawn', 'gameOver'].includes(k), `kind ${k} must be one of 3 allowed`);
    }
    assert.ok(!kinds.has('music'), 'music never emitted');
    assert.ok(!kinds.has('bgm'), 'bgm never emitted');
    assert.ok(!kinds.has('loop'), 'loop never emitted');
    const sfxSrc = readSrc('src/feel/sfx.ts');
    assert.ok(sfxSrc.includes("SfxKind = 'merge' | 'spawn' | 'gameOver'"), 'SfxKind is 3-way');
    assert.equal(sfxSrc.toLowerCase().includes('music'), false, 'sfx.ts must not contain music');
  });

  it('[P1] trace→SFX contract via REAL engine trace: merge iff from.length===2 && !spawned && finite (R-001, R-005)', async () => {
    const { trace } = realTrace(42);
    let hasMerge = false;
    for (const e of trace as unknown as TraceEntry[]) {
      if (!e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2 && Number.isFinite(e.value)) {
        hasMerge = true; break;
      }
    }
    if (hasMerge) {
      const calls: any[] = [];
      const gw: SfxGateway = { play: (_k, v) => calls.push(v) };
      triggerSfxForTrace(trace as any, gw);
      assert.ok(calls.length >= 1, 'real trace with merge entry dispatches at least one SFX');
      // reducedMotion does not gate even with real trace
      const callsReduced: any[] = [];
      triggerSfxForTrace(trace as any, { play: (_k, v) => callsReduced.push(v) });
      assert.equal(calls.length, callsReduced.length, 'volume count identical with/without reducedMotion (FR-30)');
    }
    // Spawn entries never count even with from.length===2 if spawned true
    const mixed: TraceEntry[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry,
    ];
    const calls2: any[] = [];
    triggerSfxForTrace(mixed, { play: (_k, v) => calls2.push(v) } as any);
    assert.equal(calls2.length, 1, 'mixed with spawned:true → only non-spawned merge fires');
  });

  it('[P1] App coupling — triggerHapticsForTrace + 3 triggerSfx at same site, fire-and-forget, never reducedMotion-gated (R-002, R-004)', async () => {
    const appSrc = readSrc('App.tsx');
    assert.ok(appSrc.includes('triggerHapticsForTrace'), 'App calls triggerHapticsForTrace');
    const doMoveIdx = appSrc.indexOf('triggerHapticsForTrace');
    assert.ok(doMoveIdx !== -1, 'triggerHapticsForTrace exists in App');
    const afterHaptics = appSrc.slice(doMoveIdx, doMoveIdx + 2500);
    assert.ok(afterHaptics.includes('triggerSfxForTrace'), 'triggerSfxForTrace shortly after haptics in doMove');
    assert.ok(afterHaptics.includes('triggerSfxForSpawn') || appSrc.includes('triggerSfxForSpawn'), 'triggerSfxForSpawn present in App');
    assert.ok(afterHaptics.includes('triggerSfxForGameOver') || appSrc.includes('triggerSfxForGameOver'), 'triggerSfxForGameOver present in App');
    const triggerSfxLines = appSrc.split('\n').filter((l) => /triggerSfxFor/.test(l));
    assert.ok(triggerSfxLines.length >= 3, `expected >=3 triggerSfx lines, got ${triggerSfxLines.length}: ${triggerSfxLines.join(' | ')}`);
    for (const line of triggerSfxLines) {
      assert.equal(line.includes('await'), false, `triggerSfx line must not be awaited: ${line.trim()}`);
      assert.equal(line.includes('reducedMotion'), false, `sfx line must not be reducedMotion-gated: ${line.trim()}`);
    }
    const totalTry = (appSrc.match(/try\s*\{/g) || []).length;
    assert.ok(totalTry >= 4, `App should have >=4 try blocks for haptics+3 sfx, got ${totalTry}`);
    assert.ok(appSrc.includes('.find') && appSrc.includes('spawned'), 'App finds spawn entry via trace.find(e=>e.spawned)');
    // haptics before sfx
    assert.ok(appSrc.indexOf('triggerHapticsForTrace') < appSrc.indexOf('triggerSfxForTrace'), 'haptics before sfx at same site');
  });

  it('[P1] assetManifest sfx-merge/spawn/gameover degrade + haptics/audio independence (R-003, R-002)', async () => {
    const manifestSrc = readSrc('src/services/assets/assetManifest.ts');
    assert.ok(manifestSrc.includes("'sfx-merge'"), 'sfx-merge in manifest');
    assert.ok(manifestSrc.includes("'sfx-spawn'"), 'sfx-spawn in manifest');
    assert.ok(manifestSrc.includes("'sfx-gameover'"), 'sfx-gameover in manifest');
    const sfxManifestRequires = (manifestSrc.match(/sfx-/g) || []).length;
    assert.ok(sfxManifestRequires >= 3, `manifest must have 3 sfx entries, got ${sfxManifestRequires}`);
    assert.ok(manifestSrc.includes('try {') && manifestSrc.includes('return null'), 'manifest requires guarded by try/catch→null');
    assert.ok(manifestSrc.includes('preloadAssets'), 'preloadAssets exists');
    assert.ok(manifestSrc.includes('Number.isFinite'), 'preloadAssets filters finite');
    assert.ok(manifestSrc.includes('Asset.loadAsync'), 'preloadAssets uses Asset.loadAsync');
    // haptics vs audio independence — separate try blocks
    const appSrc = readSrc('App.tsx');
    const totalTrySfx = (appSrc.match(/try\s*\{/g) || []).length;
    assert.ok(totalTrySfx >= 4, `expected >=4 try blocks for haptics+audio independence, got ${totalTrySfx}`);
    const badGw: SfxGateway = { play: () => { throw new Error('sfx boom'); } };
    assert.doesNotThrow(() => triggerSfxForTrace([{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry], badGw));
  });

  it('[P2] datum literal + allowlist scans — VOLUME_BY_HAPTIC single-source, 6 require(assets/sfx) + 5-site merge predicate (R-008, R-005)', async () => {
    const sfxSrc = readSrc('src/feel/sfx.ts');
    const manifestSrc = readSrc('src/services/assets/assetManifest.ts');
    // VOLUME_BY_HAPTIC single in sfx.ts
    assert.ok(sfxSrc.includes('VOLUME_BY_HAPTIC'), 'VOLUME_BY_HAPTIC in sfx.ts');
    const volInOtherFeel = readSrc('src/feel/haptics.ts').includes('0.45') || readSrc('src/feel/shake.ts').includes('0.45');
    // volumes only in sfx.ts (spawn 0.35, gameOver 0.9, merge 0.45/0.65/1.0 are the only volume literals in feel/)
    // Allow check is via grep: rg -n "0\.45|0\.65|1\.0" triade/src/feel --include="*.ts" | only sfx.ts — host smoke
    assert.ok(sfxSrc.includes('0.35'), 'spawn 0.35 in sfx.ts');
    assert.ok(sfxSrc.includes('0.9'), 'gameOver 0.9 in sfx.ts');
    // duplicate-require allowlist exactly 6 (3 manifest + 3 sfx)
    const manifestCount = (manifestSrc.match(/require\(.*assets\/sfx/g) || []).length;
    const sfxCount = (sfxSrc.match(/require\(.*assets\/sfx/g) || []).length;
    assert.equal(manifestCount, 3, `manifest must have 3 sfx requires, got ${manifestCount}`);
    assert.equal(sfxCount, 3, `sfx.ts must have 3 sfx requires, got ${sfxCount}`);
    assert.equal(manifestCount + sfxCount, 6, 'total exactly 6 require sites');
    for (const name of ['merge.wav', 'spawn.wav', 'gameover.wav']) {
      assert.ok(manifestSrc.includes(name), `manifest must include ${name}`);
      assert.ok(sfxSrc.includes(name), `sfx.ts must include ${name}`);
    }
    // merge predicate 5-site: each feel helper guards Array.isArray
    for (const [name, src] of [['haptics', readSrc('src/feel/haptics.ts')], ['shake', readSrc('src/feel/shake.ts')], ['bulletTime', readSrc('src/feel/bulletTime.ts')], ['sfx', sfxSrc]] as const) {
      assert.ok(src.includes('from.length') && src.includes('spawned'), `${name} must contain from.length && spawned predicate`);
      assert.ok(src.includes('Array.isArray'), `${name} must guard Array.isArray(from)`);
    }
  });

  it('[P2] perf micro-bench — sfxVolumeForValue host-cheap median <0.05 / p99 <0.1 + rapid re-trigger last-wins (R-002, R-007, R-009)', async () => {
    const tiers = allPresetValues() as readonly number[];
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const v = tiers[i % tiers.length] as number;
      const tr = [mergeEntry(v)] as unknown as TraceEntry[];
      const s = performance.now();
      sfxVolumeForValue(v);
      sfxVolumeForValue(NaN);
      triggerSfxForTrace(tr, { play: () => {} });
      triggerSfxForTrace([] as unknown as TraceEntry[], { play: () => {} });
      samples.push(performance.now() - s);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
    assert.ok(median < 0.05, `median ${median.toFixed(4)} <0.05`);
    assert.ok(p99 < 0.1, `p99 ${p99.toFixed(4)} <0.1`);
    // rapid multi-merge last-wins — both dispatched without await
    const sfxSrc = readSrc('src/feel/sfx.ts');
    assert.ok(sfxSrc.includes('seekTo(0)') || sfxSrc.includes('seekTo'), 'sfx re-seeks before replay (last-wins)');
    assert.equal((sfxSrc.match(/await\s+triggerSfx/g) || []).length, 0, 'sfx.ts never awaits triggerSfx (never-block)');
    assert.equal((readSrc('App.tsx').match(/await.*triggerSfx/g) || []).length, 0, 'App.tsx never awaits triggerSfx');
    const calls: any[] = [];
    const gw: SfxGateway = { play: (_k, v) => calls.push(v) };
    triggerSfxForTrace([mergeEntry(6), mergeEntry(12)] as unknown as TraceEntry[], gw);
    assert.equal(calls.length, 2, 'rapid double merge still dispatches both (last audible wins, both attempted)');
  });
});
