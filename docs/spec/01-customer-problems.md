# Customer Problems — Problem-Based SRS (this repository)

> **Step 1 of 5** — WHY the work exists.
> **Scope:** the maintenance and adoption of *this* repository (the plugin + the SRS Navigator
> canvas app), not the CRM demo in `.spec/crm-system.json`.

## Provenance of this document

These Customer Problems were **not invented here**. They are the taxonomy already in active use
across issues #138–#167, reconstructed into a single artifact on **2026-08-15** so that the
Functional Requirements in `functional-requirements/` have a real parent to trace to rather than
existing as orphans.

Every ID below was recovered from the `## Traceability` tables of the live issues. Where an issue
marked an identifier *(proposed)*, it is carried here with that status intact and is **not**
treated as ratified.

## Notation

```
[Subject] [must | expects | hopes] [Object] [Penalty]
```

Classification follows the methodology: **Obligation** (must), **Expectation** (expects),
**Hope** (hopes).

---

## CP.01 — Published surfaces disagree with what the repository ships

**Classification:** Obligation

**Statement:** The project **must** ensure that every surface a prospective adopter can see —
GitHub Releases, the skills.sh listing, the documentation site — advertises what the repository
actually ships, or adopters install something other than what was described and lose trust before
the first command runs.

**Penalty:** An adopter reaching a stale surface installs a version that does not exist, follows
instructions for skills that were retired, or reads a version badge contradicted by the release
list. The cost is paid entirely at first contact, where there is no relationship to absorb it.

**Why it is not solved by CI:** These surfaces are third-party or generated state. A pull request
cannot fix them and the PR gate cannot observe them, so they drift silently by construction.

### Derived Customer Needs

| CN | Focus |
|----|-------|
| CN.01.3 | The canvas train must publish the version the repository advertises |
| CN.01.4 | The listing must be refreshed **and verified as refreshed**, not assumed |

---

## CP.04 — Shipped work is not reflected in the release record

**Classification:** Obligation

**Statement:** The project **must** ensure that an issue is closed only when the surface it claims
to have changed has actually changed, or the tracker reports completed work that never reached a
user and the gap survives only in artifacts designed to be superseded.

**Penalty:** On 2026-08-04 four issues (#89, #90, #129, #130) were closed while neither release
train had published. The tracker read "done", the surface was unchanged, and with the backlog
otherwise empty the only remaining record was a daily digest that is itself closable. Work is
then lost rather than merely delayed.

**Why it recurs:** Closure is a human judgement made against merged code, while the claim being
made is about a published artifact. Nothing forced those two to agree.

### Derived Customer Needs

| CN | Focus |
|----|-------|
| CN.04.1 | Release records match what shipped |

---

## CP.06 — Every open item is self-generated; there is zero inbound signal

**Classification:** Expectation

**Statement:** The maintainer **expects** that the methodology's central promise — a brownfield
engineer reaching the Navigator "wow moment" quickly — is demonstrated by at least one
externally attributable observation, or the entire backlog remains a closed loop in which the
project's only evidence of value is its own daily self-assessment.

**Penalty:** Prioritisation degenerates. Without a single external signal there is no way to
distinguish work that improves adoption from work that merely looks productive, and effort is
allocated on intuition indefinitely.

### Derived Customer Needs

| CN | Focus |
|----|-------|
| CN.06.1 | A discoverable entry point and one instrumented adoption signal |

---

## CP.07 *(proposed — not ratified)*

**Classification:** Expectation

**Statement:** A prospective adopter **expects** that a plugin requesting tool access has an
attended security surface, or unremediated public findings deter installation regardless of the
plugin's functional quality.

> **Status:** carried from issue #161 with its *(proposed)* marker intact. Ratification is
> deferred; as of 2026-08-15 the GitHub Dependabot, code-scanning, and secret-scanning APIs each
> report **zero open alerts**, so no requirement in this round traces to CP.07.

### Derived Customer Needs

| CN | Focus |
|----|-------|
| CN.07.1 *(proposed)* | The security surface is visibly attended to, not merely green in CI |

---

## Quality Gate

- [x] All CPs use structured notation (`[Subject] [must/expects/hopes] [Object] [Penalty]`)
- [x] Classifications assigned (Obligation / Expectation / Hope)
- [x] No solutions embedded in problem statements
- [x] Proposed identifiers carried with their status intact rather than silently ratified

---
*Created: 2026-08-15*
*Source: reconstructed from the traceability tables of issues #138–#167*
