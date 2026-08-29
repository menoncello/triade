import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function flattenKeys(obj: any, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, key));
    else out.push(key);
  }
  return out.sort();
}

test('[P0] i18n catalog PT/EN parity — same key set (v1 onboarding)', async () => {
  const pt = JSON.parse(readFileSync(join(here, '../../src/i18n/locales/pt.json'), 'utf8'));
  const en = JSON.parse(readFileSync(join(here, '../../src/i18n/locales/en.json'), 'utf8'));
  const ptKeys = flattenKeys(pt);
  const enKeys = flattenKeys(en);
  assert.deepStrictEqual(ptKeys, enKeys, `PT and EN must have identical keys; pt missing: ${enKeys.filter((k) => !ptKeys.includes(k))}, en missing: ${ptKeys.filter((k) => !enKeys.includes(k))}`);
  // sanity: must contain onboarding keys
  for (const k of ['tutorial.merge12', 'tone.line', 'lane.clean.label', 'lane.accelerated.label', 'accelerated.ceilingHint', 'gameOver.score']) {
    assert.ok(ptKeys.includes(k), `pt catalog must contain ${k}`);
    assert.ok(enKeys.includes(k), `en catalog must contain ${k}`);
  }
});

test('[P0] i18n t() resolves PT/EN for onboarding keys via changeLanguage', async () => {
  const { i18n } = await import('../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  assert.equal(i18n.t('tone.line'), 'controle sobre o caos');
  assert.equal(i18n.t('lane.clean.label'), 'Pura');
  assert.equal(i18n.t('lane.accelerated.label'), 'Iniciante');
  assert.equal(i18n.t('tutorial.merge12'), 'Junte 1 e 2 para fazer 3 — deslize eles juntos');
  assert.equal(i18n.t('accelerated.ceilingHint'), 'Teto aberto — peças maiores podem surgir.');
  await i18n.changeLanguage('en');
  assert.equal(i18n.t('tone.line'), 'control over chaos');
  assert.equal(i18n.t('lane.clean.label'), 'Clean');
  assert.equal(i18n.t('lane.accelerated.label'), 'Beginner');
  assert.equal(i18n.t('tutorial.merge12'), 'Join 1 and 2 to make 3 — swipe them together');
  assert.equal(i18n.t('accelerated.ceilingHint'), 'Ceiling open — bigger pieces may appear.');
  // restore to pt for other tests
  await i18n.changeLanguage('pt');
});

test('[P0] loadSettings preserves pt-BR and falls back for invalid language (schema)', async () => {
  const { loadSettings } = await import('../../src/services/storage/schema.ts');
  const ptBR = loadSettings('{"language":"pt-BR"}');
  assert.equal(ptBR.language, 'pt-BR', 'pt-BR must be preserved (existing test contract)');
  const invalid = loadSettings('{"language":123}');
  assert.equal(invalid.language, 'en', 'non-string language must fallback to en');
});

test('[P0] engine never imports i18n / react-i18next / expo-localization (NFR-13 boundary)', async () => {
  const { readFileSync } = await import('node:fs');
  const { execSync } = await import('node:child_process');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { dirname } = await import('node:path');
  const here2 = dirname(fileURLToPath(import.meta.url));
  const engineDir = join(here2, '../../src/engine');
  const files = execSync(`find "${engineDir}" -type f -name "*.ts" | head -n 100`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/from\s+['"].*i18n/.test(src), `${f} must not import i18n`);
    assert.ok(!/from\s+['"].*react-i18next/.test(src), `${f} must not import react-i18next`);
    assert.ok(!/from\s+['"].*expo-localization/.test(src), `${f} must not import expo-localization`);
    assert.ok(!/i18n\.t\(/.test(src), `${f} must not call i18n.t() (strings never leak into board logic)`);
  }
});

test('[P0] no TODO 5.4 waivers remain in src (all onboarding now via t)', async () => {
  const { execSync } = await import('node:child_process');
  const out = execSync('grep -r "TODO 5.4" triade/src --include="*.ts" --include="*.tsx" || true', { encoding: 'utf8' });
  assert.equal(out.trim(), '', 'grep "TODO 5.4" in triade/src must be empty — all waivers removed');
});
