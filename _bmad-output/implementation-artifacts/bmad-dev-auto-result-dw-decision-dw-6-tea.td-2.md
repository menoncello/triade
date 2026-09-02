---
status: done
---

TEA Test Design for dw-decision-dw-6 completed. Artifacts:
- _bmad-output/test-artifacts/test-design-dw-6-rotation-race-safe-area-initial-metrics.md (canonical mirror at _bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md)
- Progress appended to _bmad-output/test-artifacts/test-design-progress.md (step 01-05)
- Risk assessment: 10 risks (3 high ≥6: R-001 coalesce 32ms window, R-002 initialMetrics null fallback, R-003 stale lastValid), mitigated via P0 host pins + static rg allowlists
- Coverage strategy: P0 18 checks (host unit, already green 914/914 full gate 22/22 layout+synced), P1 10 checks, P2 6, P3 4; execution PR <5min smoke + P0 <10min + P1 <30min, no nightly, host-only
- Gates: npm --prefix triade test 914 pass / 0 fail 22/22 slice, tsc clean for App.tsx + useSyncedLayout.ts (pre-existing 8 errors unrelated in spawn-candidates-validation.atdd only), rg allowlists green
- Working tree delta assessed: triade/App.tsx + triade/src/ui/useSyncedLayout.ts + triade/__tests__/ui/useSyncedLayout.test.ts vs HEAD a1f6831; no sprint-status.yaml written (orchestrator-owned)
