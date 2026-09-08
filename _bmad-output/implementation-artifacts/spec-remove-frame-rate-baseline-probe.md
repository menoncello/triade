---
title: 'Remove frame-rate baseline probe entirely (hook, tests, App wiring)'
type: 'chore'
created: '2026-09-08'
status: 'done'
baseline_commit: '3a8ce43030ceb5501e7ec0fa0ed6d72d481c3ace'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O probe de baseline de frame rate não é desejado em nenhum ambiente — nem release, nem dev, nem via opt-in. O wiring atual (hook + readout + bump) é peso morto e superfície de risco no UI thread.

**Approach:** Remover totalmente: chamada/estado/efeito/readout em `App.tsx`, o módulo do hook, seus dois arquivos de teste dedicados e as menções em listas de isenção. O `devAutoDrive` (auto-drive de gestos) continua existindo para o harness de gestos.

## Boundaries & Constraints

**Always:** `devAutoDrive` e os efeitos de auto-drive de gestos continuam intactos; arquivos históricos (`dw-16-frame-rate-baseline-evidence.md`, `spec-frame-rate-baseline-measure.md`, specs `done` anteriores) ficam como registro; ler `https://docs.expo.dev/versions/v57.0.0/` antes de escrever código (triade/AGENTS.md).

**Ask First:** Se algum teste estrutural quebrar por ausência do arquivo (ex.: guardas que contam arquivos em `src/render`), HALT e reporte antes de adaptar.

**Never:** Remover ou alterar o auto-drive de gestos; tocar `GameBoard.tsx`/feel/engine; apagar evidências e specs históricos.

</frozen-after-approval>

## Code Map

- `triade/App.tsx` -- REMOVE: import do hook, estado `baselineGeneration`, chamada, efeito de bump, bloco de readout; manter `devAutoDrive` para o auto-drive
- `triade/src/render/useFrameRateBaseline.ts` -- DELETE: módulo sem mais consumidores
- `triade/__tests__/render/useFrameRateBaseline.math.test.ts` -- DELETE: guardas do módulo removido
- `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts` -- DELETE: scaffolds do módulo removido
- `triade/__tests__/engine/engine.purity.test.ts` -- UPDATE: tirar `'useFrameRateBaseline.ts'` do `RENDER_RUNTIME_BOUND`
- `triade/__tests__/ui/ui.norolls.test.ts` -- UPDATE: comentário de isenção sem o arquivo removido

## Tasks & Acceptance

**Execution:**
- [x] `triade/App.tsx` -- remover import, estado, chamada, efeito de bump e readout do probe; `devAutoDrive` preservado -- zero rastro do probe no app
- [x] `triade/src/render/useFrameRateBaseline.ts` + 2 testes -- deletar arquivos -- módulo e guardas dedicados somem
- [x] `engine.purity.test.ts` + `ui.norolls.test.ts` -- limpar menções -- isenções refletem os arquivos existentes
- [x] suite + tsc -- rodar -- tudo verde sem o probe
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- DW-120: referências órfãs (NFR device, DW-15, ledger) após remoção -- decisão futura sobre estratégia de medição

**Acceptance Criteria:**
- Given qualquer build (release ou dev, com ou sem env), when o app monta a tela de jogo, then nenhum frame callback de baseline existe e nenhuma linha de baseline é exibida
- Given `grep -r useFrameRateBaseline triade/src triade/App.tsx`, when executado, then zero ocorrências em código de produção
- Given a suite completa, when executada, then zero falhas (arquivos deletados não quebram outros testes)
- Given `devAutoDrive`, when em dev com env, then o auto-drive de gestos continua funcionando como antes

## Verification

**Commands:**
- `cd triade && grep -rn "useFrameRateBaseline\|FrameRateStats" src App.tsx || echo CLEAN` -- expected: CLEAN
- `cd triade && npm test 2>&1 | tail -n 8` -- expected: 0 fail
- `cd triade && npx tsc --noEmit` -- expected: zero erros

## Suggested Review Order

- Import, estado, chamada e readout removidos; auto-drive intacto
  [`App.tsx:6`](../../triade/App.tsx#L6)

- Flag do harness preservada para gestos
  [`App.tsx:116`](../../triade/App.tsx#L116)

- Efeito de bump deletado; auto-drive de gestos intocado
  [`App.tsx:1009`](../../triade/App.tsx#L1009)

- Isenção sem o arquivo removido
  [`engine.purity.test.ts:20`](../../triade/__tests__/engine/engine.purity.test.ts#L20)
