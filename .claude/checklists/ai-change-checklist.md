# AI Change Checklist

Use this before merging any AI- or agent-related change.

## Product fit

- [ ] Does this clearly support collections, financing scout, or vendor /
      insurance optimization?
- [ ] Does this strengthen the survival-agent story rather than broaden the
      product?

## Safety and truth

- [ ] Does deterministic business logic still own financial truth?
- [ ] Is AI only investigating, summarizing, ranking, or orchestrating?
- [ ] Does the change avoid AI ownership of invoice totals or ledger truth?

## TinyFish discipline

- [ ] Does the change work in mock mode?
- [ ] If live mode is touched, is it fully env-gated?
- [ ] Are unverified TinyFish endpoints avoided or clearly configurable?

## Auditability

- [ ] Are important actions visible in `ai_actions` or equivalent audit output?
- [ ] Will a judge understand what the agent did and why?

## Demo quality

- [ ] Does this make the 5-minute demo stronger?
- [ ] If it fails, is there a clear fallback path?
