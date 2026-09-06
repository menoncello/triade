# Epic 10 Context: Telemetry & Confiança

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic proves the game doesn't break and explains why players stay and pay: silent crash reporting with crash-free tracking, retention and revenue funnel analytics, privacy-compliant tracking consent, a live privacy policy that unblocks store submission, and a data-driven gate for retuning the spawn curve without touching the engine.

## Stories

- Story 10.1: Crashlytics with crash-free tracking
- Story 10.2: Retention funnel north-star events
- Story 10.3: Revenue funnel events
- Story 10.4: GDPR consent + ATT prompt
- Story 10.5: Public privacy policy URL (blocking)
- Story 10.6: Spawn curve calibration gate (owner: Eduardo)

## Requirements & Constraints

- Crashes are reported silently in release builds; the player never sees an error. Engine `rejected` results (noop, rejected undo, declined purchase) are normal control flow and must never be logged as errors. Crash-free sessions are visible on a dashboard.
- Retention funnel is the north star: first-merge time (~20s target), first-game-over time (≤3min target), lane choice, and first-session completion. Analytics must never block gameplay. Day-1 retention target stays out of the implementation gate.
- Revenue funnel tracks rewarded-ad impressions and completions, IAP purchases, and continue/undo usage broken down by lane, plus share of players on the Accelerated lane. No personally identifiable information in events.
- Consent comes before tracking: GDPR consent mode gates Firebase and ads, the iOS ATT prompt appears only if ad attribution is used, and no tracking fires before opt-in. The player can revisit the choice in settings.
- A public privacy policy URL covering analytics, ads, and purchases (no accounts, no backend) must be live and linked in both the store listing and in-app settings before review submission; submission is blocked without it.
- The spawn-curve calibration gate fires on telemetry thresholds (first-merge p50 above ~25s, first-game-over p50 above ~3min30, or session max-tile median dropping more than a tier versus the playtest baseline). Retunes change only data-driven config; the engine stays untouched, the decision is logged with before/after values, and the curve must revalidate (pot sums to its fixed share, clamps hold, display windows renormalize) or CI fails.

## Technical Decisions

- Firebase Crashlytics + Analytics is a pure observer over typed engine events; telemetry never blocks, alters, or duplicates game rules. Pinned versions: Firebase app/crashlytics/analytics 26.1.0, expo-tracking-transparency 57.0.1 for the ATT prompt.
- Consent mode is paired with the ads consent flow; telemetry degrades silently when consent is denied or the device is offline (full play works without a connection, self-contained with no external assets).
- All native and I/O calls are wrapped and funneled to a single global handler that forwards unexpected failures to Crashlytics. Logging is structured JSON through one Logger service: errors route to Crashlytics in release, milestones cover match start/end, purchases, and ad completions, and frame/worklet paths log nothing in release builds.
- Telemetry lives in the services layer as a Firebase observer; the old debug panel is superseded by telemetry and must not ship in release.

## Cross-Story Dependencies

- Stories 10.2 and 10.3 produce the metrics that story 10.6 consumes (first-merge p50, first-game-over p50, max-tile median, 1/2 clog); the calibration gate cannot be evaluated until both funnels emit.
- Story 10.4 gates stories 10.1–10.3: no analytics or crash-attribution tracking fires before consent.
- Story 10.5 blocks store submission downstream; without the live URL nothing ships.
- Revenue events depend on monetization emission points from the lanes/monetization work (ad views at the moment of pain, purchases, undo/continue consumption); retention events tie into tutorial (first merge) and game-over flows.
