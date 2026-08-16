# Open-Issue Remediation Plan

**Produced:** 2026-08-16 · **Method:** `/problem-based-srs functional-requirements`
**Scope:** the 17 issues open on `RafaelGorski/Problem-Based-SRS` at the time of writing.

> Every figure in this document was produced by **executing the repository's own tooling**
> on 2026-08-16. Nothing here is inferred from source code or from a previous round's text.
> This file is the target of the `**Plan:**` citation carried by the batch sub-issues.

---

## 1. Live baseline (executed 2026-08-16)

| Instrument | Command | Result |
|---|---|---|
| Acceptance ledger | `node evals/tools/issue-ledger.mjs 138 139 140 142 145 147 148 149 162 164 165 173 174 175 176 178 179` | **exit 1** — 222 boxes, **0 checked**, 213 open-without-blocker, 24 superseded version mentions |
| Closure gate | `node evals/tools/closure-evidence.mjs --prospective 138 139` | **exit 1** — `#139 release-claim-indeterminate: duplicate release-claim markers` |
| Distribution monitor | `node scripts/check-distribution.mjs --strict` | **exit 1** — `registry-listing-drift`, 8 phantom skills |
| Consolidated suite | `pwsh -File run-tests.ps1 -NoOpen` | **exit 0** — 1299/1299 passing (Plugin 1/1, Canvas 307/307, Skill evals 950/950, Canvas e2e 41/41) |
| Published releases | `gh release list` | canvas **v1.1.3** (2026-08-13), plugin **v2.6** (2026-08-05) |
| Advertised versions | `VERSION`, `.claude-plugin/plugin.json` | `1.1.3`, `2.6.0` — both in parity with the published trains |

### The contrast that defines this batch

**A green suite is not a green batch.** The consolidated suite passes 1299/1299 while
**every one of the 222 acceptance boxes across the batch is unchecked**. Suite health and
acceptance evidence are different claims. Conflating them is the failure mode #139 was
written to prevent and the one #149 exists to close out.

---

## 2. Problems found on 2026-08-16

Each finding is newly measured today and is the reason the corresponding sub-issue exists.

### F1 — The batch ledger is entirely unreconciled
222 acceptance boxes across 17 open issues, **0 checked**, **213 open with no named
blocker**. No issue in the batch can be closed on evidence, because there is none.

### F2 — #139 is un-closeable by the very guard it specifies
#139 carries **two** `release-claim` markers:

```
<!-- release-claim train=plugin version=v2.6 -->
<!-- release-claim train=canvas version=v1.1.1 -->
```

Its own contract states that *"a missing, duplicate, malformed, or ambiguous marker is an
indeterminate result and cannot produce a clean closure verdict."* The guard therefore
returns `release-claim-indeterminate` for #139 **forever**, regardless of what ships. The
issue that introduced the closure gate is the one issue the closure gate can never clear.
This is a hard blocker for every release-claiming closure in the batch.

### F3 — #138's machine-readable claim contradicts its own text
#138's title and body were restated to *"Prove /live provenance from the current published
canvas archive"*, but its marker still reads `version=v1.1.1` and its acceptance text
mentions `1.1.1` **nine** times. Canvas has published **v1.1.2 and v1.1.3** since (both
2026-08-13). The gate would therefore clear on a release two versions behind the one the
issue now asks for — a clean verdict for the wrong artifact.

### F4 — The registry drift is unchanged
`check-distribution.mjs --strict` still exits 1 with `registry-listing-drift`: skills.sh
advertises 8 skills the repository does not ship — `business-context`,
`complexity-analysis`, `customer-needs`, `customer-problems`, `functional-requirements`,
`software-glance`, `software-vision`, `zigzag-validator` — all consolidated into the single
`problem-based-srs` skill by #50. No before-state has ever been captured, so no later run
could demonstrate a change rather than assert one.

### F5 — Six sub-issues cite specification files that do not exist
Each sub-issue created on 2026-08-15 carries a `**Specification:**` / `**Plan:**` citation.
`git ls-tree -r --name-only origin/main` returns **no `docs/spec/` path at all**. All seven
cited paths were missing:

| Cited path | Cited by |
|---|---|
| `docs/spec/remediation-plan.md` | #173, #174, #175, #176, #178, #179 |
| `docs/spec/functional-requirements/FR.01.3.13-live-provenance-published-archive.md` | #176 |
| `docs/spec/functional-requirements/FR.01.4.7-registry-before-state-capture.md` | #173 |
| `docs/spec/functional-requirements/FR.01.4.8-recrawl-content-verification.md` | #175 |
| `docs/spec/functional-requirements/FR.04.1.12-closure-gate-mutation-falsification.md` | #174 |
| `docs/spec/functional-requirements/FR.04.1.13-batch-ledger-accounting.md` | #179 |
| `docs/spec/functional-requirements/FR.06.1.7-adoption-observation-outcome.md` | #178 |

A citation that resolves to nothing is indistinguishable from no citation. This document
and its sibling FR files close that gap.

### F6 — 24 superseded version mentions remain across the batch
Concentrated on the canvas-provenance track: #138 (9), #162 (4), #165 (2), #142 (2),
#148 (2), #149 (2), #139 (1), #145 (1), #176 (1).

### F7 — Release-claim accounting is incomplete
Of the 17 open issues, only #138 and #139 carry a marker at all. Six issues
(#140, #142, #145, #147, #148, #149) carry **neither** a marker **nor** the explicit
"not a release claim" record that #149's own acceptance criteria requires. The nine
2026-08-15 sub-issues do carry the prose form (`**Release claim:** none`) and are compliant.

### F8 — Live state moved during verification
#146 was **open** at 13:11 and **closed** (`NOT_PLANNED`, retitled `[superseded]`) by 13:35
on the same day, and the titles of #138, #162 and #176 changed within the same window. Any
plan that treats a start-of-run snapshot as the batch definition is already stale. The
ledger must be re-read immediately before closure, never reused from an earlier capture.

---

## 3. Dependency-ordered sequence

```
Phase 0  ── F5 spec artifacts ──┐        (unblocks every citation)
         ── F2 #139 marker ─────┤        (hard blocker for all closure)
                                │
Phase 1  ── F3 restate to v1.1.3 ──┐     (canvas track)
         ── F4 registry before-state ──┐ (registry track, needs crawl interval)
                                │      │
Phase 2  ── gate falsification ─┘      │ (needs F2)
         ── gate wired into release ───┤ (needs F2)
         ── /live from published bytes ┤ (needs F3)
         ── re-crawl content diff ─────┘ (needs F4 + elapsed interval)
                                │
Phase 3  ── adoption contract + demo    (needs /live proof + clean registry)
         ── observation window          (needs contract, needs elapsed window)
                                │
Phase 4  ── batch ledger accounting     (needs everything; closes last)
```

### Phase 0 — Unblock (start immediately, no predecessors)

| Order | Issue | Work | Why first |
|---|---|---|---|
| 0.1 | #173–#179 (all) | Land `docs/spec/` plan + FR artifacts | Every sub-issue's citation currently dangles (F5) |
| 0.2 | **#139** | Remove the duplicate `release-claim` marker, leaving exactly one | Nothing that claims a release can reach a clean verdict until this clears (F2) |

### Phase 1 — Correct the claims (parallel, after 0.2)

| Order | Issue | Work | Depends on |
|---|---|---|---|
| 1.1 | **#138** | Restate the marker and all acceptance text to the **current** canvas release (`v1.1.3`), clearing 9 stale mentions | 0.2 |
| 1.2 | **#162** | Align the recovery-rehearsal text to `v1.1.3`, clearing 4 stale mentions | 1.1 |
| 1.3 | **#140** | Capture `distribution-before.json` by **parsed content** and submit the re-crawl | — (independent) |
| 1.4 | **#145** | Give #145 an acceptance ledger and an explicit release-claim record | 0.2 |
| 1.5 | #142, #147, #148, #149 | Record each explicitly as *not* a release claim (F7) | — |

### Phase 2 — Prove the mechanisms (after Phase 1)

| Order | Issue | Work | Depends on |
|---|---|---|---|
| 2.1 | **#174** | Falsify the closure gate under mutation; restore byte-identically | 0.2, 1.4 |
| 2.2 | **#164** | Wire the gate into the release procedure so it cannot be skipped | 0.2 |
| 2.3 | **#176** | Capture `/live` provenance from the **published v1.1.3 archive** | 1.1 |
| 2.4 | **#175** | Verify the re-crawl by parsed-content diff, not by exit code | 1.3 + crawl interval |
| 2.5 | **#147** | Attach the third-party before/after evidence pair | 2.4 |

### Phase 3 — External signal (after Phase 2)

| Order | Issue | Work | Depends on |
|---|---|---|---|
| 3.1 | **#165** | Complete + validate the adoption contract; build the archive-derived demo | 2.3, 2.5 |
| 3.2 | **#148** | Record the observation evidence against the completed contract | 3.1 |
| 3.3 | **#178** | Run the declared window from published bytes and file the outcome | 3.2 + elapsed window |
| 3.4 | **#142** | Close out the adoption experiment on the recorded outcome | 3.3 |

### Phase 4 — Close out (last)

| Order | Issue | Work | Depends on |
|---|---|---|---|
| 4.1 | **#179** | Account for every acceptance box; each ticked with a citation or open with a named blocker | all above |
| 4.2 | **#149** | Reconcile the batch and close in dependency order — **#149 closes last** | 4.1 |

---

## 4. Verification model

Two tracks. Each issue names exactly one as its gate; naming the wrong one is itself a
defect, because a screenshot cannot witness issue metadata and a CLI exit code cannot
witness a rendered graph.

### App track — Playwright with screenshots

Applies to anything asserting that **the product renders as advertised**. Both projects
exist in `.github/extensions/srs-navigator/playwright.config.mjs` and were green on
2026-08-16 (41/41).

```bash
cd .github/extensions/srs-navigator
npx playwright test --project=canvas   # graph render, dotted notation, health bar
npx playwright test --project=site     # landing page + install block
```

Captures land in `test-results/`; `live-dotted-notation.png` is the canonical `/live`
evidence artifact.

**For any claim about a *published* release**, a checkout-rendered PNG is not sufficient.
The server must be booted from the **extracted archive**:

```bash
gh release download v1.1.3 -p 'srs-navigator-*' -D /tmp/canvas-archive
node evals/tools/verify-canvas-archive.mjs /tmp/canvas-archive/srs-navigator-1.1.3.zip
node evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator \
  --provenance /tmp/canvas-archive/provenance.json
CANVAS_URL="<url printed above>" npx playwright test --project=canvas
```

A PNG without its `provenance.json` is evidence for an unknown artifact (NFR.07).
The negative control — the tool refusing to serve a `.github/` checkout path — is run once
and its refusal recorded.

### Skills track — CLI

Applies to methodology, issue metadata, release records and third-party surfaces.

```bash
node evals/tools/issue-ledger.mjs <issues> --json ledger.json
node evals/tools/closure-evidence.mjs --prospective <issues> --json closure.json
node scripts/check-distribution.mjs --strict; echo "exit=$?"
pwsh -File run-tests.ps1 -NoOpen
python scripts/build-plugin.py validate
```

**Read findings separately from the exit code.** `check-distribution.mjs` exits 0 with
warnings and notices present; a warning means a comparison **did not run**, and a
comparison that did not run is not a pass.

### Where the browser is explicitly out of scope

Recording the boundary is part of the deliverable, not an omission:

- **#139, #145, #164, #174** — issue and release metadata. No browser view can witness it.
- **#140, #147, #173, #175** — third-party cache state. The local Playwright suite never
  fetches skills.sh; a green local run says nothing about a registry. A manual browser
  screenshot of the listing may be attached as a *human observation*, explicitly not the
  gate. The parsed `observations.registry` values are the gate.

---

## 5. Closure rules for this batch

1. **Re-read the ledger immediately before closing anything.** Live state moved twice
   during a single verification run on 2026-08-16 (F8).
2. **Every box is either ticked with a citation or open with a named blocker.** A box
   left open and silent is the state this batch exists to eliminate.
3. **A green suite closes nothing.** 1299/1299 passed while 0/222 boxes were checked.
4. **Release-claiming issues close only on a clean `closure-evidence.mjs` verdict**, and
   an *indeterminate* verdict is not a clean one.
5. **Close in dependency order** — sub-issues before parents, and **#149 last**.
6. **Do not close a parent merely because a successor sub-issue exists.** Closure requires
   the live measurements to pass, not the presence of tracking issues.

---

*Method: Problem-Based SRS (Gorski & Stadzisz). Traceability: CP → CN → FR.*
