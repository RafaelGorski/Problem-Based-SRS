# Traceability Matrix — CP → CN → FR/NFR

**Produced:** 2026-08-15 · **Round:** remediation of the nine open parent issues

---

## Full chain

| CP | CN | FR / NFR | Parent issue | Phase |
|----|----|----------|--------------|-------|
| CP.01 | CN.01.3 | FR.01.3.12 — Canvas release metadata parity (lockfile included) | #146 | 0 |
| CP.01 | CN.01.3 | FR.01.3.13 — `/live` provenance from the current published archive | #138 | 3 |
| CP.01 | CN.01.4 | FR.01.4.7 — Registry before-state capture and re-crawl submission | #140 | 1 |
| CP.01 | CN.01.4 | FR.01.4.8 — Re-crawl verification by parsed content | #147 | 2 |
| CP.04 | CN.04.1 | FR.04.1.11 — Closure verdict parity between audit and prospective | #139 | 1 |
| CP.04 | CN.04.1 | FR.04.1.12 — Falsification of the closure gate under mutation | #145 | 2 |
| CP.04 | CN.04.1 | FR.04.1.13 — Complete batch ledger accounting before closure | #149 | 5 |
| CP.04 | CN.04.1 | NFR.08 — Consolidated gate determinism | (cross-cutting) | 0 |
| CP.06 | CN.06.1 | FR.06.1.6 — Adoption surface parity and predeclared contract | #142 | 3 |
| CP.06 | CN.06.1 | FR.06.1.7 — Observation window execution and outcome filing | #148 | 4 |
| CP.07 *(proposed)* | CN.07.1 *(proposed)* | — | — | — |

---

## ZigZag validation

### CP → CN (downward completeness)

| CP | Has ≥1 CN | Result |
|----|-----------|--------|
| CP.01 | CN.01.3, CN.01.4 | ✅ |
| CP.04 | CN.04.1 | ✅ |
| CP.06 | CN.06.1 | ✅ |
| CP.07 *(proposed)* | CN.07.1 *(proposed)* | ✅ matched proposed pair |

### CN → FR (downward completeness)

| CN | Has ≥1 FR | Result |
|----|-----------|--------|
| CN.01.3 | FR.01.3.12, FR.01.3.13 | ✅ |
| CN.01.4 | FR.01.4.7, FR.01.4.8 | ✅ |
| CN.04.1 | FR.04.1.11, FR.04.1.12, FR.04.1.13 | ✅ |
| CN.06.1 | FR.06.1.6, FR.06.1.7 | ✅ |
| CN.07.1 *(proposed)* | none | ⚠️ intentional — proposed needs carry no requirements |

### FR → CN → CP (upward correctness)

Every FR in this round names its CN and CP in its own `## Traceability` table. No FR is an orphan;
no FR traces to a proposed identifier.

### Issue coverage

| Open parent issue | Requirement | Covered |
|---|---|---|
| #138 | FR.01.3.13 | ✅ |
| #139 | FR.04.1.11 | ✅ |
| #140 | FR.01.4.7 | ✅ |
| #142 | FR.06.1.6 | ✅ |
| #145 | FR.04.1.12 | ✅ |
| #146 | FR.01.3.12 | ✅ |
| #147 | FR.01.4.8 | ✅ |
| #148 | FR.06.1.7 | ✅ |
| #149 | FR.04.1.13 | ✅ |

**9 of 9 open parent issues covered by exactly one requirement each.**

---

## Gaps and deliberate exclusions

| Item | Status | Reason |
|------|--------|--------|
| CP.07 / CN.07.1 | Proposed, unratified | Zero open Dependabot, code-scanning and secret-scanning alerts as of 2026-08-15 — no requirement is justified |
| skills.sh version agreement | Not verifiable | The surface publishes no `softwareVersion`; recorded as a notice, never a closure condition |
| Playwright evidence for FR.04.1.11, FR.04.1.12 | Out of scope by design | Metadata and exit-code claims that no browser view can witness |

---
*Created: 2026-08-15*
