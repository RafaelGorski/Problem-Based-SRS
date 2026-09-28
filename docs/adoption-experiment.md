# External adoption experiment

Issue #142 requires one named public channel, one predeclared signal, and a fixed
observation window. The repository can validate that contract, but it cannot publish
the post or manufacture an external confirmation.

Copy `evals/fixtures/adoption-experiment.template.json`, fill the experiment plan before
publication, keep `publicPostUrl`, `publicationAt`, readings, and `result` unset, then
validate it with:

```bash
node evals/tools/adoption-experiment.mjs adoption-experiment.json \
  --phase prepublication --json contract-result.json
```

The tool returns `ready_for_publication` only when the named channel, audience, before/after
states, published evidence, UTC observation window, pre-registration timestamp, threshold
of one, exclusions, and non-qualifying signals are present. It also requires registration
before the future observation window and requires the public post URL and outcome fields to
remain unset. Empty-string and template placeholders are rejected.

At publication, record the public post URL and its UTC publication timestamp. After the
declared window has elapsed, record numeric start/end readings and the result, then validate
the outcome:

```bash
node evals/tools/adoption-experiment.mjs adoption-experiment.json \
  --phase outcome --json outcome-result.json
```

The outcome phase rejects premature readings, a window that has not elapsed, and a
classification that conflicts with the predeclared threshold. Record `positive`, `zero`,
or `inconclusive`; revise the adoption hypothesis for either a positive or zero result.
The validator records evidence state only; it cannot publish a post or manufacture an
external confirmation.
