# Epic 4 Context: Funil de Monetização — Ganhar Sem Corromper

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permitir que jogadores da pista Iniciante recuperem erros (undo) e mortes (continue) via rewarded ads ou removam atrito via IAP, sem que qualquer compra altere spawn/merge/score e sem ads durante o jogo — monetização vive só na camada app.

## Stories

- Story 4.1: Rewarded ad — undo (1 free per game)
- Story 4.2: Rewarded ad — death-continue (1 use per game over)
- Story 4.3: IAP Hint 5-pack
- Story 4.4: IAP Undo 3-pack + No Ads + Unlimited Undo
- Story 4.5: Entitlements + restore com precedência offline
- Story 4.6: Declarações App Store + ads player-initiated only

## Requirements & Constraints

- 1 free undo per game via rewarded ad in Accelerated only (FR16); never a second free ad-undo same game; ad between games, never during play (FR19).
- Reward prompt discrete at moment of need: rewarded ad first, IAP alternative, Cancel always; ad fail/cancel → revert to primary CTA, nothing lost, no blocking error (UX-DR14).
- Clean lane never shows reward prompt or ad.
- Death-continue once per game over (FR18), not in Clean; ad fail reverts to Jogar de novo.
- IAPs (Hint 5, Undo 3 × US$0.99/R$4.90, No Ads + Unlimited US$2.99/R$14.90) grant consumable packs + unlimited flag; owning unlimited suppresses ad prompts (FR17).
- Entitlements mirrored in SecureStore authoritative offline; RevenueCat reconciles without downgrading; per-match budgets die with match (ADR-02).
- Nothing purchasable alters spawn/merge/score (P3, counter-metric).
- All IAP/ads declared in App Store Connect at submission (FR20); privacy/consent owned by Epic 10 (10.4/10.5) must be configured before submission.
- Monetization + ads SDKs: RevenueCat purchases 10.7.0 + AdMob 16.4.0 via Expo config plugins; Pinned Version Matrix source of truth.

## Technical Decisions

- Domain split: `src/engine` pure TS never imports RN; `src/game` owns orchestrator + lane wall + per-match budgets (memory); `src/services/monetization` owns RevenueCat/AdMob gateways; engine exposes atomic contracts `undo() ok|rejected`.
- ADR-02 boundary: entitlements vs per-match budgets; reconciling restore never downgrades held entitlement.
- ADR-03 lane wall: Clean profile `{undo:false, hint:false, continue:false, allowAds:false}` enforced by contracts, not trust.
- Persistence layers: settings/best via MMKV (app storage) — already resolved to MMKV; entitlements via expo-secure-store; budgets memory-only.
- Screen-state machine (tone → lane select → game) with game-over as overlay; restart = reset store no navigation.
- Benchmark/feel preserved: frame math stays pure TS for CI <8ms gate.

## UX & Interaction Patterns

- Reward prompt at pain: undo (1/game) appears when mis-swipe can be rewound; death-continue beneath primary Jogar de novo when gameOver in Accelerated.
- Prompt order ad→IAP→Cancel; Clean never shows it.
- HUD/overlay unchanged; feel never fires on preview/score chrome.
- Reduced Motion preset keeps haptics+sound while gating shake.

## Cross-Story Dependencies

- 4.1 must not build purchases — only rewarded ad undo; IAP packs (4.3/4.4) and entitlements restore (4.5) land later; 4.1 may keep a minimal iapRemaining stub for tests.
- 4.2 reuses same rewarded ad infrastructure for continue.
- 4.6 depends on 10.4/10.5 (GDPR consent + privacy URL) before App Store submission.
