import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Guards against silent suite drift between the web PWA suite (frozen source
// of truth, test/game.test.js) and the TS port (game.test.ts). Every web test
// name must exist in the TS suite — a renamed/dropped web test will fail here
// so the two suites cannot quietly diverge.

const WEB_SUITE = fileURLToPath(new URL('../../../test/game.test.js', import.meta.url));
const TS_SUITE = fileURLToPath(new URL('./game.test.ts', import.meta.url));

function extractTestNames(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const names: string[] = [];
  const re = /test\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1\s*,/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) names.push(m[2]);
  return names;
}

test('WEB_TS_PARITY: every web test name exists in the TS ported suite', async () => {
  const webSource = await readFile(WEB_SUITE, 'utf8');
  const tsSource = await readFile(TS_SUITE, 'utf8');
  const webNames = extractTestNames(webSource);
  const tsNames = new Set(extractTestNames(tsSource));

  assert.ok(webNames.length >= 26, `web suite has ${webNames.length} tests (expected >= 26)`);
  const missing = webNames.filter((name) => !tsNames.has(name));
  assert.deepStrictEqual(missing, [], 'web tests missing from the TS suite');
});
