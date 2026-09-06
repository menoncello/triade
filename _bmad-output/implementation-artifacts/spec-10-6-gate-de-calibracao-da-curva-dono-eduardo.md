---
title: '10-6 Gate de calibracao da curva (dono: Eduardo)'
type: 'feature'
created: '2026-09-06'
status: done
baseline_revision: 272efcd91b86d58106e27639c8aac20ba682c599
final_revision: 20b91aa8e4152c485bbac25aac3a0b5f2db39607
review_loop_iteration: 0
followup_review_recommended: false
operator_actions:
  - "Abrir os dashboards de telemetria (eventos 10.2/10.3) e extrair first-merge p50, first-gameover p50 e max-tile mediana da mesma janela de analise."
  - "Preencher o baseline de playtest (max-tile mediana) em docs/decisoes/calibracao-10-6-PADRAO.md a partir de dados reais — nao inventar numeros."
  - "Rodar evaluateCalibrationGate com os resumos e registrar o veredito (ok | retune | unknown) no log de decisao."
  - "Se veredito retune, decidir como Eduardo se retuna a curva editando SOMENTE triade/src/engine/config/spawnConfig.ts, revalidar com validateSpawnConfig mais testes e CI, e registrar antes/depois no log."
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** The spawn curve (escada 48 / passo 4pp / clamp / halving / janelas 50-30-20) has no numeric, data-driven retune gate: thresholds from telemetry (first-merge p50, first-gameover p50, max-tile mediana) exist only as epic prose, with no evaluable helper, no decision log, and no CI revalidation binding.

**Approach:** Add a pure, data-only calibration gate: a threshold evaluator over telemetry summaries plus a decision-log record, with curve revalidation (pot share, clamp, window renormalization) enforced by tests/CI; engine code stays untouched and the final retune decision stays with Eduardo.

## Boundaries & Constraints

**Always:** Retune surface is `spawnConfig` data only (POT_CURVE / FIXED_WEIGHTS / POT_WEIGHT); engine files under `triade/src/engine/core/` are never modified; every gate evaluation and retune decision is logged with before/after values; TypeScript strict, no new runtime deps.

**Block If:** Production telemetry (first-merge p50, first-gameover p50, max-tile mediana, clog 1/2) is unavailable — thresholds cannot be evaluated without operator-supplied summaries; any retune value choice itself requires Eduardo's judgment.

**Never:** Touch engine rules, change telemetry event schemas (10.2/10.3), auto-apply retunes from code, invent telemetry numbers, or write to `sprint-status.yaml`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Threshold breach | firstMergeP50 > 25s OR firstGameoverP50 > 210s OR maxTileMedian drops > 1 tier vs baseline | `needsRetune: true` with triggered reasons | No error expected |
| Within thresholds | All metrics within bounds | `needsRetune: false`, empty reasons | No error expected |
| Missing telemetry | Any summary field absent | Verdict `unknown`, no retune recommendation | Return explicit missing-fields list, never default to retune |
| Invalid retune candidate | Candidate curve breaks pot share / strict decrease / 2^k keys / window sum | Rejected with reasons | List violations; CI fails |

</intent-contract>

## Code Map

- `triade/src/engine/config/spawnConfig.ts` -- sole tuning data (POT_WEIGHT=0.2, FIXED 0.4/0.4, halving curve); only file a retune may edit
- `triade/src/engine/core/{spawn.ts,weights.ts,pot.ts,ceiling.ts}` -- engine rules, MUST stay untouched (purity invariant)
- `triade/__tests__/engine/spawn-config.test.ts` -- existing curve validation (pot share epsilon, strict decrease, 2^k keys)
- `triade/src/game/preview.ts` -- preview window observer (WINDOW_MAX=3); windows 50-30-20 live in epic prose, renormalize against ladder
- `.github/workflows/ci.yml` -- engine-test-and-benchmark gate where revalidation must fail CI

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/config/calibrationGate.ts` -- pure `evaluateCalibrationGate(summary, baseline)` returning needsRetune + reasons + missing; thresholds 25s / 210s / 1-tier drop; no I/O
- [x] `triade/__tests__/engine/calibration-gate.test.ts` -- unit-test I/O matrix (breach each threshold, within bounds, missing fields, invalid candidate rejection via validateSpawnConfig)
- [x] `docs/calibracao-da-curva.md` -- gate runbook: thresholds, how Eduardo supplies telemetry summaries, data-only retune procedure, decision-log schema with before/after
- [x] `docs/decisoes/calibracao-10-6-PADRAO.md` -- worked decision-log template entry (baseline playtest values marked TBD-operator, no invented numbers)

**Acceptance Criteria:**
- Given telemetry summary + playtest baseline, when evaluateCalibrationGate runs, then it returns needsRetune true exactly when first-merge p50 > 25s or first-gameover p50 > 210s or max-tile median drops > 1 tier
- Given a candidate retune, when curve invariants break (pot share != 0.2 epsilon, non-strict-decrease, non-2^k key, windows not renormalized), then validation rejects and CI fails
- Given a retune is applied, when diffed, then only `spawnConfig.ts` (data) plus docs/decision-log change; no file under `triade/src/engine/core/` is modified
- Given no telemetry summaries are available, when gate is invoked, then verdict is unknown with missing-fields listed and no retune is recommended

## Design Notes

Thresholds are pure comparisons, deliberately free of telemetry fetching: the operator pastes dashboard summaries (p50s, median tier, clog) into the evaluator. Tier-drop compares ladder indices over POT_CURVE keys extended with [1,2] (ladder 1,2,3,6,12,24,48,96,...); drop > 1 index step triggers. This keeps the gate testable offline and the engine untouched.

## Verification

**Commands:**
- `npm test -- calibration-gate` -- expected: all gate matrix cases pass
- `npm test -- spawn-config` -- expected: existing curve invariants still pass
- `npx tsc --noEmit` -- expected: clean typecheck

## Spec Change Log

## Review Triage Log

### 2026-09-06 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 1, low 1)
- defer: 1: (high 0, medium 1, low 0)
- reject: 14
- addressed_findings:
  - `[medium]` `[patch]` null/undefined summary crashed on property access instead of returning unknown — made summary access optional-chained, added null-summary test
  - `[low]` `[patch]` non-positive finite inputs (negative/zero p50s and tiles) passed as ok — isUsableNumber now requires v > 0, added non-positive test

## Auto Run Result

Summary: pure data-only spawn-curve calibration gate (thresholds 25s / 210s / 1-tier drop) with decision-log runbook and template; engine untouched; final retune decision stays with Eduardo.

Files changed (all new, no tracked modifications):
- `triade/src/engine/config/calibrationGate.ts` -- pure evaluateCalibrationGate, no I/O
- `triade/__tests__/engine/calibration-gate.test.ts` -- 12 tests covering the I/O matrix plus review patches
- `docs/calibracao-da-curva.md` -- PT runbook (thresholds, Eduardo summary flow, data-only retune, log schema)
- `docs/decisoes/calibracao-10-6-PADRAO.md` -- decision-log template with OPERATOR placeholders

Review: 2 patches applied (null-summary tolerance, positive-value guard), 1 deferred (DW-114 pre-existing preview-availability failure), 14 rejected (spec-by-design or infeasible).

Verification: calibration-gate 12/12 pass, spawn-config 8/8 pass, `npx tsc --noEmit` clean; `git status` confirms nothing under `triade/src/engine/core/` and no `sprint-status.yaml` write. Full-suite `preview-availability.integration.test.ts` failure is pre-existing and unrelated (deferred as DW-114).

Residual risks: gate verdicts are only as good as the operator-supplied dashboard summaries; no automated telemetry feed exists yet (10.2/10.3 pipeline not present in repo).

## Operator Confirmation

Confirmed 2026-09-06: the external actions this story owed were carried out.

- Abrir os dashboards de telemetria (eventos 10.2/10.3) e extrair first-merge p50, first-gameover p50 e max-tile mediana da mesma janela de analise.
- Preencher o baseline de playtest (max-tile mediana) em docs/decisoes/calibracao-10-6-PADRAO.md a partir de dados reais — nao inventar numeros.
- Rodar evaluateCalibrationGate com os resumos e registrar o veredito (ok | retune | unknown) no log de decisao.
- Se veredito retune, decidir como Eduardo se retuna a curva editando SOMENTE triade/src/engine/config/spawnConfig.ts, revalidar com validateSpawnConfig mais testes e CI, e registrar antes/depois no log.

_Appended by the bmad-loop orchestrator (`bmad-loop confirm`, #335): a human confirmed these external actions out of band, and the story was advanced from `awaiting-operator` to `done`._
