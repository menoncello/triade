---
title: '5.3 Ajuda contextual por pista na primeira sessão'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '00fcb57f0ae8409f2775147a82286a508f529cd0'
final_revision: '17d510f2291c2ed238c811036c65c93df29449ff'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md
  - _bmad-output/implementation-artifacts/epic-5-context.md
warnings: []
---

<intent-contract>

## Intent

**Problem:** Sem ajuda contextual por pista, jogadores Iniciante não recebem orientação no momento exato (teto liberando peças maiores, board quase cheio) e jogadores Pura veriam ruído que quebra a pureza P1; a ajuda precisa ser factual, contextual e dispensável sem nunca bloquear o swipe.

**Approach:** Garantir que banners prompt (ceiling indicator + stuck warning) apareçam só na pista Accelerated/Iniciante quando relevantes (`ceiling >= 48`, `emptyCount <= 2`), sejam dispensáveis por tap ≥44pt, nunca apareçam na Clean, usem tom plain-spoken "controle sobre o caos" (factual, never scolding), apareçam só quando relevantes e nunca bloqueiem o jogo (non-gating, FR-22).

## Boundaries & Constraints

**Always:** Banners renderizam como `View` em `AcceleratedAids.tsx` (CeilingBanner, StuckBanner) com `surface-raised` (`#fff7ec`) + borda/accent `#E8A33D` (3pt accent edge), copy muted `#1a1d23` 13pt/500, dismiss `Pressable` com `minWidth/minHeight: HIT_TARGET (44)` e `accessibilityLabel="Dispensar"`, texto PT hard-coded com `// TODO 5.4: t('accelerated.*')` waiver — NEVER criar catalog i18n aqui; gating em `App.tsx` via `profile.showLearningAids` (accelerated true, clean false), `!gameOver`, `!bannerDismissed.*` e relevância (`ceiling >=48`, `emptyCount<=2`); dismiss é per-match memory (`bannerDismissed` state, reset em `resetAssistance`/`handleRestart`/`applyLaneSelection`), não persistido; banners nunca bloqueiam swipe — `GameBoard` gesture permanece ativo, banners são Views fora do `GestureDetector`; Clean nunca monta banners por lane-wall contract (`LANE_PROFILES.clean.showLearningAids===false`).

**Block If:** Exigir persistência de dismissal entre sessões (isso seria Settings/matchStats, não per-match memory — spec atual define per-match die-with-match por ADR-02); exigir nova métrica de "primeira sessão" além de relevance gating (first-session é a semântica de relevância, não flag temporal extra — owner waiver se exigir tempo); exigir novo SDK ou asset externo.

**Never:** Banners na pista Clean/Pura (P1); banner não-dispensável ou com timeout que puna; bloquear swipe/animation gate ou board input enquanto banner visível; duplicar lógica de engine/spawn; scolding copy ("você está travado!") — manter factual "Pouco espaço — procure fusões." / "Teto aberto — peças maiores podem surgir."; mover ajuda para Pause ou Settings.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean lane com teto alto e board quase cheio | `activeLaneId='clean'`, `ceiling=96`, `emptyCount=1` | Nenhum banner renderiza (Clean `showLearningAids=false` wall) | Sem erro — lane-wall contract |
| Accelerated teto >=48, board não lotado | `activeLaneId='accelerated'`, `ceiling>=48`, `emptyCount=5`, `!gameOver`, `bannerDismissed.ceiling=false` | CeilingBanner aparece com texto "Teto aberto — peças maiores podem surgir." | Se `ceilingDetector` falha → sem banner |
| Accelerated board quase cheio | `activeLaneId='accelerated'`, `ceiling=12`, `emptyCount<=2`, `!gameOver`, `bannerDismissed.stuck=false` | StuckBanner aparece com "Pouco espaço — procure fusões." | emptyCount derivado de `board.flat()` — null-safe |
| Ambos relevantes | `ceiling>=48` e `emptyCount<=2` simultâneos | Ambos banners aparecem empilhados (cada dismiss independente) | Dismiss de um não afeta outro |
| Dismiss ceiling | tap Dispensar no CeilingBanner | `bannerDismissed.ceiling=true`, CeilingBanner some, Stuck permanece se ainda relevante | Dismiss é per-match — novo jogo reseta para false |
| Game over ativo | `gameOver===true` mesmo com condições relevantes | Nenhum banner ( `!gameOver` gate) — overlay de game over tem prioridade | Sem banner sobreposto ao overlay |
| Dismiss e novo jogo | banner dispensado, depois `handleRestart`/`resetAssistance` | `bannerDismissed` reset `{ceiling:false, stuck:false}`, banner pode reaparecer se ainda relevante no novo board | Sem persistência cruzada — intencional |
| Tap fora do dismiss | tap no texto do banner mas não no botão × | Banner permanece; apenas o botão 44pt dismiss aciona | `Pressable` apenas no dismiss, banner View não captura swipe |
| Acessibilidade | VoiceOver ativo, banner visível | Banner `accessibilityLabel` "indicador de teto"/"aviso de travamento", botão dismiss `accessibilityRole="button" accessibilityLabel="Dispensar"` ≥44pt | Sem bloqueio de anúncio — banner não pausa timer |

</intent-contract>

## Code Map

- `triade/src/ui/AcceleratedAids.tsx:1-100` -- CeilingBanner, StuckBanner, RewardPrompt; banner presentational com accent edge #E8A33D, surface #fff7ec, copy 13pt, dismiss HIT_TARGET 44, `// TODO 5.4` waivers
- `triade/App.tsx:64,117,788-830` -- gating `showCeilingBanner = profile.showLearningAids && !gameOver && !bannerDismissed.ceiling && ceiling>=48`, `showStuckBanner = profile.showLearningAids && !gameOver && !bannerDismissed.stuck && emptyCount<=2`, render condicional, `bannerDismissed` state per-match + reset em `resetAssistance`/`handleRestart`/`applyLaneSelection` (die-with-match ADR-02)
- `triade/src/game/lanes.ts:31-60` -- `LaneProfile.showLearningAids` (clean false, accelerated true), `profileForLaneId`, LANE_PROFILES wall
- `triade/src/engine/core/ceiling.ts:1-22` -- `ceilingDetector(board)` e `tierForCeiling` usados para relevância
- `triade/__tests__/ui/components/acceleratedAids.test.ts` -- NOVO react-test-renderer: Ceiling/Stuck render, copy, accent, dismiss 44pt, a11y, banner não bloqueia board
- `triade/__tests__/ui/components/app.contextualHelp.test.ts` -- NOVO: App wiring — Clean nunca monta banner, Accelerated contextual gating (ceiling/empty/gameOver/dismiss per-match reset), RewardPrompt não confundido com banner

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/AcceleratedAids.tsx` -- garantir CeilingBanner/StuckBanner com spec-compliant style: `banner` flex row, `backgroundColor #fff7ec`, `borderColor #E8A33D`, `borderRadius 8`, `accent 3pt #E8A33D`, `bannerText` 13/500 #1a1d23, `dismissBtn` `minWidth/minHeight: HIT_TARGET (44)` `accessibilityRole="button" accessibilityLabel="Dispensar"` com `×` 20pt/600, `// TODO 5.4: t('accelerated.*')` ao lado de cada string PT; verificar RewardPrompt não quebrado
- [x] `triade/App.tsx` -- verificar gating `showCeilingBanner`/`showStuckBanner` exatamente como `profile.showLearningAids && !gameOver && !bannerDismissed.* && relevance` (`ceiling>=48` via `ceilingDetector`, `emptyCount = board.flat().filter(v=>v===null).length <=2`), render condicional fora do `GestureDetector` (não bloqueia swipe), `bannerDismissed` reset em `resetAssistance` (189-193), `handleRestart` (337-340) e `applyLaneSelection` (reset já em 193); Clean nunca passa profile true — patched applyLaneSelection else branch to reset even without active match (per-match die-with-match)
- [x] `triade/src/game/lanes.ts` -- pin `showLearningAids` wall: `LANE_PROFILES.clean.showLearningAids===false`, `accelerated.showLearningAids===true` já existe, garantir não regressão
- [x] `triade/__tests__/ui/components/acceleratedAids.test.ts` -- criar teste presentational: render CeilingBanner/StuckBanner verifica texto PT correto, `accessibilityLabel` banner, botão Dispensar com `accessibilityRole button` e `minHeight>=44`/`minWidth>=44` via collectStyles/hasStyle, accent edge `backgroundColor #E8A33D` e `borderColor`, `onDismiss` chamado em press, banner não tem `onMove` lógica, safe para VoiceOver
- [x] `triade/__tests__/ui/components/app.contextualHelp.test.ts` -- criar wiring test: mock `ceilingDetector` tier e board `emptyCount`, verificar Clean nunca monta `CeilingBanner`/`StuckBanner` mesmo com `ceiling=96 empty=1`; Accelerated com `ceiling>=48` monta Ceiling, `empty<=2` monta Stuck, `gameOver` suprime ambos, dismiss per-match (simula `bannerDismissed` setter) remove banner mas novo jogo re-monta se ainda relevante; verificar banner fora do GestureDetector (não bloqueia `panGesture`)

**Acceptance Criteria:**
- Given pista Clean com teto 96 e board quase cheio, when jogo renderiza, then nenhum Ceiling/Stuck banner aparece (lane-wall)
- Given pista Accelerated com `ceiling>=48` e `!gameOver` e não dispensado, when HUD/board renderiza, then CeilingBanner aparece com "Teto aberto — peças maiores podem surgir." factual e dispensável
- Given pista Accelerated com `emptyCount<=2` e `!gameOver` e não dispensado, when renderiza, then StuckBanner aparece com "Pouco espaço — procure fusões." factual e dispensável
- Given ambos relevantes, when Accelerated, then ambos banners aparecem empilhados e cada Dispensar remove só o seu (independentes)
- Given banner dismissado e novo jogo iniciado (restart ou troca de pista com reset), when novo board ainda relevante, then banner pode reaparecer (per-match memory, não persistido)
- Given game over ativo, when overlay visível mesmo com condições relevantes, then nenhum contextual banner aparece (não sobrepõe overlay)
- Given banner visível, when swipe no board, then board responde normalmente — banner nunca bloqueia gesto e botão Dispensar tem alvo ≥44×44pt com a11y label

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low 2)
- addressed_findings:
  - none

### Notes
- Blind review flagged `bannerDismissed` not reset in applyLaneSelection else (no active match) — fixed as patch in this run (setBannerDismissed reset added).
- Edge review flagged broad scolding regex matching borderRadius — test narrowed to copy-only (already patched before review commit); classified as reject (test harness, not product).

## Design Notes

Banner é `surface-raised` strip com accent edge — DESIGN.md prompt-banner; copy em `muted` factual nunca scolding (UX-DR-21). Dismiss é per-match memory por ADR-02 (die-with-match) — não é Settings persistido; primeiro-jogo vs dismiss reset é intencional para re-ajudar se o jogador voltar a ficar stuck no próximo jogo.

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/ui/components/acceleratedAids.test.ts __tests__/ui/components/app.contextualHelp.test.ts --reporter=spec` -- expected: novos pins passam, Clean wall e Accelerated gating verdes
- `npm --prefix triade run check -- --noEmit` -- expected: no type errors
- `npm --prefix triade test -- --reporter=spec 2>&1 | tail -n 30` -- expected: full suite green (673+)

**Manual checks (if no CLI):**
- Lane Accelerated → jogar até teto 48 → ver CeilingBanner → Dispensar remove só ele → encher board até 2 vazios → ver StuckBanner → Dispensar → swipe continua livre → Clean mesma situação nunca mostra banner → game over nunca mostra banner

## Auto Run Result

Status: done

Summary: Ajuda contextual por pista 5.3 — banners Ceiling/Stuck Iniciante-only, contextuais (ceiling>=48, empty<=2), dispensáveis 44pt, nunca em Clean, tom factual, per-match memory (die-with-match), não bloqueiam swipe. App.tsx gating + reset patch e suíte 689 tests green (12 novos).

Files changed:
- `triade/App.tsx:217-218` -- reset `bannerDismissed` in applyLaneSelection else (per-match banners can re-appear after lane switch without active match)
- `triade/__tests__/ui/components/acceleratedAids.test.ts` -- presentational pins for Ceiling/Stuck (copy, accent, 44pt, a11y, non-blocking)
- `triade/__tests__/ui/components/app.contextualHelp.test.ts` -- wiring pins for lane-wall, gating, per-match reset, gameOver suppress, no-block

Review findings breakdown: patch 0 (1 pre-fix already applied), defer 0, reject 2 (low — style-word false positive, test harness). No intent_gap/bad_spec.

Follow-up review recommended: false (patch volume low, localized, behavior already covered by 689 tests).

Verification:
- `npm --prefix triade test -- __tests__/ui/components/acceleratedAids.test.ts __tests__/ui/components/app.contextualHelp.test.ts` -- 12 pass
- `npm --prefix triade test` -- 689 pass
- `./triade/node_modules/.bin/tsc --noEmit` (both configs) -- clean

Residual risks: per-match dismiss not persisted — intentional per ADR-02; if product later wants dismissed-forever, migrate to Settings flag (owner decision). Banner not suppressed during active tutorial overlay — could co-exist; product deems non-blocking acceptable.
