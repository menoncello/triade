---
status: done
---

# TEA Test Design — dw-gameover-hardware-back-handler

**Workflow:** `bmad-testarch-test-design` (TEA)
**Bundle:** `dw-gameover-hardware-back-handler` (DW-95)
**Mode:** Epic-Level sweep-bundle deep-dive
**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat)

**Artifacts:**
- `_bmad-output/test-artifacts/test-design/test-design-dw-gameover-hardware-back-handler.md` (primary)
- `_bmad-output/test-artifacts/test-design-dw-gameover-hardware-back-handler.md` (mirror)
- `_bmad-output/test-artifacts/test-design-progress.md` (appended progress entry `dw-gameover-hardware-back-handler`)

**Delta assessed:** `6335c41 → HEAD` working-tree (3 files `+21/-2`): `triade/src/ui/GameOverOverlay.tsx:2 BackHandler import + :84-95 hardwareBackPress () => true + cleanup sub.remove / (as any)removeEventListener []`, `triade/test-utils/rn-stub.ts:102-105 BackHandler stub`, `_bmad-output/implementation-artifacts/deferred-work.md:822 DW-95 open→done 2026-09-03 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00`.

**Risk summary:** 10 risks, 3 high (R-001 BLOCK `TS2339 removeEventListener` on `triade/tsconfig.json` — `BackHandlerStatic` RN 0.86 has no `removeEventListener`, stub masks it; R-002 `[]` forever-true vs future conditional `onContinueCancel`; R-003 zero prior BackHandler coverage). Other: R-004 stub narrow type mask, R-005 cleanup throw guard, R-006 mount race, R-007 no back affordance.

**Coverage:** P0 6 groups (mount `addCalls===1` + handler `true`, unmount `remove()`, legacy fallback `removeEventListener`, no-overlay `0`, reducedMotion independent, remount leak check), P1 7 groups (import + exact `hardwareBackPress` ×2 + `()=>true` + dual-path `as any` + `[]` deps + `rn-stub` surface + thin-view), P2/P3 5 groups (ledger `5f794ee…`, engine empty, manual Android smoke). Total effort `~2.0–3.8h` (`~0.3–0.5d`), host gate `<10 min` + optional `5 min` device smoke.

**Gate finding (BLOCK):** `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` fails `TS2339: Property 'removeEventListener' does not exist on type 'BackHandlerStatic'` at `GameOverOverlay.tsx:92` (test tsconfig passes via stub path-map). Mitigation: change fallback to `(BackHandler as any).removeEventListener?.('hardwareBackPress', handler)` before merge. This plan does not edit production code per prompt.

**Verification:** `npm --prefix triade test` `980 pass 0 fail 385 skipped` host still green; `gameOverOverlay.test.ts` 14+ pass; `ui.thinview` green; `git diff HEAD -- triade/src/engine` empty; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty (orchestrator-owned not written).

