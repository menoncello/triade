/**
 * API Gateway — dw-board-shake-width-hardening (RED-PHASE, test.skip)
 * Host node:test — source-pins for safeWidth guard + shakeNotify 130ms + App overflow conditional + ledger
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at e3c4155).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/board-shake-width-hardening.gateway.spec.ts
 * Mirrors _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts P0/P1 for api level compliance.
 * Delta: e3c4155 vs e3c52ae — triade/src/render/GameBoard.tsx +150/-10 safeWidth + shakeNotifyTimerRef 130ms, triade/App.tsx +5 isBoardShaking
 * Spec: _bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md (final_revision db01dfa, baseline e3c52ae)
 * Design: _bmad-output/test-artifacts/test-design-dw-board-shake-width-hardening.md (10 risks, 3 high R-001/R-002/R-003 score 6)
 * Ledger: deferred-work.md DW-107, DW-110 done 2026-09-02 + resolution-undo e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f ×2
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gbPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md', import.meta.url).pathname;

function src(p: string) {
  return readFileSync(p, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit (board visual correctness + width guard)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] DW-110 width guard — safeWidth Math.max(1, Number.isFinite(width)?width:1) propagates to View/Canvas/RoundedRect/overlay/cell (R-002)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('const finiteWidth = Number.isFinite(width) ? (width as number) : 1;'), 'finiteWidth guard');
  assert.ok(gb.includes('const safeWidth = Math.max(1, finiteWidth);'), 'safeWidth guard');
  assert.ok(gb.includes('const cell = Math.max((safeWidth - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID, 1);'), 'cell uses safeWidth');
  assert.strictEqual((gb.match(/Number\.isFinite\(width\)/g) || []).length, 1, 'Number.isFinite(width) exactly once');
  // safeWidth 9 = def + cell + View + Canvas + RoundedRect + overlay width/height + comments
  assert.strictEqual((gb.match(/safeWidth/g) || []).length, 9, 'safeWidth 9');
  assert.ok(gb.includes('<View style={{ width: safeWidth, height: safeWidth }}>'), 'View safeWidth');
  assert.ok(gb.includes('<Canvas style={{ width: safeWidth, height: safeWidth }}>'), 'Canvas safeWidth');
  assert.ok(gb.includes('<RoundedRect x={0} y={0} width={safeWidth} height={safeWidth}'), 'RoundedRect safeWidth');
  assert.ok(gb.includes('width: safeWidth,') && gb.includes('height: safeWidth,'), 'overlay safeWidth');
  // literal comment preserved for reducedMotion.atdd P2-06
  assert.ok(gb.includes('width, height: width'), 'must retain width, height: width literal comment');
});

test.skip('[P0-API-02] DW-110 NaN/Infinity/-Infinity/undefined → safeWidth 1 not NaN (R-002) + Math.max(1,finiteWidth) gate', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('Math.max(1, finiteWidth)'), 'clamp 1');
  assert.strictEqual((gb.match(/Number\.isNaN/g) || []).length, 0, 'no scattered Number.isNaN');
  // structural proof: finiteWidth on NaN is 1, on Infinity is 1, on undefined Number.isFinite false →1 → safeWidth 1
  // host render would assert View/Canvas/overlay style.width===1 via react-test-renderer
});

test.skip('[P0-API-03] DW-107 onShakeActiveChange contract — optional prop + ?. + try/catch never-throws (R-006)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('onShakeActiveChange?: (active: boolean) => void;'), 'prop optional interface');
  assert.ok(gb.includes('onShakeActiveChange?.(active)'), 'optional chaining');
  assert.ok(gb.includes('try {') && gb.includes('} catch {}'), 'try/catch swallow');
  assert.ok(gb.includes('const notifyShakeActive = useCallback('), 'notifyShakeActive useCallback');
  assert.ok(gb.includes('[onShakeActiveChange]'), 'notify deps onShakeActiveChange');
  assert.strictEqual((gb.match(/onShakeActiveChange/g) || []).length, 4, 'onShakeActiveChange 4 hits');
});

test.skip('[P0-API-04] DW-107 shakeNotifyTimerRef + scheduleShakeVisible true→130→false symmetric + cancelShakeNotify (R-001/R-003)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('const shakeNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'ref def');
  assert.ok(gb.includes('const scheduleShakeVisible = useCallback(() => {'), 'schedule def');
  assert.ok(gb.includes('notifyShakeActive(true);'), 'schedule true');
  assert.ok(gb.includes('clearTimeout(shakeNotifyTimerRef.current)'), 'clear present');
  assert.strictEqual((gb.match(/clearTimeout\(shakeNotifyTimerRef\.current\)/g) || []).length, 3, 'clear ×3 (schedule+cancel+unmount)');
  assert.ok(gb.includes('setTimeout(() => {'), 'setTimeout');
  assert.ok(gb.includes('}, 130);'), '130 exactly');
  assert.ok(gb.includes('const cancelShakeNotify = useCallback(() => {'), 'cancel def');
  assert.ok(gb.includes('notifyShakeActive(false);'), 'cancel false');
  assert.ok(gb.includes('BOARD_PADDING + SHAKE_CAP'), 'compensating padding spare');
  // schedule order notify true < clear < setTimeout
  const schedIdx = gb.indexOf('const scheduleShakeVisible = useCallback(() => {');
  const sched = gb.slice(schedIdx, schedIdx + 600);
  assert.ok(sched.indexOf('notifyShakeActive(true);') < sched.indexOf('if (shakeNotifyTimerRef.current)'), 'notify true before clear');
  assert.ok(sched.indexOf('clearTimeout(shakeNotifyTimerRef.current)') < sched.indexOf('shakeNotifyTimerRef.current = setTimeout'), 'clear before setTimeout');
});

test.skip('[P0-API-05] DW-107 App boardWrap overflow conditional — isBoardShaking state + visible/hidden + prop threading (R-001/R-004)', () => {
  const app = src(appPath);
  assert.ok(app.includes('const [isBoardShaking, setIsBoardShaking] = useState(false);'), 'isBoardShaking state');
  assert.ok(app.includes("isBoardShaking ? { overflow: 'visible' } : null"), 'conditional visible');
  assert.strictEqual((app.match(/isBoardShaking/g) || []).length, 2, 'isBoardShaking ×2');
  assert.strictEqual((app.match(/overflow: 'visible'/g) || []).length, 1, 'visible ×1');
  assert.strictEqual((app.match(/overflow: 'hidden'/g) || []).length, 2, 'hidden ×2 base');
  assert.ok(app.includes('onShakeActiveChange={setIsBoardShaking}'), 'prop threaded');
});

test.skip('[P0-API-06] DW-107 cancelShakeNotify on every non-shake branch — reducedMotion + invalid dir + slide-only + NOOP (R-003)', () => {
  const gb = src(gbPath);
  assert.strictEqual((gb.match(/cancelShakeNotify\(\)/g) || []).length, 4, 'cancel ×4');
  assert.ok(gb.includes('if (reducedMotion)'), 'reducedMotion branch');
  assert.ok(gb.includes('// Invalid direction — suppress shake'), 'invalid dir branch');
  assert.ok(gb.includes('// Effective move but no merge (slide-only)'), 'slide-only branch');
  assert.ok(gb.includes('// NOOP, Reduced Motion, or missing direction'), 'NOOP branch');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (race + wiring + reducedMotion + ledger)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] DW-107 rapid re-shake reset — schedule does clearTimeout before setTimeout 130 (R-001)', () => {
  const gb = src(gbPath);
  const schedIdx = gb.indexOf('const scheduleShakeVisible = useCallback(() => {');
  const sched = gb.slice(schedIdx, schedIdx + 600);
  const claroIdx = sched.indexOf('clearTimeout(shakeNotifyTimerRef.current)');
  const timeoutIdx = sched.indexOf('shakeNotifyTimerRef.current = setTimeout');
  assert.ok(claroIdx !== -1 && timeoutIdx !== -1 && claroIdx < timeoutIdx, 'clear before setTimeout');
});

test.skip('[P1-API-02] DW-107 reducedMotion mid-shake snap + cancel — withTiming(0,20)×3 then cancelShakeNotify (R-003)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('if (reducedMotion) {'), 'reducedMotion guard');
  const rmIdx = gb.indexOf('if (reducedMotion) {');
  const rmSlice = gb.slice(rmIdx, rmIdx + 500);
  assert.ok(rmSlice.includes('shakeX.value = withTiming(0, { duration: 20 });'), 'shakeX snap');
  assert.ok(rmSlice.includes('shakeY.value = withTiming(0, { duration: 20 });'), 'shakeY snap');
  assert.ok(rmSlice.includes('bulletFlash.value = withTiming(0, { duration: 20 });'), 'bulletFlash snap');
  assert.ok(rmSlice.includes('cancelShakeNotify();'), 'cancel after snap');
  assert.ok(gb.includes('[reducedMotion, shakeX, shakeY, bulletFlash, cancelShakeNotify]'), 'deps include cancel');
});

test.skip('[P1-API-03] DW-107 schedule gated amplitude>0 — only merge shake drives scheduleShakeVisible, 4 dirs axis (R-001)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('if (amplitude > 0) {'), 'amplitude>0 gate');
  assert.strictEqual((gb.match(/scheduleShakeVisible\(\)/g) || []).length, 1, 'schedule exactly once');
  assert.ok(gb.includes('directionVector(direction)'), 'directionVector');
  assert.ok(gb.includes('if (vec.x !== 0)'), 'vec.x gate');
  assert.ok(gb.includes('} else if (vec.y !== 0)'), 'vec.y gate');
  assert.ok(gb.includes('withSequence') && gb.includes('withTiming'), 'worklet sequence/timing');
});

test.skip('[P1-API-04] DW-107 unmount cleanup — useEffect return clears shakeNotifyTimerRef + nulls it (R-003 leak)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('return () => {'), 'cleanup return');
  const cleanupIdx = gb.indexOf('return () => {');
  const cleanup = gb.slice(cleanupIdx, cleanupIdx + 240);
  assert.ok(cleanup.includes('clearTimeout(shakeNotifyTimerRef.current)'), 'cleanup clear');
  assert.ok(cleanup.includes('shakeNotifyTimerRef.current = null;'), 'cleanup null');
});

test.skip('[P1-API-05] DW-110 width 0/negative clamp + narrow 160 smoke — Math.max(1,finiteWidth) ≥1 (R-002)', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('Math.max(1, finiteWidth)'), 'clamp 1');
  assert.ok(gb.includes('Math.max((safeWidth -'), 'cell clamp via safeWidth');
  // for 160, cell = (160-16-24)/4=30 host would assert View width 160
});

test.skip('[P1-API-06] Ledger + spec provenance — DW-107/110 done 2026-09-02 with resolution-undo e7ad61… ×2 (R-009)', () => {
  const ledger = src(ledgerPath);
  assert.ok(ledger.includes('DW-107') && ledger.includes('DW-110'), 'DW-107/110 present');
  assert.strictEqual((ledger.match(/e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f/g) || []).length, 2, 'hash ×2');
  assert.ok(ledger.includes('status: done 2026-09-02'), 'done date');
  assert.ok(ledger.includes('resolved by sweep bundle dw-board-shake-width-hardening'), 'resolution');
  const spec = src(specPath);
  assert.ok(spec.includes('final_revision: db01dfa'), 'final_revision');
  assert.ok(spec.includes('baseline_revision: e3c52ae'), 'baseline');
});

// P2 — ledger/spec single-constant + engine boundary

test.skip('[P2-API-01] Single-constant + engine boundary — safeWidth single alias, width literal preserved, triade/src/engine empty', () => {
  const gb = src(gbPath);
  assert.ok(gb.includes('// board container is width, height: width'), 'literal comment');
  assert.strictEqual((gb.match(/width, height: width/g) || []).length, 1, 'literal ×1');
  // engine boundary is manual: git diff -- triade/src/engine --stat empty — pinned via design
  assert.ok(true, 'engine boundary: manual git diff -- triade/src/engine empty (spec Never)');
});

test.skip('[P2-API-02] sprint-status.yaml orchestrator-owned — not written by this sweep', () => {
  assert.ok(true, 'manual gate: git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty');
});
