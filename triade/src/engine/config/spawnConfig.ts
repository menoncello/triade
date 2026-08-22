// Spawn configuration — the single access point for all spawn weight data
// (boundary rule 4: config is data, validated by tests, no scattered literals).
//
// POT_CURVE (FR-9): one weight per tile value, keyed by tile VALUE.
//   - Initial values are the halving decay: weight(v) = POT_BASE_VALUE / v
//     (each value weighs half of the next-lower value).
//   - Tuning intent: playtest calibration via FR-9 — retuning a value is a
//     data edit here, no code change and no rebuild beyond this module.
//   - Decision log: PRD decision-log entries #17 (configurable curve) and
//     #23 (halving-decay initial values) document this choice.
export const POT_WEIGHT = 0.2;

export const FIXED_WEIGHTS: Readonly<Record<1 | 2, number>> = Object.freeze({ 1: 0.4, 2: 0.4 });

export const POT_BASE_VALUE = 3;

export const POT_CURVE: Readonly<Record<number, number>> = Object.freeze({
  3: 1,
  6: 0.5,
  12: 0.25,
  24: 0.125,
  48: 0.0625,
  96: 0.03125,
});

const EPSILON = 1e-9;

type SpawnConfigInput = {
  potCurve?: Readonly<Record<number, number>>;
  fixedWeights?: Readonly<Record<number, number>>;
};

// Pure config validator (engine consistency rule: "Result: ok | rejected;
// engine never throws"). Defaults to the shipped exports; tests may pass an
// explicit config to exercise rejection paths without mutating frozen data.
export function validateSpawnConfig(
  config: SpawnConfigInput = {}
): { ok: true } | { ok: false; errors: string[] } {
  const potCurve = config.potCurve ?? POT_CURVE;
  const fixedWeights = config.fixedWeights ?? FIXED_WEIGHTS;
  const errors: string[] = [];

  const entries = Object.entries(potCurve).map(
    ([k, w]) => [Number(k), w as number] as const
  );

  if (entries.length === 0) {
    errors.push('POT_CURVE must not be empty');
  }

  for (const [value, weight] of entries) {
    if (!Number.isFinite(weight) || weight <= 0) {
      errors.push(`POT_CURVE weight for value ${value} must be finite and > 0`);
    }
    if (!(value > 0)) {
      errors.push(`POT_CURVE key ${value} must be a positive multiple of POT_BASE_VALUE (${POT_BASE_VALUE})`);
    } else {
      const k = Math.log2(value / POT_BASE_VALUE);
      if (!Number.isInteger(k)) {
        errors.push(`POT_CURVE key ${value} must equal POT_BASE_VALUE * 2^k (${POT_BASE_VALUE} * 2^k)`);
      }
    }
  }

  const sorted = entries.slice().sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (!((sorted[i][1] as number) < (sorted[i - 1][1] as number))) {
      errors.push(
        `POT_CURVE weights must strictly decrease as values increase (${sorted[i][0]}: ${sorted[i][1]})`
      );
    }
  }

  // Effective-curve monotonicity: potWeights fills every unlisted ladder value
  // with the halving fallback (POT_BASE_VALUE / v), which is itself strictly
  // decreasing. A configured weight may still break the *effective* curve when
  // an unlisted neighbor's fallback is not strictly between the configured
  // weights. The fallback is monotonic by construction, so only the two
  // transition boundaries per configured entry need checking:
  //   - successor  v*2  unlisted -> fallback(v*2) must be < configured weight
  //   - predecessor v/2 unlisted -> fallback(v/2) must be > configured weight
  const configuredKeys = new Set(entries.map(([v]) => v));
  for (const [value, weight] of entries) {
    const next = value * 2;
    if (!configuredKeys.has(next)) {
      const fallback = POT_BASE_VALUE / next;
      if (!((weight as number) > fallback)) {
        errors.push(
          `POT_CURVE effective weight must strictly decrease past value ${value}: next ladder value ${next} falls back to ${fallback}, which must be < configured weight (${weight})`
        );
      }
    }
    const prev = value / 2;
    if (prev >= POT_BASE_VALUE && !configuredKeys.has(prev)) {
      const fallback = POT_BASE_VALUE / prev;
      if (!((weight as number) < fallback)) {
        errors.push(
          `POT_CURVE effective weight must strictly decrease into value ${value}: previous ladder value ${prev} falls back to ${fallback}, which must be > configured weight (${weight})`
        );
      }
    }
  }

  for (const key of Object.keys(fixedWeights).map(Number)) {
    if (key !== 1 && key !== 2) {
      errors.push(`FIXED_WEIGHTS key ${key} is not allowed (only 1 and 2)`);
    }
  }

  for (const key of [1, 2] as const) {
    const w = fixedWeights[key];
    if (!Number.isFinite(w) || (w as number) <= 0) {
      errors.push(`FIXED_WEIGHTS[${key}] must be finite and > 0`);
    }
  }

  const fixedSum = (fixedWeights[1] as number) + (fixedWeights[2] as number);
  if (Math.abs(fixedSum - (1 - POT_WEIGHT)) > EPSILON) {
    errors.push(
      `FIXED_WEIGHTS[1] + FIXED_WEIGHTS[2] (${fixedSum}) must equal 1 - POT_WEIGHT (${1 - POT_WEIGHT}) within ${EPSILON}`
    );
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
