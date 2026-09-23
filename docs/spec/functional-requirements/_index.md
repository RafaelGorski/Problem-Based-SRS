# Functional Requirements — Index

> Open-issue resolution for `RafaelGorski/Problem-Based-SRS`, measured **2026-09-23** at HEAD `c5735ed`.
> **15 FRs across 11 workstreams.** Every FR traces to a Customer Need in `../03-customer-needs.md`.

## Traceability matrix

| FR | Title | Traces to CN | Traces to CP | Workstream | Parent issues |
|---|---|---|---|---|---|
| [FR.10.1.1](FR.10.1.1-pr-backlog-reconciliation.md) | PR backlog reconciliation | CN.10.1 | CP.10 | **W0** | #209 |
| [FR.01.1.1](FR.01.1.1-green-baseline-clean-checkout.md) | Green baseline from clean checkout | CN.01.1 | CP.01 | **W1** | #209, #218 |
| [FR.01.2.1](FR.01.2.1-single-version-source.md) | Single authoritative version source | CN.01.2 | CP.01, CP.03 | **W1** | #218 |
| [FR.02.1.1](FR.02.1.1-no-tracked-state-mutation.md) | No tracked-state mutation | CN.02.1 | CP.02 | **W1** | #218 |
| [FR.03.1.1](FR.03.1.1-public-surface-fact-parity.md) | Public surface fact parity | CN.03.1 | CP.03 | **W1** | #218 |
| [FR.03.2.1](FR.03.2.1-skip-link-contrast.md) | Readable keyboard skip link | CN.03.2 | CP.03 | **W1** | #218 |
| [FR.09.1.1](FR.09.1.1-workflow-injection-hardening.md) | Workflow injection hardening | CN.09.1 | CP.09 | **W2** | #275 |
| [FR.04.1.1](FR.04.1.1-decidable-release-claim-markers.md) | Decidable release-claim markers | CN.04.1 | CP.04 | **W3** | #139, #211, #217 |
| [FR.04.2.1](FR.04.2.1-falsified-closure-gate.md) | Falsified closure gate | CN.04.2 | CP.04 | **W3** | #145, #221 |
| [FR.05.1.1](FR.05.1.1-registry-parsed-content-verification.md) | Registry parsed-content verification | CN.05.1 | CP.05 | **W4** | #140, #147, #212, #220, #222 |
| [FR.06.1.1](FR.06.1.1-live-provenance-published-archive.md) | `/live` provenance from archive | CN.06.1 | CP.06 | **W5** | #138, #210, #219 |
| [FR.08.1.1](FR.08.1.1-scheduled-behavior-proof.md) | Scheduled anti-drift behavior proof | CN.08.1 | CP.08 | **W6** | #227, #274 |
| [FR.07.1.1](FR.07.1.1-executable-first-run.md) | Executable install-to-graph first run | CN.07.1 | CP.07 | **W7** | #223, #219 |
| [FR.07.2.1](FR.07.2.1-adoption-contract-and-outcome.md) | Adoption contract and outcome | CN.07.2 | CP.07 | **W8** | #142, #148, #213, #224 |
| [FR.03.1.2](FR.03.1.2-announcement-parity-gate.md) | Announcement parity gate | CN.03.1 | CP.03 | **W9** | #207, #225 |
| [FR.04.3.1](FR.04.3.1-batch-closure-green-ledger.md) | Batch closure on a green ledger | CN.04.3 | CP.04 | **W10** | #149, #214, #226 |

## Created sub-issues

Eleven sub-issues were opened on **2026-09-23**, one per workstream, each carrying its FRs'
acceptance criteria and verification contract. Each is linked to its parent through GitHub's
**native sub-issue API** — not the `[sub of #N]` title convention the existing 93 rely on —
so the relationship is traversable by `gh api .../sub_issues`.

| Workstream | Sub-issue | Parent | Carries |
|---|---|---|---|
| **W0** | [#278](https://github.com/RafaelGorski/Problem-Based-SRS/issues/278) | #209 | FR.10.1.1 |
| **W1** | [#279](https://github.com/RafaelGorski/Problem-Based-SRS/issues/279) | #218 | FR.01.1.1, FR.01.2.1, FR.02.1.1, FR.03.1.1, FR.03.2.1 |
| **W2** | [#280](https://github.com/RafaelGorski/Problem-Based-SRS/issues/280) | #275 | FR.09.1.1 |
| **W3** | [#281](https://github.com/RafaelGorski/Problem-Based-SRS/issues/281) | #139 | FR.04.1.1, FR.04.2.1 |
| **W4** | [#282](https://github.com/RafaelGorski/Problem-Based-SRS/issues/282) | #140 | FR.05.1.1 |
| **W5** | [#283](https://github.com/RafaelGorski/Problem-Based-SRS/issues/283) | #138 | FR.06.1.1 |
| **W6** | [#284](https://github.com/RafaelGorski/Problem-Based-SRS/issues/284) | #227 | FR.08.1.1 |
| **W7** | [#285](https://github.com/RafaelGorski/Problem-Based-SRS/issues/285) | #223 | FR.07.1.1 |
| **W8** | [#286](https://github.com/RafaelGorski/Problem-Based-SRS/issues/286) | #142 | FR.07.2.1 |
| **W9** | [#287](https://github.com/RafaelGorski/Problem-Based-SRS/issues/287) | #207 | FR.03.1.2 |
| **W10** | [#288](https://github.com/RafaelGorski/Problem-Based-SRS/issues/288) | #149 | FR.04.3.1 |

## Coverage check

Every CN in `../03-customer-needs.md` is addressed by at least one FR:

| CN | Addressed by |
|---|---|
| CN.01.1 | FR.01.1.1 |
| CN.01.2 | FR.01.2.1 |
| CN.02.1 | FR.02.1.1 |
| CN.03.1 | FR.03.1.1, FR.03.1.2 |
| CN.03.2 | FR.03.2.1 |
| CN.04.1 | FR.04.1.1 |
| CN.04.2 | FR.04.2.1 |
| CN.04.3 | FR.04.3.1 |
| CN.05.1 | FR.05.1.1 |
| CN.06.1 | FR.06.1.1 |
| CN.07.1 | FR.07.1.1 |
| CN.07.2 | FR.07.2.1 |
| CN.08.1 | FR.08.1.1 |
| CN.09.1 | FR.09.1.1 |
| CN.10.1 | FR.10.1.1 |

**15 of 15 CNs covered. No orphaned CN. No FR without a CN.**

## Verification split

| Track | FRs | Why |
|---|---|---|
| **CLI only** | FR.10.1.1, FR.09.1.1, FR.04.1.1, FR.04.2.1 | The subject is repository metadata, workflow source, or a CLI exit code. A screenshot would be evidence for the wrong claim. |
| **CLI + Playwright** | FR.01.1.1, FR.01.2.1, FR.02.1.1, FR.05.1.1, FR.08.1.1, FR.07.2.1, FR.03.1.2, FR.04.3.1 | A rendered surface carries part of the claim. |
| **Playwright primary** | FR.03.1.1, FR.03.2.1, FR.06.1.1, FR.07.1.1 | The requirement is about what a user actually sees. |

---
*Created: 2026-09-23 · Produced by `/problem-based-srs functional-requirements`*
