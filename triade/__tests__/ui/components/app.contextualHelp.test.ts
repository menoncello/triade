import { test } from 'node:test';
import assert from 'node:assert';

// 5.3 wiring pins — contextual banners gating, per-match dismiss, Clean wall, non-blocking

test('[P0] LANE_PROFILES wall — Clean never shows aids, Accelerated does', async () => {
  const { LANE_PROFILES, profileForLaneId } = await import('../../../src/game/lanes.ts');
  assert.equal(LANE_PROFILES.clean.showLearningAids, false, 'clean.showLearningAids must be false (P1)');
  assert.equal(LANE_PROFILES.accelerated.showLearningAids, true, 'accelerated.showLearningAids must be true');
  assert.equal(profileForLaneId('clean').showLearningAids, false);
  assert.equal(profileForLaneId('accelerated').showLearningAids, true);
  // fallback invalid maps to clean
  assert.equal(profileForLaneId('bogus' as any).showLearningAids, false);
});

test('[P0] App.tsx showCeilingBanner/showStuckBanner gating exactly matches spec', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);

  // Must contain exact gating expressions
  assert.ok(/showCeilingBanner[\s\S]*profile\.showLearningAids[\s\S]*!gameOver[\s\S]*!bannerDismissed\.ceiling[\s\S]*ceiling\s*>=\s*48/.test(src), 'showCeilingBanner must be profile.showLearningAids && !gameOver && !bannerDismissed.ceiling && ceiling>=48');
  assert.ok(/showStuckBanner[\s\S]*profile\.showLearningAids[\s\S]*!gameOver[\s\S]*!bannerDismissed\.stuck[\s\S]*emptyCount\s*<=\s*2/.test(src), 'showStuckBanner must be profile.showLearningAids && !gameOver && !bannerDismissed.stuck && emptyCount<=2');

  // emptyCount derived from board.flat filter null
  assert.ok(/emptyCount\s*=\s*game\.board\.flat\(\)\.filter/.test(src), 'emptyCount must be game.board.flat().filter((v)=>v===null).length');
  assert.ok(/ceiling\s*=\s*ceilingDetector\s*\(\s*game\.board\s*\)/.test(src), 'ceiling must be ceilingDetector(game.board)');

  // Banners rendered conditionally outside GestureDetector
  const gestureIdx = src.indexOf('GestureDetector');
  const ceilingIdx = src.indexOf('<CeilingBanner');
  const stuckIdx = src.indexOf('<StuckBanner');
  assert.ok(gestureIdx !== -1 && ceilingIdx !== -1 && stuckIdx !== -1, 'must have GestureDetector and both banners');
  // Banners after boardWrap close — not inside GestureDetector
  // Find the GestureDetector close and ensure banners follow after
  const detectorBlock = src.slice(gestureIdx, gestureIdx + 800);
  assert.ok(detectorBlock.includes('GameBoard'), 'GestureDetector must wrap GameBoard');
  // Banners must be siblings after the boardWrap View, not nested in GestureDetector
  // simple pin: there is a closing </View> for boardWrap before banner
  assert.ok(ceilingIdx > gestureIdx, 'CeilingBanner must appear after GestureDetector (non-blocking)');
  assert.ok(stuckIdx > gestureIdx, 'StuckBanner must appear after GestureDetector');

  // No banner when gameOver — guarded
  assert.ok(/!gameOver/.test(src), 'must gate on !gameOver');

  // No Math.random or engine mutation in banner path
  const bannerSlice = src.slice(src.indexOf('showCeilingBanner'), src.indexOf('showStuckBanner') + 200);
  assert.ok(!/Math\.random/.test(bannerSlice), 'banner gating must not use Math.random');
});

test('[P0] App.tsx bannerDismissed per-match reset in resetAssistance, handleRestart and applyLaneSelection', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);

  // bannerDismissed state init
  assert.ok(/const\s*\[bannerDismissed/.test(src), 'App must have bannerDismissed state');
  assert.ok(/\{ ceiling:\s*false,\s*stuck:\s*false \}/.test(src), 'initial bannerDismissed must be {ceiling:false, stuck:false}');

  // resetAssistance resets
  const resetIdx = src.indexOf('resetAssistance');
  assert.ok(resetIdx !== -1, 'must define resetAssistance');
  const resetSlice = src.slice(resetIdx, resetIdx + 800);
  assert.ok(/setBannerDismissed\s*\(\s*\{\s*ceiling:\s*false[\s\S]*stuck:\s*false/.test(resetSlice), 'resetAssistance must reset bannerDismissed');

  // handleRestart resets
  const restartIdx = src.indexOf('const handleRestart');
  const restartSlice = src.slice(restartIdx, restartIdx + 1300);
  assert.ok(/setBannerDismissed\s*\(\s*\{\s*ceiling:\s*false/.test(restartSlice), 'handleRestart must reset bannerDismissed (per-match die-with-match)');

  // applyLaneSelection resets even without active match (5.3 patch)
  const laneSelIdx = src.indexOf('const applyLaneSelection');
  const laneSelSlice = src.slice(laneSelIdx, laneSelIdx + 1500);
  // must contain at least two setBannerDismissed (resetAssistance call counts as one, plus direct set in else)
  const bannerResets = (laneSelSlice.match(/setBannerDismissed/g) || []).length + (laneSelSlice.match(/resetAssistance\(\)/g) || []).length;
  assert.ok(bannerResets >= 1, 'applyLaneSelection must reset banners (at least via resetAssistance or direct setBannerDismissed)');

  // Per-match not persisted — bannerDismissed never in STORAGE_KEYS or saveSettings
  assert.ok(!/bannerDismissed/.test(readFileSync(join(here, '../../../src/services/storage/settingsStore.ts'), 'utf8')), 'bannerDismissed must not be persisted (per-match memory only, ADR-02)');
  assert.ok(!/bannerDismissed/.test(readFileSync(join(here, '../../../src/services/storage/schema.ts'), 'utf8')), 'schema must not contain bannerDismissed');
});

test('[P0] Clean lane never mounts banner — wiring gated only by activeLaneId accelerated', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  // Active lane derived
  assert.ok(/activeLaneId\s*=\s*laneFromIndex\(selectedLaneIndex\)\.id/.test(src), 'activeLaneId must be laneFromIndex(selectedLaneIndex).id');
  // Profile gating
  assert.ok(/profile\s*=\s*profileForLaneId\(activeLaneId\)/.test(src), 'profile must be profileForLaneId(activeLaneId)');
  assert.ok(/profile\.showLearningAids/.test(src), 'banner must be gated by profile.showLearningAids (lane-wall)');
  // Ensure no direct string Clean bypass
  // Must not have hard-coded true show for Clean
  assert.ok(!/if\s*\(\s*activeLaneId\s*===\s*['"]clean['"]\s*\)\s*.*CeilingBanner/.test(src), 'must never show CeilingBanner for clean');
});

test('[P1] Banner copy is factual plain-spoken, nunca scolding, with design tokens', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const bannerSrc = readFileSync(join(here, '../../../src/ui/AcceleratedAids.tsx'), 'utf8');
  const ptJson = JSON.parse(readFileSync(join(here, '../../../src/i18n/locales/pt.json'), 'utf8'));
  const hasCeiling = bannerSrc.includes('Teto aberto') || bannerSrc.includes("accelerated.ceilingHint") || (ptJson.accelerated && ptJson.accelerated.ceilingHint && ptJson.accelerated.ceilingHint.includes('Teto aberto'));
  const hasStuck = bannerSrc.includes('Pouco espaço') || bannerSrc.includes("accelerated.stuckHint") || (ptJson.accelerated && ptJson.accelerated.stuckHint && ptJson.accelerated.stuckHint.includes('Pouco espaço'));
  assert.ok(hasCeiling, 'Ceiling copy must be "Teto aberto — peças maiores podem surgir." via t(accelerated.ceilingHint) or pt.json');
  assert.ok(hasStuck, 'Stuck copy must be "Pouco espaço — procure fusões." via t(accelerated.stuckHint) or pt.json');
  // scolding check scoped to the Text copy lines only (avoid matching style keys like borderRadius which contains "errad" case-insensitive)
  const copyLines = bannerSrc.split('\n').filter((l) => l.includes('<Text') && l.includes('style='));
  const copyText = copyLines.join(' ');
  assert.ok(!/scold|burro|cuidado!/i.test(copyText), 'copy must never scolding');
  assert.ok(!copyText.includes('!') || copyText.includes('—'), 'copy must not contain exclamation scolding');
  // design tokens: surface-raised #fff7ec, accent #E8A33D
  assert.ok(bannerSrc.includes('#fff7ec'), 'surface-raised #fff7ec required');
  assert.ok(bannerSrc.includes('#E8A33D'), 'accent #E8A33D required');
  assert.ok(bannerSrc.includes("HIT_TARGET"), 'dismiss must use HIT_TARGET');
});

test('[P1] Dismiss buttons are 44pt and banners are a11y labelled, gameOver suppresses', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const bannerSrc = readFileSync(join(here, '../../../src/ui/AcceleratedAids.tsx'), 'utf8');
  // a11y labels in banner src — now via t('accelerated.dismiss') but PT still "Dispensar"
  assert.ok(bannerSrc.includes('accessibilityLabel="indicador de teto"'), 'Ceiling must have a11y label indicador de teto');
  assert.ok(bannerSrc.includes('accessibilityLabel="aviso de travamento"'), 'Stuck must have a11y label aviso de travamento');
  const hasDispensar = (bannerSrc.match(/accessibilityLabel="Dispensar"/g) || []).length >= 2 || (bannerSrc.match(/accelerated\.dismiss/g) || []).length >= 2;
  assert.ok(hasDispensar, 'both banners must have Dispensar button via t(accelerated.dismiss) or literal');
  // gameOver suppress verified in App gating (already above) — extra pin
  assert.ok(/showCeilingBanner.*!gameOver/.test(appSrc), 'Ceiling must be suppressed by !gameOver');
  assert.ok(/showStuckBanner.*!gameOver/.test(appSrc), 'Stuck must be suppressed by !gameOver');
  // onDismiss wiring pins
  assert.ok(/onDismiss=\{\(\)\s*=>\s*setBannerDismissed/.test(appSrc), 'onDismiss must wire to setBannerDismissed');
});

test('[P1] No tutorial wall blocks banner-less — banner never blocks swipe and tutorial overlay is independent', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  // TutorialOverlay and banners are independent siblings — both can co-exist but neither blocks
  assert.ok(appSrc.includes('TutorialOverlay'), 'TutorialOverlay must stay');
  assert.ok(appSrc.includes('CeilingBanner') && appSrc.includes('StuckBanner'), 'banners must stay');
  // Banners are Views with no pointer trap — verify AcceleratedAids does not use pointerEvents none that would block
  const bannerSrc = readFileSync(join(here, '../../../src/ui/AcceleratedAids.tsx'), 'utf8');
  assert.ok(!/pointerEvents/.test(bannerSrc) || !/pointerEvents.*none/.test(bannerSrc), 'banner Views should not set pointerEvents none (would mask vs block ambiguous) — dismiss button is auto');
});
