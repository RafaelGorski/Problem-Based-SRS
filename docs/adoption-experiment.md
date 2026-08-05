# External adoption experiment

Issue #142 requires one named public channel, one predeclared signal, and a fixed
observation window. The repository can validate that contract, but it cannot publish
the post or manufacture an external confirmation.

Copy `evals/fixtures/adoption-experiment.template.json`, fill every field before
publication, and validate it with:

```bash
node evals/tools/adoption-experiment.mjs adoption-experiment.json --json contract-result.json
```

The tool returns `ready_for_publication` only when the channel, audience, before/after
states, released evidence, measurement source, threshold, exclusions, and both start/end
readings are present. `result` remains `not_recorded` until the observation window closes;
record `positive` or `zero` and revise the adoption hypothesis for either outcome.
