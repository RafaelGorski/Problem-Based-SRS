# Non-Functional Requirements — Index

> Open-issue resolution for `RafaelGorski/Problem-Based-SRS`, measured **2026-09-23**.
> **4 NFRs.** Each carries a quantified target and a current measured value.

| NFR | Title | Category | Target | Current measured | Applies to |
|---|---|---|---|---|---|
| [NFR.01](NFR.01-verification-determinism.md) | Verification determinism | Reliability | identical counts across consecutive runs; ≤ 180 s | **not deterministic** — run 1 repairs the lockfile that run 2 then passes; 113.1 s | FR.01.1.1, FR.02.1.1 |
| [NFR.02](NFR.02-site-accessibility.md) | Site accessibility | Usability | ≥ 4.5:1 contrast | **2.39:1** on the focused skip link | FR.03.2.1, FR.03.1.1 |
| [NFR.03](NFR.03-workflow-supply-chain.md) | Workflow supply-chain integrity | Security | 0 interpolations in `run:`; 0 open alerts | **4 workflows** interpolate `${{ github.ref_name }}`; 0 open alerts | FR.09.1.1 |
| [NFR.04](NFR.04-time-to-first-graph.md) | Time to first rendered graph | Usability | median < 5 min, one pass | **not measurable** — the documented path does not execute | FR.07.1.1, FR.07.2.1 |

## Note on NFR.01

The determinism failure is the subtlest defect in this set and the one most likely to be
dismissed. The suite is not merely non-deterministic — it is non-deterministic **in the
direction that hides a defect**. Run 1 fails two lockfile tests and silently repairs the
lockfile; run 2 passes them. A maintainer who runs the suite twice sees green and concludes
the tree is healthy. Both the repair and the conclusion are wrong.

---
*Created: 2026-09-23*
