# Investigation: Worklets Remote Function called synchronously on UI Runtime

## Hand-off Brief

1. **What happened.** App crashes on boot/frame-loop with `[Worklets] Tried to synchronously call a Remote Function` (Confirmed from user stack trace).
2. **Where the case stands.** Outcome 1 — stronghold established in `FrameCallbackRegistryUI.ts:60` + `remoteFunctionUnpacker.native.ts:13`; case file initialized; evidence perimeter not yet mapped.
3. **What's needed next.** Autorização para mapear perímetro (Outcome 2): inventariar `triade/src` em busca de `useFrameCallback` / worklets que chamam JS-fn no UI runtime.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A                                                                        |
| Date opened      | 2026-09-08                                                                 |
| Status           | Active                                                                     |
| System           | darwin, triade/ RN 0.86 + Reanimated 4 + Worklets, Expo SDK 57 dev build   |
| Evidence sources | user stack trace, triade/src code, version control, node_modules refs      |

## Problem Statement

Uncaught Error [Worklets] Tried to synchronously call a Remote Function. Called "anonymous" on the UI Runtime. See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-remote-function for more details. Source: triade/node_modules/react-native-worklets/src/memory/remoteFunctionUnpacker.native.ts (13:21). Call Stack: [UI] installRemoteFunctionUnpacker … → [UI] anonymous (FrameCallbackRegistryUI.ts:60) → [UI] loop (FrameCallbackRegistryUI.ts:51) → executeQueue/flushQueue/nativeFlushQueue (requestAnimationFrame.ts).

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| user stack trace | Available | frames citam FrameCallbackRegistryUI + remoteFunctionUnpacker; erro é no UI Runtime, chamada síncrona a Remote Fn |
| triade/src worklets / useFrameCallback | Available | único `useFrameCallback` no src: `triade/src/render/useFrameRateBaseline.ts:71`; 9 ocorrências `runOnJS/useAnimated*` em `GameBoard.tsx` (uso correto) |
| node_modules worklets/reanimated source | Available | `remoteFunctionUnpacker.native.ts:1-23`, `FrameCallbackRegistryUI.ts:40-92`, `FrameCallbackRegistryJS.ts:14-27`, `hook/useFrameCallback.ts:33-63` lidos |
| git log recent (feel/render) | Available | HEAD `c1b290e` sweep DW-16/DW-32; `2472fa3 feat(frame-rate): restartable 120-frame baseline + __DEV__ auto-drive (DW-32 AC-5)` é o commit que introduziu/ampliou o hook |
| project-context.md rules | Available | feel é worklet imperativo fino; REGRA DURA: worklets nunca logam em release; frame math em funções puras |
| versões (package.json) | Available | RN 0.86.2, Reanimated 4.5.1, Worklets 0.10.1, Expo ~57.0.11, React 19.2.3 |

## Investigation Backlog

| # | Path to Explore | Priority              | Status                                | Notes     |
| - | --------------- | --------------------- | ------------------------------------- | --------- |
| 1 | inventariar useFrameCallback / useAnimatedReaction / runOnUI em triade/src | High | Done | único caller: `useFrameRateBaseline.ts:71`; resto é `GameBoard.tsx` (correto) |
| 2 | ler FrameCallbackRegistryUI.ts:40-70 + remoteFunctionUnpacker.native.ts:1-30 | High | Done | mecanismo confirmado (ver Finding 2) |
| 3 | git log --oneline -15 em triade/src/feel + render | Medium | Done | `2472fa3` introduziu baseline restartável DW-32 AC-5 |
| 4 | checar console.log / closures não-workletizadas no hot path | Medium | Done | `onFrame` é `useCallback` JS puro sem `'worklet'`; captura refs + `computeFrameRateStats` + `setStats` |

## Timeline of Events

| Time        | Event               | Source                | Confidence            |
| ----------- | ------------------- | --------------------- | --------------------- |
| 2026-09-08 | user reporta crash com stack Worklets Remote Function | user message | Confirmed |

## Confirmed Findings

### Finding 1: Crash é no UI Runtime, em frame callback

**Evidence:** user stack trace — `FrameCallbackRegistryUI.ts:60`, `requestAnimationFrame.ts:26,69,61`

**Detail:** O loop de frame (RAF UI) executa um callback que tenta chamar sincronicamente uma Remote Function (JS fn vista do UI). Worklets proíbe isso; exige `runOnJS` (async) ou workletizar a fn.

### Finding 2: Único `useFrameCallback` no src passa função JS pura para o UI

**Evidence:** `triade/src/render/useFrameRateBaseline.ts:48-71` (`onFrame` via `useCallback`, sem `'worklet'`); `triade/node_modules/react-native-reanimated/src/frameCallback/FrameCallbackRegistryJS.ts:22-24` (`scheduleOnUI(() => registerFrameCallback(callback, ...))` captura `callback`); `triade/node_modules/react-native-worklets/src/memory/remoteFunctionUnpacker.native.ts:12-14` (guard que lança o erro exato)

**Detail:** `onFrame` captura `done/durations/last/count` (`useRef`), `computeFrameRateStats` (JS pura, `:13-24`) e `setStats` (React setter). Como não é worklet, o Babel Worklets o serializa como Remote Function. No primeiro frame, `FrameCallbackRegistryUI.ts:60-64` invoca `callbackDetails.callback({...})` no UI → o unpacker resolve para o guard `remoteFunctionGuard` → throw `Called "anonymous"` (arrow sem nome). Determinístico: quebra no primeiro frame após montar o hook, não após 120 frames.

### Finding 3: Mesmo com `'worklet'`, o corpo toca estado JS

**Evidence:** `triade/src/render/useFrameRateBaseline.ts:49-67` (`done.current`, `durations.current.push`, `computeFrameRateStats(samples)`, `runOnJS(setStats)(result)`)

**Detail:** `useRef[].current` e `computeFrameRateStats` são closure JS; acessá-los do UI também resolve como Remote. O único toque JS legal ali é o `runOnJS(setStats)(result)` da `:67`. Acumulação por frame precisa viver em `useSharedValue` (UI) e o cálculo final ser workletizado ou despachado via `runOnJS`.

## Deduced Conclusions

### Deduction 1: `useFrameRateBaseline` é a causa raiz do crash

**Based on:** Finding 1 + Finding 2

**Reasoning:** O stack aponta invocação de callback de frame no UI; o único registrador de frame callback no `src` é `useFrameCallback(onFrame)` com `onFrame` JS-remoto; o guard lança exatamente essa mensagem com `Called "anonymous"` para arrow sem nome.

**Conclusion:** Remover ou corrigir esse hook elimina o crash. `GameBoard.tsx:174` (`runOnJS(onVanish)(id)` dentro de animação) segue o padrão correto e não é suspeito.

## Hypothesized Paths

### Hypothesis 1: Frame callback chama closure JS (setState, log, helper) direto no UI

**Status:** Confirmed

**Theory:** Algum `useFrameCallback` / `useAnimatedStyle` / loop de feel chama função JS (ex.: `console.log`, `setState`, helper de `game/` ou `feel/`) de forma síncrona dentro do worklet UI.

**Supporting indicators:** Stack mostra `anonymous` dentro de `FrameCallbackRegistryUI`; padrão clássico desse erro segundo docs SWMansion linkada no erro.

**Would confirm:** Achar em `triade/src` um `useFrameCallback(() => { ...jsFn() })` sem `'worklet'` / sem `runOnJS`.

**Would refute:** Todos os frame callbacks só chamam worklets puros + `runOnJS` para JS.

**Resolution:** Confirmada por Finding 2 — `useFrameRateBaseline.ts:48-71` é exatamente esse caso: `useCallback` sem `'worklet'` registrado em `useFrameCallback`.

## Missing Evidence

| Gap              | Impact                               | How to Obtain   |
| ---------------- | ------------------------------------ | --------------- |
| código do callback que dispara o erro | confirma H1 e aponta arquivo:linha | grep useFrameCallback + leitura dos callers |
| versão exata worklets/reanimated | descarta incompatibilidade | package.json + yarn.lock |
| repro (quando quebra: boot, gesto, game-over?) | estreita timeline | perguntar ao Eduardo + tentar repro |

## Source Code Trace

| Element       | Detail                                      |
| ------------- | ------------------------------------------- |
| Error origin  | triade/node_modules/react-native-worklets/src/memory/remoteFunctionUnpacker.native.ts:13 (`remoteFunctionGuard` throw) |
| Trigger       | primeiro frame após montar `useFrameRateBaseline`: `FrameCallbackRegistryUI.ts:60` invoca `callbackDetails.callback()` no UI Runtime |
| Condition     | `onFrame` registrado via `useFrameCallback(onFrame)` (`useFrameRateBaseline.ts:71`) é JS-remoto: `useCallback` sem `'worklet'` (`:48`), captura `useRef` + `computeFrameRateStats` + `setStats` (`:49-67`) |
| Related files | `triade/src/render/useFrameRateBaseline.ts:1-74` (culpado); `FrameCallbackRegistryJS.ts:14-27`, `hook/useFrameCallback.ts:33-63` (transporte); `triade/src/render/GameBoard.tsx:174` (uso correto de `runOnJS`, não suspeito) |

## Conclusion

**Confidence:** High

Causa raiz Confirmada: `useFrameRateBaseline.ts:48-71` registra função JS como frame callback UI. O guard Worklets lança deterministicamente no primeiro frame (`Called "anonymous"` = arrow do `useCallback`). Correção exige reescrever o hook com `useSharedValue` + callback workletizado e ponte `runOnJS` só no fechamento da janela de 120 frames (ou remover o hook / desativar com `setActive(false)` como mitigação imediata).

## Recommended Next Steps

### Fix direction

Reescrever `useFrameRateBaseline`: (a) acumuladores (`durations`, `last`, `count`, `done`, `generation`) em `useSharedValue`; (b) `onFrame` com `'worklet'` sem capturar `useRef`/`useState`/helpers JS — inline do cálculo de fps/p99 ou helper marcado `'worklet'`; (c) manter `runOnJS(setStats)(result)` só no fechamento da janela; (d) respeitar regra do projeto: sem log em worklet, sem alocação no hot path. Alternativa imediata: `const frame = useFrameCallback(...)` + `frame.setActive(false)` / não montar o hook até o fix.

### Diagnostic

Já confirmado por código. Se quiser prova de runtime: monte a tela que usa o hook com o callback atual → crash no primeiro frame; com `setActive(false)` → sem crash.

## Reproduction Plan

Setup: dev build (`triade/`). Trigger: a definir (boot vs gesto vs game-over). Expected: erro some após workletizar fn ou mover chamada JS para `runOnJS`.

## Side Findings

- Nenhum ainda.
