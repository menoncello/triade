---
project_name: '3-clone'
user_name: 'Eduardo'
date: '2026-09-05'
sections_completed: ['technology_stack', 'engine_rules', 'performance', 'organization', 'testing', 'platform', 'dont_miss']
status: 'complete'
rule_count: 29
optimized_for_llm: true
existing_patterns_found: 12
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing game code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- PIN: RN 0.86 + Skia 2.11 (Expo SDK 57), Reanimated 4 worklets; Node ^20.19.4. Sem bump isolado.
- Expo Go FORA do alvo — sempre dev build (prebuild + config plugins: skia, reanimated, worklets, ads, revenuecat, firebase).
- RNGH Pan montado SÓ em `BoardGestureView`; safe-area-context + 16pt sobre insets, portrait + landscape.
- i18next 26.3.6 (PT/EN); RevenueCat 10.7.0 + AdMob 16.4.0 c/ UMP; Firebase 26.1.0; MMKV (settings/best) + SecureStore (entitlements, mirror autoritativo offline).

## Critical Implementation Rules

### Engine-Specific Rules

- `src/engine` é TS puro — NUNCA importa RN/React/Skia; UI nunca importa `core` (import rule).
- Board é declarativo do trace (`move()` → events → render); feel é worklet imperativo fino; frame math em funções puras testáveis.
- Snapshot imutável inclui PRNG + `pendingSpawn` + `sessionBestMerge` — undo é rewind verdadeiro (spawn seguinte idêntico).
- Lane exposta a services (ads/IAP), NUNCA ao engine; Clean não tem code path de ajuda.
- Preview lê `pendingSpawn` (60/40), nunca rola; **nunca anima com feel** — chrome, não board.

### Performance Rules

- 60 FPS como evidência: CI determinístico (Node: `presetFor`, `lockAxis`, `previewFor`, 26 testes engine) + job device agendado (p99 pior caso). **CI cobre puro; device cobre gesto/pixel — nunca o inverso.**
- **REGRA DURA: worklets e frame math NUNCA logam em release** (nem DEBUG); zero alocação no hot path (pool só p/ partículas).
- Reduced Motion = preset total (desliga shake/bullet/flash/overshoot/glow/fade, mantém haptics+som) + fallback 60 FPS.
- Bloom `1536+` com teto (≤12% largura, ≤35% opacidade, transiente, nunca sobre chrome, off em RM).
- Preload tudo no boot (13 tiers, board, 3 SFX) — offline, sem CDN; sem loading screens (game-over é overlay).
- Outdoor/foto 1/60s/grayscale/48-vs-96/6-digit/384 = acceptance-device E1/E8/E9 — **nunca gate de PR.**

### Code Organization Rules

- Domain-Driven: `engine/` (puro) | `game/` (+`input.ts` puro, sem RN) | `a11y/` (customActions, Dpad VO-only, bridge do trace) | `render/` (+`board/BoardGestureView` — ÚNICO Pan) | `feel/` | `ui/` (+`hud/` banda 56pt) | `services/` | `state/` (telas/settings/mirror) | `theme/` | `i18n/` | `dev/` (__DEV__ só) | `benchmarks/` | `__tests__/`.
- **PROIBIDO: board no `state/` global** — board vive no snapshot imutável; `state/` tem telas e settings.
- **PROIBIDO: `dev/` em release** — inspector/recorder/seed/spawn-override só `__DEV__`.
- Nomes: módulos camelCase, componentes PascalCase, assets kebab-case, testes `.test.ts`; constantes UPPER_SNAKE; eventos PascalCase passado com `type` discriminado; dados via módulos tipados (`spawnConfig`, `theme`, `t()`), sem literais espalhados.

### Testing Rules

- **GATE BLOQUEANTE: os 26 testes do engine passam em todo PR** — quebra = sem merge.
- Pot soma 20% (epsilon); `weightedPicker` sempre renormaliza; `presetFor`/`lockAxis`/`previewFor` puros e testados.
- Espelho a11y no CI desde o dia 1: `__tests__/a11y/customActions` chama `move()` 3x com VO mockado (gesto real no device E9).
- **LINT: `no-throw` em `src/engine`** — engine retorna `ok | rejected`, nunca throws.
- I/O/nativo com try/catch → handler global → Crashlytics, silencioso ao jogador; `rejected` (noop/undo negado) NÃO loga ERROR.

### Platform & Build Rules

- iOS first (touch-first, offline, sem contas/backend); portrait + landscape first-class (banda 56pt single-row, preview 16pt+chip PRÓX, pause 48×48 fora do swipe-rect c/ exclusão ≥12pt); safe-area + 16pt; targets ≥44pt — **os 3 que sempre quebram: tab do leaderboard (hit 44), dismiss do banner, skip do tone/tutorial**.
- Input: swipe ~20pt, dominant-axis travado até `onEnd`, reject in-flight silencioso, Pan SÓ no board; **NUNCA `simultaneousHandlers` do Pan com preview/pause**; VO: Custom Actions + D-pad (three-finger atalho); PWA arrow-keys só no legado congelado.
- Anúncios score→preview→best; noop silencioso; 1 hint throttled por sessão p/ gesto interceptado; theme+language empilhados.

### Critical Don't-Miss Rules

- NUNCA: regras na UI; `throw` no engine; Pan fora do board; `simultaneousHandlers` com chrome; label de tile hardcoded (ler trace); preview com feel; board no `state/`; `dev/` em release; monetização alterando spawn/merge/score; lanes misturadas; log em worklet/release; device-teste como gate de PR.
- SEMPRE: `move()` único p/ gesto/action/D-pad; `pendingSpawn` pré-resolvido (display nunca altera spawn); RM preset total; double ring em todo foco; skeleton no leaderboard; `input.buffer` off default.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any game code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-09-05
