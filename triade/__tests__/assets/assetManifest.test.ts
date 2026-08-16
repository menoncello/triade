import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Story 1.4 AC-5/NFR-6: the manifest is data-driven and additive (icon + present
// bundled assets); every entry resolves to a bundled local require target, never
// a remote URL or CDN host (self-contained offline).
const MANIFEST_FILE = fileURLToPath(new URL('../../src/services/assets/assetManifest.ts', import.meta.url));

const REMOTE_URL_PATTERNS = [/http:\/\//, /https:\/\//, /\/\//, /data:/];

const FORBIDDEN_CDN_HOSTS = ['cdn', 'cloudinary', 'cloudfront', 'aws', 'googleapis', 'gstatic'];

const MANIFEST_SPEC = '../../src/services/assets/assetManifest.ts';

test('[P2] AC-5/NFR-6: assetManifest is a non-empty object/array of bundled asset entries', async () => {
  const { assetManifest } = (await import(MANIFEST_SPEC)) as {
    assetManifest: Record<string, unknown> | Array<{ name: string; resource: unknown }>;
  };
  assert.ok(assetManifest !== null && typeof assetManifest === 'object', 'assetManifest is an object or array');
  const entries = Array.isArray(assetManifest)
    ? assetManifest
    : Object.entries(assetManifest).map(([name, resource]) => ({ name, resource }));
  assert.ok(entries.length > 0, 'assetManifest must list at least the bundled icon');
  for (const entry of entries) {
    assert.ok(
      typeof entry.name === 'string' && entry.name.length > 0,
      `each entry maps an asset name (got ${String(entry.name)})`
    );
    assert.ok(entry.resource !== undefined, `entry '${String(entry.name)}' references a bundled resource`);
  }
});

test('[P2] AC-5/NFR-6: assetManifest references only local bundled assets (no remote URL strings)', async () => {
  const source = await readFile(MANIFEST_FILE, 'utf8');
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const pattern of REMOTE_URL_PATTERNS) {
    assert.ok(
      !pattern.test(stripped),
      `assetManifest.ts contains remote URL pattern ${pattern} (NFR-6 violation)`
    );
  }
});

test('[P2] AC-5/NFR-6: assetManifest does not reference a CDN host', async () => {
  const source = await readFile(MANIFEST_FILE, 'utf8');
  const lower = source.toLowerCase();
  for (const host of FORBIDDEN_CDN_HOSTS) {
    assert.ok(
      !lower.includes(host),
      `assetManifest.ts references known CDN host '${host}' (NFR-6 violation)`
    );
  }
});
