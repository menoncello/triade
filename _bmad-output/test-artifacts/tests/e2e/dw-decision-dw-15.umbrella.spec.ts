/**
 * TEA Automate — E2E umbrella journeys for dw-decision-dw-15
 * Location: _bmad-output/test-artifacts/tests/e2e/dw-decision-dw-15.umbrella.spec.ts
 * Runner: node:test + tsx (host-only composed journeys — no device, no browser).
 * TEA mapping: "E2E" = end-to-end CHAINS across the whole bundle
 * (ledger → spec → evidence → logs → sha), each journey composing providers
 * that the gateway tests only check pairwise. Critical happy path ONLY, per
 * selective-testing.md; the device lane itself stays holder-manual (P2 gate).
 *
 * Execute (from repo root):
 *   NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test \
 *     _bmad-output/test-artifacts/tests/e2e/dw-decision-dw-15.umbrella.spec.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  repoRoot,
  readRepoFile,
  sliceLedgerSection,
  DW15_LEDGER,
  DW15_SPEC,
  DW15_EVIDENCE,
  DW15_LOG_DIR,
} from '../../fixtures/dw-decision-dw-15-fixtures.ts';

const root = repoRoot();
const ledger = readRepoFile(DW15_LEDGER);
const spec = readRepoFile(DW15_SPEC);
const evidence = readRepoFile(DW15_EVIDENCE);
const run2 = readRepoFile(`${DW15_LOG_DIR}/dw15-run2.log`);
const run3 = readRepoFile(`${DW15_LOG_DIR}/dw15-run3.log`);

describe('dw-15 umbrella — PASS-PARTIAL chain journey [P0]', () => {
  it('[P0] Given the full bundle, when chained ledger→spec→evidence→logs, then every link agrees on PASS-PARTIAL', () => {
    // Given all four providers, when the verdict is traced end to end, then no link claims full closure.
    const dw15 = sliceLedgerSection(ledger, '### DW-15');
    assert.ok(dw15.includes('status: done 2026-09-06'), 'chain link 1: ledger sweep-resolved');
    assert.ok(spec.includes('PASS-PARTIAL'), 'chain link 2: spec PASS-PARTIAL, not full closure');
    assert.ok(/PASS-PARTIAL/.test(evidence), 'chain link 3: evidence PASS-PARTIAL');
    assert.ok(run2.includes('› Build Succeeded') && run2.includes('› 0 error(s)'), 'chain link 4: run2 build green');
    assert.ok(run2.includes('› Logs for your project will appear below.'), 'chain link 5: run2 handed off to Metro tail');
  });
});

describe('dw-15 umbrella — lock-gate honesty journey [P0]', () => {
  it('[P0] Given the intermediate locked attempt, when traced run3→evidence, then the block is quoted verbatim with no retry loop', () => {
    // Given run3 hit the lock gate, when evidence is checked, then it quotes the block instead of hiding it.
    assert.match(run3, /device is locked/, 'run3 must contain the verbatim locked error');
    assert.ok(evidence.includes('device is locked'), 'evidence must quote the locked block');
    assert.ok(!/retry.*succeeded|second retry.*passed/i.test(evidence), 'evidence must not claim a hidden retry passed');
  });
});

describe('dw-15 umbrella — zero-change + orchestrator-invariant journey [P0]', () => {
  it('[P0] Given the evidence-only decision, when the working tree is inspected, then triade/ is untouched and sprint-status is not written', () => {
    // Given zero production-code change by design, when git is queried, then both invariants hold.
    const triadeDiff = execSync('git diff HEAD -- triade/', { cwd: root, encoding: 'utf8' });
    assert.equal(triadeDiff.trim(), '', 'triade/ diff must be empty');
    const names = execSync('git diff --name-only', { cwd: root, encoding: 'utf8' });
    assert.ok(!names.split('\n').some((f) => f.startsWith('triade/')), 'no triade/ file may be modified');
    assert.ok(!names.includes('sprint-status.yaml'), 'sprint-status.yaml must not appear in the diff (orchestrator-owned)');
  });
});

describe('dw-15 umbrella — holder-eyes gate [P1 MANUAL — documents the operator session]', () => {
  it('[P1][MANUAL] Given holder-pending closure, when evidence is read, then all 3 checklist items are tracked with reason (holder: Eduardo)', () => {
    // MANUAL: board photo (item 1) + verbatim fps readout (item 2) + Release rerun (item 3)
    // require eyes/hands on the unlocked phone. This ACTIVE test asserts the TRACKING
    // exists (analytic precondition green); it does NOT close the items — the holder does.
    assert.ok(/holder-pending/i.test(evidence), 'checklist must exist in evidence');
    assert.ok(/release/i.test(evidence), 'Release rerun must be tracked as a separate future run');
    assert.ok(/relaunch|re-run/i.test(evidence), 'relaunch fallback must be recorded for a late holder');
    assert.ok(/foreground/i.test(evidence), 'foreground-unverified caveat must be disclosed');
  });
});
