# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`.claude-plugin/marketplace.json` — this repository can now be catalogued.**
  `/plugin marketplace add` reads a marketplace manifest from the repository root, and we
  shipped only `plugin.json`: a plugin that no marketplace could list, including its own.
  The catalog declares one entry whose `source` is `"./"`, so
  `/plugin marketplace add RafaelGorski/Problem-Based-SRS` resolves with no clone, and the
  release archive (which already carries `.claude-plugin/`) can be registered from disk.
  `build-plugin.py validate` now checks the catalog when present: every relative source
  must resolve to a directory holding a real `plugin.json`, entry names must match the
  plugin they point at, and a pinned `version`/`description` must agree with the manifest —
  a stale pin silently freezes updates for everyone who installed from the catalog.

### Fixed

- **A tag with no release behind it was told to push the tag again.** The drift monitor read
  published *releases* only — `publishedTags` was the release list flattened — so "the tag was
  never pushed" and "the tag was pushed and the publish run failed" were the same observation,
  and both were answered with ``git tag vX.Y && git push origin vX.Y``. In the second state
  that instruction does nothing: `git tag` aborts on the collision, and pushing a ref that is
  already up to date sends nothing, so **no `push` event fires and `create-release.yml` never
  re-runs**. `Create Release` has already failed on a tag push here (run `28527065984`), and
  the very next action on the release backlog is a tag push. `check-distribution.mjs` now reads
  git refs as well, and reports that state as its own finding —
  `release-tag-without-release` — carrying the recovery each train actually needs: dispatch for
  the plugin train (`gh workflow run create-release.yml -f version=X.Y`, since
  `gh release create` attaches to the tag that already exists), and **deleting the tag first**
  for the canvas train, because `bump-version.mjs` skips any version whose tag exists and would
  otherwise walk past the stranded version permanently. A link naming such a tag moves out of
  `dangling-release-links` with it, whose advice — *"will resolve when the tag exists"* — is
  false once it does. An unreadable refs API is a warning and changes nothing, and a caller
  that supplies no tag list gets exactly the previous behaviour.
- **A canvas release could advertise a version it had failed to publish.**
  `release-canvas.yml` pushed the version bump to `main` and pushed the tag *before* it
  packaged anything, so a failure in `package-extension.mjs` or `gh release create` left the
  repository advertising a version, a tag on origin, and no release — the drift monitor's
  `canvas-release-missing`, which is the state `VERSION` 1.1.1 is in today. It was also
  unrecoverable: `bump-version.mjs` starts from the already-bumped `package.json` and skips
  versions whose tag exists, so the stranded version was skipped forever. The pipeline now
  packages **and reads** the archive before anything leaves the runner, and lets
  `gh release create --target <sha>` create the tag as part of the release. That works here
  because this workflow is dispatch-only, so the tag never exists beforehand — GitHub
  ignores `--target` for a tag that already exists, which is why `create-release.yml`, whose
  trigger *is* a tag push, is not the reference for the mechanism and stays tagged by hand.
  A publish failure or cancellation now reverts the bump, on top of the branch as it stands
  and never force-pushed, so a re-run republishes the same version; it stands down when the
  release did publish, checked against GitHub rather than against step state alone.
  `release-canvas-ordering.test.mjs` pins all of it, including that the workflow stays
  dispatch-only, runs only on the default branch, and holds a single global concurrency
  group.
- **The canvas release pipeline never opened the archive it published.** It runs the
  extension's `npm test`, and the only guard that stages and reads the artifact —
  `evals/tests/from-archive-install.test.mjs` — lives in the eval suite, which that workflow
  never ran. `srs-navigator-1.1.0.zip` went out at 4.32 MB with a Playwright tree inside
  through exactly that gap; the packager was fixed afterwards, the pipeline that publishes it
  was not. It now runs that guard after the skill sync, so it reads the tree that ships, and
  additionally opens the `.tar.gz` the run actually built — the guard stages its own copy, so
  without that second read a packaging or tar regression would pass on a tree nobody ships.
- **A version bump had left a release unreachable, and cutting `v2.6` would have buried its
  notes.** The manifest moved `2.4.1 → 2.5.0 → 2.6.0` with no `v2.5` tag in between. Because
  `create-release.yml` validates the tag against `plugin.json`, `v2.5` is no longer
  publishable from `main` — `build-plugin.py --expected-version 2.5` fails on a version
  mismatch — so `[2.5.0]: …/releases/tag/v2.5` had no release behind it while the monitor
  kept filing it under "cut the missing release", advice that produces a failed run. Tagging
  the older commit that still read `2.5.0` *would* build, but would publish a tree and notes
  that predate most of what the section documented. Worse, `extract_notes()` publishes exactly
  one section: cutting `v2.6` would have shipped an artifact containing 2.5's work (the
  clean-machine install fixes, the health-dashboard links, the eval-README and whole-spec
  notation guards) with release notes that never mentioned it. The `[2.5.0]`
  section is folded into `[2.6.0]`, the release that actually delivers it.
- **The drift monitor tells the two cases apart.** `stranded-release-link` reports a changelog
  link for a version the manifest has already passed and gives the fix that works — fold the
  section in, delete the link — instead of an instruction that fails the workflow. It takes
  precedence over `unpublishable-release-link`, since correcting a stranded link's tag shape
  still leaves it pointing at a release `main` cannot cut.
- **The reason it gives is one the repository's own history supports.** The first version of
  this finding called the tag impossible to create and its link permanently broken. Neither
  holds: `checkout@v4` restores the tagged commit, and commit `69dfe88` still carries
  `plugin.json` at 2.5.0, so `build-plugin.py validate --expected-version 2.5` passes there.
  The claim is now the narrower one that survives the check, and the same one everywhere it is
  made. `stranded-release-claim.test.mjs` derives the falsifier from git rather than restating
  it (it exports the tree at that commit and runs the real validator), forbids a reversion to
  the strong form across all five surfaces that carry the claim, and requires the finding and
  its runbook row to name both halves: unreachable from `main`, misleading from anywhere else.
- **A recurrence now turns CI red at the moment of the bump.** `release-hygiene.test.mjs`
  requires every changelog section below the manifest version to name a tag present in
  `git tag --list`, and the eval job checks out with `fetch-tags` so the guard has evidence
  rather than skipping. That job now also sets up Python, so the two legs that cross-check
  `build-plugin.py` by executing it stop skipping in CI. Negative-tested by mutating the real
  tracked files: 14/14 caught.
- **The documented Claude Code install path was not a command.** README's plugin section
  offered `/plugin install https://github.com/RafaelGorski/Problem-Based-SRS`, but Claude
  Code installs `<plugin>@<marketplace>` and never accepts a URL; the alternative,
  `claude --plugin-dir ./Problem-Based-SRS`, pointed at a checkout the section never told
  the reader to make. Both are replaced by the two commands that work —
  `/plugin marketplace add RafaelGorski/Problem-Based-SRS` then
  `/plugin install problem-based-srs@problem-based-srs` — with the namespaced skill name
  the install actually produces, and a `git clone` in front of the `--plugin-dir` variant.
  `docs/index.html` carries the same path. The new
  `evals/tests/claude-plugin-install.test.mjs` derives both command strings from
  `plugin.json` and `marketplace.json`, so renaming either breaks the documentation test
  instead of silently invalidating it, and rejects any `plugin install` argument that is a
  URL or lacks an `@marketplace`.
- **The canvas can now be driven from a published release archive**
  (`evals/tools/open-archive-canvas.mjs`). Every proof of `/live` ran against this
  repository: `serve-canvas.mjs` renders out of `lib/`, `visual.test.mjs` points at the
  server it starts, and `from-archive-install.test.mjs` — the one place that stages a real
  archive — kept the boot sequence sealed inside a `node --test` file. Nothing could hand a
  browser a URL backed by the artefact a user downloads, so the screenshot #90 asks for could
  not be taken at all. The tool installs a host-SDK stub and nothing else (no `npm install`,
  matching the archive's no-`node_modules`/no-lockfile contract), loads `extension.mjs` from
  the extracted tree, opens the canvas and prints the loopback URL — stdout carries the URL
  and nothing else, so it feeds `CANVAS_URL` directly and `playwright.config.mjs` then starts
  no canvas server of its own.
  - It **refuses any path under `.github/`**, which is the assertion that gives the evidence
    its value: aimed at `.github/extensions/srs-navigator/` it would boot happily,
    `extension.mjs` would switch to in-repo mode and resolve the methodology from `skills/`,
    Playwright would go green — and the capture filed as published-archive evidence would be
    the checkout. Presence standing in for function is the substitution #69 kept making; a
    tool that can prove the wrong thing silently makes it cheaper.
  - By default it passes the archive's **own** `lib/demo-spec.mjs` explicitly rather than
    letting the extension fall through to its "no spec found" path, which lays a landing
    overlay over the same graph and swallows the health-bar clicks `visual.test.mjs` makes —
    an archive-driven run would have failed on the overlay and read as a `/live` regression.
    `--landing` captures that first-run state deliberately.
  - `evals/tests/from-archive-install.test.mjs` now imports the stub from the tool instead of
    keeping its own copy, so the two cannot drift; `archive-canvas-tool.test.mjs` (21 tests)
    fails if the duplicate comes back, if the `.github` refusal is weakened, if the CLI
    prints anything but the URL, or if the Playwright config stops honouring `CANVAS_URL`.

- **Publishing the canvas app failed the plugin's release pipeline.** `create-release.yml`
  triggers on `push: tags: ["v*"]`, and that glob matches both release trains — the two
  cannot be told apart by tag shape either, since `v2.4.1` is a plugin release and `v1.1.0`
  a canvas one. So every canvas release fired the plugin pipeline against a tag that does
  not match `plugin.json`, and it failed: run `28527065984`, tag `v1.1.0`, four seconds
  after `release-canvas.yml` published `srs-navigator 1.1.0` — the only failure in that
  workflow's history, and structural rather than incidental. `scripts/release-train.mjs`
  now attributes the pushed tag before anything is built, and the publishing job is gated on
  the answer. The plugin side of the rule is the pipeline's own — `build-plugin.py` compares
  *normalized* versions, so `v2.6` and `v2.6.0` both build for manifest 2.6.0 and both
  classify as plugin — and a tag claimed by both trains, or by neither, fails the run rather
  than publishing something arbitrary.
- **The tag gate was one-sided: only the pipeline that *receives* a colliding tag checked
  for one.** `release-canvas.yml` is where a collision starts — it bumps the version and then
  creates the release, which creates the tag — so by the time `create-release.yml` classified
  anything the tag was already on origin, and failing there unpublishes nothing. The canvas
  workflow now runs `release-train.mjs --tag <bumped tag> --expect canvas` after the bump and
  before anything leaves the runner: after the bump because the classifier reads the version
  files off the disk and before it the tag belongs to no train, and before the release because
  after publication there is nothing left to prevent. The two pipelines act on the same verdict
  differently on purpose — `create-release.yml` *skips* (it fires on every `v*` tag, most of
  which are not its business) while `release-canvas.yml` *fails* (it was dispatched deliberately
  and is about to publish). `--expect` lives in `release-train.mjs` rather than as a comparison
  in YAML, so there is one copy of the rule; the CLI now also accepts the tag as a bare
  argument and **refuses** an option it does not recognise, instead of silently dropping it and
  classifying `$GITHUB_REF_NAME` — which is how `release-train.mjs v2.6` came to answer
  `unknown` for this repository's own next plugin release.
- **`VERSION` advertised a canvas version that no release could ever publish.**
  `VERSION` and the extension `package.json` were hand-bumped to 1.1.1, but
  `bump-version.mjs` *increments* from the version it finds, so running the workflow would
  have published 1.1.2 and skipped 1.1.1 forever. Both files are reset to the published
  1.1.0, restoring the intent — the next canvas release publishes 1.1.1 — and the two files
  are now asserted to agree, since the bump script reads one and every other surface reads
  the other. The `canvas-release-missing` finding says which version running the workflow
  would *actually* publish, derived from `bump-version.mjs` rather than restated; importing
  that script is now side-effect free, so reading a drift report can no longer rewrite the
  version files.
- **The changelog linked release tags the pipeline never creates.** `[2.6.0]` and `[2.5.0]`
  pointed at `releases/tag/v2.6.0` and `/v2.5.0`, but `create-release.yml` builds its tag
  from `build-plugin.py`'s *normalized* version — `TAG="v${VERSION}"` after
  `normalize_version()` strips the trailing `.0` — so those versions publish at **`v2.6`**
  and **`v2.5`**. GitHub serves `/releases/tag/<tag>` by exact name, so cutting the release
  the drift monitor asks for would have left both links 404 and the monitor red, still
  advising a release that by then existed. Both links now name the tag the pipeline
  produces, and `release-hygiene.test.mjs` derives that tag by executing
  `build-plugin.py`'s own `normalize_version` rather than restating its rule. (`[2.5.0]` has
  since been folded into `[2.6.0]` — see above — because naming the right tag was necessary
  but not sufficient: `main` cannot cut `v2.5` while the manifest reads 2.6.0, and a tag on
  the older commit would publish notes that predate the section.)
- **The drift report told the canvas app it was behind a release of the other product.**
  `releaseDrift()` matched each train separately and then printed a single global newest
  tag in both findings, so `VERSION` 1.1.1 was reported against `v2.4.1` — a *plugin*
  release. Releases are now classified by the title their own workflow writes
  (`srs-navigator …` versus `🎉 Version …`), each train reports its own newest, and with no
  titles available the report says the train is unidentifiable instead of guessing. A train
  that simply has no releases yet is reported as empty rather than as unidentifiable, so the
  fallback cannot quietly reintroduce the cross-train citation it exists to prevent.
- **A dangling link that a release cannot fix is reported as its own finding.**
  `unpublishable-release-link` separates "this names a tag no pipeline creates — correct the
  link" from `dangling-release-links`' "cut the release", so the runbook entry a maintainer
  follows matches the action that will actually clear the finding. The plugin's `.0`-stripping
  rule is applied only to `CHANGELOG.md`, the file `build-plugin.py` reads for release notes;
  the canvas train tags `v${VERSION}` verbatim, so a canvas link awaiting its release stays a
  release to cut rather than becoming a link to break.
- **The registry monitor only compared skill *names*, so a stale page read as healthy.**
  `check-distribution.mjs` matched the listing's advertised names against the repository and
  stopped there, which is the cheap half of what the acceptance criteria ask for — the
  listing is supposed to render the current description, version, and body. Captured
  2026-07-31, the page for `problem-based-srs` published a description that matched but a
  body that did not: 14 of the shipped skill's 15 `##` sections, missing **Identifier
  Notation (CANONICAL)**, and still teaching the `FR-001` hyphen IDs the methodology
  replaced with dotted notation. Once the maintainer re-submits and the names align, that
  run would have gone green over a page still teaching superseded methodology. The checker
  now fetches each per-skill page and reports `registry-skill-stale` when the description,
  the published version, or the rendered sections disagree with what is shipped. Scraped
  text is not a contract, so zero matched sections is `registry-skill-unreadable` (a
  warning) rather than drift — a redesigned page and a broken extractor look identical from
  here. Guarded by `evals/tests/registry-listing-content.test.mjs` against a verbatim
  capture of the real page.
- **An axis the registry cannot answer is now reported, not dropped.** The version half of
  that comparison returned `null` when the page published no `softwareVersion` — which is
  every page skills.sh serves — and `summarize()` then said nothing at all about it. So a
  run named one axis (the body) and stayed silent about a second, which reads as *checked,
  agrees*: the exact shape of the failure the monitor exists to remove. It is fixed with a
  third channel rather than a third severity, because `ok` is `findings.length === 0` and a
  notice-severity *finding* that fires on every run would leave the monitor permanently
  non-green — the state that gets a monitor muted. `skillPageDrift().version` now carries a
  status (`compared` / `page-publishes-none` / `repo-publishes-none`), `summarize()` returns
  an `unverified` channel that cannot move `ok`, `drifted` or the exit code, and the report
  prints **"Not verified this run"** — including on a clean run, the only run where the
  silence actually misleads. The value compared is the skill's own `metadata.version`, never
  the plugin release version; the finding text now says so, and a test fails if the two
  domains are mixed. `registry-skill-stale` also states its own epistemic limit: section
  presence is a staleness signal, not a byte-level diff.

- **The canvas's "Learn & Create Spec" button no longer lets the agent write the spec
  itself.** The splash-screen prompt named the `problem_based_srs` tool and then described
  the work ("scan the workspace… generate the artifacts"), so an agent could satisfy it
  end-to-end without ever invoking the skill — and therefore without the methodology's
  mandatory Discovery Interview. Every agent-facing prompt the canvas emits (`LEARN_PROMPT`,
  `LOAD_PROMPT`, the `learn` and `pending_actions` canvas actions, and the node action bar)
  now orders the agent to call the skill *first*, follow the returned methodology exactly,
  forbids improvising or substituting its own process, and restates that the Discovery
  Interview is mandatory and that autopilot does not waive it. Reading the repository is
  explicitly context for the interview, never a replacement for it. `LOAD_PROMPT` is now
  load-only: it may not invent specification content, only offer to run the methodology.
- **`reference/live.md` documented a JSON shape the navigator cannot parse.** The `/live`
  example used `label`, `problem`, and `need` keys; the extension requires `title`,
  `description`, `problemIds[]`, and `needIds[]`, so an agent that followed the example
  produced a spec that failed `validateSpecificationJSON`. The example is now the real
  schema, and the app's own JSON example uses canonical dotted IDs (`CP.01`, `CN.01.1`,
  `FR.01.1.1`, `NFR.01`) instead of untyped `{id,title,description}` placeholders.
- **The README's first badge is no longer a 404.** It linked
  `releases/tag/v2.6.0`, a tag that was never pushed: the documented release process bumps
  `.claude-plugin/plugin.json` *before* the tag exists, and the release had not been cut for
  two consecutive versions, so the first clickable thing on the repository page led nowhere.
  It now points at the `/releases` index, which `docs/index.html` already did, and a guard
  keeps version badges off per-tag URLs.
- **The changelog's oldest release link is no longer a 404.** `[1.0]` pointed at
  `releases/tag/v1.0` for the project's entire life; the tag has always been `v1.0.0`. The
  drift checker only found it because it compares tags **exactly** — GitHub serves
  `/releases/tag/<tag>` by tag name, so `/releases/tag/v2.4.0` is a 404 even though release
  2.4.0 exists as `v2.4`, and any matching that normalizes the two would have called this
  link healthy.
- **The installed skill no longer points at files only the maintainer has.**
  `reference/functional-requirements.md` headed its **Quality Rules** section — the rules
  that decide whether a requirement is well-formed — with a link to
  `../../../docs/references/iso-iec-ieee-29148-2018.md`. `npx skills add` copies
  `skills/problem-based-srs/**` and nothing else, so once installed that link escapes the
  skill root into the reader's own `.agents/` directory and finds nothing. It now cites the
  standard by its public URL, the way every RFC 2119 reference in the skill already did.
- **`/live`'s recovery instruction works outside the monorepo.** `reference/live.md` told an
  agent that hit a missing canvas that the extension "lives at
  `.github/extensions/srs-navigator/`" — a path that exists only for someone who cloned this
  repository. The one instruction whose job is to fix "the extension is not installed" now
  hands over the install URL and the filtered release list, and says plainly that the canvas
  is a separate install from the skills.
- **`reference/live.md` stopped teaching an ID shape the methodology forbids.** Its
  machine-readable spec example emitted `"id": "NFR.1.0"` while SKILL.md's own Identifier
  Notation table declares `NFR.{n}` → `NFR.01`, and the shipped demo spec uses `NFR.01`. The
  notation guard added in #63/#66 only rejects *hyphen* IDs, so a wrong-arity dotted ID
  walked straight through.
- **The agent shipped two links that resolved outside the release archive.**
  `agents/problem-based-srs/AGENT.md` linked its worked examples through
  `../skills/problem-based-srs/reference/…`, which from `agents/problem-based-srs/` lands in
  `agents/skills/` — a directory that exists in neither the repository nor the archive. It
  was wrong in every published `problem-based-srs-vX.Y.zip`. `skills-static.test.mjs` does
  resolve every relative link, but only under `skills/`, and `evals/` contained no reference
  to `agents/` at all, so nothing looked at one of the five paths `PACKAGE_INCLUDES` ships.
- **The agent could not dispatch `/live`.** `SKILL.md` routes nine actions, `AGENT.md`
  advertised eight: the canvas entry point — the one #69 keeps asking about — was missing
  from the table the plugin archive ships. It now names `/live`, which is the command that
  actually reaches the canvas: `live` is not an argument the orchestrator accepts, and a
  guard now rejects any `/problem-based-srs <action>` the agent claims that `SKILL.md`'s
  Available Actions table does not list.
- **The README and the landing page told two different origin stories.** The site opens on
  `CP.01 · Scattered Customer Information`, quoted from the shipped `.spec/crm-system.json`;
  the README opened on an invented reporting-dashboard problem and reused **`CP.01` for
  different content** — so a reader who met both surfaces in sequence, then installed and ran
  `/live`, saw a third thing. The README now walks the same `CP.01 → CN.01.1 → FR.01.1.1`
  chain, and `landing-proof.test.mjs` holds it to the spec the way it already held the
  landing page: renaming a problem in `.spec/crm-system.json` now fails both surfaces instead
  of neither.
- **A moderate XSS advisory sat in the canvas dev tree** (`jsondiffpatch < 0.7.2`,
  [GHSA-33vc-wfww-vjfv](https://github.com/advisories/GHSA-33vc-wfww-vjfv)), reachable only
  as a transitive dependency of `ai@4`. `npm audit fix --force` would have taken `ai` from
  v4 to v7 — a breaking SDK migration whose only consumers are the provider-gated LLM suites,
  which cannot be run without API keys, so the fix could not have been verified. Pinned with
  an `overrides` entry instead: `npm audit` drops from 5 findings (2 moderate) to 4 low, and
  `generateText`/`tool` still resolve on the v4 API the harness documents. The four remaining
  low advisories all require that migration and are left for a deliberate change.

### Added

- **The plugin release archive has an install path, and a guard that opens it**
  (`evals/tests/plugin-archive-install.test.mjs`, 14 assertions). `problem-based-srs-vX.Y.zip`
  is the only asset attached to every methodology release, and no surface said what to do
  with it: the README documented four install paths and none of them was the file on the
  release page. It is now documented — where to extract it, that the archive brings its own
  `problem-based-srs/` root so the target is the directory *above* it, and which folder to
  copy for the skill alone. The guard stages what the packager ships into a temp directory
  outside the checkout and reads it as an installer would: every relative link must resolve
  *inside* the archive, the agent must advertise every action `SKILL.md` dispatches, and every
  path the README quotes must be in the tree. Both the include list and the archive root are
  read out of `build-plugin.py` and `plugin.json`, and one cross-check runs the real
  `build-plugin.py package` and requires the staged tree to equal the zip — so a change to the
  archive's layout fails the documentation assertion with it.

- **Drift guard for the canvas app's agent-facing instructions**
  (`.github/extensions/srs-navigator/tests/app-prompts.test.mjs`, 21 assertions, wired into
  `npm test`). It imports the real prompt values from `lib/prompts.mjs` and fails if any
  canvas prompt loses "run the skill", "do not improvise", or
  "the Discovery Interview is mandatory / autopilot does not waive it", if a prompt shows
  legacy hyphen IDs, or if `reference/live.md`'s JSON example stops passing the navigator's
  own `validateSpecificationJSON` + `validateReferenceIntegrity`. The autopilot marker string
  is shared with `interview-guard.test.mjs`, so the app and the skill can never state
  contradictory rules about waiving the interview.
- **Distribution drift is detected instead of rediscovered by hand**
  (`scripts/check-distribution.mjs`, `evals/tests/distribution-drift.test.mjs`,
  `.github/workflows/distribution-drift.yml`). Two surfaces carry this project and neither
  lives in the repository — the skills.sh listing and GitHub Releases — so #69 filed both as
  untestable and every status comment since has re-quoted a hand-run check from #72. They
  had drifted: the listing still advertises the **nine pre-#50 skills**, of which eight no
  longer exist (its own counters put 70 of 101 installs on those names), and the manifest
  reached 2.6.0 while the newest release stayed **v2.4.1**. `distribution-surfaces.test.mjs`
  asserts those links *exist*; it never asked whether what they point at still agrees with
  the repository — presence, not function, the same gap #73 had to disprove for the canvas
  archive. The checker reads the listing's JSON-LD `CollectionPage`, derives the real skill
  set from each `SKILL.md`'s frontmatter rather than restating it, and compares both release
  trains (`vX.Y` plugin, `vX.Y.Z` canvas) against what is published, normalizing `v2.4` to
  `2.4.0` the way `build-plugin.py` does — but only *within* the plugin train, so a plugin
  `v1.2` can never be mistaken for a canvas 1.2.0 release that was never cut. Findings carry
  a severity: only real disagreement fails the run, while an unreachable surface is a
  warning with a `::warning::` annotation, because a monitor that goes red on someone else's
  503 is a monitor that gets muted. The comparison is pure and unit-tested offline
  against a verbatim capture of the live listing; only the weekly workflow touches the
  network, and it stays out of the PR gate because third-party state is not a property of a
  pull request.

- **The skills install is executed, not inferred from a file count**
  (`evals/tests/skills-install.test.mjs`, 14 assertions). #69 checked its "follow the README
  install path for the skills" box on the evidence "12 files landed" — presence, which is the
  same claim #73 had to disprove for the canvas archive. The suite now stages exactly what
  `npx skills add` copies — derived by walking `skills/problem-based-srs/`, not from a
  hard-coded list — into a temp directory **outside** the checkout, and asserts the result is
  self-sufficient: every relative link resolves *inside* the installed skill, every action in
  the orchestrator's dispatch table is present, the frontmatter still names the directory it
  landed in, any repository-only path is accompanied by the URL that reaches it, and every ID
  in a JSON example matches an arity parsed out of SKILL.md's notation table at runtime rather
  than restated in the test.

  This closes a blind spot rather than adding a second copy of an existing check:
  `skills-static.test.mjs` does resolve every relative link, but from the file's location *in
  the checkout*, where `../../../docs/` exists. It was green while the installed copy was
  broken — the same "exercises the branch an installer never takes" hole #73 found in the
  canvas skill fallback.

## [2.6.0] - 2026-07-31

Carries everything that was documented as **2.5.0 and never released**. The manifest moved
`2.4.1 → 2.5.0 → 2.6.0` without the `v2.5` tag in between, and `build-plugin.py` publishes
exactly one changelog section — so the two were folded together rather than leaving a
section whose notes no release cut from `main` would carry and whose link had no release
behind it.

### Added

- **The landing page shows the `/live` canvas moving instead of describing it.** The
  `#app` figure is now a recorded, silent, looping WebM of the real SRS Navigator: the
  graph reveals itself tier by tier, a Customer Problem is selected to open its detail
  panel and traced hull, then a health metric filters the graph down to one cluster.
  GitHub traffic showed `assets/srs-navigator.png` was already the third most-visited
  path in the repo — readers were seeking the visual, and a still could not answer
  "what does using it feel like?".
- **`npm run record-demo`** (`.github/extensions/srs-navigator/scripts/record-demo.mjs`).
  The demo is a build output, not a screencast: Playwright drives the shipped canvas
  against the shipped CRM spec, records the video, extracts the poster frame, and
  asserts each beat actually happened before writing anything. A stale or broken take
  fails the recorder rather than shipping.
- **Drift guard for the demo** (`evals/tests/live-demo-asset.test.mjs`, 26 offline
  assertions) plus a Playwright behavior suite (`tests/demo.test.mjs`). Together they
  pin the reduced-motion contract, the static fallback, the byte budget, the ≤10s
  runtime, and the fact that the committed metadata matches the committed bytes.
- **From-archive install is executed, not asserted by file listing**
  (`evals/tests/from-archive-install.test.mjs`). Stages the archive into a temp directory
  outside the monorepo, gives it a stub of the host SDK as the only thing in its
  `node_modules`, imports `extension.mjs` from there, and drives it: the `srs-navigator`
  canvas registers, opening it serves a page carrying the real chain
  (`CP.01 → CN.01.1 → FR.01.1.1`, `NFR.01`), a caller-supplied spec renders, `onClose`
  releases the port, and all nine methodology actions answer from the bundled skills —
  proved by poisoning the staged copy, since the bundled and canonical files are
  byte-identical and equality cannot say which was read. That standalone fallback is the
  whole archive install and no test had ever taken that branch.
- **Skills Health Dashboard is now reachable in one click.** The published dashboard
  (`docs/skills-health.html`) is linked from the landing page nav *and* footer, from
  `docs/docs.html`, and from a README badge + intro line. It was generated, committed
  and served by GitHub Pages but linked from nowhere, so the self-verifying proof of
  the anti-drift claim was invisible at the evaluate-before-install moment.
- **Drift guard for the eval documentation** (`evals/tests/evals-readme.test.mjs` +
  `evals/lib/readme-contract.mjs`). A pure validator parses every command documented
  in `evals/README.md` and fails when one names a runner or path that does not exist,
  reintroduces the phantom manifest under `evals/`, passes a bare directory to
  `node --test`, or writes a live-eval command that is not repo-root relative.
- **Whole-spec notation guard** (`evals/tests/demo-spec-notation.test.mjs`). Reads the
  real shipped `.spec/crm-system.json` and the canvas's `lib/demo-spec.mjs`, deep-compares
  them, and gates every identifier and every reference edge. Previous guards only covered
  the imported object and three IDs quoted on the landing page, so a partial revert of the
  shipped JSON would have slipped through.
- **Screenshot evidence harness for the project webpage.** `scripts/serve-site.mjs` serves
  `docs/` statically and Playwright now runs two projects (`canvas`, `site`), each with its
  own self-starting server. PNG evidence for the `/live` graph, the health-dashboard link,
  the dashboard itself and the version badge is written to the git-ignored `test-results/`.
- **Scheduled provider-gated behavioral verification.** `.github/workflows/skill-behavior.yml`
  runs the LLM-backed skill-behavior suite weekly from a repository secret, fails visibly
  when the secret is missing instead of reporting a green run in which every model was
  skipped, and uploads the resulting health snapshot as an artifact.
- **Distribution paths are documented and tested.** The README and landing page name the
  `skills.sh` listing and an explicit install path for the SRS Navigator canvas extension,
  with a deterministic test asserting both surfaces carry them.
- **Clean-machine install guard** (`evals/tests/install-path.test.mjs`). Stages the canvas
  archive with the real packager and asserts the documentation against what it emits: one
  top-level directory, the files the Copilot app needs to load the extension, no development
  payload, a size budget, and — derived from the packager's own archive root — that every
  documented extract target is the *parent* of that root rather than the root itself. Also
  gates the release-fallback link and the AgentSkills CLI install location on both surfaces.

### Changed

- **Motion on the landing page is opt-out-able.** The video carries no `autoplay`
  attribute; playback is started from `site.js` only after
  `prefers-reduced-motion` is read, and only while the figure is on screen. A reader
  who asked their system for no motion gets the poster frame and a visible control.
- **`run-tests.ps1` splits its two model-calling suites.** `-IncludeSkillBehavior` (provider
  API key) and `-IncludeLiveEvals` (authenticated `copilot` CLI) are now separate switches.
  Previously one flag enabled both, so requesting the provider suite also launched a runner
  that needs a CLI a hosted runner does not have. The live runner is now invoked with
  `--force` so a requested suite actually evaluates instead of exiting 0 having done nothing.
- **The Skills Health Dashboard reports the plugin version.** It read the canvas extension's
  `VERSION` (1.1.0) while sitting beside a site badge that said 2.4.1 — two release trains,
  one confusing number. It now shows the plugin version and names the canvas version separately.
- **The provider-backed workflow contract requires canonical dotted IDs.** It previously
  asserted the opposite of the shipped methodology (requiring `CP-<n>`, rejecting `CP.<n>`),
  so an agent correctly following the skill would have been graded as failing. The CRM
  fixtures and the skill-behavior README were migrated with it, and a deterministic assertion
  in `tests/notation.test.mjs` prevents the hyphen-only rule returning while keys are absent.

### Fixed

- **A canvas filter test that never actually ran.** `tests/visual.test.mjs` asserted on
  a health metric the clean CRM spec does not produce, and read dimming from
  `getComputedStyle().opacity` — which the renderer never sets, because it dims child
  `rect`/`text` `opacity` *attributes*. The test now exercises the real
  `need clusters` filter and counts genuinely dimmed nodes.
- **The install archive no longer ships what it cannot run.** `scripts/` went out with it —
  four files of maintainer tooling, one of which (`record-demo.mjs`) imports `playwright`, a
  devDependency the archive deliberately excludes, and one of which (`sync-skills.mjs`) reads
  a monorepo path a standalone install does not have.
- **The archive no longer ships the manifest that rebuilds the tree it removes.** It carried
  `package.json` with seven devDependencies (Playwright, three `@ai-sdk/*`, `ai`, `zod`) plus
  `package-lock.json`, so one `npm install` in the extracted directory recreated exactly the
  4.3 MB Playwright tree that `srs-navigator-1.1.0.zip` shipped by accident. `stage()` now
  writes an allowlisted install manifest, and the dangling `"main": "index.js"` — naming a
  file that exists in neither the archive nor the repository — goes with it. The archive is
  22 files / 92 KB compressed, and both surfaces now tell the reader no `npm install` follows.
- **`evals/README.md` live-eval commands are repo-root relative** (`node evals/run-evals.mjs`).
  They previously required an undocumented `cd evals` while every neighbouring command ran
  from the repository root.
- **Corrected stale comments** claiming the shipped skill templates emit legacy hyphen IDs.
- **The canvas extension extract instruction no longer nests the archive.** The README said
  to extract into `~/.copilot/extensions/srs-navigator/` while the landing page said
  `~/.copilot/extensions/`. The archive already contains a `srs-navigator/` root, so the
  README's version produced `…/srs-navigator/srs-navigator/extension.mjs`, which does not
  load. Both surfaces now name the parent directory and show the resulting path.
- **The archive fallback links a release that actually carries the archive.** Both surfaces
  pointed at the bare releases page, but the canvas app ships on `vX.Y.Z` tags interleaved
  with the plugin's `vX.Y` releases, so the newest release has no canvas archive at all.
  They now link a filtered release view and explain the two trains.
- **The AgentSkills CLI section says where the skill lands.** `npx skills add` installs into
  `.agents/skills/problem-based-srs/` and writes a `skills-lock.json`; neither was named
  anywhere, while the surrounding docs pointed readers at `.github/skills/`.
- **`scripts/package-extension.mjs` is importable without side effects.** `main()` now runs
  only when the file is invoked as a script, and `ARCHIVE_ROOT`, `EXCLUDE`, `EXCLUDE_FILES`
  and `stage()` are exported so the install guard derives archive facts from the packager
  rather than restating them.

[2.6.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.6

## [2.4.1] - 2026-07-22

### Changed

- **Reframed the value proposition across all docs.** The README, project webpage
  (`docs/index.html`, `docs/docs.html`), `docs/PRODUCT.md`, and `AGENTS.md` now position
  Problem-Based SRS as a **plugin that extends your AI harness (Copilot first) to handle
  Software Specifications** — adding AI‑slop prevention tuned to the model, a spec language
  and command palette that steer toward great design, and a rigorous method for brownfield
  and greenfield systems.
- **Consolidated the methodology into a single skill folder.** The 9 previously isolated
  `skills/<slug>/SKILL.md` folders are collapsed into one skill at `skills/problem-based-srs/`:
  the `SKILL.md` orchestrator plus one plain-markdown file per action under
  `reference/<action>.md` (filename == action), mirroring the pbakaus/impeccable layout.
  `/problem-based-srs` is now the single main skill; `SKILL.md` routes each action to its
  `reference/<action>.md`. Action files carry no YAML frontmatter. Renamed actions:
  `customer-problems`→`problems`, `customer-needs`→`needs`, `zigzag-validator`→`validate`,
  `complexity-analysis`→`complexity`. The canvas extension's skill-sync, bundled copies,
  eval loaders/tests, and docs were updated to match; skill history is preserved via `git mv`.

## [2.4] - 2026-07-02

### Added

- **New `evals/` harness for testing and evaluating the methodology skills using the
  GitHub Copilot CLI SDK.** Two tiers: deterministic offline tests (`evals/tests/*.test.mjs`,
  57 tests via `node --test`) covering the headless Copilot SDK wrapper, the SKILL.md
  loader/graders, and static skill evals over every `skills/<slug>/SKILL.md` (name/dir
  match, description contract, body line cap, link resolution, methodology tokens, and a
  regression guard proving the unified `/problem-based-srs <action>` refactor left no
  legacy per-step commands or `Use skill:` handoffs); and opt-in live LLM evals
  (`evals/cases/*.case.mjs` + `evals/run-evals.mjs`) that run each skill through the real
  model and grade it with a rubric plus an optional LLM judge. Includes PowerShell runners
  `evals/scripts/run-tests.ps1` and `evals/scripts/run-evals.ps1` for manual verification.
- **Verbose eval output.** `evals/run-evals.mjs` gains `--verbose`/`-v` and `-vv`
  (surfaced as `-Detailed`/`-Trace` in `run-evals.ps1`) to print the built prompt, run
  metadata (exit code, duration, token usage, loaded skills, tool calls, stderr), the full
  model artifact, and every rubric check (passing and failing) for troubleshooting.
- **Repo-root `run-tests.ps1`** that runs all offline suites in sequence — plugin
  validation, the canvas extension tests, and the deterministic skill evals — with a
  pass/fail summary and `-SkipValidate` / `-SkipCanvas` / `-SkipEvals` switches.

### Changed

- **Unified the nine per-step commands into a single `/problem-based-srs` command
  with an `action` argument.** Instead of `/customer-problems`, `/customer-needs`,
  `/functional-requirements`, etc., the methodology is now driven by one command that
  dispatches to a step: `/problem-based-srs problems`, `/problem-based-srs needs`,
  `/problem-based-srs functional-requirements`, `/problem-based-srs business-context`,
  `/problem-based-srs software-glance`, `/problem-based-srs software-vision`,
  `/problem-based-srs validate`, `/problem-based-srs complexity`, and
  `/problem-based-srs` (full run, the default). Applied consistently across the CLI
  skills/agent, the SRS Navigator canvas extension (a single `problem_based_srs` tool
  replaces the nine per-step tools; action-bar payloads now carry an `srsAction`
  field), and the project webpage. The eight step content files under `skills/<slug>/`
  are retained as the backing methodology library.

[2.4.1]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4.1
[2.4]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.4

## [2.3] - 2026-07-01

### Added

- **"Most requirements start in the wrong place" now shows the problem-highlight
  animation.** `docs/index.html` gains a two-column layout with an app-faithful SRS
  Navigator graph of the VagrantChefHubot example (`docs/assets/srs-problems.svg`). Its
  CSS keyframes present the whole 28-node spec, then dim the Needs and Requirements while
  the five Customer Problems (CP-1 through CP-5) light up with pulsing rings, making the
  visual argument that requirements begin at the problem. Honors `prefers-reduced-motion`.
- **"How it works" now opens with a CLI chat simulation.** A dark terminal mockup animates
  the Copilot CLI calling each methodology skill in order (`/business-context`,
  `/customer-problems`, `/software-glance`, `/customer-needs`, `/software-vision`,
  `/functional-requirements`), each command tinted with its step color, ending on
  100% traceability from FR back to CN back to CP. Built with pure CSS/HTML; the assembled
  state is the default so it stays readable under reduced motion.
- **`scripts/build-problem-highlight.mjs`**: generator for `srs-problems.svg`. Node colors
  and Phosphor icons are sampled verbatim from the extension's `renderer.mjs`; the chrome
  mirrors the navigator on the VagrantChefHubot spec. The canvas app itself is unchanged.

[2.3]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.3

## [2.2] - 2026-07-01

### Changed

- **GitHub Pages hero now uses an animated image instead of the live app.** Both
  `docs/index.html` and `docs/app.html` replace the embedded live navigator iframe with a
  self-contained animated SVG (`docs/assets/srs-chain.svg`). Its CSS keyframes build the
  traceability chain in the methodology's causal order: Customer Problems appear first,
  then the Customer Needs that address them, then the Functional / Non-Functional
  Requirements that satisfy them, with links drawing in. The image reuses the real
  navigator's node colors and Phosphor icons, and honors `prefers-reduced-motion`.

### Added

- **`scripts/build-chain-animation.mjs`**: generator for the animated SVG. Node colors and
  icons are sampled verbatim from the extension's `renderer.mjs`, and the chain uses a real
  slice of the bundled CRM demo spec. The canvas app itself is unchanged.

### Removed

- `docs/navigator-embed.html` and `scripts/build-navigator-embed.mjs` (the live-app embed),
  superseded by the animated image.

[2.2]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.2

## [2.1] - 2026-06-29

### Changed

- **GitHub Pages hero now embeds the real SRS Navigator.** Both `docs/index.html` and
  `docs/app.html` replace the hand-built CSS mock of the CP → CN → FR chain with an
  iframe of the genuine navigator (`docs/navigator-embed.html`). Its own force-directed
  intro animation builds the traceability chain live: Customer Problems reveal first,
  then the Customer Needs that address them, then the Functional and Non-Functional
  Requirements that satisfy them, with links forming between tiers.

### Added

- **`scripts/build-navigator-embed.mjs`**: generator that renders the real navigator to
  `docs/navigator-embed.html` from the extension's own `parser`, `renderer`, and
  `demo-spec` modules against the bundled CRM demo specification. The canvas app itself
  is unchanged.

[2.1]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.1

## [2.0] - 2026-06-29

Version 2.0 reframes the project around **two deliverables in one**: the Problem-Based
SRS **Skills** (the methodology) and the **SRS Navigator app** (the GitHub Copilot canvas
for visualizing, decomposing, and iterating a specification with the agent).

### Added

- **README scope refresh**: a "Skills + App" overview table up top, plus a
  "Decompose and iterate with the agent" walkthrough with real screenshots of the
  inline action bar and the right-side agent-activity panel.
- **GitHub Pages — new "Iterate" section**: documents the agent interaction loop
  (hover → action bar → decompose → agent works in the side panel) with annotated
  screenshots, and adds an "Iterate" entry to the site navigation.
- **New navigator screenshots** in `docs/assets/`: `srs-navigator-actionbar.png`
  (inline action bar with a decompose instruction on a Functional Requirement) and
  `srs-navigator-iteration.png` (detail panel with traceability and a live Agent
  Activity conversation), plus a refreshed `srs-navigator.png` graph overview.
- **GitHub Pages — "Start from the system you already have" section**: documents the
  navigator's onboarding screen (Learn & Create Spec / Load Specification / Explore Demo),
  with a recreation of the start screen and the three-step Learn flow (scan the code,
  README, and docs, run the methodology, load the graph). Added to both `index.html` and
  the app subpage `app.html`, with matching navigation links.
- **App README — "Start from your current system" section**: documents the
  `learn` action and the unified spec start screen, including a "Learn from your codebase"
  entry in the feature list and a `learn` row in the actions table.

### Changed

- Project version bumped to **2.0** across `plugin.json`, the README badge, and the
  GitHub Pages version badges.
- **GitHub Pages hero animation reworked**: the task-bar demo now plays the methodology's
  derivation chain (Customer Problem to Customer Need via `/customer-needs`, then to a
  Functional Requirement via `/functional-requirements`) instead of a single decompose
  step. Renders the full chain statically under reduced motion.

### Notes

- The single source of truth for skills (canvas reads canonical `skills/<slug>/SKILL.md`
  at runtime) and the removal of the runtime "Sync Skills from GitHub" feature, previously
  staged under Unreleased, ship as part of this release.

[2.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v2.0

## [1.4] - 2026-06-29

### Added

- **SRS Navigator canvas app merged into this repo**: the interactive force-directed
  graph visualization (formerly `RafaelGorski/problem-based-srs-app`) now lives in
  [`.github/extensions/srs-navigator/`](.github/extensions/srs-navigator/). This repo is
  now both the methodology skill **and** the UX to navigate it.
- **`/live` skill** (`skills/live/`): launches the SRS Navigator canvas inside the GitHub
  Copilot app to visualize the current specification as an interactive graph.
- **Demo specification** `.spec/crm-system.json` for the navigator.
- **Canvas release workflow** `.github/workflows/release-canvas.yml`: tests, refreshes
  bundled skills, bumps the version, and publishes packaged extension archives.
- **Version/packaging scripts** `scripts/bump-version.mjs` and
  `scripts/package-extension.mjs`, plus a root `VERSION` file for the canvas app.

### Changed

- **Monorepo skill sync**: `sync-skills` now copies the canonical
  `skills/<slug>/SKILL.md` straight from this repo by default (network fetch remains
  available via `--remote`), so the agent plugin and the canvas app share one source of
  truth.

[1.4]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.4


## [1.3] - 2026-06-29

### Added

- **Build & Release Pipeline**: Validated, packaged releases on the GitHub Releases page
  - `scripts/build-plugin.py`: validates `plugin.json` and every `SKILL.md` frontmatter,
    extracts CHANGELOG release notes, and packages a `dist/<name>-vX.Y.zip` artifact
  - `.github/workflows/ci.yml`: validates the plugin and uploads the package on every
    push/PR to `main`
  - Release workflow now **builds, validates, packages, and attaches the plugin zip** to
    the GitHub Release, with notes auto-extracted from `CHANGELOG.md`
  - Release can be triggered by pushing a `vX.Y` tag (in addition to manual dispatch)
  - Release artifact ships **only the agent-required skills** (plugin manifest, agent, and
    skills); README, CHANGELOG, lockfiles, tests, build scripts, and docs are excluded

### Changed

- **GitHub Actions Release Workflow**: Made generic with input parameters
  - Workflow now accepts `version`, `release_name`, and `release_body` as inputs
  - All inputs are now optional (version defaults to `plugin.json`, notes to `CHANGELOG.md`)
  - Removed hardcoded v1.2 release information
  - Renamed workflow from "Create Release v1.2" to "Create Release"
- **Release Process Documentation**: Added comprehensive release instructions
  - Step-by-step guide added to `.github/copilot-instructions.md`
  - Includes version numbering, troubleshooting, and examples

[1.3]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.3

## [1.2] - 2026-03-13

### Added

- **Business Context (`/business-context`)**: New Step 0 of the Problem-Based SRS methodology
  - Establishes structured business context before problem discovery
  - Captures project identity, business principles, stakeholders, domain boundaries, constraints, and success criteria
  - Business principles classified as Mandatory/Guiding/Aspirational
  - Includes versioned document with amendment tracking
  - Inspired by the project constitution concept from [spec-kit](https://github.com/github/spec-kit)
  - Enhances and replaces the previous minimal `00-context.md` template
- **GitHub Actions Release Workflow**: Automated release creation via workflow_dispatch

### Changed

- Updated methodology flow from 5 steps to Step 0 + 5 steps (BC → CP → SG → CN → SV → FR)
- Updated `problem-based-srs` orchestrator skill with Step 0 integration
- Updated `problem-based-srs` agent with Step 0 detection heuristics and quality gates
- Updated `customer-problems` skill to reference Business Context as preferred input
- Updated `.github/copilot-instructions.md` with Step 0 skill reference and `/business-context` command
- Updated `AGENTS.md` with business-context in repository structure
- Updated `README.md` with Step 0 in methodology flow, commands, and diagrams

## [1.1] - 2026-02-20

### Added

- **Complexity Analysis (`/complexity-analysis`)**: Optional Axiomatic Design-based quality analysis
  - Independence axiom analysis (coupled/redundant/ideal specifications)
  - Design matrix evaluation
  - Information content assessment
  - This is an optional command, not part of the standard flow
- **Case Study Examples**: Condensed walkthroughs for learning
  - `crm-example.md` - CRM system from business context to requirements
  - `microer-example.md` - Renewable energy system (technical domain)
- **C/P Completeness Markers**: Enhanced traceability with Complete/Partial indicators
  - Two-stage validation (CP→CN and CN→FR)
  - Completeness rules for better coverage analysis
- **Problem Decomposition Guidance**: When and how to break down CPs
  - Decomposition triggers and heuristics
  - Numbering conventions (CP.1 → CP.1.1, CP.1.2)
  - Real examples from case studies
- **Expanded CN Outcome Classes**: Detailed examples for all four classes
  - Information (most common)
  - Control (supervisory systems)
  - Construction (artifact creation)
  - Entertainment (games, media)
- **Agile Integration Patterns**: New usage patterns for sprint workflows
  - Sprint 0 planning with CPs + Software Glance
  - Per-feature CP→CN→FR chains
  - Minimal viable SRS approach

### Changed

- Updated `zigzag-validator.md` with C/P completeness notation
- Updated `step1-customer-problems.md` with decomposition section
- Updated `step3-customer-needs.md` with expanded outcome examples
- Updated `SKILL.md` with new patterns and complexity reference
- Updated `docs/index.html` with new commands and resources
- Updated `README.md` with new features and version info

## [1.0] - 2026-02-04

### Added

- **AgentSkills Format**: Complete skill implementation following the [AgentSkills standard](https://agentskills.io) for compatibility with GitHub Copilot, Claude Code, Claude.ai, and other AI agents
- **5-Step Methodology**: Full implementation of the Problem-Based SRS methodology:
  - Step 1: Customer Problems (CP) - Identify the WHY
  - Step 2: Software Glance - High-level solution overview
  - Step 3: Customer Needs (CN) - Define the WHAT
  - Step 4: Software Vision - Architecture and constraints
  - Step 5: Functional Requirements (FR) - Specify the HOW
- **ZigZag Validator**: Traceability validation ensuring all requirements trace back to business problems
- **Python Test Infrastructure**: Tests for validating skills are maintained in the [isolated tests repository](https://github.com/RafaelGorski/Problem-Based-SRS-Isolated-Tests)
- **Reference Documentation**: Detailed guides for each methodology step in `skills/problem-based-srs/references/`
- **AgentSkills Best Practices**: Documentation on creating and maintaining skills following the open standard
- **Multi-Agent Support**: Installation instructions for GitHub Copilot, Claude Code, Claude.ai, Gemini CLI, Cline, Goose, and Codex
- **Content Restrictions**: Guidelines for FR/NFR file generation to maintain consistency
- **Website**: Static site in `docs/` with methodology overview and quick start guide

### Changed

- Consolidated to AgentSkills format only (removed legacy prompt formats)
- Moved copilot instructions to standard `.github` location
- Renamed coordinator file to `problem-based-srs.md` for clarity
- Ensured step5 reference uses single H1 for valid markdown structure

### Contributors

This release includes contributions from the following PRs:

- PR #1: Add Problem-Based SRS prompts and AI agent integration
- PR #2: Move copilot instructions to standard .github location
- PR #4: Rename srs-coordinator.prompt.md to problem-based-srs.md
- PR #5: Add Python test infrastructure for AgentSkills validation (moved to [isolated tests repo](https://github.com/RafaelGorski/Problem-Based-SRS-Isolated-Tests))
- PR #6: Restore README documentation and integrate new installation tips
- PR #7: Ensure step5 reference uses single H1 for valid markdown structure
- PR #8: Add content restrictions to FR/NFR file generation
- PR #9: Remove prompts, consolidate to AgentSkills format only
- PR #10: Add AgentSkills reference documentation and update copilot instructions

[1.2]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.2
[1.1]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.1
[1.0]: https://github.com/RafaelGorski/Problem-Based-SRS/releases/tag/v1.0.0
