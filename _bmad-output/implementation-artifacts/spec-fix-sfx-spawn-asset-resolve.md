---
title: 'Fix SFX spawn asset Metro resolve crash'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
baseline_commit: '2a3a18ba1771acd5217cb51f9e8d95a1632c0998'
final_revision: '2a3a18ba1771acd5217cb51f9e8d95a1632c0998'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ao abrir o app no iPhone o bundle Metro falha com `Unable to resolve module ../../assets/sfx/spawn.wav from triade/src/feel/sfx.ts:65` — o diretório `triade/assets/sfx/` não existe e os três `require('../../assets/sfx/*.wav')` literais em `sfx.ts:64-66` (e duplicados em `assetManifest.ts:7-24`) são resolvidos estaticamente pelo Metro mesmo dentro de `try/catch`, então o app nunca inicia.

**Approach:** Tornar `assets/sfx` real e Metro-resolvível gerando 3 WAVs thock sintéticos cálidos via script (`tools/gen-thock.py` — seno 180→80Hz exp decay 70ms + ataque 2ms, mono 44.1kHz 16-bit, ~0.12s, timbre cálido/orgânico) para `merge.wav`, `spawn.wav`, `gameover.wav`, e garantir que o gateway SFX e o manifest continuem degradando para no-op quando `expo-audio` ausente, sem nunca bloquear `move()`.

## Boundaries & Constraints

**Always:** Engine permanece puro (ADR-01); `src/feel` continua observer de `trace` apenas; SFX são best-effort, nunca lançam, nunca bloqueiam gameplay; volume continua mapeado via `presetFor` → `VOLUME_BY_HAPTIC`; `expo-audio ~57.0.3` dynamic import com `catch(() => null)`; Reduced Motion mantém som (FR-30); preload via `expo-asset` sem CDN (NFR-6); `triade` permanece offline-capable.

**Ask First:** Se precisar trocar `require` literal por import dinâmico com URI ou mudar `assetExts` do Metro, HALT e pedir aprovação — muda bundling offline e afeta `assetManifest.test.ts`.

**Never:** Não adicionar música/loop/BGM; não gatear som em `reducedMotion`; não bloquear `move()` por áudio; não duplicar predicate de merge fora do engine; não usar CDN/remoto; não exceder 3 SFX kinds no MVP.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY | App abre em iPhone com `assets/sfx/*.wav` presentes | Metro resolve todos `require`, bundle inicia, `preloadAssets()` carrega 3 SFX, merges/spawn/gameOver tocam thock cálido sintético sem throw | N/A |
| HAPPY | `triggerSfxForTrace` com merge 3/6/12 | 1 SFX por entrada `from.length===2 && !spawned`, volume 0.45/0.65/1.0 via `sfxVolumeForValue` | never throws |
| NOOP | trace vazio/null, `moved===false` | nenhum SFX, silencioso | never throws |
| EDGE | `expo-audio` não instalado (test host) | gateway degrada para no-op, `sfxVolumeForValue` puro ainda retorna 0.45/0.65/1.0 | swallowed, never throws |
| EDGE | `triggerSfxForTrace` com gateway mock que lança | chamada engolida, caller não vê erro | try/catch por chamada |
| REGRESSION | `assets/sfx` removidos no futuro | build deve falhar explicitamente (assets obrigatórios no MVP) ou degradar sem crash de Metro — documentar que placeholders são obrigatórios | não mascarar com catch estático que Metro ignora |

</frozen-after-approval>

## Code Map

- `triade/src/feel/sfx.ts:50-70` -- origem do crash: `playViaExpoAudio` faz `require('../../assets/sfx/*.wav')` literal dentro de try/catch; Metro resolve estaticamente e falha se arquivo não existe. Precisa que arquivos existam.
- `triade/src/services/assets/assetManifest.ts:7-24` -- duplica os mesmos requires literais para preload `expo-asset`; também quebra sem arquivos, mas o erro reportado veio de `sfx.ts`. Deve continuar degradando gracefully após arquivos existirem.
- `triade/assets/sfx/` -- diretório inexistente (`ls: No such file or directory`). Destino dos 3 placeholders WAV.
- `triade/__tests__/feel/sfx.test.ts:1` -- pins de volume/escala e gateway swappable que devem continuar verdes.
- `triade/__tests__/assets/assetManifest.test.ts:1` -- verifica que manifest referencia apenas assets locais, sem CDN — deve passar após fix.
- `triade/app.json:3` -- Expo config; confirma `expo-asset` plugin sem `assets` array extra — WAV são bundled via `require` (não precisam config adicional, mas assetExts default já inclui wav).
- `triade/App.tsx` -- consome `triggerSfxForTrace/ForSpawn/ForGameOver` após `triggerHapticsForTrace`; não deve mudar, apenas validar que não gateia em reducedMotion.

## Tasks & Acceptance

**Execution:**
- [x] `tools/gen-thock.py` -- criar script gerador de thock sintético: seno 180→80Hz com `exp(-t/0.07)` decay + ataque 2ms, mono 44.1kHz 16-bit PCM, escreve WAV RIFF válido; 3 presets: `merge` (0.12s, 180→90Hz), `spawn` (0.08s, 220→120Hz mais suave 0.35 volume), `gameover` (0.28s, 120→60Hz + leve reverb delay 40ms) — timbre cálido/orgânico S8.6/UX-DR-29
- [x] `triade/assets/sfx/merge.wav` -- gerar via `python3 tools/gen-thock.py merge` (~5KB) -- garante `require('../../assets/sfx/merge.wav')` em `sfx.ts:64` e `assetManifest.ts:9` resolva no Metro
- [x] `triade/assets/sfx/spawn.wav` -- gerar via `python3 tools/gen-thock.py spawn` (~3.5KB) -- corrige crash reportado `spawn.wav:65` e `assetManifest.ts:14`
- [x] `triade/assets/sfx/gameover.wav` -- gerar via `python3 tools/gen-thock.py gameover` (~12KB) -- completa tríade S8.6 (`gameover.wav:66` e `assetManifest.ts:19`)
- [x] `triade/src/feel/sfx.ts:60-69` -- manter `try { require } catch { source=null }` mas atualizar comentário para "WAVs sintéticos cálidos gerados via tools/gen-thock.py — obrigatórios para Metro bundling (não opcionais); `if (!source) return` degrada quando `expo-audio` ausente"; remover "no bundled wav yet"
- [x] `triade/src/services/assets/assetManifest.ts:7-24` -- sem mudança funcional, validar que após WAVs existirem o `preloadAssets()` inclui os 3; manter `number | null` try/catch
- [x] `triade/__tests__/feel/sfx.test.ts` + `triade/__tests__/assets/assetManifest.test.ts` -- sem mudança, apenas garantir suite verde

**Acceptance Criteria:**
- Given app aberto em iPhone (Expo dev build), when Metro bundler resolve `triade/src/feel/sfx.ts`, then nenhum `Unable to resolve module .../sfx/spawn.wav` e o app inicia até `Lane Select`
- Given `triade/assets/sfx/*.wav` presentes, when `npm --prefix triade test` roda, then todos `sfx.test.ts` e `assetManifest.test.ts` passam, e `Asset.loadAsync` recebe 3 recursos quando `expo-asset` disponível
- Given `expo-audio` ausente (test host), when `triggerSfxForTrace` é chamado, then nenhum throw, degrade silencioso para no-op
- Given Reduced Motion ON, when merge resolve, then SFX ainda toca com mesmo volume escalado (FR-30 preservado)

## Spec Change Log

## Design Notes

Metro resolve `require('literal')` em build-time mesmo dentro de `try/catch`; por isso "placeholder opcional" nunca funcionou — arquivo deve existir para bundling. A solução mantém o `try/catch` runtime (para quando `expo-audio` falta) mas cria WAVs reais sintéticos cálidos via script. Cada WAV: header RIFF 44b + PCM 16-bit mono 44.1kHz com envelope `exp(-t/0.07)` e sweep 180→80Hz — thock orgânico minimalista que respeita "cálido thock, no music" (UX-DR-29) e é substituível por mastering real depois. Não usar `require(pathVar)` dinâmico pois cria context bundle imprevisível; manter literais é o bundling determinístico desejado (NFR-6 offline).

## Verification

**Commands:**
- `python3 tools/gen-thock.py --all && ls -lh triade/assets/sfx/` -- expected: `merge.wav` ~5KB, `spawn.wav` ~3.5KB, `gameover.wav` ~12KB presentes
- `npx tsc --noEmit --project triade/tsconfig.json` -- expected: clean
- `npx tsc --noEmit --project triade/tsconfig.test.json` -- expected: clean
- `npm --prefix triade test triade/__tests__/feel/sfx.test.ts triade/__tests__/assets/assetManifest.test.ts` -- expected: all pass
- `npm --prefix triade test` -- expected: 837+ pass, apenas 9 EXPECTED RED pré-existentes (mesmo baseline de `spec-8-6`)
- `expo start --dev-client` + abrir em iPhone físico -- expected: sem `Unable to resolve module`, app inicia, merge 3/6/12 tocam thock cálido escalado

**Manual checks (if no CLI):**
- Abrir app no iPhone: sem vermelho Metro, Lane Select aparece, merge 3 → thock suave, merge 12 → thock pesado, spawn → thock suave curto, game over → thock grave longo

## Suggested Review Order

**Geração thock sintético — entry point**

- Script offline que cria 3 WAVs cálidos via sweep + exp decay, sem CDN
  [`gen-thock.py:1`](../../tools/gen-thock.py#L1)

- Presets merge/spawn/gameover definem duração, sweep e reverb leve
  [`gen-thock.py:25`](../../tools/gen-thock.py#L25)

**Fix Metro bundling**

- WAVs agora existem — Metro resolve requires literais sem crash
  [`merge.wav:1`](../../triade/assets/sfx/merge.wav#L1)

- Comentário atualizado explica obrigatoriedade para Metro, mantém degradação runtime
  [`sfx.ts:56`](../../triade/src/feel/sfx.ts#L56)

- Manifest continua degradando gracefully via try/catch + filtro Asset.loadAsync
  [`assetManifest.ts:7`](../../triade/src/services/assets/assetManifest.ts#L7)

**Verificação e peripherals**

- Suite sfx pins escala volume e gateway sem throw, Reduced Motion preservado
  [`sfx.test.ts:1`](../../triade/__tests__/feel/sfx.test.ts#L1)

- Manifest pins apenas assets locais, sem CDN, offline-capable
  [`assetManifest.test.ts:1`](../../triade/__tests__/assets/assetManifest.test.ts#L1)
