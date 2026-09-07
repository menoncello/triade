---
status: done
---

TEA Test Design concluído para `7-2-preview-card-no-hud-60-40-nas-duas-pistas` (modo Epic-Level).

Artefatos (sem nenhuma modificação em código de produção):

- `_bmad-output/test-artifacts/test-design/test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
  — risk assessment (7 riscos, nenhum ≥6, sem bloqueador score-9) + estratégia de cobertura baseada
  em risco (P0 12 / P1 5 / P2 5, tudo já existente — verificar green), NFR planning, gates e estimativas (~5–11h).
- `_bmad-output/test-artifacts/test-design-progress.md` — progresso do workflow (completed).

Base avaliada: superfície 7.2 commitada + delta D-008 (ee3ce91, guards null em `previewFor` + 3 pins);
working tree limpo exceto o `sprint-status.yaml` do orquestrador (intocado). Maiores riscos: R-002
(fan-out idêntico nas duas pistas, 4) e R-003 (janela básica, pins exaustivos no 7.3, 4).
