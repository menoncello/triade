---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
  - 'triade/src/game/preview.ts'
  - 'triade/src/ui/layout.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-hud-score-a11y-polish — Hud pt-BR thousands + preview a11y polish (DW-8)

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep bundle deep-dive for `dw-hud-score-a11y-polish`
**Scope:** Targeted test design for the working-tree delta of `dw-hud-score-a11y-polish`

> **Delta under assessment:** Working-tree `git diff 2a9b0154c8471ba4437a53ddc4571c5066c09d49..b41ba16ecd536f5adcde0e4b6d89f06644890a74` (spec intent: `spec-hud-score-a11y-polish.md` baseline `2a9b015` → final `b41ba16`) resolves DW-8 `open → done` with `resolution-undo: cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` without engine/preview distribution change:
> - `triade/src/ui/Hud.tsx:11-13` — adds `function fmt(n:number): string { return Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0'; }`
> - `triade/src/ui/Hud.tsx:44` — `LanePreview` wrapper `View` gains `accessible={false}` (decorative LanePreview chrome hidden from VoiceOver)
> - `triade/src/ui/Hud.tsx:81,84,128,131` — four `Text` sites now render `{fmt(score)}` / `Recorde {fmt(best)}` in both portrait (`scorePortrait`/`bestPortrait`) and landscape (`scoreLandscape`/`bestLandscape`) instead of raw `{score}`/`{best}`
> - `triade/src/ui/Hud.tsx:88` — `landscapePreviews` `View` gains `accessible={false}` alongside existing `pointerEvents="none"` (decorative preview band hidden)
> - `triade/src/ui/Hud.tsx:138` — `previewPortrait` `View` gains `accessible={false}` alongside existing `pointerEvents="box-none"` (decorative portrait preview slot hidden)
> - `triade/src/ui/PreviewCard.tsx:29` — unchanged but pinned: `View ... accessibilityLabel={announcement} pointerEvents="none" accessible accessibilityRole="text"` (announcement `Próxima (Label): value` must survive the three new `accessible={false}` wrappers)
> - `triade/src/engine` + `triade/src/game/preview.ts` — byte-identical (`git diff --stat -- triade/src/engine` empty, `triade/src/game/preview.ts` empty)
> - `deferred-work.md` DW-8 `status: done 2026-09-03` + `resolution: resolved by sweep bundle dw-hud-score-a11y-polish` + `resolution-undo` hash; `spec-hud-score-a11y-polish.md` `status: done` with verification commands (`tsc` both tsconfigs, `hud.test` + `previewCard.test`)
> - Working-tree uncommitted diff is only the ledger/spec metadata promotion (no additional `triade/src` drift beyond `b41ba16`)

---

## Executive Summary

**Scope:** Polish `Hud` to mockup parity: PT-BR thousands separator (`3.240`) on `score`/`best` in both orientations with a `Number.isFinite` guard, and explicitly hide decorative preview wrappers from the accessibility tree while preserving `PreviewCard`'s own `accessibilityLabel` and `pointerEvents="none"` contract. No layout math, no engine draw budget, no preview 60/40 distribution, no new animation/dependency.

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 2
- Critical categories: BUS (a11y announce breakage from `accessible={false}` inheritance), TECH (pt-BR Intl locale divergence between Node/JSC/Hermes)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit — 4-site formatting portrait/landscape, zero/large/non-finite guard, `PreviewCard` label+pointerEvents still exposed through hidden wrappers, pointerEvents+76×76/60×44 layout markers still green)
- P1 scenarios: 5 groups (exact thousand-boundary table, `fmt` isFinite guard semantics, a11y tree distinct-PreviewCard announce vs hidden wrapper, long `1.000.000` wrap/no-overlap, thin-view imports unchanged)
- P2/P3 scenarios: 5 groups (static `accessible={false}` ×3 + `fmt` ×4 + `toLocaleString('pt-BR')` ×1 allowlist scans, ledger `resolution-undo` hash, i18n locale exploratory, micro-bench, cross-cutting negative)
- **Total effort**: ~1.8–3.2 hours (~0.3–0.4 days; host-only, no device lane — pure RN `react-test-renderer`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine `src/engine/*` (`spawn.ts`/`pot.ts`/`ceiling.ts`/`game.ts`/`Board`/`PendingSpawn`/`move`/`spawnTile`), `src/game/preview.ts` 60/40 `PREVIEW_EXACT_BOUNDARY`, `FULL_POT_LADDER`, `availablePot` fan-out, `FALLBACK_PREVIEW` guard** | `git diff --stat -- triade/src/engine` empty and `triade/src/game/preview.ts` empty; sweep is presentation-only in `Hud.tsx:11-13,44,81,84,88,128,131,138`. No RNG draw budget, no tier/spawn change. | Engine invariants gated by ~980 passing host tests + `npx tsc --noEmit` clean; `preview.test.ts` + `preview-invariant` structural suites remain green. This plan only checks `Preview` type reuse is untouched via `rg` scan. |
| **`PreviewCard.tsx` display/ink beyond `accessibilityLabel`+`pointerEvents`+`displayOf` — accent `#E8A33D` 20pt, chrome `#f1eee6`/`#c9c4b8`/`borderRadius 12`, `displayOf` `exact→value`/`range→join('/')`/`[]→""` filtering** | Card renders verbatim `Preview`; styling is already pinned by `previewCard.test.ts` P0. This sweep only adds outer `accessible={false}` wrappers in `Hud`, not card internals. | Thin-view `previewCard.test.ts` + `hud.test.ts` suites stay gates; this plan only verifies `PreviewCard` props survive through hidden wrappers via `findAll(accessibilityLabel)` P0. |
| **`layout.ts` `getBandTop`/`SAFE_MARGIN`/`bandHeight`/`boardSize` clamp, `App.tsx` `availablePot` recompute + `previews` fan-out** | Already hardened by `dw-layout-band-dedup-and-guard` + `dw-hud-preview-hardening`; this sweep leaves `layout.ts:31` and `App.tsx:950` untouched except re-checking markers still pass. | `layout.test.ts` + `previewWiring` suites remain green; this plan only verifies `hasStyle({width:76,height:76})` / `{minWidth:60,height:44}` still present when `fmt` length grows. |
| **Benchmark/frame-rate both-profile, RevenueCat/AdMob/IAP, Epic 10-11 monetization, feel presets `src/feel/*`** | `fmt` is O(1) pure `toLocaleString` per render (4 call sites), no `Animated`/`worklet`/`Math.random`, no new native module; no `package.json` script change. | No new bench lane; host `npm test` stays `~980 pass / 366 skip` `<15 min`, `feel.bench.test.ts` caps unchanged. |
| **Deferred-work ledger entries beyond DW-8 `open→done` with `resolution-undo: cb5eeedd…`** | Ledger lists 60+ entries; only DW-8 moves this sweep. | Other DW entries remain `open`/`done`/`already resolved` and are not re-triaged. |
| **`sprint-status.yaml` orchestrator ownership** | Owned by orchestrator per prompt; never written by this workflow. | This plan never writes `sprint-status.yaml`; only `deferred-work.md` `resolution-undo` hash is checked. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `Hud` is a pure function component `(HudProps: score, best, isLandscape, insets, bandHeight, previews, activeLaneId) → ReactTree` with no RNG, no `Math.random`, no engine import. `fmt` is a closed `number → string` pure branch `Number.isFinite → toLocaleString('pt-BR')` driven by literal `score`/`best` fixtures (0, 123, 3240, 12456, 1000000, NaN, Infinity, -1). `accessible={false}` wrappers are literal boolean props on `View`s `LanePreview`/`landscapePreviews`/`previewPortrait`. Host `node --import tsx --test` + `react-test-renderer` drives all cases without Expo dev build; `PreviewCard` `displayOf` is already deterministic.

**Observability — Good.** Failure modes are rendered-string tokens (`"3.240"` vs `"3240"`, `"NaN"` literal vs `"0"`, `Recorde 12.456` vs `Recorde 12456`) inspectable via `allText(renderer)` token scan (`hasToken(t,'3.240')` exact, `p.includes('Recorde')` + `p.includes('12.456')`), and accessibility-tree `findAll(n => n.props.accessibilityLabel === 'Próxima (Clean): 3')` presence (child announce) vs `findAll(n => n.props.accessible===false)` count==3 wrappers (parent hidden). `hasStyle({width:76,height:76})` / `{minWidth:60,height:44}` + `pointerEvents` props remain observable via `node.props.style` / `node.props.pointerEvents`. No snapshot-only gate — tokens are literal.

**Reliability — Strong but with one external.** `fmt` is deterministic given a fixed ICU; Node 22 ICU ships `pt-BR` (`1234 → "1.234"`). Risk is Hermes/JSC on device may ship a different ICU or fall back to `en-US` (`"1,234"` comma) if `pt-BR` locale data not bundled — see R-001. `accessible={false}` semantics are RN-stable (parent hidden does not auto-hide `accessible` child on iOS — tested via `findAll(accessibilityLabel)` still finds `PreviewCard` through hidden parent). No `useEffect`/`setTimeout`/`Animated` introduced — no flake from timers. Existing full gate `npm --prefix triade test` is deterministic `<5s` for hud/preview suites.

**Testability Risks:** Two surfaces thin: (a) `toLocaleString('pt-BR')` delegates to runtime Intl — CI Node vs device Hermes divergence not caught by host-only suite alone; needs device manual check in sweep acceptance (spec Verification Manual checks already lists it). (b) `accessible={false}` on `View` that wraps a `View accessible` child — RN spec says child `accessible` still exposes a separate accessibility element, but Android TalkBack vs iOS VoiceOver grouping differs; host `react-test-renderer` tree models this correctly (labels found through hidden parent), yet real VoiceOver grouping should be manually spot-checked once (portrait + landscape).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **`toLocaleString('pt-BR')` locale-data divergence — CI Node ICU formats `3240 → "3.240"` but Hermes/JSC on device may fall back to `"3,240"` (comma) or `"3240"` (no grouping) if `pt-BR` not bundled.** `fmt` delegates to `Number.prototype.toLocaleString` without `Intl.NumberFormat` options pin; grouping separator is locale-data dependent (pt-BR `.`, en-US `,`). Existing `hud.test.ts` tokens `hasToken(t,'123')` stay green for small numbers but would silently miss the thousands contract without a new `hasToken(t,'3.240')` pin. | 2 | 3 | **6** | Keep `fmt` as landed `Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0'` (`Hud.tsx:11-13`). Gate by dual P0 host pins: `score=3240` portrait renders token `"3.240"` (not `"3240"` nor `"3,240"`), `best=12456` landscape `includes('12.456')` inside `Recorde` text, `1000000 → "1.000.000"`, `0 → "0"`, `NaN/Infinity → "0"` (no `"NaN"` literal). Add device manual spot-check: Expo Go portrait+landscape at `3240` shows `"3.240"` (spec Verification already requires it). If Hermes lacks `pt-BR`, follow-on hardens to manual `Intl.NumberFormat('pt-BR')` with `group` char `"."` or regex fallback. |
| R-002 | BUS | **`accessible={false}` on three decorative wrappers inadvertently hides `PreviewCard`'s own `accessibilityLabel "Próxima (Clean): 3"` if RN merges the accessibility tree.** `LanePreview` wrapper, `landscapePreviews` band, and `previewPortrait` slot are now `accessible={false}`. If RN treated parent `accessible={false}` as hiding subtree, VoiceOver would lose `Próxima (Clean): 3` / `Próxima (Accelerated): …` entirely — the preview map's only a11y surface. Current `PreviewCard` is `View accessible accessibilityLabel pointerEvents="none"` inside the hidden wrapper; RN spec keeps child `accessible` as its own element, but Android/iOS grouping differs and host renderer is not VoiceOver. | 2 | 3 | **6** | Keep wrappers as landed `accessible={false}` on `LanePreview` (`Hud.tsx:44`), `landscapePreviews` (`Hud.tsx:88`), `previewPortrait` (`Hud.tsx:138`) with `PreviewCard` unchanged (`PreviewCard.tsx:29` `accessible`+`accessibilityLabel`+`pointerEvents="none"`). Gate: `renderHud({score:123, activeLaneId:'clean', previews:{clean:{kind:'exact',value:3}}})` still `findAll(n=>n.props.accessibilityLabel?.includes('Próxima (Clean): 3')).length >=1` and `pointerEvents==="none"` on that node, in both orientations; `findAll(n=>n.props.accessible===false).length ===3` wrappers. Device manual VoiceOver spot: portrait + landscape announces `Próxima (Clean): 3` (spec Verification requires it). Never remove `PreviewCard` `accessible`/`accessibilityLabel` — it is the pinned contract. |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | **`fmt` `Number.isFinite` guard scope — `score`/`best` typed `number` but future caller could pass `undefined`/`null`/`string` (JS coercion); guard returns `'0'` only for non-finite numbers, not for `null`→`0` via `Number.isFinite(null)===false` (already `'0'`) but `fmt('3240' as any)` `Number.isFinite('3240')===false → '0'` (silent wrong). Also `-0` → `"0"` vs `"-0"` edge, and `-3240 → "-3.240"` grouping sign placement.** | 2 | 2 | 4 | Keep `fmt` as landed `Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0'`. Gate: `NaN/Infinity/-Infinity → "0"` (no throw, no `"NaN"`/`"Infinity"` literal); `fmt(3240)==="3.240"`; `fmt(0)==="0"`; `fmt(-3240)` documents `"-3.240"` (negative not used in game but guard stable). Type keeps `HudProps score:number best:number`; `tsc --noEmit` (both tsconfigs) proves no `any` widening. Future misuse `fmt(any)` fails via `Number.isFinite` → `"0"` rather than throw — acceptable defensive. |
| R-004 | TECH | **Long formatted score `1.000.000` (9 chars vs 7 raw) overflows `scoreWrap` flex / `scorePortrait 34pt` + `bestPortrait 13pt` `flexWrap: wrap` + `numberOfLines=2` on narrow portrait, or `scoreLandscape 22pt` `landscapeLeft flexShrink:1` on landscape, causing overlap with `PauseButton` `pauseSlot 44pt` or pushing `landscapeRight` off-screen.** `Hud.tsx:126-131` already `numberOfLines=2` + `flexWrap: wrap`, but `1.000.000` is wider than `1000000`. | 1 | 3 | 3 | Monitor — keep layout markers `width:76 height:76` portrait / `minWidth:60 height:44` landscape + `pauseSlot 44` + `pointerEvents` contracts unchanged. Gate: `renderHud({score:1000000, best:1000000})` portrait still `hasStyle({width:76,height:76})` + `hasStyle({width:44?, actually HIT_TARGET})` via `pauseSlot` and `scoreWrap flex:1`; landscape still `hasStyle({minWidth:60,height:44})` + `hasStyle({width:HIT_TARGET})` for pause. No throw, no missing token. Visual exploratory: portrait + landscape at `1.000.000` has no overlap per spec Verification `Manual checks` — spot on simulator if available. |
| R-005 | TECH | **`pointerEvents` + `accessible` interplay regression — `landscapePreviews` now `pointerEvents="none" accessible={false}` and `previewPortrait` `pointerEvents="box-none" accessible={false}`; a future edit swapping `box-none`↔`none` or removing `pointerEvents` would let the decorative preview intercept touches meant for the board swipe or PauseButton.** The preview chrome is `pointerEvents="none"` on `PreviewCard` itself, but the lane wrapper must stay non-interactive. | 1 | 3 | 3 | Keep contracts as landed: outer overlay `pointerEvents="box-none"` (`Hud.tsx:77,123`), `landscapePreviews` `pointerEvents="none" accessible={false}` (`Hud.tsx:88`), `previewPortrait` `pointerEvents="box-none" accessible={false}` (`Hud.tsx:138`), `PreviewCard` `pointerEvents="none"` (`PreviewCard.tsx:29`), `LanePreview` `accessible={false}` (`Hud.tsx:44`). Gate: `findAll(n=>n.props.pointerEvents==='box-none').length >=2` (overlay + previewPortrait) + `findAll(n=>n.props.pointerEvents==='none').length >=1` (landscape band + card) + `hasStyle` markers. Any swap fails the allowlist scans. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-006 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — DW-8 `open→done` carries 64-hex `cb5eeedd…` on this bundle; orchestrator's `sprint-status.yaml` is orchestrator-owned.** A follow-on sweep reopening without hash loses revert trail; writing `sprint-status.yaml` violates bookkeeping. | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` per entry; any reopen preserves it. This plan never writes `sprint-status.yaml`. |
| R-007 | DATA | **`score`/`best` still rendered when formatting active — Hud must not suppress score on large/zero/non-finite inputs.** Formatting is O(1) string transform, not conditional render. | 1 | 2 | 2 | Monitor — gate via `allText` `hasToken(t,'0')` / `hasToken(t,'3.240')` / `Recorde` label present even at `1.000.000` and `NaN→"0"` (P0). |
| R-008 | PERF | **Micro overhead of `fmt` `toLocaleString` per render ×4 call sites (portrait score/best + landscape score/best; only one orientation renders per commit).** `toLocaleString` allocates per call; worst 2 calls per render. | 1 | 1 | 1 | Monitor — no bench lane; verify host `node --import tsx` micro-bench `10k× fmt(3240)` `<10ms` total (already `<0.001ms` per call). CI `npm test` timing unchanged. |

### Risk Category Legend

- **TECH**: Technical/Architecture (Intl locale, `fmt` guard, `pointerEvents`/`accessible` interplay, long-string layout)
- **SEC**: Security — none this sweep (no auth/data exposure; Hud is pure presentation with `number` props)
- **PERF**: Performance — `fmt` O(1) `<1ms` per render (R-008)
- **DATA**: Data Integrity — score still rendered when formatted (R-007)
- **BUS**: Business Impact — VoiceOver announcement loss via `accessible={false}` inheritance (R-002), PT thousands UX parity
- **OPS**: Operations (ledger `resolution-undo`, `sprint-status.yaml` ownership R-006)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-hud-score-a11y-polish` touches the **HUD presentation + a11y seam only**: **i18n PT thousands formatting (mockup "3.240" parity)**, **a11y (VoiceOver tree for preview wrappers vs `PreviewCard` announce)**, **reliability (never-throw on non-finite/zero/large with `Number.isFinite` guard)**, **maintainability (single `fmt` helper + 3× `accessible={false}` discipline)**, and **performance 60 FPS budget unchanged** (O(1) string, no `Animated`/`Math.random`).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| i18n — PT thousands parity | `score`/`best` rendered via `pt-BR` grouping `.` in both portrait (`scorePortrait`/`bestPortrait`) and landscape (`scoreLandscape`/`bestLandscape`): `123→"123"`, `3240→"3.240"`, `12456→"12.456"` (inside `Recorde …`), `1000000→"1.000.000"`, `0→"0"`. No comma fallback. | R-001 | Unit host: `hud.test.ts` + new thousand-boundary pins `3240/12456/1000000/0` portrait+landscape via `allText` `hasToken`/`includes` scan | `triade/__tests__/ui/components/hud.test.ts`  `hasToken('3.240')` / `includes('12.456')` / `hasToken('1.000.000')`  + `npm --prefix triade test` green + manual Expo Go portrait+landscape `3240→"3.240"` spot (spec Verification) |
| Reliability — never-throw + HUD chrome preserved | `Hud({score,best,insets,bandHeight,previews,activeLaneId})` with `score/best` in `{0,123,3240,Infinity,NaN,-Infinity}` and either `isLandscape` renders without throwing; `score` + `Recorde` + `Clean` label + portrait `76×76` / landscape `60×44` chrome + `PauseButton` still present; non-finite → `"0"` not `"NaN"` | R-003, R-004, R-007 | Unit host: `assert.doesNotThrow` for zero/NaN/Infinity/large in both orientations + `hasToken('0')` + no `hasToken('NaN')` | `triade/__tests__/ui/components/hud.test.ts` existing zero-guard pin + new `NaN/Infinity/1.000.000` no-throw pins + `allText` `hasToken('0')` + `rg -n "NaN" triade/src/ui/Hud.tsx ==0` outside comment/safe literal |
| a11y — VoiceOver tree | Decorative wrappers `LanePreview` / `landscapePreviews` / `previewPortrait` are `accessible={false}` (hidden), while `PreviewCard` card remains `accessible` with `accessibilityLabel="Próxima (Clean): 3"` and `pointerEvents="none"` through them, both orientations. No `accessibilityLabel` loss. | R-002 | Unit host: `findAll(accessibilityLabel includes 'Próxima (Clean): 3') >=1` through hidden parents + `findAll(accessible===false)==3` + `pointerEvents` contracts; manual VoiceOver portrait+landscape announce `Próxima (Clean): 3` | `triade/__tests__/ui/components/hud.test.ts` + `previewCard.test.ts` P0 `accessibilityLabel`/`pointerEvents="none"` pins + host `findAll` counts + manual VoiceOver spot (spec Verification) |
| Maintainability | Single `function fmt(n:number): string` (`Number.isFinite` + `toLocaleString('pt-BR')`) and exactly 4 call sites `fmt(score)`×2 / `fmt(best)`×2, exactly 3 `accessible={false}` sites (`LanePreview` wrapper, `landscapePreviews`, `previewPortrait`), single `toLocaleString('pt-BR')` literal; no engine import | R-005, R-006 | Static-assert: `rg -n "function fmt"==1` + `rg -n "fmt\(score\)"==2` + `rg -n "fmt\(best\)"==2` + `rg -n "accessible=\{false\}"==3` + `rg -n "toLocaleString\('pt-BR'\)"==1` + `rg -n "resolution-undo" ledger ==2` lines for DW-8 | Source scan + `Hud.tsx` diff + ledger diff; `tsc --noEmit` both tsconfigs clean proves no `any` widening |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame `p99 <16.7ms`. `fmt` adds `<1 ms` per Hud render (2 `toLocaleString` calls per orientation, O(1) alloc, no `setTimeout`/`Animated`). No new worklet, no `Math.random`. | R-008 | Host micro-bench `10k× fmt(3240)` median `<1ms` total optional or rely on CI `npm test` timing | CI `npm test` timing + `feel.bench.test.ts` median/p99 unchanged + `tsc` clean |
| Compliance — thin-view + never-throw | Hud is `View`+`Text`+`PreviewCard` chrome only; no `Animated`/`withSequence` import beyond `PauseButton` already; `fmt` keeps thin-view (orchestrator owns score math, Hud owns formatting only) | — | Structural: `stripCommentsAndStrings(Hud.tsx)` contains no `Animated` beyond re-export, `extractNamedImports` shows only `Preview` + `PauseButton`/`layout` siblings | `engine.purity` + `ui.norolls` structural gates stay green (already via hardening) + `rg -n "from '../game/preview"==1` |

**Unknown thresholds:** None material. `fmt` `pt-BR` `.` grouping is a format choice not a metric threshold; `<1 ms` `fmt` cost is observed not invented; ledger `resolution-undo cb5eeedd…` is evidence hash not threshold. If Hermes requires bundling `pt-BR` locale data or switching to `Intl.NumberFormat('pt-BR', {useGrouping:true})`, record its new `rg` counts as baseline rather than inventing a threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (DW-8 intent/boundaries signed — raw `{score}` lacks PT thousands vs mockup `3.240`, decorative preview Views leak to VoiceOver; guard `Number.isFinite` + `toLocaleString('pt-BR')` and `accessible={false}` wrappers with `PreviewCard` announce preserved; `triade/src/engine` + `triade/src/game/preview.ts` byte-identical contract)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `node:assert/strict` + `react-test-renderer`; working-tree on `b41ba16` with `2a9b015` baseline)
- [ ] Test data available or factories ready (`score`/`best` literals `0/123/3240/12456/1000000/NaN/Infinity/-Infinity`, `Preview` `exact 3`/`range [3,6,12]` + `FALLBACK_PREVIEW {range, []}` + `insets` 10/10/10/10 + `bandHeight` 40 + both orientations + `activeLaneId` clean default)
- [ ] Feature deployed to test environment (working-tree `Hud.tsx:11-13,44,81,84,88,128,131,138` patched; `git diff --stat -- triade/src/engine` empty and `triade/src/game/preview.ts` empty verified)
- [ ] No engine edits beyond `Hud.tsx` formatting + a11y wrappers and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (thousands `3.240`/`12.456`/`1.000.000` portrait+landscape + zero + non-finite `"0"` no `NaN` + `PreviewCard` label+pointerEvents through hidden wrappers + pointerEvents+chrome markers + engine byte-identical — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — exact boundary table `123/3240/0/NaN`, `fmt` guard semantics, a11y tree distinct announce, long-string no-overlap, thin-view unchanged
- [ ] No open high-priority / high-severity bugs (R-001 locale + R-002 announce green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on `fmt`+`accessible` seam; `rg` allowlists for `fmt`×1/`fmt(score)`×2/`fmt(best)`×2/`accessible={false}`×3/`toLocaleString('pt-BR')`×1 green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (both hit via `npx tsc` probes below)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (pt-BR grouping vs comma fallback, wrapper hidden vs announce)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns `3.240`/`12.456`/`1.000.000` formatting pins + `NaN→"0"` guard + `PreviewCard` announce-through-hidden-wrapper pins + `rg` allowlist scans (`fmt`/`accessible`/`toLocaleString`), ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `Hud.tsx:11-13,44,81,84,88,128,131,138` `fmt` helper + 4-site formatting + 3-site `accessible={false}` + `PreviewCard` `displayOf` preserve, `tsc` both tsconfigs |
| PM | PM | Signs PT thousands `"."` grouping parity vs comma (mockup `3.240`) + accepts decorative preview wrappers hidden (`accessible={false}`) while `PreviewCard` announce stays `Próxima (Label): value` |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the polish; host unit + smoke, already green on `b41ba16` (`npm --prefix triade test` 980 pass)

**Criteria**: Blocks mockup parity + a11y announce + high risk (≥6) + no workaround (wrong grouping or missing announce is user-visible)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC1 — Portrait score `3240` renders `"3.240"` (not `"3240"` nor `"3,240"`), `best 0` renders `"0"` | Unit (react-test-renderer) | R-001, R-007 | 1 | QA | `renderHud({isLandscape:false, score:3240, best:0})` → `allText` `hasToken(t,'3.240')` true + `!hasToken(t,'3240')` + `!hasToken(t,'3,240')` + `hasToken(t,'0')` for best. `Hud.tsx:128` `fmt(score)` in `scorePortrait`. |
| AC2 — Landscape `best 12456` renders `Recorde 12.456` (pt-BR) alongside score `3240 → "3.240"` | Unit | R-001 | 1 | QA | `renderHud({isLandscape:true, score:3240, best:12456})` → `allText` `t.some(p=>p.includes('Recorde') && p.includes('12.456'))` + `hasToken('3.240')`. `Hud.tsx:81/84` `scoreLandscape`/`bestLandscape`. |
| AC3 — Zero `score 0 best 0` renders `"0"` in both orientations without throw | Unit | R-003, R-007 | 1 | QA | `assert.doesNotThrow(()=>renderHud({score:0,best:0}))` portrait + `isLandscape:true` variant; `hasToken('0')` ≥1 + `Recorde` label present. Existing pin extends with fmt-variant. |
| AC4 — Non-finite guard: `NaN`/`Infinity`/`-Infinity` score+best render `"0"` not `"NaN"`/`"Infinity"` and do not throw (4 Text sites) | Unit | R-003 | 1 | QA | `renderHud({score:NaN,best:Infinity})` + `renderHud({score:Infinity,best:NaN})` → `!hasToken('NaN')` + `!hasToken('Infinity')` + `hasToken('0')` count ≥2 + `Recorde` still present. `fmt` `Number.isFinite` branch. |
| AC5 — Large `1000000 → "1.000.000"` in portrait with `width:76 height:76` + `pauseSlot` + `Recorde` still present and no throw | Unit | R-001, R-004 | 1 | QA | `renderHud({score:1000000,best:1000000})` → `hasToken('1.000.000')` + `hasStyle({width:76,height:76})` + `hasStyle({width:HIT_TARGET})` (pauseSlot) + `t.some(includes('Recorde'))`. Proves grouping + chrome. |
| AC6 — Preview a11y: `PreviewCard` `accessibilityLabel "Próxima (Clean): 3"` + `pointerEvents="none"` + `accessible` still exposed through `accessible={false}` wrappers in portrait (exact) and landscape (range) | Unit | R-002, R-005 | 1 | QA | `renderHud({previews:{clean:{kind:'exact',value:3}}, activeLaneId:'clean'})` portrait → `findAll(n=>n.props.accessibilityLabel==='Próxima (Clean): 3').length>=1` + that node's `accessible===true` + `pointerEvents==="none"`; `findAll(n=>n.props.accessible===false).length===3` wrappers counted via `rg` allowlist. Landscape `isLandscape:true` same. |
| AC7 — `pointerEvents` contracts preserved: overlay `box-none`, `landscapePreviews none`, `previewPortrait box-none`, `PreviewCard none` + engine byte-identical | Static scan + unit | R-005, R-006 | 1 | QA | `rg` scan: `pointerEvents="box-none" >=2` (overlay×2 + previewPortrait) + `pointerEvents="none" >=2` (landscapePreviews + card) + `git diff --stat -- triade/src/engine` empty + `triade/src/game/preview.ts` empty + full suite `≈980 pass` unchanged + `tsc` both clean. |

**Total P0**: 7 checks (host unit + 2 `rg` gates), `<1 s` host + `<15 min` full gate

### P1 (High) — Core formatting + a11y semantics + layout

**Criteria**: Important `Hud`→`PreviewCard` seam + medium/high risk + common `score`/`preview`/`orientation` flows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Exact thousand-boundary table — `fmt` mapping `0→"0"`, `123→"123"`, `999→"999"`, `1000→"1.000"`, `3240→"3.240"`, `12456→"12.456"`, `1000000→"1.000.000"` plus negative `-3240→"-3.240"` doc | Unit | R-001, R-003 | 1 | QA | Direct `fmt` unit table: `assert.equal(fmt(3240),"3.240")` etc. via imported `fmt` (export test-only or inline re-derive `Number.isFinite(n)?n.toLocaleString('pt-BR'):'0'`). No `Intl` options — grouping `.` asserted. |
| `fmt` isFinite guard semantics — `NaN→"0"`, `Infinity→"0"`, `-Infinity→"0"`, `Number.isFinite('3240' as any)→"0"` (string misuse) + no `undefined` literal leaks | Unit | R-003 | 1 | QA | `fmt(NaN)==="0"` + `fmt(Infinity)==="0"` + `fmt('3240' as any)==="0"` + `allText` never contains `"NaN"`/`"Infinity"`/`"undefined"` after rendering non-finite scores. |
| a11y tree distinct announce — `activeLaneId='clean'` → `Próxima (Clean): 3` present, `activeLaneId='accelerated'` → `Próxima (Accelerated): 12` present, never the other lane's label, through hidden wrappers | Unit | R-002 | 1 | QA | `renderHud({previews:{clean:exact 3, accelerated:exact 12}, activeLaneId:'clean'})` → label `Clean` present `Accelerated` absent (text + a11y); opposite for `accelerated`. Proves wrapper hide did not swap lanes. |
| Long formatted `1.000.000` no-overlap — portrait `scoreWrap flex:1` + `pauseSlot HIT_TARGET` + `76×76` and landscape `landscapeLeft flexShrink:1` + `60×44` still `hasStyle` green at `1.000.000` | Unit | R-004 | 1 | QA | `renderHud({score:1000000})` portrait+landscape both still `hasStyle` chrome + `pauseSlot`/`landscapeRight` present; `scorePortrait numberOfLines=2` still `adjustsFontSizeToFit=false`. No throw. |
| Thin-view imports unchanged — `Hud.tsx` still only `react-native` + `./PauseButton` + `./layout` + `./PreviewCard.tsx` + `../game/preview` (no `Animated`/`reanimated`/`skia`) | Static scan | R-008 | 1 | QA | `rg -n "from 'react-native'"`==1 + `rg -n "from './PreviewCard"`==1 + `rg -n "Animated|reanimated|skia" triade/src/ui/Hud.tsx ==0` + `tsc` clean. |

**Total P1**: 5 checks, ~0.4–0.7 h host (mostly existing `hud.test`/`previewCard.test` + 1 new `fmt` table pin)

### P2 (Medium) — Secondary flows + low/medium risk + static scans

**Criteria**: Secondary glue + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-constant / single-helper allowlists — `function fmt` `==1`, `fmt(score)` `==2`, `fmt(best)` `==2`, `accessible={false}` `==3`, `toLocaleString('pt-BR')` `==1` in `Hud.tsx:1` scope; no stray raw `{score}`/`{best}` Text literal outside `fmt` | Static scan | R-001, R-002, R-005 | 1 | QA | `rg -n "function fmt" triade/src/ui/Hud.tsx ==1` + `rg -n "fmt\(score\)" ==2` + `rg -n "fmt\(best\)" ==2` + `rg -n "accessible=\{false\}" ==3` + `rg -n "toLocaleString\('pt-BR'\)" ==1` + `rg -n "\{score\}|\{best\}" triade/src/ui/Hud.tsx` must be 0 bare (only inside `fmt()`). Any bare reappears is FAIL. |
| Ledger `resolution-undo` hash — DW-8 `open→done` carries 64-hex `cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` | Static scan | R-006 | 1 | QA | `rg -n "cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510" _bmad-output/implementation-artifacts/deferred-work.md ==1` (resolution-undo line) + `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` health. |
| `FALLBACK_PREVIEW` / `previews` shape unchanged — `FALLBACK_PREVIEW` still singleton `{kind:'range',values:[]}` single-source (not duplicated by this sweep) | Static scan | R-005, R-006 | 1 | QA | `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2` (def + use in `activePreview` selector) still; `rg -n "previews\?" triade/src/ui/Hud.tsx` unchanged (optional already from prior sweep). No new preview shape. |
| Score `best` label `Recorde` intact with formatted value — `Recorde 3.240` vs raw `Recorde 3240` not regressed to missing label | Unit | R-007 | 1 | QA | `renderHud({best:3240})` portrait `allText` includes token containing `Recorde` **and** `3.240` (not just `Recorde` alone). Landscape same. |

**Total P2**: 4 checks, ~0.2–0.4 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — formatted score visual: manual `Expo Go` snapshot `Hud` at `score 3240 best 12456` portrait+landscape shows `"3.240"` + `"Recorde 12.456"` legible, no yellowbox, no overlap with `PauseButton`, `PreviewCard` `Próxima (Clean): 3` still announced via VoiceOver | Host visual exploratory | 1 | QA | Spec Verification `Portrait + landscape render at score 3240 shows "3.240"; PreviewCard VoiceOver announcement still "Próxima (Clean): 3"; no overlap on PauseButton`. If comma shown, file follow-on `Intl.NumberFormat` hardening. |
| Micro-bench — `fmt` overhead `10k× fmt(3240)` `<10ms` total (`<0.001ms` per call) | Unit (bench) | 1 | DEV | `Hud` is 2 `toLocaleString` per render (one orientation); `feel.bench.test.ts` budget unchanged. Optional `performance.now()` loop. |
| Cross-cutting negative — `rg -n "\{score\}" triade/src/ui/Hud.tsx` should be `==0` bare (only `fmt(score)`), and `rg -n "accessible" triade/src/ui/Hud.tsx` should be exactly `==3` `accessible={false}` sites (no extra `accessible` added to `PreviewCard` wrappers that would re-expose decorative layer) | Static scan | 1 | QA | If bare `{score}` reappears or `accessible` count drifts from 3, file a patch before merge. |

**Total P3**: 3 checks, ~0.2–0.3 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `Hud` import/TS regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/ui/components/hud.test.ts __tests__/ui/components/previewCard.test.ts` — both green including `hasStyle` 76×76/60×44 + `previewCard` `accessibilityLabel`/`pointerEvents` + existing `123/456` tokens (`<2 s`)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore` / no `fmt` import miss)

**Total**: 2 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical polish fail-fast (host only) — thousands parity + guard + announce

- [ ] Portrait `3240→"3.240"` + `0→"0"` not comma/raw + `best Recorde 12.456` landscape
- [ ] `NaN/Infinity→"0"` no `NaN` literal, no throw, `Recorde` still present both orientations
- [ ] Large `1000000→"1.000.000"` portrait still `76×76` + `pauseSlot`
- [ ] `PreviewCard` `Próxima (Clean): 3` + `pointerEvents="none"` still exposed through 3× `accessible={false}` wrappers (portrait+landscape)
- [ ] `pointerEvents` contracts `box-none`/`none` + `git diff --stat -- triade/src/engine` empty + `triade/src/game/preview.ts` empty

**Total**: 5 P0 groups (host assertions + 2 `rg` gates)

### P1 Tests (<30 min)

**Purpose**: Semantics + boundary + thin-view

- [ ] `fmt` table `0/123/999/1000/3240/12456/1000000/-3240` exact strings
- [ ] `fmt` guard `NaN/Infinity/'3240'→"0"` + no `undefined` literal
- [ ] `activeLaneId` clean vs accelerated `Próxima (…): value` distinct through hidden wrappers
- [ ] Long `1.000.000` still chrome `76×76`/`60×44` no overlap
- [ ] Thin-view `Animated/reanimated/skia` absent in `Hud.tsx`

**Total**: 5 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, ledger, exploratory

- [ ] Allowlist `fmt==1` / `fmt(score)==2` / `fmt(best)==2` / `accessible={false}==3` / `toLocaleString('pt-BR')==1` + no bare `{score}` (`<1 s`)
- [ ] Ledger `resolution-undo cb5eeedd… ==1` line + `FALLBACK_PREVIEW==2` health (`<1 s`)
- [ ] Visual exploratory portrait+landscape `3.240` + `Recorde 12.456` + VoiceOver `Próxima (Clean): 3` (`<5 min` manual)

**Total**: 3 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 7 | ~0.12 | ~0.6–0.9 | `3.240`/`12.456`/`1.000.000`/`0`/`NaN→0` + through-hidden-wrapper announce + `pointerEvents`/`rg` engine-empty — pure `hud.test` + `previewCard.test` + host `findAll` |
| P1 | 5 | ~0.20 | ~0.8–1.2 | `fmt` table + guard + lane-distinct announce + long-string chrome + thin-view scan — mostly existing suites, 2 new pins |
| P2 | 4 | ~0.12 | ~0.3–0.5 | Single-helper/allowlist + ledger hash + `FALLBACK` health scans |
| P3 | 3 | ~0.12 | ~0.2–0.4 | Visual exploratory + micro-bench + cross-cutting negative |
| **Total** | **19** | **-** | **~1.9–3.0** | **~0.3–0.4 days host; no device lane — pure host TypeScript + `react-test-renderer` + `rg` scans (manual VoiceOver spot is the only on-device moment, already in spec Verification)** |

### Prerequisites

**Test Data:**

- `score`/`best` literals `0/123/999/1000/3240/12456/1000000/NaN/Infinity/-Infinity/-3240` + `Preview` `exact {value:3}` / `range {[3,6,12]}` + `FALLBACK_PREVIEW {range, []}` + `insets {top:10,left:10,right:10,bottom:10}` + `bandHeight 40` + both `isLandscape` + `activeLaneId` clean/accelerated default
- `rg` allowlist strings: `"function fmt"` / `"fmt\\(score\\)"` / `"fmt\\(best\\)"` / `"accessible=\\{false\\}"` / `"toLocaleString\\('pt-BR'\\)"` / `"cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510"`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `react-test-renderer` + `React.act` for `Hud`/`PreviewCard` unit (already in `hud.test.ts`/`previewCard.test.ts`)
- `rg` (ripgrep) for allowlist scans (`fmt`, `accessible`, `toLocaleString`, `resolution-undo`)
- `npx tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 22+ with `pt-BR` ICU (CI `Node.js v26.0.0` already ships it — verified ` (3240).toLocaleString('pt-BR')==="3.240"`); device Hermes `pt-BR` bundling is the only external dependency (spot-check via Expo Go)
- Working tree on `b41ba16` polish + `2a9b015` baseline; `triade/src/engine` byte-identical guard

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths** (thousands `3.240`/`12.456`/`1.000.000` + non-finite guard + announce-through-hidden-wrapper): ≥80%
- **Wiring seam** (`Hud` `score/best` → `fmt` → `Text` ×4 sites + `LanePreview`/`landscapePreviews`/`previewPortrait` `accessible={false}` ×3 + `PreviewCard` `accessible` + `pointerEvents="none"` through them): 100%
- **Edge cases** (`0`, `NaN`, `Infinity`, `1.000.000`, negative `-3.240`, partial `previews`): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (thousands `3.240`/`12.456`/`1.000.000` + zero + `NaN→"0"` + `PreviewCard` label+pointerEvents through hidden wrappers + pointerEvents+chrome markers + engine empty)
- [ ] No high-risk (≥6) items unmitigated (R-001 locale `.` grouping + R-002 announce green or waived with placeholder `Intl.NumberFormat` follow-on)
- [ ] No bare `{score}`/`{best}` Text literal outside `fmt()` and exactly one `function fmt` + one `toLocaleString('pt-BR')` + three `accessible={false}` sites in `Hud.tsx:1`
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (pt-BR grouping vs comma fallback, wrapper hidden vs announce, thin-view)

---

## Mitigation Plans

### R-001: `toLocaleString('pt-BR')` locale-data divergence (Score: 6)

**Mitigation Strategy:**
1. Keep `fmt` as landed `Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0'` (`Hud.tsx:11-13`) — `123` stays `"123"`, `3240→"3.240"` proves grouping `.` is pt-BR not en-US comma.
2. Pin both orientations: portrait `score 3240` `hasToken('3.240')` and landscape `best 12456` `includes('12.456')` inside `Recorde` line; add `1000000→"1.000.000"` and `0→"0"` + no `hasToken('3,240')` (comma) guard. Non-finite `NaN/Infinity→"0"` ensures no `NaN` literal branch hides locale failure.
3. Manual Expo Go spot per spec Verification: `score 3240` portrait + landscape visibly `"3.240"` (if comma, device ICU lacks `pt-BR` — file follow-on to bundle locale data or switch to `Intl.NumberFormat('pt-BR',{useGrouping:true}).format(n)` with explicit `.` char).

**Owner:** FE lead
**Timeline:** Immediate (gate this bundle)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/ui/components/hud.test.ts`  `hasToken('3.240')` + `includes('12.456')` + `hasToken('1.000.000')` + `hasToken('0')` + `!hasToken('3,240')` + `rg -n "toLocaleString\('pt-BR'\)" triade/src/ui/Hud.tsx ==1` + manual `3240→3.240` visual spot.

### R-002: `accessible={false}` hides `PreviewCard` announce (Score: 6)

**Mitigation Strategy:**
1. Keep 3 wrappers as landed (`Hud.tsx:44` `LanePreview`, `Hud.tsx:88` `landscapePreviews`, `Hud.tsx:138` `previewPortrait` all `accessible={false}`) and keep `PreviewCard.tsx:29` `View accessible accessibilityLabel pointerEvents="none"` unchanged — RN keeps child `accessible` as its own accessibility element through a hidden parent.
2. Gate via host tree: `findAll(n=>n.props.accessibilityLabel?.includes('Próxima (Clean): 3')).length>=1` + that node `pointerEvents==="none"` + `accessible===true` through each of the three hidden parents (portrait exact + landscape range). Also `findAll(n=>n.props.accessible===false).length===3` proves wrappers are hidden, not the card.
3. Manual VoiceOver spot on iOS: portrait + landscape with `previews: {clean: exact 3}` announces `Próxima (Clean): 3` (spec Verification). If grouped incorrectly on TalkBack, add `importantForAccessibility="no-hide-descendants"` audit in follow-on.

**Owner:** FE + A11y
**Timeline:** Immediate (announce-through-hidden is the P0 gate)
**Status:** Planned
**Verification:** Host `findAll(accessibilityLabel)` through hidden parents `>=1` + `pointerEvents==="none"` + `rg -n "accessible=\{false\}" triade/src/ui/Hud.tsx ==3` + manual VoiceOver `Próxima (Clean): 3` spot.

### R-003: `fmt` `Number.isFinite` guard scope (Score: 4)

**Mitigation Strategy:**
1. Keep guard as landed `Number.isFinite(n) ? … : '0'` — typed `HudProps score:number best:number` so normal callers are finite; defensive `NaN`/`Infinity` path is crash prevention, not business logic. `fmt(-3240)==="-3.240"` documented (negative unused).
2. Pin `NaN/Infinity/-Infinity → "0"` both orientations + `!hasToken('NaN')` + string misuse `fmt('3240' as any)→"0"`. `tsc --noEmit` both tsconfigs proves no `any` widening in `Hud.tsx:11`.
3. Any future caller passing non-number should be caught by `tsc`, not runtime; runtime still degrades to `"0"` not throw.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/ui/components/hud.test.ts` non-finite pins + `rg -n "Number.isFinite" triade/src/ui/Hud.tsx ==1` + `tsc` both clean.

---

## Assumptions and Dependencies

### Assumptions

1. `Hud` is presentation-only — no engine draw budget, no `Math.random`, no `pickIndex`/`weightedPicker` imports; `fmt` is a static `number→string` O(1) formatter, not derived from `potForTier`/`ceilingDetector`. Any future engine roll import into `Hud.tsx` is a defect.
2. `toLocaleString('pt-BR')` grouping `.` is the intended mockup separator (spec `3.240`); `en-US` comma `3,240` is a locale-data bug, not an alternative. Assumption checked by P0 `hasToken('3.240')` + `!hasToken('3,240')`.
3. `accessible={false}` on a `View` that wraps a `View accessible` child keeps child's `accessibilityLabel` exposed (RN iOS behavior) — `react-test-renderer` mirrors this (labels found through hidden parent). Assumption checked by P0 `findAll(accessibilityLabel)` through hidden parents.
4. `activeLaneId === 'accelerated'` exact match else `clean` default is intentional (3.2 Clean lane purity); omitting `activeLaneId` defaults to `Clean` — pinned by existing `hud.test.ts` `F-4` activeLaneId gate reused here.
5. `npx tsc --noEmit -p tsconfig.test.json` baseline remains clean after adding `fmt` helper (no circular import via `Preview` type leaf).
6. `PreviewCard` `range []→""` empty is still the fallback value; this sweep does not change `FALLBACK_PREVIEW` shape — any placeholder `—` would be `PreviewCard` display change only, not `Hud` guard change.

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/src/ui/Hud.tsx:11-13,44,81,84,88,128,131,138` `fmt` + 3× `accessible={false}` + 4× `fmt()` sites — Required before P0 gates. Status: Done (`b41ba16`).
3. `triade/src/ui/PreviewCard.tsx:14-22,29` `displayOf` defensive `[]→""` + `filter(Number.isFinite)` + `accessibilityLabel`/`pointerEvents="none"`/`accessible` — Required for announce-through-hidden verification. Status: Ready (pre-existing, pinned).
4. `triade/__tests__/ui/components/hud.test.ts:58-151` (8 tests: score/best tokens, pause, 76×76/60×44, range token, lane gating) + `previewCard.test.ts:79-107` (label/pointerEvents/ink/chrome) 5 tests — Required for P0/P1 gates. Status: Done (working-tree, extended with thousands/NaN/announce pins in this plan).
5. `triade/src/game/preview.ts:1` `Preview` type + `FALLBACK_PREVIEW` singleton — Required for `rg` wiring scan post-sweep. Status: Ready (byte-identical).
6. `deferred-work.md` ledger with `resolution-undo: cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510` for DW-8 — Required for P2 ledger verification. Status: Done (working-tree `git diff HEAD` 1 entry with 1 hash line + status line).

### Risks to Plan

- **Risk**: Hermes `pt-BR` ICU not bundled → `3240→"3,240"` comma or `"3240"` no-group on device despite host Node `pt-BR` green.
  - **Impact**: Mockup parity `3.240` fails only on device, not in CI `980 pass`.
  - **Contingency**: Bundle `pt-BR` locale data via `expo-localization` + `Intl.NumberFormat` or replace `toLocaleString('pt-BR')` with manual `String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")` helper after confirming `Number.isFinite` guard; update `rg` allowlist from `toLocaleString`→manual regex and keep P0 `hasToken('3.240')` pin.

- **Risk**: Android TalkBack groups `accessible={false}` parent + `accessible` child differently than iOS VoiceOver → `Próxima (Clean): 3` not announced on one platform despite host test green.
  - **Impact**: Preview announce lost on one platform, hidden-wrapper polish undone.
  - **Contingency**: Keep host `findAll(accessibilityLabel)` P0 for both; add platform-specific manual VoiceOver + TalkBack spot-checks (portrait + landscape) to spec Verification before closing the sweep.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing `fmt(3240)→"3.240"` / `NaN→"0"` / `Próxima (Clean): 3` through hidden wrapper pin templates for any future `Hud` prop widening — separate workflow; not auto-run.
- Run `*automate` for broader `Hud` host coverage once Epic 8 feel chrome stabilizes.
- Run `*nfr-assess` after implementation evidence (Hud host runs + device `pt-BR` spot) to validate NFR planning without inventing thresholds; run `*test-review` for adversarial review of the new `fmt` + `accessible` guard.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
- [ ] Tech Lead: ______________________ Date: __________
- [ ] QA Lead: ______________________ Date: __________

**Comments:**

---

---

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **UI `src/ui/Hud.tsx:11-13,44,81,84,88,128,131,138` `fmt` + 3× `accessible={false}` + 4× `fmt()` + `pointerEvents` contracts + 76×76/60×44 chrome** | Polish-only: PT thousands on score/best + decorative preview hidden from a11y tree. No layout math change, no new dependency, no animation. | `hud.test.ts` 8/8 + `previewCard.test.ts` 5/5 + `hud.previewWiring` 9/9 must stay green; `npm test` `≈980 pass / 366 skip` unchanged; portrait/landscape `hasStyle` + `pointerEvents` + `accessible` gates green |
| **UI `src/ui/PreviewCard.tsx:14-22,29` `displayOf` + `accessibilityLabel="Próxima (Label): value"` + `pointerEvents="none"` + `accessible`** | Pinned: empty `range []→""` still, but announce through hidden `LanePreview` wrapper must stay `Próxima (Clean): 3` | `previewCard.test.ts` accent/announcement/label/pointerEvents `5/5` + `hud.test` P0 `findAll(accessibilityLabel)` through `accessible={false}` parents must stay green |
| **Game `src/game/preview.ts:1` `Preview` type/`previewFor`/`ambiguousRange`/`FULL_POT_LADDER`** | Byte-identical (`git diff --stat -- triade/src/game/preview.ts` empty) — Hud only consumes `Preview` type via `FALLBACK_PREVIEW` aliasing | `preview.test.ts` 40/40 + `preview-invariant.test.ts` structural (no roll import, ladder from config, pure) must stay green |
| **Engine `src/engine/*` (`spawn.ts:pickCombined/weightedPicker`, `pot.ts:potForTier`, `ceiling.ts:ceilingDetector/tierForCeiling`, `game.ts:move/pendingSpawn`)** | Byte-identical (`git diff --stat -- triade/src/engine` empty) — Hud is pure display, never mutates board/GameState, never consumes RNG | Existing `adaptive-spawn-integration` + `weights` + `engine.smoke` + `pot/pot-tier-pipeline` + `game` suites must stay green; draw budget `effective 3 / noop 0 / newGame 20` preserved via engine unchanged |
| **Layout `src/ui/layout.ts:31` `getBandTop`/`SAFE_MARGIN`/`HIT_TARGET` + `App.tsx:950` `previews` fan-out `clean/accelerated` `previewFor(..., availablePot)`** | Unchanged; Hud polish must not drift band math or fan-out | `layout.test.ts` + `previewWiring` rising `3→[3,6]→[3,6,12]` suites still green; `rg previewFor(pending, availablePot)==2` + `rg previews={{ ==1` |
| **Test tooling `test-utils/helpers.ts` (`sigmaBound`/`runSeededSession`/`stripComments*`) + `spec-*` contracts** | Already hardened by `dw-test-scanner-helpers-hardening`; this sweep adds no new helper file, only consumes `fmt` + `accessible` | `engine.purity` + `ui.norolls` + `stripComments` string-safe gates stay green (already via that bundle); ledger `resolution-undo cb5eeedd…` 1 hit verified |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR evidence for later `nfr-assess` (this sweep plans NFR, does not assess PASS/CONCERNS/FAIL)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md` (DW-8 intent/boundaries/I-O matrix — baseline `2a9b015` → final `b41ba16`)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-8 `open→done 2026-09-03` with `resolution-undo cb5eeedd…`)
- Code: `triade/src/ui/Hud.tsx:11-13,44,81,84,88,128,131,138` + `triade/src/ui/PreviewCard.tsx:14-22,29` (delta under test)
- Tests: `triade/__tests__/ui/components/hud.test.ts` + `triade/__tests__/ui/components/previewCard.test.ts`
- Game: `triade/src/game/preview.ts:1` (Preview type, byte-identical)
- Prior bundle: `_bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md` (DW-69 preview-optional hardening, nearby HUD seam)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
