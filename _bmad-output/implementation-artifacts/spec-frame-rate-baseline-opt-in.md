---
title: 'Frame-rate baseline probe opt-in via env flag (off by default)'
type: 'feature'
created: '2026-09-08'
status: 'done'
baseline_commit: '55da6acec762c20e8671a78105284cd883d4cf21'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** O probe de baseline (`useFrameRateBaseline`) monta sempre em `AppContent` — registra frame callback no UI e exibe `baseline: …` / `recording…` na tela de jogo até em release, onde ninguém lê a medição.

**Approach:** Desligar por padrão com flag explícita: o hook ganha `enabled = false` e só registra o callback quando ligado; `App.tsx` liga apenas com `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` em dev e esconde a linha quando desligado.

## Boundaries & Constraints

**Always:** Hook sempre chamado incondicionalmente (regras dos hooks) com `enabled` como parâmetro, default `false`; desligado = zero trabalho no UI (callback nunca ativa) + retorno `null`; fórmula `computeFrameRateStats`, `WINDOW = 120` e semântica de `generation` intactas; protocolo manual P1-04 (dev + AUTO_DRIVE=1) continua medindo; ler `https://docs.expo.dev/versions/v57.0.0/` antes de escrever código (triade/AGENTS.md).

**Ask First:** Se o readout precisar continuar visível em release por algum motivo, HALT e pergunte antes de escondê-lo.

**Never:** Chamada condicional de hook; novo mecanismo de flag (reutilizar `devAutoDrive`); toggle em Configurações com persistência (fora do escopo — decisão explícita do usuário por flag via env); tocar `GameBoard.tsx`/feel; mudar a fórmula.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| DEFAULT_OFF | release ou dev sem env | hook retorna `null`, nenhum frame callback ativo, nenhuma linha de baseline na tela | N/A |
| OPT_IN | dev + `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` | comportamento atual: 120 frames → stats + linha `baseline: …` | N/A |
| TOGGLE_MID_RUN | `enabled` vira false no meio da janela | medição aborta, stats ficam `null`, sem publish tardio | N/A |
| GENERATION_WHEN_OFF | bump de generation com probe desligado | sem reset, sem `setStats`, sem trabalho | N/A |

</frozen-after-approval>

## Code Map

- `triade/src/render/useFrameRateBaseline.ts` -- ADD `enabled = false`: `useFrameCallback(onFrame, enabled)`, early-return no efeito de generation, retorno `null` quando desligado
- `triade/App.tsx` -- WIRE: `useFrameRateBaseline(baselineGeneration, devAutoDrive)`; readout só quando ligado; efeito de bump de generation com gate
- `triade/__tests__/render/useFrameRateBaseline.math.test.ts` -- UPDATE: guardas do default-off + autostart wiring
- `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts` -- UPDATE: guardas P0-03/P1-01/P1-03 para o novo wiring

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/render/useFrameRateBaseline.ts` -- adicionar `enabled = false`, autostart no `useFrameCallback`, gates -- probe desligado por padrão
- [x] `triade/App.tsx` -- ligar só via `devAutoDrive`, esconder readout quando off, gate no bump -- nenhuma linha de baseline para usuários
- [x] `triade/__tests__/render/*.test.ts` -- atualizar guardas (default-off, autostart, fronteira App) sem afrouxar cobertura -- testes acompanham o novo wiring
- [x] `triade/__tests__/render/*.test.ts` -- rodar suites -- sem regressão
- [x] `triade/src/render/useFrameRateBaseline.ts` -- pós-review (step-04 patch): epoch anti-stale-finish (`w.epoch` + early return em `finish`) -- publish tardio após abort eliminado

## Suggested Review Order

**Opt-in e fiação**

- Flag explícita liga o probe; resto nunca registra callback
  [`App.tsx:121`](../../triade/App.tsx#L121)

- Hook sempre chamado, flag como parâmetro default-off
  [`useFrameRateBaseline.ts:39`](../../triade/src/render/useFrameRateBaseline.ts#L39)

- Callback com autostart: zero trabalho no UI quando off
  [`useFrameRateBaseline.ts:111`](../../triade/src/render/useFrameRateBaseline.ts#L111)

- Linha de baseline só existe no modo harness
  [`App.tsx:1282`](../../triade/App.tsx#L1282)

**Abort e época**

- Transição liga/desliga invalida finish em voo
  [`useFrameRateBaseline.ts:57`](../../triade/src/render/useFrameRateBaseline.ts#L57)

- Finish tardio descartado por época ou geração
  [`useFrameRateBaseline.ts:80`](../../triade/src/render/useFrameRateBaseline.ts#L80)

- Ponte com tags gen+epoch
  [`useFrameRateBaseline.ts:105`](../../triade/src/render/useFrameRateBaseline.ts#L105)

**Testes**

- Guardas default-off, autostart e anti-stale
  [`useFrameRateBaseline.math.test.ts:93`](../../triade/__tests__/render/useFrameRateBaseline.math.test.ts#L93)

**Acceptance Criteria:**
- Given build release (ou dev sem env), when a tela de jogo monta, then nenhum frame callback do probe ativa e nenhuma linha de baseline é exibida
- Given dev com `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1`, when a tela de jogo monta, then a medição de 120 frames publica stats e a linha `baseline: …` aparece
- Given probe desligado, when `generation` muda, then nada acontece (sem reset, sem setStats)
- Given a fórmula e `WINDOW`, when os testes rodam, then continuam verdes com os novos guardas

## Verification

**Commands:**
- `cd triade && npm test -- __tests__/render/useFrameRateBaseline.math.test.ts` -- expected: todos verdes
- `cd triade && npx tsc --noEmit` -- expected: zero erros
