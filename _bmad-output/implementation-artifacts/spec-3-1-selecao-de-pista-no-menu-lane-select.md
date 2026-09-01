---
title: '3.1 Seleção de pista no menu (Lane Select)'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: 'f7f4a3a2b411099368cf97afcfbf00236015ddbe'
final_revision: '92835f05b75d4cc2074e0f27eb636016668024d8'
followup_review_recommended: false
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** App boots straight into a single-lane game with no lane choice surface. Players cannot pick Clean vs Accelerated, last choice is not surfaced as default, and lane switching has no warning that it starts a new game.

**Approach:** Add the Lane Select home surface as the app's entry screen (two side-by-side cards + Jogar shortcut), a pure lane data module + persistence of `laneDefault` via MMKV/settingsStore, and an App screen-state flow lane-select → game with confirmation when switching lanes mid-match.

## Boundaries & Constraints

**Always:** Engine stays pure (no RN imports, ADR-01); laneDefault persisted via `src/services/storage/settingsStore` + `schema.ts` MMKV path (laneDefault 0/1, single-level JSON per-key, `loadSettings` validation); switching lane always starts a new game via `newGame(rng)` and resets match state; HUD/preview/GameOverOverlay contracts from Epics 7/6 unchanged (preview fan-out stays, overlay zIndex hierarchy preserved); 44pt hit targets + safe-area + maxWidth 420 + SAFE_MARGIN 16; i18n strings may stay hard-coded PT with `// TODO 5.4: t('...')` waiver (story 5.4 owns catalog), never leak into engine.

**Block If:** Changing lane without user confirmation when a match exists (must confirm "changing lane starts a new game" D-008); adding lane-aware scoring/leaderboard or monetization (belongs to 3.4/3.5/4.x).

**Never:** Undo/hint/ads/death-continue UI or logic (3.2/3.3, FR12/13); leaderboard writes or per-lane best tracking (3.4); revenue/monetization SDKs (RevenueCat/AdMob) or Firebase; modifying `src/engine` pure files; altering preview spawn distribution or `previewFor` logic; introducing Interstitial/forced ads.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First launch no stored lane | storage has no `laneDefault` key | Lane Select shows both cards, default lane highlighted (Clean index 0), Jogar enters game on default | fallback to DEFAULT_SETTINGS.laneDefault 0 |
| Returning player with stored lane=1 | MMKV holds `laneDefault=1` | Lane Select opens with Accelerated highlighted; Jogar one-tap enters Accelerated game | if stored value invalid (not 0/1) → fallback 0, no crash |
| Jogar shortcut | Lane Select visible, any card highlighted | One tap enters game on last/default lane immediately, no extra step | no error |
| Tap same lane card (no match yet) | Lane Select, tap currently highlighted lane | Highlight stays, no warning, no new game | silent |
| Tap other lane without active match | Lane Select, score==0 / fresh board & tap other lane | Switch highlight to tapped lane, persist laneDefault, Jogar now targets new lane, no warning | persist per-key, log failure but keep highlight |
| Tap other lane WITH active match | Game in progress (score>0 or board moved) → back to Lane Select → tap other lane | Show confirm warning "changing lane starts a new game" (D-008); on confirm → reset game via newGame, persist laneDefault, enter new lane; on cancel → stay | cancel keeps old lane/highlight and board |
| Hydration failure | `loadSettingsFromStorage` throws / MMKV init fails | Use DEFAULT_SETTINGS (lane 0), Lane Select still renders, no crash, no persistence for session | log error, continue |
| Persist failure | `saveSettings` per-key set throws | Highlight still updates in-memory, session continues, next launch may revert | log per-key failure, do not block UI |
| Rotation | Lane Select in portrait → rotate to landscape | Two cards stay side-by-side, safe-area + 16pt margin preserved, ≥44pt targets | no layout crash |

</intent-contract>

## Code Map

- `triade/App.tsx:34-228` -- orchestrator, game state, hydration, bandTop, Hud/GameBoard/GameOverOverlay wiring; must elevate to screen-state `laneSelect | playing | gameOver` and host lane selection + newGame per lane
- `triade/src/services/storage/settingsStore.ts:4-153` -- STORAGE_KEYS.laneDefault, loadSettingsFromStorage/saveSettings (per-key JSON), parseBest, backendOverride for tests; persist laneDefault
- `triade/src/services/storage/schema.ts:1-48` -- Settings type, DEFAULT_SETTINGS.laneDefault=0, LANE_COUNT=2, loadSettings/serializeSettings validation; pure, host-testable
- `triade/src/ui/layout.ts:7-31` -- SAFE_MARGIN 16, EdgeInsets, layoutFor(boardSize/bandHeight/isLandscape); LaneSelect outer padding must use same insets+SAFE_MARGIN
- `triade/src/ui/Hud.tsx:10-174` -- score/best/previews fan-out overlay zIndex:1; LaneSelect must share HUD token style but not alter Hud
- `triade/src/ui/PauseButton.tsx` -- HIT_TARGET 44 constant, pause placement rule (already top-right); LaneSelect CTA must meet same 44pt floor
- `triade/src/ui/GameOverOverlay.tsx:1-170` -- overlay zIndex:2, scrim, CTA pattern, insets fallback, reducedMotion branch; model for overlay/CTA used also for lane-change confirm
- `triade/src/game/lanes.ts` -- NEW pure lane data module (Lane id, LaneProfile, labels, tone lines) — no RN, no engine import
- `triade/src/ui/LaneSelectScreen.tsx` -- NEW screen component (two cards + Jogar CTA + confirm warning)
- `triade/__tests__/storage/schema.test.ts` -- pins for loadSettings laneDefault validation (invalid→0, 0/1 pass)
- `triade/__tests__/storage/settingsStore.test.ts` -- injected backend tests for per-key laneDefault persistence

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/lanes.ts` -- create pure lane module: `export type LaneId = 'clean' | 'accelerated'`, `LANES: Array<{id, label, subtitle, toneLine, index}>` with labels "Pura" / "Iniciante" (subtitle "Com ajuda") and one tone line each (PT, `// TODO 5.4: t('lane.*')` next to each), `DEFAULT_LANE: LaneId = 'clean'`, helpers `laneFromIndex(i)`,`indexFromId(id)`,`labelForLaneId`; no RN/React/Skia/engine imports, relative-only (keeps engine purity wall)
- [x] `triade/src/ui/LaneSelectScreen.tsx` -- build LaneSelect home surface per UX-DR-9/D-011/D-008: container `View` absolute filling with `paddingTop: insets.top+SAFE_MARGIN`, `paddingBottom: insets.bottom+SAFE_MARGIN`, `paddingHorizontal` from insets+SAFE_MARGIN, inner centered column `maxWidth:420, width:'100%', alignSelf:'center'`; row of two `Pressable` lane cards side by side (gap 12, `flex:1`, minHeight ≥88 to hold label+subtitle+toneLine +`HIT_TARGET` 44 interior), card shows label 17/600, subtitle 13/500 muted `#8a8578`, toneLine 13/500; default/highlighted lane has accent top bar (`height:3, backgroundColor:'#E8A33D'`) + `borderColor:'#E8A33D'` + `accessibilityState={{selected:true}}`; inactive card `borderColor:'#e7e4de'`; primary CTA `Pressable` "Jogar" below cards (full-width, `minHeight:HIT_TARGET`, `alignSelf:'center'`, `backgroundColor:'#E8A33D'`, dark ink `#1C1206` 8.6:1, `fontSize:17 fontWeight:'600' fontVariant:['tabular-nums']`, `accessibilityRole:'button' accessibilityLabel:'Jogar'`), onPress enters game on `selectedLane`; cards update `selectedLane` in parent via `onSelectLane`; when `hasActiveMatch` and tapped lane !== active lane, show confirm pattern (inline banner with "Mudar de pista inicia um novo jogo. Continuar?" + Confirmar/Cancelar) before committing lane switch + newGame
- [x] `triade/App.tsx` -- add screen-state machine: `type Screen = 'laneSelect' | 'playing'` (gameOver remains overlay inside playing); lift `selectedLaneIndex` state seeded from hydrated `settings.laneDefault`; after hydration (`ready`), `App` renders `LaneSelectScreen` when `screen==='laneSelect'` else the existing game tree (Hud/GameBoard); `handleJogar` sets `screen='playing'`; `applyLaneSelection(idx)` checks `hasActiveMatch` before reset and persists via `saveSettings` (per-key); `insets` passed to LaneSelectScreen; laneDefault hydration via `loadSettingsFromStorage` in same effect as `loadBest`
- [x] `triade/__tests__/ui/components/laneSelect.test.ts` -- unit/UI tests (react-test-renderer) for: two cards render with labels "Pura"/"Iniciante" + tone lines, default highlight accent bar/badge on lane 0, Jogar CTA hittable and calls onJogar with selected lane, lane switch without match updates selection without warning, lane switch with active match shows warning and only on confirm calls onSelectLane+onJogar, 44pt target pins via `hasStyle` + `collectStyles`, a11y `accessibilityState selected` on highlighted card, safe-margin padding uses `SAFE_MARGIN`
- [x] `triade/__tests__/game/lanes.test.ts` -- pure tests for lane module: laneFromIndex/indexFromId round-trip, invalid→clean fallback, labels non-empty, tone lines non-empty, default is clean, no RN/engine imports (stripCommentsAndStrings import guard)


**Acceptance Criteria:**
- Given the main menu (Lane Select) as the functional home surface, when the app opens, then two lane cards appear side by side — Clean ("Pura") and Accelerated ("Iniciante"/"Com ajuda") each with one tone line, default lane highlighted with accent bar/border  #E8A33D
- Given Lane Select, when Jogar is tapped, then the app enters a game immediately on the last/default lane in one tap (no intermediate screen), present even when a lane card is highlighted
- Given a match exists on another lane, when the user taps the other lane card, then a "changing lane starts a new game" warning with Confirmar/Cancelar appears; confirm starts a new game on the tapped lane, cancel keeps the old game
- Given a lane is selected, when the app restarts (next launch), then the last chosen lane is the default (persisted via MMKV laneDefault across launches)
- Given a lane switch or Jogar, when the new game starts, then the board is a fresh `newGame` (9 tiles, trace) and portrait/landscape safe margins + 44pt CTA targets hold

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (low 1, medium 0, high 0)
- defer: 1: (high 0, medium 0, low 1)
- reject: 0
- addressed_findings:
  - `[low]` `[patch]` LaneSelectScreen duplicate handler `handleCardPressWithAlertFallback` redundant wrapper — removed indirection, cards now call single `handleCardPress` directly

## Auto Run Result

- Summary: Lane Select home surface implemented — two cards (Pura/Iniciante) + Jogar shortcut, lane memory via MMKV, warning banner for lane switch with active match, screen-state machine in App.
- FilesChanged: `triade/src/game/lanes.ts` (new pure lane module), `triade/src/ui/LaneSelectScreen.tsx` (new screen), `triade/App.tsx` (screen-state + hydration for laneDefault), `triade/__tests__/game/lanes.test.ts` (new), `triade/__tests__/ui/components/laneSelect.test.ts` (new)
- Review: patch 1 low fixed (duplicate handler), defer 1 low (per-lane best tracking belongs to 3.4), reject 0
- FollowupReview: false (single low patch, no API/broad impact)
- Verification: `npm --prefix triade test` 467 pass, `tsc` clean both configs, hydration and lane switch manually via tests
- Risks: per-lane board differentiation still single shared board (Epic 3.5); menu back affordance is temporary Pressable "Pistas"

## Design Notes

Lane Select is the functional/vivo home surface, not a modal: `Jogar` is the shortcut, lane cards are the choice. Cards side by side on all sizes (row `flexDirection:'row' gap:12`, each `flex:1`), centered column `maxWidth:420` (UX-DR-20). Highlight is accent bar + border `#E8A33D` (same token as CTA `valueRecord`), not a banner. Warning is D-008 copy "Mudar de pista inicia um novo jogo." Provide both an inline confirm zone and `Alert.alert` fallback — keep Alert import from 'react-native' only.

```tsx
// LaneSelectScreen props shape
type Props = { selectedIndex:number; hasActiveMatch:boolean; insets:EdgeInsets;
  onSelectLane:(i:number)=>void; onJogar:()=>void }
```

Keep App's `game`/`match`/`matchStats` reset logic byte-identical to existing `handleRestart` (6-step order, dep [persistedBest] unchanged for now — per-lane best lands in 3.4, so keep global best today).

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (baseline 458 pass, expect 458 + 7-9 new lane pins, 0 fail)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Boot simulator portrait: Lane Select shows "Pura" + "Iniciante" cards + "Jogar" CTA; tap Jogar starts game; pause still top-right outside swipe rect
- From playing game with score>0, navigate back (or restart into laneSelect) then tap other lane → confirm appears; confirm resets board to 9 tiles

