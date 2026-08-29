---
title: '5.1 Tutorial de 3 moves guiados'
type: 'feature'
created: '2026-08-29'
status: 'done'
baseline_commit: '9030a5e94b26a77e1f3cbfebe886b27f797a7add'
final_revision: '9030a5e94b26a77e1f3cbfebe886b27f797a7add'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md
  - _bmad-output/implementation-artifacts/epic-5-context.md
warnings: []
---

<intent-contract>

## Intent

**Problem:** Novos jogadores não sabem que `1+2→3` é a regra contra-intuitiva e que tiles movem só uma casa; sem um tutorial jogável o primeiro merge demora e veteranos são forçados a ler antes de jogar.

**Approach:** Adicionar um tutorial skippable de 3 moves guiados que ensina `1+2` primeiro e depois one-cell movement por ação (sem parede de texto), com skip imediato inclusive mid-move, mostrado só no primeiro jogo por pista e com NOOP silencioso.

## Boundaries & Constraints

**Always:** Engine permanece puro (`src/engine` sem RN/React/Skia imports, ADR-01); tutorial é orquestração de app/UI, nunca duplica regras; 3 moves guiados — passo 1 e 2 ensinam `1+2→3`, passo 3 ensina one-cell movement; skippable sempre (botão Pular + gesto Skip libera o board imediatamente, sem gating, UX-DR-26); per-lane — só no primeiro jogo de cada pista (`clean`/`accelerated`) com flag persistida; NOOP durante tutorial é silent control flow (sem spawn/score/turno, UX-DR-23); tap targets ≥44×44pt + safe-area + 16pt SAFE_MARGIN; haptic leve no `1+2→3` do tutorial (expo-haptics Light); strings hard-coded PT com `// TODO 5.4: t('tutorial.*')` waiver — story 5.4 cataloga (NEVER criar i18n catalog aqui).

**Block If:** Alterar spawn/merge/score rules, Adaptive Spawn curve ou `previewFor`/`potForTier` para forçar tutorial (tutorial deve observar engine, não mutar); introduzir novo SDK ads/IAP/telemetry ou modificar entitlements/restore; criar Tone screen (isso é story 5.2).

**Never:** Travas que bloqueiem jogo após skip (board deve ficar imediatamente jogável); texto-wall ou onboarding que impeça veteranos de jogar (FR-22); ajuda contextual de pista (ceiling/stuck banners) — pertence a 5.3; lógica de tempo que puna NOOP ou impeça retry; inline styles com dimensões <44pt para alvos tocáveis; import engine em UI para recomputar merges — usar `moveResult.trace` e `board` do engine.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First game per lane, tutorial not completed | lane `clean` or `accelerated` sem `tutorialCompleted[lane]` | Tutorial ativo no início da partida: passo 1 mostra cue `1+2` | Nenhum — inicia normalmente |
| Veteran skip before first swipe | tutorial ativo, tap "Pular" | Libera board imediatamente, flag `tutorialCompleted[lane]=true` persistida, run padrão inicia, nenhum spawn extra | Se persistência falhar, mantém sessão jogável, próximo launch re-exibe tutorial |
| Skip mid-move (durante animação) | swipe aceito em tutorial, animação em voo, tap Pular | Cancela cues e libera gate `busyRef`, board permanece no snapshot pré-move se move ainda não settled, ou pós-move se já settled — mas nunca duplica merge | `busyRef` reset síncrono, sem deadlock |
| 1+2 merge climax | tutorial passo 1, swipe junta `1` e `2` adjacentes | `move()` efetivo, trace contém merge `1+2→3`, score incrementa, haptic Light dispara, avança para passo 2/3 | Haptic falha silenciosa (nunca bloqueia) |
| One-cell movement teaching | tutorial passo 3, board com tile isolado | Cue instrui mover uma casa; swipe efetivo mostra tile movendo 1 célula, sem merge | Se swipe for NOOP, sem avanço |
| NOOP swipe no tutorial | swipe que não muda board (`moved:false`) | Silent: sem spawn, sem score, sem consumo de turno, tutorial permanece no mesmo passo, sem animação punitiva | `moveResult.moved===false` → não consome `rng`, não avança fase |
| Per-lane re-entry | tutorial completado em `clean`, primeiro jogo em `accelerated` ainda não | Tutorial ativo de novo em `accelerated` (flag por pista) | Flag por pista isolada, não cruzada |
| Returning player com flag true | `tutorialCompleted[lane]===true` | Nenhum tutorial; jogo inicia direto | Fallback: flag ausente → false (mostra tutorial) |
| Hydration failure | `loadSettingsFromStorage` falha | Usa DEFAULT + `tutorialCompleted={clean:false, accelerated:false}`, sessão jogável, tutorial exibido por padrão | Log e continua |
| Persist failure | `saveSettings` falha ao marcar completo | Sessão continua completada em memória, próximo launch pode re-exibir (idempotente) | Log, não bloqueia UI |

</intent-contract>

## Code Map

- `triade/src/game/tutorial.ts` -- NOVO módulo puro: `TutorialPhase`, `TutorialState`, `createTutorialState(laneId)`, `nextPhase(state, moveResult)`, `skipTutorial(state)`, `isTutorialActive(state)`, helpers para validar `1+2→3` no trace; sem RN/Skia/engine-mutation imports
- `triade/src/services/storage/schema.ts:1-48` -- `Settings` + `DEFAULT_SETTINGS` + `loadSettings`/`serializeSettings` pure; adicionar `tutorialCompleted: { clean: boolean; accelerated: boolean }` com validação e defaults
- `triade/src/services/storage/settingsStore.ts:4-153` -- `STORAGE_KEYS.tutorialCompleted`, `loadSettingsFromStorage`/`saveSettings` per-key JSON; backendOverride para testes; persistir flags por pista
- `triade/src/ui/TutorialOverlay.tsx` -- NOVO overlay RN: cues por fase (highlight 1+2, seta swipe, texto curto), botão Pular ≥44×44pt, usa `SAFE_MARGIN` + `insets`; `// TODO 5.4: t('tutorial.*')` ao lado de cada string
- `triade/App.tsx:86-700` -- estado `tutorialState`, gating `screen==='playing'` com overlay, integração `doMove`→`nextPhase`, skip handler, per-lane hydration de `tutorialCompleted`, haptic Light no trace `1+2→3`, `busyRef` release no skip, NOOP guard
- `triade/src/engine/core/index.ts` -- re-export já existente para `Board`, `MoveResult`, `TraceEntry` usados pelo tutorial sem importar engine em UI além do já permitido
- `triade/__tests__/game/tutorial.test.ts` -- NOVO pure tests: phase transitions, skip, per-lane, NOOP não avança, 1+2 detection via trace
- `triade/__tests__/storage/schema.test.ts` -- pins existentes para `loadSettings` laneDefault; estender pins para `tutorialCompleted` fallback/invalid
- `triade/__tests__/storage/settingsStore.test.ts` -- injected backend tests para `tutorialCompleted` persistência per-key
- `triade/__tests__/ui/components/tutorialOverlay.test.ts` -- react-test-renderer: cues por fase, Pular a11y + 44pt, skip callback, safe-margin padding

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/tutorial.ts` -- criar módulo puro de tutorial: `export type TutorialPhase = 'merge12' | 'merge12_followup' | 'oneCell' | 'completed' | 'skipped'`, `export interface TutorialState { laneId: LaneId; phase: TutorialPhase; stepIndex: number }`, `createTutorialState(laneId)`, `isTutorialActive(s)`, `skipTutorial(s):TutorialState`, `nextPhase(s, moveResult):TutorialState` que só avança se `moveResult.moved===true` e trace valida a condição da fase (fase merge12 exige merge `1+2→3` — `from` com valores 1 e 2 e `value===3`; fase followup aceita qualquer effective move; fase oneCell aceita qualquer effective move e então completa); nunca importa RN/Skia; sem mutar engine
- [x] `triade/src/services/storage/schema.ts` -- estender `Settings` com `tutorialCompleted: { clean: boolean; accelerated: boolean }`, `DEFAULT_SETTINGS.tutorialCompleted = { clean:false, accelerated:false }`, endurecer `loadSettings` para validar objeto `tutorialCompleted` (fallback por campo para default se ausente/inválido), `serializeSettings` inclui o campo; manter `loadSettings` host-testável e sem imports RN
- [x] `triade/src/services/storage/settingsStore.ts` -- adicionar `STORAGE_KEYS.tutorialCompleted`, persistência per-key JSON igual a `laneDefault` (load/save/validação), `loadSettingsFromStorage` lê e valida via `schema.loadSettings`, `saveSettings` persiste `tutorialCompleted` sob sua chave com try/catch por chave; manter `backendOverride` para testes; nunca misturar com engine
- [x] `triade/src/ui/TutorialOverlay.tsx` -- construir overlay presentacional: props `{ phase: TutorialPhase; insets: EdgeInsets; onSkip: ()=>void }`, container `View` absolute `zIndex:3` `pointerEvents:"box-none"` (cues) + botão Pular `Pressable` `minHeight:HIT_TARGET (44)` `minWidth:HIT_TARGET` `accessibilityRole="button" accessibilityLabel="Pular tutorial"` sobreposto com `pointerEvents:"auto"`; por fase renderiza texto curto hard-coded PT com `// TODO 5.4: t('tutorial.*')` ao lado (merge12: "Junte 1 e 2 para fazer 3 — deslize eles juntos", followup: "De novo — 1+2" / oneCell: "Agora mova uma peça uma casa"); usa `insets.top+SAFE_MARGIN` / `insets.bottom+SAFE_MARGIN` para posicionar botão sem sobrepor notch; sem lógica de board/merge além de exibir cues
- [x] `triade/App.tsx` -- integrar tutorial orquestrado: após hydration (`ready`), derivar `tutorialState: TutorialState | null` — null quando `settings.tutorialCompleted[activeLaneId]===true` ou já skipped/completed; inicializar com `createTutorialState(activeLaneId)` no `handleJogar` / `applyLaneSelection` quando flag false; em `doMove`, após `setMoveResult(result)`, se tutorial ativo e `result.moved`, computar `next = nextPhase(tutorialState, result)` e `setTutorialState(next)`, disparar `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` somente quando trace contém `1+2→3` merge (best-effort try/catch, nunca bloqueia), quando `next.phase==='completed'` persistir `tutorialCompleted` via `saveSettings` e limpar overlay no próximo render; em `handleSkipTutorial` setar `skipTutorial` + persistir flag + `busyRef.current=false` imediato (mid-move release) + `setMoveResult(null)` se necessário para liberar gate; NOOP (`result.moved===false`) nunca altera tutorialState nem consome tutorial step; `LaneSelectScreen` e `GameOverOverlay` inalterados
- [x] `triade/__tests__/game/tutorial.test.ts` -- pure unit tests para máquina de fases: create→merge12, avanço só com 1+2 merge, followup aceita qualquer moved, oneCell completa, NOOP não avança, skip→skipped, completed/skipped não regridem, per-lane state isolado, pureza (sem RN imports via stripComments guard)
- [x] `triade/__tests__/ui/components/tutorialOverlay.test.ts` -- react-test-renderer tests: render por fase mostra texto correto, botão Pular com a11y label/role e 44pt (`hasStyle` + `collectStyles` com `minHeight>=44`), `onSkip` chamado em press, padding usa `SAFE_MARGIN`, `pointerEvents` do container vs botão, não renderiza quando phase completed/skipped

**Acceptance Criteria:**
- Given primeiro jogo em pista sem tutorial completado, when inicio o jogo, then overlay de tutorial aparece guiando 3 moves: `1+2` primeiro e depois one-cell movement, sem parede de texto, e o clímax é eu deslizar `1` e `2` juntos e ver o `3` com haptic leve
- Given tutorial ativo, when toco "Pular" (inclusive mid-move durante animação), then board libera imediatamente e run padrão inicia sem gating nem spawn extra
- Given tutorial completado em uma pista, when jogo na outra pista pela primeira vez, then tutorial aparece de novo (per-lane)
- Given veterano com tutorial já completado (flag true), when abro novo jogo na mesma pista, then nenhum tutorial aparece e jogo inicia direto
- Given swipe NOOP durante tutorial, when gesto não muda board, then sem spawn, sem score, sem turno consumido e tutorial permanece no mesmo passo
- Given merge `1+2→3` no passo guiado, when trace confirma merge `1+2` para `3`, then tutorial avança de fase e dispara haptic Light (silencioso se falhar)

## Spec Change Log

## Review Triage Log

## Design Notes

Board para tutorial: não forçar board scriptado no engine; tutorial observa board aleatório mas destaca (overlay) as peças `1`/`2` adjacentes quando existirem; se RNG não entregar adjacência `1/2` no board inicial, o cue genérico "procure 1 e 2" permanece — a spec não exige gerar board determinístico. Haptic usa `expo-haptics` já pinned no SDK 57; chamar `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` best-effort. A flag por pista evita veterano re-ver tutorial ao trocar de pista; `tutorialCompleted` é Settings, não per-match budget.

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/game/tutorial.test.ts __tests__/storage/schema.test.ts __tests__/storage/settingsStore.test.ts __tests__/ui/components/tutorialOverlay.test.ts --reporter=spec` -- expected: all new pins pass, existing laneDefault pins still pass
- `npm --prefix triade run check -- --noEmit` (tsc --noEmit) -- expected: no type errors
- `npm test -- --reporter=spec 2>&1 | tail -n 50` -- expected: full suite green (no engine pure violations)

**Manual checks (if no CLI):**
- Launch app → Lane Select → Jogar em pista clean primeira vez → ver cue 1+2 → swipe NOOP → sem avanço → swipe 1+2→3 com vibração leve → fase 2/3 → Pular mid-move libera instantaneamente

## Auto Run Result

Status: done

Summary: Tutorial de 3 moves guiados implementado com maquina de fases pura, overlay skippable com 44pt e per-lane persistence. Validado por 673 tests (full suite green) e tsc clean em commit 032f2d8.
