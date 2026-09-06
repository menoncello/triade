# Calibração da curva de spawn (spec 10-6)

Runbook do gate de calibração. Dono da decisão final: **Eduardo**.
O gate avalia, nunca aplica: retune é sempre edição manual de dados.

## Limites (thresholds)

| Métrica | Limite | Condição de retune |
|---|---|---|
| first-merge p50 | 25 s | `firstMergeP50Seconds > 25` |
| first-gameover p50 | 210 s | `firstGameoverP50Seconds > 210` |
| max-tile mediana | queda > 1 tier vs baseline | `drop >= 2` tiers na escada |

Escada de tiers: `1, 2, 3, 6, 12, 24, 48, 96, 192, 384, ...`
(valores fora da escada resolvem para o tier inferior mais próximo;
igualdade com o limite é OK, não é breach).
`clog12` é contexto informativo — nunca dispara gate, nunca é obrigatório.

Constantes no código: `FIRST_MERGE_P50_THRESHOLD_S`,
`FIRST_GAMEOVER_P50_THRESHOLD_S`, `MAX_TIER_DROP`
(`triade/src/engine/config/calibrationGate.ts`).

## Como o Eduardo fornece os resumos

1. Abrir os dashboards de telemetria (eventos das specs 10.2/10.3).
2. Extrair p50 de first-merge, p50 de first-gameover e mediana de max-tile
   da janela de análise (mesma janela para as três métricas).
3. Montar o resumo e chamar `evaluateCalibrationGate(summary, baseline)`:
   ```ts
   evaluateCalibrationGate(
     { firstMergeP50Seconds: 19, firstGameoverP50Seconds: 180, maxTileMedian: 96 },
     { maxTileMedianBaseline: 96 }
   );
   // -> { verdict: 'ok' | 'retune' | 'unknown', needsRetune, reasons, missing }
   ```
4. Sem telemetria disponível, o veredito é `unknown` (com a lista `missing`)
   e **nenhum retune é recomendado** — o gate bloqueia por falta de dados.

## Procedimento de retune (só dados)

1. Gate retornou `retune` **e** Eduardo aprovou a decisão.
2. Editar **somente** `triade/src/engine/config/spawnConfig.ts`
   (`POT_CURVE` / `FIXED_WEIGHTS` / `POT_WEIGHT`).
   Nunca modificar nada sob `triade/src/engine/core/`.
3. Validar o candidato com `validateSpawnConfig`
   (pot share = 0.2 com epsilon, decréscimo estrito, chaves `3 * 2^k`,
   janelas renormalizadas contra a escada).
4. Rodar a revalidação:
   ```
   cd triade && npm test -- calibration-gate && npm test -- spawn-config && npx tsc --noEmit
   ```
   Se a validação rejeitar, o CI falha e o candidato é descartado.
5. Registrar a decisão no log (ver schema abaixo) e commitar:
   só `spawnConfig.ts` (dados) + docs/log de decisão mudam no diff.

## Schema do log de decisão

Cada entrada em `docs/decisoes/` contém:

- **data**: data da avaliação (AAAA-MM-DD).
- **métricas antes**: first-merge p50, first-gameover p50, max-tile mediana
  e baseline usados na avaliação (valores + fonte/janela).
- **decisão**: `manter` | `retunar` (+ aprovador: Eduardo).
- **valores antes/depois**: pesos da curva tocados, antes e depois.
- **revalidação**: resultado de `validateSpawnConfig` + testes/CI após a troca.

Template: `docs/decisoes/calibracao-10-6-PADRAO.md`.
