# review-hud.md — Revisão de Legibilidade de HUD (mobile portrait + landscape, touch)

- Escopo: `DESIGN.md` (Mineral Quente, D-005) + `EXPERIENCE.md` (spine, D-006/D-007)
- Data: 2026-09-04
- Perfil: revisor de legibilidade HUD, touch-first, iOS portrait (primário) + landscape (first-class)

## Veredito

**Aprovar com ressalvas — 1 critical, 3 high devem ser corrigidos antes de ship; portrait sustenta a hierarquia, landscape não.**

- Portrait: hierarquia score (34/700/text) > preview (20/accent/chip) > best (13/500/muted, abaixo do score) se sustenta em tamanho + cor + posição + ordem de anúncio. Banda portrait, tile min 44pt, salto 32/24/18/13, safe-margin 16pt sobre insets, pause 48×48 top-right, aids só Iniciante: todos coerentes e bem amarrados entre DESIGN e EXPERIENCE.
- Landscape: a hierarquia **colapsa parcialmente**. Score cai para 22pt enquanto preview fica em 20pt (delta de 2pt, mesma ordem de grandeza, ambos bold-ish em campo estreito). Somado à ambiguidade de placement "preview right + pause opposite preview (top-right)" e ao best de 11pt muted, o thin top band troca legibilidade por compacidade. É o único ponto que quebra a regra de ouro "preview nunca lê como segundo score".
- Mid-game (48 bronze vs 96 ferro) e best sob sol são riscos reais mas já auto-sinalizados como `[NOTE FOR UX]`; faltam critério de aceite e fallback amarrado.
- Glow 1536+, safe-margin, pause-fora-do-swipe, aids-por-lane: aprovados com ajustes de especificação (raio/opacidade do glow, zona de exclusão do pause).

Nada aqui muda regra de gameplay. Tudo é token, layout ou critério de aceite.

## Findings

### Critical

#### C1 — Preview compete com score em landscape (22 vs 20pt)
- **Onde:** DESIGN Typography (`score-landscape` 22/700 vs `preview-card.valueSize` 20) + Layout landscape ("score + best left, preview right, mesma banda").
- **Por que quebra:** portrait tem razão 34:20 (1,7×) + pesos/posições distintos. Landscape tem razão 22:20 (1,1×) — abaixo de qualquer limiar de dominância tipográfica (~1,3–1,5×). Em banda fina de altura reduzida, dois numerais quentes (text vs accent) lado a lado na mesma linha de leitura competem; o "chip-framed = oracle, não score" não segura sozinho a 20pt contra 22pt. Viola o Do "Rank HUD score > preview > best" na orientação que D-006 declara first-class.
- **Fix:**
  1. Reduzir preview em landscape para 15–16pt (token novo `preview-card.valueSizeLandscape: 15pt`, manter 20pt só portrait), OU
  2. Manter 20pt mas dessaturar/reduzir peso do preview em landscape (400–500, não bold) + forçar moldura chip (border + label "PRÓX" 10–11pt muted acima do valor) para quebrar leitura de "número grande", OU
  3. Fazer ambos (recomendado): 16pt + chip label. Em nenhum caso preview-landscape ≥ 18pt.
  4. Critério de aceite: razão score:preview ≥ 1,35× em landscape (22:16 = 1,375× ✓) + teste A/B de 5s ("qual é o score?") com 0 confusões em 10/10 participantes.

### High

#### H1 — Pause × preview: colisão de spec no top-right em landscape
- **Onde:** DESIGN Components ("landscape top-right opposite the preview") vs EXPERIENCE Landscape ("preview right, pause opposite the preview (top-right)") vs Responsive ("preview right, pause top-right").
- **Por que importa:** se preview está à direita e pause está "opposite the preview" mas também "top-right", os dois reivindicam o mesmo canto na banda mais estreita. Em telefones pequenos em landscape (altura ~360–390pt menos band + safe), qualquer ambiguidade vira sobreposição ou toque adjacente. O contrato de input ("release off the board resolve o swipe; segundo dedo ignorado") aumenta o risco de toque acidental no pause ao soltar o swipe perto da borda superior.
- **Fix:** congelar uma geometria: banda landscape = `[score + best | esquerda] [preview | centro-direita] [pause 48×48 | extrema-direita, 16pt do inset]`, com gap mínimo preview↔pause de 12pt e zona de exclusão de swipe de 8pt acima do board. Corrigir o texto "opposite the preview" para "extrema-direita, preview imediatamente à sua esquerda". Adicionar teste touch: 50 swipes terminando no terço superior não disparam pause.

#### H2 — Best muted falha sob sol, pior em landscape 11pt
- **Onde:** DESIGN Colors (muted on surface 5,6:1; muted on surface-raised 4,9:1) + Typography (`caption-landscape` 11/500 muted).
- **Por que importa:** 4,9:1 passa AA em laboratório mas é borderline sob luz solar direta em vidro reflexivo; a 11pt/500 (texto pequeno, peso leve) a reserva some. Best é terciário por design — deve continuar discreto — mas "sempre legível" ≠ "quase invisível outdoor". Landscape é onde o jogador veterano (Dora, Théo) mais consulta best.
- **Fix:** (a) elevar `muted` em 1 step só para HUD (`#B3AB9D`, alvo ≥ 6:1 on surface-raised) OU adicionar sombra/text-stroke de 1px `surface` atrás de best/score em landscape; (b) subir `caption-landscape` para 12pt/600 (mantém rank: 22 > 16 > 12); (c) critério de aceite: teste outdoor (sol direto, brilho 80%) — best legível a 30cm em 5/5 devices sem aproximar o aparelho. Nunca resolver subindo best para accent ou mesmo tamanho do score.

#### H3 — Bronze 48 vs ferro 96: distinguibilidade mid-game não garantida
- **Onde:** DESIGN Colors (`#6E5A45` warm gray-brown vs `#4E5560` cool slate, "close in lightness by design") + `[NOTE FOR UX]` já aberto + Shapes (facet/grain por banda, mapeamento per-tier adiado para E9).
- **Por que importa:** pares `48|96` adjacentes são comuns no teto mid-game (run do Théo abre `96` no teto 768). Se a separação depender só de matiz quente-vs-frio em tiles de ~44–60pt sob luz quente interna, o merge `48+48` vs leitura de `96` confunde. O fallback (`96 → #3E444E`) existe mas sem gatilho mensurável; o plano B "chamfer/grain separa mesmo se matiz não separar" não tem mapeamento concreto por tier.
- **Fix:** (a) definir critério de aceite jogável: 10/10 jogadores distinguem `48|96` adjacentes a 40cm sob luz 2700K e em grayscale (filtro do OS); (b) se falhar, aplicar fallback `#3E444E` no `96` (nunca clarear `48`, preserva step para esmeralda); (c) amarrar E9: facet fino+denso-grain no `48`, multi-facet+grain ralo no `96` + glyph/entalhe distinto (não só densidade), validado no par `48 vs 96` E no par `192 vs 1536` citados em Shapes. Repetir em color-blind theme (separação por value-step, não matiz).

### Medium

#### M1 — 6 dígitos a 13pt em tile 44pt: risco de clip no chamfer
- **Onde:** DESIGN Typography `[ASSUMPTION]` (24/18/13 para 4/5/6 dígitos, inset 4pt/lado, floor 11pt).
- **Por que importa:** 44pt − 8pt insets = 36pt úteis. Seis numerais 700 a 13pt (~7–8pt/avance) ≈ 42–48pt — estoura o útil e morde o chamfer 10pt, justamente nos runs longos onde o tile grande é o troféu. O floor 11pt resolve clip mas cai para ~3:1 large-text em `384`-like pairs se aplicado no tier errado.
- **Fix:** (a) validar on-device: todos os 13 tiers com o maior valor real por tier (ex. `3072`, `6144`…) dentro do tile 44pt sem clip do chamfer; (b) se clipar, aplicar floor 11pt + tracking −2% SÓ no 6-digit (nunca truncar, nunca quebrar linha); (c) re-rodar ink ≥ 4,5:1 no tier que receber o floor (prioridade `384` 4,7:1). Manter regra "nenhum step cai > ~28%" — 13→11 é 15% ✓.

#### M2 — Glow 1536+ sem teto especificado pode ofuscar vizinhos
- **Onde:** DESIGN Components tile ("único glow do sistema", `{colors.glow-incandescent}`) + Elevation feel layer + Reduced Motion gate.
- **Por que importa:** escassez está certa (só `1536`/`3072+`), gate em Reduced Motion está certo, mas falta raio/opacidade/duração do bloom. Sem teto, o pico mais desejado vira o momento mais ilegível (numerais vizinhos lavados + chamfer estourado), e bullet-time 200ms + flash empilha exposição.
- **Fix:** especificar: bloom outer ≤ 12% da largura do tile, opacidade ≤ 35%, duração = merge-splash (transiente, nunca persistente), nunca sobre preview/score (feel só no board — já contratado, manter). Critério: numeral do tile brilhante + 4 vizinhos legíveis (≥ 4,5:1 efetivo) durante o flash em foto de 1/60s. Reduced Motion: glow off por completo (já contratado) — sem "versão suave" que vire estado permanente.

#### M3 — 384 a 24pt mudou de barra (large-text → body-text): re-check pendente
- **Onde:** DESIGN `[NOTE FOR UX]` 384 (`#157A5C` + light ink ≈ 4,7:1, agora 24/800 não 13).
- **Por que importa:** a 13pt valia a barra 3:1; a 24pt/800 continua large-text por peso/tamanho WCAG (≥ 18,66px bold ≈ 14pt bold — 24pt/800 passa folgado), mas o doc declara "moves to body-text bar", ou seja, o time quer tratar como 4,5:1. Com 4,7:1 a margem é 0,2 — variação de calibração de painel come a margem.
- **Fix:** re-rodar on-device no tile real (não swatch) nos três brilhos (30/60/100%); se < 4,5:1, clarear tile para `#1B8A66` (fallback já previsto, nunca trocar ink — preserva descida esmeralda→obsidiana). Registrar o par medido no decision-log.

#### M4 — Thin top band: sem altura mínima nem regra de overflow
- **Onde:** DESIGN + EXPERIENCE landscape ("thin top edge band, no second row").
- **Por que importa:** "no second row" sem altura mínima vira compressão infinita em devices curtos: score 22 + caption 11 + 16pt margins em ~44–56pt de banda é factível, mas Dynamic Type grande (a11y) ou notch alto estoura para 2 linhas ou clipa o best.
- **Fix:** fixar banda landscape = 56pt (44pt conteúdo + 12pt respiro) incluindo safe-margin; best trunca com ellipsis (nunca quebra linha, nunca empurra preview); Dynamic Type XL+ na banda: congela best em 12pt máximo (exceção documentada como a dos tile numerals) para preservar single-row. Teste: iPhone SE + Dynamic Type máximo, banda continua 1 linha.

### Low

#### L1 — Preview 20pt portrait: monitorar, não corrigir agora
- Portrait 34:20 + chip + accent-vs-text separa bem. Risco residual: usuários daltônicos lendo accent como "segundo score dourado". Mitigado pelo chip-frame + ordem de anúncio (score→preview→best, já contratada). Ação: incluir pergunta "o que é o número dourado?" no playtest; se > 1/10 responder "score", adicionar label "PRÓX" 10pt muted no chip (portrait e landscape).

#### L2 — Safe-margin 16pt "on top of insets": correto, falta matriz de devices
- A regra (`safe-margin` SOBRE `react-native-safe-area-context`, ambas orientações, preview + pause dentro) está certa e repetida consistentemente nos dois arquivos. Falta evidência: matriz notch/Dynamic Island/home-indicator × portrait/landscape × SE/Pro/Max com screenshot. Ação: checklist E8 com 6 combinações, zero clip fora do inset+16pt.

#### L3 — Pause fora do swipe rect: placement certo, geometria não provada
- 48×48 ≥ 44, top-right, fora do board, dentro de safe margins — tudo contratado. Mas "fora do swipe rect" é declarado, não cotado: o gesto `Pan()` cobre o board, e soltura fora do board ainda resolve o move (contrato E1). Ação: cotar swipe-rect = board + 8pt de graça; pause fora dele por ≥ 12pt em ambas orientações; teste de toque acidental (H1) cobre.

#### L4 — Aids só Iniciante: contrato íntegro, vigiar vazamento por anúncio
- Clean bare (score+best+preview, sem ceiling/stuck) vs Iniciante contextual/dismissible ≥44pt/anunciado — Do/Don't + Component Patterns + State Patterns alinhados, e "preview em ambas as lanes" impede a confusão preview=assist. Ação: teste de regressão por lane (Clean nunca monta `prompt-banner`/`reward-prompt`, nem anuncia) + garantir que undo rewind não re-dispara bullet-time (já contratado: "undo rewinds it with the board").

## Resumo por critério pedido

| Critério | Situação | Ref |
|---|---|---|
| Hierarquia score>preview>best | ✓ portrait / ✗ landscape (22 vs 20) | C1 |
| Thin top band vs banda portrait | ✓ conceito / ✗ sem altura mínima + colisão pause/preview | H1, M4 |
| Tile min 44pt | ✓ com re-check amarrado | M1 |
| Salto 32/24/18/13 | ✓ (≤ 28% por step, sem cliff) | — |
| Preview 20pt competindo | ✗ em landscape | C1 |
| Best muted sob sol | ⚠ borderline (4,9:1, 11pt) | H2 |
| Bronze 48 vs ferro 96 mid-game | ⚠ depende de validação + E9 | H3 |
| Glow 1536+ sem ofuscar | ⚠ falta teto de raio/opacidade | M2 |
| Safe-margin 16pt sobre insets | ✓ regra certa, falta matriz | L2 |
| Pause top-right fora do swipe | ✓ placement, falta cota + teste | H1, L3 |
| Aids só Iniciante | ✓ íntegro | L4 |

## Ordem de correção sugerida

1. C1 (token `preview-card.valueSizeLandscape` + chip label) — desbloqueia landscape.
2. H1 (geometria banda: score|preview|pause + zona de exclusão) — mesma área, mesmo PR.
3. H2 (best 12/600 + muted step ou sombra) + M4 (banda 56pt, best 1 linha) — mesmo PR.
4. H3 (teste 48|96 + fallback + facet map E9) + M3 (re-check 384 on-device) — bancada de cor.
5. M1 (clip 6-digit) + M2 (teto do glow) — polimento pre-ship.
6. L1–L4 como checklist de playtest/E8.
