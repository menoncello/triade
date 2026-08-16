import { test } from 'node:test';
import assert from 'node:assert';

// Red-phase ATDD contract: the entitlements shape this story must implement.
// Local type + variable specifier keep `tsc --noEmit` green until activation.
type Entitlements = Record<string, boolean>;

const ENTITLEMENTS_SPEC = '../../src/services/storage/entitlements.ts';

test('[P0] remote never downgrades a held offline entitlement it does not claim (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  const offline: Entitlements = { no_ads: true };
  const remote: Entitlements = {};
  assert.deepStrictEqual(
    mergeEntitlements(offline, remote),
    { no_ads: true },
    'held offline entitlement survives remote reconciliation'
  );
});

test('[P0] offline wins over remote when both claim the same entitlement (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  const offline: Entitlements = { starter_pack: true };
  const remote: Entitlements = { starter_pack: false };
  assert.deepStrictEqual(
    mergeEntitlements(offline, remote),
    { starter_pack: true },
    'offline claim is authoritative over a remote downgrade'
  );
});

test('[P0] empty remote keeps offline entitlements intact (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  const offline: Entitlements = { no_ads: true, extra_lives: true };
  const remote: Entitlements = {};
  assert.deepStrictEqual(
    mergeEntitlements(offline, remote),
    { no_ads: true, extra_lives: true },
    'empty remote does not touch the offline set'
  );
});

test('[P0] both empty yields an empty entitlement set (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  assert.deepStrictEqual(mergeEntitlements({}, {}), {}, 'no entitlements anywhere means none merged');
});

test('[P0] remote-only entitlements are merged into the offline set (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  const offline: Entitlements = {};
  const remote: Entitlements = { starter_pack: true };
  assert.deepStrictEqual(
    mergeEntitlements(offline, remote),
    { starter_pack: true },
    'remote-only entitlement is adopted'
  );
});

test('[P0] identical sets merge to the same set (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  const both: Entitlements = { no_ads: true, starter_pack: true };
  assert.deepStrictEqual(mergeEntitlements(both, both), both, 'identical sets are unchanged');
});

test('[P1] non-boolean remote values are dropped, not merged verbatim (ADR-02, AC-3)', async () => {
  const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
    mergeEntitlements: (offline: Entitlements, remote: Entitlements) => Entitlements;
  };
  const offline: Entitlements = { no_ads: true };
  const remote = { no_ads: true, junk: null, str: 'yes', num: 42 };
  assert.deepStrictEqual(
    mergeEntitlements(offline, remote as unknown as Entitlements),
    { no_ads: true },
    'non-boolean remote values never enter the merged entitlement set'
  );
});
