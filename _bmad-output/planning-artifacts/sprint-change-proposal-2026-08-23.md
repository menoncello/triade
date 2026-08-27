# Sprint Change Proposal — Reordenar Épicos (prioridade 7 e 6)

- **Date:** 2026-08-23
- **Project:** 3-clone (Tríade)
- **Trigger:** Reordenação da fila de entrega — Epic 7 (Next Piece Preview) e Epic 6 (Failure Suite) priorizados antes do Epic 3.
- **Status:** Approved by user (2026-08-23).

---

## Section 1 — Issue Summary

Epics 1–2 are delivered and retrospective'd. The owner wants the next-piece preview (Epic 7) and the game-over/failure suite (Epic 6) shipped before the two-lane work (Epic 3). No bug or stakeholder defect triggered the change; it is a deliberate priority resequencing.

## Section 2 — Impact Analysis

- **Epic Impact:** Execution order of remaining epics changes to **7 → 6 → 3 → 4 → 5 → 8 → 9 → 10 → 11**. Epic and story IDs stay stable — renumbering would break references in `sprint-status.yaml`, git branches, deferred-work ledger, and story files.
- **Story Impact:**
  - 7.2 (preview nas duas pistas) — the "both Clean and Accelerated lanes" AC (FR-45) is deferred to Epic 3; preview lands on the single lane first.
  - 6.3 (restart 1-tap) — the Accelerated-lane Continue offer (FR-18) is deferred to Epic 3/4; Clean-lane restart lands first.
  - All other stories in Epics 7 and 6 are lane-agnostic and fully executable now (Epic 2 delivered the immutable `GameState` + `pendingSpawn` snapshot that 7.1/7.4 consume).
- **Artifact Conflicts:** `epics.md` (Epic List + scope notes), `sprint-status.yaml` (block order). No GDD/Architecture/UX changes required.
- **Technical Impact:** None — single-lane execution of 7/6 requires no engine or orchestrator changes; `src/game` (orchestrator) birth still belongs to Epic 3 (3-5).

## Section 3 — Recommended Approach

**Direct Adjustment** — resequence the backlog without altering scope or IDs. Rationale: cheapest option, no rework of delivered epics, preserves all existing references, and two-lane ACs are cleanly gated to land with Epic 3. Effort: Low. Risk: Low.

## Section 4 — Detailed Change Proposals

### Artifact: epics.md
1. Reorder the **Epic List** to: 1, 2 (done), 7, 6, 3, 4, 5, 8, 9, 10, 11. Add a priority banner noting the CC date and the two-lane gating.
2. **Story 7.2** — add scope note: single-lane first; FR-45 (both lanes) lands with Epic 3; tag the AC.
3. **Story 6.3** — add scope note: Clean-lane restart first; Accelerated Continue (FR-18) lands with Epic 3/4.

### Artifact: sprint-status.yaml
4. Reorder `development_status` blocks to match the new order; update `last_updated` header and value.

### Artifact (new): sprint-change-proposal-2026-08-23.md
5. This document records the approved change.

## Section 5 — Implementation Handoff

- **Scope:** Moderate — backlog reorganization (backlog reorder only; no replan required).
- **Handoff recipients:** Dev (creator of next story) + Project Lead.
- **Success criteria:** `sprint-status.yaml` block order matches 7 → 6 → 3 → … ; `epics.md` Epic List and scope notes reflect the new order; no story/epic ID changed.