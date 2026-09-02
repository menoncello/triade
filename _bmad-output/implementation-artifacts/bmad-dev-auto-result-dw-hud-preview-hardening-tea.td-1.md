---
status: done
---

# TEA Test Design — dw-hud-preview-hardening

**Result:** done
**Mode:** Epic-Level (Phase 4) sweep-bundle deep-dive
**Scope:** Working-tree delta `triade/src/ui/Hud.tsx:9,23,64-67` (FALLBACK_PREVIEW + optional `previews?` + `?.`/`??` guard) + `deferred-work.md` DW-69 `open→done` with `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce`

**Artifacts (TEA `test_artifacts`):**
- Canonical: `_bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md`
- Mirror: `_bmad-output/test-artifacts/test-design-dw-hud-preview-hardening.md`
- Progress: `_bmad-output/test-artifacts/test-design-progress.md` (appended dw-hud-preview-hardening entry)

**Risk assessment:** 9 risks scored (P×I): 2 high ≥6 (R-001 TECH silent fallback masking wiring `2×3=6`, R-002 BUS empty `range []→""` UX/a11y `2×3=6`), 3 medium 3-4 (R-003 lane swap `2×2=4`, R-004 mutable singleton `1×3=3`, R-005 null `1×3=3`), remainder low (R-006 type widening, R-007 ledger 64-hex, R-008 score preserved, R-009 perf). Testability: controllability strong via pure `Hud` host `react-test-renderer` with `undefined/null/partial` fixtures; observability good via `doesNotThrow` + `hasToken 123` + `hasStyle 76×76/60×44` + `displayOf []→""`; reliability strong (`?.`/`??` never throws, `activeId` defaults `clean`).

**Coverage strategy (risk-based):**
- P0 7 groups: omitted `undefined/{}` no-throw portrait/landscape + partial `{clean: exact 3}` both `activeLaneId` branches + `null` no-throw + score `Recorde` preserved + engine byte-identical — host `<1s` + full `<15 min` gate, already green (910 pass / 10 expected RED baseline)
- P1 6 groups: distinct `clean 3 vs accelerated 6` wiring still distinct, `PreviewCard []→""` + a11y `Próxima`, chrome 76×76/60×44, `App.tsx` fan-out `previewFor==2`, `FALLBACK` single-source
- P2 4 checks: `FALLBACK==2`/`previews?==1`/`?? FALLBACK==1` + ledger `da2f401d` 2 lines + `Preview` import + no `export type Preview`
- P3 3 exploratory: empty chip visual + `10k× <0.05ms` bench + `previews.clean` bare-scan `==0`

**NFR planning:** Reliability never-throw+chrome preserved / maintainability single `FALLBACK`+`previews?`+`??`+64-hex / 60 FPS O(1) `<1ms` / thin-view + offline unchanged — each mapped to planned evidence (hud suites + `npx tsc` clean + `rg` allowlists). No production code modified per prompt.

**Verification:**
- `npm --prefix triade test -- __tests__/ui/components/hud*` → 8+9 wiring tests pass (subset of 910 pass)
- `npm --prefix triade test` → 910 pass / 10 expected RED (Epic 8 deferred feel ATDD) / 0 unexpected fail — engine `triade/src/engine` byte-identical, `triade/src/game/preview.ts` byte-identical
- `npm --prefix triade exec -- tsc --noEmit` (both tsconfigs) → clean
- `rg` allowlists: `FALLBACK_PREVIEW ==2`, `previews\? ==1`, `?? FALLBACK ==1`, `resolution-undo da2f401d ==2` — verified
