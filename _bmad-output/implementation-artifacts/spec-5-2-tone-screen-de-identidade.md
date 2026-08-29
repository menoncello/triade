---
title: '5.2 Tone screen de identidade'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: 'b6533ccfcc06ef06567a7017cba101ce3c03843d'
final_revision: '5dc0c3ea82f8ea4ef2928db714c263a62af47fc6'
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

**Problem:** No primeiro launch falta um momento breve de identidade que fixe a promessa "controle sobre o caos" antes do jogo; sem ele a marca não ancora e veteranos não recebem o beat mínimo de atmosfera.

**Approach:** Adicionar uma tone screen ~2s só no primeiro launch: dark slate com um tile grande incandescente acendendo e a linha única "controle sobre o caos", skippable por tap em qualquer lugar, auto-avanço pausado enquanto VoiceOver/anúncio está em voo, e nunca mais exibida após vista.

## Boundaries & Constraints

**Always:** Dark slate (`#1a1d23` ou token canônico) com um tile grande incandescente (bevel + glow sutil) acendendo ao centro; single line "controle sobre o caos" PT com `// TODO 5.4: t('tone.line')` waiver — story 5.4 cataloga, NEVER criar catalog aqui; ~2s auto-advance (2000ms) via timer RN; tap em qualquer lugar dismissed imediatamente e persiste flag `hasSeenToneScreen=true`; first launch only — hydration lê flag e se true nunca renderiza tone screen; auto-advance PAUSA enquanto `AccessibilityInfo.isScreenReaderEnabled()` true ou `announcementFinished` pendente — não avança até VoiceOver liberar; timer limpo em unmount; screen-state machine `tone → laneSelect → playing` (tone é root quando flag false); tone screen é non-informational title beat — isento de no-time-pressure; acessibilidade `accessibilityLabel` e `accessible` corretos; safe-area via `react-native-safe-area-context` com `SAFE_MARGIN`; `screen` nunca trava — skip e timer sempre liberam para `laneSelect`.

**Block If:** Exigir novo SDK nativo, asset externo ou CDN para o tile incandescente (usar View/StyleSheet + tokens existentes); exigir texto EN catalogado agora (isso é 5.4).

**Never:** Travar jogo após skip (laneSelect deve ficar imediatamente interativo); paredes de texto ou onboarding além da single line; lógica de tutorial (5.1) ou ajuda contextual (5.3) dentro da tone screen; duplicar regras de engine ou spawn; timers que vazem após unmount; segundo tap target além do screen inteiro; persistir via engine — apenas Settings/MMKV.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch, flag false | `hasSeenToneScreen===false`, hydration ready | Tone screen renderiza: dark slate, tile incandescente, copy, 2s timer ativo | Se flag ausente → default false (mostra) |
| Tap skip anywhere | tone screen ativo, tap em qualquer lugar da tela | Dismiss imediato, `hasSeenToneScreen=true` persistido, `screen='laneSelect'` no próximo render | `saveSettings` falha → sessão avança mesmo assim, próximo launch pode re-exibir (idempotente) |
| Auto-advance 2s | sem interação por 2000ms, VoiceOver off | Dismiss automático, flag persistida, `screen='laneSelect'` | Timer limpo se skip antes |
| VoiceOver active | `isScreenReaderEnabled()===true` no mount | Timer não inicia até VoiceOver desligar ou anúncio terminar; screen permanece, skip por tap continua funcionando | Poll/listen best-effort try/catch, nunca bloqueia skip |
| Announcement in flight | `announcementFinished` pending (iOS) | Timer pausado até `announcementFinished` disparar, então reinicia/continua contagem | Listener removido em unmount, fallback timeout 5s para não travar se evento não vier |
| Returning launch, flag true | `hasSeenToneScreen===true` | Tone screen nunca renderiza; app abre direto em laneSelect | Fallback: flag ausente → false (mostra) |
| Hydration failure | `loadSettingsFromStorage` falha | Usa DEFAULT (`hasSeenToneScreen:false`), sessão jogável, tone screen exibido por padrão | Log e continua |
| Persist failure | `saveSettings` falha ao marcar visto | Sessão avança para laneSelect em memória, próximo launch pode re-exibir (idempotente) | Log, não bloqueia navegação |
| Unmount mid-timer | navegar/skip antes de 2s | Timer limpo, listener removido, sem leak | cleanup síncrono |

</intent-contract>

## Code Map

- `triade/src/ui/ToneScreen.tsx` -- NOVO componente presentacional: `ToneScreenProps { insets: EdgeInsets; onDismiss: () => void }`, dark slate, tile incandescente central, copy "controle sobre o caos" com `// TODO 5.4: t('tone.line')`, `Pressable` full-screen skippable, timer 2000ms com pausa VoiceOver/announcement, a11y, safe-margin
- `triade/src/services/storage/schema.ts:1-64` -- `Settings` + `DEFAULT_SETTINGS` + `loadSettings`/`serializeSettings` pure; adicionar `hasSeenToneScreen: boolean` com validação fallback e defaults
- `triade/src/services/storage/settingsStore.ts:1-237` -- `STORAGE_KEYS.hasSeenToneScreen`, `loadSettingsFromStorage`/`saveSettings` per-key JSON; backendOverride para testes; persistir flag first-launch
- `triade/App.tsx:75-900` -- screen-state `Screen = 'tone' | 'laneSelect' | 'playing'`; estado `screen` hidratado: se `settings.hasSeenToneScreen===false` init em `tone` senão `laneSelect`; handler `handleToneDismiss` persiste flag + `setScreen('laneSelect')`; wire `ToneScreen` no render antes de `laneSelect`; sem mutar engine
- `triade/__tests__/storage/schema.test.ts` -- pins existentes; estender para `hasSeenToneScreen` fallback/invalid
- `triade/__tests__/storage/settingsStore.test.ts` -- injected backend tests para `hasSeenToneScreen` persistência per-key
- `triade/__tests__/ui/components/toneScreen.test.ts` -- NOVO react-test-renderer: render (slate, tile, copy, a11y), skip press chama onDismiss, 2s timer mock, safe-margin padding

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/services/storage/schema.ts` -- estender `Settings` com `hasSeenToneScreen: boolean`, `DEFAULT_SETTINGS.hasSeenToneScreen = false`, endurecer `loadSettings` para validar `hasSeenToneScreen` boolean (fallback false se ausente/inválido), `serializeSettings` inclui campo; manter pure sem RN imports
- [x] `triade/src/services/storage/settingsStore.ts` -- adicionar `STORAGE_KEYS.hasSeenToneScreen = '@triade/hasSeenToneScreen'`, persistência per-key JSON igual a `tutorialCompleted`/`laneDefault` (load via `getField` + validação em `loadSettings`, save em `writes` com try/catch por chave); manter `backendOverride` para testes
- [x] `triade/src/ui/ToneScreen.tsx` -- construir componente presentacional full-screen: `Pressable` cobrindo `flex:1` com `onPress: onDismiss`, `accessibilityRole="button"` `accessibilityLabel="Pular"` `accessibilityHint` opcional, `View` tile central (80-120pt diamante/octógono com bevel top-left claro/bottom-right escuro + glow sutil via shadow/elevation) sobre fundo `#1a1d23`, `Text` copy "controle sobre o caos" // TODO 5.4: t('tone.line') em 17-20pt 600 cor `#F2EEE3`, `AccessibilityInfo.isScreenReaderEnabled()` check no mount e listener `announcementFinished` para pausar timer; timer 2000ms via `setTimeout` só quando VoiceOver off e sem announcement pendente, cleanup em unmount; usar `insets`+`SAFE_MARGIN` para padding; sem navegação ou engine
- [x] `triade/App.tsx` -- integrar tone screen orquestrado: ampliar `type Screen = 'tone' | 'laneSelect' | 'playing'`; após hydration, se `loadedSettings.hasSeenToneScreen===false` setar `screen='tone'` senão `'laneSelect'` (antes de `setReady(true)`); implementar `handleToneDismiss = useCallback(() => { setScreen('laneSelect'); const nextSettings={...settings, hasSeenToneScreen:true}; setSettings(nextSettings); void saveSettings(nextSettings); }, [settings])`; no render: se `!ready` loading, else se `screen==='tone'` renderizar `<ToneScreen insets={insets} onDismiss={handleToneDismiss} />` full-screen (com StatusBar), else se `laneSelect` render existente, else `playing`; `handleToneDismiss` limpa timer indiretamente via unmount de ToneScreen; manter todo fluxo existente de tutorial/lane/assistance inalterado quando screen != tone
- [x] `triade/__tests__/ui/components/toneScreen.test.ts` -- react-test-renderer: render mostra fundo slate (`#1a1d23`), tile `testID` existente, texto copy, `onDismiss` chamado em press (full-screen Pressable), timer 2000 mock (`jest.useFakeTimers`) dispara onDismiss quando VoiceOver off, não dispara quando VoiceOver on, cleanup limpa timer em unmount, a11y role/label, safe-margin padding usa `SAFE_MARGIN`

**Acceptance Criteria:**
- Given primeiro launch com `hasSeenToneScreen===false`, when app abre e hydration completa, then tone screen renderiza: fundo dark slate, um tile grande incandescente acendendo e a linha "controle sobre o caos" centrada
- Given tone screen ativo, when toco em qualquer lugar (tap), then dismissed imediatamente e app vai para Lane Select sem delay e `hasSeenToneScreen` persistido true
- Given tone screen sem interação, when 2000ms passam com VoiceOver desligado e sem announcement pendente, then auto-advance para Lane Select e flag persistida
- Given VoiceOver ativo ou announcement em voo, when tone screen está ativo, then timer pausa (não auto-avança) até VoiceOver liberar / `announcementFinished`, mas tap skip continua funcionando imediatamente
- Given returning launch com `hasSeenToneScreen===true`, when app abre, then tone screen nunca aparece e cai direto em Lane Select
- Given qualquer estado da tone screen, when dismissed (tap ou timer), then não vaza timer/listener e Lane Select fica imediatamente interativo

## Spec Change Log

## Review Triage Log

## Design Notes

Tone tile: não criar asset bitmap; View com `borderRadius`/`transform` para octógono facetado, bevel via border colors ou shadow, glow via `shadowColor`/`shadowOpacity`. Copy é non-informational beat. Timer 2s é nominal — spec diz "~2s".

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/storage/schema.test.ts __tests__/storage/settingsStore.test.ts __tests__/ui/components/toneScreen.test.ts --reporter=spec` -- expected: all new pins pass, existing tutorialCompleted/laneDefault pins still pass
- `npm --prefix triade run check -- --noEmit` (tsc --noEmit) -- expected: no type errors
- `npm test -- --reporter=spec 2>&1 | tail -n 50` -- expected: full suite green

**Manual checks (if no CLI):**
- Fresh install → ver tile incandescente + "controle sobre o caos" → tap anywhere dismiss → relaunch não mostra tone → delete storage → tone volta → com VoiceOver on ver timer pausado mas tap dismiss funciona

## Auto Run Result

Status: done

Summary: Tone screen de identidade implementado — ToneScreen dark slate com tile incandescente + copy "controle sobre o caos", ~2s auto-advance pausado por VoiceOver/announcement, tap full-screen dismiss, flag hasSeenToneScreen persistida em Settings/MMKV, screen state tone→laneSelect→playing, 677 tests green, tsc --noEmit clean. No operator actions required.

