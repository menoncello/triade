---
status: done
---

TEA Test Design for `8-5-reduced-motion` completed.

Artifacts:
- _bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md (canonical per _bmad/tea/config.yaml:test_design_output)
- _bmad-output/test-artifacts/test-design-epic-8-5-reduced-motion.md (mirror per workflow.yaml epic-level output)
- _bmad-output/test-artifacts/test-design-progress.md appended with Step 5 for 8-5

Delta assessed: spec `baseline 10a3449 → final 0ec7482` (HEAD `0ec7482`); working-tree diff was metadata-only `sprint-status.yaml` `8-5 backlog→done`; assessed production delta is `0ec7482` vs `10a3449`: `App.tsx:929 reducedMotion={settings.reducedMotion}` fix, `feel.ts` `REDUCED_PRESET`/`reducedPresetFor` tightening, `punch/shake/bulletTime` preset delegation, `haptics.ts` FR-30 comment (never gate), `GameBoard` board-only + `AnimatedTile isMerge && !reducedMotion` + bursts/shake/bullet gating + `withTiming(0,20)` snap, `GameOverOverlay` `reducedMotion` instant vs `280ms` with cleanup, `feel.bench.test.ts` both-profile sweep `median <0.05/p99 <0.1` (full 9.6ms / reduced 6.5ms). Engine byte-identical verified, 805 pass / 9 expected RED not caused by 8-5, 2 bench tests pass, tsc clean.

Coverage: 10 risks (3 high P×I≥6: R-001 umbrella FR-30, R-002 preset-not-flag, R-003 GameOver wiring), 9 P0 host groups + 7 P1 + 5 P2 + 4 P3 (~25 checks, 12–24h elapsed). All gated to `P0 100%/P1 ≥95%`, single-preset/single-cap/single-datum invariants, board-only chrome guard, haptics stay, both-profile bench.

No production code modified.
