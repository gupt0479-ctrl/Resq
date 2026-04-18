# Bugfix Spec: TinyFish Financing Lane Stability

Reference canon first:

- `.claude/README.md`
- `.claude/context/12hour-execution.md`
- `.claude/playbooks/tinyfish-and-agent.md`

## Current behavior

The financing scout already exists, but stability risks remain when live TinyFish
responses are weak, when docs drift from code, or when the route contract is not
explicit enough for frontend and demo work.

## Expected behavior

- `POST /api/tinyfish/demo-run` remains stable for `scenario="financing"`
- financing offers always preserve the documented normalized fields
- mock, misconfigured, live, and degraded behavior stay honest
- demo-safe fixtures remain available even when live TinyFish is unstable

## Unchanged behavior

- Supabase remains the source of truth
- TinyFish does not own deterministic finance truth
- vendor and insurance can remain fixture-backed during hybrid live mode
