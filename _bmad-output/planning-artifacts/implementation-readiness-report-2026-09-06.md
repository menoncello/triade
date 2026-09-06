# Implementation Readiness Assessment Report

**Date:** 2026-09-06
**Project:** 3-clone
**Amendment 2026-09-06 (pós-assessment):** Crítico 1 RESOLVIDO — `epics.md` alinhado à escada 48-base do GDD (FR7, FR map, S2.1, S2.3, S2.4, S2.7, S7.1, S7.3). Crítico 2 RESOLVIDO via GDD D-018 (auto-balance aprovado; `gdd.md` + arch + PRD addendum §11 atualizados). Major RESOLVIDO — gate movido S2.7→S10.6 (backward ref a 10.2/10.3, sem forward dep). **Status atual: READY (reenable Phase 4 via S1.1 spike).**
**Sources (mais recentes confirmados pelo usuário):**
- GDD: `_bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md` (+ decision-log.md)
- Architecture: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md`
- Epics: `_bmad-output/planning-artifacts/epics.md` (45K, 05-Set; stub antigo em `gdds/.../epics.md` ignorado)
- UX: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-09-04/` (DESIGN.md + EXPERIENCE.md + reviews + 10 mockups; versão 08-07 superada)

---
stepsCompleted: ["step-01-document-discovery", "step-02-gdd-analysis"]
---

## Document Inventory (Step 1)

- GDD sharded: `gdds/gdd-3-clone-2026-08-07/gdd.md` (23K)
- Architecture sharded: `architectures/architecture-3-clone-2026-08-07/game-architecture.md` (48K)
- Epics whole: `epics.md` (45K, 05-Set)
- UX sharded (nova): `ux-designs/ux-3-clone-2026-09-04/`

## GDD Analysis

### Functional Requirements

FR1: Board 4x4, abre com 9 tiles iniciais.
FR2: Cada tile move no máximo 1 célula por swipe; merge-once (tile recém-fundido trava no swipe); sem cascata de compactação. Ex: [3,3,3,3]->[6,3,3,_].
FR3: Regras de merge: 1+2->3 (ordem independente); iguais >=3 dobram; 1+1 e 2+2 nunca fundem. Série: 1,2,3,6,12,24,48,96,192,384,768,1536,3072...
FR4: Spawn só após move efetivo (NOOP não spawna, não pontua, não consome turno); posição uniformemente aleatória em célula vazia.
FR5: Pesos base 1:40%, 2:40%, 3:20% (= caso ceiling <48 do Adaptive Spawn).
FR6: Adaptive Spawn (só RN; web congelada em 40/40/20): 1/2 fixos 40/40; pot 20% para >=3 aberto por ceiling (>=48->3,6; >=96->+12; >=192->+24; >=384->+48; >=768->+96; dobra adiante); halving decay dentro do pot (3=1, 6=1/2, 12=1/4... normalizado); curva configurável (um número por valor).
FR7: Next-piece preview antes de cada move, ambas lanes: 60% valor exato, 40% range ambíguo contendo o real (1/2: "1/2"; pot: até 3 valores contíguos); só informativo, nunca altera spawn.
FR8: Score incrementa pelo valor fundido; best persistido (web localStorage; RN app storage); overlay de game-over mostra score+best+max tile+merges+longest streak imediatamente, sem wait forçado.
FR9: Game over = grid cheio E sem par fundível adjacente (1|2 adjacente ou iguais >=3); soft fade, último move visível, restart one-tap.
FR10: Two Lanes por game: Clean vs Accelerated ("Iniciante"/"Beginner"); última escolha é default; trocar de lane inicia novo game; leaderboards por lane nunca misturam; HUD: sem ceiling indicator e sem stuck warning no Clean.
FR11: Assistência (só Accelerated): Undo 1 free/game via rewarded ad, ou 3 via IAP, ou ilimitado via "No Ads + Unlimited Undo"; Hint via IAP 5-pack destaca UM par fundível (nunca sugere direção nem revela spawn); Death-continue 1x por game over (ad ou IAP); Clean sem ofertas.
FR12: Controles: swipe touch primário (~20px threshold, pointer capture); arrow keys só PWA web (não requerido no RN); restart one-tap; tap targets >=44x44pt.
FR13: Feel suite MVP completa: haptics escalados (3 light, 6 medium, 12+ heavy); visual punch (overshoot+snap, flash+partículas, splash escala com valor); directional shake (~2ms médio, ~5ms grande, teto ~8ms); bullet time ~200ms no maior merge da sessão com flash.
FR14: Reduced Motion desliga/suaviza shake e bullet mantendo haptics+som.
FR15: Tutorial primeira sessão skippable: 3 guided moves (1+2 primeiro, depois 1-célula); Clean mínimo; Accelerated com ajudas contextuais; tone/identity screen ~2s skippable ("control over chaos").
FR16: Progressão v1 sem levels: endless 4x4; progressão = ceiling-tier ladder intra-run + best chase inter-runs; record milestone só número, sem evento.
FR17: Replay v1: score chase por lane, persistência best+stats, restart "one more", variância Adaptive Spawn. v2 diferido: Daily Puzzle 2 variantes (N-move sem leaderboard; fixed-seed com leaderboard), boards 3x3/5x5/6x6, Grave of Stones, Unearth, named tiers, cosmetics pagas, sound suite completa, celebrações.
FR18: Fairness: spawn nunca "ajuda/pune" além do ceiling tier; sem solve-gating (qualquer board com par fundível é jogável).
FR19: Arte "Mineral Quente" v1: slate escuro, 13 tiers cor (1 Areia pálida ... 3072+ Núcleo incandescente), 1/2 cores distintas, chamfer lapidary, grain sutil, sans medium-heavy numerais grandes (4+ dígitos ~13pt), merges por shape/texto além de cor (daltônicos), themes light/dark/color-blind free, ícone/store sem semelhança Threes.
FR20: Áudio MVP: SFX mínimos merge/spawn/game-over, timbre "Cálido/Orgânico" (thock madeira, não Threes), escala com valor acoplada a haptics; sem música; identidade completa é hipótese a validar em playtest (v2).
FR21: Monetização (só Accelerated, só entre games nunca durante): rewarded ads undo (1/game) + continue (1/gameover); IAP Hint 5-pack $0.99/R$4.90, Undo 3-pack $0.99/R$4.90, No Ads+Unlimited $2.99/R$14.90; purchase-at-pain; nada comprável altera spawn/merge/score.
FR22: Plataforma RN+Skia iOS touch-first offline installable; PWA secundária sem paridade mandatória; persistência app storage + settings.
FR23: Telemetry: Crashlytics, eventos funil retenção/receita, GDPR consent, ATT prompt.
FR24: Store publication: ícone/screenshots identity-first, metadata, age rating, IAP/ads declarations, privacy policy URL pública.

Total FRs: 24

### Non-Functional Requirements

NFR1: 60 FPS sustained em sessão 10min com merges/spawns/feel em iOS alvo.
NFR2: Offline-capable, full play sem conexão.
NFR3: Startup e restart instantâneos; sem loading screens na sessão.
NFR4: Touch-first portrait+landscape; keyboard não requerido no RN.
NFR5: Acessibilidade: targets >=44pt, screen reader, WCAG AA em todos themes, Reduced Motion iOS, shape-beyond-color.
NFR6: Crash-free sessions (Crashlytics).
NFR7: Retention north-star: primeiro merge ~20s, primeiro game over <=3min na primeira sessão.
NFR8: D1 retention [ASSUMPTION TBD]; calibração late-game por mediana max tile e duração; funil receita (ad completion, IAP rate, % Accelerated); conversão store.
NFR9: Counter-metrics (não otimizar): sem inflação de score, sem ad interrompendo play, sem pressão de morte no Clean.
NFR10: Certificação: IAP/ads declarations, age rating, privacy URL antes de submit.
NFR11: Self-contained offline, sem CDN; assets PNG 180/192/512; SFX mínimos.
NFR12: Spawn curve configurável para playtest.
NFR13: iOS first; Android futuro mesmo RN; web PWA congelada legada.
NFR14: Preview window contígua máx 3 valores; regra exata de seleção TBD em UX/playtest.
NFR15: Som minimal = SFX curtos não-musicais.

Total NFRs: 15

### Additional Requirements / Constraints

- No 2048-style (sem 2+2=4, sem 1+1).
- Sem backend/contas/multiplayer — client-side offline.
- Sem interstitial/forçado durante gameplay em qualquer lane.
- Nome "Tríade" com clearance INPI/store 2026-08-07, confirmação final no submit.
- Lane choice per-game, default = última.
- Debug panel superado por telemetry no RN.
- MVP IAP pricing fixo; launch discounts diferidos.
- D-011: feel completo no MVP supera PRD §5; D-012 Mineral Quente promovido v2->v1; D-013 scoping RN-only vs web congelada.

### GDD Completeness Assessment

GDD v1.0 completo e claro; 2 TBDs explícitos não-bloqueantes (D1 target numérico, preview window rule). Decisões D-001..D-017 rastreadas. Pronto para cobertura por epics.

## Epic Coverage Validation

### Coverage Matrix (GDD -> Epics FR1-49)

| GDD | Requisito resumido | Epic Coverage | Status |
|-----|-------------------|---------------|--------|
| FR1 | Board 4x4, 9 tiles | Epic1 / FR1 | ✓ Covered |
| FR2 | 1-célula, merge-once, sem cascata | Epic1 / FR1, Epic2 / FR10 | ✓ Covered |
| FR3 | Merge 1+2, iguais>=3, série | Epic1 / FR1 | ✓ Covered |
| FR4 | Spawn só efetivo, random vazio | Epic1 / FR1, Epic2 / FR10 | ✓ Covered |
| FR5 | Base 40/40/20 | Epic2 / FR6 (auto-balance!) | ⚠️ Divergente — ver abaixo |
| FR6 | Adaptive tiers + halving + configurável | Epic2 / FR7-FR9 | ⚠️ Divergente — thresholds diferentes |
| FR7 | Preview 60/40 ambas lanes | Epic7 / FR41-FR45 | ✓ Covered |
| FR8 | Score/best/5 stats imediatos | Epic1 / FR1+FR4, Epic6 / FR25 | ✓ Covered |
| FR9 | Game-over full+sem par, fade, restart | Epic6 / FR25-FR27 | ✓ Covered |
| FR10 | Two lanes + default + leaderboards separados + HUD Clean | Epic3 / FR11-FR15 + FR46-FR47 | ✓ Covered |
| FR11 | Undo/hint/continue só Accelerated | Epic3 / FR13, Epic4 / FR16-FR18+FR49 | ✓ Covered |
| FR12 | Swipe ~20px, PWA keys, 44pt | Epic1 S1.6 + Epic9 / FR28 | ✓ Covered |
| FR13 | Feel completo | Epic8 (8.1-8.4) | ✓ Covered |
| FR14 | Reduced Motion | Epic8+9 / FR30 | ✓ Covered |
| FR15 | Tutorial 3 moves + tone 2s | Epic5 / FR21-FR24 | ✓ Covered |
| FR16 | Sem levels, endless + ladder | Epic1 escopo implícito | ✓ Covered (implícito, sem story "no-levels") |
| FR17 | Replay v1 + v2 diferido | Epic3 / FR14 + Out-of-scope | ✓ Covered |
| FR18 | Fairness spawn | Epic2 S2.6 + ADR lane wall | ✓ Covered (parcial, sem teste explícito "never helps") |
| FR19 | Mineral Quente 13 tiers + shape + 3 temas | Epic11 / FR38 + Epic9 / FR31-FR32 | ✓ Covered |
| FR20 | SFX mínimos, sem música | Epic8 S8.6 | ✓ Covered |
| FR21 | Monetização só Accelerated/entre games | Epic3 / FR15 + Epic4 / FR16-FR20 | ✓ Covered |
| FR22 | RN+Skia iOS offline installable | Epic1 / FR4-FR5 | ✓ Covered |
| FR23 | Telemetry Crashlytics/funis/GDPR/ATT | Epic10 / FR33-FR36 | ✓ Covered |
| FR24 | Store publication | Epic10 / FR37 + Epic11 / FR38-FR40 | ✓ Covered |

### Missing / Divergent Requirements

#### 🔴 CRÍTICO 1 — Thresholds do Adaptive Spawn divergem (GDD vs Epics)

- GDD FR6: `<48->[3]; >=48->[3,6]; >=96->[+12]; >=192->[+24]; >=384->[+48]; >=768->[+96]`
- Epics FR7 + Story 2.1/2.3: `<192->[3]; >=192->[3,6]; >=384->[+12]; >=768->[+24]; >=1536->[+48]; >=3072->[+96]` (deslocado 4x para cima)
- Impacto: curva 4x mais conservadora — big-merge chega muito mais tarde; calibração late-game (mediana max tile) e north-star pacing invalidados; testes de Story 2.3/2.4 travam a escada errada.
- Recomendação: alinhar antes do Phase 4 — ou GDD atualiza para escada 192-base (com justificativa playtest) ou Epics voltam para escada 48-base. Não codar com duas verdades.

#### 🔴 CRÍTICO 2 — Auto-balance 1/2 não existe no GDD

- Epics FR6: `w1=40-4*(count1-count2), clamp [8,72]` — GDD FR5/FR6 dizem **fixos 40/40**.
- Impacto: muda tensão late-game (GDD: "1/2 nunca param, dificuldade preservada"); viola fairness "spawn nunca ajuda além do ceiling"; Story 2.2/2.6 e gate 2.7 assumem fórmula que o design não aprovou.
- Recomendação: decidir — remover auto-balance dos Epics OU aprovar via addendum GDD com rationale + impacto em P1/P3.

#### 🟡 FRs em Epics sem contraparte literal no GDD (extensões, não gaps)

- FR46-FR49 (UX-2026-09-04 carries: Lane Select menu, leaderboard Melhores/Recentes, pause puro, hint destaca par) — na verdade refinam GDD FR10/FR11; rastreáveis, OK.
- NFR10-NFR17, ADR-01..ADR-11, UX-DR1..DR15 — detalham NFRs do GDD; OK, mas ADR/NFR devem virar fonte única (project-context já reflete).

### Coverage Statistics

- Total GDD FRs: 24
- FRs covered nominalmente: 24/24 (100%)
- Cobertura real ajustada por divergência semântica: 22/24 (91.7%) — 2 críticos acima bloqueiam Phase 4 até resolução
- Epics FRs totais: 49 (26 de plataforma + 23 de produto); nenhum GDD FR órfão sem epic

## UX Alignment Assessment

### UX Document Status

FOUND — `ux-designs/ux-3-clone-2026-09-04/` (status final, updated 2026-09-04): DESIGN.md (370 linhas, tokens Mineral Quente + chrome contract) + EXPERIENCE.md (269 linhas, IA + 5 key flows) + reviews (a11y, hud, input, rubric) + validation-report + 10 mockups. Versão 08-07 superada — ignorada.

### Alignment Issues

**UX ↔ GDD: ALINHADO.**
- UX cita GDD como source; Lane Select=menu, Jogar 1-tap, leaderboards por lane Melhores/Recentes, pause puro, preview 60/40 ambas lanes sem alterar spawn, feel full-suite MVP (D-011), Mineral Quente, tone ~2s, RM preset mantendo haptics+som — tudo espelha GDD.
- Open items UX = mesmos TBDs do GDD (preview window-selection rule, D1 numérico, calibração feel, hipótese áudio) — marcados [ASSUMPTION]/[NOTE FOR UX], não divergência.
- Evidência extra p/ Crítico 1: flow Théo diz "768 ceiling → pot abre 96" = escada GDD 48-base, NÃO escada 192-base dos Epics. UX reforça GDD.

**UX ↔ Architecture: ALINHADO.**
- Arch v1.1 (2026-09-05) traz "UX Delta 2026-09-04 (D-008)": Custom Actions + D-pad em `src/a11y`, Pan só no board, banda landscape 56pt congelada, chrome state contract, RM preset total, bloom ceiling — todos espelham UX-DR/EXPERIENCE.
- Patterns N1 Adaptive Spawn Resolver (fixed 40/40 1/2, ceiling→tier→pot halving 20%), Ambiguous Preview +16pt/chip/no-feel, Guaranteed VO Path, Deterministic Input Edge — cobrem UX preview card, VO three-finger+actions+D-pad, swipe ~20pt dominant-lock, 44pt, score→preview→best.
- Sem UI sem suporte arch: menu, HUD portrait/landscape, game-over retrato, leaderboard skeleton, settings stacked, reward prompt moment-of-pain — todos mapeados em sistemas/padrões.

### Warnings

- Usar só UX 09-04; 08-07 arquivada para evitar mistura (mockups e review-hud-input antigos).
- Global leaderboard é v2 com backend — colide com boundary offline/no-accounts; IA atual corretamente local-only.
- Nenhum gap arch↔UX bloqueante. O bloqueio segue nos 2 críticos GDD↔Epics (arch alinha com GDD, não com Epics auto-balance/escada-192).

## Epic Quality Review

### Epic Structure Validation

| Epic | Player value? | Independente? | Notas |
|------|---------------|---------------|-------|
| E1 Plataforma jogável | ✅ "instala, joga offline 4x4" | ✅ standalone | S1.1 spike = starter template (Expo 57 blank-TS + benchmark no mesmo PR) — conforme |
| E2 Adaptive Spawn | ✅ "cresce com jogador" | ✅ só precisa E1 | Qualidade alta, mas carrega Críticos 1-2 |
| E3 Lanes+Menu+Boards | ✅ escolha Pura/Iniciante | ✅ usa E1-E2 | FR46-47 UX carries bem integrados |
| E4 Monetização | ✅ "recupera por escolha" | ✅ precisa E3 (ordem correta) | FR49 hint no epic certo |
| E5 Tutorial | ✅ first-merge 20s | ✅ só precisa E1 (posicionado após E4 sem depender) | OK |
| E6 Falha+Pausa | ✅ 1-tap restart | ✅ | FR48 pause puro correto |
| E7 Preview | ✅ planeja próxima peça | ✅ precisa E2 (backward OK) | Invariante 7.4 excelente |
| E8 Feel | ✅ merge vira evento | ✅ precisa E1 | Presets como dados, RM-aware |
| E9 Acessibilidade | ✅ todo corpo joga | ✅ | VO path garantido + 44pt + WCAG AA |
| E10 Telemetry | ⚠️ owner-value (Eduardo), não player-direto | ✅ | Exceção aceita — produção exige; não conta como "technical milestone" inválido |
| E11 Store | ⚠️ owner-value | ✅ | Exceção aceita — release epic |

Nenhum Epic N requer Epic N+1. Sem dependência circular.

### Story Quality

- Formato: todas com As a / I want / So that + Given/When/Then testável e específico (números: ~20pt, 44pt, 56pt, 12pt gap, 1 free+3 ads, 200ms, 2/5/8ms, pot=20 epsilon). Sem "player can move" vago.
- Sizing: stories entregam incremento jogável/testável; nenhuma epic-sized. Data-na-hora-certa: spawnConfig em 2.5 (não upfront), persistência em 1.4, budgets por match morrem com match.
- Traceabilidade: FR Coverage Map + "FRs covered" por epic — exemplar.

### Dependency Analysis

- Within-epic: sequências 1.1→1.7, 2.1→2.7, 3.1→3.5 etc. só usam outputs anteriores. Sem "depends on 1.4" a partir de 1.2.
- 🟠 MAJOR — Forward dependency: Story 2.7 (Epic 2, gate de calibração) cita "telemetria 10.2/10.3 (first-merge p50, max-tile mediana...)" — depende de Epic 10 ainda não implementado. Remediação: reescrever 2.7 para observação manual de playtest OU mover gate para depois de E10 OU split (2.7a define thresholds; E10 alimenta dados).
- 🟡 MINOR — S1.7 legibilidade landscape pertenceria semanticamente a E9, mas posicionada em E1 por conveniência de layout; FR30 split E8/E9 com ownership duplo; S2.1/S2.3 duplicam escada 192-base (amplifica superfície de fix do Crítico 1 — corrigir nos dois).

### Best Practices Compliance

- [x] Player value (E10/E11 como exceções justificadas de produção)
- [x] Independência de epics
- [x] Stories dimensionadas
- [ ] Sem forward deps — 1 violação (2.7→10.2/10.3)
- [x] Dados quando necessários
- [x] ACs claros
- [x] Traceabilidade FR

### Quality Verdict

Nenhuma violação crítica estrutural. 1 major (2.7 forward ref) + 2 minors — nenhum bloqueia Phase 4 sozinho, mas o major deve ser reescrito junto com os Críticos 1-2 de cobertura.

## Summary and Recommendations

### Overall Readiness Status

**NOT READY** — não iniciar Phase 4 até resolver os 2 críticos de spawn.

### Critical Issues Requiring Immediate Action

1. **Escada Adaptive Spawn (GDD 48-base vs Epics 192-base)** — S2.1/S2.3/FR7 travam curva 4x conservadora; UX Théo confirma GDD. Escolher uma verdade e corrigir nos 3 lugares (GDD ou Epics+stories+gate 2.7).
2. **Auto-balance 1/2 (FR6, S2.2/S2.6) sem aprovação de design** — GDD diz fixo 40/40; arch diz fixed 40/40. Remover dos Epics OU aprovar via addendum (rationale P1/P3 + impacto fairness).
3. **Story 2.7 depende de Epic 10 (forward ref)** — reescrever para playtest manual ou mover para pós-E10.

### Recommended Next Steps

1. Eduardo decide escada (recomendo manter GDD 48-base — UX e arch já alinhados nela) e atualiza Epics FR7 + S2.1/S2.3/S2.4 + gate 2.7 no mesmo PR.
2. Eduardo decide auto-balance: corte (volta a 40/40 fixo) ou addendum GDD + project-context; se cortar, simplifica S2.2 para teste de 40/40/20.
3. Reescreve S2.7 sem citar 10.2/10.3 (ex: "first-merge p50 observado em playtest com cronômetro") ou marca como pós-E10.
4. Re-run readiness (só steps 3+5) após fix; depois libera S1.1 spike.
5. Arquiva `ux-3-clone-2026-08-07/` e `gdds/.../epics.md` stub (rename `_deprecated/`) para evitar futura mistura.

### Final Note

Assessment identificou 5 issues (2 críticas, 1 major, 2 minors) em 3 categorias (cobertura, UX-arch, qualidade). GDD/UX/Arch estão sólidos e alinhados; Epics estão bem estruturados mas carregam as 2 divergências semânticas. Corrigidos os críticos, o pacote vira READY.

**Date:** 2026-09-06 — Assessor: Game Producer/Scrum Master (gds-check-implementation-readiness)
---
stepsCompleted: ["step-01-document-discovery", "step-02-gdd-analysis", "step-03-epic-coverage-validation", "step-04-ux-alignment", "step-05-epic-quality-review", "step-06-final-assessment"]
---
