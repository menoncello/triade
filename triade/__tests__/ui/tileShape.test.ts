import { test } from 'node:test';
import assert from 'node:assert';

const SPEC = '../../src/ui/tileNumerals.ts';

const DESIGN_HEXES: Record<number, string> = {
  1: '#EFE3C2',
  2: '#C9963B',
  3: '#E4A53B',
  6: '#E08532',
  12: '#C96E2E',
  24: '#A2521F',
  48: '#6E5A45',
  96: '#4E5560',
  192: '#28A074',
  384: '#157A5C',
  768: '#0E3B2E',
  1536: '#FFD9A0',
  3072: '#FFF3DC',
};

const DARK = '#1C1206';
const LIGHT = '#F6F0E1';

test('[P0] TILE_HEXES matches DESIGN 13-tier table exact', async () => {
  const m = (await import(SPEC)) as {
    TILE_HEXES: Record<number, string>;
  };
  for (const [k, hex] of Object.entries(DESIGN_HEXES)) {
    const v = Number(k);
    assert.strictEqual(m.TILE_HEXES[v], hex, `TILE_HEXES[${v}] must be ${hex}, got ${m.TILE_HEXES[v]}`);
  }
});

test('[P0] TILE_INK per-tier matches DESIGN table', async () => {
  const m = (await import(SPEC)) as {
    TILE_INK: Record<number, string>;
    tileInkFor: (v: number) => string;
  };
  const expected: Record<number, string> = {
    1: DARK,
    2: DARK,
    3: DARK,
    6: DARK,
    12: DARK,
    24: LIGHT,
    48: LIGHT,
    96: LIGHT,
    192: DARK,
    384: LIGHT,
    768: LIGHT,
    1536: DARK,
    3072: DARK,
  };
  for (const [k, ink] of Object.entries(expected)) {
    const v = Number(k);
    assert.strictEqual(m.TILE_INK[v], ink, `TILE_INK[${v}]`);
    assert.strictEqual(m.tileInkFor(v), ink, `tileInkFor(${v})`);
  }
});

test('[P0] tileFillFor caps high values 6144/12288 to 3072 tier', async () => {
  const { tileFillFor } = (await import(SPEC)) as {
    tileFillFor: (v: number) => string;
  };
  assert.strictEqual(tileFillFor(6144), DESIGN_HEXES[3072], '6144 must cap to 3072 hex');
  assert.strictEqual(tileFillFor(12288), DESIGN_HEXES[3072], '12288 must cap to 3072 hex');
  assert.strictEqual(tileFillFor(3072), DESIGN_HEXES[3072]);
  assert.strictEqual(tileFillFor(1), DESIGN_HEXES[1]);
  assert.strictEqual(tileFillFor(2), DESIGN_HEXES[2]);
});

test('[P0] 192 emerald vs 1536 incandescent distinguishable by shape beyond hue', async () => {
  const { tileShapeFor } = (await import(SPEC)) as {
    tileShapeFor: (v: number) => { grain: number; glow: boolean; bevel: number };
  };
  const s192 = tileShapeFor(192);
  const s1536 = tileShapeFor(1536);
  // Must differ by grain or glow, not just color; lightness alone ambiguous
  const differs = s192.grain !== s1536.grain || s192.glow !== s1536.glow || s192.bevel !== s1536.bevel;
  assert.ok(differs, `192 shape ${JSON.stringify(s192)} vs 1536 ${JSON.stringify(s1536)} must differ by grain/glow/bevel`);
  // grain specifically should differ per spec task
  assert.notStrictEqual(s192.grain, s1536.grain, 'grain must differ between 192 and 1536');
});

test('[P1] grain band monotonic low<=mid<=emerald (shape beyond color)', async () => {
  const { tileShapeFor } = (await import(SPEC)) as {
    tileShapeFor: (v: number) => { grain: number; glow: boolean };
  };
  const low = tileShapeFor(3).grain;
  const mid = tileShapeFor(48).grain;
  const emerald = tileShapeFor(384).grain;
  assert.ok(low <= mid, `low grain ${low} <= mid ${mid}`);
  assert.ok(mid <= emerald, `mid grain ${mid} <= emerald ${emerald}`);
  // incandescent is glow variant — still shape beyond color via glow, not counted in monotonic
  const inc = tileShapeFor(1536);
  assert.ok(inc.glow === true, '1536 must have glow (only glow in system)');
});

test('[P1] TILE_HEXES 1 vs 2 distinct at a glance (GDD rule)', async () => {
  const { TILE_HEXES } = (await import(SPEC)) as {
    TILE_HEXES: Record<number, string>;
  };
  assert.notStrictEqual(TILE_HEXES[1], TILE_HEXES[2], '1 and 2 must be distinct (areia vs ocre)');
});
