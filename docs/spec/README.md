# Problem-Based SRS artifacts for this repository

This folder holds the methodology's own artifacts **applied to this repository**, produced by
`/problem-based-srs functional-requirements` on **2026-08-15**.

## Why here and not in `.spec/`

The methodology writes artifacts to `.spec/` by default, and that remains correct for projects
*using* this plugin. In this repository `.spec/*` is deliberately gitignored — see the rationale
at `.gitignore` line 65, *"Problem-Based SRS output artifacts (generated per-project, not
versioned)"* — with a single negation keeping the SRS Navigator demo (`.spec/crm-system.json`)
under version control.

These artifacts are neither per-project output nor demo data: they are durable planning documents
for this repository, referenced by name from open GitHub issues, so they have to resolve for a
reader who clones the repo. They therefore live in `docs/`, alongside the other process documents
(`docs/adoption-experiment.md`, `docs/release-verification.md`), per the repository instruction
that skill-generated helper files belong in `docs/`.

## Contents

| File | Purpose |
|------|---------|
| [`remediation-plan.md`](remediation-plan.md) | **Start here.** The sequenced, dependency-ordered plan for the nine open parent issues, with the dependency graph and a re-measurable baseline. |
| [`01-customer-problems.md`](01-customer-problems.md) | Customer Problems (WHY), reconstructed from the traceability tables already in use across the open issues. |
| [`03-customer-needs.md`](03-customer-needs.md) | Customer Needs (WHAT) derived from those problems. |
| [`functional-requirements/`](functional-requirements/_index.md) | Nine Functional Requirements (HOW) — one per open parent issue, each with acceptance criteria and both verification tracks. |
| [`non-functional-requirements/`](non-functional-requirements/_index.md) | NFR.08, the determinism constraint the closure gate has to satisfy. |
| [`traceability-matrix.md`](traceability-matrix.md) | Full CP → CN → FR chain and ZigZag validation in both directions. |

Steps 2 (Software Glance) and 4 (Software Vision) are deliberately absent: the system already
exists, so its architecture is the repository itself rather than something this pass needed to
propose. The traceability matrix records that exclusion explicitly.

## Status

These are **specifications, not claims of completion**. Every figure in them was produced by
executing the repository's own tooling on 2026-08-15; re-measure before relying on any of it, and
read the caveat in `remediation-plan.md` about the lockfile row, which can read green in a working
copy while the committed tree is still wrong.
