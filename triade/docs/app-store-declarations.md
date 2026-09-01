# App Store Declarations — Tríade

Single source of truth for IAP/ads declarations: `triade/src/services/monetization/appStoreDeclarations.ts` (pure data, no SDK imports).
This document is the operator-readable checklist for App Store Connect submission (FR-20).

## Declared IAPs (FR-20)

| # | Product ID | Type | Price USD | Price BRL | Entitlement | Reference Name | App Store Connect |
|---|------------|------|-----------|-----------|-------------|----------------|-------------------|
| 1 | `triade_hint_5_pack` | Consumable | 0.99 | 4.90 | `triade_hint_5` | Hint 5-pack | ☐ declare |
| 2 | `triade_undo_3_pack` | Consumable | 0.99 | 4.90 | `triade_undo_3` | Undo 3-pack | ☐ declare |
| 3 | `triade_no_ads_unlimited` | Non-Consumable | 2.99 | 14.90 | `triade_no_ads` | No Ads + Unlimited Undo | ☐ declare |

All three appear in `DECLARED_IAPS` and map 1:1 to `purchaseConfig.ts` test IDs (`TEST_PRODUCT_IDS`). Env overrides: `EXPO_PUBLIC_PURCHASES_HINT_5`, `EXPO_PUBLIC_PURCHASES_UNDO_3`, `EXPO_PUBLIC_PURCHASES_NO_ADS`.

## Declared Ad Placements (FR-19)

| # | Format | Ad Unit ID (test) | Placement | Trigger | Lane | Context |
|---|--------|-------------------|-----------|---------|------|---------|
| 1 | Rewarded | `ca-app-pub-3940256099942544/5224354917` (`REWARDED_AD_UNIT_ID_UNDO`) | between-games | player-initiated | Accelerated only | rewarded-undo-1-per-game |
| 2 | Rewarded | `ca-app-pub-3940256099942544/5224354917` (`REWARDED_AD_UNIT_ID_CONTINUE`, env `EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE`) | between-games | player-initiated | Accelerated only | rewarded-continue-1-per-game-over |

Both appear in `DECLARED_AD_PLACEMENTS` and map to `adsConfig.ts` (`REWARDED_AD_UNIT_ID_UNDO` / `REWARDED_AD_UNIT_ID_CONTINUE` / `TEST_IDS`).

## Negative Declarations (FR-19)

No interstitial, banner, app-open, or GAM interstitial ads exist in any lane, and no ad is shown during gameplay, swipe, or animation.

- Only `RewardedAd` + `RewardedAdEventType` from `react-native-google-mobile-ads` are imported (`triade/src/services/monetization/rewardedAds.ts`).
- No `InterstitialAd`, `BannerAd`, `AppOpenAd`, `GAMInterstitialAd` literal appears in `src/services/monetization/*.ts` or `App.tsx`.
- Rewarded gateway is invoked only from player tap handlers `handleUndoAd` / `handleContinueAd` (and `hasNoAds` bypasses it), never on mount/effect/auto-play.
- `RewardPrompt` for undo is gated by `activeLaneId==='accelerated' && showUndoPrompt && !gameOver && !hasNoAds` — between-turn only, never during animation or in Clean.
- Continue slot in `GameOverOverlay` is rendered only when `gameOver===true && canContinueDerived` — between-games only.

## IAP/Ads Disclaimer (FR-20)

All purchases and ad placements above must be declared in App Store Connect (IAP/ads declarations) at submission. Test AdMob IDs above are the Google-provided test units; production IDs must be replaced via `EXPO_PUBLIC_ADMOB_REWARDED_UNDO` / `EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE` before production submission (see `adsConfig.ts`).

## Dependency — Epic 10 (Out of Scope)

Privacy/GDPR consent mode (FR-36, `expo-tracking-transparency` / UMP), ATT prompt on iOS, and the public privacy policy URL (FR-37, blocking) are owned solely by Epic 10 (Stories 10.4 and 10.5) and must be configured and verified before App Store submission. This story records the dependency only; no GDPR/ATT/privacy-URL code is implemented here.

## Operator Steps

See spec frontmatter `operator_actions` in `_bmad-output/implementation-artifacts/spec-4-6-declaracoes-app-store-ads-player-initiated-only.md` for the exact vendor-console instructions that must be completed after this repo change.

## Verification

- `npm --prefix triade test` covers declarations + interstitial-absence + player-initiated structural guards.
- `npx --prefix triade tsc --noEmit` and `-p tsconfig.test.json` clean.
