# Change Gate Checklist

Use this before starting or merging meaningful work.

## Product fit

- [ ] Does this strengthen collections, financing scout, or vendor/insurance optimization?
- [ ] Does this improve the rescue story instead of broadening the product?
- [ ] Would a judge understand why this matters in under one minute?

## Finance truth

- [ ] Deterministic services still own invoice and ledger truth
- [ ] AI is advisory, investigative, or orchestrative only
- [ ] This does not introduce hidden money-flow risk

## TinyFish discipline

- [ ] Mock mode still works
- [ ] Live mode is still fully env-gated
- [ ] `mode`, `degradedFromLive`, and `warning` remain honest
- [ ] No unverified endpoint assumptions were introduced

## Auditability

- [ ] Important agent work is visible in `ai_actions` or equivalent audit output
- [ ] Failure mode is legible and recoverable

## Demo value

- [ ] This improves the 90-second demo
- [ ] This improves the 5-minute demo
- [ ] There is a fallback if the change partially fails
