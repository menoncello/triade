# Traceability Report

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (5/5 acceptance criteria fully covered), P1 coverage is 100% (no P1 requirements; effective target met), and overall coverage is 100% (minimum: 80%). All 13 mapped tests are active (0 skipped/fixme/pending); suite verified green at run time — `npm test`: **288 pass / 0 fail**.

**Trace target:** Story 7.1 — pendingSpawn pre-resolvido no snapshot
**Decision date:** 2026-08-24
**Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — story file ACs 1–5, `_bmad-output/implementation-artifacts/7-1-pendingspawn-pre-resolvido-no-snapshot.md`

---

## Coverage Summary

| Metric | Value |
|---|---|
| Total Requirements | 5 |
| Fully Covered | 5 (100%) |
| Partially Covered | 0 |
| Uncovered | 0 |
| P0 Coverage | 100% (5/5) |

---

## Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 7.1-AC1 | Next pendingSpawn pre-resolved into the immutable snapshot on every effective move (N3); `newGame` returns initial resolved pending | P0 | FULL | 7.1-U-001, 2.6-I-006, 2.6-I-010, 2.6-I-002 |
| 7.1-AC2 | pendingSpawn drawn from same distribution as actual spawn (FR-41) | P0 | FULL | 7.1-U-002, 2.6-I-003 |
| 7.1-AC3 | pendingSpawn lives in the snapshot; undo rewinds it with the board (ADR-06) | P0 | FULL | 7.1-U-003, 7.1-U-004, 2.6-I-009 |
| 7.1-AC4 | UI never rolls; placed tile always equals pre-resolved `pendingSpawn.value` | P0 | FULL | 7.1-U-005, 7.1-U-007, 7.1-S-001 |
| 7.1-AC5 | NOOP move never changes pendingSpawn (UX-DR-23) | P0 | FULL | 7.1-U-006, 2.6-I-001, base-G-001 |

### Test Inventory (deduplicated)

| ID | Level | File:Line | Title |
|---|---|---|---|
| 7.1-U-001 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:50 | [P0] AC1 effective move resolves the NEXT pending from the post-merge ceiling; newGame draw budget 20 |
| 7.1-U-002 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:83 | [P0] AC2/FR-41 distribution gate over >=10k effective moves (seeded, 5σ) + N3 forward invariant |
| 7.1-U-003 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:132 | [P0] AC3/ADR-06 rewind shape reproduces identical next result |
| 7.1-U-004 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:146 | [P0] AC3/ADR-06 shallow-copy isolation (noop copy-not-reference) |
| 7.1-U-005 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:168 | [P0] AC4 place-not-roll on spawnTile + value sweep through live move path |
| 7.1-U-006 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:195 | [P0] AC5/UX-DR-23 NOOP deep-equal + 0 rng draws |
| 7.1-U-007 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:204 | [P0] AC4 combined-resolver band edges |
| 7.1-S-001 | unit | triade/__tests__/ui/ui.norolls.test.ts:54 | [P0] AC4 structural guard: App/ui/render/services never import/reference roll symbols or Math.random |
| 2.6-I-001 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:54 | [P0] noop full board: pendingSpawn unchanged, 0 draws |
| 2.6-I-002 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:73 | [P0] newGame consumes exactly 20 draws in order |
| 2.6-I-003 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:101 | [P0] tier ladder variants: pending pot membership 96/192/384 |
| 2.6-I-006 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:146 | [P0] snapshot shape: valid initial pendingSpawn |
| 2.6-I-010 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:283 | [P1] determinism of { board, pendingSpawn } sequence |
| 2.6-I-009 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:290 | [P1] rewind shape reconstruction |
| base-G-001 | unit | triade/__tests__/engine/game.test.ts:121 | NOOP_SWIPE: nothing changes |

Files: 4 · Cases: 13 · Skipped/Fixme/Pending: 0/0/0

### Coverage Validation Notes

- Every AC has a dedicated by-name pin in `pending-spawn-contract.test.ts` (story-level ownership), plus independent reinforcement from the 2.6 integration suite and base engine suite — no single-suite fragility.
- Negative paths present: NOOP/rejected-move behavior covered at both contract and integration level (AC5). Engine "never throws" invariant untouched (`engine.purity.test.ts` green).
- Heuristics: endpoint/auth N/A (pure engine + static-scan story); happy-path-only gaps: 0; UI journey/state gaps: 0 within this story's oracle (HUD preview card rendering is Story 7.2 scope).

---

## Gaps & Recommendations

**Coverage gaps:** none (critical: 0, high: 0).

Recommendations:

1. **LOW** — Run `/bmad-testarch-test-review` on the two new 7.1 suites for quality DoD validation.
2. **MEDIUM** — Close the deferred-work entry for `tsc --noEmit -p tsconfig.test.json` (pre-existing TS5101 abort + 3 masked RN-stub type errors; waived by owner Eduardo 2026-08-24) before Epic 7 adds more test-only surface.
3. **LOW** — Commit or discard the uncommitted shared-helper refactor (`sigmaBound`/`runSeededSession` lifted into `triade/test-utils/helpers.ts`, trimming `adaptive-spawn-integration.test.ts`) that post-dates the story record's 287-test baseline (suite now runs 288 tests).

---

## Next Actions

Gate **PASS** — Story 7.1 approved from a coverage/traceability standpoint. Proceed with Epic 7 (Story 7.2 HUD preview card will consume this story's structural guard as protection against accidental re-rolling in the renderer).

---

_Gate decision summary (step-05):_

🚨 GATE DECISION: **PASS**

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (PASS target: 90%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale: All acceptance criteria traced to active, green tests across two independent suites; zero uncovered requirements.

⚠️ Critical Gaps: 0

📂 Machine-readable outputs:
- `_bmad-output/test-artifacts/traceability/coverage-matrix-7-1.json`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-7-1.json`
- `_bmad-output/test-artifacts/traceability/gate-decision-7-1.json`
