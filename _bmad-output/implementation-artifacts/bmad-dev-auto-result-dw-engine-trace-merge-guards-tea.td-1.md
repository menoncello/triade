---
status: done
---

TEA Test Design completed for `dw-engine-trace-merge-guards` (DW-21/DW-22).

Artifacts written (TEA `test_artifacts: _bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`):

- `_bmad-output/test-artifacts/test-design-dw-engine-trace-merge-guards.md` (474 lines) — primary test-design output (also mirrored at `_bmad-output/test-artifacts/test-design/test-design-dw-engine-trace-merge-guards.md` per sweep-bundle dual-path convention)
  - Scope: commit `35c9d1c fix(engine): trace empty on noop and mergeValue guard` vs baseline `3bcf38c` (spec `e325bab`, ledger `resolution-undo b4557fd…`); working-tree diff vs HEAD is metadata-only (`deferred-work.md` DW-21/22 `open→done`)
  - Content: Testability assessment (Controllability Strong / Observability Good / Reliability Strong), Risk register 9 risks (3 high ≥6: R-001 noop trace 16→0 leak, R-002 mergeValue tautological `a`-only, R-003 boardFromLines full-placement vs meaningful-only boundary; 4 medium 3-4: draw 0/3, HOLD vs stationary, moved divergence, spawned flag; 2 low), NFR Planning 6 categories (Reliability never-throw+finiteness, Maintainability single-guard, Correctness trace+merge ladder, Performance O(1) <0.001 ms, Compliance trace→plan chain, Offline), Entry/Exit Criteria, P0/P1/P2/P3 coverage (P0 12 checks: 4-dir noop 0 + `1+2→3` merge+spawn + gaps + mergeValue `a`-only 5 + guarded 2 + hold-vs-stationary; P1 67: game 33 + line 7 + rules 6 + transitionPlan 13 + preview-invariant 1 + pipeline 3 + ledger 1; P2 5 static `rg` allowlists/tautology/alias/shape/ledger; P3 5 exploratory ragged/one-cell/domain×2+bench), Execution Order Smoke <5 min / P0 <10 min / P1 <30 min / P2+P3 <60 min, Resource estimates 9.3–17.2 h gross / 2.6–4.8 h incremental host-only `<15 min` gate, Quality gates (P0 100%, trace 100%, merge predicate 100%), Mitigation Plans R-001..R-003, Interworking & Regression 4 services (`transitionPlan`→`resultingTiles` ghost, `matchScore`, `spawnTile`, `js/game.js` parity).

No production code modified. `sprint-status.yaml` not written or reverted (orchestrator-owned). `git diff --stat HEAD` shows only `deferred-work.md` (`+6/-2` DW-21/22 done) — validates no unintended production diff.

Verification quick scans:
- `rg -n "let trace = built.trace" triade/src/engine/core/game.ts` 1, `rg -n "if \(!moved\) trace" triade/src/engine/core/game.ts` 1, `rg -n "if \(!canMerge" triade/src/engine/core/rules.ts` 1, `rg -n "DW-21: boardFromLines always" triade/src/engine/core/line.ts` 1 all green.
- `npx tsc --noEmit` both configs clean (per spec Auto Run 910 pass / 0 fail / 238 skipped).
- Tightened probes `preview-invariant.test.ts:373 length 0` and `transitionPlan.test.ts:108 length 0` are the P0 gates.

Next: `nfr-assess` when implementation evidence exists (never-throw+finiteness already evidenced), then `*atdd` for stricter `mergeValue` throw vs `a`-only hardening if desired (not auto-run).
