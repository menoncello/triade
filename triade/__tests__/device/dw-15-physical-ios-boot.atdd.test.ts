import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// ATDD for dw-decision-dw-15 — physical iOS device boot validation (retry)
// covering the working-tree delta:
//   _bmad-output/implementation-artifacts/deferred-work.md
//     DW-15 open → done 2026-09-06 + resolution + resolution-undo + decision
// plus the committed bundle already at HEAD (3f6b56b + c5aae4e):
//   spec-dw-15-physical-ios-boot-2.md (intent contract, AC1–AC3 amended bar)
//   dw-15-physical-boot-evidence.md (retry §: device, narrative, inferred-strong
//     board reasoning, holder-pending checklist, verbatim excerpts, handoff)
//   dw15-logs-20260906/ (run2 install+launch / run3 locked block / metro soak)
// Zero production-code change: `git diff HEAD -- triade/` is empty by design.
// Device lane is manual-validation domain: host tests pin logs/ledger/evidence;
// holder-eyes items (pixels, fps readout, Release rerun) stay manual P2.
// Spec: _bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-decision-dw-15.md
// constraint: sprint-status.yaml is orchestrator-owned and MUST NOT be written
// ---------------------------------------------------------------------------

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const r = (...segs: string[]) => fs.readFileSync(path.join(repoRoot, ...segs), 'utf8');

const ledger = r('_bmad-output/implementation-artifacts/deferred-work.md');
const spec = r('_bmad-output/implementation-artifacts/spec-dw-15-physical-ios-boot-2.md');
const evidence = r('_bmad-output/implementation-artifacts/dw-15-physical-boot-evidence.md');
const run2 = r('_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-run2.log');
const run3 = r('_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-run3.log');
const metro = r('_bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-metro.log');
const shaFile = r('_bmad-output/implementation-artifacts/dw15-logs-20260906/sha256.txt');

const UDID = '00008120-00023C440263C01E';
const IDENTIFIER = 'DD0414C7-175F-54F0-B474-42F213FD3ABD';
const BUNDLE_ID = 'com.menontech.triade';

/** Known-benign lines excluded from the zero-error soak gate (triaged in evidence). */
function soakSignalLines(log: string): string[] {
  return log
    .split('\n')
    .filter((l) => /redbox|fatal|crash|error/i.test(l))
    .filter((l) => !/Tried to modify key/.test(l)) // pre-existing worklets boot warning
    .filter((l) => !/ios_app_id key not found/.test(l)) // admob config warning, safe per message
    .filter((l) => !/› 0 error\(s\)/.test(l)); // build summary PASS line, not an error signal
}

describe('ATDD dw-15 physical boot — P0 critical (install/launch/soak/ledger)', () => {
  it.skip('[P0-01] ledger DW-15 done 2026-09-06 with sweep-bundle resolution and undo hash', () => {
    // Given the DW-15 ledger entry, when scanned, then it carries the sweep resolution.
    assert.ok(ledger.includes('### DW-15'), 'ledger must contain the DW-15 section');
    const dw15 = ledger.slice(ledger.indexOf('### DW-15'), ledger.indexOf('### DW-16'));
    assert.ok(dw15.includes('status: done 2026-09-06'), 'DW-15 must be done 2026-09-06');
    assert.ok(
      dw15.includes('resolution: resolved by sweep bundle dw-decision-dw-15'),
      'DW-15 must cite the sweep bundle resolution',
    );
    assert.match(dw15, /resolution-undo: [0-9a-f]{64} 2026-09-06/, 'resolution-undo must be a 64-hex token');
    assert.ok(
      dw15.includes('decision: 2026-09-06 Run physical boot now'),
      'DW-15 must keep the human decision prefix',
    );
  });

  it.skip('[P0-02] zero production-code change — git diff HEAD -- triade/ is empty', () => {
    // Given the decision touches evidence only, when the triade/ diff is read, then it is empty.
    const out = execSync('git diff HEAD -- triade/', { cwd: repoRoot, encoding: 'utf8' });
    assert.equal(out.trim(), '', `triade/ diff must be empty, got: ${out.slice(0, 200)}`);
    const names = execSync('git diff --name-only', { cwd: repoRoot, encoding: 'utf8' }).trim();
    assert.ok(
      !names.split('\n').some((f) => f.startsWith('triade/')),
      `no triade/ file may be modified in the working tree (got: ${names})`,
    );
  });

  it.skip('[P0-03] run2 install+launch pins — build SUCCEEDED, 0 errors, install path, log tail', () => {
    // Given the unlocked-phone retry, when run2 is scanned, then build+install+launch lines exist.
    assert.ok(run2.includes('› Build Succeeded'), 'run2 must show Build Succeeded');
    assert.ok(run2.includes('› 0 error(s)'), 'run2 must show 0 errors');
    assert.ok(
      run2.includes('Installing /Users/eduardomenoncello/Library/Developer/Xcode/DerivedData/triade-'),
      'run2 must show the DerivedData install path',
    );
    assert.ok(run2.includes('Debug-iphoneos/triade.app'), 'run2 must install the Debug-iphoneos app');
    assert.ok(
      run2.includes('› Logs for your project will appear below.'),
      'run2 must hand off to the Metro log tail',
    );
  });

  it.skip('[P0-04] independent devicectl launch corroboration recorded', () => {
    // Given run2 alone could be a fluke, when evidence is scanned, then a second launch exists.
    assert.ok(
      evidence.includes(`--device ${UDID} ${BUNDLE_ID}`),
      'evidence must record the direct devicectl launch command with UDID + bundle id',
    );
    assert.ok(
      evidence.includes(`Launched application with ${BUNDLE_ID} bundle identifier`),
      'evidence must quote the devicectl Launched application line',
    );
  });

  it.skip('[P0-05] Metro serves the on-device bundle — index + lazy game-path chunks', () => {
    // Given launch, when Metro output is scanned, then the device pulled and executed the JS bundle.
    assert.ok(metro.includes('iOS Bundled') && metro.includes('index.ts'), 'metro must bundle index.ts for the device');
    assert.ok(metro.includes('expo-haptics'), 'metro must serve the lazy haptics chunk (game path executing)');
    assert.ok(metro.includes('expo-audio'), 'metro must serve the lazy audio chunk (game path executing)');
    assert.ok(
      metro.includes('Logs for your project will appear below.'),
      'metro must show the device log tail header',
    );
  });

  it.skip('[P0-06] zero redbox/fatal/crash across run2 + metro soak (excl. triaged warnings)', () => {
    // Given the ~17 min auto-drive soak, when both logs are grepped, then no error signal remains.
    assert.deepEqual(soakSignalLines(run2), [], `run2 soak must be error-free, got: ${soakSignalLines(run2)}`);
    assert.deepEqual(soakSignalLines(metro), [], `metro soak must be error-free, got: ${soakSignalLines(metro)}`);
  });

  it.skip('[P0-07] worklets boot warnings triaged benign, not counted as failures', () => {
    // Given 4 pre-existing worklets warnings, when counted, then they exist AND are excluded from P0-06.
    const count =
      (run2.match(/Tried to modify key/g) ?? []).length +
      (metro.match(/Tried to modify key/g) ?? []).length;
    assert.equal(count, 8, `expected 4+4 worklets warnings, got ${count}`);
    assert.ok(evidence.toLowerCase().includes('worklet'), 'evidence must triage the worklets warnings');
  });

  it.skip('[P0-08] lock-gate honesty — run3 device-locked block quoted verbatim, no retry loop', () => {
    // Given the intermediate locked attempt, when run3 is scanned, then the verbatim block exists.
    assert.ok(run3.includes('› Build Succeeded'), 'run3 reached install (build was cached/ok)');
    assert.match(run3, /device is locked/, 'run3 must contain the verbatim device-locked error');
    assert.ok(
      evidence.includes('device is locked'),
      'evidence must quote the locked block with a per-source label',
    );
  });

  it.skip('[P0-09] log durability — 3 logs pinned with verifiable sha256, no /tmp refs', () => {
    // Given /tmp rot, when the durable dir is checked, then all three logs hash-verify.
    for (const f of ['dw15-run2.log', 'dw15-run3.log', 'dw15-metro.log']) {
      const p = path.join(repoRoot, '_bmad-output/implementation-artifacts/dw15-logs-20260906', f);
      assert.ok(fs.existsSync(p), `durable log must exist: ${f}`);
      const hex = createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      assert.ok(shaFile.includes(hex), `sha256.txt must pin ${f} (${hex.slice(0, 12)}…)`);
    }
    assert.ok(!/\/tmp\//.test(evidence.split('## ')[0] ?? ''), 'evidence header must not point at /tmp originals');
  });
});

describe('ATDD dw-15 physical boot — P1 wiring (evidence/spec/handoff)', () => {
  it.skip('[P1-01] evidence retry section complete — identity + outcome + reasoning + checklist + handoff', () => {
    // Given the agent-side PASS-PARTIAL claim, when evidence is scanned, then every section exists.
    assert.ok(evidence.includes('iPhone 14 Pro'), 'evidence must name the device model');
    assert.ok(evidence.includes(IDENTIFIER), 'evidence must record the devicectl identifier');
    assert.ok(evidence.includes(UDID), 'evidence must record the UDID');
    assert.ok(evidence.includes('26.6.1'), 'evidence must record the iOS version');
    assert.ok(/inferred-strong/i.test(evidence), 'board verdict must be labeled inferred-strong, never observed');
    assert.ok(/holder-pending/i.test(evidence), 'pixels + numbers must be tracked as holder-pending');
    assert.ok(evidence.includes('14623') || /metro pid/i.test(evidence), 'evidence must record the Metro PID handoff');
    assert.ok(evidence.includes('8081'), 'evidence must record the Metro port handoff');
  });

  it.skip('[P1-02] spec AC bar is the amended remotely-verifiable one (AC2/AC3 holder-pending)', () => {
    // Given review pass 1 amended the bar, when the spec is scanned, then ACs accept pending-with-reason.
    assert.ok(spec.includes('PASS-PARTIAL'), 'spec outcome must be PASS-PARTIAL, not full closure');
    assert.ok(spec.includes('holder-pending'), 'spec must carry the holder-pending bar for pixels/numbers');
    assert.ok(spec.includes('DEVICE_LOCKED_AGAIN'), 'spec matrix must keep the lock-gate row');
    assert.ok(spec.includes('Never:'), 'spec must keep its Never boundaries (no TestFlight/prebuild --clean/tuning)');
  });

  it.skip('[P1-03] sprint-status.yaml untouched — orchestrator-owned invariant', () => {
    // Given the ledger edit, when the working tree is listed, then sprint-status is not modified.
    const stat = execSync('git diff --stat', { cwd: repoRoot, encoding: 'utf8' });
    const names = execSync('git diff --name-only', { cwd: repoRoot, encoding: 'utf8' });
    assert.ok(!names.includes('sprint-status.yaml'), 'sprint-status.yaml must not appear in the diff');
    assert.ok(!stat.includes('sprint-status'), 'diff stat must not mention sprint-status');
  });
});

describe('ATDD dw-15 physical boot — P2 manual (holder-eyes, stays skip until holder present)', () => {
  it.skip('[P2-01 MANUAL] holder visual — Skia 4x4 visibly rendering while auto-drive plays', () => {
    // MANUAL (unlocked phone + holder eyes): relaunch
    // `xcrun devicectl device process launch --device 00008120-00023C440263C01E com.menontech.triade`
    // while Metro is up, watch the board auto-play, capture a photo or written confirm,
    // append it to dw-15-physical-boot-evidence.md. Do NOT edit this file to pass remotely.
    assert.ok(false, 'manual holder step — complete on device, then record evidence');
  });

  it.skip('[P2-02 MANUAL] holder readout — verbatim on-screen fps · p99 · frames (Debug)', () => {
    // MANUAL: copy the overlay digits verbatim into the evidence checklist item 2.
    // Never invent numbers; Debug-only; Release rerun is a separate future run (DW-16 owns numbers).
    assert.ok(false, 'manual holder step — copy the on-screen readout verbatim');
  });

  it.skip('[P2-03 MANUAL] Release rerun tracked as a separate future run, not claimed here', () => {
    // Given this pass is Debug-only, when evidence is scanned, then the Release item is pending, not passed.
    assert.ok(/release/i.test(evidence), 'evidence must track the Release rerun item');
    assert.ok(false, 'manual future lane — run Release on device, then record readout');
  });
});
