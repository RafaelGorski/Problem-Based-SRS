# Customer Needs — Problem-Based SRS (this repository)

> **Step 3 of 5** — WHAT outcomes the software must provide.
> **Traces to:** [`01-customer-problems.md`](01-customer-problems.md)

## Provenance of this document

As with the Customer Problems, these needs are **reconstructed** on 2026-08-15 from the
`## Traceability` tables already in use across issues #138–#167. No new need is introduced here;
the descriptions are the ones the issues themselves cite.

## Notation

```
[Subject] needs [system] to [Verb] [Object] [Condition]
```

**Outcome classes:** Information / Control / Construction / Entertainment.

---

## CN.01.3 — The canvas train must publish the version the repository advertises

**Traces to:** CP.01
**Outcome class:** Control

**Statement:** The maintainer needs the release system to **publish** the canvas version named by
`VERSION` and the extension `package.json` **whenever the repository advertises it**, so no
adopter can read a version number that has no downloadable artifact behind it.

**Satisfied when:** the advertised version, the published tag, the release assets, and the
metadata *inside* those assets all name the same version — and that agreement is machine-checked
rather than asserted.

---

## CN.01.4 — The listing must be refreshed **and verified as refreshed**, not assumed

**Traces to:** CP.01
**Outcome class:** Information

**Statement:** The maintainer needs the distribution monitor to **report** what third-party
listings actually publish — by parsed content, not merely by entry names — **on a schedule that
does not depend on anyone remembering**, so a re-submission that silently fails to take effect is
distinguishable from one that worked.

**Satisfied when:** a re-crawl produces a recorded before/after diff of parsed page content, and
axes that the surface makes unverifiable are reported as explicitly unverified rather than as
passes.

---

## CN.04.1 — Release records match what shipped

**Traces to:** CP.04
**Outcome class:** Control

**Statement:** The maintainer needs the closure tooling to **refuse** a clean verdict for any
issue whose release claim is unpublished, malformed, duplicated, or absent, **at the moment of
closure**, so "closed" cannot mean anything other than "the claimed surface changed".

**Satisfied when:** no path through the tooling — including an issue with an empty acceptance
ledger — can yield a clean verdict that is not backed by a published release.

---

## CN.06.1 — A discoverable entry point and one instrumented adoption signal

**Traces to:** CP.06
**Outcome class:** Information

**Statement:** The maintainer needs the project to **produce** one externally attributable
observation of a real engineer reaching the Navigator through the documented entry point,
**under a contract declared before the observation begins**, so the result cannot be
reinterpreted after the fact.

**Satisfied when:** channel, window, activation event, and follow-up question were all
predeclared, and the outcome is filed whether it is positive or negative.

---

## CN.07.1 *(proposed — not ratified)*

**Traces to:** CP.07 *(proposed)*
**Outcome class:** Information

**Statement:** A prospective adopter needs the project to **show** that its security surface is
attended to rather than merely green in CI.

> **Status:** proposed. No requirement in this round traces to CN.07.1.

---

## Quality Gate (per methodology)

- [x] Every ratified CP has at least one CN (CP.01 → CN.01.3, CN.01.4; CP.04 → CN.04.1; CP.06 → CN.06.1)
- [x] All CNs use structured notation
- [x] Outcome classes assigned
- [x] Proposed needs marked and excluded from the requirement set

**ZigZag check (CP → CN):** no ratified CP is unaddressed; no CN is orphaned. `CP.07`/`CN.07.1`
remain a matched proposed pair carrying no requirements.

---
*Created: 2026-08-15*
*Source: reconstructed from the traceability tables of issues #138–#167*
