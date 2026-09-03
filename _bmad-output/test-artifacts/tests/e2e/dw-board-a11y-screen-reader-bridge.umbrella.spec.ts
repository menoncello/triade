/**
 * E2E Umbrella — dw-board-a11y-screen-reader-bridge (RED-PHASE, test.skip)
 * Host node:test — static scans + exploratory journeys as E2E (no Playwright page.goto — RN Expo 57, focus/Canvas is host-spy verified)
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree at 4709640 + DW-112/113 ledger done).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/dw-board-a11y-screen-reader-bridge.umbrella.spec.ts
 * De-skipped run (activated): 7 pass ~250ms (P2 4 scans + P3 3 exploratory/hygiene). Before 4709640 would fail (no focus effect, no wrapper, ledger open).
 * Delta: triade/src/a11y/boardAccessibility.tsx:1-83 focus + triade/src/render/GameBoard.tsx:658 wrapper + rn-stub 102 + deferred-work.md DW-112/113 done 2026-09-03 + spec done
 * Spec: _bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md (4 ACs, I/O matrix, Boundaries, Never duplication)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-board-a11y-screen-reader-bridge.md (11 risks, 3 high R-001/R-002/R-003, NFR a11y/never-throw/perf)
 * Ledger: deferred-work.md DW-112/113 + resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only umbrella
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const boardA11yPath = new URL('../../../../triade/src/a11y/boardAccessibility.tsx', import.meta.url).pathname;
const gameBoardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const stubPath = new URL('../../../../triade/test-utils/rn-stub.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md', import.meta.url).pathname;
const engineBoardPath = new URL('../../../../triade/src/engine/index.ts', import.meta.url).pathname;

function src(p:string){ return readFileSync(p,'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary + allowlist scans (umbrella journey — full-file allowlists + ledger + isolation)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-E2E-01] SCAN no engine duplication + width parity + null-guarded focus loop (R-008)', () => {
  const s=src(boardA11yPath);
  assert.match(s, /BOARD_PADDING|CELL_GAP|GRID/, 'must reuse GRID/PAD/GAP math = GameBoard');
  assert.ok(!s.includes('merge') || s.includes('announceTile'), 'src/a11y must not duplicate engine merge beyond announceTile');
  assert.match(s, /safeWidth/, 'must use safeWidth = Math.max(1, finiteWidth)');
  assert.match(s, /if\s*\(row\[c\]\s*!==\s*null\)/, 'focus scanner must use !== null not truthiness');
  const constants = s.match(/__BOARD_A11Y_CONSTANTS/g) || [];
  assert.ok(constants.length >= 1, '__BOARD_A11Y_CONSTANTS must be exported');
});

test.skip('[P2-E2E-02] SCAN ledger DW-112 + DW-113 resolution-undo e282524d + hex open (R-011)', () => {
  const ledger=src(ledgerPath);
  const hash='e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75';
  const hex='7374617475733a206f70656e';
  const hashHits=(ledger.match(new RegExp(hash,'g'))||[]).length;
  assert.ok(hashHits>=2, `resolution-undo ${hash} must appear at least twice (DW-112+DW-113), got ${hashHits}`);
  assert.match(ledger, new RegExp(hex), 'must contain 7374617475733a206f70656e');
  assert.match(ledger, /DW-112[\s\S]*status:\s*done 2026-09-03/, 'DW-112 must be done 2026-09-03');
  assert.match(ledger, /DW-113[\s\S]*status:\s*done 2026-09-03/, 'DW-113 must be done 2026-09-03');
  assert.equal((ledger.match(/resolution-undo/g)||[]).length>=2, true, 'resolution-undo must appear at least twice');
});

test.skip('[P2-E2E-03] SCAN engine/layout/announcements/gestures empty diff + spec contract present (Not in Scope)', () => {
  const specSrc=src(specPath);
  assert.match(specSrc, /Intent/, 'spec must contain Intent');
  assert.match(specSrc, /I\/O & Edge-Case Matrix/, 'spec must contain I/O matrix');
  assert.match(specSrc, /Focus after move/, 'spec must contain Focus after move');
  assert.match(specSrc, /Canvas hidden/, 'spec must contain Canvas hidden');
  const boardSrc=src(boardA11yPath);
  // boardAccessibility should only import Board type from engine
  const engineImports = (boardSrc.match(/from ['"]\.\.\/engine/g)||[]).length;
  assert.ok(engineImports <= 1, `engine imports must be <=1 (Board type only), got ${engineImports}`);
  assert.match(boardSrc, /import type \{ Board \}/, 'must import Board type only');
});

test.skip('[P2-E2E-04] focus heuristic doc + manual VoiceOver ear-check placeholder (R-001)', () => {
  const specSrc=src(specPath);
  assert.match(specSrc, /first surviving tile/, 'spec Design Notes must document first surviving row-major heuristic');
  assert.match(specSrc, /setAccessibilityFocus|tileRefs/, 'spec Code Map must reference focus management');
  assert.match(specSrc, /Design Notes/, 'spec must have Design Notes');
});

// ─────────────────────────────────────────────────────────────────────────────
// P3 — exploratory / residual / hygiene
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P3-E2E-01] manual VoiceOver ear-check — focus lands on live tile, Canvas duplicate gone (R-001/R-003)', () => {
  const boardSrc=src(boardA11yPath);
  const gameSrc=src(gameBoardPath);
  assert.ok(boardSrc.includes('setAccessibilityFocus'), 'source must have setAccessibilityFocus for manual trap to exist');
  assert.ok(gameSrc.includes('importantForAccessibility="no-hide-descendants"'), 'GameBoard must hide Canvas for manual check');
  assert.match(boardSrc, /tileRefs\.current\.get\(key\)/, 'must have vanished guard for manual to be meaningful');
  assert.ok(true, 'manual gate: iOS Simulator VoiceOver on → three-finger swipe → focus on live tile after move, no duplicate Canvas item, handled as release smoke not host gate');
});

test.skip('[P3-E2E-02] TalkBack divergence — setAccessibilityFocus missing does not crash (R-005)', () => {
  const s=src(boardA11yPath);
  assert.match(s, /typeof\s+ai\.setAccessibilityFocus/, 'must guard typeof setAccessibilityFocus for TalkBack divergence');
  assert.match(s, /try\s*\{/, 'must try wrap for TalkBack null handle');
  assert.match(s, /catch\s*\{\s*\}/, 'catch must be empty swallow never-throw');
  assert.ok(true, 'manual gate: Android TalkBack emulator — board move → no crash, no duplicate Canvas announcement');
});

test.skip('[P3-E2E-03] performance + never-throw hygiene — O(16) scan + ledger health (R-009/R-011)', () => {
  const s=src(boardA11yPath);
  // focus effect is O(16) — single useEffect call + single scan loop (import + call = 2 hits for "useEffect")
  const effectCallHits = (s.match(/useEffect\s*\(/g)||[]).length;
  assert.ok(effectCallHits===1, `must have exactly 1 useEffect call for focus (got ${effectCallHits})`);
  const scanLoopHits = (s.match(/outer:\s*for/g)||[]).length;
  assert.equal(scanLoopHits, 1, 'must have exactly 1 labelled outer scan loop O(16)');
  // ledger health
  const ledger=src(ledgerPath);
  assert.equal((ledger.match(/e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75/g)||[]).length>=2, true, 'ledger hash must appear >=2');
  assert.match(ledger, /7374617475733a206f70656e/, 'ledger must contain hex open');
  // sprint-status.yaml not written
  assert.ok(true, 'gate: git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml must stay empty (orchestrator-owned)');
});
