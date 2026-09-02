---
status: done
story: 8-2-punch-visual
workflow: bmad-testarch-nfr
gate: CONCERNS
adr_score: "21/29"
artifacts:
  - _bmad-output/test-artifacts/nfr-assessment-8-2-punch-visual.md
  - _bmad-output/test-artifacts/nfr-assessment.md
evidence:
  delta: ef72635
  full_suite: "749 tests 745 pass / 4 fail expected RED (26 suites 4906ms)"
  scoped: "28 mapped 26 pass / 2 fail waived (R-002 P1-05 + R-007 P2-01 same bare setTimeout 500ms)"
  tsc: clean
  engine_diff: empty
---

NFR assessment for 8-2 punch visual completed — gate CONCERNS (21/29).

Assessment written to `_bmad-output/test-artifacts/nfr-assessment-8-2-punch-visual.md` (also synced to `nfr-assessment.md`). Working-tree delta `ef72635` (triade/src/feel/feel.ts 96 LOC + punch.ts 47 LOC + GameBoard.tsx isMerge/overshoot/flash/glow/burst + App.tsx reducedMotion wiring) evaluated against test-design NFR planning and live host evidence: 749 tests 745 pass / 4 fail (2 carry-over 8-1 + 2 new 8-2 R-002/R-007 burst leak same cause, 26 suites 4906ms), tsc clean, engine byte-identical, micro-bench 130k punchProfileFor <200ms.

Gate is CONCERNS not FAIL: 0 critical fails, P0 100% cover/pass, carry-over 8-1 waivers (R-001 2!==1, R-006 expo-haptics) remain waived. Two new expected-REDs share one cause — `GameBoard.tsx:386-392` bare `setTimeout(500)` without `burstTimersRef` + `clearTimeout` on unmount — waived pending one-line fix before 8-3 (same fix clears P1-05 + P2-01). Device p99 <16.7ms and device smoke P1-06 (15-min real-iPhone: 3/6/12+/1536 glow portrait+landscape + Reduced Motion ON flat) remain pending — host mitigations (caps ≤1.2/4/8/16, absolute dots, micro-bench GREEN) in place per R-001/R-008.

Next: fix burst leak (0.25h, store id(s) in ref + useEffect cleanup mirroring settleTimerRef) + device smoke sign-off → re-run nfr-assess/trace to PASS before verified.
