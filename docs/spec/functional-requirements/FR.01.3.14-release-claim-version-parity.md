# FR.01.3.14 — Restate the canvas release claim to the current published version

**Priority:** Must Have
**Status:** Draft
**Owning issue:** #183 (sub of #138), #191 (sub of #162), #193 (sub of #165)

## Statement

An issue's machine-readable `release-claim` marker shall name the same release its
acceptance text asks to be proven, so that the closure gate cannot return a clean verdict
for a release the issue no longer targets.

## Traceability

| Traces To | ID | Description |
|-----------|-----|-------------|
| Customer Need | CN.01.3 | The published artifact must be shown to render, not assumed to |
| Customer Problem | CP.01 | Published surfaces disagree with what the repository ships |
| Parent issue | #138 | The issue whose marker and text disagree |

## Problem

#138's live marker reads `<!-- release-claim train=canvas version=v1.1.1 -->`. The
canvas train has since published v1.1.2, v1.1.3, and v1.1.4 (latest, per
`gh release list`), so the marker names a release two-to-three versions behind the
current one. Because v1.1.1 **is** itself published, a prospective check against it
returns a clean verdict for the wrong artifact — the evidence the issue actually asks
for (proof against the *current* release) has never been produced.

## Required restatement

- [ ] The marker names the current published canvas release, with the previous value
      recorded on the issue so the edit is auditable.
- [ ] `issue-ledger.mjs 138` reports 0 superseded version mentions (9 stale mentions were
      measured on #138 alone, 4 on #162, at the time this was written).
- [ ] `closure-evidence.mjs --prospective 138` returns a verdict against the current
      release, recorded with its exit code.
- [ ] Any recovery commands quoted in the body reference the current tag.
- [ ] No acceptance box is ticked as a side effect of the restatement — restating the
      target is not evidence the target was met.

## Ownership boundary

Restating the marker is an edit to the live issue body. Per #139's contract, the
tooling "reports; it never edits an issue" — this is reserved for the maintainer's
human judgement. This specification exists so the requirement, and the current
measured drift, are recorded in the repository rather than only in ephemeral issue
comments.

## Current verification state

`gh release list` confirms `srs-navigator 1.1.4` is the latest published canvas release
as of this writing. `issue-ledger.mjs` still reports superseded `v1.1.1` mentions on
#138, #162, #176, #183, #191, #193, and #196 pending the live-issue restatement above.

## Plan

See `docs/spec/remediation-plan.md`.
