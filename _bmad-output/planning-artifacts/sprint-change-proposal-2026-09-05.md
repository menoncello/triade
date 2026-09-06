# Sprint Change Proposal — UX D-008 Epic Alignment (2026-09-05)

## 1. Issue Summary

The final UX run of 2026-09-04 (D-008) postdates the epic backlog, which still encodes the 2026-08-07 UX baseline. Four stories carry relevant drift (1.5, 1.6, 1.7, 9.2), three carry minor drift (7.2, 8.2, 9.3), and the chrome state contract has no owning story. Implementation written from current epic text would diverge from Architecture v1.1 and the UX spines (e.g., ambiguous queue-vs-reject, px threshold, 22-vs-20pt landscape collapse, three-finger-only VoiceOver with no fallback).

Discovered during the 2026-09-05 architecture review (v1.0 → v1.1). Evidence: `validation-report.md` (3 critical, all resolved in-spine), `review-hud.md` (C1, H1–H3), `review-input.md` (C1, H1–H2), `EXPERIENCE.md` / `DESIGN.md` (final, 2026-09-04). No gameplay rule moves — D-005/D-008 are tokens, layout, contracts, and acceptance criteria only.

## 2. Impact Analysis

### Epic Impact
- **E1 (stories 1.5, 1.6, 1.7):** AC updates only; epic completable as planned.
- **E7 (story 7.2):** one AC addition (landscape preview spec); 7.1/7.3/7.4 unaffected.
- **E8 (story 8.2):** one AC addition (bloom ceiling); 8.1/8.3/8.4/8.5/8.6 unaffected (8.5 already D-008-complete).
- **E9 (stories 9.2, 9.3 + NEW 9.5):** 9.2 rework (critical); 9.3 correction; new story 9.5 owns the chrome contract. 9.1/9.4 unaffected.
- **E2–E6, E10–E11:** unaffected (6.2 already carries the RM fade line; verified 2026-09-05).
- No epic becomes obsolete; no new epic needed; no resequencing (E9 device dependencies already noted).

### Story Impact
- 7 stories require AC edits; 1 new story (9.5) to be added to E9 backlog.
- Stories already implemented from stale text (if any: 1.5/1.6/1.7/7.2/8.2/9.2/9.3) need a verification pass against the new AC — check, don't assume rework.

### Artifact Conflicts
- **PRD:** none — scope, offline/no-account boundary, and monetization guardrails intact.
- **Architecture:** none pending — already v1.1 (ADR-07..11, N4/N5, `src/a11y`, frozen HUD, bloom ceiling). This proposal aligns epics TO it.
- **UX:** source of truth — no changes.
- **Secondary:** `project-context.md` created (2026-09-05, 29 rules, D-008 embedded); E8/E9 test-artifacts exist and need a sync follow-up (out of scope here).

### Technical Impact
- Code/infra/deployment: none directly. Risk is divergence, not breakage: code built from stale ACs (px threshold, queue ambiguity, 20pt landscape preview, three-finger-only VO) would fail device acceptance (E1/E8/E9) and require rework.

## 3. Recommended Approach

**Direct Adjustment** (no rollback, no MVP review).
- Rationale: all drift is AC-level within existing epics; no scope change; no completed work is invalidated structurally — worst case is targeted rework of already-implemented stories after the verification pass.
- Effort: Medium (7 AC edits + 1 new story + verification pass over implemented stories + test-artifact sync follow-up).
- Risk: Low (changes are additive/clarifying; gameplay untouched; architecture already landed).
- Timeline: absorbs into backlog grooming; no sprint replanning beyond story updates.

## 4. Detailed Change Proposals

### Story 1.5 — Layout portrait e landscape (AC: landscape band)
OLD:
- "...score+best left, preview right, pause top-right (opposite the preview), at 22pt/11pt (UX-DR-5)."
NEW:
- "...thin 56pt single-row band: score+best left, preview center-right, pause far right; 12pt minimum preview↔pause gap; swipe-rect = board + 8pt grace with ≥12pt exclusion so 50 top-third swipes never fire pause; sizes 22pt score / 16pt preview + `PRÓX` chip / 12pt-600 best (score:preview ratio ≥1.35x); best single-line ellipsis, frozen at 12pt max under Dynamic Type XL+ (D-008)."
Rationale: resolves H1 (spec collision) + C1 (hierarchy collapse) + H2 (outdoor best).

### Story 1.7 — Legibilidade dos numerais em landscape (AC: scale)
OLD:
- "13pt (4-digit) and 9pt (6-digit) tile numerals... 9pt 6-digit tier (`1536`/`3072+`)..."
NEW:
- "stepped 32/24/18/13pt scale; 11pt floor for 6-digit only (tracking −2%, never truncate/wrap); re-run ink ≥4.5:1 on any tier receiving the floor (priority `384`); `384` note corrected — 24pt/800 IS large text but the conservative ≥4.5:1 internal target is kept with fallback `#1B8A66`, device re-check in E1 (D-008)."
Rationale: matches the shipped D-005 scale; fixes the inverted large-text note.

### Story 1.6 — Input por swipe RNGH + edge-cases contract (AC: contract)
OLD:
- "...RNGH `Gesture.Pan()` with a ~20px activation threshold... a swipe during an in-flight animation is queued/rejected per the engine `ok | rejected` contract..."
NEW:
- "...RNGH `Gesture.Pan()` with a ~20pt density-independent threshold (validate 20–24pt for three-finger VO on device)... dominant-axis lock at activation, frozen until `onEnd` (no mid-gesture re-resolution); in-flight swipe = rejected silent noop — no turn, no spawn (single-slot ~300ms buffer only if playtest demands it); `Gesture.Pan` mounted on the board view only — preview/pause outside hit-rect, no `simultaneousHandlers`; touches starting on preview/pause never start a move (D-008, N5)."
Rationale: removes queue/reject ambiguity, unit error, diagonal unpredictability, and pause misfires.

### Story 7.2 — Preview card no HUD (AC: landscape spec)
OLD:
- "...renders the value in accent ink at 20pt — a chip, not a tile (UX-DR-8)."
NEW (append):
- "...portrait 20pt; landscape 16pt + `PRÓX` 10pt chip label (never ≥18pt, score:preview ratio ≥1.35x); acceptance: 5-second 'which is the score?' test with 0 confusions in 10/10 participants (D-008, C1)."
Rationale: preview must never read as a second score.

### Story 8.2 — Punch visual (AC: glow ceiling)
OLD:
- "...the `1536`/`3072+` tiers add the incandescent glow (the only glow in the system) (S8.2, DESIGN)."
NEW (append):
- "...with ceiling: outer bloom ≤12% tile width, ≤35% opacity, transient with the merge splash, never over preview/score, off entirely under Reduced Motion; acceptance: 1/60s photo keeps the bright tile + 4 neighbors legible (D-008)."
Rationale: the most desired peak must not become the least legible moment.

### Story 9.2 — Screen Reader Contract (AC: movement fallback) — CRITICAL
OLD:
- "move = three-finger swipe in a direction... read the board = tap a tile to hear its value + position..."
NEW:
- "move = three-finger swipe (shortcut) WITH mandatory fallback: per-direction Custom Actions on the board element (i18n names, rotor announces 'actions available') + accessible D-pad exposed when VoiceOver runs; action moves call the same `move()` (same noop/edge contract); acceptance: 3 moves by actions only with VO on. Read = focus/explore a tile to hear value + position (single-tap moves focus with VO on). Engine noop stays silent; an undelivered gesture earns one throttled hint per session (light haptic + single verbal tip), never per-swipe announcements. (D-008, N4)."
Rationale: a system-swallowed three-finger gesture otherwise leaves blind players with zero moves.

### Story 9.3 — Merges por shape/texto + WCAG AA (AC: 384 note + deferred pairs)
OLD:
- "...weakest pair (`384` deep emerald ≈ 4.7:1) still passing... the 3:1 large-text exemption applies to 32pt tile numerals; the 13pt/9pt numerals hold ≥4.5:1..."
NEW:
- "...`384` ≈4.7:1 passes with ~0.2 margin — note corrected (24pt/800 IS large text; conservative ≥4.5:1 internal target kept, fallback `#1B8A66`, device re-check E1); numerals 32/24/18/13 with 11pt floor for 6-digit only; 48-vs-96 + 192-vs-1536 pairs get a playable criterion (10/10 distinguish at 40cm under 2700K + grayscale) with specified fallbacks, and the full tier→facet map is deferred to the E9 on-device pass (D-008)."
Rationale: don't certify as 'validated' what only device testing can close.

### NEW Story 9.5 — Chrome State Contract
"As a player, I want every control to press, focus, and load identically, so that chrome never surprises me. AC: every touchable compresses fill+shadow together (accent→accent-pressed); focus = double ring (2px accent + 1px scrim w/ 1px gap) on all 7 components (button, pause-button, lane-card, menu-item, leaderboard-tab, settings-row, settings-toggle); disabled only on a consumed offer (40% opacity, no shadow, no response); toggle off = 1px muted edge + I/O glyph (never hue alone); leaderboard loading = skeleton rows, never a spinner; empty states = muted copy, no CTA pressure (D-005/D-008)."
Rationale: gives the ownerless D-005/D-008 chrome matrix a home; prevents per-screen reinvention.

## 5. Implementation Handoff

- **Scope: Moderate** — backlog reorganization (story AC updates + 1 new story), no architectural replan.
- **Route to: Product Owner / Developer agents.**
  - PO: apply the 7 AC edits + add story 9.5 to E9 in `_bmad-output/planning-artifacts/epics.md`; update sprint-status entries if epics are tracked there.
  - DEV: verification pass over any already-implemented stories among {1.5, 1.6, 1.7, 7.2, 8.2, 9.2, 9.3} — check against new AC, rework only on mismatch; implement 9.5 with the chrome matrix.
  - Follow-up (separate): sync E8/E9 test-artifacts to D-008 acceptance (device criteria).
- **Success criteria:** epics text matches Architecture v1.1 + UX 09-04 verbatim on contracts/tokens; 9.5 in backlog; verification pass recorded per story (pass/rework); no `TODO`/stale `UX-DR` references to superseded values (20px, queued, 22/11, 9pt, three-finger-only).
