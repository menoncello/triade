# Addendum — Tríade (Merge Puzzle) PRD

Depth that does not fit the PRD narrative. Companion to `prd.md`. Decisions made in the brainstorming session (`_bmad-output/brainstorming-session-2026-08-06.md`) are the source of the design intent recorded here.

## 1. Central Fantasy: The Maestro of Chaos

The guiding thread for the whole game. The player lives the fantasy of **dominating the board**: keeping big tiles alive, anticipating merges, controlling chaos. Every HUD, reward, and failure decision is filtered through this fantasy (brainstorm Theme #2).

Implications for downstream work:
- Normal gameplay keeps the board clean — no spawn-ceiling indicator, no "stuck" warning (resolved by Eduardo). Learning aids live only in the Beginner/Accelerated lane.
- Failure is collection, not punishment (game-over stats in MVP; "Grave of Stones" in v2).
- Reward moments celebrate mastery (v2 celebration suite).

## 2. MDA Alignment (confirmed by Eduardo)

- **Mechanics:** Adaptive Spawn + Game Feel Suite (v2) + undo/hint on the Accelerated lane.
- **Dynamics:** the ceiling grows with mastery, tension rises, assistance relieves for learning.
- **Aesthetics:** "control over chaos" + the satisfaction of the big merge.

Key insight: the mastery feedback (Game Feel Suite F–I) is what reconciles rising tension with the control fantasy. This is the "why" behind keeping the suite in the v2 backlog — it is not cosmetic, it is the identity differentiator that does not depend on audio.

## 3. Why the Game Feel Suite Matters (v2 justification)

The suite (scaled haptics, visual punch, screen shake, bullet time) is the "feel" that separates the game from Threes clones **without relying on audio**. It is deferred to v2 (publication-fast phasing), but it must not be dropped — it is a standing identity asset for differentiation in the store and in play.

## 4. Adaptive Spawn → Accelerated Lane Pull (revenue link)

Faster late-game (Adaptive Spawn) shortens sessions and pulls players toward the Accelerated lane — which is good for revenue but needs L3 measurement (brainstorm risk). §7 Secondary tracks "% of players on the Accelerated lane"; the causal link (late game faster → conversion to assisted lane with ads) should be validated via telemetry, not assumed.

## 5. Audio Identity: Warm/Organic (v2, hypothesis)

Sound signature: warm/organic (wood, soft textures, soft "thock"). Own timbre — do **not** copy Threes' sound. Sound scales with tile value, mirroring the haptics suite (F). Validation caveat: the author plays with all sounds off, so his taste is a weak signal only — the sound must be validated with external players in playtest. `[ASSUMPTION]`

## 6. Reward Pacing Principle (v2)

Under Adaptive Spawn, record milestones need pacing: progress gets rarer as the ceiling rises, not more common. Celebration design (tier milestone, new-record) must account for this so the reward doesn't dilute.

## 7. Technical Detail: Migration Spike

Before committing to the full RN + Skia architecture, run a spike: port `js/game.js` to TS + render one board in Skia. Success criterion: the ported engine passes the 26 existing tests unchanged, and one board renders. De-risks the UI rewrite.

## 8. Technical Detail: Adaptive Spawn Weight Curve

- Config shape: one weight parameter per tile value in the pot (e.g., `{3: 1.0, 6: 0.5, 12: 0.25, ...}`), normalized per ceiling tier so the pot sums to 20% of total spawn weight.
- **Initial values (resolved 2026-08-07):** halving decay — `3=1`, `6=1/2`, `12=1/4`, `24=1/8`, `48=1/16`, `96=1/32`; each new tier's value is half the next-lower one, normalized per tier.
- Constraints: 1s and 2s fixed at 40%/40% and never change; monotonic (higher value = lower chance); no code change needed to retune.
- Playtest/telemetry loop validates the curve doesn't inflate leaderboard scores; curve is config-adjustable.

## 9. Deferred IAP (resolved 2026-08-07)

IAP *pricing* was deferred from the brainstorm; it is now resolved for MVP (conversion-focused):
- Hint 5-pack: US$0.99 / R$4.90
- Undo 3-pack: US$0.99 / R$4.90
- No Ads + Unlimited Undo (one-time): US$2.99 / R$14.90

Launch-offer discounts and additional bundles remain a later tuning lever, not MVP scope.

## 10. Persona Grounding

No market research was run. Personas in §2.1 of `prd.md` are marked `[ILLUSTRATIVE]` and are grounded in player-psychology archetypes from the brainstorm (achiever, beginner, genre-experienced), not field data. Run lightweight external playtest to validate archetypes before heavy investment in v2 features tied to them.
