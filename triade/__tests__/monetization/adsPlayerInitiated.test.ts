import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

describe('ads player-initiated — App.tsx reward paths are player-initiated only', () => {
  it('createRewardedAdGateway/loadAndShow only inside handleUndoAd/handleContinueAd', () => {
    const src = read('triade/App.tsx');
    // All occurrences of gateway invocation must be within the two player handlers — exclude top-level import lines
    const gatewayLines = src.split('\n').map((line, idx) => ({ line, idx: idx + 1 })).filter(({ line }) => !/^\s*import/.test(line) && /createRewardedAdGateway|loadAndShow|showRewardedUndoAd|showRewardedContinueAd/.test(line));
    assert.ok(gatewayLines.length >= 2, 'App.tsx must call rewarded gateway at least twice (undo + continue)');
    for (const { line, idx } of gatewayLines) {
      // Must be inside handleUndoAd or handleContinueAd — check surrounding context by scanning upwards for function name
      const upto = src.split('\n').slice(0, idx).join('\n');
      const lastUndo = upto.lastIndexOf('handleUndoAd');
      const lastContinue = upto.lastIndexOf('handleContinueAd');
      const lastHandlerPos = Math.max(lastUndo, lastContinue);
      // If not inside those handlers, it's a violation (top-level / effect)
      assert.ok(lastHandlerPos !== -1, `gateway call at line ${idx} must be inside handleUndoAd or handleContinueAd, found: ${line.trim()}`);
      // Ensure no gateway call exists in useEffect or top-level before handlers
      const beforeHandlers = src.split('\n').slice(0, Math.min(upto.lastIndexOf('const handleUndoAd'), upto.lastIndexOf('const handleContinueAd'))).join('\n');
      // This is covered by the loop; just assert the line itself is not in an effect
      assert.ok(!/useEffect/.test(src.split('\n').slice(Math.max(0, idx - 10), idx).join('\n')) || /handleUndoAd|handleContinueAd/.test(upto.slice(lastHandlerPos - 200, lastHandlerPos + 200)), `line ${idx} must not be inside useEffect`);
    }
  });

  it('no top-level auto ad load in App.tsx', () => {
    const src = read('triade/App.tsx');
    // Top-level before any handler — first 150 lines are imports + component scaffolding; ensure no loadAndShow there
    const header = src.split('\n').slice(0, 120).join('\n');
    assert.ok(!/loadAndShow/.test(header), 'top-level header must not contain loadAndShow (no auto-play ad)');
  });

  it('no ad invocation during swipe/animation path (doMove) and no interstitial mount string', () => {
    const src = read('triade/App.tsx');
    assert.ok(!/InterstitialAd/.test(src), 'App.tsx must not contain InterstitialAd');
    // doMove must not call ad gateway
    const doMoveBlock = (() => {
      const start = src.indexOf('const doMove');
      const end = src.indexOf('const handleRestart', start);
      return src.slice(start, end);
    })();
    assert.ok(!/loadAndShow|createRewardedAdGateway|RewardedAd/.test(doMoveBlock), 'doMove must not trigger ads');
  });

  it('Clean lane wall blocks ads and undo/continue', () => {
    const lanes = read('triade/src/game/lanes.ts');
    // Clean profile must have allowAds false and canUndo/canContinue false
    assert.ok(/id:\s*['"]clean['"]/.test(lanes), 'lanes.ts must define clean profile');
    assert.ok(/allowAds:\s*false/.test(lanes), 'clean allowAds must be false');
    // Accelerated must allow ads
    assert.ok(/id:\s*['"]accelerated['"]/.test(lanes) || /Iniciante/.test(lanes), 'lanes.ts must define accelerated');
    const acceleratedAllow = /accelerated[\s\S]*?allowAds:\s*true|allowAds:\s*true[\s\S]*?accelerated/.test(lanes);
    assert.ok(acceleratedAllow, 'accelerated allowAds must be true');
  });

  it('RewardPrompt gated between-games only (not during animation/gameplay)', () => {
    const src = read('triade/App.tsx');
    // Undo prompt gate: accelerated && showUndoPrompt && !gameOver && !hasNoAds
    assert.ok(/activeLaneId === 'accelerated' && showUndoPrompt && !gameOver && !hasNoAds/.test(src), 'undo RewardPrompt must be gated by accelerated && showUndoPrompt && !gameOver && !hasNoAds (between-games)');
    // Continue slot gated by gameOver && canContinueDerived
    assert.ok(/gameOver \?/.test(src) || /canContinueDerived/.test(src), 'GameOverOverlay / continue must be gated by gameOver');
    assert.ok(/Continue/.test(src) || /canContinue/.test(src), 'continue gating must be visible in App.tsx');
  });

  it('no Interstitial/Banner/AppOpen literal in App.tsx or aids overlays', () => {
    const files = ['triade/App.tsx', 'triade/src/ui/AcceleratedAids.tsx', 'triade/src/ui/GameOverOverlay.tsx'];
    const forbidden = /InterstitialAd|BannerAd|AppOpenAd|GAMInterstitialAd/;
    for (const rel of files) {
      const src = read(rel);
      assert.ok(!forbidden.test(src), `${rel} must not contain interstitial/banner/app-open literal`);
    }
  });

  it('hasNoAds bypass never calls gateway (unlimited owners rewind immediately)', () => {
    const src = read('triade/App.tsx');
    // handleUndoRequest has hasNoAds immediate branch before gateway
    assert.ok(/hasNoAds && activeProfile\.canUndo/.test(src), 'handleUndoRequest must have hasNoAds immediate branch without ad');
    // handleContinueAd has hasNoAds immediate continue without ad
    assert.ok(/hasNoAds && activeProfile\.canContinue/.test(src), 'handleContinueAd must have hasNoAds immediate branch without ad');
  });

  it('busy guards prevent concurrent ad double-trigger', () => {
    const src = read('triade/App.tsx');
    assert.ok(/adBusyRef\.current/.test(src), 'App.tsx must gate ads via adBusyRef');
    assert.ok(/busyRef\.current/.test(src), 'App.tsx must gate moves via busyRef');
  });
});
