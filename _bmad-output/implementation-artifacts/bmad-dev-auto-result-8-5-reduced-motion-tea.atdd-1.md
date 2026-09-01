---
status: done
storyKey: 8-5-reduced-motion
workflow: bmad-testarch-atdd
generatedTestFiles:
  - triade/__tests__/feel/reducedMotion.atdd.test.ts
atddChecklist: _bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md
testArtifactsDir: _bmad-output/test-artifacts
totalTests: 21
passing: 19
failingExpected: 2
fullSuite: "835 tests (824 pass / 11 fail — 9 prior + 2 new 8-5 RED)"
bench: "2 pass (full 9.6ms / reduced 6.5ms, median <0.05ms / p99 <0.1ms)"
---

# TEA ATDD — 8-5 Reduced Motion (completed)

**Story:** `8-5-reduced-motion` (`spec-8-5-reduced-motion.md` `10a3449 → 0ec7482`)
**Working-tree delta:** `triade/App.tsx:929` GameOverOverlay wiring fix + `triade/src/feel/feel.ts` REDUCED_PRESET + `punch.ts`/`shake.ts`/`bulletTime.ts` preset-not-flag delegation + `haptics.ts` FR-30 comment + `render/GameBoard.tsx` board-only gating + `ui/GameOverOverlay.tsx` instant vs `280ms` fade + `benchmarks/feel.bench.test.ts` both-profile sweep + wiring pins `app.gameOverWiring`/`app.restart`. No engine drift (`git diff --stat -- triade/src/engine` empty).

## Artifacts (TEA `test_artifacts: _bmad-output/test-artifacts`)

- **ATDD checklist:** `_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md` (21 tests: 19 GREEN + 2 expected RED; implementation checklist per test; Running Tests + Red-Green-Refactor + Test Execution Evidence)
- **Red-phase scaffolds:** `triade/__tests__/feel/reducedMotion.atdd.test.ts` (385 lines; `node:test` + `tsx`; 9 P0 + 6 P1 + 6 P2)
  - `npm test -- __tests__/feel/reducedMotion.atdd.test.ts` → `19 pass / 2 fail` (the 2 are `[P2-04] cancelAnimation` + `[P2-05] burst orphan` — deferred per spec Residual risks)
  - `npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-|P2-0[1236]"` → `19 pass / 0 fail` (quick smoke)
  - Full `npm test` → `835 tests / 824 pass / 11 fail` (`11 = 9 prior from 8-1/8-2/8-3/8-4 + 2 new`)

## Coverage (from `test-design-epic-8-5-reduced-motion.md`)

- **P0** `feel.test.ts` 12 + `punch.test.ts` 8 + `shake.test.ts` 12 + `bulletTime.test.ts` 9 + `feel.bench` 2 remain green (not regressed).
- **Benchmark:** `node --test triade/benchmarks/feel.bench.test.ts` — 2 pass under `median <0.05ms / p99 <0.1ms` both profiles.
- **Type-check:** `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean.

## Implementation Checklist

See checklist **Implementation Checklist** section: per-test tasks all `[x]` except the two expected RED items `[P2-04]` (add `cancelAnimation` before `withSequence` in `GameBoard.tsx:5`) and `[P2-05]` (track `burst setTimeout` or accept as deferred). Device smoke (P1-07) remains manual per test-design.

## Next

Fix the two REDs (`cancelAnimation` one-line + burst timer tracking / waived) to reach 21 GREEN, then run the 15-min device smoke (portrait+landscape `6`/`12`/`1536`/bullet/game-over + Reduced Motion ON flat + `Hud` chrome never shakes + `mid-shake toggle → snap` + `AIRPLANE`) and mark verified.
