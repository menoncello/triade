# Review — Acessibilidade (WCAG AA, iOS App Store)

- Escopo: `DESIGN.md` (Mineral Quente, D-005) + `EXPERIENCE.md` (spine, S9 / Accessibility Floor / Screen Reader Contract)
- Stakes: Commercial, iOS App Store
- Data: 2026-09-04
- Método: leitura dos dois artefatos + recomputação independente dos pares load-bearing (luminância relativa sRGB, fórmula WCAG).

## Veredito

**APROVADO COM CONDICIONANTES — não embarcar sem os fixes Critical/High.**

O floor está bem arquitetado (tokens com pressed/focus/disabled, hierarquia score > preview > best espelhada em anúncio, Reduced Motion como preset que mantém haptics+som, tone auto-advance que cede ao screen-reader). Contrastes load-bearing recomputados **conferem** com o declarado. Os bloqueadores reais são: (1) VoiceOver sem caminho alternativo de movimento, (2) anel de foco invisível sobre fill accent, (3) leitura além-de-cor ainda diferida para E9 sem validação dos pares críticos, (4) par 384 com margem fina exigindo re-check em device. Nenhum é estrutural — todos têm fix pontual.

### Contrastes recomputados (verificação independente)

| Par | Calculado | Declarado | Barra AA |
| --- | --- | --- | --- |
| text / surface | 13.06:1 | ≈13.1:1 | pass (4.5) |
| muted / surface | 5.56:1 | ≈5.6:1 | pass |
| muted / surface-raised | 4.92:1 | ≈4.9:1 | pass, margem fina |
| accent / surface | 7.02:1 | ≈7.0:1 | pass |
| accent / raised (preview ink, toggle on) | 6.22:1 | ≈6.2:1 | pass |
| dark ink / accent (label Jogar, aba ativa) | 8.55:1 | ≈8.6:1 | pass |
| dark ink / accent-pressed | 6.09:1 | — | pass |
| tile 384 light ink (`#F6F0E1` / `#157A5C`) | 4.65:1 | ≈4.7:1 | pass (4.5), margem ~0.15 |
| tile 24 light ink | 4.91:1 | — | pass |
| tile 48 / 96 / 192 / 768 / demais tiers | 5.05–16.78:1 | — | pass |
| muted / board | 6.20:1 | — | pass |
| focus ring accent / surface | 7.02:1 | — | pass (3:1 non-text) |
| focus ring accent / raised | 6.22:1 | — | pass |
| border / surface | 1.43:1 | — | decorativo (ver Low-01) |
| border / raised (track off do toggle vs fundo) | 1.27:1 | — | **falha 1.4.11** (ver High-03) |
| accent-pressed como *texto* / raised | 4.42:1 | — | abaixo de 4.5 — não usar accent-pressed como cor de texto (hoje é só fill, ok) |

## Findings

### Critical

**C-01 — VoiceOver sem caminho de movimento quando o gesto de três dedos é interceptado.**
- Onde: `EXPERIENCE.md` Screen Reader Contract ("Move = three-finger swipe") + failure branch ("intercepted → same as noop").
- Problema: VoiceOver reserva swipes de três dedos para navegação do sistema. Se o OS interceptar, o jogador fica **sem nenhum movimento possível** — o failure branch equaliza "sistema engoliu o gesto" com "noop silencioso", ou seja, o jogo trava para a usuária cega sem diagnóstico. Beatriz (flow) não tem plano B. WCAG 2.1.1 / 2.5.1.
- Fix: adicionar **caminho alternativo obrigatório** antes do ship — uma das opções: (a) Custom Actions de VoiceOver por direção ("Mover para cima/baixo/esquerda/direita") na grade; (b) rotor direcional; (c) D-pad acessível oculto por padrão e exposto quando `UIAccessibilityIsVoiceOverRunning`. Manter three-finger como primário. Diferenciar anúncio/haptic entre "noop do engine" (silencioso, ok) e "gesto não chegou ao jogo" (haptic leve + dica uma vez por sessão, throttled).

### High

**H-01 — Anel de foco 2px accent invisível sobre fill accent.**
- Onde: `DESIGN.md` Shapes ("Focus ring") + Components (button/tab ativos).
- Problema: o anel é `{colors.accent}` *outer* — sobre o botão Jogar (`accent` fill) ou aba ativa (`accent` fill), o contraste anel/fill é ~1:1. Foco alcançável por teclado/VoiceOver/Switch fica invisível exatamente no CTA primário. WCAG 2.4.7 / 1.4.11.
- Fix: anel duplo — 2px accent + contorno externo/interno de 1px `{colors.scrim}` (ou `tile-ink-dark`) com gap de 1px, **ou** deslocar o anel com gap garantido + outline escuro. Validar nos três casos: fill accent, fill raised, tile claro. Regra: "anel nunca da mesma cor do fill adjacente".

**H-02 — Leitura além-de-cor diferida: pares 48×96 e 192×1536 sem mapeamento validado.**
- Onde: `DESIGN.md` Colors (bronze vs ferro "by design close in lightness") + Shapes ("exact glyph/facet mapping … E9").
- Problema: a direção está certa (faceta/grão + texto/numeral, 1≠2, preview como valor textual), mas o mapeamento tier→faceta **não existe ainda** — é deliverable de E9. `48 #6E5A45` (warm gray-brown) × `96 #4E5560` (cool slate) são adjacentes em lightness e co-ocorrentes no mid-game; `192` esmeralda × `1536` incandescente são ambíguos só por lightness para deuteranopia/protanopia. Ship sem isso é aposta. WCAG 1.4.1.
- Fix: antes do ship, (1) entregar a tabela tier→faceta/grão em E9; (2) validar lado a lado nos dois pares citados, em tile ~44pt, sob luz indoor quente; (3) fallback já previsto (`96 → #3E444E`) só se (1)/(2) falharem — não clarear `48` (preserva o degrau para o esmeralda). Critério: separável com simulação de deuteranopia/protanopia + escala de cinza.

**H-03 — Toggle off-state indistinguível por contraste de componente.**
- Onde: `DESIGN.md` Components (`settings-toggle`: offFill `border` sobre `surface-raised`).
- Problema: track off vs fundo = **1.27:1** — falha WCAG 1.4.11 (3:1 para componentes UI). Posição do thumb + label mitigam, mas o track sozinho não passa.
- Fix (um dos): (a) engrossar/escurecer o track off (ex.: borda 1px `muted` sobre o track, ou offFill mais escuro que `border`); (b) adicionar glifo I/O no thumb além de posição; (c) combinar (a)+(b). Re-medir ≥3:1 track-vs-fundo. O on-state (`accent`, 6.22:1) já passa.

**H-04 — Par 384 com margem fina (~0.15 acima do piso) + nota de UX factualmente invertida.**
- Onde: `DESIGN.md` Colors (`384` ≈4.65:1, weakest pair) + `[NOTE FOR UX]` validação.
- Problema duplo: (a) 4.65:1 passa, mas variação de painel OLED/calibragem/temperatura pode empurrar abaixo de 4.5 em device; (b) a nota diz que 24pt "moves it from the large-text bar to the body-text bar" — **invertido**: 24pt/800 **é** large text pelo WCAG (≥18pt ou ≥14pt bold → barra 3:1). O teste conservador em 4.5 continua válido, mas a justificativa documentada está errada e pode levar E1 a testar contra a barra errada.
- Fix: (a) corrigir a nota (24pt/800 = large text, barra 3:1; manter meta interna ≥4.5 por margem); (b) re-rodar o check **em device** no novo tamanho; (c) se <4.5, aplicar o fallback já previsto (`#1B8A66`, clarear o tile, nunca trocar a tinta — preserva a descida esmeralda→obsidiana).

### Medium

**M-01 — Noop silencioso × gesto interceptado indistinguíveis para screen-reader.**
- Onde: `EXPERIENCE.md` Announcement contract (noop = silent) + Beatriz failure branch.
- Problema: silêncio é correto para noop do engine, mas o mesmo silêncio para "gesto nem chegou" deixa a usuária sem modelo mental (parcialmente coberto por C-01).
- Fix: resolvido junto com C-01 — noop do engine permanece silencioso; falha de entrega do gesto ganha feedback throttled (haptic leve, sem anúncio falado a cada swipe; dica verbal no máximo 1×/sessão).

**M-02 — Best `muted` em sol forte (4.92:1 sobre raised, 11pt landscape).**
- Onde: `DESIGN.md` Typography (best 13pt→11pt landscape, sempre muted, terciário por desenho).
- Problema: passa AA indoor com folga curta; sob glare + brilho reduzido, 11pt/500 a 4.92:1 é o primeiro texto a sumir — e é justamente score-contexto (lane-scoped best).
- Fix: manter a hierarquia (best nunca compete com score/preview) e aplicar **uma** das mitigações: (a) piso de 12pt para best-landscape; **ou** (b) peso 600 no best a 11pt; **ou** (c) aceitar 11pt/500 com Dynamic Type garantindo escala sem truncar. Não clarear `muted` globalmente (quebraria a ternaridade). Re-testar ao ar livre antes do ship (critério: legível a 1 braço com brilho 50%).

**M-03 — Reduced Motion: latência de aplicação não especificada.**
- Onde: `EXPERIENCE.md` Accessibility Floor + Game Feel & Juice.
- Problema: o conjunto gatado está correto e completo (shake, bullet-time, flash/partículas, overshoot, glow `1536+`, fade do game-over; haptics+som mantidos — correto para vestibular, WCAG 2.3.3). Mas "theme changes apply next match" (State Patterns) deixa ambíguo se Reduced Motion também só vale na próxima partida — para sensibilidade a movimento, o toggle deve valer **imediatamente** (inclusive mid-run).
- Fix: especificar — Reduced Motion aplica imediato (mata feel-layer in-flight, congela shake/bullet em curso, substitui o fade do game-over por corte seco); theme visual pode continuar next-match. Cobrir com teste: ligar mid-animation → nenhum movimento residual.

**M-04 — Tile mínimo ~44pt = piso exato do target em landscape.**
- Onde: `DESIGN.md` Layout + `EXPERIENCE.md` Responsive ("min ~44pt tile width before re-run").
- Problema: tiles não são tappables (swipe resolve pelo gesto, tap no tile é leitura VO) — então 44pt aqui é área de leitura/segmentação, não target WCAG. Ainda assim, no mínimo landscape o tap-to-read VO opera exatamente no piso, com gap de 8pt como única separação.
- Fix: manter o gate existente (re-rodar numeral/ink check abaixo de ~44pt) e adicionar ao protocolo E1/E8: teste de tap-to-read com fonte máxima + tile mínimo (critério: taxa de acerto de tile ≥95% sem leitura do vizinho).

### Low

**L-01 — Hairlines `border` 1.27–1.43:1.**
- Onde: painéis, divisórias, `leaderboard-row` hairline.
- Problema: abaixo de 3:1, mas são decorativas — o indicador significativo de seleção é sempre a barra/borda accent 2px/1px (7:1) + fill swap + sombra. Sem violação desde que nenhum estado dependa só da hairline.
- Fix: regra de lint de design — "nenhuma informação carregada só por hairline `border`"; seleção sempre com accent bar/border + fill. Sem mudança de hex.

**L-02 — `accent-pressed` como cor de texto (4.42:1 sobre raised) ficaria abaixo do piso.**
- Onde: token `{colors.accent-pressed}`.
- Problema: hoje é **só fill** (label sobre ele é dark ink, 6.09:1, pass) — sem violação atual. Risco futuro se alguém usar accent-pressed como tinta de texto/ícone sobre raised.
- Fix: documentar no token — "accent-pressed é fill, nunca tinta sobre raised; tinta accent sobre raised continua `accent` (6.22:1)".

**L-03 — Skeleton shimmer `[ASSUMPTION]` sem parâmetro de movimento seguro.**
- Onde: `DESIGN.md` leaderboard-row + `EXPERIENCE.md` Loading.
- Problema: "nunca spinner" está certo; mas shimmer é movimento — precisa respeitar Reduced Motion (estático sob o preset) e evitar frequência de flash (WCAG 2.3.1, 3 flashes/s).
- Fix: shimmer lento (≤1 ciclo/2s, sem alternância brusca) + versão estática (blocos sem animação) quando Reduced Motion ativo.

**L-04 — Idioma das labels de board (PT/EN) e ordem de anúncio em i18n.**
- Onde: Screen Reader Contract (label provenance: engine vs i18n).
- Problema: a separação engine/i18n está correta; falta explicitar que a **ordem** score→preview→best vale nas duas línguas e que valores (`1/2`, ranges `3/6/12`) têm forma falada localizada ("um ou dois", não "um barra dois").
- Fix: adicionar ao catálogo i18n as formas faladas de valores/ranges + teste VO em PT e EN.

## Checklist do pedido (resumo)

| Item pedido | Resultado |
| --- | --- |
| WCAG AA pares load-bearing (texto, muted, tiles, 384, preview accent) | Pass — verificado por cálculo; 384 passa com margem fina (H-04) |
| Touch targets ≥44pt | Pass — 48pt botões/rows/pause, tabs com hit ≥44, dismiss ≥44, tone = full-screen tap |
| VoiceOver (three-finger, tap-to-read, ordem, throttle) | **Condicional** — modelo certo, mas sem fallback de movimento (C-01) + ambiguidade noop (M-01) |
| Reduced Motion (gata shake/bullet/flash/partículas/overshoot, mantém haptics+som) | Pass no conjunto; especificar aplicação imediata (M-03) |
| Dynamic Type (numerais fixos como exceção) | **Aceita como exceção deliberada** com condições: sem truncamento no chrome, re-check numeral/ink no tile mínimo + texto máximo (M-04, H-04) |
| Shape+text além de cor | Direção certa, entrega pendente — validar pares críticos (H-02) |
| Foco visível 2px | Sistema certo, falha sobre fill accent (H-01) |
| Best muted em sol forte | Pass indoor, marginal outdoor (M-02) |
| Tone auto-advance com screen-reader | Pass — pausa com anúncio em voo / VO ativo, tap-to-skip, sem retorno |
