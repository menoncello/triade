/**
 * TEA Automate — Unit expansion for dw-decision-dw-15
 * Location: _bmad-output/test-artifacts/tests/unit/dw-decision-dw-15.atdd.test.ts
 * Runner: node:test + tsx (host-only, pure-logic seam — no device, no files).
 * TEA mapping: "Unit" = triage-filter + format-validator pure functions from
 * the fixtures module. Expands BEYOND the ATDD dormant scaffolds
 * (triade/__tests__/device/dw-15-physical-ios-boot.atdd.test.ts, 15x it.skip):
 * ATDD pins log CONTENT; this file pins the TRIAGE LOGIC itself (exclusion
 * soundness, negative paths, validator accept/reject) — no duplicate coverage.
 *
 * Execute (from repo root):
 *   NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test \
 *     _bmad-output/test-artifacts/tests/unit/dw-decision-dw-15.atdd.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  soakSignalLines,
  SOAK_EXCLUSIONS,
  isUndoLine,
  parseShaLine,
  isUdidLike,
  isUuidLike,
  sliceLedgerSection,
  DW15_UDID,
  DW15_IDENTIFIER,
} from '../../fixtures/dw-decision-dw-15-fixtures.ts';

describe('dw-15 automate unit — soak triage filter [P0]', () => {
  it('[P0] Given a true redbox line, when filtered, then it survives as a signal', () => {
    // Given a genuine JS error line, when triaged, then it is kept.
    const out = soakSignalLines('ERROR RedBox: Cannot read property of undefined\nok line\n');
    assert.equal(out.length, 1);
    assert.match(out[0], /RedBox/);
  });

  it('[P0] Given each known-benign warning, when filtered, then it is excluded', () => {
    // Given the three triaged warnings, when triaged, then none survive.
    const log = [
      " WARN  [Worklets] Tried to modify key `current` of an object",
      'ios_app_id key not found in react-native-google-mobile-ads key in app.json.',
      '› 0 error(s), and 2 warning(s)',
    ].join('\n');
    assert.deepEqual(soakSignalLines(log), []);
  });

  it('[P0] Given the exclusion list, when counted, then exactly 3 patterns are versioned', () => {
    // Given triage drift risk, when the list is read, then it stays at 3 entries.
    assert.equal(SOAK_EXCLUSIONS.length, 3);
  });

  it('[P1] Given a fatal crash line, when filtered, then casing does not hide it', () => {
    // Given uppercase FATAL/CRASH, when triaged, then both survive (case-insensitive).
    const out = soakSignalLines('FATAL EXCEPTION: main\nNative crash in libskia\n');
    assert.equal(out.length, 2);
  });

  it('[P1] Given an empty log, when filtered, then the result is empty', () => {
    // Given no input, when triaged, then no signal (no false positive on empty).
    assert.deepEqual(soakSignalLines(''), []);
  });
});

describe('dw-15 automate unit — ledger/sha/identity validators [P0/P1]', () => {
  it('[P0] Given the real undo line shape, when validated, then it accepts', () => {
    // Given the committed DW-15 undo line, when checked, then the shape holds.
    const line =
      'resolution-undo: 923d8da75ac945a8a1351bd8d57a0ee3b2acca61362b1b8fd4292f4335a4769c 2026-09-06 7374617475733a206f70656e';
    assert.ok(isUndoLine(line));
  });

  it('[P1] Given malformed undo lines, when validated, then each rejects', () => {
    // Given short-hex / bad-date / missing-payload variants, when checked, then all reject.
    assert.ok(!isUndoLine('resolution-undo: abc123 2026-09-06 deadbeef'));
    assert.ok(!isUndoLine('resolution-undo: 923d8da75ac945a8a1351bd8d57a0ee3b2acca61362b1b8fd4292f4335a4769c 06-09-2026 payload'));
    assert.ok(!isUndoLine('status: done 2026-09-06'));
  });

  it('[P1] Given a sha256.txt line, when parsed, then hex + path extract', () => {
    // Given a real pin line, when parsed, then both fields extract with 64-hex.
    const parsed = parseShaLine(
      'a9458ca6dbec09052aa467fddf7e468a480f710a7fb3fdd31183ca3c302971c1  _bmad-output/implementation-artifacts/dw15-logs-20260906/dw15-run2.log',
    );
    assert.ok(parsed);
    assert.equal(parsed.hex.length, 64);
    assert.match(parsed.path, /dw15-run2\.log$/);
    assert.equal(parseShaLine('not a hash line'), null);
  });

  it('[P1] Given device identity constants, when format-checked, then UDID + identifier shapes hold', () => {
    // Given the pinned identity, when checked, then formats match devicectl conventions.
    assert.ok(isUdidLike(DW15_UDID));
    assert.ok(isUuidLike(DW15_IDENTIFIER));
    assert.ok(!isUdidLike('generic'));
    assert.ok(!isUuidLike(DW15_UDID));
  });

  it('[P2] Given a synthetic ledger, when sliced, then only the target section returns', () => {
    // Given two DW sections, when sliced, then the neighbor section is excluded.
    const ledger = '### DW-15: boot\nstatus: done 2026-09-06\n\n### DW-16: baseline\nstatus: open\n';
    const section = sliceLedgerSection(ledger, '### DW-15');
    assert.ok(section.includes('status: done 2026-09-06'));
    assert.ok(!section.includes('DW-16'));
    assert.equal(sliceLedgerSection(ledger, '### DW-99'), '');
  });
});
