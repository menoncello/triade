# Validation Report — Tríade (3-clone)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md`
- **Run at:** 2026-08-07

## Overall verdict

The pair is contract-ready at draft level: every UJ/E/S requirement surface resolves to a flow or a section, all referenced tokens are defined with hexes, state coverage is complete, and inheritance from GDD/PRD/decision-log/architecture is disciplined and mostly verbatim. Two medium issues should be fixed before downstream consumption: (1) the DESIGN.md contrast guarantee prose does not match its own hexes — the `24` cobre tile sits at 4.44:1, below the claimed "≥ 4.5:1 on every tile", and the doc misidentifies the borderline pair; (2) the component vocabulary is asymmetric across the two spines — several components exist behavioral-only (Pause button, Lane card, Leaderboard tab, Settings row, Reward prompt) or visual-only (Prompt/banner), and `Game-over stat row` is missing from the DESIGN frontmatter component map. No critical or high findings; no bloat; shape fits canonical order in both files. **Both medium issues are now resolved in the current spines (see §2 and §3 below).**

After the review run, the parent resolved every critical/high/medium finding in the spines — recorded as decisions **D-015** (landscape layout), **D-016** (pause placement), **D-017** (RN input mechanism + safe-area) and **D-018** (VoiceOver contract, label provenance, announcements, Reduced Motion set), plus spine edits for the rubric mediums and the flow/state/component lows. The two extra reviewers (Accessibility, HUD & Input) shifted nothing materially after resolution: all six high and all remaining medium findings close out in the current spines. Only low items are carried forward by design — the playtest-calibration flags (feel magnitudes, D-013 celebration), the E9-derived light/color-blind theme deltas, the preview window-selection rule, and the audio identity hypothesis — plus the mockup-attachment flag.

## Category verdicts

- Flow coverage — strong
- Token completeness — strong
- Component coverage — adequate
- State coverage — strong
- Visual reference coverage — strong
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

### Critical (0)

None.

### High (6) — all resolved

**[Accessibility]** — The screen-reader input model is unspecified (EXPERIENCE.md:94-95, 104, 123)
iOS VoiceOver intercepts single-finger swipes, so the primary swipe move gesture had no defined path for a VoiceOver user, and Skia tiles (not RN views) need labels exposed via a bridge. **Resolved in current spines (D-018) — Screen Reader Contract: move = three-finger swipe, read = tap a tile (value + position); per-tile `accessibilityElement`s exposed from Skia to `UIAccessibility` via a bridge.**
Fix: add a "Screen Reader Contract" subsection naming the interaction scheme and the Skia-to-`UIAccessibility` label exposure — done.

**[Accessibility]** — "No labels invented in UI" is not implementable as written (EXPERIENCE.md:104)
The per-tile trace covers only tiles that moved/merged/spawned; read literally, the rule forbids authored labels for the resting board, score, game-over, preview, and all chrome. **Resolved in current spines (D-018) — rule re-scoped: board labels engine-derived (board grid + per-move events); chrome labels i18n-authored, never ad-hoc UI strings.**
Fix: re-scope the sentence — done.

**[Accessibility]** — No announcement content contract (EXPERIENCE.md:104, 80, 83, 65, 70, 69)
Merges, noop swipes, score noise, game-over, new-record, preview, and banners were all undefined; a screen-reader user on a rejected move got zero feedback. **Resolved in current spines (D-018) — Announcement contract table added (event → what VoiceOver says → source), with score announced on merge only (throttled).**
Fix: a small announcement table in the Accessibility Floor — done.

**[HUD & Input]** — Landscape HUD layout is underspecified for build (D-006; DESIGN.md:223, 231, 263; EXPERIENCE.md:117, 154)
"Thin edge layer with smaller numerals" said *that* things shrink, not *where they go* — no edge, no element order, no preview position, no concrete reduced numeral size. **Resolved in current spines (D-015) — thin top edge band: score+best left, preview right, pause top-right; `typography.score-landscape` (22pt) / `caption-landscape` (11pt); min ~44pt tile; safe margins clear of notch/home indicator.**
Fix: Landscape layout block with edge choice, order, preview/pause positions, and landscape typography tokens — done.

**[HUD & Input]** — Pause button placement is unspecified in both orientations (DESIGN.md:257; EXPERIENCE.md:37, 72)
"HUD edge" left a real choice (top-left vs top-right), one of which may sit inside the board's swipe-capture zone; the landscape band had no arrangement or collision-avoidance. Pause is a hard accessibility/escape exit. **Resolved in current spines (D-016) — pause fixed top-right in both orientations (opposite the preview in landscape), outside the board swipe rect, ≥44×44, inside safe margins; explicit landscape pause slot.**
Fix: fix the corner and state constraints — done.

**[HUD & Input]** — Input contract uses web-PWA vocabulary with no RN mechanism (EXPERIENCE.md:94, 123, 127; architecture:177; version matrix:138-160)
RN 0.86 has no Pointer Events pointer-capture; the spine didn't choose a mechanism or specify behavior for interruption, release off-board, and a concurrent second finger. **Resolved in current spines (D-017) — mechanism pinned to RNGH `Gesture.Pan()`; Input Edge-Cases contract: cancel → no move/no turn; release off-board → captured; second finger → ignored (first finger wins); swipe during in-flight animation → queued/rejected.**
Fix: pin the gesture mechanism + add the edge-case contract — done.

### Medium (8) — all resolved

**[Token completeness — rubric]** — Contrast prose does not match its own hexes (DESIGN.md:175)
`24` cobre + tile-ink-light computes to 4.44:1, below the claimed "≥ 4.5:1 on every tile"; the doc misidentified the borderline pair and misstated text-on-surface (13.06, not 14.6). **Resolved in current spines — DESIGN.md Contrast restates honestly: `384` deep emerald (≈ 4.7:1) named the weakest pair, `24` cobre (≈ 4.9:1) next, both clearing 4.5:1; 3:1 large-text exemption for 32pt numerals cited; 13pt/9pt re-check flagged for E1/E8.**
Fix: rebalance `24` cobre or restate honestly — restated honestly.

**[Component coverage — rubric]** — Behavioral-only and visual-only components; missing frontmatter token (EXPERIENCE.md Component Patterns; DESIGN.md Components)
Pause button, Reward prompt, Lane card, Leaderboard tab (and Settings row) were behavioral-only; Prompt/banner visual-only; Game-over stat row missing from the frontmatter map. **Resolved in current spines — dedicated DESIGN visual rows for Pause button, Reward prompt, Lane card, Leaderboard tab; Prompt/banner row added to Component Patterns; `game-over-stat-row` (and the other tokens) in the frontmatter.**
Fix: add DESIGN rows for the four named components — done.

**[Inheritance discipline — rubric]** — Component names are not identical across the two spines (EXPERIENCE.md Component Patterns; DESIGN.md Components)
"Jogar button" vs "Button"; behavioral-only/visual-only naming gaps; EXPERIENCE never used `{components.*}` tokens. **Resolved in current spines — both spines share the `{components.*}` token vocabulary and Component Patterns references the tokens on every row. (Cross-referenced to §3; counted once.)**
Fix: adopt one shared component vocabulary and reference `{components.*}` — done.

**[Accessibility]** — Reduced Motion's gated set is incomplete vs the architecture (EXPERIENCE.md:106, 139; DESIGN.md:241, 262)
The spines gated only "shake and bullet time"; flash/particles and overshoot-and-snap were omitted, and DESIGN.md never mentioned Reduced Motion. **Resolved in current spines (D-018) — gated set enumerated in both spines: shake, bullet time, flash/particles, overshoot scale, `1536+` glow, game-over soft fade; haptics and sound stay; DESIGN.md Elevation & Depth cross-references Reduced Motion.**
Fix: enumerate the full gated set in both spines + cross-ref — done.

**[Accessibility]** — The tone screen's ~2s auto-advance can race the screen reader (EXPERIENCE.md:27, 78, 166, 109)
A ~2s timed auto-advance over content is a timing-race for VoiceOver users and is the single timed surface in an otherwise timer-free game. **Resolved in current spines — auto-advance pauses while a screen-reader announcement is in flight / VoiceOver active; tone screen declared exempt as non-informational (a title beat, not content).**
Fix: pause while an announcement is in flight or declare the surface non-informational — both done.

**[Accessibility]** — The leaderboard tab is the one interactive component with no size floor (DESIGN.md:105-109; EXPERIENCE.md:67)
"Compact" tabs risk sub-44pt tap areas, `activeFill: accent` had no stated text token (muted on accent = 1.26:1 failure), and banner-dismiss/skip sizes were unstated. **Resolved in current spines — `leaderboard-tab` minHeight 44px with `activeText: {colors.tile-ink-dark}` (≈ 8.6:1); ≥44×44 hit area stated; banner dismiss target and tone-screen skip in the 44pt floor.**
Fix: explicit ≥44×44 hit area, active-tab text token, banner-dismiss target — done.

**[HUD & Input]** — Safe-area mechanism is unspecified (EXPERIENCE.md:155; DESIGN.md:227; architecture:138-160)
The spine said "respect iOS safe areas" without naming `react-native-safe-area-context`; the portrait preview card sat unconstrained near the home-indicator zone. **Resolved in current spines (D-017) — `react-native-safe-area-context` pinned; `{spacing.safe-margin}` applied on top of per-edge insets in both orientations, including preview card and pause button.**
Fix: pin the library and state the margin stack — done.

**[HUD & Input]** — Fixed tile-numeral rule vs shrinking landscape tiles is unverified (DESIGN.md:215-223 vs 231 / D-006; S1.6)
No direct contradiction, but landscape tiles shrink with no min-tile-size or 9pt/13pt legibility check — the 9pt 6-digit tier is the risk point. **Resolved in current spines — min ~44pt landscape tile width stated before the layout re-runs the numeral/ink legibility check.**
Fix: state a min landscape tile size + re-run rule — done.

### Low (14) — 13 resolved, 1 carried forward

**[Flow coverage — rubric]** — Mid-game rewarded-ad undo has no Key Flow (EXPERIENCE.md:195-205, Key Flows — Ana)
**Resolved in current spines — Ana's flow now opens with the undo beat (discrete reward prompt, ad between games, exact rewind per ADR-06, free undo consumed).**
Fix: add a beat to Ana — done.

**[Flow coverage — rubric]** — E9 accessibility has no demonstrative flow (EXPERIENCE.md:96-106, Accessibility Floor)
**Resolved in current spines — Beatriz (VoiceOver user, Clean lane) journey added with a three-finger-swipe climax and system-gesture failure branch.**
Fix: fold an a11y beat into a flow — done as a full journey.

**[Flow coverage — rubric]** — S8.6 sound never appears in a flow (EXPERIENCE.md:134, Game Feel & Juice; Théo flow)
**Resolved in current spines — Théo's climax now includes the low cálido "thock" with haptics, shake, and bullet-time flash.**
Fix: one word of audio in the climax step — done.

**[Flow coverage — rubric]** — S6.4 "elegant fall" realized only as soft fade (EXPERIENCE.md:80, Game-over state)
**Resolved in current spines — Game Feel & Juice now names the death treatment: soft fade, stats drifting in quietly, no abrupt cutoff, no forced wait (D-010).**
Fix: name the death treatment — done.

**[Token completeness — rubric]** — No standalone contrast figure for accent on surface-raised (DESIGN.md:175)
**Resolved in current spines — "accent on surface-raised ≈ 6.2:1" stated, with muted-on-surface-raised ≈ 4.9:1 and dark-ink-on-accent ≈ 8.6:1.**
Fix: one line in the Contrast paragraph — done.

**[Component coverage — rubric]** — Prompt/banner is the inverse gap (DESIGN.md:230; EXPERIENCE Component Patterns)
**Resolved in current spines — Prompt/banner now has a Component Patterns row (contextual, dismissible, Iniciante-only).**
Fix: one row in Component Patterns — done.

**[Component coverage — rubric]** — Game-over stat row missing from the frontmatter component map (DESIGN.md frontmatter)
**Resolved in current spines — `components.game-over-stat-row` token added.**
Fix: add the token — done.

**[State coverage — rubric]** — Tone screen has no State Patterns row (EXPERIENCE.md:27, 162)
**Resolved in current spines — "First launch | Tone screen" row added (auto-advance pauses for the reader, skip, returning-launch skip).**
Fix: one row — done.

**[State coverage — rubric]** — Ad-fail / ad-cancelled has no State Patterns row (EXPERIENCE.md:205; Reward prompt)
**Resolved in current spines — "Reward ad fail / cancel" row added (revert to primary CTA, nothing lost).**
Fix: one-line row — done.

**[Visual reference coverage — rubric]** — No composition references defined yet (whole pair) — **Carried forward — flagged for a later UX iteration to attach mockups for lane select, game-over overlay, and reward prompt.**
Fix: none required at draft; attach mockups later.

**[Inheritance discipline — rubric]** — Numeric mismatch on the same component (EXPERIENCE.md:62 vs DESIGN.md:88, Menu item)
**Resolved in current spines — Component Patterns aligned to 48pt min height.**
Fix: align to 48pt or cite the 44pt floor — aligned.

**[Inheritance discipline — rubric]** — D-003 superseded but never marked amended (.decision-log.md, D-003)
**Resolved — D-003 marked "AMENDED by D-012" with Status: Amended in the decision log.**
Fix: mark D-003 amended — done.

**[Accessibility]** — Contrast prose is honest but misidentifies the weakest pair (DESIGN.md:207)
**Resolved in current spines — DESIGN.md Contrast now names `384` deep emerald (≈ 4.7:1) the weakest and `24` cobre (≈ 4.9:1) next.**
Fix: one-line correction — done.

**[Accessibility]** — Fixed tile numerals deserve one explicit guard (DESIGN.md:213, 223; EXPERIENCE.md:108, 156)
**Resolved in current spines — DESIGN.md Typography states fixed tile numerals are a deliberate, flagged Dynamic Type exception, legible at the largest text setting and smallest landscape tile (min ~44pt, E1/E8); preview-card ink has a `valueSize` 20pt token.**
Fix: one-line guard + preview ink size token — done.

**[HUD & Input]** — HUD "best" is not stated as lane-scoped (EXPERIENCE.md:115; DESIGN.md:274; D-007)
**Resolved in current spines — the HUD "best" is the active lane's best, never a merged/global figure (P3).**
Fix: one line — done.

**[HUD & Input]** — The preview card carries a mild conceptual blur (EXPERIENCE.md:113, 144; DESIGN.md:263, 241)
**Resolved in current spines — feel effects fire on the board only; the preview card and score are chrome and never animate with feel effects.**
Fix: one line in the feel section — done.

**[HUD & Input]** — Pause-during-animation freeze semantics are unstated (EXPERIENCE.md:81; architecture:268-273)
**Resolved in current spines — pause lets the in-flight swipe settle, then freezes; the board under the scrim is the post-animation snapshot.**
Fix: one line — done.

## Reviewer files

- `review-rubric.md`
- `review-accessibility.md`
- `review-hud-input.md`
