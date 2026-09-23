# Customer Needs — Open-Issue Resolution

> **Step 3 of the Problem-Based SRS methodology.**
> Each CN states **WHAT outcome** is required, not how to build it.
> Every CN traces to exactly one Customer Problem in `01-customer-problems.md`.

## Traceability summary

| CN | Traces to | Outcome required |
|---|---|---|
| CN.01.1 | CP.01 | A clean checkout of `main` produces a green default suite |
| CN.01.2 | CP.01 | Release and version facts have exactly one authoritative source |
| CN.02.1 | CP.02 | Verification does not modify tracked state |
| CN.03.1 | CP.03 | Every public surface states the same current facts |
| CN.03.2 | CP.03 | Keyboard navigation meets WCAG AA |
| CN.04.1 | CP.04 | Every root issue carries exactly one parseable release claim |
| CN.04.2 | CP.04 | The closure gate is proven to reject each invalid class |
| CN.04.3 | CP.04 | Batch closure happens only on re-derived live evidence |
| CN.05.1 | CP.05 | Registry refresh is verified by parsed content, not exit code |
| CN.06.1 | CP.06 | `/live` evidence derives from a downloaded published asset |
| CN.07.1 | CP.07 | One recipe takes a clean machine to a rendered graph |
| CN.07.2 | CP.07 | Adoption is measured against a pre-registered contract |
| CN.08.1 | CP.08 | The scheduled behavior proof executes non-skipped scenarios |
| CN.09.1 | CP.09 | Workflows are immune to ref-name injection |
| CN.10.1 | CP.10 | The PR backlog resolves to one landing path with no contention |

---

## CN.01.1 — Green baseline from a clean checkout

**Traces to:** CP.01 — the default suite fails on `main`

The maintainer needs `main` to pass its own default suite from a fresh clone, so that
"the suite passes" becomes a satisfiable acceptance criterion rather than a statement no
issue in the batch can ever meet.

**Success looks like:** `pwsh -File run-tests.ps1 -NoOpen` exits 0 from a directory that
has never been built before, and the exact counts are recorded.

---

## CN.01.2 — One authoritative source for version facts

**Traces to:** CP.01 — nine of eleven failures are version parity

The maintainer needs every version-bearing artefact to derive its number from a single
declared source, so a release bump cannot leave nine tests red and four surfaces stale.

**Success looks like:** bumping the manifest and re-running the suite produces either a
green run or a failure that names precisely the surface that was not updated.

---

## CN.02.1 — Verification that leaves the tree untouched

**Traces to:** CP.02 — the suite rewrites three tracked files

The contributor needs to run the full verification and still be able to read
`git status` as a statement about their own work.

**Success looks like:** `git status --porcelain` is empty after a full run, and any
generated artefact is either untracked, gitignored, or regenerated deterministically to a
byte-identical result.

---

## CN.03.1 — Public surfaces that agree with each other and the manifest

**Traces to:** CP.03 — 2.6.0 vs 2.7, ten skills vs one, 28 nodes vs 29

The prospective adopter needs every public claim — version, skill count, node count,
release link — to agree with the authoritative source and with every other surface.

**Success looks like:** a reader can pick any two surfaces at random and find no
contradiction, and a test fails when that stops being true.

---

## CN.03.2 — Readable keyboard navigation

**Traces to:** CP.03 — the skip link measures 2.39:1 against a 4.5:1 requirement

The keyboard user needs the skip link to be legible when focused.

**Success looks like:** the measured contrast ratio is at least 4.5:1 and a regression
would fail a test rather than a manual audit.

---

## CN.04.1 — Decidable release claims

**Traces to:** CP.04 — `#139 release-claim-indeterminate`

The release manager needs every root issue to carry exactly one machine-parseable release
claim, so the closure gate returns a determinate verdict instead of an error.

**Success looks like:** the gate returns pass or fail — never *indeterminate* — for every
issue in the batch.

---

## CN.04.2 — A closure gate proven to fail for the right reason

**Traces to:** CP.04 — a gate that has never failed guards nothing

The reviewer needs each invalid-evidence class to be demonstrated failing against a
committed fixture, so a passing gate is evidence rather than an absence of testing.

**Success looks like:** a mutation matrix where every row names a fixture, a command, and
the specific failure class it provokes.

---

## CN.04.3 — Closure on re-derived live evidence

**Traces to:** CP.04 — 323 boxes, 0 ticked, work closed in 8-second bursts

The maintainer needs batch membership and evidence re-derived at the moment of closure,
not read from a list written a month earlier.

**Success looks like:** the closing comment cites commands run that day, and no box is
ticked without an output or SHA beside it.

---

## CN.05.1 — Registry verification by parsed content

**Traces to:** CP.05 — eight phantom skills on a cached third-party index

The maintainer needs the skills.sh refresh verified by comparing parsed before and after
content, because the listing is not in this repository and a clean exit code proves only
that the checker ran.

**Success looks like:** a stored before-state, a recorded re-crawl request, and an
after-state diff showing the entry names **and** the rendered skill content changed.

---

## CN.06.1 — `/live` proven from the published archive

**Traces to:** CP.06 — provenance demonstrated from the working tree

The prospective adopter needs the `/live` demonstration to come from the asset they would
actually download, so the evidence is about the shipped bytes.

**Success looks like:** the rendering evidence is produced from a release asset fetched by
URL into a directory containing no checkout.

---

## CN.07.1 — One executable first run

**Traces to:** CP.07 — two surfaces disagree on what must be installed

The new user needs a single recipe that takes them from nothing to a rendered graph,
including both installs, the first command, and an explicit success check.

**Success looks like:** the recipe executes on a clean profile in one pass, the elapsed
time is recorded, and a content test fails if the two surfaces drift apart again.

---

## CN.07.2 — Adoption measured against a pre-registered contract

**Traces to:** CP.07 — prior adoption work closed with no evidence

The maintainer needs the adoption threshold, observation window and outcome rule frozen
**before** observation, so the result cannot be rationalised afterwards.

**Success looks like:** a committed contract with a timestamp preceding the window, and a
participant-originated outcome recorded against it — maintainer replay does not count.

---

## CN.08.1 — A behavior proof that actually executes

**Traces to:** CP.08 — six consecutive runs executed zero scenarios

The evaluator needs the anti-drift claim exercised on a schedule, with a published count
of scenarios actually executed.

**Success looks like:** a scheduled run reports a non-zero executed-scenario count, and a
skipped run is reported as unproven rather than as success.

---

## CN.09.1 — Workflows immune to ref-name injection

**Traces to:** CP.09 — `${{ github.ref_name }}` expanded inside `run:`

The maintainer needs untrusted ref names passed to shells as data, never as source text,
in every workflow that holds write permissions.

**Success looks like:** no workflow expands a GitHub expression carrying attacker-influenced
text directly into a `run:` block, and a test fails if one reappears.

---

## CN.10.1 — A reconciled pull-request backlog

**Traces to:** CP.10 — two PRs add the same files; two edit the same workflows

The maintainer needs each open PR merged, closed with a reason, or explicitly deferred with
a named blocker, and the cited specification tree present on `main` exactly once.

**Success looks like:** no two open PRs modify the same file with different content, and
every `docs/spec/**` citation in the batch resolves from `main`.

---

*Created: 2026-09-23*
*Produced by `/problem-based-srs functional-requirements` — Step 3.*
