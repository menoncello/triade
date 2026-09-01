---
status: done
epic: 8-6-sfx-haptics
workflow: bmad-testarch-test-design
artifacts:
  - _bmad-output/test-artifacts/test-design/test-design-epic-8-6-sfx-haptics.md
  - _bmad-output/test-artifacts/test-design-epic-8-6-sfx-haptics.md
  - _bmad-output/test-artifacts/test-design-progress.md
tests_verified: sfx.test.ts 11 pass (2 suites)
---

TEA Test Design for 8-6 SFX haptics completed. Mode: Epic-Level (Phase 4). Delta `b16a06e` vs `7e1916a` assessed as working-tree metadata-only; production delta is `sfx.ts` 152 LOC swappable gateway expo-audio 57.0.3 (3 kinds 0.45/0.65/1.0 + 0.35/0.9, FR-30 keep-sound), `assetManifest` 36 LOC degrade, `App.tsx` 20 LOC coupling, `sfx.test.ts` 11, `punch.atdd` wiring patch.

Risks: 10 scored — 4 high (R-001 coupled scale BUS 2×3=6, R-002 never-throw/never-block TECH 6, R-003 missing-wav degrade TECH 6, R-004 FR-30 keep-sound BUS 6), 4 medium (R-005/006 4, R-007/008 3), 2 low. NFR planned evidence: 60 FPS <0.1ms, never-throw degrade, single VOLUME_BY_HAPTIC + 3-kind allowlist + 5-site predicate maintainability, FR-30+no-music+chrome a11y, offline degrade.

Coverage: P0 8 groups host (<1 s, already green), P1 7 groups (+ device 15-min ear rank 3/6/12+ spawn gameOver + FR-30 ON), P2 4 scans, P3 3 bench/exploratory. Estimates ~6–9h host → ~10–20h elapsed with device. Gate P0 100% / P1 ≥95% / high-risk 100% mitigated; 3-kind allowlist + predicate allowlist + VOLUM literal allowlist + preload degrade pinned. Outputs validated against checklist.md and written under TEA `test_artifacts` (`_bmad-output/test-artifacts/test-design/` canonical + mirror) with `test-design-progress.md` updated; no production code modified.
