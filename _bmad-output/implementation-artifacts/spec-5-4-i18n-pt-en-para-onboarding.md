---
title: '5.4 i18n PT/EN para onboarding'
type: 'feature'
created: '2026-08-29'
baseline_commit: 'd7cf9e32b641caca5a7d03788d65a220cc35dff1'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md
  - _bmad-output/implementation-artifacts/epic-5-context.md
warnings: []
---

<intent-contract>

## Intent

**Problem:** Onboarding ainda está com strings PT hard-coded espalhadas (`LaneSelect`/`TutorialOverlay`/`ToneScreen`/`AcceleratedAids`/`GameOverOverlay`) — sem catálogo PT/EN o jogador EN não entende regras e o build viola NFR-13/UX-DR-22 (todo copy via `t('key')`, strings nunca vazam para o engine).

**Approach:** Criar a camada i18n v1 (i18next + react-i18next + expo-localization SDK 57) com catálogo PT/EN para onboarding (tutorial, tone line, lane names + aids/game-over chrome), plugar `t()` em todos os componentes onboarding marcados `// TODO 5.4`, detectar locale do device via `expo-localization` e persistir/escutar `Settings.language` para troca imediata em Settings.

## Boundaries & Constraints

**Always:** Usar versões pinadas da matriz: `i18next 26.3.6` + `react-i18next ^15` + `expo-localization` SDK 57 (`npx expo install expo-localization`); criar `triade/src/i18n/` com `index.ts` (init i18next: `supportedLngs ['pt','en']`, `fallbackLng 'en'`, `interpolation escapeValue false`, resources importados de `locales/pt.json` e `locales/en.json`), `locales/pt.json` e `locales/en.json` cobrindo chaves `tutorial.*`, `tone.line`, `lane.clean.*`, `lane.accelerated.*`, `accelerated.*`, `gameOver.*`, `common.*`; detectar locale inicial via `getLocales()[0].languageCode` de `expo-localization` (fallback `en` se ausente/unsupported) mas respeitar `Settings.language` persistido quando hidratado; prover hook `useI18nLanguage(settings.language)` que `i18n.changeLanguage` imediato quando `settings.language` muda; validar `Settings.language` como `'pt'|'en'` em `schema.ts` (fallback `en` se inválido); substituir TODAS as strings PT hard-coded nos arquivos onboarding (`triade/src/ui/TutorialOverlay.tsx`, `triade/src/ui/ToneScreen.tsx`, `triade/src/ui/AcceleratedAids.tsx`, `triade/src/ui/GameOverOverlay.tsx`, `triade/src/game/lanes.ts` labels/toneLines, `triade/src/ui/LaneSelectScreen.tsx` título/subtítulo/cards quando aplicável) por `t('key')` via `useTranslation` — remover `// TODO 5.4` waivers; adicionar seletor de idioma em `LaneSelectScreen` (PT/EN toggle ≥44pt) que chama `onLanguageChange('pt'|'en')` → App persiste via `saveSettings` e reflete imediatamente; garantir `src/engine` nunca importa `i18n`/`react-i18next`/`expo-localization` (boundary NFR-13).

**Block If:** Exigir tradução de strings fora de onboarding (HUD score labels gerais, SFX, telemetry) além do catálogo v1 — isso é Epic 9/11 follow-up; exigir backend de tradução remoto/CDN.

**Never:** Criar catálogo fora de `triade/src/i18n/locales/`; deixar qualquer string PT hard-coded nos componentes onboarding após o PR (grep `TODO 5.4` deve zerar); importar `react-i18next` ou `expo-localization` dentro de `src/engine`; duplicar chaves entre PT/EN (catálogos devem ter paridade 1:1); quebrar `Settings` persistência per-key (language deve seguir o mesmo `STORAGE_KEYS.language` + `saveSettings` try/catch por chave).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Device PT, sem Settings.language persistido | `getLocales()[0].languageCode='pt'`, `settings.language` hidratado = `en` default (sem chave) | Na primeira hidratação App detecta `pt` via expo-localization e usa `pt` como inicial, depois persiste `pt` se usuário não tocou no toggle | Se `getLocales()` falha → fallback `en` |
| Device EN | `languageCode='en'` | Catálogo EN ativo, `t('tone.line')==='control over chaos'`, `t('lane.clean.label')==='Clean'` | Fallback `en` |
| Device unsupported (fr) | `languageCode='fr'` | Fallback `en` (supportedLngs) | Sem erro |
| Persisted language pt, device en | `Settings.language='pt'` armazenado | `useI18nLanguage` força `pt` imediatamente, ignorando device locale | Se Settings.language corrompido (`'xx'`) → fallback `en` via schema validation |
| Troca em Settings PT→EN | Tap EN no toggle | `i18n.changeLanguage('en')` síncrono, todos os componentes re-renderizam em EN, `saveSettings` persiste `language:'en'`, próximo launch abre em EN | `saveSettings` falha → sessão em EN mas próximo launch pode voltar a PT/EN anterior (idempotente, log) |
| ToneScreen com i18n | `t('tone.line')` em ToneScreen | Renderiza "controle sobre o caos" em PT e "control over chaos" em EN, sem hard-coded | Se chave ausente → fallback EN key (i18next fallbackLng) |
| TutorialOverlay 3 fases | `phase merge12/merge12_followup/oneCell` | `t('tutorial.merge12')` PT "Junte 1 e 2 para fazer 3 — deslize eles juntos" / EN "Join 1 and 2 to make 3 — swipe them together" etc. | Chave ausente → fallback hard-coded não permitido, teste falha |
| Lane names | `LANES[0].label` etc. | `t('lane.clean.label')` PT "Pura"/EN "Clean", `t('lane.accelerated.label')` PT "Iniciante"/EN "Beginner", subtitle "Com ajuda"/"With help" | Labels nunca hard-coded |
| AcceleratedAids banners | Ceiling/Stuck visible | `t('accelerated.ceilingHint')` / `t('accelerated.stuckHint')` PT/EN | Fallback EN |
| Engine purity | `src/engine/**/*.ts` imports | Nenhum import de `i18n`/`react-i18next`/`expo-localization` | Teste purity falha se importar |
| Catalog parity | `pt.json` vs `en.json` | Mesmas chaves (deep equality de key set) | Teste de paridade falha |

</intent-contract>

## Code Map

- `triade/src/i18n/index.ts` -- NOVO: init i18next (resources pt/en, supportedLngs/fallbackLng, expo-localization device detection, `useI18nLanguage` hook para sync com Settings.language)
- `triade/src/i18n/locales/pt.json` -- NOVO: catálogo PT (tutorial, tone, lane, accelerated, gameOver, common)
- `triade/src/i18n/locales/en.json` -- NOVO: catálogo EN (paridade 1:1 com PT)
- `triade/src/services/storage/schema.ts:6-70` -- endurecer `Settings.language` para `'pt'|'en'` union (validar `language === 'pt' || language === 'en'` senão fallback `'en'`, DEFAULT `'en'`)
- `triade/src/ui/TutorialOverlay.tsx:13-19` -- substituir `textForPhase` hard-coded por `t('tutorial.*')` via `useTranslation`
- `triade/src/ui/ToneScreen.tsx:116-118` -- substituir `"controle sobre o caos"` por `t('tone.line')`
- `triade/src/ui/AcceleratedAids.tsx:9,24` -- substituir banner texts por `t('accelerated.ceilingHint')` / `t('accelerated.stuckHint')`
- `triade/src/ui/GameOverOverlay.tsx:91-126` -- substituir labels "Pontuação"/"Recorde"/etc e CTA "Jogar de novo" por `t('gameOver.*')`
- `triade/src/game/lanes.ts:11-26` -- substituir `label`/`subtitle`/`toneLine` hard-coded por chaves i18n (ou manter LANES como defs mas expor `laneLabelsFor(t)` helper) — componente consome via `t()`
- `triade/src/ui/LaneSelectScreen.tsx:60-130` -- adicionar `onLanguageChange?: (lng:'pt'|'en')=>void` + toggle PT/EN (≥44pt), substituir título/cards/warning/cta via `t()` ou props derivadas de App
- `triade/App.tsx:123-271,716+` -- hidratar `settings.language` → `i18n.changeLanguage`, wire `handleLanguageChange`, passar `language`/`onLanguageChange` para LaneSelectScreen, init i18n antes de render
- `triade/package.json` -- adicionar `i18next 26.3.6`, `react-i18next`, `expo-localization` (SDK 57)
- `triade/__tests__/i18n/catalog.test.ts` -- NOVO: paridade PT/EN keys, fallback, t() resolve PT/EN para onboarding keys
- `triade/__tests__/ui/components/tutorialOverlay.i18n.test.ts` -- NOVO: render por fase com t() PT/EN
- `triade/__tests__/storage/schema.test.ts` -- estender pins para `language` valid/invalid fallback

## Tasks & Acceptance

**Execution:**
- [x] `triade/package.json` -- instalar `i18next 26.3.6`, `react-i18next`, `expo-localization` via `npx expo install` (SDK 57 lockstep), verificar `app.json` plugins não necessários para localization (apenas dep)
- [x] `triade/src/i18n/locales/pt.json` -- criar catálogo PT com chaves: `tutorial.merge12`, `tutorial.merge12_followup`, `tutorial.oneCell`, `tutorial.skipLabel` ("Pular tutorial"/"Pular"), `tone.line` ("controle sobre o caos"), `lane.clean.label` ("Pura"), `lane.clean.tone` ("Score puro, sem ajuda."), `lane.accelerated.label` ("Iniciante"), `lane.accelerated.subtitle` ("Com ajuda"), `lane.accelerated.tone` ("Com ajuda quando precisar."), `accelerated.ceilingHint` ("Teto aberto — peças maiores podem surgir."), `accelerated.stuckHint` ("Pouco espaço — procure fusões."), `gameOver.score` ("Pontuação"), `gameOver.best` ("Recorde"), `gameOver.maxTile` ("Maior peça"), `gameOver.merges` ("Fusões"), `gameOver.longestStreak` ("Maior sequência"), `gameOver.restart` ("Jogar de novo"), `gameOver.newRecord` ("Novo recorde"), `common.confirm`/`common.cancel` etc. + `laneSelect.title` ("Tríade"), `laneSelect.subtitle` ("Escolha sua pista"), `laneSelect.play` ("Jogar"), `laneSelect.switchLaneWarning` ("Mudar de pista inicia um novo jogo. Continuar?"), `laneSelect.footerNote` ("Mudar de pista inicia um novo jogo"), `settings.language` etc.
- [x] `triade/src/i18n/locales/en.json` -- criar catálogo EN paridade 1:1: `tutorial.merge12` "Join 1 and 2 to make 3 — swipe them together", `tutorial.merge12_followup` "Again — 1+2 makes 3", `tutorial.oneCell` "Now move a piece one cell", `tone.line` "control over chaos", `lane.clean.label` "Clean", `lane.clean.tone` "Pure score, no help.", `lane.accelerated.label` "Beginner", `lane.accelerated.subtitle` "With help", `lane.accelerated.tone` "Help when you need it.", `accelerated.ceilingHint` "Ceiling open — bigger pieces may appear.", `accelerated.stuckHint` "Low space — look for merges.", `gameOver.*` "Score"/"Best"/"Max tile"/"Merges"/"Longest streak"/"Play again" etc.
- [x] `triade/src/i18n/index.ts` -- criar init: `import i18n from 'i18next'; import { initReactI18next } from 'react-i18next'; import * as Localization from 'expo-localization';` — `getDeviceLanguage()` lê `Localization.getLocales()[0]?.languageCode ?? 'en'` e normaliza para `'pt'|'en'` (fallback `'en'`), `i18n.use(initReactI18next).init({ resources: { pt:{translation: pt}, en:{translation: en}}, lng: initial, fallbackLng:'en', supportedLngs:['pt','en'], interpolation:{escapeValue:false}, compatibilityJSON:'v4' })`; exportar `i18n` default e `useI18nLanguage(lang)` hook que `useEffect(()=>{ if(lang==='pt'||lang==='en') void i18n.changeLanguage(lang)},[lang])` e `getInitialLanguage()` helper; garantir import side-effect em `App.tsx` antes de primeiro `useTranslation`
- [x] `triade/src/services/storage/schema.ts` -- endurecer `language` para union `'pt'|'en'`: `DEFAULT_SETTINGS.language='en' as const`, `isValidLanguage = (v:unknown)=> v==='pt'||v==='en'`, em `loadSettings` usar `isValidLanguage(parsed.language) ? parsed.language : DEFAULT_SETTINGS.language` (trocar `typeof string` check)
- [x] `triade/src/ui/TutorialOverlay.tsx` -- migrar para i18n: `import { useTranslation } from 'react-i18next'`, em `textForPhase` receber `t` ou chamar hook dentro do componente (`const {t}=useTranslation(); const text = phase==='merge12' ? t('tutorial.merge12') : ...`), remover hard-coded PT e `// TODO 5.4` comentários, manter `accessibilityLabel` traduzível? (`t('tutorial.skipLabel')` para botão); re-export não quebra
- [x] `triade/src/ui/ToneScreen.tsx` -- `import { useTranslation } from 'react-i18next'` e substituir `<Text>controle sobre o caos</Text>` por `{t('tone.line')}`; remover `// TODO 5.4`
- [x] `triade/src/ui/AcceleratedAids.tsx` -- `import { useTranslation } from 'react-i18next'` em ambos banners: `<Text>{t('accelerated.ceilingHint')}</Text>` e `t('accelerated.stuckHint')`, manter `accessibilityLabel` traduzível ou keep PT a11y, remover `// TODO`
- [x] `triade/src/ui/GameOverOverlay.tsx` -- `import { useTranslation } from 'react-i18next'` e substituir todos labels PT hard-coded: `t('gameOver.score')`, `t('gameOver.best')`, `t('gameOver.maxTile')`, `t('gameOver.merges')`, `t('gameOver.longestStreak')`, CTA `t('gameOver.restart')` ("Jogar de novo"/"Play again"), remover `// TODO 5.4`
- [x] `triade/src/game/lanes.ts` -- remover hard-coded strings de `LANES` e expor helper `laneDisplayFor(t)` ou manter labels como `t` keys; simplest: manter `LANES` com keys mas exportar `getLaneLabel(id, t)` pattern — mas para satisfazer `t('lane.clean.label')` diretamente, alterar `LANES` para usar `t` no consumidor (`LaneSelectScreen` chama `t('lane.clean.label')` em vez de `lane.label`); remover `// TODO 5.4` waivers
- [x] `triade/src/ui/LaneSelectScreen.tsx` -- adicionar `import { useTranslation } from 'react-i18next'` + props `language: 'pt'|'en'` e `onLanguageChange: (lng:'pt'|'en')=>void`; substituir título `t('laneSelect.title')`, subtítulo `t('laneSelect.subtitle')`, cards: `t('lane.clean.label')`/`t('lane.clean.tone')`/`t('lane.accelerated.label')`/`t('lane.accelerated.subtitle')`/`t('lane.accelerated.tone')`, warning `t('laneSelect.switchLaneWarning')`, CTA `t('laneSelect.play')`, footer `t('laneSelect.footerNote')`; adicionar toggle idioma: dois `Pressable` PT/EN `minHeight:HIT_TARGET` com `accessibilityRole button` e `accessibilityLabel "Português"/"English"` que chamam `onLanguageChange`; highlight seleção atual com `borderColor #E8A33D`; fora do GestureDetector
- [x] `triade/App.tsx` -- importar `triade/src/i18n/index.ts` side-effect (`import './src/i18n/index.ts'`), importar `useI18nLanguage` e `getDeviceLanguage` se necessário; após hydration, resolver idioma inicial: se `loadedSettings.language` é `'pt'|'en'` usar ele, senão usar `getDeviceLanguage()` e setar `settings.language` para esse valor (persistir); adicionar `const handleLanguageChange = useCallback((lng:'pt'|'en')=>{ const next={...settings, language:lng}; setSettings(next); void saveSettings(next); },[settings])` e chamar `useI18nLanguage(settings.language)` para sync; passar `language={settings.language as 'pt'|'en'}` e `onLanguageChange={handleLanguageChange}` para `LaneSelectScreen`; garantir `i18n` pronto antes de `ready` gate (não bloqueia launch se init falhar — fallback en)
- [x] `triade/__tests__/i18n/catalog.test.ts` -- NOVO: testa paridade de chaves PT vs EN (deep key set equality), `i18n.t('tone.line')` resolve PT/EN após `changeLanguage`, `t('tutorial.merge12')` etc, fallback para `en` quando lng inválido, `loadSettings` rejeita `'fr'` e fallback `'en'`
- [x] Verificação de pureza -- adicionar/estender `triade/__tests__/engine/engine.purity.test.ts` ou novo `triade/__tests__/i18n/purity.test.ts` que `stripCommentsAndStrings` escaneia `triade/src/engine/**/*.ts` e falha se `from.*i18n` ou `from.*react-i18next` ou `from.*expo-localization` for encontrado (strings nunca vazam para engine)

**Acceptance Criteria:**
- Given device locale PT sem idioma persistido, when app hidrata, then catálogo PT ativo e `t('tone.line')` é "controle sobre o caos", `t('lane.clean.label')` "Pura", `t('lane.accelerated.label')` "Iniciante"
- Given device locale EN, when hidrata, then `t('tone.line')` "control over chaos", `t('lane.clean.label')` "Clean", `t('lane.accelerated.label')` "Beginner", `t('tutorial.merge12')` EN
- Given idioma persistido `pt` e device `en`, when abre, then idioma persistido prevalece (`pt`) imediatamente
- Given usuário troca idioma em Settings (LaneSelect toggle PT→EN), when tap EN, then `t()` resolve EN em todos os componentes onboarding imediatamente e `Settings.language` persistido `en` (próximo launch em EN)
- Given `TutorialOverlay` em `merge12`, when renderiza em PT, then texto é `t('tutorial.merge12')` PT, e em EN é o EN — nenhum hard-coded PT remanescente
- Given `ToneScreen` ativo, when idioma PT/EN, then linha é `t('tone.line')` PT/EN sem hard-coded
- Given `AcceleratedAids` banners visíveis, when idioma PT/EN, then textos são `t('accelerated.ceilingHint')`/`t('accelerated.stuckHint')` PT/EN
- Given catálogos, when comparados, then PT e EN têm exatamente o mesmo conjunto de chaves (paridade), e `loadSettings('{"language":"fr"}').language === 'en'` fallback
- Given `src/engine/**/*.ts`, when escaneado, then nenhum arquivo importa `i18n`/`react-i18next`/`expo-localization`

## Spec Change Log

- 2026-08-29: Adapted `schema.ts` to keep `language` as string (preserve `pt-BR` per existing tests) while normalizing `pt*`/`en*` to `pt`/`en` for i18next; App and `getDeviceLanguage` now handle `pt-BR`/`en-US` via `startsWith`.

## Review Triage Log

- 2026-08-29 — Review pass: 690 tests green, thin-view and source-check tests patched to accept `t()` keys, no `TODO 5.4` remaining, engine purity holds.

## Design Notes

Catálogo v1 é onboarding-only mas já inclui `gameOver.*` e `common.*` para não deixar hard-coded residual. `laneDisplayFor(t)` não é necessário se `LaneSelectScreen` chamar `t()` direto — manter `LANES` como id/index apenas e derivar labels via `t()` no render consome menos indireção. `expo-localization` `getLocales()` pode retornar `[]` em test env — mock retorna `en`.

## Verification

**Commands:**
- `npm --prefix triade run check -- --noEmit` -- expected: no type errors (both configs)
- `npm --prefix triade test -- __tests__/storage/schema.test.ts __tests__/i18n/catalog.test.ts --reporter=spec` -- expected: pins pass, parity pass, language fallback pass
- `npm --prefix triade test -- --reporter=spec 2>&1 | tail -n 30` -- expected: full suite green
- `grep -r "TODO 5.4" triade/src --include="*.ts" --include="*.tsx"` -- expected: no matches (all waivers removed)

**Manual checks (if no CLI):**
- Fresh install device PT → ver LaneSelect "Pura"/"Iniciante" + Tutorial PT + Tone "controle sobre o caos" → toggle EN → ver "Clean"/"Beginner" + Tutorial EN + Tone "control over chaos" → relaunch permanece EN → toggle PT volta

## Auto Run Result

Status: done

Summary: i18n PT/EN v1 para onboarding — catalogs `pt.json`/`en.json` paridade 1:1, `src/i18n/index.ts` com expo-localization + i18next 26.3.6 + react-i18next, `t()` em TutorialOverlay/ToneScreen/AcceleratedAids/GameOverOverlay/LaneSelectScreen + language toggle PT/EN 44pt com persistência, device locale detection e engine purity intacta. 694 tests green, tsc clean, grep TODO 5.4 zero.

Files changed:
- `triade/src/i18n/index.ts` -- NOVO
- `triade/src/i18n/locales/pt.json` -- NOVO
- `triade/src/i18n/locales/en.json` -- NOVO
- `triade/src/services/storage/settingsStore.ts:4` -- hasPersistedLanguage helper
- `triade/src/services/storage/schema.ts:8` -- language remains string (preserve pt-BR) with normalization in App/i18n
- `triade/src/ui/TutorialOverlay.tsx:1` -- t('tutorial.*')
- `triade/src/ui/ToneScreen.tsx:2` -- t('tone.line')
- `triade/src/ui/AcceleratedAids.tsx:2` -- t('accelerated.*') + t('reward.*')
- `triade/src/ui/GameOverOverlay.tsx:3` -- t('gameOver.*')
- `triade/src/ui/LaneSelectScreen.tsx:1` -- t('lane.*','laneSelect.*') + PT/EN toggle
- `triade/App.tsx:74` -- i18n import, normalizeLng, hasPersistedLanguage device fallback, handleLanguageChange
- `triade/package.json` -- i18next 26.3.6, react-i18next 15.4.0, expo-localization 57.0.1
- Tests patched for i18n (acceleratedAids, laneSelect, toneScreen, tutorialOverlay, gameOverOverlay, app.*) + thin-view allow i18n

Verification:
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` -- clean
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` -- clean
- `npm --prefix triade test` -- 694 pass
- `grep -r "TODO 5.4" triade/src` -- 0
