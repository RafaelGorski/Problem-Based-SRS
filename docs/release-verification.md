# Release verification runbook

How a release is rehearsed before it is cut, and how the **artefact a user receives** is
verified after it is published.

This file is the durable home for that procedure. The reviews on #104 and #108 both flagged
that the sequenced plan lived in `.spec/release-readiness/execution-plan.md`, which is
gitignored — so the instructions a future maintainer needs were unavailable to them. The
process lives here; `.github/copilot-instructions.md` keeps the *policy* (which train owns
which tag, what the distribution monitor reports) and links back to this file for the steps.

- [Distribution artefact families](#distribution-artefact-families)
- [Thursday release cadence](#thursday-release-cadence)
- [Plugin train — cutting `vX.Y`](#plugin-train--cutting-vxy)
- [Canvas train — cutting `vX.Y.Z`](#canvas-train--cutting-vxyz)
- [Proving `/live` in the app itself](#proving-live-in-the-app-itself)
- [Deriving an evidence pack](#deriving-an-evidence-pack)

---

## Distribution artefact families

The README documents **six** install methods. They deliver **three** distinct byte streams,
and it is the byte streams that need proving — two methods that copy the same tree in a
different order do not need two proofs. Calling them "three install routes" was wrong twice
over: it undercounted the methods and overstated what three transcripts cover.

| Family | Artefact | README methods it covers | Verified by |
|---|---|---|---|
| **Repository clone** | the repository tree at a ref | AI-assisted · Claude Code plugin · AgentSkills CLI · Manual | `evals/tests/skills-install.test.mjs`, `evals/tests/claude-plugin-install.test.mjs`, a clean-directory `npx skills add` transcript |
| **Plugin release archive** | `problem-based-srs-v<version>.zip` | Plugin release archive | `evals/tests/plugin-archive-install.test.mjs` (what the packager stages) + `evals/tools/verify-plugin-archive.mjs` (what the release serves) |
| **Canvas release archive** | `srs-navigator-<version>.zip` / `.tar.gz` | SRS Navigator canvas app | `evals/tests/from-archive-install.test.mjs` + `evals/tools/open-archive-canvas.mjs` |

The equivalence claim inside the first family — that four methods deliver one artefact — is
asserted against the README by `evals/tests/distribution-artifacts.test.mjs`, so a seventh
install method cannot be added without either mapping it to a family or failing the suite.

---

## Thursday release cadence

The normal release rhythm is now:

- **12:00 BRT / 15:00 UTC** — `thursday-release-report.yml` creates or refreshes a weekly
  report issue with the commits and files waiting for both release trains.
- **16:00 BRT / 19:00 UTC** — `thursday-release.yml` dispatches the releases for the trains
  that are ready.

The report is informational, not a gate. If no approval arrives before 16:00 BRT, the
scheduled dispatch still runs.

The two trains differ on what "ready" means:

- **Plugin train:** ready only when `plugin.json` and `CHANGELOG.md` already advertise an
  unpublished plugin version. The Thursday report calls this out explicitly when the version
  is not yet prepared.
- **Canvas train:** ready whenever unreleased commits exist. The dispatch workflow triggers
  `release-canvas.yml`, which bumps the patch version itself.

This keeps the manual release paths available for exceptions and recovery, while making
Thursday the default accumulation point for normal releases. The plugin workflow itself is
dispatch-only now, so it no longer auto-runs from a tag push outside this cadence.

---

## Plugin train — cutting `vX.Y`

### Pre-flight, before the release is dispatched

The standard cut is a workflow dispatch on `main`, not a tag push. Everything that can be
checked from a clean `main` is checked first.

```bash
git checkout main && git pull --tags
git rev-parse HEAD                                   # record this SHA in the release issue

python scripts/build-plugin.py build --version X.Y   # validates + packages + prints notes
node --test evals/tests/*.test.mjs
python scripts/build-plugin.py validate
( cd .github/extensions/srs-navigator && npm test )
```

`build-plugin.py` normalizes the version, so a manifest reading `2.6.0` publishes at
**`v2.6`** — and GitHub serves `/releases/tag/<tag>` by exact name. Dispatch the workflow
with the normalized version, not the manifest string with its trailing `.0`.

### The cut, and watching the right run

```bash
gh workflow run create-release.yml --ref main -f version=X.Y
```

`gh run list --workflow 'Create Release' --limit 1` races: any concurrent run can be the one
it returns, and the evidence then records a green run that is not the release run. Pin it to
the event, the branch and the commit that was recorded above:

```bash
RUN=$(gh run list --workflow 'Create Release' \
        --event workflow_dispatch --branch main --commit "$SHA" \
        --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" --exit-status
gh run view "$RUN" --json headSha,event,headBranch    # assert it is the run you meant
```

### Post-publication — verify the artefact, not the repository

`npx skills add` clones the repository; it never opens the release asset. Download what the
release serves and load it:

```bash
gh release download vX.Y -p 'problem-based-srs-*.zip' -D /tmp/pbsrs-asset
cd /tmp/pbsrs-asset && unzip -q problem-based-srs-vX.Y.zip -d extracted
shasum -a 256 problem-based-srs-vX.Y.zip              # record; compare with the asset digest

node <repo>/evals/tools/verify-plugin-archive.mjs extracted --json evidence.json
curl -s -o /dev/null -w '%{http_code}\n' \
  https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/vX.Y   # 200
node <repo>/scripts/check-distribution.mjs
```

`verify-plugin-archive.mjs` **loads** the plugin rather than listing the zip: it resolves the
manifest, resolves every skill, requires every dispatched action to land on a file present in
the extracted tree, and resolves every relative markdown link against that tree. That last
check replaces `grep -rn 'agents/skills/'`, which tested one known defect rather than link
closure — the shipped defect it was written for was two links escaping the archive root, and
a grep for the symptom would not have found the next one.

Counts in its output are **recorded, not gated**. The gates are closure properties, so a
tenth action does not turn a correct archive red.

### If the run fails after the workflow created the tag

Do not re-push — git sends nothing for a ref that is up to date, and `create-release.yml` is
dispatch-only anyway. Re-publish by dispatch, **pinned to the tag**:

```bash
gh workflow run create-release.yml --ref vX.Y -f version=X.Y
```

`--ref` is not optional. `actions/checkout@v4` in that workflow takes the dispatched ref, and
`gh workflow run` defaults to the repository's default branch — so without it the recovery
packages whatever `main` holds *now* and attaches those bytes to a tag that names a different
commit. `gh release create` attaches to the tag that already exists.

---

## Canvas train — cutting `vX.Y.Z`

The canvas train is dispatch-only and creates its tag as part of publishing, so a failed
publish cannot strand a tag:

```bash
gh workflow run release-canvas.yml
```

Do not hand-bump `VERSION`: `bump-version.mjs` *increments* from what it finds, so a
hand-bumped number is never published. Recovery is the mirror image of the plugin train —
delete the tag **first**, because `bump-version.mjs` skips any version whose tag exists and
would otherwise walk past the stranded version forever:

```bash
git push --delete origin vX.Y.Z
gh workflow run release-canvas.yml
```

### Verifying the published canvas archive

```bash
gh release download vX.Y.Z -p 'srs-navigator-*.zip' -D /tmp/canvas-archive
cd /tmp/canvas-archive && shasum -a 256 srs-navigator-X.Y.Z.zip     # record
unzip -q srs-navigator-X.Y.Z.zip -d /tmp/ext                        # gives /tmp/ext/srs-navigator

node <repo>/evals/tools/open-archive-canvas.mjs /tmp/ext/srs-navigator \
  --provenance /tmp/canvas-archive/provenance.json
```

The tool refuses to boot anything under a `.github/` path, because that is the exact
condition `extension.mjs` uses to treat itself as an in-repo install — a capture taken there
would show the checkout while being filed as archive evidence. `--provenance` records the
extracted path, the archive version and the SHA-256 of `extension.mjs`, so a screenshot can
be tied to the bytes that produced it.

---

## Proving `/live` in the app itself

The loopback harness proves the **published archive's runtime**. It does not prove the
Copilot app's **extension loader** accepts the archive: the host's discovery of
`~/.copilot/extensions/`, its manifest and permission handling, and the panel a user sees are
all outside it. #69's box names the app, so the app is where that box is answered.

Two conditions make the manual run meaningful, and both were missed by "the extensions
directory is empty":

1. **Workspace isolation.** An empty `~/.copilot/extensions/` is not a clean loader test on
   its own — this repository's own workspace contributes `.github/extensions/srs-navigator`
   as a *project* extension, which loads alongside the user-scope one and registers the same
   canvas id and tool name twice. Run from a neutral workspace (any directory that is not
   this repository), or explicitly disable every project copy first.
2. **Command source.** `/live` and the panel come from **different installs**, and an
   evidence pack should name both:

   | What | Comes from | Evidence |
   |---|---|---|
   | the `/live` command | the skills install (plugin archive or `npx skills add`) | `skills/problem-based-srs/reference/live.md` |
   | the canvas panel | the canvas archive install | `extension.mjs` registers the `srs-navigator` canvas |

   The canvas archive registers the `srs-navigator` canvas and the `problem_based_srs` tool,
   and that tool's action enum does **not** include `live`. Installing only the canvas
   archive and typing `/live` therefore tests a command the archive never shipped.

Procedure:

```bash
ls ~/.copilot/extensions/                      # must not already contain srs-navigator
unzip -q srs-navigator-X.Y.Z.zip -d ~/.copilot/extensions/
cd /some/neutral/workspace                     # NOT this repository
```

Then, in the Copilot app: reload extensions → confirm `srs-navigator` is listed as **loaded**
(not `failed`) → run `/live` → capture the panel, and record the extension log path from the
extension inspector.

If the host refuses to load it, record the refusal verbatim. A failed load is a result; the
loopback capture answers a different question and cannot be substituted for it.

---

## Deriving an evidence pack

Every number in a pack is either **derived** or **recorded**, and the two are labelled:

| Claim | How it is established |
|---|---|
| every action resolves | `verify-plugin-archive.mjs` — dispatch closure over the extracted tree, both directions |
| no link escapes the tree | `verify-plugin-archive.mjs` — full relative-link closure |
| skill file count | *recorded* from the installed tree; never a gate. The dispatch table cannot supply it — the tree also carries `SKILL.md` and the `*-example.md` walkthroughs, which no action dispatches |
| node / need-cluster / traceability figures | *derived* from the loaded specification with `healthMetrics()` in `.github/extensions/srs-navigator/lib/graph-metrics.mjs` — the same function the page runs. "Need clusters" is a degree ≥ 4 graph property, not an array length |
| `check-distribution.mjs --strict` exits 0 | **zero *error* findings**. Warnings and notices exit 0 by design, so the pack says "zero errors; every warning and notice explained" rather than treating exit 0 as a fully readable third-party surface |

Thresholds are re-checked with **fixture canaries** — small purpose-built trees in the test
suites that are deliberately broken — not by mutating the tracked tree during a release run.
Mutating `main` to prove a guard works adds risk to the release without improving the proof
that ships; the negative-test evidence already attached to the merged PRs is the citation.

### Which capture supports which claim

A screenshot proves whatever the suite that wrote it was rendering — no more. The evidence
plan on #92 attached `skills-health-dashboard.png` to the *graph* health-bar figures; that
image is a full-page shot of the **landing page**, written by a different suite, and could
not have shown them. Attribution is therefore part of the pack, not a detail of it.

| Capture | Written by | Renders | Can support |
|---|---|---|---|
| `live-dotted-notation.png` | `tests/visual.test.mjs` | the canvas | the graph, dotted identifiers, and — via the assertion in the same run — the node / need-cluster / traceability figures |
| `skills-health-dashboard.png` | `tests/site.test.mjs` | the landing page | that the skills-health dashboard is reachable and renders its cards. **Not** the graph health bar |
| `landing-health-link.png` | `tests/site.test.mjs` | the landing page | that the navigation link to that dashboard is present and has an accessible name |
| `landing-health-link-narrow.png` | `tests/site.test.mjs` | the landing page | that the same link survives a 420 px viewport |
| `landing-version-badge.png` | `tests/site.test.mjs` | the landing page | that the badge's **text** is right. It never fetches the release, so it is not evidence the version resolves — the HTTP 200 check and `check-distribution.mjs` are |
| `landing-install.png` | `tests/site.test.mjs` | the landing page | how the install instructions render |
| `landing-live-demo.png` | `tests/demo.test.mjs` | the landing page's demo figure | that the site's demo matches what ships. It renders the site, not an archive |
| `landing-live-demo-reduced.png` | `tests/demo.test.mjs` | the landing page's demo figure | that the demo honours `prefers-reduced-motion` |

Two consequences follow, and both are load-bearing:

- **Only `tests/visual.test.mjs` reads `CANVAS_URL`.** It is therefore the only suite that
  can be pointed at an extracted release archive, and so the only one whose output can
  support a claim about the **published** artefact rather than the checkout. Pair it with
  `open-archive-canvas.mjs --provenance`, which records the SHA-256 of the `extension.mjs`
  that actually served the page.
- **A green CI run attaches nothing.** `ci.yml` uploads `playwright-report` under
  `if: failure()` and never uploads `test-results/`. The pack is produced by a local run and
  attached by hand; citing a test's source line is not evidence that the test ran.

The mapping above is derived from the suites by
`.github/extensions/srs-navigator/tests/evidence-attribution.test.mjs`, so moving an
assertion or renaming a capture fails this document rather than silently invalidating it.
