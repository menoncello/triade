import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const ENTITLEMENTS_SPEC = '../../src/services/storage/entitlements.ts';

describe('entitlements restore — offline precedence (4.5)', () => {
  test('[P0] held offline entitlements survive empty remote (ADR-02)', async () => {
    const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      mergeEntitlements: (a: Record<string, boolean>, b: Record<string, boolean>) => Record<string, boolean>;
    };
    const offline = { triade_hint_5: true, triade_undo_3: true, triade_no_ads: true };
    const remote: Record<string, boolean> = {};
    assert.deepStrictEqual(mergeEntitlements(offline, remote), offline);
  });

  test('[P0] held true never downgraded when remote claims false', async () => {
    const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      mergeEntitlements: (a: Record<string, boolean>, b: Record<string, boolean>) => Record<string, boolean>;
    };
    const offline = { triade_no_ads: true };
    const remote = { triade_no_ads: false } as unknown as Record<string, boolean>;
    assert.deepStrictEqual(mergeEntitlements(offline, remote), { triade_no_ads: true });
    const offline2 = { triade_hint_5: true };
    assert.deepStrictEqual(mergeEntitlements(offline2, { triade_hint_5: false } as unknown as Record<string, boolean>), {
      triade_hint_5: true,
    });
    const offline3 = { triade_undo_3: true };
    assert.deepStrictEqual(mergeEntitlements(offline3, { triade_undo_3: false } as unknown as Record<string, boolean>), {
      triade_undo_3: true,
    });
  });

  test('[P0] remote-only entitlements are adopted', async () => {
    const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      mergeEntitlements: (a: Record<string, boolean>, b: Record<string, boolean>) => Record<string, boolean>;
    };
    assert.deepStrictEqual(mergeEntitlements({}, { triade_hint_5: true }), { triade_hint_5: true });
    assert.deepStrictEqual(mergeEntitlements({}, { triade_no_ads: true }), { triade_no_ads: true });
    assert.deepStrictEqual(mergeEntitlements({ triade_hint_5: true }, { triade_undo_3: true }), {
      triade_hint_5: true,
      triade_undo_3: true,
    });
  });

  test('[P0] malformed non-boolean remote values are dropped', async () => {
    const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      mergeEntitlements: (a: Record<string, boolean>, b: Record<string, boolean>) => Record<string, boolean>;
    };
    const offline = { triade_hint_5: true };
    const remote = { triade_hint_5: true, junk: null, str: 'yes', num: 42 } as unknown as Record<string, boolean>;
    assert.deepStrictEqual(mergeEntitlements(offline, remote), { triade_hint_5: true });
  });

  test('[P0] identical sets unchanged and offline+remote union correct', async () => {
    const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      mergeEntitlements: (a: Record<string, boolean>, b: Record<string, boolean>) => Record<string, boolean>;
    };
    const both = { triade_hint_5: true, triade_undo_3: true, triade_no_ads: true };
    assert.deepStrictEqual(mergeEntitlements(both, both), both);
    assert.deepStrictEqual(mergeEntitlements({ triade_hint_5: true }, { triade_no_ads: true }), {
      triade_hint_5: true,
      triade_no_ads: true,
    });
  });

  test('[P1] getEntitlements never throws — returns {} on missing SecureStore', async () => {
    const { getEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      getEntitlements: () => Promise<Record<string, boolean>>;
    };
    await assert.doesNotReject(async () => {
      const res = await getEntitlements();
      assert.ok(typeof res === 'object' && res !== null);
    });
  });

  test('[P0] per-match budgets never enter entitlements merge — merge is pure boolean map', async () => {
    const { mergeEntitlements } = (await import(ENTITLEMENTS_SPEC)) as {
      mergeEntitlements: (a: Record<string, boolean>, b: Record<string, boolean>) => Record<string, boolean>;
    };
    // Even if someone passed iapRemaining/hint counts, they are not boolean entitlements and must be dropped
    const offline = { triade_hint_5: true } as Record<string, boolean>;
    const remoteWithJunk = { triade_undo_3: true, iapRemaining: 3, hintRemaining: 5 } as unknown as Record<string, boolean>;
    const merged = mergeEntitlements(offline, remoteWithJunk);
    // only boolean true entitlements survive, numeric junk dropped
    assert.deepStrictEqual(merged, { triade_hint_5: true, triade_undo_3: true });
  });
});
