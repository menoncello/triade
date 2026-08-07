---
title: 'Game Brainstorming Session'
date: '2026-08-06'
author: 'Eduardo'
version: '1.0'
stepsCompleted: [1, 2, 3, 4]
status: 'in-progress'
---

# Game Brainstorming Session

## Session Info

- **Date:** 2026-08-06
- **Facilitator:** Game Designer Agent
- **Participant:** Eduardo

---

_Ideas will be captured as we progress through the session._

---

## Brainstorming Approach

**Selected Mode:** Guided

**Techniques Available (Geração):**
0. **Plataforma** — Capacitor/WebView vs. nativo (custo de todas as ideias)
1. **Monetização — PRIORIDADE ALTA** — modelo: pago, anúncio, IAP; decide o que qualquer ideia pode custar
2. **Core Loop Design** — slide → merge → spawn
3. **Game Feel Playground** — juiciness, feedback, som de merge
4. **Accessibility Layers** — tap targets (44px), leitor de tela, inputs
5. **Player Fantasy Mining** — competência e satisfação
6. **MDA Framework** — mecânica ↔ dinâmica ↔ estética
7. **Design de Áudio como Identidade** — som próprio (compliance + identidade + feel)
8. **Reward Schedule Architecture** — score/best, marcos, retenção
9. **Progression Curve Sculpting** — dificuldade e tutorial
10. **Failure State Design** — game over, aprendizado, restart
11. **Identidade e Diferenciação** — o que NÃO copiar do Threes
12. **Funil de Retenção / Loja** — onboarding, primeira sessão, crash-free
13. **What If Scenarios** — ideias radicais de evolução

**Lentes de Avaliação (filtram cada ideia):**
- **L1 Monetização** — o que a ideia custa e o que ela pode pagar
- **L2 Mercado** — "quem baixa ISSO e não os 500 clones?"
- **L3 Observabilidade** — dá para medir impacto (telemetria/crash/sessão)?
- **L4 Review da Apple** — compliance: identidade própria, acessibilidade, privacy policy

**Focus Areas:**
- Melhorias de gameplay, experiência e retenção
- Production readiness para publicação na App Store
- Identidade própria vs. clone do Threes (IP/storefront risk)
- Decisão de plataforma (wrapper vs. nativo)
- Monetização com prioridade alta

---

## Ideas Generated

### Decisão: Plataforma — React Native + Skia

**Técnica:** 0 — Plataforma
**Descrição:** 3-clone migra de web pura para React Native + @shopify/react-native-skia. `js/game.js` é framework-free e porta quase intacto; os 26 testes em Node continuam passando; a UI (`js/ui.js`) é reescrita em componentes RN + Skia para sprites/partículas/animações.
**Potencial:** Único caminho de qualidade média-alta que preserva a lógica e os testes existentes. Custo de reescrita limitado à camada de UI.
**Build-on:** testar primeiro um spike de porta do `game.js` + render de 1 board em Skia.

### Decisão: Monetização — Grátis + IAP de Conveniência

**Técnica:** 1 — Monetização (PRIORIDADE ALTA)
**Descrição:** Jogo gratuito; receita via IAP de conveniência (desfazer, sem anúncios, dica) em vez de cosmético. Cosméticos ficam como vitrine de identidade, não como motor de receita.
**Potencial:** Padrão comprovado de receita em puzzle casual; compra acontece no momento da dor.
**Build-on:** decisão de design: "undo/dica pagos" afetam a integridade de score/leaderboard (pay-to-win).

### Idea F–I — Suíte de Game Feel (todas aprovadas)

_Core Loop_: cada merge de tile ≥3 dispara feedback em camadas que escalam com o valor da peça; merges grandes (≥96) acumulam intensidade.
_Novelty_: "linguagem tátil" de valores — algo que nem Threes nem clones têm.

**Componentes:**
- **F — Haptic Punch escalado:** intensidade de vibração sobe com o valor (3 = leve, 6 = médio, 12+ = impacto pesado). Haptics nativos do RN (iOS/Android).
- **G — Punch visual no merge:** tile cresce além do tamanho (overshoot) e estala de volta, com flash de cor e partículas no ponto de merge; splash escala com o valor.
- **H — Screen shake direcional:** sutil nos merges médios, mais forte nos grandes; tabuleiro "treme" com o peso. [L4: reduzir ao mínimo e checar sensibilidade a movimento — acessibilidade.]
- **I — Bullet time no merge máximo:** maior merge da partida desacelera ~200ms, pisca e marca o momento — o jogo "reconhece" o feito.
- **Som + animação completos no produto** (jogador padrão), validados externamente (Nota de Autoria).

### Idea D+B — "Duas Pistas" (Modo Limpo + Modo Acelerado)

_Core Loop_: o jogador escolhe a pista — Limpa (sem undo/hint/ads, score no leaderboard Limpo) ou Acelerada (assistência disponível, score no leaderboard Assistido). Na pista Acelerada, o undo é **1 grátis por partida via ad recompensado** ou **3 via IAP**; ads só entre partidas, nunca durante.
_Novelty_: integridade de score vira feature ("Modo Limpo") e o anúncio vira escolha do jogador. Funil de receita em 3 camadas: (1) pista limpa grátis atrai o achiever, (2) ad recompensado gera receita sem compra, (3) IAP Sem Ads + Desfazer Ilimitado corta atrito.

### Idea J — Acessibilidade Total (padrão de produto)

_Core Loop_: o jogo é jogável por qualquer pessoa — inputs, leitura de tela, movimento e visão — sem perda de desafio.
_Novelty_: acessibilidade como feature de loja, não custo (o review da Apple premia).

**Componentes (Eduardo confirmou todos):**
- **Tap targets ≥ 44×44pt** em todos os elementos tocáveis (100% acessível).
- **Leitor de tela (VoiceOver/TalkBack):** anúncio de estado — tile e posição, game over, pontuação.
- **Reduced Motion:** modo que amacia/desliga a Suíte F–I (shake H e bullet time I) — requisito iOS.
- **Contraste WCAG AA** e merges comunicados por forma além de cor (daltonismo).
- **Temas escuro e claro** (novo, adicionado por Eduardo).
- **Temas para daltônicos** (paletas que distinguem tiles sem depender de cor — adicionado por Eduardo). **Decisão:** temas de acessibilidade (claro/escuro/daltônico) são **gratuitos**; cosméticos pagos são camada futura separada, com contraste sempre verificado.

### Decisão — What If (1–4 aprovados, 5 → v2)

**Técnica:** 13 — What If Scenarios
**Componentes aprovados:**
1. **Tamanhos de tabuleiro:** além do 4×4 atual, modos **3×3** (partida rápida) e **5×5/6×6** (partida longa). Diferencia na loja e dá opção de sessão.
2. **Personalidade dos tiles:** cada degrau ganha nome/glifo ("48 = Basalto", "96 = Cobre", "192 = Esmeralda"...) — o Maestro coleciona pedras. Casa com o Mineral Quente (V2).
3. **Puzzle do Dia (não-competitivo):** tabuleiro pré-arranjado para resolver em N movimentos, sem leaderboard — pensamento puro.
4. **"Túmulo de Pedras" no game over:** as pedras máximas da partida ficam expostas como relíquias na tela de derrota — o fracasso vira coleção.
5. **"Desenterrar" um tile (uma vez por partida):** **[v2 — out of MVP]** — Eduardo vai pensar no futuro.

### Decisão — Telemetria: Firebase Analytics + Crashlytics

**Técnica:** 12 — Funil de Retenção / Loja
**Descrição:** base de observabilidade = **Firebase Analytics + Crashlytics** via `react-native-firebase`. Escolhido pelo funil (north star de retenção) além de crash.
**North star de funil:** primeiro merge em ~20s; primeiro game over em ≤3min na primeira sessão.
**Checklist loja (pendente de produção):** ícone (V2), screenshots com identidade Mineral Quente (nunca parecer Threes), descrição, keywords, age rating, declaração de IAP/ads.
**Privacidade:** Firebase = consent mode (GDPR) + prompt ATT no iOS se usar atribuição de ads. Privacy policy obrigatória (ads + analytics + IAP). `[NOTE FOR PM]` — URL pública da policy antes do envio ao review.

### Decisão — Sistema Visual: "Mineral Quente" (V2)

**Técnica:** 11 — Identidade e Diferenciação
**Descrição:** identidade visual **"Mineral Quente"** — board ardósia escura, tiles **âmbar → cobre → esmeralda** conforme o valor sobe, cantos chanfrados tipo pedra lapidada, textura de grão sutil, sem serifa médio-pesada com números grandes. Ícone: um tile mineral quente sobre a ardósia. Casa com o áudio Cálido/Orgânico (T7). Distinto dos clones pastel de 2048/Threes.

### Decisão — Nome: "Tríade" (candidato)

**Técnica:** 11 — Identidade e Diferenciação
**Descrição:** "3-clone" era nome temporário. Candidato escolhido: **"Tríade"** — carrega o 3 sem invadir a marca Threes, guarda a regra 1+2, som de produto real. **App Store (verificado):** nenhum jogo de puzzle/tile usa "Tríade"; há apps de utilidades/finanças/contabilidade com o nome (busca pode colidir) → usar subtítulo para posicionar: **"Tríade: Merge Puzzle"**.
**Riscos:** marca registrada brasileira de empresas com "Triade" (risco baixo para jogo, existente); confirmação final só no App Store Connect (conta de dev US$99/ano). `[NOTE FOR PM]` — verificar registro de marca e disponibilidade no Connect antes de investir.

### Decisão — Suíte de Fracasso (1–4 aprovadas)

**Técnica:** 10 — Failure State Design
**Componentes:**
- **Estatísticas da partida no game over:** score + max tile + nº de merges + maior sequência. Perder vira informação ("faltou pouco para o 96"), alimenta o Maestro.
- **Reinício em 1 toque** (já existe — manter): o "só mais uma" mora aqui.
- **Morte como momento de monetização (pista Acelerada):** "continuar" via ad recompensado (1 uso) ou IAP. Na pista Limpa, sem oferta — pureza do leaderboard preservada.
- **Drama da morte:** fade suave no fim (não abrupto); último move sempre mostrado; mesmo capricho visual do merge grande.
- **Overlay:** mostrar tudo de imediato, sem espera forçada.

### Decisão — Curva de Progressão e Tutorial

**Técnica:** 9 — Progression Curve Sculpting
**Descrição:**
- **Tutorial em 3 movimentos guiados,** começando pela regra **1+2** (a contraintuitiva — o instinto é juntar iguais), depois o movimento de **1 célula** (o mais diferente do 2048). Aprende jogando, sem parede de texto.
- **Pulável** — quem já conhece o gênero entra direto.
- Pista Limpa: só tutorial mínimo. Pista Acelerada (Iniciante): ajudas contextuais de primeira sessão.
- **Onboarding de identidade:** tela curta de tom ("controle sobre o caos"), ~2s, pulável.
- **Dificuldade:** curva de entrada suave; late game resolvido pelo Spawn Adaptativo (E).

### Decisão — Suíte de Recompensas (1–4 aprovadas)

**Técnica:** 8 — Reward Schedule Architecture
**Componentes:**
- **Celebração de marco por degrau:** cruzar um degrau do spawn (48, 96, 192...) dispara um momento de celebração — *evento*, não indicador fixo (fantasia do Maestro preservada). Sincroniza com o Bullet time (I).
- **Celebração de novo recorde:** novo best = momento especial (flash, som, haptic) — coroa o "run-up" de maior tensão.
- **Desafio diário:** seed fixo por dia (mesma sequência para todos), placar próprio. Hook de retorno diário. [Nota: seed conhecido = otimizável; placar separado mitiga.]
- **Ritmo de score pós-inflação:** com o Spawn Adaptativo, marcos de recorde precisam de pacing para não banar a recompensa (progresso fica mais raro conforme o teto sobe, não mais comum).

### Decisão — Identidade de Áudio: Cálido/Orgânico

**Técnica:** 7 — Design de Áudio como Identidade
**Descrição:** assinatura sonora cálida/orgânica (madeira, texturas suaves, "thock" macio). Timbre próprio — NÃO copiar o som do Threes (L4 compliance). O som **escala com o valor do tile**, espelhando o haptic F (som + vibração acoplados). Validação com jogadores externos (autor é som-off). [ASSUMPTION]

### Decisão — MDA Alinhado (Maestro do Caos)

**Técnica:** 6 — MDA Framework
**Resultado:** Mechanics (spawn adaptativo E + suíte F–I + undo/dica na pista acelerada) → Dynamics (teto cresce com maestria, tensão sobe, assistência alivia para aprendizado) → Aesthetics (controle sobre o caos + satisfação do merge grande). Alinhado — o feedback de maestria (F–I) é o que reconcilia tensão crescente com a fantasia de controle. **Confirmado por Eduardo.**

### Decisão — Fantasia Central: O Maestro do Caos

**Técnica:** 5 — Player Fantasy Mining
**Descrição:** o jogador vive a fantasia de dominar o tabuleiro — mantém tiles grandes vivos, antecipa merges, controla o caos. É o tom da identidade do jogo.
**Fortalecida por:** Spawn Adaptativo (E) — "o jogo subiu porque fui bem" — e Bullet time (I) — o jogo celebra a maestria.
**Pergunta aberta:** quais sinais visuais/HUD reforçam "você está no controle" momento a momento? (ex.: indicador de teto atual, streak de merges, aviso de "travado".)

**Resolução (Eduardo):** NÃO mostrar indicador de teto nem aviso de travamento no jogo normal — o board limpo carrega a fantasia. Tais ajudas (indicador de teto, aviso de travamento) só fazem sentido como **nível "Iniciante"** — para quem está aprendendo. **Resolvido:** o nível Iniciante **é** a Pista Acelerada (mesmo lugar, nome amigável).

### Idea E — Spawn Adaptativo ao Teto da Mesa

_Core Loop_: o peso do spawn responde ao maior tile no tabuleiro — teto alto aumenta a chance de nascerem peças maiores (ex.: 3/6/12 com 768 na mesa). Loop acelerado no late game; o prazer do merge grande chega mais rápido.
_Novelty_: o jogo "cresce com você"; primeira diferença mecânica real vs. Threes (identidade). **Refinamento (Eduardo):** 1s e 2s continuam aparecendo mesmo em tetos altos — a dificuldade é preservada, só perdem peso.
_Riscos_: inflação de score (leaderboard muda de patamar) e jogo mais rápido no fim (puxa a pista Acelerada — bom para receita, precisa de medição L3).

**Spec (Eduardo):**
- **1 = 40%**, **2 = 40%** — nunca mudam.
- **Pote de 20%** para peças ≥3, com peso decrescente por valor.
- **Degraus por teto do maior tile na mesa:**
  - < 48: pote = 100% 3
  - ≥ 48: abre o **6**
  - ≥ 96: abre o **12**
  - ≥ 192: abre o **24**
  - ≥ 384: abre o **48**
  - ≥ 768: abre o **96** — e assim por diante (dobra a cada degrau)
- Peso dentro do pote: quanto maior o valor, menor a chance (curva a calibrar — pendente).

### Nota de Autoria — Jogador sem som (corrigida)

**Técnica:** 3 — Game Feel Playground
**Decisão/Fato:** Eduardo joga com todos os sons desligados, **mas o produto tem som e animações completas** — a preferência pessoal dele NÃO é diretriz de produto. O paladar dele é sinal fraco apenas para *avaliar* áudio (Técnica 7): sons devem ser validados com jogadores externos em playtest, não pelo gosto do autor. Game feel visual e háptico ele consegue avaliar. `[ASSUMPTION]` — áudio = hipótese a validar externamente.



---

## Themes and Patterns

1. **Identidade própria como resposta ao risco de clone** — nome (Tríade), visual (Mineral Quente), som (Cálido/Orgânico) e mecânicas novas (Spawn Adaptativo, Duas Pistas) constroem uma identidade única que mitiga risco de review e se destaca no mercado de clones.
2. **O Maestro do Caos como fio condutor** — a fantasia de controle orienta decisões em todas as técnicas (board limpo sem HUD, celebração de maestria, fracasso informativo).
3. **Monetização como lente de design, não como anexo** — a pista Acelerada e a economia de undo/ad moldam a dificuldade, a integridade do leaderboard e o funil de retenção.
4. **Acessibilidade como padrão de produto** — não custo: acessibilidade total + temas grátis como feature de loja.
5. **Produção embutida no design** — telemetria, north star de funil e checklist de loja nasceram junto das ideias de gameplay, não depois.

## Promising Combinations

- **Spawn Adaptativo (E) + Personalidade dos tiles (What If 2):** o degrau que abre no spawn é o mesmo degrau que ganha nome — o jogador "vê" o teto subir pela coleção de pedras, não por HUD. Reforça o Maestro sem violar o board limpo.
- **Duas Pistas (D+B) + Fracasso (T10) + Desafio diário:** o desafio diário com seed fixo tem duas pistas de placar (limpo vs. assistido) — o seed conhecido é otimizável, e o leaderboard separado mitiga. Fracasso como momento de ad/IAP vive na pista Acelerada.
- **Túmulo de Pedras (What If 4) + Estatísticas do game over (T10):** o túmulo é a visualização das estatísticas — coleção de relíquias que o Maestro "perdeu" desta vez.
- **Mineral Quente (V2) + Áudio Cálido (T7):** pedra + madeira/textura quente — direção sensorial coesa para assets de loja (screenshot, ícone).
- **Reduced Motion (J) + Suíte F–I:** o modo de acessibilidade desliga shake/bullet time, mas mantém haptics e som — a suíte sobrevive em forma reduzida.

---

_Seção de ideação concluída — pronto para organização e fechamento do documento (Passo 4 de 4)._

### Nota: Detalhes financeiros específicos adiados

**Técnica:** 1 — Monetização
**Decisão:** Preço dos IAPs, pacotes e ofertas de lançamento ficam para uma sessão posterior (PRD/adendo), fora do brainstorm. [NOTE FOR PM]

---

## Session Summary

### Most Promising Concepts

**Top Pick: "Tríade" — Duas Pistas + Spawn Adaptativo**
A tríade identidade (nome + Mineral Quente + Cálido/Orgânico), monetização de conveniência (Limpa vs. Acelerada) e a mecânica nova (spawn que cresce com a maestria) formam um pacote coeso que responde ao risco de clone e gera receita sem agredir o jogador.

**Runner-up: Suíte de Game Feel + Recompensas**
Haptics escalados, punch visual, shake, bullet time e celebrações de marco/recorde dão corpo à fantasia do Maestro — o "sentir" que separa o jogo dos clones sem depender de áudio.

**Honorable Mention: Acessibilidade Total + Temas grátis**
Acessibilidade como padrão de produto (44pt, VoiceOver, reduced motion, temas claro/escuro/daltônico) vira feature de loja e sinal positivo para o review.

### Key Insights

- **Identidade é a resposta ao risco de clone** — nome, visual, som e mecânica próprios mitigam review e se destacam no oceano de clones.
- **O Maestro do Caos é o fio condutor** — toda decisão de HUD, recompensa e fracasso é filtrada pela fantasia de controle.
- **Monetização modela o design, não o contrário** — a pista Acelerada e a economia de undo/ad moldam dificuldade, leaderboard e funil.
- **Acessibilidade como padrão de produto**, não custo.
- **Produção embutida no design** — telemetria e north star de funil nasceram junto das ideias.

### Recommended Next Steps

1. **Alimentar o PRD** (em andamento) — as decisões deste brainstorm viram requisitos de produto (features + FRs + métricas).
2. **Validar mercado** — nome "Tríade", busca da loja e registros de marca (checklist App Store Connect).
3. **Spike técnico RN + Skia** — portar `js/game.js` + render de 1 board antes de comprometer a arquitetura.
4. **Playtest externo** — validar áudio (autor é som-off), curva de spawn e funil de primeira sessão.

---

## Session Complete

**Date:** 2026-08-06
**Duration:** Brainstorming session
**Participant:** Eduardo

### Output

Este brainstorm gerou:
- 16 ideias/decisões capturadas
- 16 conceitos desenvolvidos
- 5 temas emergentes

### Document Status

Status: Complete
Steps Completed: [1, 2, 3, 4]




