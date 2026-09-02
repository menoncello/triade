/**
 * Fixtures — dw-hud-preview-hardening (DW-69)
 * Hud resilient to omitted/partial previews — deterministic, host-only, no faker
 * Covers: triade/src/ui/Hud.tsx:9 FALLBACK_PREVIEW singleton
 *         triade/src/ui/Hud.tsx:23 previews? optional shape
 *         triade/src/ui/Hud.tsx:64-67 previews?.clean/?accelerated ?? FALLBACK_PREVIEW guard
 *         triade/src/ui/PreviewCard.tsx:14-22 displayOf range [] → "" + Number.isFinite filter
 *         triade/App.tsx:950-952 fan-out previews={{clean: previewFor(...), accelerated: previewFor(...)}} unchanged
 *         triade/src/game/preview.ts:1-113 Preview type byte-identical
 * Spec: deferred-work.md DW-69 (no dedicated spec-hud-preview-hardening.md — ledger + commit 4f674b4)
 * Design: _bmad-output/test-artifacts/test-design-dw-hud-preview-hardening.md (9 risks, P0 7 / P1 6 / P2 4 / P3 3)
 * ATDD: triade/__tests__/ui/hud-preview-hardening.atdd.test.ts (20 inner it.skip, 4 suites, node:test + tsx + react-test-renderer)
 * Run: node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts
 *      node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/e2e/hud-preview-hardening.umbrella.spec.ts
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/__tests__/ui
 * No Playwright test.extend — pure node:test + tsx + react-test-renderer helpers (RN Hud seam, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../triade/src/ui/Hud.tsx';
import type { Preview } from '../../../triade/src/game/preview.ts';
import { PreviewCard } from '../../../triade/src/ui/PreviewCard.tsx';

export { Hud, PreviewCard };
export type { Preview };

// ── Deterministic Preview factories (no faker) ───────────────────────────
export const PREVIEW_EXACT_3: Preview = { kind: 'exact', value: 3 } as Preview;
export const PREVIEW_EXACT_6: Preview = { kind: 'exact', value: 6 } as Preview;
export const PREVIEW_RANGE_3_6_12: Preview = { kind: 'range', values: [3, 6, 12] } as Preview;
export const FALLBACK_PREVIEW: Preview = { kind: 'range', values: [] } as Preview;
export const PREVIEW_RANGE_EMPTY: Preview = { kind: 'range', values: [] } as Preview;

// ── Insets / band fixtures ───────────────────────────────────────────────
export const INSETS = { top: 10, left: 10, right: 10, bottom: 10 } as const;
export const BAND_HEIGHT = 40 as const;
export const SCORE_FIXTURES = { score: 123, best: 456 } as const;
export const SCORE_ZERO: { score: number; best: number } = { score: 0, best: 0 };

// ── Shipped constants (single-source verification) ───────────────────────
export const HUD_CONSTANTS = {
  FALLBACK_KIND: 'range' as const,
  FALLBACK_VALUES_EMPTY: true as const,
  PORTRAIT_STYLE: { width: 76, height: 76 } as const,
  LANDSCAPE_BAND: { minWidth: 60, height: 44 } as const,
} as const;

export const LEDGER = {
  DW: 'DW-69',
  HASH: 'da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce',
  HASH_TAIL: 'da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce',
  DATE: '2026-09-02',
  BUNDLE: 'dw-hud-preview-hardening',
} as const;

export const SCAN_STRINGS = {
  FALLBACK_PREVIEW: 'FALLBACK_PREVIEW',
  PREVIEWS_OPTIONAL: 'previews?:',
  COALESCE_FALLBACK: '?? FALLBACK_PREVIEW',
  PREVIEWS_DOT_CLEAN_BARE: 'previews.clean',
  PREVIEWS_DOT_ACC_BARE: 'previews.accelerated',
  PREVIEWS_OPTIONAL_CHAIN_CLEAN: 'previews?.clean',
  PREVIEWS_OPTIONAL_CHAIN_ACC: 'previews?.accelerated',
  RESOLUTION_UNDO: 'resolution-undo',
  SPRINT_STATUS: 'sprint-status.yaml',
} as const;

// ── Host render helpers (mirror hud.test.ts harness) ─────────────────────
export function renderHud(props: any = {}): TestRenderer.ReactTestRenderer {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(Hud, {
        score: SCORE_FIXTURES.score,
        best: SCORE_FIXTURES.best,
        isLandscape: false,
        insets: INSETS,
        bandHeight: BAND_HEIGHT,
        previews: {
          clean: PREVIEW_EXACT_3,
          accelerated: PREVIEW_EXACT_6,
        },
        ...props,
      })
    );
  });
  return renderer;
}

export function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  const parts: string[] = [];
  const walk = (c: any) => {
    if (Array.isArray(c)) c.forEach(walk);
    else if (c !== null && c !== undefined) parts.push(String(c));
  };
  renderer.root
    .findAll((n) => (n.type as string) === 'Text')
    .forEach((n) => walk(n.props.children));
  return parts;
}

export const hasToken = (parts: string[], token: string): boolean =>
  parts.some((p) => p.trim() === token);

export const hasStyle = (
  renderer: TestRenderer.ReactTestRenderer,
  match: Record<string, any>
): boolean =>
  renderer.root.findAll((node) => {
    const raw = node.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some(
      (style) =>
        typeof style === 'object' &&
        style !== null &&
        Object.entries(match).every(([k, v]) => (style as any)[k] === v)
    );
  }).length > 0;

export function renderPreviewCard(preview: Preview, label = 'Clean'): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(PreviewCard, { preview, label }));
  });
  return r;
}

// ── Source scan helpers ──────────────────────────────────────────────────
const __dirname_fixture = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname_fixture, '../../..');

export function readSource(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8');
}

export function countMatches(source: string, pattern: RegExp): number {
  return (source.match(pattern) || []).length;
}

export const HUD_SOURCE_PATH = 'triade/src/ui/Hud.tsx';
export const PREVIEW_CARD_SOURCE_PATH = 'triade/src/ui/PreviewCard.tsx';
export const PREVIEW_SOURCE_PATH = 'triade/src/game/preview.ts';
export const APP_SOURCE_PATH = 'triade/App.tsx';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';

// ── Validation helpers ───────────────────────────────────────────────────
export function assertHudGuardWiring(hudSrc: string): void {
  // FALLBACK_PREVIEW appears exactly 2 times (def + use) — single fallback
  const fallbackHits = countMatches(hudSrc, /FALLBACK_PREVIEW/g);
  if (fallbackHits !== 2) throw new Error(`FALLBACK_PREVIEW must be 2, got ${fallbackHits}`);
  // previews?: appears exactly 1 — single optional shape
  const previewsOptionalHits = countMatches(hudSrc, /previews\?:/g);
  if (previewsOptionalHits !== 1) throw new Error(`previews?: must be 1, got ${previewsOptionalHits}`);
  // ?? FALLBACK_PREVIEW appears exactly 1 — single coalesce site
  const coalesceHits = countMatches(hudSrc, /\?\? FALLBACK_PREVIEW/g);
  if (coalesceHits !== 1) throw new Error(`?? FALLBACK_PREVIEW must be 1, got ${coalesceHits}`);
  // No bare previews.clean / previews.accelerated (only previews?.clean / ?.accelerated)
  const bareClean = countMatches(hudSrc, /previews\.clean/g);
  if (bareClean !== 0) throw new Error(`bare previews.clean must be 0, got ${bareClean}`);
  const bareAcc = countMatches(hudSrc, /previews\.accelerated/g);
  if (bareAcc !== 0) throw new Error(`bare previews.accelerated must be 0, got ${bareAcc}`);
  if (!hudSrc.includes('previews?.clean') || !hudSrc.includes('previews?.accelerated')) {
    throw new Error('previews?.clean + previews?.accelerated must both exist');
  }
}

export function assertPreviewCardDefensive(previewCardSrc: string, hudSrc: string): void {
  if (!previewCardSrc.includes('Number.isFinite')) throw new Error('PreviewCard must filter Number.isFinite');
  if (!previewCardSrc.includes("join('/')")) throw new Error("PreviewCard range must join with '/'");
  if (hudSrc.includes('export type Preview')) throw new Error('Hud must not re-export Preview type');
}

export function assertAppFanout(appSrc: string): void {
  const fanoutHits = countMatches(appSrc, /previews=\{\{\s*clean:/g);
  if (fanoutHits < 1) throw new Error(`App.tsx previews fan-out must exist, got ${fanoutHits}`);
  const previewForCalls = countMatches(appSrc, /previewFor\(game\.pendingSpawn/g);
  if (previewForCalls < 2) throw new Error(`App must call previewFor(game.pendingSpawn, availablePot) for both lanes, got ${previewForCalls}`);
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(LEDGER.HASH)) throw new Error(`ledger must contain 64-hex ${LEDGER.HASH}`);
  if (!ledgerSrc.includes('DW-69') || !ledgerSrc.includes('status: done')) throw new Error('DW-69 must be marked done');
  if (!ledgerSrc.includes('resolution-undo')) throw new Error('ledger must preserve resolution-undo hash');
}
