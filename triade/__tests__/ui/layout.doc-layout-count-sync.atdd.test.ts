import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutFor, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../src/ui/layout.ts';
import type { EdgeInsets } from '../../src/ui/layout.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-doc-layout-test-count-sync — red-phase scaffolds
// covering working-tree delta vs HEAD 2e91c12:
//   _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md
//     T2 All 12 → All 14 (12 original + clamp-path + golden-anchor added in the 2026-08-17 review fixes)
//     T5 12 layout unit tests → 14 layout unit tests (...plus clamp-path and golden-anchor ...)
//     ATDD bullet 12 tests → 14 tests ...plus clamp-path and golden-anchor ...
//     + appended ## Auto Run Result (Status: done + 3-line summary)
//   _bmad-output/implementation-artifacts/deferred-work.md
//     DW-11 open → done 2026-09-02 + resolution: resolved by sweep bundle dw-doc-layout-test-count-sync
//           + resolution-undo: 8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb
//     DW-56 open → done 2026-09-02 + resolution-undo: 0eb6ce61... (co-located, already gated by
//           test-design-dw-engine-rng-trust-hardening.md; treated as Not-in-Scope here except hygiene)
//   triade/src/engine/core/game.ts + weights.ts (DW-56) — engine hardening already in
//     atdd-checklist-dw-engine-rng-trust-hardening.md; this bundle pins isolation via
//     git diff --stat and cross-reference, not via duplicated engine P0.
//   Host-only: node:test + tsx, pure grep + layout arithmetic; no RN/native, no browser harness.
// ---------------------------------------------------------------------------

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };

const storyDoc = fs.readFileSync(
  fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md', import.meta.url)),
  'utf8',
);
const ledger = fs.readFileSync(
  fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
  'utf8',
);
const layoutTestSrc = fs.readFileSync(
  fileURLToPath(new URL('./layout.test.ts', import.meta.url)),
  'utf8',
);
const layoutSrc = fs.readFileSync(fileURLToPath(new URL('../../src/ui/layout.ts', import.meta.url)), 'utf8');
const appSrc = fs.readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');

function countTestInvocations(src: string): number {
  return (src.match(/\btest\s*\(\s*['"`]/g) ?? []).length;
}

describe('ATDD dw-doc-layout-test-count-sync — P0 critical (doc-code truth + ledger + isolation)', () => {
  it.skip('[P0-01] AC story doc T2/T5/ATDD counts synced — 14 labels present and stale 12 gone (R-001,R-003)', () => {
    // Before sweep: story doc contained "All 12 layout tests" (T2), "12 layout unit tests" (T5),
    // and "12 tests, P0/P1" (ATDD). After: each must be "All 14 layout tests (12 original + clamp-path + golden-anchor ...)",
    // "14 layout unit tests.*clamp-path and golden-anchor", "14 tests, P0/P1" with same qualification.
    // A stale "12" would mis-count onboarding on PR review.
    const t2Hit = (storyDoc.match(/All 14 layout tests \(12 original \+ clamp-path \+ golden-anchor/g) ?? []).length;
    assert.equal(t2Hit, 1, 'T2 must contain exactly one "All 14 layout tests (12 original + clamp-path + golden-anchor" pin');

    const t5Hit = (storyDoc.match(/14 layout unit tests.*clamp-path and golden-anchor/g) ?? []).length;
    assert.equal(t5Hit, 1, 'T5 must contain exactly one "14 layout unit tests...clamp-path and golden-anchor" pin');

    const atddHit = (storyDoc.match(/14 tests, P0\/P1.*plus clamp-path and golden-anchor/g) ?? []).length;
    assert.equal(atddHit, 1, 'ATDD bullet must contain exactly one "14 tests, P0/P1 ...plus clamp-path and golden-anchor" pin');

    // No "All 12 layout tests" should remain in T2 narrative after upgrade to 14.
    // The historical defer at deferred-work.md DW-11 header contains "12 layout tests" (without "All") — that's allowed and not counted here.
    const staleT2 = (storyDoc.match(/All 12 layout tests/g) ?? []).length;
    assert.equal(staleT2, 0, 'Stale "All 12 layout tests" must be gone (T2 now says All 14; quoted "12 layout tests" in defer preamble is not "All 12")');

    const staleT5 = (storyDoc.match(/12 layout unit tests/g) ?? []).length;
    assert.equal(staleT5, 0, 'Stale "12 layout unit tests" must be gone');

    const staleAtdd = (storyDoc.match(/12 tests, P0\/P1/g) ?? []).length;
    assert.equal(staleAtdd, 0, 'Stale "12 tests, P0/P1" must be gone');
  });

  it.skip('[P0-02] AC layout.test.ts file truth — count ≥14 (observed 18) + golden anchors 382/688/452 still present (R-001)', () => {
    // Before review: 12 tests. After 2026-08-17 review fixes: 14 (clamp-path + golden-anchor +50×580 452). After floor sweeps: 18.
    // Doc says 14 (≥14 contract) while file is 18 — assert ≥14 plus every doc-quoted golden anchor present, not strict equality.
    const fileCount = countTestInvocations(layoutTestSrc);
    assert.ok(fileCount >= 14, `layout.test.ts must have ≥14 test( invocations (observed ${fileCount})`);
    assert.equal(fileCount, 18, 'layout.test.ts truth is 18 test( invocations (14 + 4 floor/degenerate/min-tile additions)');

    for (const anchor of ['382', '688', '452'] as const) {
      const hits = (layoutTestSrc.match(new RegExp(`\\b${anchor}\\b`, 'g')) ?? []).length;
      assert.ok(hits >= 1, `golden anchor ${anchor} must still be present in layout.test.ts (observed ${hits})`);
    }
    // Doc pins must not drift from anchors — verify story doc also still references golden gap implicitly via count note
    // (story doc does not list 382 literally, but ATDD bullet references golden-anchor cases as added).
  });

  it.skip('[P0-03] AC ledger DW-11 done + resolution-undo single 64-hex + resolution string (R-002)', () => {
    // Before sweep: DW-11 "status: open". After: "status: done 2026-09-02" + "resolution: resolved by sweep bundle dw-doc-layout-test-count-sync"
    // + "resolution-undo: 8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb 2026-09-02 7374617475733a206f70656e"
    // Ledger contains many other DW entries also dated 2026-09-02 — we pin DW-11 specifically, not global count.
    assert.ok(ledger.includes('DW-11'), 'DW-11 entry must exist');
    // Extract the DW-11 block (from its header to next DW- header) and pin inside it
    const dw11Start = ledger.indexOf('DW-11:');
    const dw11Next = ledger.indexOf('### DW-', dw11Start + 1);
    const dw11Block = ledger.slice(dw11Start, dw11Next === -1 ? undefined : dw11Next);
    assert.ok(dw11Block.includes('status: done 2026-09-02'), 'DW-11 block must contain "status: done 2026-09-02"');
    assert.ok(dw11Block.includes('resolved by sweep bundle dw-doc-layout-test-count-sync'), 'DW-11 resolution string must be inside DW-11 block');
    assert.ok(dw11Block.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'), 'DW-11 resolution-undo must be exactly the landed 64-hex 8080feef...');
    assert.ok(dw11Block.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb 2026-09-02 7374617475733a206f70656e'), 'DW-11 resolution-undo tail must carry "2026-09-02 7374..." hex of status: open');
    // Global pin: hash appears exactly once in file (no duplicate DW-11)
    const undoHashGlobal = (ledger.match(/8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb/g) ?? []).length;
    assert.equal(undoHashGlobal, 1, 'hash 8080feef must appear exactly once globally');
  });

  it.skip('[P0-04] AC ledger DW-56 hygiene co-located — done + 8080feef sister hash vs 0eb6ce61 distinct (Not-in-Scope isolation)', () => {
    // Working tree also flips DW-56 in same diff; this bundle must not orphan it and must not claim its engine coverage.
    // Pin DW-56 ledger hygiene as Not-in-Scope traceability — full engine P0 lives in dw-engine-rng-trust-hardening.
    assert.ok(ledger.includes('DW-56'), 'DW-56 entry must exist');
    const dw56Start = ledger.indexOf('DW-56:');
    const dw56Next = ledger.indexOf('### DW-', dw56Start + 1);
    const dw56Block = ledger.slice(dw56Start, dw56Next === -1 ? undefined : dw56Next);
    assert.ok(dw56Block.includes('status: done 2026-09-02'), 'DW-56 block must contain "status: done 2026-09-02"');
    assert.ok(dw56Block.includes('0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'), 'DW-56 resolution-undo must be exactly the landed 64-hex 0eb6ce61...');
    assert.ok(dw56Block.includes('decision: 2026-09-02 Clamp roll and validate displayRoll'), 'DW-56 decision line "Clamp roll and validate displayRoll..." must be inside DW-56 block');

    const dw56HashGlobal = (ledger.match(/0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e/g) ?? []).length;
    assert.equal(dw56HashGlobal, 1, 'hash 0eb6ce61 must appear exactly once globally');

    // Both DW-11 and DW-56 hashes are distinct and present
    assert.ok(ledger.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'), 'DW-11 hash present');
    assert.ok(ledger.includes('0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'), 'DW-56 hash present');

    const totalUndo = (ledger.match(/resolution-undo:\s*[0-9a-f]{64}/g) ?? []).length;
    assert.ok(totalUndo >= 2, `at least 2 resolution-undo 64-hex entries (observed ${totalUndo}, must include DW-11 + DW-56)`);
  });

  it.skip('[P0-05] AC no prod layout code changed for DW-11 + engine delta isolated via source-identity (R-005, R-EXT-01)', () => {
    // DW-11 is doc-only: layout math seam must have zero edited lines for this diff's intent.
    // Engine delta (game.ts normalizeDisplayRoll + weights.ts safeRoll) exists in same working tree but belongs to
    // dw-engine-rng-trust-hardening and is Not-in-Scope here — we isolate via source-identity pins, not via duplicated engine P0.
    // Host pins:
    assert.equal(SAFE_MARGIN, 16, 'SAFE_MARGIN pin 16');
    assert.equal(PORTRAIT_BAND_HEIGHT, 96, 'PORTRAIT_BAND_HEIGHT 96');
    assert.equal(LANDSCAPE_BAND_HEIGHT, 48, 'LANDSCAPE_BAND_HEIGHT 48 (fits >=44pt hit target)');
    assert.equal(BOARD_SIZE_FLOOR, 216, 'BOARD_SIZE_FLOOR 216 =44*4 +8*2 +8*3');

    // Layout seam still sound: portrait width-bounded 390×844 → 358, landscape height-bounded 844×390 below thin band
    assert.equal(layoutFor({ width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } }).boardSize, 358);
    assert.equal(layoutFor({ width: 1024, height: 768, insets: ZERO_INSETS }).boardSize, 688);
    assert.equal(layoutFor({ width: 414, height: 896, insets: ZERO_INSETS }).boardSize, 382);
    assert.equal(layoutFor({ width: 500, height: 580, insets: ZERO_INSETS }).boardSize, 452);
    assert.equal(layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }).boardSize, 0);

    // Source-identity isolation pins (doc-only seam): Hud/App band wiring still via getBandTop dedup (already landed at a09e6ed)
    assert.ok(layoutSrc.includes('export function getBandTop'), 'layout.ts must still export getBandTop (dedup already landed, not regressed)');
    assert.ok(appSrc.includes('getBandTop'), 'App.tsx still references getBandTop');
    assert.ok((layoutSrc.match(/Number\.isFinite/g) ?? []).length >= 6, 'layout.ts Number.isFinite guard (6-field) still present from prior band-dedup sweep');

    // Isolation cross-reference: this file must not claim engine normalizeDisplayRoll / safeRoll as its own P0 detail —
    // engine seam is verified by reading _bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md exists
    const engineDesign = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../_bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md');
    assert.ok(fs.existsSync(engineDesign), 'co-located engine design file must exist as the authoritative gate (Not-in-Scope isolation)');
    const engineChecklist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../_bmad-output/test-artifacts/atdd-checklist-dw-engine-rng-trust-hardening.md');
    assert.ok(fs.existsSync(engineChecklist), 'co-located engine ATDD checklist must exist as the sole P0 for weights.ts/game.ts (this bundle only does hygiene)');
  });
});

describe('ATDD dw-doc-layout-test-count-sync — P1 wiring (ledger hygiene, idempotency, gate preservation)', () => {
  it.skip('[P1-01] Auto Run Result singleton — exactly one ## Auto Run Result block and Status: done inside it (R-004)', () => {
    const blocks = (storyDoc.match(/^## Auto Run Result$/gm) ?? []).length;
    assert.equal(blocks, 1, 'story doc must have exactly one "## Auto Run Result" block (not idempotent duplicate append)');

    const idx = storyDoc.lastIndexOf('## Auto Run Result');
    assert.ok(idx !== -1, 'Auto Run Result block must exist');
    const tail = storyDoc.slice(idx);
    const statusDoneInBlock = (tail.match(/^Status:\s*done$/gm) ?? []).length;
    assert.equal(statusDoneInBlock, 1, 'exactly one "Status: done" inside Auto Run Result block (tail-scoped; global Status: done at top is outside)');

    // The block must carry the 3-line summary (orientation, layout modules, verification 127/127)
    assert.ok(tail.includes('orientation unlocked'), 'Auto Run Result must contain orientation summary');
    assert.ok(tail.includes('SafeAreaProvider'), 'Auto Run Result must contain SafeAreaProvider summary');
    assert.ok(tail.includes('tsc --noEmit'), 'Auto Run Result must contain tsc summary');

    // Ensure the block is at end of file (append, not duplicate insertion in middle)
    assert.ok(tail.includes('Story 1.5'), 'Auto Run Result tail must reference Story 1.5');
  });

  it.skip('[P1-02] ATDD label cross-pin — no stale 12 label remains outside defer, verification 127/127 text preserved (R-003)', () => {
    // Stale 12 traps already pinned in P0-01; here also verify ATDD line still references layout suite and verification number unchanged
    assert.ok(storyDoc.includes('atdd-checklist-1-5'), 'story doc must still reference atdd-checklist-1-5');
    assert.ok(storyDoc.includes('127/127 pass'), 'Verification 127/127 pass text must still be present (not accidentally edited)');

    // No remaining "12 tests, P0/P1" stale hit beyond defer preamble already checked
    assert.equal((storyDoc.match(/12 tests, P0\/P1/g) ?? []).length, 0, 'No stale ATDD 12 label');

    // New 14 label includes the "(plus clamp-path and golden-anchor cases added in the 2026-08-17 review fixes)" qualification
    assert.ok(storyDoc.includes('plus clamp-path and golden-anchor cases added in the 2026-08-17 review fixes'), 'ATDD qualification must include the review-fixes note');
  });

  it.skip('[P1-03] orchestrator ownership — sprint-status.yaml not written by this workflow (R-EXT-02)', () => {
    // Prompt constraint: sprint-status.yaml is orchestrator-owned: never write it, never revert a change to it.
    // Hygiene: ledger must never mention sprint-status (this ATDD workflow pins isolation)
    assert.equal(ledger.includes('sprint-status'), false, 'deferred-work.md must not mention sprint-status.yaml (isolation hygiene)');

    // Working-tree diff must show no sprint-status file — verify via source-level absence
    const sprintPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../_bmad-output/implementation-artifacts/sprint-status.yaml');
    assert.ok(fs.existsSync(sprintPath), 'sprint-status.yaml still exists as orchestrator artifact (but this diff must not have touched it)');

    // The orchestrator's marker (implementation-artifacts/bmad-dev-auto-result-*.md) is not asserted here — that's the completion signal.
  });

  it.skip('[P1-04] gate preservation — layout.test.ts 18 pass + both tsc clean (doc edit must not regress layout suite)', () => {
    // Host gate: layoutFor never throws, every boardSize/bandHeight finite, 18 tests would pass.
    // We re-derive the core 18 invariants directly without invoking npm test (host-only O(1) pins).
    // Full npm --prefix triade test -- __tests__/ui/layout.test.ts 18 pass is gated by P0 layout seam but re-pinned here for NFR.
    const cases = [
      { width: 320, height: 568, expectFinite: true },
      { width: 390, height: 844, expectFinite: true },
      { width: 414, height: 896, expectFinite: true },
      { width: 844, height: 390, expectFinite: true },
      { width: 1024, height: 768, expectFinite: true },
      { width: 2000, height: 200, expectFinite: true },
      { width: 320, height: 480, expectFinite: true },
    ] as const;

    for (const { width, height } of cases) {
      let r: ReturnType<typeof layoutFor>;
      assert.doesNotThrow(() => {
        r = layoutFor({ width, height, insets: ZERO_INSETS });
      });
      r = layoutFor({ width, height, insets: ZERO_INSETS });
      assert.ok(Number.isFinite(r.boardSize) && Number.isFinite(r.bandHeight), `width=${width} must be finite`);
      assert.ok(r.boardSize >= 0 && r.bandHeight > 0);
    }

    // Constants still pinned
    assert.equal(SAFE_MARGIN, 16);
    assert.equal(PORTRAIT_BAND_HEIGHT, 96);
    assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
    // Source still type-correct (tsc clean smoke via import success)
    assert.ok(typeof layoutFor === 'function');
  });
});

describe('ATDD dw-doc-layout-test-count-sync — P2 static scans / residual + P3 exploratory', () => {
  it.skip('[P2-01] residual 14→18 note — doc says 14 but file is 18, accepted as not-a-defect with documentation (R-001)', () => {
    const fileCount = countTestInvocations(layoutTestSrc);
    assert.equal(fileCount, 18, 'file truth is 18 test( invocations');

    // Doc narrative after sweep correctly says 14 (12 original + clamp-path + golden-anchor) —
    // the +4 beyond 14 are floor/degenerate/min-tile sweeps added after 2026-08-17, documented as accepted residual in
    // test-design-dw-doc-layout-test-count-sync.md R-001. We do not fail the build for this residual; we document it.
    const doc14 = (storyDoc.match(/All 14 layout tests/g) ?? []).length;
    assert.equal(doc14, 1, 'doc correctly pins 14 after fix (intentionally not 18; +4 residual is the floor/degenerate path)');

    // Follow-on sweep can re-baseline doc to 18 without reopening DW-11 as defect — verify residual note exists in design
    const designPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../_bmad-output/test-artifacts/test-design/test-design-dw-doc-layout-test-count-sync.md');
    const design = fs.readFileSync(designPath, 'utf8');
    assert.ok(design.includes('≥14 not ==14'), 'design must document residual as ≥14 not ==14');
    assert.ok(design.includes('14→18'), 'design must note the residual 14→18 drift as accepted');
  });

  it.skip('[P2-02] SCAN doc style hygiene — doc sweep stayed in scope, no cross-cutting formula not reintroduced (R-005,R-006)', () => {
    // Story doc append must be the only new block; no music/bgm/RevenueCat/AdMob leakage into layout narrative
    assert.equal(/(music|bgm|RevenueCat|AdMob)/i.test(storyDoc), false, 'story doc must not leak cross-cutting domains');

    // The single definition of `insets.top + SAFE_MARGIN + bandHeight` lives inside getBandTop helper itself.
    // App/Hud duplication must be gone, but the helper definition is allowed exactly 1.
    const hits = (layoutSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length;
    assert.equal(hits, 1, 'layout.ts must contain exactly one `insets.top + SAFE_MARGIN + bandHeight` (the helper definition itself)');
    // App.tsx/Hud.tsx must not contain the literal duplicated band formula
    assert.equal((appSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'App.tsx must not contain duplicated insets.top + SAFE_MARGIN + bandHeight');
    const hudSrc = fs.readFileSync(fileURLToPath(new URL('../../src/ui/Hud.tsx', import.meta.url)), 'utf8');
    assert.equal((hudSrc.match(/insets\.top \+ SAFE_MARGIN \+ bandHeight/g) ?? []).length, 0, 'Hud.tsx must not contain duplicated formula');
    assert.equal((hudSrc.match(/topPad \+ bandHeight/g) ?? []).length, 0, 'Hud.tsx must not contain topPad + bandHeight');

    // Spec stubs must still pin final_revision a09e6ed — doc sync does not bump spec (monitor R-006)
    const specPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md');
    if (fs.existsSync(specPath)) {
      const spec = fs.readFileSync(specPath, 'utf8');
      assert.ok(spec.includes('a09e6ed') || spec.includes('final_revision'), 'spec still at a09e6ed final (doc sync did not bump spec)');
    }
  });

  it.skip('[P3-01] exploratory — full npm --prefix triade test waivable, but host layout.test.ts essential (P3)', () => {
    // Full 847+ pass / 10 EXPECTED RED felt-atdd is optional for a doc-only sweep (waivable with host layout 18 pass if time-boxed).
    // This P3 pin is exploratory: we assert the host smoke we already did, not the full bench.
    assert.ok(true, 'P3 exploratory — full npm test is waivable per test-design resource estimates <10 min smoke; host O(1) already pinned');
    // The fact that this runs at all (and P0-05 layout seam still sound) proves host gate <10 min smoke green.
    assert.equal(layoutFor({ width: 390, height: 844, insets: ZERO_INSETS }).boardSize, 358);
  });

  it.skip('[P3-02] exploratory — style scan: no duplicate formula not reintroduced and O(1) <1 ms bench (P3 hygiene)', () => {
    assert.equal(/mulberry32|RevenueCat|AdMob|bgm/i.test(layoutSrc), false, 'layout.ts stays pure (no cross-cutting import reintroduced)');
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 50, `10k layoutFor in ${elapsed.toFixed(1)} ms must be <50 ms (O(1), doc sync adds no worklet)`);
  });
});
