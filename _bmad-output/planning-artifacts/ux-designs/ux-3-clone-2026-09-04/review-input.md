# review-input.md — Input Schemes (touch-first iOS + VoiceOver + PWA legacy)

Fontes: `DESIGN.md` + `EXPERIENCE.md` (run 2026-09-04). Escopo: swipe RNGH Pan ~20px, edge-contract,
tap targets, 1-tap restart, VoiceOver (three-finger move, tap-to-read, noop), sem-remap, arrow-keys PWA,
mis-swipe perto de pause/preview.

## Veredito

**APROVADO COM RESSALVAS** — o contrato base está bem especificado (threshold, cancel=sem move,
release off-board, first-wins, nunca mutação mid-animation, tap targets ≥44, 1-tap restart, noop silencioso).
Não bloqueia E1. Três pontos devem ser fechados antes de E9/playtest em device: (1) path VoiceOver não pode
depender só de three-finger swipe — precisa fallback por custom actions; (2) regra de resolução direcional
(diagonais) está ausente; (3) "queued/rejected" é ambíguo — escolher um.

## Findings

### Critical

**C1 — Three-finger swipe como único path de movimento VoiceOver é frágil.**
- Onde: `EXPERIENCE.md` Screen Reader Contract ("Move = three-finger swipe") + fluxo Beatriz
  ("VoiceOver is in a mode that lets the three-finger gesture reach the game").
- Por quê: com VO ativo, three-finger swipe é gesto do sistema (scroll/paginação); a entrega ao app
  depende de modo/passthrough e falha silenciosamente (o próprio doc admite interceptação no failure branch).
  Sem path alternativo, usuário VO pode ficar sem conseguir jogar.
- Fix: adicionar **custom actions no elemento do board** (`move up/down/left/right` via
  `UIAccessibilityCustomAction`, nomes do catálogo i18n) + manter three-finger como atalho.
  Documentar: rotor/actions anunciam "actions available"; movimento por action usa o mesmo `move()`
  do engine (mesmo noop/edge-contract). Teste de aceitação: com VO ligado, completar 3 moves só por actions.

### High

**H1 — Resolução direcional de diagonais indefinida.**
- Onde: `EXPERIENCE.md` Interaction Primitives ("Direction resolves the move").
- Por quê: sem regra de eixo dominante, swipes ~45° geram moves imprevisíveis — principal causa de
  "mis-swipe" percebido em puzzle 4×4.
- Fix: regra **dominant-axis no momento da ativação**: se `|dx| > |dy|` → horizontal senão vertical;
  travar o eixo até `onEnd` (sem re-resolução mid-gesture). Registrar no edge-contract. Teste: matriz
  8 direções + 4 diagonais exatas.

**H2 — "queued/rejected" deixa o comportamento durante animação indefinido.**
- Onde: `EXPERIENCE.md` ("Swipe durante in-flight → queued/rejected per engine contract").
- Por quê: queue e reject têm UX oposta (input lag + move não-intencional vs. intent descartado).
  Delegar ao engine sem escolher um transfere a decisão para E1 e gera divergência touch vs VO.
- Fix: escolher **reject (descartar) durante animação** — animações curtas (<150ms) tornam a janela
  desprezível; documentar "swipe in-flight = noop silencioso, sem turno consumido". Se playtest pedir
  queue, adotar **single-slot com expiração** (só o último, descarta após ~300ms), nunca fila unbounded.

### Medium

**M1 — Threshold "~20px": unidade ambígua.**
- Onde: `EXPERIENCE.md` Interaction Primitives + Input Schemes.
- Por quê: `px` físico varia por densidade; o correto é unidade independente (`pt`/`dp`).
- Fix: normatizar para **`~20pt` (density-independent)**. Para three-finger VO, validar `20–24pt`
  em device (três dedos têm precisão menor). Teste em menor tile (~44pt landscape): 20pt ≈ meio tile — ok.

**M2 — "Tap-to-read" com VO: tap = foco, não ativação.**
- Onde: Screen Reader Contract ("Read the board = tap a tile").
- Por quê: com VO, single-tap só move o foco; leitura acontece no foco/explore, não em "tap".
  Redação atual sugere gesto indisponível com VO ligado.
- Fix: reword para **"tocar/focar um tile anuncia valor + posição"**; garantir labels via bridge
  Skia→`UIAccessibility` por tile (`accessibilityElement`, label `tile {v}, row {r}, column {c}` do engine).
  Tiles ≥44pt satisfazem o target; confirmar foco mostra o ring de 2px accent.

**M3 — Área do gesto: preview "perto do dedo" + pause precisam de exclusão explícita.**
- Onde: `DESIGN.md` Layout (pause "outside the board swipe rect"; preview "bottom corner near the swipe finger").
- Por quê: pause está excluído por construção, mas o preview — não-interativo, colado no dedo —
  não tem regra de hit-rect; toque iniciado no card pode iniciar/confundir o Pan ou engolir o início do swipe.
- Fix: **Pan restrito aos bounds do board** (gesture handler montado na view do board, não na tela);
  preview card e pause **fora do hit-rect**, sem `simultaneousHandlers` com o Pan; toque iniciado fora do
  board nunca inicia move (nem tap-move). Teste: iniciar swipe sobre preview/pause = sem move, sem turno.

### Low

**L1 — Noop silencioso indistinguível de gesto interceptado (VO).**
- Onde: State Patterns ("Noop swipe… silent") + Beatriz failure branch ("mesmo que noop").
- Por quê: para vidente o board parado é o feedback; para VO, silêncio total confunde "board não mudou"
  com "gesto nem chegou". O silêncio está correto como regra (sem punição), mas o plano de teste deve cobrir.
- Fix: manter **noop = silencioso, sem turno, sem spawn** (correto); no teste VO, validar separadamente
  (a) noop real (board anuncia nada, estado inalterado) e (b) interceptação (idem) — sem mudar a regra.
  Opcional pós-playtest: tick háptico sutil só para gesto entregue-e-rejeitado (nunca para interceptado —
  indistinguível no app; por isso opcional).

**L2 — Sem remap em v1: aceitável para puzzle, documentar o porquê.**
- Onde: Input Schemes ("No remapping in v1").
- Por quê: sem time pressure e com esquema único (swipe 4 direções + tap), remap não é barreira de acesso;
  o gap real de acesso é o path VO (C1), não o remap.
- Fix: **aceitar sem remap**; registrar justificativa (turn-based, sem expiração de turno) para auditoria
  futura. Reavaliar se surgir input com timing.

**L3 — Arrow-keys só no PWA: ok, com nota de iPad.**
- Onde: Input Schemes ("Arrow keys — web PWA only; iPad hardware keyboard is not required").
- Por quê: coerente com PWA legacy congelado e MVP iOS touch-first; Switch Control + foco anelado cobrem
  navegação do chrome. Board via teclado físico no app fica sem path — aceitável no MVP, mas assumir explicitamente.
- Fix: **manter**; nota: teclado BT + VO usa o path de custom actions (C1), não arrow-keys. Sem ação.

**L4 — Release off-board "resolve as captured": ok, notar edge do sistema.**
- Onde: edge-contract ("Release off the board → resolve").
- Por quê: correto (gesto owns the move); único conflito é o home-indicator swipe-up do iOS na borda inferior.
- Fix: **manter**; safe-margin 16pt + safe-area já mitigam; cobrir em teste Face-ID device (swipe que termina
  sobre o home indicator não deve nem mover nem ejetar o app de forma surpreendente além do comportamento do SO).

## Checklist por item do pedido

| Item | Estado |
| --- | --- |
| Swipe RNGH Pan ~20px threshold | Ok com ressalva (M1: fixar `pt`) |
| Edge: cancel = sem move | Ok |
| Edge: release off-board resolve | Ok (L4) |
| Edge: 2º dedo first-wins | Ok (`maxPointers(1)` implícito — confirmar em E1) |
| Edge: swipe durante animação | **Pendente — decidir (H2)** |
| Nunca mutação mid-animation | Ok |
| Tap targets ≥44 | Ok (48 chrome, tab ≥44, dismiss ≥44, tiles ≥44) |
| 1-tap restart | Ok (Jogar de novo, mesma lane) |
| Three-finger VO move | **Frágil — fallback necessário (C1)** |
| Tap-to-read | Ok com reword (M2) |
| Noop silencioso | Ok (L1 só teste) |
| Sem remap | Ok para puzzle (L2) |
| Arrow-keys só PWA | Ok (L3) |
| Mis-swipe pause/preview | Pause ok; preview precisa hit-rect (M3) |

## Próximos passos (para E1/E9)

1. Fechar C1 (custom actions), H1 (dominant-axis lock), H2 (reject) no spec antes de implementar.
2. Normatizar `~20pt` (M1) + hit-rect do board (M3) + reword tap-to-read (M2).
3. Device test: Face-ID home edge (L4), three-finger 20–24pt (M1), diagonais (H1), VO só-actions (C1).
