---
status: done
bundle: dw-doc-layout-test-count-sync
workflow: bmad-testarch-test-design
mode: Epic-Level
artifacts:
  - _bmad-output/test-artifacts/test-design/test-design-dw-doc-layout-test-count-sync.md
  - _bmad-output/test-artifacts/test-design-dw-doc-layout-test-count-sync.md
progress: _bmad-output/test-artifacts/test-design-progress.md
created: 2026-09-02
---

TEA Test Design for `dw-doc-layout-test-count-sync` completed.

- Scope: DW-11 doc-only sync (`1-5-layout-portrait-e-landscape.md` T2/T5/ATDD 12→14) plus ledger `open→done` with `resolution-undo 8080feef…`; co-located DW-56 engine hardening (`game.ts`/`weights.ts`) isolated as Not-in-Scope and cross-referenced to `test-design-dw-engine-rng-trust-hardening.md`.
- Risks: 6 scored (0 high when strictly scoped to DW-11; 2 high isolation risks for DW-56 + `sprint-status.yaml` ownership, gated via Not-in-Scope + git pins; 3 medium of score 4/3 for residual 14→18 vs file truth 18 and ATDD label).
- Coverage: P0 5 checks (doc-count grep vs file ≥14 + golden 382/688/452 + ledger done+hash + git isolation `triade/src/ui` empty), P1 4 checks (ATDD, Auto Run Result singleton, sprint-status untouched, layout.test.ts 18 pass + tsc), P2 2 checks (residual note, DW-56 ledger), P3 2 waivable. Effort ~1.5–2.6h host-only.
- Gates: `rg` doc vs file, ledger 64-hex, `git diff --stat` isolation, `layout.test.ts` 18 pass + both `tsc` clean. No production code modified in this workflow; `sprint-status.yaml` not written per prompt.
