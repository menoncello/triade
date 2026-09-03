---
status: done
---

# TEA Test Design — dw-board-shake-width-hardening (DW-107, DW-110)

**Mode:** Epic-Level (Phase 4) sweep-bundle deep-dive
**Workflow:** `bmad-testarch-test-design` (Master Test Architect / Murat)
**Date:** 2026-09-02
**Delta:** `e3c4155 sweep dw-board-shake-width-hardening: DW-107, DW-110` vs `e3c52ae` — 2 prod files +150/-10

## Artifacts Produced (under TEA configured `test_artifacts`)

- `_bmad-output/test-artifacts/test-design-dw-board-shake-width-hardening.md` (60 KB, 363 lines) — primary epic-level test design (risk assessment + NFR planning + coverage matrix P0/P1/P2/P3 + execution PR/Nightly + resource ranges + quality gates + mitigation + interworking)
- `_bmad-output/test-artifacts/test-design/test-design-dw-board-shake-width-hardening.md` — mirrored copy per `test_design_output: _bmad-output/test-artifacts/test-design`
- `_bmad-output/test-artifacts/test-design-progress.md` appended — new section `# Test Design Progress — dw-board-shake-width-hardening` (prior bundles preserved)

**Config resolution:** `_bmad/tea/config.yaml` → `test_artifacts: {project-root}/_bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`, `risk_threshold: p1`, `communication_language: Português`, `document_output_language: English` — all resolved, docs written in English per `document_output_language`.

## Risk Assessment Summary

- **Total risks:** 10 (TECH 5, DATA 1, BUS/OPS 2, PERF 2, SEC n/a)
- **High (≥6):** 3
  - **R-001 (TECH/PERF 6):** `shakeNotifyTimerRef` 130ms vs `EARLY_INPUT_MS≈84ms` rapid re-trigger race — `clearTimeout` then re-arm or stuck `visible`. Mitigation: `jest.useFakeTimers()` pins second shake at t90 → single trailing `false` at t220; scans `clearTimeout ×2`, `130 ×3`.
  - **R-002 (TECH/DATA 6):** bare `width` reintroduced after `safeWidth` alias leaks `NaN` to `View/Canvas/overlay`. Mitigation: 7 degenerate `width` fixtures → `width:1 not NaN` across 5 sites; scan `safeWidth ==11`, `Number.isFinite(width) ==1`.
  - **R-003 (TECH/BUS 6):** `reducedMotion` mid-shake + unmount leaks `overflow:visible`. Mitigation: symmetric `cancelShakeNotify ×5` + unmount `clearTimeout`; host toggle `false→true` shows `[true,false]` within 0ms, NOOP/slide-only immediate `false`, `timerCount 0`.
- **Medium (3-4):** 5 (R-004 overflow `StyleSheet` `null` flatten, R-005 `width, height: width` literal alias for `reducedMotion.atdd P2-06`, R-006 `try/catch` swallow, R-007 130 vs `withSequence` ±1 frame drift, R-008 `BOARD_PADDING+SHAKE_CAP` `or` decision drift)
- **Low (1-2):** 2 (R-009 ledger `e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f` 64-hex ×2 ownership, R-010 per-render `Number.isFinite` overhead `<0.01ms`)
- **Testability:** Controllability Strong (literal `width NaN/Infinity/-5/0/as any`, `moveResult direction left/right/up/down/invalid`, `reducedMotion` toggle, `renderer.unmount()`), Observability Strong (`onShakeActiveChange` spy `[true]`→`[false]` after 130, `View/Canvas` `width 1`), Reliability Strong (never-throw, `try/catch` + cleanup, both `tsc` clean, 960 pass).

## Coverage Strategy Summary

- **P0 (22 scenarios, host-only `react-test-renderer` + `jest fakeTimers` + `rg`, <10 min):** 4-dir overflow `visible 130→hidden`, 5 cancel branches (NOOP/slide-only/no-dir/reducedMotion/invalid dir), 7 width guards `NaN/Infinity/-5/0/undefined as any` → `safeWidth 1`, 5-site `safeWidth` propagation, `App` wiring `isBoardShaking ? visible:null` + `onShakeActiveChange`, unmount `timerCount 0`, invalid dir zero vector. **Pass threshold 100%**.
- **P1 (11 scenarios/scans, PR gate <5 min):** rapid re-shake 90→220 single `false`, `reducedMotion` mid-shake snap `withTiming(0,20)`+cancel, `BOARD_PADDING+SHAKE_CAP 16` spare comment, `0/-5/null` edges, `notifyShakeActive` swallow, ledger 64-hex ×2 + `sprint-status.yaml` empty. **≥95%**.
- **P2 (5 scans, nightly):** `width, height: width` literal alias (`rg 1` comment + `safeWidth 3`), Hud asymmetry probe, landscape clip screenshot 240fps exploratory, narrow `boardSize 160` smoke, `tsc ×2` clean. **≥90%**.
- **P3 (1 bench + notes, on-demand):** 50-move replay `<30ms`, 1-frame drift ±10ms accepted residual.
- **Total effort:** ~3.6–6.3 hours (~0.45–0.8 day) — detailed in doc Resource Estimates table.
- **Gate criteria:** P0 100%, no high-risk unmitigated, `shake.atdd P2-05` + `bulletTime.atdd P2-05` flipped green (were `it.skip EXPECTED RED`), `reducedMotion.atdd P2-06` stays green, both `tsc` clean, `npm test` 960 pass, ledger `e7ad61…` 2 hits, `sprint-status.yaml` empty.
- **NFR planned evidence:** Reliability never-throw + Perf `130 p99 <16.7` + A11y FR-30 + Maintainability `safeWidth 11` / `SHAKE_CAP` single source + Visual clip `visible||padding` + Operational ledger — table in doc; no PASS/CONCERNS/FAIL until `nfr-assess`.

## Files Under Test (Working Tree)

- `triade/src/render/GameBoard.tsx:316-319` `finiteWidth/safeWidth` + `cell` on `safeWidth` (DW-110)
- `triade/src/render/GameBoard.tsx:331-364` `shakeNotifyTimerRef` + `notifyShakeActive/scheduleShakeVisible/cancelShakeNotify` + cleanup (DW-107)
- `triade/src/render/GameBoard.tsx:525-572` shake branching symmetric cancels + deps (DW-107)
- `triade/src/render/GameBoard.tsx:622-661` `safeWidth` on View/Canvas/RoundedRect/overlay (DW-110, preserves `width, height: width` literal)
- `triade/App.tsx:138` `isBoardShaking` + `:1020` conditional `overflow:visible` + `:1032` prop (DW-107)
- `triade/src/feel/shake.ts` byte-identical consumer (`SHAKE_CAP 8`, `maxShakeForTrace`, `directionVector`)
- No `triade/src/engine` diff (0 hunks), no `sprint-status.yaml` write.

## Not Modified

No production code was modified by this TEA workflow — artifact-only (test-artifacts + this result marker). Verification is via host `node:test` + `rg` scans + `tsc`; no device lane required except P2 exploratory screenshot (not gate).

## Handoff

- `rg` health gates ready: `safeWidth 11` / `overflow visible 1` / `overflow hidden 1` / `Number.isFinite(width) 1` / `shakeNotifyTimerRef 4` / `clearTimeout 2` / `130 3` / `cancelShakeNotify 5` / `e7ad615… 2`.
- To flip `it.skip P2-05` REDs green: add companion `it("P2-05 boardShakeWidthHardening …")` asserting `hasVisibleFix && hasPaddingFix && hasWidthGuard` in `shake.atdd.test.ts` + `bulletTime.atdd.test.ts` respectively, or un-skip and update wording.
