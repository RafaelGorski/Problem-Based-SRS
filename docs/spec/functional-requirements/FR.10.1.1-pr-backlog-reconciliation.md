## FR.10.1.1: Pull-Request Backlog Reconciliation

## Requirement

**ID:** FR.10.1.1
**Title:** Pull-Request Backlog Reconciliation and Cited Specification Tree on `main`
**Workstream:** W0 — Foundation (nothing else starts until this lands)
**Priority:** Must Have
**Status:** Draft

### Statement

The repository shall resolve every open pull request to merged, closed-with-reason, or
deferred-with-named-blocker, and shall place the cited specification tree on `main` exactly
once, before any dependent workstream begins.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.10.1 | A reconciled pull-request backlog |
| Customer Problem | CP.10 | Six open PRs contend for the same files; the cited spec tree is on none that merged |

## Issues addressed

**Parent:** #209 · **Also resolves:** #181 (empty draft), and unblocks the `**Plan:**` and
`**Specification:**` citations carried by 17 issues in the batch.

## Spec location — resolved, not assumed

`.gitignore:66` ignores `.spec/*`, with a single exception at line 71 for
`!.spec/crm-system.json`. So in **this** repository `.spec/` is a scratch area for users
trying the methodology on their own project; anything written there by the repository's own
self-application is untracked and invisible to every other reader.

```console
$ git check-ignore -v .spec/open-issue-resolution-plan.md
.gitignore:66:.spec/*	.spec/open-issue-resolution-plan.md
```

That settles a question 17 issues assume without stating: **`docs/spec/` is the tracked
location** for this repository's own artifacts, which is why #199 and #215 both write there.
These artifacts are therefore committed under `docs/spec/`, matching the layout those PRs
use (`functional-requirements/`, dotted IDs, `_index.md`).

**Residual hazard for this workstream to decide:** #199/#215 number their requirements from
a *different* CP/CN decomposition (`FR.01.3.13`, `FR.04.1.12`). Landing either alongside this
tree puts two numbering schemes in one directory. Either reconcile the decompositions or
state which supersedes — do not merge and leave both.

## Contention to resolve

| Pair | Files in common | Required decision |
|---|---|---|
| #199 ↔ #215 | the same `docs/spec/**` FR files | Land **one**. #215 is newer and also carries site copy; #199 is spec-only. |
| #276 ↔ #277 | `create-release.yml`, `release-canvas.yml`, `thursday-release-report.yml`, `thursday-release.yml`, `package-lock.json` | Land **one** injection fix. #277 is a draft and broader; #276 is focused and non-draft. |
| #206 ↔ #215 | `.agents/skills/impeccable/scripts/live-copy-edit-agent.mjs` | #206 is the narrower security fix; sequence it first or fold it in. |
| #181 | none (0 files) | Close as superseded — it has no content. |

## Acceptance Criteria

- [ ] `git ls-tree -r --name-only origin/main -- docs/spec` returns a non-empty tree
- [ ] Exactly one of #199 / #215 is merged; the other is closed with a stated reason
- [ ] Exactly one of #276 / #277 is merged; the other is closed or rebased to non-overlapping scope
- [ ] #181 is closed as superseded, citing that it changes zero files
- [ ] #206 is merged, closed, or deferred with a named blocker
- [ ] No two open PRs modify the same file with differing content
- [ ] Every `docs/spec/**` path cited by an open issue resolves from `main`
- [ ] Exactly **one** requirement-numbering scheme exists under `docs/spec/functional-requirements/` after the merge
- [ ] #193, #196 and #197 are each reopened or explicitly superseded with a stated reason
- [ ] No box above is ticked without a command output or commit SHA cited beside it

## Verification

### Skills track — CLI *(this requirement's gate)*

```bash
git fetch origin
git ls-tree -r --name-only origin/main -- docs/spec        # must be non-empty
gh pr list --repo RafaelGorski/Problem-Based-SRS --state open \
   --json number,files --jq '[.[] | {n:.number, f:[.files[].path]}]'
python scripts/build-plugin.py validate
```

**Pass condition:** the spec tree is on `main`; the PR file-path sets are pairwise disjoint;
`build-plugin.py validate` exits 0.

### App track — Playwright

**Out of scope, deliberately.** Every criterion here concerns repository and pull-request
metadata. No browser view can witness whether a path exists on `main`; a screenshot would be
evidence for the wrong claim. The App track begins at FR.03.1.1.

## Implementation Notes

<!-- Engineers add notes here during implementation -->

---
*Created: 2026-09-23*
