# Log de decisão — calibração da curva (spec 10-6, PADRÃO)

> Template. Não inventar números de telemetria: todo valor de baseline ou
> de janela de análise é preenchido pelo Eduardo (OPERATOR) a partir dos
> dashboards (eventos 10.2/10.3).

- **data**: _a preencher pelo Eduardo_ (AAAA-MM-DD)
- **métricas antes**:
  - first-merge p50: _a preencher pelo Eduardo_ (s, janela/fonte)
  - first-gameover p50: _a preencher pelo Eduardo_ (s, janela/fonte)
  - max-tile mediana: _a preencher pelo Eduardo_ (tier, janela/fonte)
  - max-tile mediana baseline: _a preencher pelo Eduardo_ (tier)
  - clog12: _a preencher pelo Eduardo_ (informativo)
- **veredito do gate**: _ok | retune | unknown_ (+ `reasons`/`missing` retornados)
- **decisão**: _manter | retunar_ — aprovador: Eduardo
- **valores antes**: _curva vigente em `spawnConfig.ts` no momento da avaliação_
- **valores depois**: _apenas se retunar — pesos alterados, antes → depois_
- **revalidação**: _`validateSpawnConfig` + `npm test -- calibration-gate` +
  `npm test -- spawn-config` + `npx tsc --noEmit` (OK / FALHA + motivo)_
