# Epic 9 Context: Acessibilidade — Jogável por Todos

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Todos os jogadores, incluindo usuários de VoiceOver e de temas de contraste, jogam integralmente com 44pt, WCAG AA e três temas gratuitos — tap targets confiáveis, screen reader completo, merges legíveis sem cor, e theming que persiste.

## Stories

- Story 9.1: Tap targets ≥44×44pt
- Story 9.2: Screen Reader Contract
- Story 9.3: Merges por shape/texto além de cor + WCAG AA
- Story 9.4: Temas light, dark e color-blind

## Requirements & Constraints

- Todos os elementos tocáveis ≥44×44pt, enforced no componente, não por tela; inclui leaderboard tab, banner dismiss, tone-screen skip, menu rows (48pt min), pause button; targets nunca sobrepõem board swipe-capture zone (FR28, S9.1, UX-DR6/13, D-008).
- Screen reader (VoiceOver/TalkBack): move = three-finger swipe, read = tap tile (value+posição), per-tile accessibilityElements via bridge, labels engine-derived/board; chrome labels i18n-authored; announcement contract completo; auto-advance pausa com VoiceOver (FR29, S9.2, UX-DR1/2).
- Merges comunicados por shape/texto além de cor — facet/grain variam por tier; hexes para color-blind; contraste WCAG AA em todos os temas (light/dark/color-blind); tile ink ≥4.5:1, weakest 384 deep emerald ~4.7:1 ainda passa (FR31, S9.3, UX-DR17/19).
- Light, dark e color-blind themes gratuitos; tokens como pure data consumidos por Skia e RN; dark canônico, light flip surfaces, color-blind ramp por value step não hue; persistência instantânea (FR32, S9.4, UX-DR17).
- Spacing 4px base, board gap 8pt, safe-margin 16pt (AGENTS), menus max ~420pt, tile size deriva do container; typography tokens fixos para tiles.
- Reduced Motion e outras a11y stories não bloqueiam 9.1; 9.1 é pré-requisito visual/motor independente.

## Technical Decisions

- Theme tokens `src/theme` como pure data (light/dark/color-blind palettes); 13 tile tiers com hexes + per-tier ink (dark/light) holding contrast.
- `src/ui` RN views para todos os chrome touchables (leaderboard tabs, banners, tone, menu, pause); Skia `src/render` para board apenas — tap targets concern é RN layer, não Skia board.
- Layout usa `react-native-safe-area-context` + spacing.safe-margin 16pt; pause fixo top-right fora do board swipe rect (UX-DR6).
- Touch target enforcement no componente: minHit 44pt via hitSlop/padding/minHeight/minWidth; util central `a11y` ou constante `TOUCH_TARGET_MIN = 44`; verificação via unit test ou checklist (oversized spec for exhaustive audit).
- Board swipe zone (RNGH Gesture.Pan) isolada; chrome buttons outside capture zone para não conflitar.

## UX & Interaction Patterns

- Todos os botões/abas/banners têm área generosa; 44pt floor medido em pt lógicos, não pixels; sobreposição com board swipe é defeito.
- Menu rows 48pt min height; tone screen skip = tela toda mas com target explícito; banner dismiss mesma regra.
- Pause sempre alcançável, fora do gesto do board, dentro de safe margins.
- Leaderboard tab ativo com accent fill + dark-ink label (~8.6:1) e hit area ≥44pt.

## Cross-Story Dependencies

- 9.1 é independente e pode entregar primeiro; 9.2 consome mesmos chrome components mas adiciona labels; 9.3 e 9.4 validam contraste por paleta (9.3 valida dark, 9.4 valida light+color-blind).
- Todos 9.x dependem de Epic 1 (board+layout+input) e Epic 3/5 (chrome existente) já done; Epic 8 Reduced Motion orthogonal.
