---
name: Tríade — Mineral Quente
description: 'Dark-slate merge-puzzle identity. Tiles as hot lapidary stones, a warm amber-to-copper-to-emerald-to-incandescent ramp, and a clean board that lets the Maestro read and control the chaos. D-005 polish pass: professional elevation, stepped tile type scale, full state coverage.'
colors:
  surface: '#23262D'
  surface-raised: '#2B2F38'
  surface-pressed: '#22262E'
  board: '#1A1D23'
  cell: '#262A31'
  text: '#F2EEE3'
  muted: '#A39C8F'
  border: '#3A3F49'
  accent: '#E8A33D'
  accent-pressed: '#C9862B'
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
    fontSize: 24
    fontWeight: '800'
  tile-5digit:
    fontFamily: 'SF Pro Display'
    fontSize: 18
    fontWeight: '700'
  tile-6digit:
    fontFamily: 'SF Pro Display'
    fontSize: 13
    fontWeight: '700'
  score-landscape:
    fontFamily: 'SF Pro Display'
    fontSize: 22
    fontWeight: '700'
  caption-landscape:
    fontFamily: 'SF Pro Text'
    fontSize: 12
    fontWeight: '600'
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
elevation:
  tile-rest: '0 2px 0 rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.35)'
  tile-pressed: '0 1px 0 rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.35)'
  raised-rest: '0 1px 0 rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.30)'
  raised-pressed: '0 1px 0 rgba(0,0,0,0.35), 0 3px 8px rgba(0,0,0,0.30)'
  overlay: '0 12px 32px rgba(0,0,0,0.45)'
components:
  button:
    minHeight: '48px'
    paddingH: '{spacing.4}'
    radius: '{rounded.md}'
    restingFill: '{colors.surface-raised}'
    pressedFill: '{colors.surface-pressed}'
    primaryFill: '{colors.accent}'
    primaryPressedFill: '{colors.accent-pressed}'
    border: '1px {colors.border}'
    shadowRest: '{elevation.raised-rest}'
    shadowPressed: '{elevation.raised-pressed}'
    disabledOpacity: '0.4'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
  panel:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    shadow: '{elevation.raised-rest}'
  menu-item:
    fill: '{colors.surface-raised}'
    pressedFill: '{colors.surface-pressed}'
    minHeight: '48px'
    radius: '{rounded.md}'
    accentBar: '2px {colors.accent}'
    disabledOpacity: '0.4'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
  pause-button:
    fill: '{colors.surface-raised}'
    pressedFill: '{colors.surface-pressed}'
    minHeight: '48px'
    minWidth: '48px'
    radius: '{rounded.md}'
    glyph: '{colors.text}'
    shadowRest: '{elevation.raised-rest}'
    shadowPressed: '{elevation.raised-pressed}'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
  lane-card:
    fill: '{colors.surface-raised}'
    pressedFill: '{colors.surface-pressed}'
    border: '1px {colors.border}'
    selectedBorder: '1px {colors.accent}'
    radius: '{rounded.md}'
    minHeight: '48px'
    toneLine: '{colors.muted}'
    accentBar: '2px {colors.accent}'
    shadowRest: '{elevation.raised-rest}'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
  leaderboard-tab:
    fill: '{colors.surface-raised}'
    radius: '{rounded.md}'
    minHeight: '44px'
    activeFill: '{colors.accent}'
    activePressedFill: '{colors.accent-pressed}'
    activeText: '{colors.tile-ink-dark}'
    inactiveText: '{colors.muted}'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
  settings-row:
    fill: '{colors.surface-raised}'
    minHeight: '48px'
    radius: '{rounded.md}'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
    layoutDefault: 'horizontal label-left control-right'
    layoutStacked: 'vertical label-above control-below full-width (theme + language rows)'
  reward-prompt:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    shadow: '{elevation.overlay}'
  tile:
    radius: '{rounded.tile}'
    inkLight: '{colors.tile-ink-light}'
    inkDark: '{colors.tile-ink-dark}'
    chamfer: 'lapidary bevel'
    glow: '{colors.glow-incandescent}'
    shadowRest: '{elevation.tile-rest}'
    shadowPressed: '{elevation.tile-pressed}'
  preview-card:
    fill: '{colors.surface-raised}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    ink: '{colors.accent}'
    valueSize: '20pt'
    valueSizeLandscape: '16pt'
    chipLabel: 'PRÓX'
    chipLabelSize: '10pt'
    shadow: '{elevation.raised-rest}'
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
    offBorder: '1px {colors.muted}'
    thumb: '{colors.text}'
    glyph: 'I/O'
    focusRing: '2px {colors.accent} + 1px {colors.scrim} outline'
  game-over-stat-row:
    fill: 'transparent'
    labelColor: '{colors.muted}'
    valueColor: '{colors.text}'
    recordColor: '{colors.accent}'
    paddingV: '{spacing.2}'
  game-over-result-portrait:
    fill: '{colors.board}'
    border: '1px {colors.border}'
    radius: '{rounded.md}'
    layout: 'centered frozen board thumbnail above stats, max-tile hero, non-interactive'
    captionColor: '{colors.muted}'
status: final
updated: 2026-09-04
sources:
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/.decision-log.md
  - _bmad-output/planning-artifacts/gdds/gdd-3-clone-2026-08-07/gdd.md
---

# DESIGN.md — Tríade (Mineral Quente)

## Brand & Style

Mineral Quente is the forge-room reading of the Merge as Moment. A dark slate surface holds a 4×4 grid of hot lapidary stones — chamfered, faintly grained, glowing at the top of the ramp — while a deliberately sparse HUD keeps the board readable. The ramp is the identity: pale cold sand (`1`), warming ochre and amber, copper, cooling bronze and iron, green emerald, and the rare incandescent peak (`1536` and `3072+`) that the session's biggest merge earns. The peak is scarce on purpose: it is the reward the Maestro chases each turn, so the ramp must never read as a pastel 2048 gradient or Threes' paper-tile language. Everything is warm off-white on dark slate; nothing is neon; nothing is playful-cute. The voice is *controle sobre o caos* — a controlled board on a dark surface, not a carnival.

D-005 polish intent: the identity, the 13-tier ramp, and every gameplay rule are unchanged. What changes is craft — consistent depth, a stepped type scale without jumps, a legible score/preview/best hierarchy, and a complete state matrix — so the game reads as professional rather than amateur. No gameplay rule moves.

Behavioral spine: `EXPERIENCE.md`. This file owns the look; the spine owns the flows, states, and feel. On any conflict between these spines and a mock, wireframe, or screenshot, the spines win.

## Colors

Every hex below is carried over from the 2026-08-07 run (Mineral Quente language, pending art-direction validation). The *structure* (dark slate surfaces, 13 warm→green→incandescent tiers, distinct `1` vs `2`, light/dark tile ink) is taken verbatim from the GDD (Art Direction) and the decision log; only the concrete values are this run's proposal. New in this pass: `{colors.surface-pressed}` and `{colors.accent-pressed}` complete the pressed-state pair so depth never relies on shadow alone.

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Surface | `{colors.surface}` | `#23262D` | App background, menu backdrop — dark slate |
| Surface raised | `{colors.surface-raised}` | `#2B2F38` | Panels, cards, buttons, leaderboard rows |
| Surface pressed | `{colors.surface-pressed}` | `#22262E` | Pressed state of raised chrome — darker, never lighter |
| Board well | `{colors.board}` | `#1A1D23` | The 4×4 recessed play surface (darker than surface) |
| Empty cell | `{colors.cell}` | `#262A31` | Tile sockets inside the board well |
| Text | `{colors.text}` | `#F2EEE3` | Primary copy, labels, score readout |
| Muted | `{colors.muted}` | `#A39C8F` | Best, timestamps, secondary stats, hints |
| Border | `{colors.border}` | `#3A3F49` | Hairlines, dividers, panel edges |
| Accent | `{colors.accent}` | `#E8A33D` | Jogar, new-record highlight, preview card value, toggle on-state |
| Accent pressed | `{colors.accent-pressed}` | `#C9862B` | Pressed state of accent fills (Jogar, active tab) |
| Scrim | `{colors.scrim}` | `#0C0E11` | Pause / game-over overlay (at ~70% opacity) |
| Tile ink dark | `{colors.tile-ink-dark}` | `#1C1206` | Numerals on pale / amber / bright-emerald / incandescent tiles |
| Tile ink light | `{colors.tile-ink-light}` | `#F6F0E1` | Numerals on copper / bronze / iron / deep-emerald / obsidian tiles |
| Incandescent glow | `{colors.glow-incandescent}` | `#FFEDC4` | Bloom + particles on `1536`/`3072+`; also the tone-screen tile light |

**The 13 tile tiers** (one per value in the series — GDD D-009), hexes unchanged:

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

`1` and `2` are deliberately distinct at a glance (pale sand vs. ochre) — that is a **GDD rule** (the imminent `1|2` merge must be readable), not an assumption.

**Contrast (WCAG AA, computed against the dark canonical):** text on surface ≈ 13.1:1; muted on surface ≈ 5.6:1; accent on surface ≈ 7.0:1; accent on surface-raised ≈ 6.2:1 (Jogar fill, preview ink, toggle on-state); muted on surface-raised ≈ 4.9:1 (menu tone lines); dark ink on accent ≈ 8.6:1 (Jogar label) — all AA body-text pass. Tile ink is assigned per tier so the numeral holds ≥ 4.5:1 on every tile; the **weakest pair is `384` deep emerald at ≈ 4.7:1**. Every tier clears the 3:1 large-text AA bar for display numerals. Under-saturation of the mid ramp (`48` bronze, `96` iron) is intentional: it is the metal-cool bridge into the emerald band, and it keeps the incandescent peak the brightest thing on screen.

**`[NOTE FOR UX]` validation — bronze vs ferro.** `48` bronze (`#6E5A45`, warm gray-brown) and `96` ferro (`#4E5560`, cool slate gray) sit close in lightness by design (the metal-cool bridge), and adjacent `48|96` pairs are common at mid-game ceilings. Side-by-side validation required before ship: (1) confirm the pair reads as two distinct tiers at 44pt tile size under warm indoor lighting; (2) confirm the chamfer/grain read (Shapes) separates them even if hue does not. If either fails, deepen `96` toward slate (`[ASSUMPTION]` fallback: `#3E444E`) rather than brightening `48`, so the emerald band keeps its luminance step.

**`[NOTE FOR UX]` validation — 384 contrast.** `384` deep emerald + light ink is the weakest pair (≈ 4.65:1) and now renders at the stepped 24pt/800 size (Typography). Correction to the prior note: 24pt/800 **is** WCAG large text (≥ 18pt, or ≥ 14pt bold → 3:1 bar), so the pair passes AA large-text with wide margin — but the run keeps the conservative internal target of ≥ 4.5:1 for panel-variance margin. Re-run the contrast check on device at the new size; if it drops below 4.5:1, lighten the tile (`[ASSUMPTION]` fallback: `#1B8A66`) rather than changing the ink, so the emerald→obsidian descent keeps its direction.

**Theme variants.** Light, dark, and color-blind themes are all free (GDD/PRD). The dark theme is the canonical identity; light flips the surfaces (warm off-white slate) and re-balances tile lightness; color-blind re-serves the ramp so it is distinguishable by value step, not hue. **`[ASSUMPTION]`** — the light-theme 13-tier hexes are derived deltas (each dark-canonical tile lightened ~55% lightness, surfaces inverted to warm off-white `#F4EFE3` / `#E9E0CE`, ink roles swapped); exact values are defined in E9, not here. **`[ASSUMPTION]`** — the color-blind-theme 13-tier hexes remap the ramp to a monotonic lightness ladder (amber band compressed, emerald band shifted toward blue-green) so tiers separate by value step; exact values are defined in E9, not here. In both themes, readability is carried by the shape/glyph layer described under Shapes, never by hue alone.

## Typography

SF Pro (iOS system) for all UI — no custom display face in MVP. Medium-heavy: `500` body, `700` titles and score, `800` tile numerals. The type voice is warm, quiet, and slightly heavy — numerals carry the drama, not headlines. Tile numerals render inside Skia (not React views), so they use a **bundled heavy geometric sans** (`[NOTE FOR UX]` — bundle the font asset; architecture forbids CDN and the game must run offline) with SF Pro Display as the fallback for the numeric intent.

**Tile numeral sizing — value is the type scale, now stepped without jumps.** The GDD sets the rule (large numerals up to 3 digits, smaller beyond); the 2026-08-07 run's 32→13→9 jump read as amateur at 4+ digits. This pass inserts intermediate steps so no adjacent step drops more than ~25%.

| Digit count | Role | Token | Size / weight |
| --- | --- | --- | --- |
| 1–3 | Default tile numeral | `{typography.tile}` | 32pt, 800 (unchanged) |
| 4 | Large tile numeral | `{typography.tile-4digit}` | 24pt, 800 `[ASSUMPTION]` (was 13pt) |
| 5 | Medium tile numeral | `{typography.tile-5digit}` | 18pt, 700 `[ASSUMPTION]` (new step) |
| 6+ | Small tile numeral | `{typography.tile-6digit}` | 13pt, 700 `[ASSUMPTION]` (was 9pt) |

**`[ASSUMPTION]`** — the 24/18/13 steps are sized for the smallest supported tile (min ~44pt tile width, landscape) with 4pt inset per side; validate on device that 6-digit values (max `3072`-era scores aside, tiles cap near 6 digits in long runs) hold ≥ 3:1 large-text contrast and never clip the chamfer. If 6-digit clips, allow the tile to drop to 11pt as a floor rather than truncating the numeral.

**HUD hierarchy — score / preview / best.** Three ranks, never competing: (1) **Score** is primary — `{typography.display}` (34pt, 700) portrait, `{typography.score-landscape}` (22pt) landscape, `{colors.text}`; (2) **Preview value** is secondary — 20pt (`{components.preview-card.valueSize}`) portrait, 16pt (`{components.preview-card.valueSizeLandscape}`) landscape, in `{colors.accent}`, chip-framed with a `{components.preview-card.chipLabel}` (`PRÓX`, `{components.preview-card.chipLabelSize}` muted) label so it reads as oracle, not score — landscape score:preview ratio 22:16 ≈ 1.375× (acceptance floor ≥ 1.35×, never preview-landscape ≥ 18pt); (3) **Best** is tertiary — `{typography.caption}` (13pt, 500) portrait, `{typography.caption-landscape}` (12pt, 600) landscape, always `{colors.muted}`, always below the score, never the same size or color as either. Best never outranks preview; preview never outranks score. Acceptance: best legible outdoors (direct sun, 80% brightness, 30cm) without approaching the device.

Score and best use the display/title weights. Dynamic type is honored for labels, captions, and menu copy (see `EXPERIENCE.md` Responsive & Platform); tile numerals are fixed because they must stay legible *inside* the tile. **`[NOTE FOR UX]`** — the fixed tile numerals (32/24/18/13pt) are a deliberate, flagged exception to Dynamic Type (they render in Skia, outside `UIFontMetrics`); they must remain legible at the largest accessibility text setting and at the smallest landscape tile size (min ~44pt tile width — E1/E8), or the tile must re-run the ink-contrast check.

## Layout & Spacing

4px base grid (`{spacing.1}`–`{spacing.6}`). Board gap `{spacing.board-gap}` (8pt) between the 16 cells. `{spacing.safe-margin}` (16pt) on every edge inside the iOS safe areas. The 44pt touch-target floor (`{spacing.touch-target}`) is the minimum height for any interactive row or button.

**Portrait (primary).** The HUD is a band, nothing else: score centered top (`{typography.display}`), best directly below it in `{colors.muted}` caption (tertiary rank — never larger than 13pt, never accent); the next-piece preview as a "card in hand" in the bottom corner near the swipe finger (D-007); the pause button in the **top-right corner** (outside the board swipe rect, ≥44×44, inside safe margins). Vertical rhythm: score→best 4pt (`{spacing.1}`), HUD band→board 16pt (`{spacing.4}`), board→preview zone 16pt. The board owns the middle of the screen and is maximized within the space left by the safe margins.

**Landscape (D-006, geometry frozen D-008).** The board dominates; the HUD collapses to a **thin top edge band, 56pt tall** (44pt content + 12pt breathing room, single row always): `[score + best | left] [preview | center-right] [pause 48×48 | far right, 16pt from the inset]`. Preview sits immediately left of pause with a minimum 12pt gap; the swipe rect (board + 8pt grace) excludes pause by ≥ 12pt in both orientations. Elements use `{typography.score-landscape}` (22pt) and `{typography.caption-landscape}` (12pt/600); best truncates with ellipsis, never wraps, never pushes preview; under Dynamic Type XL+ best freezes at 12pt max (documented exception, same as tile numerals). No second row, no floating extras. Every element sits inside the 16pt safe margin, clear of the notch and home indicator. The board is maximized within the space left by the band; tiles shrink with the shorter dimension (min ~44pt tile width before the layout re-runs the numeral/ink check — see Typography).

*Visual references: [key-game-portrait.html](mockups/key-game-portrait.html) (portrait HUD band), [key-game-landscape.html](mockups/key-game-landscape.html) (landscape thin band geometry).*

Boards fill their area; tiles breathe. The grid is 4×4 with uniform 8pt gaps; tile size derives from the container, never hand-set. Menus center a single column, max ~420pt wide, scrolling only if content exceeds it.

## Elevation & Depth

Five depth layers, in order — and a consistent state model so depth behaves professionally instead of sitting flat:

1. **Board (diegetic, lowest).** The recessed well `{colors.board}`; tile sockets `{colors.cell}` sit as quiet pits; tiles rest *proud* of their sockets with `{elevation.tile-rest}` (short contact shadow + soft drop) and a chamfer top-light.
2. **HUD overlay (non-diegetic).** Score band (flat, no shadow — type carries it); the preview card floats one step up with `{elevation.raised-rest}` so the "card in hand" reads as held above the board.
3. **Raised chrome (menus, prompts).** Panels, lane cards, reward prompts, and buttons rest with `{elevation.raised-rest}`; **pressed** compresses to `{elevation.raised-pressed}` *and* swaps the fill to `{colors.surface-pressed}` (shadow + fill move together — never one without the other); **selected** (default lane, active tab, toggle on) adds the 2px `{colors.accent}` bar/edge on top of the resting shadow. Tiles pressed (merge overshoot landing frame) compress to `{elevation.tile-pressed}` for one frame.
4. **Feel layer (transient).** Particles, flash, splash, bullet-time bloom — imperative worklets that sit above the board and dissolve; they never persist as UI. Feel effects fire **on the board only** — the preview card and score are chrome and never animate with feel effects. **Reduced Motion (see `EXPERIENCE.md` Accessibility Floor) gates this whole layer** — flash, particles, splash, and the overshoot scale are cut or smoothed, while haptics and sound stay.
5. **Scrim overlays (pause, game-over).** Near-black `{colors.scrim}` at ~70% opacity over the frozen board, with the overlay card casting `{elevation.overlay}`. Game over fades in *softly* (D-010) so the last move stays visible behind the stats. Pause replaces the view; neither ever stacks a second modal (D-012).

Hierarchy lives in color, spacing, *and* this restrained shadow system — one shadow language, three magnitudes (tile / raised / overlay), always paired with a fill or ink change. Nothing else casts a shadow.

## Shapes

Chamfered lapidary corners are the signature shape. A tile is drawn in Skia as a faceted octagon approximating a 10pt radius (`{rounded.tile}`) with a bright bevel facet along the top-left edge and a darker bevel along the bottom-right — the "cut stone" read. Subtle grain texture over the fill. Cells are soft 6pt (`{rounded.sm}`); panels, cards, buttons, menu rows are 12pt (`{rounded.md}`); nothing is a pill and nothing is a perfect circle (`{rounded.full}` reserved for the tone-screen light's core glow only). Rounded-pill tile language reads as 2048-clone; chamfer reads as Mineral Quente.

**Focus ring (new, D-008 double ring).** The keyboard/VoiceOver/Switch focus state is a double ring — 2px `{colors.accent}` outer plus a 1px `{colors.scrim}` (or `tile-ink-dark`) outline with a 1px gap (`{components.button.focusRing}` and peers) — drawn *outside* the chamfer/radius, never an inset, never a fill change alone. Rule: the ring is never the same color as the adjacent fill, so focus stays visible on accent fills (Jogar, active tab) as well as raised fills and pale tiles.

**Shape carries value beyond color.** Facet geometry and grain density vary by tier band so a color-blind player can read the ramp's direction (thin clean facet low, heavier multi-facet high). **`[NOTE FOR UX]`** — exact glyph/facet mapping per tier is a color-blind-theme deliverable in E9, validated against the `192` emerald vs `1536` incandescent pair where lightness alone is ambiguous, and against the `48` bronze vs `96` ferro pair where lightness is adjacent.

## Components

Visual specs, one shared chrome language. Behavioral rules live in `EXPERIENCE.md` Component Patterns. Shared contract (D-005): **pause-button, lane-card, and menu-item are one family** — all build on `{components.menu-item}` (raised fill, 12pt radius, 48pt min height, pressed fill + compressed shadow, 2px accent focus ring); lane-card adds the panel border + tone line; pause-button is the square 48×48 glyph-only variant; menu-item is the full-width row variant. No more three almost-identical-but-different chrome specs.

- **Button** — `{components.button}`. Primary (Jogar, Jogar de novo): `{colors.accent}` fill, `{colors.tile-ink-dark}` label, 48pt tall, `{elevation.raised-rest}`; pressed: `{colors.accent-pressed}` fill + `{elevation.raised-pressed}`. Secondary: `{colors.surface-raised}` fill, 1px `{colors.border}`, `{colors.text}` label; pressed: `{colors.surface-pressed}` + compressed shadow. Focused: double ring (2px accent + 1px scrim outline — visible on accent fills too). Disabled (consumed offer only — never mid-flow): 40% opacity, no shadow, no pressed response. Never disabled-looking mid-flow; the only disabled state is an already-consumed offer.
- **Pause button** — `{components.pause-button}`: the menu-item family in square 48×48 form. `{colors.surface-raised}` fill, `{colors.text}` glyph centered, `{elevation.raised-rest}`; pressed compresses fill + shadow together. Focused: double ring. **Placement frozen (D-008): portrait top-right; landscape far right with the preview immediately to its left** (12pt minimum gap, swipe-rect exclusion ≥ 12pt). Always outside the board swipe rect, ≥44×44, inside safe margins. One tap anywhere in a match. Touch acceptance: 50 swipes ending in the top third never fire pause.

*Visual references: [key-menu.html](mockups/key-menu.html) (lane cards + Jogar), [key-pause.html](mockups/key-pause.html) (pause overlay), [key-gameover.html](mockups/key-gameover.html) (game-over stats), [key-leaderboard.html](mockups/key-leaderboard.html) (tabs + rows), [key-settings.html](mockups/key-settings.html) (rows + toggle), [key-reward.html](mockups/key-reward.html) (reward prompt), [key-tutorial.html](mockups/key-tutorial.html) (guided moves), [key-tone.html](mockups/key-tone.html) (identity beat).*
- **Panel / Card** — `{components.panel}`. `{colors.surface-raised}` on `{colors.surface}`, 1px `{colors.border}`, `{rounded.md}`, `{elevation.raised-rest}`. Used for lane cards, leaderboard, settings list, reward prompts.
- **Menu item** — `{components.menu-item}`. Full-width row, 48pt min height, `{colors.surface-raised}` fill; pressed `{colors.surface-pressed}`; a 2px `{colors.accent}` bar on the active/default lane card and on the selected settings row; focused double ring; disabled 40% opacity (used only for the consumed-offer row).
- **Lane card** — `{components.lane-card}`: menu-item + panel + tone line. Two cards side by side (Clean "Pura" / Iniciante "Com ajuda"); each one tone line of `{colors.muted}`; the default lane's card carries the 2px `{colors.accent}` bar *and* the 1px `{colors.accent}` selected border, and is pre-armed. Pressed: fill + shadow compress like every chrome sibling.
- **Leaderboard tab** — `{components.leaderboard-tab}`: menu-item in compact segmented form; two tabs ("Melhores" / "Recentes"); **≥44×44 hit area** (a11y floor); active tab `{colors.accent}` fill with `{colors.tile-ink-dark}` label (dark ink on accent ≈ 8.6:1), pressed `{colors.accent-pressed}`; inactive `{colors.muted}` text on raised fill; focused double ring.
- **Tile** — `{components.tile}`. 13-tier fill per the table, chamfered, grain, ink per tier, `{elevation.tile-rest}` on the well; `1536` and `3072+` add the `{colors.glow-incandescent}` outer bloom (the only glow in the whole system — scarcity is the message; ceiling: bloom ≤ 12% of tile width, opacity ≤ 35%, transient with the merge splash, never over preview/score, off entirely under Reduced Motion — acceptance: bright tile + 4 neighbors legible at ≥ 4.5:1 effective in a 1/60s photo during flash). Merge-landing frame compresses to `{elevation.tile-pressed}`.
- **Preview card** — `{components.preview-card}`. "Card in hand": small `{colors.surface-raised}` card with `{elevation.raised-rest}` showing the next value in `{colors.accent}` ink at `{components.preview-card.valueSize}` (20pt portrait, `{components.preview-card.valueSizeLandscape}` 16pt landscape) (`1/2`, `3`, or a range like `3/6/12`), labeled `{components.preview-card.chipLabel}` (`PRÓX`, `{components.preview-card.chipLabelSize}` muted) so it reads as oracle, never as a second score. Sits in the portrait bottom corner / landscape center-right of the top band. The value reads like a chip, not a tile — it is an oracle, not a piece on the board. Never animates with feel effects.
- **Leaderboard row** — `{components.leaderboard-row}`. Rank, score (weight 700), and date+time timestamp (`{colors.muted}`), hairline dividers. Loading: skeleton rows (raised fill blocks, `[ASSUMPTION]` shimmer) — never a spinner; the list shape holds while local scores load.
- **Prompt / banner** — `{components.prompt-banner}`. Iniciante-only learning aids (ceiling indicator, stuck warning): `{colors.surface-raised}` strip with an `{colors.accent}` edge, `{colors.muted}` copy, contextual and dismissible (≥44pt dismiss target). Never appears in Clean.
- **Reward prompt** — `{components.reward-prompt}`: panel + secondary Button, casting `{elevation.overlay}`. Iniciante-only offer panel (undo / death-continue): `{colors.surface-raised}` card, 1px `{colors.border}`, copy `{colors.text}`, primary CTA as secondary Button, Cancel always present; consumed state renders the CTA disabled (40% opacity, no shadow); appears at the moment of need.
- **Settings row + toggle** — `{components.settings-row}` + `{components.settings-toggle}`. Row follows the menu-item contract (pressed fill, double-ring focus); `{colors.accent}` on-state, `{colors.border}` off-state track edged with 1px `{colors.muted}` (≥ 3:1 track-vs-background) plus an I/O glyph on the thumb so state never depends on hue or position alone. State change is immediate and persisted. Theme + language rows use the stacked layout (`{components.settings-row.layoutStacked}`): label above, control below full-width — the segmented control drops to its own line so PT/EN and theme options never squeeze.
- **Game-over stat row** — `{components.game-over-stat-row}`. Label in `{colors.muted}`, value in `{colors.text}`; the **new-record figure is `{colors.accent}`-highlighted** — a number, not a celebration (D-013).
- **Game-over result portrait** — `{components.game-over-result-portrait}`. Frozen non-interactive thumbnail of the final board (post-animation snapshot, same board that sits under the scrim) centered above the stats, with the max-tile value as hero caption. It is a retrato, not a celebration: no confetti, no motion, no glow beyond the tile's own `1536+` bloom; Reduced Motion shows the identical static frame.
- **Empty states.** Empty board cells are the `{colors.cell}` pits (not placeholders — they are the board). Empty leaderboard: raised panel with `{colors.muted}` copy ("Sem registros ainda" / "No scores yet"), no CTA pressure, no illustration.

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Keep the Clean-lane board clean: score + best + preview only (D-007) | Add a ceiling indicator or stuck warning to Clean (learning aids are Iniciante-only) |
| Make Jogar one tap to play on the last/default lane (D-011) | Make the menu a title-screen portal that requires a second tap |
| Pair every shadow change with a fill/ink change (rest→pressed→selected) | Float flat chrome, or shadow without a state change |
| Step tile type 32→24→18→13 so 4+ digits never jump | Ship the 32→13→9 cliff on 4-digit tiles |
| Rank HUD score > preview > best in size, color, and position | Let best compete with score, or preview read as a second score |
| Give every interactive chrome a pressed, focused, and disabled look | Ship resting-state-only buttons, tabs, and cards |
| Build pause-button, lane-card, and menu-item from one chrome contract | Hand-tune three near-identical chrome specs |
| Flip tile ink to hold ≥ 4.5:1 on every tier | Use one ink color on light and dark tiles |
| Make `1` and `2` readable at a glance | Let two adjacent low tiles share a hue |
| Reserve glow for `1536+` | Glow every merge, flash every tile |
| Chamfer the tiles; 12pt radii on chrome; 2px accent focus ring | Pills, pastels, or full-radius tile chips (2048 grammar) |
| Show the preview card in **both** lanes | Treat the preview as an assist feature |
| Highlight a new record as a number | Confetti, banners, or a "new record!" event (D-013) |
| Keep overlays to one level; pause replaces | Stack pause inside game over inside settings |
| Communicate merges by shape + text beyond color | Rely on hue alone (color-blind floor, E9) |
