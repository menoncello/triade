---
status: done
story: dw-gameover-hardware-back-handler
workflow: bmad-testarch-atdd
atdd_checklist: _bmad-output/test-artifacts/atdd-checklist-dw-gameover-hardware-back-handler.md
generated_tests:
  - triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts
test_counts: 20
suites: 4
p0: 7
p1: 7
p2: 5
p3: 3
mode: create
baseline_revision: 6335c4178ddb844283ce6fd533aef208904837c1
working_tree_delta:
  - triade/src/ui/GameOverOverlay.tsx:2 BackHandler import + :84-95 useEffect hardwareBackPress () => true dual-path
  - triade/test-utils/rn-stub.ts:102-105 BackHandler stub
  - _bmad-output/implementation-artifacts/deferred-work.md DW-95 open→done 2026-09-03 5f794ee...
sprint_status_owned: never-written-never-reverted-verified
evidence:
  dormant: "npm --prefix triade test -- __tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts => 4 pass 20 skipped 0 fail (~350ms)"
  activated: "de-skipped (test.skip→test) 20/20 pass + existing gameOverOverlay.test.ts 20/20 + ui.thinview 1/1 + full npm test 980 pass 407 skipped (<15 min)"
  tsc_test: "npx tsc --noEmit -p triade/tsconfig.test.json clean"
  tsc_prod: "BLOCK R-001: BackHandler.removeEventListener TS2339 on react-native@0.86.2 requires (BackHandler as any).removeEventListener?. until fix — triade/tsconfig.json fails, triade/tsconfig.test.json clean via stub path-map"
---

TEA ATDD complete for dw-gameover-hardware-back-handler (DW-95).

**Artifacts (TEA test_artifacts):**
- `_bmad-output/test-artifacts/atdd-checklist-dw-gameover-hardware-back-handler.md` — full checklist (7 ACs, 20 scaffolds: 7 P0 + 7 P1 + 5 P2 + 3 P3, Generation Mode AI, Stack frontend/node:test, Implementation Checklist with file:line tasks already done in working tree).
- `triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts` — 20 RED-phase scaffolds (outer `test` 4 suites pass, inner `test.skip` 20 skipped dormant; de-skipped 20/20 pass on working-tree delta).

**Implementation Checklist covers working-tree delta (6335c41 → HEAD):** `GameOverOverlay.tsx:2` BackHandler import + `:84-95` `useEffect(() => { handler () => true; sub=BackHandler.addEventListener('hardwareBackPress',handler); return () => sub.remove() / removeEventListener fallback } ,[])` lifetime `deps []` + `rn-stub.ts:102-105` BackHandler stub + ledger DW-95 `5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00`/`deb5edf9…`/`7374617475733a206f70656e` + spec `spec-gameover-hardware-back-handler.md` `done`.

**Gates:**
- Dormant `npm --prefix triade test -- __tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts` 4 pass 20 skipped 0 fail.
- Activated (inner `test.skip→test`) 20/20 pass; `gameOverOverlay.test.ts` 20/20 + `ui.thinview` 1/1 still green; full `npm --prefix triade test` 980 pass 407 skipped (dormant) / 980+20 when activated.
- `tsc --noEmit -p triade/tsconfig.test.json` clean; `tsc --noEmit -p triade/tsconfig.json` BLOCK R-001 `TS2339 removeEventListener` until `(BackHandler as any).removeEventListener?.` fix (stub masks in test tsconfig).
- `sprint-status.yaml` never written, never reverted — verified `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty.
