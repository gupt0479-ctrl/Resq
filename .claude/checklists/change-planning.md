# Change Planning Checklist

Use this before starting meaningful work.

## Scope

- [ ] Which of the three survival pillars does this change support?
- [ ] Is this demo-critical, sponsor-critical, or optional polish?
- [ ] Can this be implemented additively?

## Ownership

- [ ] Which teammate owns the surrounding surface?
- [ ] Does this risk merge conflicts with active work?
- [ ] Is the change narrow enough to review quickly?

## Technical impact

- [ ] Does this touch deterministic invoice or finance logic?
- [ ] Does this add new env requirements?
- [ ] Does this require seed or runbook updates?

## Demo impact

- [ ] Does this improve the private-judge story?
- [ ] Does it improve the public-stage story?
- [ ] What is the fallback if this change partially fails?

## Verification

- [ ] What commands will prove the change?
- [ ] What manual demo step should be re-rehearsed after it lands?
