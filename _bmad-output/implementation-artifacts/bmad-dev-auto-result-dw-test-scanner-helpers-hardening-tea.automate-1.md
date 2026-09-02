---
status: done
story: dw-test-scanner-helpers-hardening
workflow: bmad-testarch-automate
timestamp: 2026-09-02
baseline: 1fb45ca7437304db468f1193251c0c7560d60dd1
engine_byte_identical: true
sprint_status_untouched: true
test_artifacts: _bmad-output/test-artifacts
---

# TEA Automate — dw-test-scanner-helpers-hardening — done

**Outcome:** `done` — Prioritized API/E2E tests and fixtures for working-tree delta vs `1fb45ca` are under `_bmad-output/test-artifacts`, plus Definition-of-Done summary in `automation-summary.md`.

## Artifacts (under `_bmad/tea/config.yaml` `test_artifacts: _bmad-output/test-artifacts`)

- `fixtures/helpers-hardening-fixtures.ts` (310 lines, new) — deterministic `rngOf`/`spyRng` scripted draws + `STRIP_FIXTURES` 8 I/O rows + `drawBudgetForEffectiveMove`/`newGame` + `scannerDelegationOk`/`stripCommentsBench` + ledger helpers; no faker, host-only.
- `tests/api/helpers.hardening.gateway.spec.ts` (13 cases, 310 lines, P0/P1/P2) — API gateway contract: `rngOf`/`spyRng` throw `exhausted after N`, `stripComments` preserves `http://x` + `a /* b */ c` + escaped `\"`, `defaultPendingSpawn` fresh single literal, `Known limitation — regex` doc, scanner delegation 3-site + no naive fallback, draw-budget `3`/`20` via real `game.move`/`newGame` + `extractSpecifiers` preservation, ledger `resolution-undo` 64-hex. Host `~18ms`, 13 pass.
- `tests/e2e/helpers.hardening.umbrella.spec.ts` (7 journeys, 268 lines, P1/P2/P3) — E2E journeys `E2E_JOURNEYS` map: E2E-01 scanner tripwire preserved (engine.purity/ui.norolls), E2E-02 draw-budget 3/20, E2E-03 ledger+f factory, E2E-04 full sweep + engine byte-identical, E2E-05 static allowlists, E2E-06 regex residual doc, E2E-07 bench/scope. Host-verifiable, 7 pass.
- `automation-summary.md` (updated, TEA canonical) — Steps 1–4 + DoD summary for dw bundle (P0 100% + P1 100% + P2/P3 100% GREEN, no deferred RED, type + scanner + static + bench gates pass).

## DoD Summary (condensed — full in `automation-summary.md` Step 4)

| Criterion | Target | Status |
|-----------|--------|--------|
| P0 critical (rngOf/spyRng throw + stripComments string-safe + factory + doc + scanner green) | 100% | ✅ 8 ATDD P0 + 7 gateway P0 + 2 scanner suites GREEN (activated ATDD 20 pass) |
| P1 wiring + ledger (3-draw/20-draw + specifiers + tiered pending + calls exact + ledger + sprint-status untouched) | ≥95% | ✅ 6/6 ATDD P1 + 4 E2E P1 + gateway P1 4 GREEN (100%) + game.test 32/32 green |
| P2/P3 static/bench (no 0.5 fallback + single parser + template interp + quote-in-regex + scope + bench <500ms) | ≥90% | ✅ 4/4 P2 + 2/2 P3 GREEN |
| Fixtures + API/E2E under `test_artifacts` + sprint-status untouched | 100% | ✅ fixtures + api + e2e all under `_bmad-output/test-artifacts`; `git diff --stat` without `sprint-status.yaml`, ledger has 64-hex undo |
| Type gates (`tsconfig.json` + `tsconfig.test.json` clean, engine byte-identical) | 100% | ✅ `tsc --noEmit` both clean, `git diff --stat -- triade/src/engine` empty |
| Scanner green (`engine.purity` + `ui.norolls`) | 100% | ✅ both suites green |

## Verification

```
TSX_TSCONFIG_PATH=tsconfig.test.json ./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts  # 13 pass
TSX_TSCONFIG_PATH=tsconfig.test.json ./triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts  # 7 pass
TSX_TSCONFIG_PATH=triade/tsconfig.test.json ./triade/node_modules/.bin/tsx --test triade/__tests__/test-utils/helpers.hardening.active.test.ts  # 20 pass (activated)
./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json  # clean
TSX_TSCONFIG_PATH=triade/tsconfig.test.json ./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json  # clean
npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts  # 6 pass
npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts __tests__/ui/gesture-pipeline.test.ts  # 54 pass
```

**Sprint board:** `sprint-status.yaml` is orchestrator-owned — never written by this workflow (verified `git diff --stat` without it); DW row at `done` is bookkeeping, not proof of verified (verified by tests above + `automation-summary.md` DoD).

**Engine purity:** `git diff --stat -- triade/src/engine` empty — no engine logic change (helper seam only).

**Next:** `*test-review` (validate P0 100% quality + fixture determinism) or `*trace` (bind spec AC → helpers seam → scanner suites).
