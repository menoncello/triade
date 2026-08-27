import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

// Story 6.3 — Restart 1-tap ATDD (RED→GREEN verified)
// Canonical location per story T3: triade/__tests__/ui/components/app.restart.test.ts
// Keep `app.gameOverWiring.test.ts` verify only (green). This suite pins the Clean-lane
// 1-tap restart contract (AC 1-7): one tap onRestart with no confirmation (AC1/3),
// handleRestart resets store immediately on same lane with 9 tiles (AC1/2/4),
// forfeited-continue dies never re-offered (AC6/7), Clean only primary CTA (AC5).
// ATDD RED scaffolds were 5 test.skip() (448 pass / 5 skipped at 3218d23); now 5 active
// GREEN (453 pass / 0 skipped). T1/T2 comment pins preserve ADR-02/AC5 guards.

const SPEC = '../../../src/ui/GameOverOverlay.tsx';

// Helpers copied from hud.test.ts / previewCard.test.ts / gameOverOverlay.test.ts — copy, don't import

function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  const parts: string[] = [];
  const walk = (c: any) => {
    if (Array.isArray(c)) c.forEach(walk);
    else if (c !== null && c !== undefined) parts.push(String(c));
  };
  renderer.root
    .findAll((node) => (node.type as string) === 'Text')
    .forEach((n) => walk(n.props.children));
  return parts;
}

function hasStyle(renderer: TestRenderer.ReactTestRenderer, match: Record<string, any>): boolean {
  return (
    renderer.root.findAll((node) => {
      const raw = node.props?.style;
      const layers = Array.isArray(raw) ? raw : [raw];
      return layers.some(
        (style) =>
          typeof style === 'object' && style !== null && Object.entries(match).every(([k, v]) => style[k] === v)
      );
    }).length > 0
  );
}

function collectStyles(renderer: TestRenderer.ReactTestRenderer): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  renderer.root.findAll((node) => node.props?.style).forEach((node) => {
    const raw = node.props.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    for (const s of layers) if (typeof s === 'object' && s !== null) out.push(s);
  });
  return out;
}

type OverlayProps = {
  stats: { score: number; best: number; maxTile: number; merges: number; longestStreak: number };
  isNewRecord: boolean;
  onRestart: () => void;
  reducedMotion?: boolean;
  insets?: { top: number; bottom: number; left: number; right: number };
};

function baseProps(overrides: Partial<OverlayProps> = {}): OverlayProps {
  return {
    stats: { score: 42, best: 100, maxTile: 24, merges: 2, longestStreak: 1 },
    isNewRecord: false,
    onRestart: () => {},
    reducedMotion: false,
    insets: { top: 10, bottom: 10, left: 10, right: 10 },
    ...overrides,
  };
}

async function renderOverlay(props: Partial<OverlayProps> = {}): Promise<TestRenderer.ReactTestRenderer> {
  const { GameOverOverlay } = await import(SPEC);
  const merged = baseProps(props);
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(GameOverOverlay, merged as any));
  });
  return renderer!;
}

// ── Helpers for source-pin style tests ──────────────────────────────────
// Reuses shared cleaner so bare-symbol scans neither false-positive on text
// inside strings nor false-negative on // URLs (helpers.ts rationale).
// Note: hasStyle/allText helpers are copied (not cross-imported) per T4 isolation > DRY.

// ── Story 6.3 scaffolds ─────────────────────────────────────────────────

test('[P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation', async () => {
  // Given the game-over overlay (thin-view, single primary CTA "Jogar de novo")
  // When I tap the CTA once
  // Then onRestart is called exactly once
  // And stripped App.tsx + GameOverOverlay.tsx contain no Alert/confirm(/Dialog

  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const overlaySrc = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const appStripped = stripCommentsAndStrings(appSrc);
  const overlayStripped = stripCommentsAndStrings(overlaySrc);

  // 1. Structural: no confirmation dialog capability in handleRestart path
  // Must NOT contain Alert / confirm( / Dialog in the restart surface
  assert.ok(!appStripped.includes('Alert'), 'App.tsx handleRestart surface must not contain Alert');
  assert.ok(!/confirm\s*\(/.test(appStripped), 'App.tsx must not contain confirm(');
  assert.ok(!overlayStripped.includes('Alert'), 'GameOverOverlay.tsx must not contain Alert');
  assert.ok(!/confirm\s*\(/.test(overlayStripped), 'GameOverOverlay.tsx must not contain confirm(');
  assert.ok(!overlayStripped.includes('Dialog'), 'GameOverOverlay.tsx must not contain Dialog (AC3 — no confirmation dialog)');
  assert.ok(/accessibilityViewIsModal/.test(overlayStripped), 'GameOverOverlay.tsx must retain accessibilityViewIsModal (a11y trap, not a Dialog)');
  // Also pin no disabled guard in overlay CTA contract (Clean 1-tap, no lock)
  assert.ok(!/\bdisabled\b/.test(overlayStripped), 'GameOverOverlay.tsx must not use disabled state (Clean 1-tap CTA is always enabled)');

  // 2. Runtime: CTA Pressable direct onPress={onRestart}, one tap = one call, no dialog
  let calls = 0;
  const spy = () => {
    calls++;
  };
  const renderer = await renderOverlay({ onRestart: spy });
  const cta = renderer.root.findByProps({ accessibilityLabel: 'Jogar de novo' });
  assert.ok(typeof cta.props.onPress === 'function', 'CTA must expose onPress');
  assert.strictEqual(cta.props.accessibilityRole, 'button', 'CTA must have accessibilityRole="button"');
  act(() => cta.props.onPress());
  assert.strictEqual(calls, 1, 'onRestart must be called exactly once per tap; no confirmation dialog intercepts');
  act(() => cta.props.onPress());
  assert.strictEqual(calls, 2, 'second tap calls again immediately — no single-use lock');
  // CTA must be pointerEvents auto and hittable during 280ms fade (UX-DR-25)
  assert.ok(hasStyle(renderer, { pointerEvents: 'auto' }) || renderer.root.findAll((n) => n.props?.pointerEvents === 'auto').length > 0, 'CTA scrim must keep pointerEvents auto — hittable through fade');
  assert.strictEqual(renderer.root.findAll((n) => n.props?.pointerEvents === 'none').length, 0, 'must never have pointerEvents none — no forced wait');
});

test('[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation', async () => {
  // Given a committed game over, When handleRestart fires, Then the store resets
  // immediately on same lane (FR-26, NFR-3) with 9 tiles, score 0 best persisted,
  // merges 0, null moveResult, busyRef false, no navigation/loader/dialog.

  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);

  // Extract handleRestart body — capture between `const handleRestart = useCallback(() => {` and `}, [`
  const handleStart = src.indexOf('const handleRestart');
  assert.ok(handleStart !== -1, 'App.tsx must define const handleRestart = useCallback');
  const handleSlice = src.slice(handleStart, handleStart + 800);
  // Must contain in that order (story T1 table): newGame(rngRef.current) → setGame(s) → setMoveResult(null) → setMatch(initialScore(persistedBest)) → setMatchStats(initialStats(s.board)) → busyRef.current = false
  const order = [
    /const\s+s\s*=\s*newGame\s*\(\s*rngRef\.current\s*\)/,
    /setGame\s*\(\s*s\s*\)/,
    /setMoveResult\s*\(\s*null\s*\)/,
    /setMatch\s*\(\s*initialScore\s*\(\s*persistedBest\s*\)\s*\)/,
    /setMatchStats\s*\(\s*initialStats\s*\(\s*s\.board\s*\)\s*\)/,
    /busyRef\.current\s*=\s*false/,
  ];
  let lastIdx = -1;
  for (const re of order) {
    const idx = handleSlice.search(re);
    assert.ok(idx !== -1, `handleRestart body must contain \`${re.source}\` in order (T1)`);
    assert.ok(idx > lastIdx, `handleRestart ordering violated for \`${re.source}\``);
    lastIdx = idx;
  }
  // Must NOT contain in handleRestart (NFR-3 / 1-tap)
  for (const bad of ['Alert', 'Dialog', 'navigation', 'navigate(', 'setInterval']) {
    assert.ok(!handleSlice.includes(bad), `handleRestart must not contain \`${bad}\` (checked over handleSlice)`);
  }
  assert.ok(!/confirm\s*\(/.test(handleSlice), 'handleRestart must not contain confirm(');
  assert.ok(!/setTimeout/.test(handleSlice), 'handleRestart must not contain setTimeout (instant restart, NFR-3)');
  assert.ok(!/setInterval/.test(handleSlice), 'handleRestart must not contain setInterval');
  assert.ok(!stripped.includes('navigation') || !/navigation/.test(handleSlice), 'handleRestart must not navigate');

  // Dependency must be [persistedBest] only — never match.best or sessionStartBestRef.current
  assert.ok(/handleRestart[\s\S]*?},\s*\[\s*persistedBest\s*\]/.test(src), 'handleRestart deps must be [persistedBest] only');
  assert.ok(!/handleRestart[\s\S]*?match\.best/.test(handleSlice), 'handleRestart must not depend on match.best (would leak session-only best after hydration failure)');
  // Do NOT add sessionStartBestRef.current = persistedBest inside handleRestart
  assert.ok(!/sessionStartBestRef\.current\s*=\s*persistedBest/.test(handleSlice), 'handleRestart must NOT set sessionStartBestRef.current = persistedBest — ref stays session-start so isNewRecord highlight remains correct');

  // T1 forfeited-continue comment is the RED pin for this story — handleRestart must contain it
  assert.ok(handleSlice.includes('forfeited continue dies'), 'handleRestart must contain comment "forfeited continue dies" before busyRef (AC6/7 pin, T1)');

  // availablePot once per render after if(!ready) shared by both lanes (review F2)
  const availablePotCount = (stripped.match(/availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board\s*\)\s*\)/g) || []).length;
  assert.strictEqual(availablePotCount, 1, `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) must appear exactly once per render, got ${availablePotCount}`);
  const readyIdx = src.indexOf('if (!ready)');
  const potIdx = src.indexOf('availablePot = potForTier');
  assert.ok(readyIdx !== -1 && potIdx > readyIdx, 'availablePot must be computed after if(!ready) guard');

  // reducedMotion literal stays until 9-4
  assert.ok(/reducedMotion=\{false\}/.test(src), 'App.tsx must keep reducedMotion={false} literal until 9-4');

  // Monetization wall (ADR-02): no monetization imports
  for (const bad of ['react-native-purchases', 'react-native-google-mobile-ads', 'expo-haptics', 'expo-audio', 'expo-secure-store']) {
    // expo-secure-store beyond settingsStore is forbidden
    if (bad === 'expo-secure-store') {
      const imports = stripped.match(/from\s+['"`]([^'"`]*expo-secure-store[^'"`]*)['"`]/g) || [];
      // settingsStore re-exports via SecureStore is not present; App.tsx must not import SecureStore directly
      assert.ok(imports.length === 0, `App.tsx must not import ${bad} beyond settingsStore (monetization wall)`);
    } else {
      assert.ok(!stripped.includes(bad), `App.tsx must not import ${bad} (monetization wall until Epic 4)`);
    }
  }

  // Runtime pin: newGame determinism — 9 tiles, pendingSpawn pre-resolved after 20-draw budget
  const { newGame } = await import('../../../src/engine/core/game.ts');
  const { mulberry32 } = await import('../../../src/utils/mulberry32.ts');
  const { ceilingDetector } = await import('../../../src/engine/core/ceiling.ts');
  const { initialScore } = await import('../../../src/game/matchScore.ts');
  const { initialStats } = await import('../../../src/game/matchStats.ts');
  const rng = mulberry32(20260808);
  const s = newGame(rng);
  const occupied = s.board.flat().filter((v) => v !== null).length;
  assert.strictEqual(occupied, 9, 'newGame(rngRef.current) must produce exactly 9 tiles');
  assert.ok(s.pendingSpawn && typeof s.pendingSpawn.value === 'number' && typeof s.pendingSpawn.displayRoll === 'number', 'newGame must pre-resolve pendingSpawn after 20-draw budget');
  const score = initialScore(77);
  assert.deepStrictEqual(score, { score: 0, best: 77 }, 'initialScore(persistedBest) must be {score:0, best:persistedBest}');
  const stats = initialStats(s.board);
  assert.strictEqual(stats.merges, 0, 'initialStats merges must be 0');
  assert.strictEqual(stats.longestStreak, 0, 'initialStats longestStreak must be 0');
  assert.strictEqual(stats.currentStreak, 0, 'initialStats currentStreak must be 0');
  assert.strictEqual(stats.maxTile, ceilingDetector(s.board), 'initialStats maxTile must equal ceilingDetector(board)');
  // Same-lane implicit: single-lane today no lane-switch logic, no SecureStore/MMKV lane memory
  assert.ok(!/lane/i.test(handleSlice) || !/SecureStore/.test(handleSlice), 'handleRestart must not contain lane-switch or SecureStore lane memory (S3.1 concern)');

  // Thin-view: verify busyRef gate is also released via onMoveSettled (deadlock Df5 defense)
  const busyFalseCount = (src.match(/busyRef\.current\s*=\s*false/g) || []).length;
  assert.ok(busyFalseCount >= 2, `busyRef.current=false must appear at least twice (handleRestart + onMoveSettled), got ${busyFalseCount}`);
});

test('[P0] AC4 9-tile same lane', async () => {
  // Given the single-lane board (Epic 6 before 3/4), When handleRestart fires,
  // Then the new match starts with the 9-tile setup and same lane rules (FR-26)

  const { newGame } = await import('../../../src/engine/core/game.ts');
  const { mulberry32 } = await import('../../../src/utils/mulberry32.ts');
  const { ceilingDetector } = await import('../../../src/engine/core/ceiling.ts');
  const { initialStats } = await import('../../../src/game/matchStats.ts');
  const { potForTier } = await import('../../../src/engine/core/pot.ts');
  const { tierForCeiling } = await import('../../../src/engine/core/index.ts');

  // newGame deterministic 9 tiles on same mulberry32(20260808) stream
  const rng = mulberry32(20260808);
  const a = newGame(rng);
  const b = newGame(rng);
  const occA = a.board.flat().filter((v) => v !== null).length;
  const occB = b.board.flat().filter((v) => v !== null).length;
  assert.strictEqual(occA, 9, 'first newGame must yield 9 tiles');
  assert.strictEqual(occB, 9, 'second newGame must also yield 9 tiles (stream determinism)');
  // Pending spawn pre-resolved after 20-draw budget (game.ts 9-tile loop + resolveSpawn + displayRoll)
  assert.ok(typeof a.pendingSpawn.value === 'number' && typeof a.pendingSpawn.displayRoll === 'number', 'pendingSpawn must be pre-resolved after 20-draw budget');
  assert.ok(typeof b.pendingSpawn.value === 'number', 'second pendingSpawn also pre-resolved');

  // initialStats ceiling invariant
  assert.strictEqual(initialStats(a.board).maxTile, ceilingDetector(a.board), 'initialStats maxTile must equal ceilingDetector for 9-tile board');

  // Same-lane via availablePot fan-out preserved — App.tsx computes availablePot once and fans to both lanes
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  assert.ok(/clean:\s*previewFor\s*\(\s*game\.pendingSpawn\s*,\s*availablePot\s*\)/.test(appSrc), 'clean preview must be previewFor(game.pendingSpawn, availablePot)');
  assert.ok(/accelerated:\s*previewFor\s*\(\s*game\.pendingSpawn\s*,\s*availablePot\s*\)/.test(appSrc), 'accelerated preview must share same availablePot (same-lane fan-out)');
  // availablePot semantics are deterministic from ceilingDetector
  const avail = potForTier(tierForCeiling(ceilingDetector(a.board)));
  assert.ok(Array.isArray(avail), 'availablePot must be an array derived from potForTier(tierForCeiling(ceilingDetector(board)))');

  // After Epic 3 lane preservation would be explicit LaneProfile.id — this test documents that today restart is implicit same-lane
  // Verify App.tsx handleRestart has no lane-switch import/assignment
  assert.ok(!/LaneProfile|laneId|setLane/.test(appSrc) || !appSrc.slice(appSrc.indexOf('handleRestart'), appSrc.indexOf('handleRestart') + 500).includes('lane'), 'handleRestart must not flip lane — implicit same-lane (FR-26)');
});

test('[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered', async () => {
  // Given a game over where a continue budget would exist (Accelerated), When I tap
  // "Jogar de novo" while a continue remains, Then the new match starts immediately
  // and the unused continue is forfeited — the once-per-game-over budget dies with
  // the game-over state (ADR-02, per-match budgets) and is never carried nor re-offered.

  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const overlaySrc = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const overlayStripped = stripCommentsAndStrings(overlaySrc);
  const appStripped = stripCommentsAndStrings(appSrc);

  // Overlay must have no second CTA (Continuar / onContinue) — Clean only
  const renderer = await renderOverlay({ onRestart: () => {} });
  const continuars = renderer.root.findAll((n) => (typeof n.type === 'string' && (n.props?.accessibilityLabel === 'Continuar' || n.props?.children === 'Continuar')));
  assert.strictEqual(continuars.length, 0, 'GameOverOverlay must not render a second CTA "Continuar" (AC5/6/7 Clean)');
  const pressables = renderer.root.findAll((n) => typeof n.type === 'string' && ((n.type as any) === 'Pressable' || n.props?.accessibilityRole === 'button'));
  // Exactly one Pressable with label "Jogar de novo" in this overlay (filter host nodes only — stub duplicates composite+host)
  const jogars = renderer.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Jogar de novo');
  assert.strictEqual(jogars.length, 1, 'overlay must have exactly one CTA "Jogar de novo"');
  // No onContinue / continueRemaining prop on overlay — verify via source import scanning
  assert.ok(!overlayStripped.includes('onContinue'), 'GameOverOverlay.tsx must not contain onContinue (Epic 3/4 owns it)');
  assert.ok(!overlayStripped.includes('continueRemaining'), 'GameOverOverlay.tsx must not contain continueRemaining');
  assert.ok(!overlayStripped.includes('continueBudget'), 'GameOverOverlay.tsx must not contain continueBudget');

  // handleRestart is the single discard point — contains forfeited-continue comment + no carry
  const handleIdx = appSrc.indexOf('const handleRestart');
  const handleSlice = appSrc.slice(handleIdx, handleIdx + 700);
  assert.ok(handleSlice.includes('forfeited continue dies'), 'handleRestart must contain "// AC6/7: forfeited continue dies..." comment (single discard point, ADR-02)');
  // No surviving continueBudget / continueRemaining carried into newGame
  // Allow the comment itself to mention continue but forbid a variable carry
  const handleStripped = stripCommentsAndStrings(handleSlice);
  assert.ok(!/\bcontinueBudget\b/.test(handleStripped), 'handleRestart handle body must not carry continueBudget into new match');
  assert.ok(!/\bcontinueRemaining\b/.test(handleStripped), 'handleRestart must not carry continueRemaining');
  // Also ensure App stripped has no free-floating continueRemaining re-offer after restart
  // (vacuous today — future Accelerated will add, but this pin prevents back-carry)
  // After restart, re-rendering overlay with gameOver=true still shows single CTA
  const second = await renderOverlay({ onRestart: () => {} });
  assert.strictEqual(second.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Continuar').length, 0, 'after restart, overlay re-mounted still shows single CTA — no re-offer');
  assert.ok(!overlayStripped.includes('rewardedAd') && !overlayStripped.includes('IAP') && !overlayStripped.includes('react-native-purchases'), 'Clean overlay must not wire rewarded-ad/IAP/entitlements (Epic 4 concern)');
});

test('[P1] AC5 Clean only primary CTA', async () => {
  // Given Clean lane, When the game-over overlay renders, Then it shows ONLY the
  // primary CTA "Jogar de novo" — no second CTA/Continue; no rewardedAd/IAP
  // wiring (AC5). This is the forward-compat pin that guards S3.3/S4.2 scope creep.

  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings, extractNamedImports } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');

  // Source must have AC5 comment above Pressable
  assert.ok(src.includes('AC5: Continue offer is Epic 3/4'), 'GameOverOverlay.tsx must contain "// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here" above Pressable');

  // Stripped source must have no Continuar/continue/reward UI strings (no second CTA)
  assert.ok(!/Continuar/.test(stripped), 'GameOverOverlay.tsx must not contain "Continuar" (Clean only)');
  assert.ok(!/onContinue/.test(stripped), 'must not contain onContinue');
  assert.ok(!/rewardedAd/i.test(stripped), 'must not contain rewardedAd');
  assert.ok(!/react-native-purchases/.test(stripped), 'must not contain react-native-purchases');
  assert.ok(!/IAP/.test(stripped) || stripped.includes('IAP') === false, 'must not wire IAP here');

  // Allowed imports only react + react-native (Animated/Easing same specifier) + ./PauseButton + ../ui/layout
  for (const { specifier } of extractNamedImports(src)) {
    if (/(^|\/)engine(\/|$)/.test(specifier)) assert.fail(`GameOverOverlay.tsx must not import from engine: '${specifier}'`);
  }
  assert.ok(src.includes("from 'react-native'") || src.includes('from "react-native"'), 'must import Animated/Easing from react-native');
  // Verify no continuation via layout/orientation rule logic
  for (const sym of ['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT', 'resolveSwipeDirection']) {
    assert.ok(!stripped.includes(sym), `GameOverOverlay must not reference rule-logic symbol '${sym}'`);
  }

  // Rendered: exactly one Pressable with accessibilityRole button label Jogar de novo (filter host nodes — stub duplicates composite+host)
  const renderer = await renderOverlay({ onRestart: () => {} });
  const ctas = renderer.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'button' && n.props?.accessibilityLabel === 'Jogar de novo');
  assert.strictEqual(ctas.length, 1, 'rendered overlay must have exactly one Pressable with accessibilityRole button label "Jogar de novo"');
  const allButtons = renderer.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'button');
  assert.strictEqual(allButtons.length, 1, 'no second button/Continue offer may exist — Clean only primary CTA');

  // CTA style pins: width HIT_TARGET / height HIT_TARGET + alignSelf center + accent colors
  assert.match(src, /width:\s*HIT_TARGET(?=[,}])/, 'CTA width must reference HIT_TARGET directly');
  assert.match(src, /height:\s*HIT_TARGET(?=[,}])/, 'CTA height must reference HIT_TARGET directly');
  assert.ok(/alignSelf:\s*['"]center['"]/.test(src), 'CTA must have alignSelf center (T2 layout pin)');
  assert.ok(hasStyle(renderer, { backgroundColor: '#E8A33D' }), 'CTA must have backgroundColor #E8A33D');
  assert.ok(src.includes('#1C1206') || hasStyle(renderer, { color: '#1C1206' }), 'CTA label must be dark ink #1C1206');

  // Wrapper layout: inner Animated.View width 100% maxWidth 420 alignSelf center
  assert.ok(src.includes("width: '100%'") && src.includes('maxWidth: 420') && /alignSelf:\s*['"]center['"]/.test(src), 'inner Animated.View wrapper must be width 100% maxWidth 420 alignSelf center (6.2 patch)');

  // Keep reducedMotion={false} literal pin in App (passed to overlay)
  assert.ok(/reducedMotion=\{false\}/.test(appSrc), 'App.tsx must keep reducedMotion={false} literal until 9-4');
  // Overlay still receives insets required + fallback
  assert.ok(/insets:\s*\{/.test(src), 'GameOverOverlay props must require insets: {top,bottom,left,right}');
});
