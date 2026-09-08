---
title: 'Fix useFrameRateBaseline Worklets crash (shared-value worklet + runOnJS bridge)'
type: 'bugfix'
created: '2026-09-08'
status: 'done'
baseline_commit: '6bb4d4bec0800a6f2542912ac4398f2b4bc60b8a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `useFrameRateBaseline` registra um `useCallback` JS puro no `useFrameCallback`, que o runtime Worklets serializa como Remote Function — o app crasha no primeiro frame com `Tried to synchronously call a Remote Function`.

**Approach:** Reescrever o hook com acumuladores em `useSharedValue` e callback marcado `'worklet'`, publicando o resultado via ponte `runOnJS` que reutiliza o `computeFrameRateStats` exportado; atualizar os testes-guardas de source-shape para o novo wiring.

## Boundaries & Constraints

**Always:** `const WINDOW = 120` congelado; `computeFrameRateStats` segue exportado com fórmula byte-idêntica (sorted / floor(n*0.99) / avg com clamp 0.001); semântica do reset por `generation` preservada (limpa samples/count/done + `setStats(null)`); fronteira `App.tsx` intocada (consome `useFrameRateBaseline(baselineGeneration)`, sem matemática duplicada); zero `console.*` no arquivo do hook; ler `https://docs.expo.dev/versions/v57.0.0/` antes de escrever código (triade/AGENTS.md).

**Ask First:** Se array em SharedValue se mostrar inviável (serialização/perda), HALT e proponha driver alternativo (RAF no JS) antes de prosseguir.

**Never:** Duplicar a fórmula fps/p99 no worklet nem em `App.tsx`; tocar `GameBoard.tsx`/feel; mudar a fórmula; adicionar log no hot path; gatear o probe só para `__DEV__`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | mount, 120 frames com deltas 16.667ms | `setStats({fps≈60, frames:119, p99Ms≈16.67})`, sem crash | N/A |
| EMPTY_WINDOW | 120 callbacks sem samples (time base degenerada) | stats null, janela reseta (samples/last/count) e tenta de novo, nunca trava `done` com null | N/A |
| GENERATION_RESET | `generation` muda mid-window | samples/count/done limpos, `setStats(null)`, re-mede do zero | N/A |
| RERENDER_CHURN | re-renders durante a janela | identidade do frame callback estável, time base não reseta | N/A |

</frozen-after-approval>

## Code Map

- `triade/src/render/useFrameRateBaseline.ts` -- REWRITE: acumuladores para `useSharedValue`, `onFrame` workletizado, bridge `runOnJS` no fechamento da janela
- `triade/App.tsx` -- UNTOUCHED BOUNDARY: apenas verificar que o consumo não muda
- `triade/__tests__/render/useFrameRateBaseline.math.test.ts` -- UPDATE: guardas de wiring para o novo padrão (shared-value/worklet), matemática local intocada
- `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts` -- UPDATE: mesmos guardas (P0-02/P0-03/P1-03) para o novo padrão
- `triade/node_modules/react-native-reanimated/src/frameCallback/*` -- READ-ONLY: evidência do mecanismo (já lida na investigação)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/render/useFrameRateBaseline.ts` -- reescrever com `useSharedValue` + callback `'worklet'` + `runOnJS(finish)` reutilizando `computeFrameRateStats` -- elimina o Remote Function do UI runtime
- [x] `triade/__tests__/render/useFrameRateBaseline.math.test.ts` + `frame-rate-baseline-measure.atdd.test.ts` -- atualizar guardas `useCallback(`/`count.current`/`durations.current` para o novo wiring sem afrouxar cobertura (WINDOW, null-check, reset, identidade estável, sem `console.`) -- testes travavam o padrão com bug
- [x] `triade/__tests__/render/useFrameRateBaseline.math.test.ts` -- rodar suite de math + ATDD -- sem regressão na fórmula documentada
- [x] `triade/src/render/useFrameRateBaseline.ts` -- pós-review (step-04 patches): gen tag anti-stale-finish (`w.gen` + early return em `finish`), removida leitura-escrita redundante -- corrida generation-bump × runOnJS em voo eliminada
- [x] `triade/__tests__/render/useFrameRateBaseline.math.test.ts` -- pós-review: guardas de call-site (`win.value = freshWindow(`) + ponte com gen tag -- cobertura sem falsa confiança
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- DW-119: patologia de time-base (delta negativo/zero, outlier de suspensão) diferida -- pré-existente, fora do escopo

**Acceptance Criteria:**
- Given o hook montado, when o primeiro frame roda no UI runtime, then nenhum erro Worklets é lançado
- Given 119 samples de 16.667ms, when a janela fecha, then `fps` em 59.9..60.1, `frames = 119`, `p99Ms` em 16.66..16.68
- Given janela vazia, when o contador atinge WINDOW, then stats ficam null e a janela reseta sem travar
- Given `generation` muda, when o efeito roda, then samples/count/done limpam e `setStats(null)` é chamado

## Spec Change Log

## Verification

**Commands:**
- `cd triade && npm test -- __tests__/render/useFrameRateBaseline.math.test.ts` -- expected: todos os testes verdes
- `cd triade && npm test -- __tests__/render/frame-rate-baseline-measure.atdd.test.ts` -- expected: scaffolds ativos verdes, skips intactos
- `cd triade && npx tsc --noEmit` -- expected: zero erros de tipo no hook reescrito

## Suggested Review Order

**Causa raiz e ponte UI→JS**

- Callback workletizado que elimina o Remote Function do crash
  [`useFrameRateBaseline.ts:72`](../../triade/src/render/useFrameRateBaseline.ts#L72)

- Ponte runOnJS com gen tag contra finish tardio
  [`useFrameRateBaseline.ts:88`](../../triade/src/render/useFrameRateBaseline.ts#L88)

- Guarda anti-stale que protege a janela nova
  [`useFrameRateBaseline.ts:62`](../../triade/src/render/useFrameRateBaseline.ts#L62)

- Matemática pura intacta e single-sourced
  [`useFrameRateBaseline.ts:13`](../../triade/src/render/useFrameRateBaseline.ts#L13)

**Estado e reset**

- Estado da janela versionado por geração
  [`useFrameRateBaseline.ts:26`](../../triade/src/render/useFrameRateBaseline.ts#L26)

- Reset por generation preservado (DW-32 AC-5)
  [`useFrameRateBaseline.ts:50`](../../triade/src/render/useFrameRateBaseline.ts#L50)

**Testes**

- Guarda de regressão do crash + call-site do reset
  [`useFrameRateBaseline.math.test.ts:80`](../../triade/__tests__/render/useFrameRateBaseline.math.test.ts#L80)

- Guardas ATDD atualizados para o novo wiring
  [`frame-rate-baseline-measure.atdd.test.ts:89`](../../triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts#L89)
