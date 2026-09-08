---
status: done
---

# TEA Automate — 9-2-screen-reader-contract preview/banner delta: done

Generated prioritized API/E2E tests + fixtures for the working-tree delta
(`d26bbdd..HEAD`: `App.tsx` preview/banner announcement wiring,
`PreviewCard.tsx` i18n label, banner guards) under TEA's configured
`test_artifacts` (`_bmad-output/test-artifacts`), plus a Definition-of-Done
summary. All green; `sprint-status.yaml` untouched (orchestrator-owned).

## Artifacts (new)

- `test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts`
  — delta scan strings, `previewDisplayOf` memo replica + 6 display fixtures,
  7-state banner transition matrix + `bannerTransitions` replica.
- `test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts`
  — 11 ACTIVE tests (P0×6, P1×3, P2×2): EN/PT preview phrasing, empty-silent,
  banner passthrough, `a11y.preview` key existence, transition matrix,
  App preview/banner effect guards, PreviewCard i18n label, follow-up tracking.
- `test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts`
  — 8 ACTIVE tests (P0×3, P1×3, P2×2): mount silence, display-change journey,
  PT end-to-end, display derivation, banner journey, lane note, engine
  untouched, no-throttle-by-design.
- `test-artifacts/automation-summary-9-2-screen-reader-contract.preview-banner.md`
  — coverage plan, validation checklist, Definition of Done, next steps.

## Verification

- New suites: **19/19 pass, 0 fail** (API 11/11 ~175ms, E2E 8/8 ~265ms).
- Standing contract `triade/__tests__/a11y/screenReader.contract.test.tsx`:
  **15/15 pass** (no regression).
- Run:
  `TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules`
  `triade/node_modules/.bin/tsx --test <api-spec> <e2e-spec>`

## Open (not defects in this pass)

- P1 contract-extension follow-up (P1-D1..D4) remains scaffolded in
  `atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts`
  (standing contract file does not yet pin the new refs — tracked, not dropped).
- P3 device ear-check stays operator-owned per spec `operator_actions`
  (`awaiting-operator` status unchanged).
