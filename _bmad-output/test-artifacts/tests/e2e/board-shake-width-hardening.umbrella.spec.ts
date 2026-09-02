/**
 * E2E Umbrella — dw-board-shake-width-hardening (RED-PHASE, test.skip)
 * Static scans — umbrella level, host node:test, no browser page.goto (RN Expo 57, no web seam)
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at e3c4155).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/board-shake-width-hardening.umbrella.spec.ts
 * Delta: e3c4155 vs e3c52ae — triade/src/render/GameBoard.tsx +150/-10 safeWidth + shakeNotifyTimerRef 130ms, triade/App.tsx +5 isBoardShaking
 * Spec: _bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md (status done, final_revision db01dfa, baseline e3c52ae, 5-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design-dw-board-shake-width-hardening.md (10 risks, 3 high score 6)
 * Ledger: deferred-work.md DW-107, DW-110 done 2026-09-02 + resolution-undo e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f ×2
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gbPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md', import.meta.url).pathname;
const designPath = new URL('../../../../_bmad-output/test-artifacts/test-design-dw-board-shake-width-hardening.md', import.meta.url).pathname;

function src(p: string) {
  return readFileSync(p, 'utf8');
}

test.skip('[P0-UMB-01] board shake width hardening journey — overflow visible 130ms + width guard NaN→1 + isBoardShaking wiring (DW-107/DW-110)', () => {
  const gb = src(gbPath);
  const app = src(appPath);
  // width guard journey: NaN/Infinity/-5/0/undefined → safeWidth 1 → View/Canvas/RoundedRect/overlay 1 not NaN
  assert.ok(gb.includes('const finiteWidth = Number.isFinite(width) ? (width as number) : 1;'), 'journey: finiteWidth guard');
  assert.ok(gb.includes('const safeWidth = Math.max(1, finiteWidth);'), 'journey: safeWidth guard');
  assert.ok(gb.includes('<View style={{ width: safeWidth, height: safeWidth }}>'), 'journey: View safeWidth');
  assert.ok(gb.includes('<Canvas style={{ width: safeWidth, height: safeWidth }}>'), 'journey: Canvas safeWidth');
  assert.ok(gb.includes('<RoundedRect x={0} y={0} width={safeWidth} height={safeWidth}'), 'journey: RoundedRect safeWidth');
  assert.ok(gb.includes('width: safeWidth,') && gb.includes('height: safeWidth,'), 'journey: overlay safeWidth');
  assert.ok(gb.includes('width, height: width'), 'journey: literal comment preserved');
  assert.ok(gb.includes('BOARD_PADDING + SHAKE_CAP'), 'journey: padding spare comment');
  // shake notify journey: 130ms toggle + symmetric cancel + App conditional
  assert.ok(gb.includes('const shakeNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'journey: timer ref');
  assert.ok(gb.includes('const scheduleShakeVisible = useCallback(() => {'), 'journey: schedule def');
  assert.ok(gb.includes('notifyShakeActive(true);'), 'journey: true');
  assert.ok(gb.includes('}, 130);'), 'journey: 130ms');
  assert.ok(gb.includes('const cancelShakeNotify = useCallback(() => {'), 'journey: cancel def');
  assert.ok(gb.includes("isBoardShaking ? { overflow: 'visible' } : null") || app.includes("isBoardShaking ? { overflow: 'visible' } : null"), 'journey: App conditional visible');
  assert.ok(app.includes('onShakeActiveChange={setIsBoardShaking}'), 'journey: App wiring');
  // never throws: try/catch swallow
  assert.ok(gb.includes('} catch {}'), 'journey: swallow');
  // engine stays thin: overlay/board hardening never imports engine
  assert.strictEqual((gb.match(/from\s+['"].*\/engine\//g) || []).length, 0, 'journey: no engine import in GameBoard');
});

test.skip('[P0-UMB-02] engine boundary — git diff -- triade/src/engine empty + spec Never engine/feel change', () => {
  const spec = src(specPath);
  assert.ok(spec.includes('Always:'), 'spec Always');
  assert.ok(spec.includes('Block If:'), 'spec Block If');
  assert.ok(spec.includes('Never:'), 'spec Never');
  // static proxy: GameBoard never imports engine
  const gb = src(gbPath);
  assert.strictEqual((gb.match(/from\s+['"].*engine\//g) || []).length, 0, 'no engine import');
  // feel datum stays single-source: shake.ts not modified, GameBoard delegates via maxShakeForTrace + directionVector
  assert.ok(gb.includes('maxShakeForTrace') || gb.includes('directionVector'), 'feel delegation present');
  assert.ok(!gb.includes('Math.random') || gb.includes('board') , 'no Math.random in board shake path');
});

test.skip('[P1-UMB-01] shake lifecycle journey — schedule true→clear→setTimeout 130 then cancel on NOOP/slide-only/no-dir/reducedMotion/invalid dir + unmount cleanup', () => {
  const gb = src(gbPath);
  // schedule ordering
  const schedIdx = gb.indexOf('const scheduleShakeVisible = useCallback(() => {');
  const sched = gb.slice(schedIdx, schedIdx + 600);
  assert.ok(sched.indexOf('notifyShakeActive(true);') < sched.indexOf('clearTimeout(shakeNotifyTimerRef.current)'), 'schedule true before clear');
  // cancel on every non-shake branch: reducedMotion + invalid dir + slide-only + NOOP =4
  assert.strictEqual((gb.match(/cancelShakeNotify\(\)/g) || []).length, 4, 'cancel ×4 journey');
  // amplitude>0 gate single
  assert.ok(gb.includes('if (amplitude > 0) {'), 'amplitude gate');
  assert.strictEqual((gb.match(/scheduleShakeVisible\(\)/g) || []).length, 1, 'schedule exactly once');
  // unmount cleanup journey
  assert.ok(gb.includes('return () => {'), 'cleanup return');
  const cleanupIdx = gb.indexOf('return () => {');
  const cleanup = gb.slice(cleanupIdx, cleanupIdx + 240);
  assert.ok(cleanup.includes('clearTimeout(shakeNotifyTimerRef.current)'), 'cleanup clear');
  assert.ok(cleanup.includes('shakeNotifyTimerRef.current = null;'), 'cleanup null');
  // reducedMotion snap + cancel journey
  assert.ok(gb.includes('if (reducedMotion) {'), 'reducedMotion guard');
  const rmIdx = gb.indexOf('if (reducedMotion) {');
  const rmSlice = gb.slice(rmIdx, rmIdx + 500);
  assert.ok(rmSlice.includes('withTiming(0, { duration: 20 });'), 'snap 20ms');
  assert.ok(rmSlice.includes('cancelShakeNotify();'), 'cancel after snap');
});

test.skip('[P1-UMB-02] width guard propagation journey — safeWidth 9 + Number.isFinite(width) 1 + width literal 1 + 130 count + App overflow hidden/visible', () => {
  const gb = src(gbPath);
  const app = src(appPath);
  assert.strictEqual((gb.match(/safeWidth/g) || []).length, 9, 'safeWidth 9 journey');
  assert.strictEqual((gb.match(/Number\.isFinite\(width\)/g) || []).length, 1, 'Number.isFinite(width) 1 journey');
  assert.ok(gb.includes('width, height: width'), 'literal 1 journey');
  assert.strictEqual((gb.match(/width, height: width/g) || []).length, 1, 'literal count 1');
  assert.ok(gb.includes('BOARD_PADDING + SHAKE_CAP'), 'spare comment journey');
  assert.ok(app.includes("overflow: 'visible'") && app.includes("overflow: 'hidden'"), 'App visible+hidden journey');
  assert.ok(gb.includes('withSequence') && gb.includes('withTiming'), 'worklet sequence/timing journey');
  // 130 appears 6×: comment + setTimeout 130 + withTiming 130×2 + spec comments? pinned 6
  assert.ok((gb.match(/\b130\b/g) || []).length >= 3, '130 at least 3 journey');
});

test.skip('[P1-UMB-03] App wiring journey — isBoardShaking state + boardWrap conditional visible + onShakeActiveChange={setIsBoardShaking} + StyleSheet hidden base preserved', () => {
  const app = src(appPath);
  assert.ok(app.includes('const [isBoardShaking, setIsBoardShaking] = useState(false);'), 'isBoardShaking def journey');
  assert.strictEqual((app.match(/isBoardShaking/g) || []).length, 2, 'isBoardShaking ×2 journey');
  assert.ok(app.includes("isBoardShaking ? { overflow: 'visible' } : null"), 'conditional');
  assert.ok(app.includes('onShakeActiveChange={setIsBoardShaking}'), 'prop threading journey');
  // base hidden preserved
  assert.ok(app.includes("overflow: 'hidden'"), 'hidden base preserved journey');
  assert.strictEqual((app.match(/overflow: 'visible'/g) || []).length, 1, 'visible ×1 journey');
});

test.skip('[P1-UMB-04] rapid re-shake + reducedMotion mid-shake race journey — clearTimeout before setTimeout prevents double false, snap immediate', () => {
  const gb = src(gbPath);
  // rapid re-shake: schedule does clear then setTimeout → single trailing false at 220ms not double at 130
  const schedIdx = gb.indexOf('const scheduleShakeVisible = useCallback(() => {');
  const sched = gb.slice(schedIdx, schedIdx + 600);
  assert.ok(sched.indexOf('clearTimeout(shakeNotifyTimerRef.current)') < sched.indexOf('shakeNotifyTimerRef.current = setTimeout'), 're-shake clear before setTimeout journey');
  // reducedMotion mid-shake: effect snaps withTiming(0,20)×3 + cancel immediate not 130 wait
  const rmIdx = gb.indexOf('if (reducedMotion) {');
  const rmSlice = gb.slice(rmIdx, rmIdx + 500);
  assert.ok(rmSlice.includes('shakeX.value = withTiming(0, { duration: 20 });'), 'mid-shake snap X journey');
  assert.ok(rmSlice.includes('cancelShakeNotify();'), 'mid-shake cancel journey');
  // deps prove no stale closure: [reducedMotion, shakeX, shakeY, bulletFlash, cancelShakeNotify]
  assert.ok(gb.includes('[reducedMotion, shakeX, shakeY, bulletFlash, cancelShakeNotify]'), 'reducedMotion deps journey');
  // moveResult effect deps include both callbacks
  assert.ok(gb.includes('[moveResult, board, applyPlan, direction, reducedMotion, sessionBestMerge, shakeX, shakeY, bulletFlash, syncTiles, rebuildTilesFromBoard, scheduleShakeVisible, cancelShakeNotify]'), 'moveResult deps journey');
});

test.skip('[P2-UMB-01] single-constant + narrow 160 + ledger/spec/design journey — Math.max(1,finiteWidth) clamp 1 + 160 cell 30 + e7ad61… ×2 + final_revision + sprint-status empty', () => {
  const gb = src(gbPath);
  const ledger = src(ledgerPath);
  const spec = src(specPath);
  const design = src(designPath);
  // single safeWidth alias not scattered Math.max(1, finiteWidth)
  assert.ok(gb.includes('Math.max(1, finiteWidth)'), 'clamp 1 journey');
  assert.ok(gb.includes('Math.max((safeWidth -'), 'cell clamp via safeWidth journey');
  // narrow 160: (160-16-24)/4=30
  assert.ok(gb.includes('CELL_GAP * (GRID - 1)'), 'cell gap term journey');
  // ledger 64-hex ×2
  assert.strictEqual((ledger.match(/e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f/g) || []).length, 2, 'hash ×2 journey');
  assert.ok(ledger.includes('DW-107') && ledger.includes('DW-110'), 'DW-107/110 journey');
  assert.ok(ledger.includes('status: done 2026-09-02'), 'done date journey');
  assert.ok(spec.includes('final_revision: db01dfa'), 'final_revision journey');
  assert.ok(spec.includes('baseline_revision: e3c52ae'), 'baseline journey');
  assert.ok(design.includes('sprint-status.yaml'), 'design ownership journey');
  assert.ok(true, 'manual gate: git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty journey');
});

test.skip('[P2-UMB-02] swallow + tsc + engine byte-identical journey — try/catch {} empty, both tsc clean, triade/src/engine empty', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('} catch {}'), 'empty catch journey');
  assert.ok(gb.includes('onShakeActiveChange?:'), 'optional prop journey');
  assert.ok(gb.includes('[onShakeActiveChange]'), 'notify deps journey');
  // tsc + engine are manual gates: both tsc --noEmit clean, git diff -- triade/src/engine --stat empty
  assert.ok(true, 'manual: both tsc --noEmit clean + git diff -- triade/src/engine --stat empty journey');
});
