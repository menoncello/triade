# Spine Pair Review — Tríade (3-clone)

## Overall verdict

The pair is contract-ready at draft level: every UJ/E/S requirement surface resolves to a flow or a section, all referenced tokens are defined with hexes, state coverage is complete, and inheritance from GDD/PRD/decision-log/architecture is disciplined and mostly verbatim. Two medium issues should be fixed before downstream consumption: (1) the DESIGN.md contrast guarantee prose does not match its own hexes — the `24` cobre tile sits at 4.44:1, below the claimed "≥ 4.5:1 on every tile", and the doc misidentifies the borderline pair; (2) the component vocabulary is asymmetric across the two spines — several components exist behavioral-only (Pause button, Lane card, Leaderboard tab, Settings row, Reward prompt) or visual-only (Prompt/banner), and `Game-over stat row` is missing from the DESIGN frontmatter component map. No critical or high findings; no bloat; shape fits canonical order in both files.

## 1. Flow coverage — strong

Checked: EXPERIENCE.md Key Flows against UJ-1..UJ-5 (PRD §2.4), E5 tutorial (S5.1-5.4), E6 failure suite (S6.1-6.4), E8 feel (S8.1-8.6), E9 a11y (S9.1-9.4), and S-stories from `epics.md`. Four named journeys (Lia, Théo, Dora, Ana), each with a named protagonist, numbered steps, a climax beat, and failure/integrity paths where applicable. The required journey surface is fully covered: Lia = first session/tutorial/tone; Théo = Clean integrity + new-record; Dora = veteran skip + landscape + noop swipe; Ana = rewarded-ad continue with ad-fail branch.

### Findings
- **[low]** Mid-game rewarded-ad **undo** (the other half of UJ-3 / S4.1 — the most frequent monetization touchpoint) has no Key Flow. Ana dramatizes only death-continue (EXPERIENCE.md:195-205). *Fix:* add a short beat to Ana or a step to Théo's Clean run contrasting the Iniciante undo, or explicitly note it lives in the Reward prompt pattern only.
- **[low]** E9 accessibility is section-covered (Accessibility Floor, EXPERIENCE.md:96-106) but no flow demonstrates it (no reduced-motion or screen-reader user). This matches the shape examples (Kenji embeds a11y in a flow); consider one accessibility beat for completeness. *Fix:* optional — fold a reduced-motion toggling beat into a flow.
- **[low]** S8.6 sound (MVP SFX coupled with haptics) is specced (EXPERIENCE.md:134) but never appears in a flow; the merge climax in Théo (EXPERIENCE.md:177) is all-visual. *Fix:* one word of audio ("soft thock") in the climax step.
- **[low]** S6.4's "elegant fall" flourish is only realized as the soft fade (EXPERIENCE.md:80); the death treatment is otherwise unspecified beyond "no forced wait". *Fix:* name the death treatment in Game Feel & Juice or game-over state row.

## 2. Token completeness — strong

Checked every token in DESIGN.md frontmatter (25 `colors`, 7 `typography`, 5 `rounded`, 9 `spacing`, 8 `components`) and every `{...}` reference in both files (40+ references). Every referenced token is defined; every color token has a hex; `{spacing.safe-margin}`, `{typography.display}`, `{colors.accent}`, `{colors.muted}` referenced from EXPERIENCE.md all resolve to DESIGN.md. Contrast targets are stated for the load-bearing combos: tile ink per tier, text on surface, muted on surface, accent on surface (DESIGN.md:175). No undefined tokens, no missing hexes.

### Findings
- **[medium]** The contrast prose (DESIGN.md:175) does not match its own hexes. Recomputing from the table: `24` cobre + tile-ink-light = **4.44:1** — below the claimed "numeral holds ≥ 4.5:1 on every tile". The doc calls "12 copper and 384 deep emerald" the borderline pairs (actual: 12 = 5.05, 384 = 4.65); the real weakest pair is **24 cobre (4.44)** and **384 deep emerald (4.65)**. "text on surface ≈ 14.6:1" is actually 13.06:1. `24` cobre still clears the 3:1 large-text bar (32pt/800 numerals), so the design is usable, but the stated guarantee is false and a downstream consumer computing from the hexes will find the contradiction. *Fix:* rebalance `24` cobre or restate honestly (list the true weak pairs, cite the large-text 3:1 exemption for display numerals and the 4.5:1 requirement for 4+ digit numerals at 13pt which *do* need 4.5).
- **[low]** No standalone contrast figure is given for **accent on surface-raised** (6.22:1, passes) — accent is used on raised surfaces (Jogar button fill, preview ink, toggle on-fill). *Fix:* one line in the Contrast paragraph.

## 3. Component coverage — adequate

Every component name was extracted from both spines and cross-checked. All EXPERIENCE Component Patterns rows carry real behavioral rules (EXPERIENCE.md:60-71) and all DESIGN component bullets carry real visual specs (DESIGN.md:220-232) — no one-word entries. But the vocabulary is asymmetric: five components exist behavioral-only, one exists visual-only, and one component is missing from the frontmatter token map.

### Findings
- **[medium]** **Pause button** (EXPERIENCE.md:71) has no DESIGN row and no frontmatter token; its visual spec must be inferred from the generic Button. **Reward prompt** (EXPERIENCE.md:69) — monetization-critical, and DESIGN mentions it only as a Panel/Card use (DESIGN.md:225), no dedicated visual row. **Lane card** (EXPERIENCE.md:66) and **Leaderboard tab** (EXPERIENCE.md:67) and **Settings row** (EXPERIENCE.md:68) are behavioral-only; their visuals must be composed from Panel/Card + Menu item + Settings toggle. *Fix:* add DESIGN rows (or explicit "visual = composed of X" notes) for Pause button, Reward prompt, Lane card, and Leaderboard tab, so E3/E4/S1.4 story-dev has a look for each named behavior.
- **[low]** **Prompt/banner** (learning aid) is the inverse: it has a DESIGN row + frontmatter token (DESIGN.md:230, `components.prompt-banner`) but no Component Patterns row in EXPERIENCE (behavior lives only in HUD prose, EXPERIENCE.md:112). *Fix:* one row in Component Patterns.
- **[low]** **Game-over stat row** has prose rows in both files (DESIGN.md:232, EXPERIENCE.md:70) but no `components.game-over-stat-row` frontmatter token. *Fix:* add the token so the component map is complete.

## 4. State coverage — strong

Walked every IA surface (Tone, Menu/Lane Select, Game HUD, Tutorial, Pause, Game-over, Leaderboard, Settings, Reward prompt). The State Patterns table (EXPERIENCE.md:73-87) covers Playing, Noop swipe, Paused, Game over, New record, Empty leaderboard, Lane-switch warning, Settings-change-mid-match (impossible by construction), Death-continue consumed, Tutorial active, Ceiling-tier crossing. The rubric's example states all resolve: noop swipe ✓, empty leaderboard ✓, reward-prompt ad-fail ✓ (Ana failure branch EXPERIENCE.md:205 + Reward prompt row), offline and permission-denied correctly N/A (fully offline, no accounts — the game's own boundaries). Focus/selected state is covered via the menu-item accent bar (DESIGN.md:226, D-008).

### Findings
- **[low]** **Tone screen** has no State Patterns row (first-launch cold-load, returning skip, tap-to-skip); its states live only in the IA table (EXPERIENCE.md:27) and Lia's flow (EXPERIENCE.md:162). *Fix:* one row.
- **[low]** **Ad-fail / ad-cancelled** has no State Patterns row (only the flow failure branch + component row). *Fix:* a one-line row ("Reward ad fail/cancel → revert to primary, nothing lost") would make the contract explicit for E4 story-dev.

## 5. Visual reference coverage — strong

Inventory of the workspace dir: no `mockups/`, no `wireframes/`; `imports/` and `.working/` exist but are empty (fresh run — no orphans). Neither spine references any mockup/wireframe path (searched: no dangling links). Absence of composition references is acceptable at draft; the spines correctly declare themselves the contract ("Both spines win over any mock", EXPERIENCE.md:19).

### Findings
- **[low]** No composition references are defined yet (the example spines point to `mockups/*.html`). *Fix:* none required at draft; flag for a later UX iteration to attach mockups for the three surfaces with visual gaps (lane select, game-over overlay, reward prompt).

## 6. Bloat & overspecification — strong

No source restatement without purpose; no decorative narrative untied to a decision. The long Brand & Style paragraph (DESIGN.md:132) is earned (ramp identity, peak scarcity, anti-Threes guardrail). The 13-tier table restates GDD data because it is the canonical token table. Every `[NOTE FOR UX]` block is actionable for architecture/story-dev. Experience sections (Voice and Tone, Game Feel & Juice, Inspiration & Anti-patterns, Responsive & Platform) each tie every bullet to P/D/S/FR citations. Pixel specs do not duplicate tokens (values are quoted alongside tokens, which is helpful, not redundant). No section is downstream-unread.

### Findings
- None.

## 7. Inheritance discipline — adequate

`sources` frontmatter resolves in both files (7 sources each, all present). UJ/FR/S/D/P references are verbatim and traceable: UJ-5 (EXPERIENCE.md:93), S6.1 (EXPERIENCE.md:23), S8.1-8.6 (EXPERIENCE.md:130-135), S9.1-9.4 (EXPERIENCE.md:100-104), FR-15/18/19/22/30/41-44 (EXPERIENCE.md:35, 65, 69, 94, 103, 200), GDD D-009 (13-tier mapping) and GDD D-011 (feel-suite scope) both verified in the GDD decision log; N3 resolves to architecture §N3; ADR-03 and ADR-06 resolve to `game-architecture.md`. EXPERIENCE token refs (`{colors.*}`, `{typography.display}`, `{spacing.safe-margin}`) resolve to DESIGN.md by name.

### Findings
- **[medium]** Component names are **not** identical across the two spines (see §3): "Jogar button" (EXPERIENCE.md:63) vs "Button" (DESIGN.md:224); "Lane card", "Leaderboard tab", "Settings row", "Reward prompt", "Pause button" exist in EXPERIENCE with no matching DESIGN component name; "Prompt/banner" exists in DESIGN with no matching EXPERIENCE row. EXPERIENCE also never uses `{components.*}` tokens, so the behavioral↔visual pairing is by prose name only. *Fix:* adopt one shared component vocabulary (name + token) in both files and reference `{components.*}` in Component Patterns.
- **[low]** Numeric mismatch on the same component: Menu item is "44pt+ tall" (EXPERIENCE.md:62) but DESIGN `menu-item` minHeight is 48px (DESIGN.md:88). Both are defensible (44 floor vs 48 default) but should not disagree on the same row. *Fix:* align Component Patterns to 48pt or cite the 44pt floor.
- **[low]** Decision-log wrinkle (source-side, not the spines): D-003 (pause includes Settings) is superseded by D-011/D-012 but never marked amended; the spines correctly follow D-011/D-012 (pure pause). *Fix:* mark D-003 amended in the decision log to prevent a later consumer from reading stale D-003.

## 8. Shape fit — strong

DESIGN.md follows canonical order exactly: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts (no missing, no reorder). EXPERIENCE.md contains every required default (Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) plus all earned-invented sections (HUD & Diegetic UI, Input Schemes, Game Feel & Juice, Inspiration & Anti-patterns, Responsive & Platform). Only cosmetic ordering difference vs. the example: Accessibility Floor sits before HUD/Input Schemes — non-issue.

### Findings
- None.

## Mechanical notes

- **Frontmatter:** both files `status: draft`, `updated: 2026-08-07`, identical 7-source lists; all resolve. DESIGN has `name`/`description`; EXPERIENCE has `title`. `components.game-over-stat-row` missing from DESIGN map (see §3).
- **Cross-file refs:** DESIGN and EXPERIENCE correctly point at each other (DESIGN.md:134, 222; EXPERIENCE.md:19, 58). No broken `{...}` refs in either direction.
- **Naming:** "Jogar button" vs "Button"; "Lane card"/"Leaderboard tab"/"Settings row"/"Reward prompt"/"Pause button" behavioral-only; "Prompt/banner" visual-only (see §3/§7).
- **Contrast claims:** hex-computed values differ from prose for text-on-surface (13.06 vs 14.6) and the borderline-pair identification is wrong (24 cobre is the sub-4.5 tile, not 12; see §2).
- **Counted once:** the component-vocabulary finding is filed under §3 and cross-referenced in §7; severities are not double-counted.
