# Automation Summary — Story 7.3 (Faixa ambígua correta)

**Engine**: TypeScript / React Native (Expo) — Node `node:test` + `node:assert` (não Unity/Unreal/Godot; skill adaptado ao stack real do projeto)
**Testes Gerados**: 6 (integração) — os testes de unidade FR-43 (AC1–AC8) já existiam em `preview.test.ts` e foram validados
**Data**: 2026-08-25

## Contexto

A Story 7.3 já entregou a lógica (`src/game/preview.ts`) e o cabeamento no orquestrador (`App.tsx:128-150` — `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))`). A análise identificou uma lacuna de **automação na fronteira de orquestração**: os testes de unidade cobrem `previewFor` isolado, mas nenhum teste amarrava o caminho *board → ceiling → availablePot → previewFor* (T2 / AC3, AC4, AC5). Esse é o gap fechado por este passo.

## Test Distribution

| Tipo           | Count | Coverage                                              |
| -------------- | ----- | ----------------------------------------------------- |
| Unit Tests     | 23    | `preview.test.ts` — FR-43/FR-44, AC1–AC8 (já existiam) |
| Integration    | 6     | Cabeamento de disponibilidade por teto do board       |
| Smoke Tests    | 0     | Coberto pelos pins AC7/AC1 existentes no nível unit    |
| E2E Infra      | —     | Já presente (`test-utils/e2e/`) — fora do escopo 7.3   |

## Files Created

- `triade/__tests__/integration/preview-availability.integration.test.ts` — 6 testes mapeando cada AC da fronteira de orquestração:
  - `[P0] AC5/FR-43` — o conjunto disponível é derivado do teto do board (24→[3], 48→[3,6], 96→[3,6,12], 192→[3,6,12,24]).
  - `[P0] AC3/FR-43` — teto baixo (só 3) colapsa value 3 em `[3]`.
  - `[P0] AC4/FR-43` — teto crescente alarga a faixa como fatia contígua a partir de value, capada em 3.
  - `[P0] AC2/FR-43` — value 1/2 renderiza `[1,2]` independente do teto.
  - `[P0] AC1/FR-43` — toda ladder value está contida na faixa do cabeamento live.
  - `[P0] AC7` — caminho exato (<0.6) ignora disponibilidade (sem regressão FR-41/42).

## Resultado

- `npm test` (triade): **331 pass / 0 fail** (325 baseline + 6 novos).
- Sem alteração de código de produção — somente teste novo.
- `engine/**` inalterado (byte-identical), respeitando o boundary rule (ADR-01).

## Checklist (gds-test-automate)

- [x] Engine detectado (TS/Expo — adaptado das opções Unity/Unreal/Godot)
- [x] Sistemas testáveis identificados; testes existentes localizados
- [x] Padrão AAA + node:assert; determinísticos; sem dependências externas
- [x] Testes de integração independentes e com asserts nomeados/mensagens
- [x] Arquivos no diretório correto (`__tests__/integration/`)
- [x] Resumo criado; próximos passos abaixo

## Next Steps

1. Revisar os 6 testes de integração (foco em AC5 — mapeamento não-hardcoded).
2. Adicionar ao CI (gate já existe via `npm test`).
3. A suíte de invariante "hard" (FR-44 / no-reroll) pertence à Story 7.4 — não duplicada aqui.
4. Opareent teste de componente `previewCard.test.ts` já cobre a renderização `"1/2"` / `"3"` / `"3/6/12"` via `range.values.join('/')` — confirmado verde.
