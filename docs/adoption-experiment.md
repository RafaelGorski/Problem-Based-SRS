# External adoption experiment

## Registration status: blocked, not preregistered

Do not recruit participants or start an observation window yet. Issue #185 is the single
source of truth for #404's contract and names a threshold of one qualifying signal, but it
does not currently freeze a contract ID, exact cohort size and eligibility, published asset
tags and digests, or fixed UTC bounds. The
open #404 acceptance text's five-maintainer target also conflicts with #142's requirement
for an external participant. Reconcile those values in #185 before treating this document
as a preregistration; do not silently copy the five-person target or infer missing values.

Once #185 is frozen, copy its contract identifier, cohort, signal, threshold, exclusions,
and UTC bounds verbatim into the run record. The `preregisteredAt` UTC timestamp must be
earlier than `observationStart` and the first participant run. Any change after registration
needs a new versioned contract before observation begins.

## Privacy-safe observation record

Use [`adoption-observation.schema.json`](adoption-observation.schema.json) for raw
observations. Keep one row per intended participant, including ineligible and abandoned
runs. Use only opaque participant labels, record UTC timestamps, and retain no names,
usernames, email addresses, account IDs, IP addresses, or unrelated personal data. The
`evidenceSha256` field identifies a separately stored, redacted artifact or transcript;
do not place private source material in the repository. Each asset entry identifies the
published plugin or canvas bytes by tag and SHA-256 digest. Never use a working-tree build.

## Deterministic outcome rule

After the registered window closes, count at most one signal for each eligible participant.
A signal qualifies only when it is timestamped inside the fixed UTC bounds and is supported
by the evidence definition copied from #185. Classify the result as:

- `positive` when at least one qualifying signal is recorded;
- `zero` when the full window closed with no qualifying signal;
- `inconclusive` when the window closed but required observations or evidence cannot be
  classified against the contract;
- `blocked` when the contract is not frozen or the observation window is not complete.

Do not extend the window, replace a missing participant, reinterpret a signal, or rerun a
negative or inconclusive result under the same contract. Preserve the observations and
publish the count, threshold, classification, and contract ID together so the result can be
recomputed. Store the final `outcome` object from the schema alongside the raw observations;
do not create one before the window closes.
Repository activity, maintainers, bots, and automation do not count unless the frozen
eligibility definition explicitly says otherwise.

To reproduce the classification from a recorded run, use:

```bash
node evals/tools/score-adoption-observations.mjs adoption-observations.json
```

The command prints the contract ID, classification, qualifying count, and any reasons. It
exits non-zero for an invalid/frozen-contract mismatch, an unfinished window, or an
inconclusive record. A complete `zero` result exits zero: negative outcomes are valid
measurements, not retries. The scorer rejects a stored outcome that disagrees with its
recalculation; attach its JSON output alongside the schema-backed observations under
#142. The command cannot verify human eligibility or the content behind a digest; those
still require the referenced redacted evidence and reviewer confirmation.

## Validate the contract

The repository's contract validator checks completeness before publication; it does not
publish a post, recruit participants, or manufacture an external confirmation. Copy
`evals/fixtures/adoption-experiment.template.json`, fill every field from the frozen
contract, and validate it before publication:

```bash
node evals/tools/adoption-experiment.mjs adoption-experiment.json --json contract-result.json
```

Do not treat `ready_for_publication` as evidence that an experiment ran or as an outcome.
Keep the validator's `result` as `not_recorded` until the observation window closes. The
validator checks contract completeness, not the scored observation record; retain
inconclusive classifications in the schema-backed run record rather than treating them as
zero or rerunning the experiment.
