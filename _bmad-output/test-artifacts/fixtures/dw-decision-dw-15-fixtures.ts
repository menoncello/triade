/**
 * TEA Automate — Fixtures for dw-decision-dw-15 (physical iOS boot, retry unlocked)
 * Location: _bmad-output/test-artifacts/fixtures/dw-decision-dw-15-fixtures.ts
 * Runner: host-only (imported by node:test + tsx specs under tests/unit|api|e2e).
 * TEA mapping: evidence-only seam — no faker, no network, no Playwright
 * fixtures. Deterministic literals + file-scan helpers (fixture-architecture.md
 * host adaptation: log/ledger/evidence seam => literal pins + scan helpers).
 *
 * Sources of truth (bundle dw-decision-dw-15, final_revision 3f6b56b + c5aae4e):
 *   _bmad-output/implementation-artifacts/deferred-work.md (DW-15 done 2026-09-06)
 *   _bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md
 *   _bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md
 *   _bmad-output/implementation-artifacts/dw15-logs-20260906/ (run2/run3/metro + sha256)
 * ATDD (dormant RED scaffolds, all it.skip):
 *   triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts (15 scaffolds)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Device identity pins (verbatim from evidence §§ Device + devicectl listing)
// ---------------------------------------------------------------------------

export const DW15_UDID = '00008120-00023C440263C01E';
export const DW15_IDENTIFIER = 'DD0414C7-175F-54F0-B474-42F213FD3ABD';
export const DW15_BUNDLE_ID = 'com.menontech.triade';
export const DW15_MODEL = 'iPhone 14 Pro';
export const DW15_IOS_VERSION = '26.6.1';
export const DW15_METRO_PID = '14623';
export const DW15_METRO_PORT = '8081';

// ---------------------------------------------------------------------------
// Repo-relative artifact paths (read from the repo root, never /tmp)
// ---------------------------------------------------------------------------

export const DW15_LEDGER = '_bmad-output/implementation-artifacts/deferred-work.md';
export const DW15_SPEC = '_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md';
export const DW15_EVIDENCE = '_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md';
export const DW15_LOG_DIR = '_bmad-output/implementation-artifacts/dw15-logs-20260906';
export const DW15_LOGS = ['dw15-run2.log', 'dw15-run3.log', 'dw15-metro.log'] as const;
export const DW15_SHA_FILE = '_bmad-output/implementation-artifacts/dw15-logs-20260906/sha256.txt';

/** Resolve the repo root from any spec nested under _bmad-output/test-artifacts/. */
export function repoRoot(): string {
  // fixtures/ sits at _bmad-output/test-artifacts/fixtures/ -> up 3 = repo root.
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

export function readRepoFile(rel: string): string {
  return readFileSync(join(repoRoot(), rel), 'utf8');
}

export function repoFileExists(rel: string): boolean {
  return existsSync(join(repoRoot(), rel));
}

// ---------------------------------------------------------------------------
// Soak-signal triage (pure — mirrors the ATDD helper, exclusions versioned)
// ---------------------------------------------------------------------------

/** Known-benign exclusion patterns, triaged in the evidence retry section. */
export const SOAK_EXCLUSIONS = [
  /Tried to modify key/, // pre-existing worklets boot warning (4x run2 + 4x metro)
  /ios_app_id key not found/, // admob config warning, safe per message
  /› 0 error\(s\)/, // build summary PASS line, not an error signal
] as const;

/**
 * Lines that count as soak error signals: match redbox|fatal|crash|error
 * (case-insensitive) and survive every benign exclusion.
 */
export function soakSignalLines(log: string): string[] {
  return log
    .split('\n')
    .filter((l) => /redbox|fatal|crash|error/i.test(l))
    .filter((l) => !SOAK_EXCLUSIONS.some((re) => re.test(l)));
}

// ---------------------------------------------------------------------------
// Format validators (pure)
// ---------------------------------------------------------------------------

/** `resolution-undo: <64-hex> 2026-09-06 <hex-payload>` ledger line shape. */
export function isUndoLine(line: string): boolean {
  return /resolution-undo: [0-9a-f]{64} 2026-09-06 [0-9a-f]+/.test(line);
}

/** `<64-hex>  <repo-relative-path>` sha256.txt line shape. */
export function parseShaLine(line: string): { hex: string; path: string } | null {
  const m = line.trim().match(/^([0-9a-f]{64})\s+(\S+)$/);
  return m ? { hex: m[1], path: m[2] } : null;
}

export function isUdidLike(v: string): boolean {
  return /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}$/.test(v);
}

export function isUuidLike(v: string): boolean {
  return /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(v);
}

/** Slice a `### DW-xx` ledger section (up to the next `### ` heading). */
export function sliceLedgerSection(ledger: string, heading: string): string {
  const start = ledger.indexOf(heading);
  if (start < 0) return '';
  const rest = ledger.slice(start);
  const next = rest.indexOf('\n### ', 1);
  return next < 0 ? rest : rest.slice(0, next);
}
