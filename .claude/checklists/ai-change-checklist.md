# AI Change Checklist

Run this before shipping any AI-related change.

## Verify

- the feature is actually needed now
- the task is allowed under the AI boundary
- a Zod output schema exists
- failure of the model call does not corrupt product behavior
- model output is validated before persistence or rendering
- no finance or workflow truth depends on model judgment

## Stop If

- the AI feature would own invoice amounts
- the AI feature would choose status transitions
- the AI feature exists only because deterministic data is still missing
