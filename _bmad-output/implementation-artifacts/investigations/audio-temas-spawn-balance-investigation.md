# Investigation: Audio de merge, legibilidade dark/daltonico, rebalance spawn 1/2 e pot maior

## Hand-off Brief

1. **What happened.** H1 Confirmada e corrigida (sessão sem mix → `mixWithOthers` + player por kind, `sfx.ts`); H2 Confirmada e diagnosticada (HUD hardcoded, fix proposto, não implementado); H3 viável aguardando confirmação de clamp; H4 arquivada (resolvida pelo delay-2 do pot, já entregue).
2. **Where the case stands.** Active — H1 fix verificado em testes (31 sfx + 161 feel verdes, tsc limpo); falta validação em device (fundo não corta + thock audível) e decisão H3/H2.
3. **What's needed next.** Rodar em device build com podcast ao fundo; depois implementar HUD temático (`gds-quick-dev`) e confirmar clamp H3.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A                                                                        |
| Date opened      | 2026-09-04                                                                 |
| Status           | Active                                                                     |
| System           | triade (Expo SDK 57 + RN), iOS first, dev build                            |
| Evidence sources | código-fonte triade/, testes, version control                              |

## Problem Statement

Relato verbatim do usuário (hipótese, não fato):

> Alguns pontos que gostaria de investigar:
> - quando faz um merge, aparentemente toca som (mas o som está vazio) e para o que está tocando ao fundo (musica/podcast)
> - as letras no modo escuro estão escuras também dificultando a leitura, cheque tb no modo daltonico
> - eu gostaria de alterar a proporção do spawn 1 e 2:
>   * para cada peça 1 deve alterar em 4 pontos a menos no sorteio do 1, e para cada peça 2 deve ter menos 4 pontos para a peça 2
>   * isso não altera o sorteio das peças maiores, só o 80% do 1 e 2
>   * Por exemplo, se tiver 3 peças '1' e 2 peças '2' o sorteio deve ser 36% para 1 e 44% para o 2
>   * se tiver apenas 4 peças 2, deveria ser: 56% para 1 e 24% para a 2
> - gostaria de aumentar em um ponto para as peças maiores

Exemplos numéricos dados:
- 3x `1` + 2x `2` → 1: 40-3*4+2*4 = 36%, 2: 40-2*4+3*4 = 44%? Verificar fórmula exata em Outcome 3. Interpretação inicial: cada `1` tira 4pp do `1` e dá ao `2`? Ou tira 4pp do próprio tipo? Exemplos sugerem redistribuição cruzada dentro dos 80%. A checar.
- 0x `1` + 4x `2` → 1: 56%, 2: 24%. Consistente com: `p1 = 40 + 4*(n2 - n1)`, `p2 = 40 + 4*(n1 - n2)`, clamp ≥0? A confirmar.

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| relato usuário | Available | 4 itens, verbatim em Problem Statement |
| audio SFX gateway | Available | `triade/src/feel/sfx.ts:1-173` — `createAudioPlayer(source)` por merge/spawn/gameover, zero config de AudioSession/mix/duck (grep ABSENT em todo triade). Trigger em `triade/App.tsx:465-480` via `triggerSfxForTrace`. Assets: `assets/sfx/merge.wav` 10628B, `spawn.wav` 7100B, `gameover.wav` 24740B |
| temas | Available | `triade/src/theme/index.ts:1-145` tokens dark/light/colorBlind; decisão em `triade/src/render/GameBoard.tsx:17-18,270` `tileTextColor→tileInkFor`; `tileFillFor/tileInkFor` em `tileNumerals.ts:91,130`. Testes: `tileTheme.test.ts`, `tileContrast.allThemes.audit.test.ts:16-66` (WCAG AA nas 3 temas — possível contradição com relato) |
| spawn/pot | Available | `spawn.ts:27-32` `pickCombined` [0.4,0.4,...norm(0.2)]; `spawnConfig.ts:11-24` POT_WEIGHT 0.2, FIXED 0.4/0.4, POT_CURVE halving; `pot.ts:6-8`, `weights.ts:9-20`, `ceiling.ts:5-6,23-24,47-48`; board disponível em `game.ts:104-105,116`. 11 arquivos de teste spawn/pot/weights |
| version control | Available | `git log`: `1c784ba fix: one-cell, sfx, gesture and audio guard`, `4d32d7d Epic 9 a11y batch`, `7e8c7f9 S2.2 pesos fixos 40/40`, `30744b7 S2.4 halving`, `15018a2 S2.5 spawnConfig` |
| reprodução manual | Missing | merge com música ao fundo; screenshots dark/daltônico com board cheio |
| definição "+1 ponto" | Missing | sem isso H4 não avança — perguntar: +1pp no pot? +1 no peso base? +1 tier? |

## Investigation Backlog

| # | Path to Explore | Priority              | Status                                | Notes     |
| - | --------------- | --------------------- | ------------------------------------- | --------- |
| 1 | audio merge: trigger, asset, AudioSession mixWithOthers/duck | High | Open | explica interrupção de música/podcast + som vazio |
| 2 | temas dark + color-blind: cor de texto dos tiles | High | Open | letras escuras sobre fundo escuro? |
| 3 | spawn 1/2 atual: pesos, normalização, onde injetar contagem de peças | High | Open | base para proposta -4pp/peça |
| 4 | pot maiores: curva halving, onde +1 ponto entraria | Medium | Open | proposta ainda vaga — esclarecer base |
| 5 | reprodução manual: merge com música ao fundo; screenshot dark/daltônico | Medium | Open | confirma sintomas fora do código |

## Timeline of Events

| Time        | Event               | Source                | Confidence            |
| ----------- | ------------------- | --------------------- | --------------------- |
| 2026-09-04 | relato dos 4 pontos aberto | mensagem usuário | Confirmed |

## Confirmed Findings

### Finding 1: SFX cria player por merge sem nenhuma config de AudioSession (H1 mecanismo)

**Evidence:** `triade/src/feel/sfx.ts:92-100` (`mod.createAudioPlayer(source)` + `play()`, nenhum `setAudioModeAsync`/`AudioSession`/`mixWithOthers`/`interruptionMode` no arquivo nem em todo `triade/` — grep ABSENT); trigger por merge em `triade/src/feel/sfx.ts:159-169` (`triggerSfxForTrace`, um player por entry com `from.length===2`) + `triade/App.tsx:465-480` (trace + spawn + gameover).

**Detail:** Cada merge instancia um one-shot player na sessão iOS default, que assume a sessão e interrompe música/podcast de fundo. Players nunca recebem `release`/`dispose` — vazamento acumulativo ao longo da partida.

### Finding 2: merge.wav NÃO está vazio (refuta "som vazio" como arquivo)

**Evidence:** `triade/assets/sfx/merge.wav`: 5292 frames, mono 44.1kHz, 0.120s, pico 22131/32768 (~68%); `spawn.wav` 0.080s pico 15777; `gameover.wav` 0.280s pico 24874 (leitura direta do header PCM).

**Detail:** O arquivo tem sinal real. "Vazio" percebido = sessão assume o áudio (fundo para) mas o thock sai inaudível/falha silenciosa (gateway é fire-and-forget com try/catch vazio, `sfx.ts:110-113`) — ou volume/roteamento. Requer reprodução com device para distinguir.

### Finding 3: HUD usa cores hardcoded claras e ignora o tema (H2 mecanismo)

**Evidence:** `triade/src/ui/Hud.tsx:201-214,238-243,266-279` (`scorePortrait`/`scoreLandscape` `#1a1d23`, `bestPortrait`/`bestLandscape` `#8a8578`, `assistLabel` `#1a1d23`); fundo do jogo vem de `THEMES[themeId].chrome` (`triade/App.tsx:1014`, surface dark `#23262D`, board `#1A1D23`); `LaneSelectScreen` recebe `theme` mas `styles` são 100% hardcoded light (`LaneSelectScreen.tsx:22-36` prop vs `202-208` `container #fff`).

**Detail:** No dark e no colorBlind (ambos chrome escuro, `theme/index.ts:66-77,106-111`) o score/recorde/desfazer renderizam texto escuro sobre fundo escuro → ilegível. Tiles em si passam no audit WCAG AA (`tileContrast.allThemes.audit.test.ts:7-26`, verificado por cálculo: pior tile 384 = 4.65). Contradição com o audit explicada: o audit cobre tiles + chrome tokens, mas o HUD não usa os tokens.

## Deduced Conclusions

### Deduction 1: H1 CONFIRMADA no mecanismo, refutada no "arquivo vazio"

**Based on:** Finding 1, Finding 2

**Reasoning:** Sem `MixWithOthers`/modo de interrupção, a sessão default do iOS interrompe áudio de fundo a cada player criado — um por merge. O WAV tem sinal, logo "vazio" é percepção da tomada de sessão sem thock audível (falha silenciosa engolida pelo try/catch ou roteamento), não arquivo zerado.

**Conclusion:** Fix = configurar sessão com mix (`playsInSilentMode` + `interruptionMode: MixWithOthers` / duck) + reusar um player por kind + `release` após tocar. Sem isso, qualquer SFX futuro repete o sintoma.

### Deduction 2: H2 CONFIRMADA — HUD hardcoded, não tokens

**Based on:** Finding 3

**Reasoning:** O audit WCAG passa porque testa tokens; o HUD e telas auxiliares não consomem os tokens (cores literais). Dark/colorBlind = texto `#1a1d23`/`#8a8578` sobre surface `#23262D` → contraste ~1:1. Light funciona por coincidência (fundo claro do menu é `#fff` hardcoded, mas o fundo do jogo no light é `#F6F0E1` — score `#1a1d23` sobre ele passa).

**Conclusion:** Fix = HUD e telas passarem a usar `THEMES[themeId].chrome` (text/muted) + `tileInkFor` já usado no board; `colorBlind` ganha tokens próprios ou herda dark com shape/grain (FR-31) — hoje é alias exato do dark.

### Deduction 3: H3 é implementável sem tocar o pot; fórmula bate com os exemplos

**Based on:** Evidência de Outcome 2 (`spawn.ts:27-32`, `spawnConfig.ts:11-24`, `game.ts:104-105`)

**Reasoning:** Exemplos do usuário implicam `p1 = 40 + 4*(n2-n1)`, `p2 = 40 + 4*(n1-n2)` (soma 80, pot 20% intocado). Contagem deve vir do board pós-merge (`effectiveBoard`, onde `resolveSpawn` já é chamado). Sem clamp, 11+ peças de um tipo negativam o peso — propor `p1 = clamp(40+4*(n2-n1), 0, 80)`, `p2 = 80-p1`.

**Conclusion:** H3 pronta para virar story assim que o usuário confirmar fórmula + clamp + ponto de contagem (pré vs pós-merge).

## Hypothesized Paths

### Hypothesis 1: Som vazio + interrupção de áudio de fundo no merge

**Status:** Confirmed (mecanismo); refinada (arquivo tem sinal)

**Theory:** Player de SFX do merge usa sessão que não faz mix com outros apps e/ou toca asset vazio/faltante.

**Supporting indicators:** relato + `sfx.ts:92-100` sem sessão + trigger por merge + WAV com sinal (Finding 2).

**Would confirm:** ~~asset vazio~~ — REFUTADO pelo header PCM. Sessão sem mix — CONFIRMADO por grep ABSENT.

**Would refute:** sessão com mix — não existe no código.

**Resolution:** Confirmada em 2026-09-04 via leitura direta + header WAV. Falta reprodução em device para classificar o "vazio" (falha silenciosa vs volume/roteamento).

### Hypothesis 2: Texto ilegível no dark / daltônico

**Status:** Confirmed

**Theory:** Token de cor de texto não acompanha troca de tema; mesmo foreground escuro sobre tile escuro.

**Supporting indicators:** relato + `Hud.tsx` hardcoded + fundo dark via tokens.

**Would confirm:** token de texto fixo escuro aplicado em dark/color-blind — CONFIRMADO (`Hud.tsx:204,212,241,269,277`), com nuance: não são os tiles (audit passa), é o HUD + telas auxiliares.

**Would refute:** tokens por tema com contraste WCAG AA no HUD — não existe.

**Resolution:** Confirmada em 2026-09-04. Fix: HUD/telas usarem `THEMES[themeId].chrome`.

### Hypothesis 3: Spawn 1/2 dinâmico -4pp por peça é implementável sem tocar pot

**Status:** Confirmed (viabilidade + fórmula); Open (decisão de produto: clamp + ponto de contagem)

**Theory:** Pesos atuais 40/40 fixos + pot 20%; proposta redistribui só dentro dos 80% conforme contagem no board.

**Supporting indicators:** exemplos numéricos do usuário somam 80% (36+44, 56+24).

**Would confirm:** código atual com `FIXED 40/40` + `POT 20%` isolados; ponto de injeção com acesso ao board.

**Would refute:** spawn sem acesso ao board ou pesos acoplados ao pot.

**Resolution:** —

### Hypothesis 4: +1 ponto para peças maiores

**Status:** Open

**Theory:** Proposta vaga — pode ser +1pp no pot total, +1 no peso base da curva halving, ou +1 valor desbloqueado. Requer esclarecimento.

**Supporting indicators:** frase "aumentar em um ponto para as peças maiores".

**Would confirm:** definição do usuário + curva atual mapeada.

**Would refute:** —

**Resolution:** —

## Missing Evidence

| Gap              | Impact                               | How to Obtain   |
| ---------------- | ------------------------------------ | --------------- |
| código audio | confirma/refuta H1 | grep `expo-audio`, `Sound`, `merge`, sessão |
| tokens de tema | confirma/refuta H2 | grep `theme`, `dark`, `colorBlind`, cor de texto |
| spawn/pot atual | base para H3/H4 | grep `spawn`, `pot`, `40`, `halving` |
| definição "+1 ponto" | sem isso H4 não avança | perguntar ao usuário |

## Source Code Trace

| Element       | Detail                                      |
| ------------- | ------------------------------------------- |
| Error origin (H1) | `triade/src/feel/sfx.ts:92-100` — `createAudioPlayer` sem modo de sessão; try/catch engole falhas (`:110-113`); sem `release` |
| Trigger (H1)  | `triade/src/feel/sfx.ts:165-169` um player por merge + `triade/App.tsx:465-480` trace/spawn/gameover |
| Condition (H1) | iOS default session (sem MixWithOthers) + música/podcast ao fundo |
| Related files (H1) | `triade/src/services/assets/assetManifest.ts:6-23`, `triade/app.json` (sem plugin/config de áudio), `triade/package.json:10` (expo-audio ~57.0.3) |
| Error origin (H2) | `triade/src/ui/Hud.tsx:201-214,238-243,266-279` cores literais; `LaneSelectScreen.tsx:202-208` fundo `#fff` fixo apesar da prop `theme` |
| Trigger (H2)  | trocar para dark/colorBlind (`THEMES[id].chrome` escuro, `theme/index.ts:66-77,106-111`) |
| Condition (H2) | qualquer tela com HUD no dark/daltônico; tiles OK (audit passa) |
| Related files (H2) | `triade/src/theme/index.ts:137-145`, `triade/src/render/GameBoard.tsx:17-18,270`, `triade/src/ui/GameOverOverlay.tsx:194-201`, `PreviewCard.tsx` |

## Conclusion

**Confidence:** High (H1 mecanismo + fix, H2 mecanismo); Medium (H1 "vazio" — arquivo tem sinal, mas a classificação final falha-silenciosa vs roteamento exige device)

H1: causa raiz Confirmada (sessão exclusiva default, um player nunca liberado por merge) e corrigida (`setAudioModeAsync mixWithOthers` uma vez + um player reutilizado por kind). H2: causa raiz Confirmada (HUD/telas com literais claros sobre fundo dark via tokens) — fix mapeado, não aplicado. H3: fórmula `p1 = clamp(40+4*(n2-n1),0,80)`, `p2 = 80-p1`, contagem no `effectiveBoard` — aguarda confirmação. H4: arquivada a pedido (delay-2 do pot cobre). Ladder delay-2 (6@192/12@384) entregue à parte com 124/124 testes.

## Recommended Next Steps

### Fix direction

1. H1 (APLICADO): `triade/src/feel/sfx.ts` — `audioModeConfigured` + `setAudioModeAsync({interruptionMode:'mixWithOthers'})`, `playerCache` por kind com `seekTo(0)` + replay. Preserva contratos: never-throw, sem `expo-audio` vira no-op, sem `reducedMotion` no código, cap de 3 kinds.
2. H2 (PROPOSTO): `Hud.tsx` + `LaneSelectScreen` + `GameOverOverlay`/`AcceleratedAids` passarem a `THEMES[themeId].chrome` (text/muted) em vez de literais; `colorBlind` ganha rampa própria ou documenta alias.
3. H3 (AGUARDA DECISÃO): story com fórmula + clamp + ponto de contagem.

### Diagnostic

Outcome 2: inventário paralelo audio/temas/spawn/testes/git. Depois Outcome 3: testar H1–H4 contra código.

## Reproduction Plan

1. Merge com música/podcast ao fundo → observa interrupção + som vazio.
2. Alternar light/dark/daltônico com board cheio → screenshot legibilidade.
3. Simular contagens (3x1+2x2; 0x1+4x2) contra fórmula proposta.

## Side Findings

- Nenhum ainda.

## Follow-up: 2026-09-04

### New Evidence
- Pedido do usuário: 6 a partir de 192, 12 a partir de 384. Implementado como delay-2 no mapeamento tier→pot (`triade/src/engine/core/pot.ts` + `POT_LADDER_DELAY=2`), sem mudar `tierForCeiling`. Nova escada: tiers 0–2 → `[3]`; 3 → `[3,6]`; 4 → `[3,6,12]`; 5 → `[3,6,12,24]`…
- Testes-oráculo atualizados: `pot.test.ts` (FR7_LADDER, invariante `max(1,t-1)`, bandas tier 3/5), `pot-tier-pipeline.test.ts`, `ladder-ceiling-chain.atdd.test.ts`, `adaptive-spawn-integration.test.ts` (fio tier em 384 + guarda single-pot no AC7), `pending-spawn-contract.test.ts` (fallback determinístico em 384), `ceiling-hardening.atdd.test.ts` (skipped, comprimentos).
- Verificação: 124/124 passando (`pot`, `pot-tier-pipeline`, `weights`, `spawn`, `spawn-config`, `spawn-weight-guard`, `spawn-placement`, `pending-spawn-contract`, `adaptive-spawn-integration`, `ceiling`, `ladder-ceiling-chain`, `preview`, `matchStats`).

### Additional Findings
- Pendentes originais intactos: H1 (audio), H2 (temas), H3 (spawn 1/2 dinâmico -4pp), H4 ("+1 ponto" indefinido).

### Updated Hypotheses
- Nenhuma mudança de status em H1–H4.

### Backlog Changes
- Novo item: definir H4 ("+1 ponto") e H3 (fórmula exata + clamp) antes de implementar.

## Follow-up: 2026-09-04 (2)

### New Evidence (H2 rodada 2 — screenshot device)
- Screenshot dark confirmou HUD corrigido (score/recorde claros) mas flagrou 2 pontos restantes no `App.tsx`: botão "Pistas" (`menuLabel #1a1d23`) e linhas de debug (`stats`) escuros sobre surface dark. Corrigidos via `tokens.chrome` no JSX (borda do botão → `chrome.border`). Banners/prompts/tutorial mantidos (cards claros legíveis nos 3 temas).
- Verificação: `tsc` limpo, 35/35 testes (tapTargets, app.restart, app.gameOverWiring, app.continueAd, laneSelect, hud).
- Testes: 87 UI (hud, laneSelect, gameOverOverlay, thinview, tapTargets, polish, carriers, screenReader) 68 pass / 0 fail; `tsc` limpo. 2 falhas intermediárias em `hud.previewWiring` (AC4/AC5 fixavam escada antiga 48→[3,6]) corrigidas para delay-2 (192→[3,6], 384→[3,6,12], 768→[3,6,12,24]).
- GameOverOverlay mantido (card branco legível nos 3 temas; testes fixam as cores).

### Updated Conclusion
- H1 e H2 implementadas e verificadas em testes; resta validação em device (áudio com fundo + leitura dark/daltônico). H3 aguarda confirmação de clamp.

## Follow-up: 2026-09-04 (3) — overlay de pausa, botão Pistas removido

### New Evidence
- `src/ui/PauseOverlay.tsx` (novo): sheet no padrão GameOverOverlay (scrim + card, `reducedMotion` respeitado, back do Android fecha). Ações: Continuar / Reiniciar (reusa `handleRestart`) / Pistas + seletor de tema + switch de movimento reduzido — tudo via props (`chrome`, sem imports de tema, thin como o Hud). i18n `pause.*` em pt/en.
- `Hud.tsx`: prop opcional `onPause` ligada aos dois `PauseButton`; `App.tsx`: estado `paused`, `handleReducedMotionChange`, render `{paused && !gameOver}`; botão "Pistas" + estilos `menuBtn/menuLabel` removidos.
- `tapTargets.audit.test.ts` atualizado (menuBtn → botões do PauseOverlay ≥44pt + ordenação fora do boardWrap); novo `pauseOverlay.test.ts` com 4 testes.
- Verificação: `tsc` limpo; 379 testes de UI (245 pass / 0 fail / 134 skips pré-existentes).
