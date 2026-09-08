# Spine Pair Review — Tríade (3-clone, ux-3-clone-2026-09-04)

## Overall verdict

Contract-ready with repairs. All token references resolve, component/state/shape coverage is complete enough for source-extraction, and all five key flows carry named protagonists with numbered steps. The load-bearing repairs before downstream use: quote the DESIGN.md `description` frontmatter value (unquoted colon breaks strict YAML parsers), add the missing climax marker to the Dora flow, and reconcile the decision-log gap (D-006–D-018 cited in-spine but absent from this run's log).

## 1. Flow coverage — adequate

Checked: 5 Key Flows (Lia, Théo, Dora, Ana, Beatriz) against named-protagonist + numbered-steps + climax + failure-path criteria. All have protagonists and numbered steps; 4/5 carry an explicit **Climax:** marker.
### Findings
- **[medium]** Dora flow has no explicit climax beat (EXPERIENCE.md Key Flows § Dora). *Fix:* mark one beat (e.g. the 384 emerald landing or the noop read) as **Climax:** or record why this flow is climax-exempt.
- **[low]** Théo substitutes an "Integrity beat" for a failure path; Dora has none (EXPERIENCE.md §§ Théo, Dora). *Fix:* one line each (e.g. Théo: record-miss handling; Dora: landscape quit mid-animation) or mark N/A.

## 2. Token completeness — adequate

Checked: every frontmatter token + every `{path.to.token}` reference in both spines (66 distinct refs extracted). All refs resolve to defined keys (colors 27 hexes incl. 13-tier ramp; typography 10 roles; rounded 5; spacing 9; elevation 5; components 14). Contrast targets stated for load-bearing pairs (text/surface ≈ 13.1:1, weakest tile pair 384 ≈ 4.7:1 with re-check note).
### Findings
- **[high]** DESIGN.md frontmatter `description` contains an unquoted colon ("D-005 polish pass: professional…") — strict YAML parsers (PyYAML verified) throw `ScannerError: mapping values are not allowed here`, so machine consumers cannot parse tokens at all. (DESIGN.md frontmatter). *Fix:* quote the value: `description: '…'` or use a folded block scalar.
- **[low]** Non-spec top-level `elevation` token group has no spec entry (references/design-md-spec.md covers colors/typography/rounded/spacing/components only). Harmless extension, consistently referenced. *Fix:* none required; optionally note as project extension.

## 3. Component coverage — adequate

Checked: DESIGN.md Components bullets (14) × EXPERIENCE.md Component Patterns rows (11). Every behavioral row maps to a visual spec; every visual spec except the generic container is exercised behaviorally.
### Findings
- **[low]** `panel` (DESIGN.md Components § Panel / Card) has no dedicated EXPERIENCE.md Component Patterns row — covered only transitively via lane-card/reward-prompt. (DESIGN.md Components; EXPERIENCE.md Component Patterns). *Fix:* one row ("Panel/Card — static container, no pressed behavior") or record as intentionally visual-only.
- **[low]** Name drift across spines: "Jogar button" (EXP) vs "Button" (DESIGN); "Prompt/banner" vs "Prompt / banner"; "Settings row" vs "Settings row + toggle". Token refs (`{components.*}`) are consistent, display names are not. *Fix:* normalize display names; tokens already match.

## 4. State coverage — strong

Checked: every IA surface (Tone, Menu/Lane Select, Game HUD, Tutorial, Pause, Game-over overlay, Leaderboard, Settings, Reward prompt) against empty/loading/focus/error/offline. Pressed/focused/disabled carried as global contracts; empty board + empty leaderboard, leaderboard skeleton loading, noop, pause-freeze, lane-switch warning, death-continue consumed, ad fail/cancel all covered. Offline correctly omitted (fully-offline app, stated in Foundation). No misses.

### Findings
- **[low]** Empty-leaderboard treatment stated twice ("Empty (new)" row and "Empty leaderboard" row, State Patterns). Redundant, not contradictory. *Fix:* merge into one row.

## 5. Visual reference coverage — adequate

Checked: `imports/` (empty), `mockups/` (absent), `wireframes/` (absent), `.working/` (empty). No orphan files; nothing to link inline. Spines-win-on-conflict stated in EXPERIENCE.md Foundation ("Both spines win over any mock") and DESIGN.md Brand & Style ("the spine owns the flows").
### Findings
- **[low]** D-004 (decision log) defers key-screen mocks to Finalize "if layout travar comportamento" but no pointer records whether that trigger fired. *Fix:* one log line at Finalize confirming mocks N/A or linking them.

## 6. Bloat & overspecification — adequate

Checked: DESIGN.md 352 lines, EXPERIENCE.md 262 lines. Prose carries editorial voice in DESIGN.md (acceptable per rubric); EXPERIENCE.md stays contractual. No FR/persona restatement dumps; open items consolidated in one closing line.
### Findings
- **[low]** HUD rank (score > preview > best) argued in three places (DESIGN.md Typography; EXPERIENCE.md Accessibility Floor + HUD & Diegetic UI). Load-bearing, but could be stated once and cited. *Fix:* keep the DESIGN.md canonical paragraph; shorten repeats to cross-refs.

## 7. Inheritance discipline — adequate

Checked: `sources` frontmatter in both spines (prior-run DESIGN/EXPERIENCE/log + GDD); token refs all resolve by name; glossary (Clean/Pura, Iniciante, Maestro, Mineral Quente) identical across spines.
### Findings
- **[medium]** D-006–D-018, GDD D-009/D-011, FR-15/18/19/22/30/41-44, S4.1/S6/S8/S9 cited in-spine but this run's `.decision-log.md` stops at D-005 (Open). The prior-run log is listed as a source, so the chain is traceable, but a downstream extractor cannot tell which decisions were re-ratified vs inherited. *Fix:* one log entry (e.g. D-006 "Decisions D-006–D-018 carried over verbatim from 2026-08-07 run; no deltas") or per-decision carry-over lines.
- **[low]** Component display-name drift (see §3) is the only glossary friction; token paths are disciplined.

## 8. Shape fit — strong

Checked: DESIGN.md section order against canonical (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts) — exact match, order-locked. EXPERIENCE.md required defaults all present (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Invented sections (HUD & Diegetic UI, Input Schemes, Game Feel & Juice, Inspiration & Anti-patterns, Responsive & Platform) all earn their place for a game spine. No misses.

## Mechanical notes

- Frontmatter top keys DESIGN.md: name, description, colors, typography, rounded, spacing, elevation, components, status, updated, sources. EXPERIENCE.md: title, status, updated, sources. Both complete.
- Strict-YAML parse of DESIGN.md frontmatter FAILS on the unquoted `description` colon (verified with PyYAML SafeLoader); lenient parsers may pass — fix regardless (§2 high).
- `{path.to.token}` refs: 66 distinct, 0 unresolved (verified by scan).
- No Mermaid in either spine; no mockup/wireframe links to validate.
- Hex count in frontmatter: 27 quoted hex values, all well-formed.
