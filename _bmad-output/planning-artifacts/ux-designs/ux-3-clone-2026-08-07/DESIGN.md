---
name: Tríade — Mineral Quente
description: Dark-slate merge-puzzle identity. Tiles as hot lapidary stones, a warm amber→copper→emerald→incandescent ramp, and a clean board that lets the Maestro read and control the chaos.
colors:
  surface: '#23262D'
  surface-raised: '#2B2F38'
  board: '#1A1D23'
  cell: '#262A31'
  text: '#F2EEE3'
  muted: '#A39C8F'
  border: '#3A3F49'
  accent: '#E8A33D'
  scrim: '#0C0E11'
  tile-ink-dark: '#1C1206'
  tile-ink-light: '#F6F0E1'
  glow-incandescent: '#FFEDC4'
  tile-1-areia: '#EFE3C2'
  tile-2-ocre: '#C9963B'
  tile-3-ambar: '#E4A53B'
  tile-6-ambar: '#E08532'
  tile-12-cobre-claro: '#C96E2E'
  tile-24-cobre: '#A2521F'
  tile-48-bronze: '#6E5A45'
  tile-96-ferro: '#4E5560'
  tile-192-esmeralda: '#28A074'
  tile-384-esmeralda-profunda: '#157A5C'
  tile-768-obsidiana: '#0E3B2E'
  tile-1536-incandescente: '#FFD9A0'
  tile-3072-nucleo: '#FFF3DC'
typography:
  display:
    fontFamily: 'SF Pro Display'
    fontSize: 34
    fontWeight: '700'
  title:
    fontFamily: 'SF Pro Display'
    fontSize: 22
    fontWeight: '700'
  body:
    fontFamily: 'SF Pro Text'
    fontSize: 17
    fontWeight: '500'
  caption:
    fontFamily: 'SF Pro Text'
    fontSize: 13
    fontWeight: '500'
  tile:
    fontFamily: 'SF Pro Display'
    fontSize: 32
    fontWeight: '800'
  tile-4digit:
    fontFamily: 'SF Pro Display'
    fontSize: 13
    fontWeight: '700'
  tile-6digit:
    fontFamily: 'SF Pro Display'
    fontSize: 9
    fontWeight: '700'
  score-landscape:
    fontFamily: 'SF Pro Display'
    fontSize: 22
    fontWeight: '700'
  caption-landscape:
    fontFamily: 'SF Pro Text'
    fontSize: 11
    fontWeight: '500'
rounded:
  tile: '10px'
  sm: '6px'
  md: '12px'
  lg: '16px'
  full: '9999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '24px'
  '6': '32px'
  board-gap: '8px'
  safe-margin: '16px'
  touch-target: '44px'
components:
  button:
    minHeight: '48px'
    paddingH: '{spacing.4}'
    radius: '{rounded.md}'
    restingFill: '{colors.surface-raised}'
    primaryFill: '{colors.accent}'
    border: '1px {colors.border}'
  panel:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
  menu-item:
    fill: '{colors.surface-raised}'
    minHeight: '48px'
    radius: '{rounded.md}'
    accentBar: '2px {colors.accent}'
  pause-button:
    fill: '{colors.surface-raised}'
    minHeight: '48px'
    radius: '{rounded.md}'
    glyph: '{colors.text}'
  lane-card:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    minHeight: '48px'
    toneLine: '{colors.muted}'
    accentBar: '2px {colors.accent}'
  leaderboard-tab:
    fill: '{colors.surface-raised}'
    radius: '{rounded.md}'
    minHeight: '44px'
    activeFill: '{colors.accent}'
    activeText: '{colors.tile-ink-dark}'
    inactiveText: '{colors.muted}'
  settings-row:
    fill: '{colors.surface-raised}'
    minHeight: '48px'
    radius: '{rounded.md}'
  reward-prompt:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
  tile:
    radius: '{rounded.tile}'
    inkLight: '{colors.tile-ink-light}'
    inkDark: '{colors.tile-ink-dark}'
    chamfer: 'lapidary bevel'
    glow: '{colors.glow-incandescent}'
  preview-card:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    ink: '{colors.accent}'
    valueSize: '20pt'
  leaderboard-row:
    minHeight: '48px'
    fill: '{colors.surface-raised}'
    borderBottom: '1px {colors.border}'
  prompt-banner:
    fill: '{colors.surface-raised}'
    accentBar: '{colors.accent}'
    radius: '{rounded.md}'
  settings-toggle:
    onFill: '{colors.accent}'
    offFill: '{colors.border}'
    thumb: '{colors.text}'
  game-over-stat-row:
    fill: 'transparent'
    labelColor: '{colors.muted}'
    valueColor: '{colors.text}'
    recordColor: '{colors.accent}'
    paddingV: '{spacing.2}'
status: final
updated: 2026-08-07
sources:
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/.decision-log.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/epics.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/decision-log.md
  - _bmad-output/planning-artifacts/prds/prd-3-clone-2026-08-06/prd.md
  - _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md
  - _bmad-output/brainstorming-session-2026-08-06.md
---

# DESIGN.md — Tríade (Mineral Quente)

## Brand & Style

Mineral Quente is the forge-room reading of the Merge as Moment. A dark slate surface holds a 4×4 grid of hot lapidary stones — chamfered, faintly grained, glowing at the top of the ramp — while a deliberately sparse HUD keeps the board readable. The ramp is the identity: pale cold sand (`1`), warming ochre and amber, copper, cooling bronze and iron, green emerald, and the rare incandescent peak (`1536` and `3072+`) that the session's biggest merge earns. The peak is scarce on purpose: it is the reward the Maestro chases each turn, so the ramp must never read as a pastel 2048 gradient or Threes' paper-tile language. Everything is warm off-white on dark slate; nothing is neon; nothing is playful-cute. The voice is *controle sobre o caos* — a controlled board on a dark surface, not a carnival.

Behavioral spine: `EXPERIENCE.md`. This file owns the look; the spine owns the flows, states, and feel.

## Colors

No source documents a hex value. Every hex below is **`[ASSUMPTION]` — invented by this UX run in the Mineral Quente language, pending art-direction validation.** The *structure* (dark slate surfaces, 13 warm→green→incandescent tiers, distinct `1` vs `2`, light/dark tile ink) is taken verbatim from the GDD (Art Direction) and the decision log; only the concrete values are this run's proposal.

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Surface | `{colors.surface}` | `#23262D` | App background, menu backdrop — dark slate |
| Surface raised | `{colors.surface-raised}` | `#2B2F38` | Panels, cards, buttons, leaderboard rows |
| Board well | `{colors.board}` | `#1A1D23` | The 4×4 recessed play surface (darker than surface) |
| Empty cell | `{colors.cell}` | `#262A31` | Tile sockets inside the board well |
| Text | `{colors.text}` | `#F2EEE3` | Primary copy, labels, score readout |
| Muted | `{colors.muted}` | `#A39C8F` | Best, timestamps, secondary stats, hints |
| Border | `{colors.border}` | `#3A3F49` | Hairlines, dividers, panel edges |
| Accent | `{colors.accent}` | `#E8A33D` | Jogar, new-record highlight, preview card value, toggle on-state |
| Scrim | `{colors.scrim}` | `#0C0E11` | Pause / game-over overlay (at ~70% opacity) |
| Tile ink dark | `{colors.tile-ink-dark}` | `#1C1206` | Numerals on pale / amber / bright-emerald / incandescent tiles |
| Tile ink light | `{colors.tile-ink-light}` | `#F6F0E1` | Numerals on copper / bronze / iron / deep-emerald / obsidian tiles |
| Incandescent glow | `{colors.glow-incandescent}` | `#FFEDC4` | Bloom + particles on `1536`/`3072+`; also the tone-screen tile light |

**The 13 tile tiers** (one per value in the series — GDD D-009):

| Value | Tier (PT) | Token | Hex | Ink |
| --- | --- | --- | --- | --- |
| 1 | Areia pálida | `{colors.tile-1-areia}` | `#EFE3C2` | dark |
| 2 | Ocre | `{colors.tile-2-ocre}` | `#C9963B` | dark |
| 3 | Âmbar claro | `{colors.tile-3-ambar}` | `#E4A53B` | dark |
| 6 | Âmbar | `{colors.tile-6-ambar}` | `#E08532` | dark |
| 12 | Cobre claro | `{colors.tile-12-cobre-claro}` | `#C96E2E` | dark |
| 24 | Cobre | `{colors.tile-24-cobre}` | `#A2521F` | light |
| 48 | Bronze (Basalto) | `{colors.tile-48-bronze}` | `#6E5A45` | light |
| 96 | Ferro | `{colors.tile-96-ferro}` | `#4E5560` | light |
| 192 | Esmeralda | `{colors.tile-192-esmeralda}` | `#28A074` | dark |
| 384 | Esmeralda profunda | `{colors.tile-384-esmeralda-profunda}` | `#157A5C` | light |
| 768 | Obsidiana verde-escura | `{colors.tile-768-obsidiana}` | `#0E3B2E` | light |
| 1536 | Incandescente | `{colors.tile-1536-incandescente}` | `#FFD9A0` | dark |
| 3072+ | Núcleo incandescente | `{colors.tile-3072-nucleo}` | `#FFF3DC` | dark |

`1` and `2` are deliberately distinct at a glance (pale sand vs. ochre) — that is a **GDD rule** (the imminent `1|2` merge must be readable), not an assumption. The 13 hexes and their ink assignment above **are** the assumption.

**Contrast (WCAG AA, computed against the dark canonical):** text on surface ≈ 13.1:1; muted on surface ≈ 5.6:1; accent on surface ≈ 7.0:1; accent on surface-raised ≈ 6.2:1 (Jogar fill, preview ink, toggle on-state); muted on surface-raised ≈ 4.9:1 (menu tone lines); dark ink on accent ≈ 8.6:1 (Jogar label) — all AA body-text pass. Tile ink is assigned per tier so the numeral holds ≥ 4.5:1 on every tile; the **weakest pair is `384` deep emerald at ≈ 4.7:1** (not `24` cobre, which sits at ≈ 4.9:1); every tier clears the 3:1 large-text AA bar for 32pt display numerals. Under-saturation of the mid ramp (`48` bronze, `96` iron) is intentional: it is the metal-cool bridge into the emerald band, and it keeps the incandescent peak the brightest thing on screen.

**Theme variants.** Light, dark, and color-blind themes are all free (GDD/PRD). The dark theme is the canonical identity; light flips the surfaces (warm off-white slate) and re-balances tile lightness; color-blind re-serves the ramp so it is distinguishable by value step, not hue. **`[NOTE FOR UX]`** — the light and color-blind 13-tier hexes are *derived deltas* from this palette (the architecture generates `assets/tiles/` from a script), so exact values for those themes are defined in E9, not here. **`[NOTE FOR UX]`** — color-blind readability is carried by the shape/glyph layer described under Shapes, never by hue alone.

## Typography

SF Pro (iOS system) for all UI — no custom display face in MVP. Medium-heavy: `500` body, `700` titles and score, `800` tile numerals. The type voice is warm, quiet, and slightly heavy — numerals carry the drama, not headlines. Tile numerals render inside Skia (not React views), so they use a **bundled heavy geometric sans** (`[NOTE FOR UX]` — bundle the font asset; architecture forbids CDN and the game must run offline) with SF Pro Display as the fallback for the numeric intent.

**Tile numeral sizing — value is the type scale.** The GDD sets the rule: large numerals up to 3 digits, `~13pt` for 4+ digits, smaller still for 6+ digits.

| Digit count | Role | Token | Size / weight |
| --- | --- | --- | --- |
| 1–3 | Default tile numeral | `{typography.tile}` | 32pt, 800 |
| 4–5 | Extra-small tile numeral | `{typography.tile-4digit}` | 13pt, 700 |
| 6+ | Extra-extra-small tile numeral | `{typography.tile-6digit}` | 9pt, 700 |

Score and best use the display/title weights; the score is `{typography.display}` (34pt, 700) in the portrait HUD and drops to `{typography.score-landscape}` (22pt) in the landscape edge layer, with `{typography.caption-landscape}` (11pt) for best/preview (D-006). Dynamic type is honored for labels, captions, and menu copy (see `EXPERIENCE.md` Responsive & Platform); tile numerals are fixed because they must stay legible *inside* the tile. **`[NOTE FOR UX]`** — the fixed tile numerals (32/13/9pt) are a deliberate, flagged exception to Dynamic Type (they render in Skia, outside `UIFontMetrics`); they must remain legible at the largest accessibility text setting and at the smallest landscape tile size (min ~44pt tile width — E1/E8), or the tile must re-run the ink-contrast check.

## Layout & Spacing

4px base grid (`{spacing.1}`–`{spacing.6}`). Board gap `{spacing.board-gap}` (8pt) between the 16 cells. `{spacing.safe-margin}` (16pt) on every edge inside the iOS safe areas. The 44pt touch-target floor (`{spacing.touch-target}`) is the minimum height for any interactive row or button.

**Portrait (primary).** The HUD is a band, nothing else: score centered top (`{typography.display}`), best directly below it in `{colors.muted}` small; the next-piece preview as a "card in hand" in the bottom corner near the swipe finger (D-007); the pause button in the **top-right corner** (outside the board swipe rect, ≥44×44, inside safe margins). The board owns the middle of the screen and is maximized within the space left by the safe margins. → Composition reference: `mockups/key-game-portrait.html`.

**Landscape (D-006).** The board dominates; the HUD collapses to a **thin top edge band**: score + best left, preview right, pause opposite the preview (top-right). Elements use `{typography.score-landscape}` (22pt) and `{typography.caption-landscape}` (11pt); no second row, no floating extras. Every element sits inside the 16pt safe margin, clear of the notch and home indicator. The board is maximized within the space left by the band; tiles shrink with the shorter dimension (min ~44pt tile width before the layout re-runs the numeral/ink check — see Typography). → Composition reference: `mockups/key-game-landscape.html`.

Boards fill their area; tiles breathe. The grid is 4×4 with uniform 8pt gaps; tile size derives from the container, never hand-set. Menus center a single column, max ~420pt wide, scrolling only if content exceeds it.

## Elevation & Depth

Four depth layers, in order:

1. **Board (diegetic, lowest).** The recessed well `{colors.board}`; tile sockets `{colors.cell}` sit as quiet pits; tiles rest *proud* of their sockets with a soft drop shadow and a chamfer top-light.
2. **HUD overlay (non-diegetic).** Score band, preview card — flat, no shadows, no cards behind cards. The player reads it, never sits inside it.
3. **Feel layer (transient).** Particles, flash, splash, bullet-time bloom — imperative worklets that sit above the board and dissolve; they never persist as UI. Feel effects fire **on the board only** — the preview card and score are chrome and never animate with feel effects. **Reduced Motion (see `EXPERIENCE.md` Accessibility Floor) gates this whole layer** — flash, particles, splash, and the overshoot scale are cut or smoothed, while haptics and sound stay.
4. **Scrim overlays (pause, game-over).** Near-black `{colors.scrim}` at ~70% opacity over the frozen board. Game over fades in *softly* (D-010) so the last move stays visible behind the stats. Pause replaces the view; neither ever stacks a second modal (D-012).

Elevation comes from the well + shadow on the board and from scrim on overlays. Nothing else casts a shadow — hierarchy lives in color and spacing, not a shadow pile.

## Shapes

Chamfered lapidary corners are the signature shape. A tile is drawn in Skia as a faceted octagon approximating a 10pt radius (`{rounded.tile}`) with a bright bevel facet along the top-left edge and a darker bevel along the bottom-right — the "cut stone" read. Subtle grain texture over the fill. Cells are soft 6pt (`{rounded.sm}`); panels, cards, buttons, menu rows are 12pt (`{rounded.md}`); nothing is a pill and nothing is a perfect circle (`{rounded.full}` reserved for the tone-screen light's core glow only). Rounded-pill tile language reads as 2048-clone; chamfer reads as Mineral Quente.

**Shape carries value beyond color.** Facet geometry and grain density vary by tier band so a color-blind player can read the ramp's direction (thin clean facet low, heavier multi-facet high). **`[NOTE FOR UX]`** — exact glyph/facet mapping per tier is a color-blind-theme deliverable in E9, validated against the `192` emerald vs `1536` incandescent pair where lightness alone is ambiguous.

## Components

Visual specs. Behavioral rules live in `EXPERIENCE.md` Component Patterns.

- **Button** — `{components.button}`. Primary (Jogar, Jogar de novo): `{colors.accent}` fill, `{colors.tile-ink-dark}` label, 48pt tall. Secondary: `{colors.surface-raised}` fill, 1px `{colors.border}`, `{colors.text}` label. Never disabled-looking mid-flow; the only disabled state is an already-consumed offer.
- **Pause button** — visual = generic Button (`{components.button}`), square glyph-only chrome in the HUD; `{colors.surface-raised}` fill, `{colors.text}` glyph. **Placement fixed (author decision): portrait top-right; landscape top-right opposite the preview.** Always outside the board swipe rect, ≥44×44, inside safe margins. One tap anywhere in a match.
- **Panel / Card** — `{components.panel}`. `{colors.surface-raised}` on `{colors.surface}`, 1px `{colors.border}`, `{rounded.md}`. Used for lane cards, leaderboard, settings list, reward prompts.
- **Menu item** — `{components.menu-item}`. Full-width row, 48pt min height, `{colors.surface-raised}` fill; a 2px `{colors.accent}` bar on the active/default lane card and on the selected settings row.
- **Lane card** — visual = `{components.menu-item}` + `{components.panel}`. Two cards side by side (Clean "Pura" / Iniciante "Com ajuda"); each one tone line of `{colors.muted}`; the default lane's card carries the 2px `{colors.accent}` bar and is pre-armed.
- **Leaderboard tab** — visual = `{components.menu-item}` in compact segmented form; two tabs ("Melhores" / "Recentes"); **≥44×44 hit area** (a11y floor); active tab `{colors.accent}` fill with `{colors.tile-ink-dark}` label (dark ink on accent ≈ 8.6:1), inactive `{colors.muted}` text.
- **Tile** — `{components.tile}`. 13-tier fill per the table, chamfered, grain, ink per tier, drop shadow on the well; `1536` and `3072+` add the `{colors.glow-incandescent}` outer bloom (the only glow in the whole system — scarcity is the message).
- **Preview card** — `{components.preview-card}`. "Card in hand": small `{colors.surface-raised}` card showing the next value in `{colors.accent}` ink at `{components.preview-card.valueSize}` (20pt) (`1/2`, `3`, or a range like `3/6/12`), sitting in the portrait bottom corner / landscape top edge band. The value reads like a chip, not a tile — it is an oracle, not a piece on the board.
- **Leaderboard row** — `{components.leaderboard-row}`. Rank, score (weight 700), and date+time timestamp (`{colors.muted}`), hairline dividers.
- **Prompt / banner** — `{components.prompt-banner}`. Iniciante-only learning aids (ceiling indicator, stuck warning): `{colors.surface-raised}` strip with an `{colors.accent}` edge, `{colors.muted}` copy, contextual and dismissible. Never appears in Clean.
- **Reward prompt** — visual = `{components.panel}` + `{components.button}` (secondary). Iniciante-only offer panel (undo / death-continue): `{colors.surface-raised}` card, 1px `{colors.border}`, copy `{colors.text}`, primary CTA as secondary Button, Cancel always present; appears at the moment of need.
- **Settings toggle** — `{components.settings-toggle}`. `{colors.accent}` on-state, `{colors.border}` off-state, `{colors.text}` thumb.
- **Game-over stat row** — `{components.game-over-stat-row}`. Label in `{colors.muted}`, value in `{colors.text}`; the **new-record figure is `{colors.accent}`-highlighted** — a number, not a celebration (D-013).

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Keep the Clean-lane board clean: score + best + preview only (D-007) | Add a ceiling indicator or stuck warning to Clean (learning aids are Iniciante-only) |
| Make Jogar one tap to play on the last/default lane (D-011) | Make the menu a title-screen portal that requires a second tap |
| Flip tile ink to hold ≥ 4.5:1 on every tier | Use one ink color on light and dark tiles |
| Make `1` and `2` readable at a glance | Let two adjacent low tiles share a hue |
| Reserve glow for `1536+` | Glow every merge, flash every tile |
| Chamfer the tiles; 12pt radii on chrome | Pills, pastels, or full-radius tile chips (2048 grammar) |
| Show the preview card in **both** lanes | Treat the preview as an assist feature |
| Highlight a new record as a number | Confetti, banners, or a "new record!" event (D-013) |
| Keep overlays to one level; pause replaces | Stack pause inside game over inside settings |
| Communicate merges by shape + text beyond color | Rely on hue alone (color-blind floor, E9) |
