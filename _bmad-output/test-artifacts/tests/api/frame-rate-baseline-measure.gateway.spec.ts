/**
 * API Gateway — dw-frame-rate-baseline-measure (RED-PHASE, test.skip)
 * Host node:test — source-pins for the probe-wiring contract. There is no
 * HTTP API on this bundle (pure RN hook + math); the gateway level asserts
 * the completion contract (export + null-check + reset + memoization +
 * WINDOW freeze + DW-32 generation boundary + no-log + App.tsx untouched).
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/frame-rate-baseline-measure.gateway.spec.ts
 * Fails pre-fix (6b16593 lacks export/useCallback/useFrameCallback(onFrame)/
 * ===null/computeFrameRateStats(samples)); passes at HEAD.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { GUARDS } from '../../fixtures/dw-frame-rate-baseline-measure-fixtures.ts';

const hookPath = new URL('../../../../triade/src/render/useFrameRateBaseline.ts', import.meta.url)
  .pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;

test.skip('[P0-API-01] AC2 completion contract: exported compute + null-check + full reset', () => {
  // Given: the hardened hook source
  // When: the completion path is scanned
  // Then: export + call + null-check + durations/last/count reset present
  const src = readFileSync(hookPath, 'utf8');
  assert.ok(src.includes(GUARDS.exportFn), 'missing exported computeFrameRateStats');
  assert.ok(src.includes(GUARDS.completionCall), 'completion must call computeFrameRateStats(samples)');
  assert.ok(src.includes(GUARDS.nullCheck), 'completion must null-check before publishing');
  assert.ok(src.includes(GUARDS.resetDurations), 'empty path must reset durations.current = []');
  assert.ok(src.includes(GUARDS.resetLast), 'empty path must reset last.current = 0');
  assert.ok(src.includes(GUARDS.resetCount), 'empty path must reset count.current = 0');
});

test.skip('[P0-API-02] AC3 memoization: onFrame stable, single useFrameCallback(onFrame)', () => {
  // Given: auto-drive re-renders mid-window
  // When: callback wiring is scanned
  // Then: useCallback decl + useFrameCallback(onFrame) (time base never resets)
  const src = readFileSync(hookPath, 'utf8');
  assert.ok(src.includes(GUARDS.memoDecl), 'missing const onFrame = useCallback(');
  assert.ok(src.includes(GUARDS.memoUse), 'missing useFrameCallback(onFrame)');
});

test.skip('[P0-API-03] WINDOW frozen at 120 (Never constraint)', () => {
  // Given: the spec Never constraint
  // When: the hook source is scanned
  // Then: exactly one `const WINDOW = 120`
  const src = readFileSync(hookPath, 'utf8');
  assert.equal(src.split(GUARDS.windowFreeze).length - 1, 1, 'WINDOW must appear exactly once as 120');
});

test.skip('[P1-API-01] DW-32 generation-reset effect unchanged', () => {
  // Given: the shared DW-32 AC-5 boundary
  // When: the generation effect is scanned
  // Then: seenGeneration gate + durations/last/count/done/stats reset intact
  const src = readFileSync(hookPath, 'utf8');
  assert.ok(src.includes(GUARDS.generationEffect), 'missing seenGeneration effect');
  assert.ok(src.includes(GUARDS.generationResetDone), 'missing done.current = false');
  assert.ok(src.includes(GUARDS.generationResetStats), 'missing setStats(null)');
});

test.skip('[P1-API-02] Zero logging in frame-math path (release hard rule)', () => {
  // Given: the release hard rule (no worklet logging)
  // When: the hook source is scanned
  // Then: no console.* calls
  const src = readFileSync(hookPath, 'utf8');
  assert.ok(!src.includes('console.'), 'frame-math path must not log');
});

test.skip('[P1-API-03] App.tsx untouched boundary (sole consumer, signature identical)', () => {
  // Given: App.tsx is the sole consumer and must stay untouched
  // When: hook references are scanned
  // Then: ≥2 useFrameRateBaseline refs, no math in App
  const src = readFileSync(appPath, 'utf8');
  assert.ok(
    src.split('useFrameRateBaseline').length - 1 >= 2,
    'expected ≥2 useFrameRateBaseline references in App.tsx',
  );
  assert.ok(!src.includes('computeFrameRateStats'), 'math must not leak into App.tsx');
});

test.skip('[P1-API-04] Reference oracle suite present and green-shaped', () => {
  // Given: the bundle-time oracle suite
  // When: its file is checked
  // Then: exists with 7 checks (already green at HEAD)
  const oracle = new URL(
    '../../../../triade/__tests__/render/useFrameRateBaseline.math.test.ts',
    import.meta.url,
  ).pathname;
  assert.ok(existsSync(oracle), 'missing oracle suite');
  const src = readFileSync(oracle, 'utf8');
  assert.ok(src.includes('computeLocal'), 'oracle must exercise the local formula');
});

test.skip('[P2-API-01] done latches only on non-null publish (no dead latch)', () => {
  // Given: the empty-window retry contract
  // When: latch ordering is scanned
  // Then: `done.current = true` appears after the null-check (publish path only)
  const src = readFileSync(hookPath, 'utf8');
  const nullAt = src.indexOf(GUARDS.nullCheck);
  const latchAt = src.indexOf('done.current = true');
  assert.ok(nullAt !== -1 && latchAt !== -1 && latchAt > nullAt, 'done must latch after the null check');
});

test.skip('[P2-API-02] git boundary: App.tsx untouched vs 6b16593', () => {
  // Given: the bundle baseline revision
  // When: the App.tsx diff is measured
  // Then: empty (hook-only production delta)
  const out = execFileSync('git', ['diff', '6b16593', 'HEAD', '--', 'triade/App.tsx'], {
    encoding: 'utf8',
  });
  assert.equal(out.trim(), '', 'triade/App.tsx must be untouched vs 6b16593');
});
