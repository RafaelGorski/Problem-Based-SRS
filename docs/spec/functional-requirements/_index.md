# Functional Requirements — Index

**Scope:** remediation of the nine open parent issues in
[RafaelGorski/Problem-Based-SRS](https://github.com/RafaelGorski/Problem-Based-SRS), specified on
**2026-08-15** from evidence gathered by executing the repository's own tooling on that date.

**Traces to:** [`../01-customer-problems.md`](../01-customer-problems.md) ·
[`../03-customer-needs.md`](../03-customer-needs.md)

---

## Requirements

| FR | Title | Traces to | Parent issue | Sub-issue | Phase |
|----|-------|-----------|--------------|-----------|-------|
| [FR.01.3.12](FR.01.3.12-canvas-lockfile-version-parity.md) | Canvas release metadata parity (lockfile included) | CN.01.3 → CP.01 | [#146](https://github.com/RafaelGorski/Problem-Based-SRS/issues/146) | [#171](https://github.com/RafaelGorski/Problem-Based-SRS/issues/171) | 0 |
| [FR.04.1.11](FR.04.1.11-closure-verdict-parity.md) | Closure verdict parity between audit and prospective modes | CN.04.1 → CP.04 | [#139](https://github.com/RafaelGorski/Problem-Based-SRS/issues/139) | [#172](https://github.com/RafaelGorski/Problem-Based-SRS/issues/172) | 1 |
| [FR.01.4.7](FR.01.4.7-registry-before-state-capture.md) | Registry before-state capture and re-crawl submission | CN.01.4 → CP.01 | [#140](https://github.com/RafaelGorski/Problem-Based-SRS/issues/140) | [#173](https://github.com/RafaelGorski/Problem-Based-SRS/issues/173) | 1 |
| [FR.04.1.12](FR.04.1.12-closure-gate-mutation-falsification.md) | Falsification of the closure gate under mutation | CN.04.1 → CP.04 | [#145](https://github.com/RafaelGorski/Problem-Based-SRS/issues/145) | [#174](https://github.com/RafaelGorski/Problem-Based-SRS/issues/174) | 2 |
| [FR.01.4.8](FR.01.4.8-recrawl-content-verification.md) | Re-crawl verification by parsed content with a before/after diff | CN.01.4 → CP.01 | [#147](https://github.com/RafaelGorski/Problem-Based-SRS/issues/147) | [#175](https://github.com/RafaelGorski/Problem-Based-SRS/issues/175) | 2 |
| [FR.01.3.13](FR.01.3.13-live-provenance-published-archive.md) | `/live` provenance from the current published canvas archive | CN.01.3 → CP.01 | [#138](https://github.com/RafaelGorski/Problem-Based-SRS/issues/138) | [#176](https://github.com/RafaelGorski/Problem-Based-SRS/issues/176) | 3 |
| [FR.06.1.6](FR.06.1.6-adoption-surface-version-parity.md) | Consistent adoption surface and a predeclared observation contract | CN.06.1 → CP.06 | [#142](https://github.com/RafaelGorski/Problem-Based-SRS/issues/142) | [#177](https://github.com/RafaelGorski/Problem-Based-SRS/issues/177) | 3 |
| [FR.06.1.7](FR.06.1.7-adoption-observation-outcome.md) | Execution of the observation window and filing of the outcome | CN.06.1 → CP.06 | [#148](https://github.com/RafaelGorski/Problem-Based-SRS/issues/148) | [#178](https://github.com/RafaelGorski/Problem-Based-SRS/issues/178) | 4 |
| [FR.04.1.13](FR.04.1.13-batch-ledger-accounting.md) | Complete batch ledger accounting before closure | CN.04.1 → CP.04 | [#149](https://github.com/RafaelGorski/Problem-Based-SRS/issues/149) | [#179](https://github.com/RafaelGorski/Problem-Based-SRS/issues/179) | 5 (final gate) |

**Total:** 9 functional requirements, one per open parent issue. Each is filed as a GitHub
sub-issue linked to its parent through the native sub-issue relationship (issues **#171–#179**,
created 2026-08-15).

---

## Coverage of Customer Needs

| CN | Addressed by | Count |
|----|--------------|-------|
| CN.01.3 | FR.01.3.12, FR.01.3.13 | 2 |
| CN.01.4 | FR.01.4.7, FR.01.4.8 | 2 |
| CN.04.1 | FR.04.1.11, FR.04.1.12, FR.04.1.13 | 3 |
| CN.06.1 | FR.06.1.6, FR.06.1.7 | 2 |
| CN.07.1 *(proposed)* | — | 0 — proposed, carries no requirements |

Every ratified Customer Need is addressed by at least one FR.

---

## Verification split

The two tracks are assigned by what can actually witness the claim, not by preference:

| Track | Used for | Requirements |
|-------|----------|--------------|
| **Playwright + screenshots** (primary) | Claims a browser can witness: rendered graph, documentation pages, third-party listing pages | FR.01.3.13, FR.01.4.7, FR.01.4.8, FR.06.1.6, FR.06.1.7 |
| **CLI** (primary) | Claims about metadata, exit codes, and tooling behaviour | FR.01.3.12, FR.04.1.11, FR.04.1.12, FR.04.1.13 |
| **Playwright explicitly out of scope** | Recorded so a screenshot is never substituted for a transcript | FR.04.1.11, FR.04.1.12 |

---
*Created: 2026-08-15*
