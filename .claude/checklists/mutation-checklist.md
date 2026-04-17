# Mutation Checklist

Use this before changing data or deterministic service logic.

## Must stay deterministic

- [ ] invoice generation
- [ ] payment marking
- [ ] finance transaction creation
- [ ] webhook dedupe

## Questions to answer

- [ ] Is this change truly required for the survival-agent demo?
- [ ] Can the same effect be achieved with a read model or seeded data instead?
- [ ] Does this introduce any hidden risk into money-related flows?

## If AI is involved

- [ ] AI is not deciding financial truth
- [ ] AI output is advisory or auditably orchestrated
- [ ] failure mode is explicit and recoverable

## Before merge

- [ ] Added or updated tests if behavior changed materially
- [ ] Verified affected route manually
- [ ] Confirmed the demo path still works
