# AI Features Playbook

This playbook defines how AI is allowed to behave in OpsPilot Rescue.

## AI is here to do

- investigate context
- compare options
- summarize risk
- prioritize next-best actions
- orchestrate demo-safe external agent flows

## AI is not here to do

- calculate invoice totals
- decide ledger truth
- mutate financial facts without deterministic validation
- become the primary product instead of the operator layer

## Required behavior for agentic features

Every meaningful AI feature should show:

1. a goal
2. inputs from deterministic system state
3. multi-step reasoning or tool use
4. a concrete result
5. an audit trail

## Preferred outputs

- ranked financing options
- receivables risk summaries
- vendor spike comparisons
- insurance renewal warnings
- concise recommended next actions

## TinyFish usage

- default to mock mode for build velocity and demo safety
- only use live mode when endpoint config is verified
- keep results normalized into internal schemas

## Acceptance test

Ask:

- would a judge clearly see that an autonomous system did real work?
- would a small-business owner see why this saves time or money?
