---
title: 'Fix ExpoAudio native module missing crash'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
route: 'one-shot'
---

# Fix ExpoAudio native module missing crash

## Intent

**Problem:** Ao abrir o app (Expo Go / simulator sem dev build) o JS bundle de `expo-audio` avalia `requireNativeModule('ExpoAudio')` no top-level e lança `Cannot find native module 'ExpoAudio'` como Uncaught Error (LogBox vermelho), mesmo com `import('expo-audio').catch(() => null)` — o erro é lançado durante a avaliação do módulo antes do catch, bloqueando o primeiro frame.

**Approach:** Guardar o gateway SFX com `requireOptionalNativeModule('ExpoAudio')` antes de qualquer `import('expo-audio')`; quando o native module não existe (Expo Go, test host, JS-only) o gateway vira no-op sem nunca avaliar o JS bundle de `expo-audio`, mantendo best-effort, never-throw e som em dev build quando o módulo existe.

## Suggested Review Order

- Guarda que evita avaliar expo-audio quando native module não existe
  [`sfx.ts:38`](../../triade/src/feel/sfx.ts#L38)

- Cache de disponibilidade + early return evita LogBox Uncaught
  [`sfx.ts:50`](../../triade/src/feel/sfx.ts#L50)

- Gate em getAudioModule impede import que lançaria no top-level
  [`sfx.ts:62`](../../triade/src/feel/sfx.ts#L62)
