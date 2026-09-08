/**
 * TEA Automate — API gateway contracts for dw-decision-dw-15
 * Location: _bmad-output/test-artifacts/tests/api/dw-decision-dw-15.gateway.spec.ts
 * Runner: node:test + tsx (host-only file/contract scans — no device, no network).
 * TEA mapping: "API" = provider-endpoint contract adapted to an evidence-only
 * seam: the LEDGER + SPEC + EVIDENCE + LOGS are the providers, and these tests
 * assert the CONTRACTS BETWEEN them (cross-file agreement). Per-file content
 * pins live dormant in the ATDD scaffolds; only the DoD-critical ledger +
 * durability pins are intentionally green-activated here (flagged below).
 *
 * Execute (from repo root):
 *   NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test \
 *     _bmad-output/test-artifacts/tests/api/dw-decision-dw-15.gateway.spec.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  repoRoot,
  readRepoFile,
  repoFileExists,
  soakSignalLines,
  parseShaLine,
  sliceLedgerSection,
  DW15_UDID,
  DW15_IDENTIFIER,
  DW15_BUNDLE_ID,
  DW15_METRO_PID,
  DW15_METRO_PORT,
  DW15_LEDGER,
  DW15_SPEC,
  DW15_EVIDENCE,
  DW15_LOG_DIR,
  DW15_LOGS,
  DW15_SHA_FILE,
} from '../../fixtures/dw-decision-dw-15-fixtures.ts';

const root = repoRoot();
const ledger = readRepoFile(DW15_LEDGER);
const spec = readRepoFile(DW15_SPEC);
const evidence = readRepoFile(DW15_EVIDENCE);
const run2 = readRepoFile(`${DW15_LOG_DIR}/dw15-run2.log`);
const run3 = readRepoFile(`${DW15_LOG_DIR}/dw15-run3.log`);
const metro = readRepoFile(`${DW15_LOG_DIR}/dw15-metro.log`);
const shaFile = readRepoFile(DW15_SHA_FILE);

describe('dw-15 gateway — cross-file identity contract [P0]', () => {
  it('[P0] Given 4 providers, when UDID is compared, then all agree on one device', () => {
    // Given evidence + run2 + run3 + evidence devicectl listing, then the UDID is identical everywhere.
    for (const [name, doc] of [['evidence', evidence], ['run2', run2], ['run3', run3]] as const) {
      assert.ok(doc.includes(DW15_UDID), `${name} must pin UDID ${DW15_UDID}`);
    }
    assert.ok(evidence.includes(DW15_IDENTIFIER), 'evidence must pin the devicectl identifier');
    assert.ok(evidence.includes(DW15_BUNDLE_ID), 'evidence must pin the bundle id');
  });

  it('[P0] Given the handoff contract, when Metro liveness is compared, then PID + port agree', () => {
    // Given the evidence handoff section, when checked, then PID and port match the pinned constants.
    assert.ok(evidence.includes(DW15_METRO_PID), `evidence must record Metro PID ${DW15_METRO_PID}`);
    assert.ok(evidence.includes(DW15_METRO_PORT), `evidence must record Metro port ${DW15_METRO_PORT}`);
  });
});

describe('dw-15 gateway — spec↔evidence agreement contract [P1]', () => {
  it('[P1] Given the amended bar, when both contracts are read, then PASS-PARTIAL + holder-pending agree', () => {
    // Given review pass 1 amended AC2/AC3, when spec and evidence are compared, then both carry the same verdict labels.
    assert.ok(spec.includes('PASS-PARTIAL'), 'spec must verdict PASS-PARTIAL');
    assert.ok(/PASS-PARTIAL/.test(evidence), 'evidence must verdict PASS-PARTIAL');
    assert.ok(spec.includes('holder-pending'), 'spec must carry holder-pending');
    assert.ok(/holder-pending/i.test(evidence), 'evidence must carry holder-pending');
  });

  it('[P1] Given the intent matrix, when scanned, then all four outcome rows exist', () => {
    // Given the spec contract table, when checked, then HAPPY_PATH + 3 failure rows exist.
    for (const row of ['HAPPY_PATH', 'DEVICE_LOCKED_AGAIN', 'DEVICE_UNREACHABLE', 'SIGNING_FAILURE']) {
      assert.ok(spec.includes(row), `spec intent matrix must contain ${row}`);
    }
    assert.ok(spec.includes('Never:'), 'spec must keep its Never boundaries');
  });

  it('[P1] Given the board verdict, when evidence is scanned, then inferred-strong is labeled, never bare observed', () => {
    // Given R-001, when the board verdict line is read, then it is explicitly not pixel-observed.
    assert.ok(/inferred-strong/i.test(evidence), 'evidence must label the board verdict inferred-strong');
    assert.ok(/not pixel-observed/i.test(evidence), 'evidence must explicitly disclaim pixel-observed');
    assert.ok(!/visually confirmed|pixel-proof|observed on-screen/i.test(evidence), 'evidence must never claim remote visual proof');
  });
});

describe('dw-15 gateway — durability + DoD ledger contract [P0, green-activated]', () => {
  it('[P0] Given sha256.txt, when every line is parsed and re-hashed, then 3 logs verify [GREEN-ACTIVATED from ATDD P0-09]', () => {
    // GREEN-ACTIVATION: ATDD P0-09 is dormant (it.skip); this ACTIVE pin is the DoD durability gate.
    const lines = shaFile.trim().split('\n');
    assert.equal(lines.length, 3);
    for (const f of DW15_LOGS) {
      assert.ok(repoFileExists(`${DW15_LOG_DIR}/${f}`), `durable log must exist: ${f}`);
      const hex = createHash('sha256').update(readFileSync(join(root, DW15_LOG_DIR, f))).digest('hex');
      const parsed = lines.map(parseShaLine);
      assert.ok(parsed.some((p) => p?.hex === hex && p.path.endsWith(f)), `sha256.txt must pin ${f}`);
    }
  });

  it('[P0] Given the working-tree delta, when the ledger section is read, then DW-15 is sweep-resolved [GREEN-ACTIVATED from ATDD P0-01]', () => {
    // GREEN-ACTIVATION: ATDD P0-01 is dormant; this ACTIVE pin is the DoD resolution gate.
    const dw15 = sliceLedgerSection(ledger, '### DW-15');
    assert.ok(dw15.includes('status: done 2026-09-06'), 'DW-15 must be done 2026-09-06');
    assert.ok(dw15.includes('resolution: resolved by sweep bundle dw-decision-dw-15'));
    assert.match(dw15, /resolution-undo: [0-9a-f]{64} 2026-09-06/);
    assert.ok(dw15.includes('decision: 2026-09-06 Run physical boot now'));
  });

  it('[P1] Given the real logs, when the triage filter runs on them, then the soak gate is empty AND exclusions are sound', () => {
    // Given run2 + metro, when triaged, then zero signals AND the worklets warnings demonstrably exist (excluded, not absent).
    assert.deepEqual(soakSignalLines(run2), [], 'run2 soak must be error-free');
    assert.deepEqual(soakSignalLines(metro), [], 'metro soak must be error-free');
    // run3 is the BLOCKED lock-gate attempt, not soak: its only signal must be the lock line itself.
    assert.deepEqual(
      soakSignalLines(run3),
      ['CommandError: Cannot launch triade on Eduardo’s iPhone (2) because the device is locked.'],
      'run3 must signal ONLY the lock-gate line (owned by the lock-gate journey)',
    );
    const worklets = (run2.match(/Tried to modify key/g) ?? []).length + (metro.match(/Tried to modify key/g) ?? []).length;
    assert.equal(worklets, 8, `exclusions must be sound: 4+4 worklets warnings present, got ${worklets}`);
  });
});
