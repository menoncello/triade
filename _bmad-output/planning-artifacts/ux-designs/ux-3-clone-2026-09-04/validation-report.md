# Validation Report — Tríade (3-clone)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-09-04/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-09-04/EXPERIENCE.md`
- **Run at:** 2026-09-04

## Overall verdict

Contract-ready with repairs — all of them applied in the current spines. All token references resolve (strict-YAML parse now passes), component/state/shape coverage is complete for source-extraction, and all five key flows carry named protagonists with numbered steps and climax beats. The three extra lenses (accessibility, HUD legibility, input schemes) each found one critical — VoiceOver with no movement fallback, preview competing with score in landscape, three-finger swipe as the sole VoiceOver path — and all three close out in the current spines (D-008): Custom Actions + accessible D-pad, 16pt landscape preview with PRÓX chip label, frozen band geometry. What remains is validation that can only happen on device or in E9/E1/E8: the tier→facet map beyond color, outdoor best legibility, 6-digit clip, 384 re-check at 24pt, and the playtest/E8 checklists.

## Category verdicts

- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — adequate
- State coverage — strong
- Visual reference coverage — adequate
- Bloat & overspecification — adequate
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

### Critical (3) — all resolved

**[Accessibility]** — VoiceOver with no movement path when the three-finger gesture is intercepted (EXPERIENCE.md Screen Reader Contract + Beatriz failure branch)
System-reserved three-finger swipes can be swallowed by the OS, leaving a blind player with zero moves — the old failure branch equated it with a silent noop. **Resolved (D-008) — mandatory fallback: per-direction VoiceOver Custom Actions + accessible D-pad when VoiceOver runs; three-finger stays the shortcut; undelivered gestures earn one throttled hint per session.**
Fix: Custom Actions / rotor / hidden D-pad — done.

**[HUD]** — Preview competes with score in landscape, 22 vs 20pt (DESIGN.md Typography + Layout landscape)
Portrait ratio 34:20 holds; landscape 22:20 (1.1×) collapses the score > preview rank D-006 declares first-class. **Resolved (D-008) — `preview-card.valueSizeLandscape` 16pt + PRÓX chip label; ratio 22:16 ≈ 1.375× ≥ 1.35× floor; preview-landscape never ≥ 18pt.**
Fix: 16pt + chip label — done.

**[Input]** — Three-finger swipe as the sole VoiceOver movement path is fragile (EXPERIENCE.md Screen Reader Contract + Beatriz flow)
Delivery depends on OS mode/passthrough and fails silently. **Resolved (D-008) — same fallback as Accessibility C-01; action moves call the same engine `move()`; acceptance: 3 moves by actions only.**
Fix: custom actions on the board element — done.

### High (10) — 8 resolved, 2 deferred

**[Rubric]** — DESIGN.md frontmatter `description` with unquoted colon breaks strict YAML parsers (DESIGN.md frontmatter)
PyYAML SafeLoader throws `ScannerError`, so machine consumers cannot parse tokens at all. **Resolved (D-008) — value single-quoted; strict parse verified passing.**
Fix: quote the value — done.

**[Accessibility]** — Focus ring invisible over accent fills (DESIGN.md Shapes + Components)
2px accent outer ring on accent fills (Jogar, active tab) contrasts ~1:1. **Resolved (D-008) — double ring: 2px accent + 1px scrim outline with 1px gap; all seven `focusRing` tokens updated.**
Fix: double ring with dark outline — done.

**[Accessibility]** — Toggle off-state fails component contrast, 1.27:1 (DESIGN.md `settings-toggle`)
Track off (`border`) vs `surface-raised` fails WCAG 1.4.11 (3:1). **Resolved (D-008) — 1px `muted` edge on the off track (≥ 3:1) + I/O glyph on the thumb; state never carried by hue/position alone.**
Fix: darken/edge the track + glyph — done.

**[Accessibility]** — 384 pair thin margin + factually inverted large-text note (DESIGN.md Colors)
4.65:1 passes but panel variance can eat the ~0.15 margin; the note claimed 24pt/800 "moves to the body-text bar" — inverted, 24pt/800 IS large text (3:1 bar). **Resolved-spec (D-008) — note corrected (large-text pass, conservative ≥ 4.5:1 internal target kept, fallback `#1B8A66` preserved); device re-check deferred to E1.**
Fix: correct the note + device re-check — note done, device pending.

**[HUD]** — Pause × preview collision spec in landscape top-right (DESIGN.md Components vs EXPERIENCE.md Landscape/Responsive)
"Opposite the preview" + "top-right" claim the same corner in the narrowest band. **Resolved (D-008) — frozen geometry: score+best left, preview center-right, pause far right, 12pt preview↔pause gap, 8pt-grace swipe-rect exclusion ≥ 12pt; touch acceptance: 50 top-third swipes never fire pause.**
Fix: freeze the geometry — done.

**[HUD]** — Best muted fails outdoors, worse at 11pt landscape (DESIGN.md Colors + Typography)
4.9:1 indoor pass evaporates in glare at 11pt/500. **Resolved (D-008) — `caption-landscape` 12pt/600 (rank holds: 22 > 16 > 12) + outdoor acceptance criterion (direct sun, 80% brightness, 30cm).**
Fix: 12/600 + outdoor test — spec done, field test pending.

**[Input]** — Diagonal resolution undefined (EXPERIENCE.md Interaction Primitives)
No dominant-axis rule makes ~45° swipes unpredictable. **Resolved (D-008) — dominant-axis lock at activation, axis frozen until `onEnd`, recorded in the edge contract.**
Fix: dominant-axis rule — done.

**[Input]** — "Queued/rejected" during animation is ambiguous (EXPERIENCE.md edge contract)
Queue vs reject are opposite UX. **Resolved (D-008) — reject (discard): in-flight swipe = silent noop; single-slot/300ms-expiry buffer only if playtest demands it.**
Fix: choose reject — done.

**[Accessibility]** — Beyond-color reading deferred: 48×96 and 192×1536 without validated mapping (DESIGN.md Colors + Shapes) — **DEFERRED to E9.** Tier→facet/grain table is an art deliverable with side-by-side + grayscale + deuteranopia/protanopia validation; fallback (`96 → #3E444E`) trigger already specified. Reason: cannot be closed in prose; needs the E9 color-blind-theme pass on device.
Fix: deliver tier→facet table + validate both pairs — pending E9.

**[HUD]** — Bronze 48 vs ferro 96 mid-game distinguishability not guaranteed (DESIGN.md Colors + Shapes) — **DEFERRED to E9, same cause as above.** Playable acceptance criterion (10/10 distinguish at 40cm under 2700K + grayscale) already specified with the same fallback. Reason: same E9 art + device validation dependency.
Fix: criterion + fallback + E9 facet map — criterion done, validation pending.

### Medium (13) — 9 resolved, 4 validation-deferred

**[Rubric]** — Dora flow has no explicit climax beat (EXPERIENCE.md Key Flows § Dora). **Resolved (D-008) — 384 deep-emerald landing marked Climax.**
Fix: mark one beat — done.

**[Rubric]** — D-006–D-018 cited in-spine but absent from this run's log (both spines + `.decision-log.md`). **Resolved (D-006) — carry-over entry: D-006–D-018 + Dora climax inherited verbatim from the 2026-08-07 run, no deltas.**
Fix: carry-over log entry — done.

**[Accessibility]** — Noop-silence vs intercepted-gesture indistinguishable for screen readers (Announcement contract + Beatriz). **Resolved (D-008) — engine noop stays silent; undelivered gesture gets throttled hint (light haptic, ≤1 verbal tip/session).**
Fix: split the two silences — done.

**[Accessibility]** — Best muted in harsh sun, 11pt landscape (DESIGN.md Typography). **Resolved via H2 (D-008) — same 12pt/600 fix; no global `muted` lightening.**
Fix: one mitigation — done.

**[HUD]** — 1536+ glow with no specified ceiling can wash out neighbors (DESIGN.md Components + Elevation). **Resolved (D-008) — ceiling: bloom ≤ 12% tile width, ≤ 35% opacity, transient, never over chrome, off under Reduced Motion; 1/60s-photo acceptance.**
Fix: specify the ceiling — done.

**[HUD]** — Thin top band with no minimum height or overflow rule (DESIGN.md + EXPERIENCE.md landscape). **Resolved (D-008) — band 56pt (44 content + 12 breathing), best ellipsis single-line, best frozen at 12pt max under Dynamic Type XL+.**
Fix: fix the band — done.

**[Input]** — "~20px" threshold unit is ambiguous (Interaction Primitives + Input Schemes). **Resolved (D-008) — normalized to ~20pt density-independent; 20–24pt three-finger validation flagged for device.**
Fix: normatize to pt — done.

**[Input]** — "Tap-to-read" misdescribes VoiceOver focus semantics (Screen Reader Contract). **Resolved (D-008) — reworded to focus/explore announces value + position; Skia→UIAccessibility bridge per tile kept.**
Fix: reword — done.

**[Input]** — Gesture area: preview with no hit-rect rule (DESIGN.md Layout). **Resolved (D-008) — Pan mounted on the board view only; preview + pause outside the hit rect, no `simultaneousHandlers`; touches starting off-board never start a move.**
Fix: board-bounds Pan — done.

**[Accessibility]** — Reduced Motion application latency unspecified (Accessibility Floor + Game Feel). **DEFERRED.** Gated set is correct; whether the toggle applies mid-run vs next-match needs architecture confirmation + E1 test. Reason: behavior-timing change outside UX-prose authority.
Fix: specify immediate application + mid-animation test — pending arch/E1.

**[Accessibility]** — Minimum ~44pt tile = exact target floor in landscape (Layout + Responsive). **DEFERRED to E1/E8.** Gate (re-run numeral/ink check below ~44pt) kept; tap-to-read ≥95% protocol needs device. Reason: device-test only.
Fix: E1/E8 tap-to-read protocol — pending.

**[HUD]** — 6-digit at 13pt in a 44pt tile risks chamfer clip (Typography `[ASSUMPTION]`). **SPEC RESOLVED, validation deferred.** 11pt floor + −2% tracking scoped to 6-digit only (no truncate, no wrap; 13→11 = 15% ≤ 28% rule); on-device clip + ink re-check (priority 384) pending E1. Reason: device-test only.
Fix: validate all 13 tiers on device — pending.

**[HUD]** — 384 bar-change re-check pending (Colors `[NOTE FOR UX]`). **SPEC RESOLVED, device deferred — same E1 re-check as A11y H-04** (30/60/100% brightness on the real tile; fallback `#1B8A66` armed). Reason: device-test only.
Fix: on-device re-check — pending.

### Low (20) — 1 resolved, 3 accepted-no-action, 16 deferred by design

**[Rubric]** — D-004 deferred mocks to Finalize with no firing pointer (decision log). **Resolved (D-009) — 10 key-screen mocks promoted to `mockups/` and linked inline; trigger recorded as fired.**
Fix: log line at Finalize — done.

**[Rubric]** — Non-spec `elevation` token group; **[Input]** L2 no-remap accepted for turn-based puzzle; **[Input]** L3 arrow-keys PWA-only with BT-keyboard-via-actions note — **accepted, no action.** Harmless extension / documented non-barriers.

All remaining lows (rubric: panel row, name drift, empty-leaderboard dup, HUD-rank repeats, glossary drift; a11y L-01 hairline lint, L-02 accent-pressed-fill-only doc, L-03 shimmer safe-motion, L-04 i18n spoken value forms; HUD L1 portrait-preview playtest question, L2 safe-margin device matrix, L3 swipe-rect proof, L4 per-lane regression; input L1 VO-noop test split, L4 Face-ID home-edge test) — **DEFERRED to playtest / E1 / E8 / i18n catalog.** Reason: each needs device, participants, or a catalog pass — none blocks E1 build start.

## Reviewer files

- `review-rubric.md`
- `review-accessibility.md`
- `review-hud.md`
- `review-input.md`
