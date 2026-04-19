<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Before changing framework-level behavior,
read the relevant guide in `node_modules/next/dist/docs/` and check for
deprecations.
<!-- END:nt extjs-agent-rules -->

# OpsPilot Rescue Agent Rules

This repository is no longer a generic restaurant-ops demo. The active mission
is to ship an autonomous SMB survival agent for the O1 Summit fintech track.

## Product target

Build and demo:

- collections / receivables recovery
- financing scout
- vendor / insurance optimization

## Mandatory posture

- Optimize for hackathon reliability and clarity.
- Prefer additive changes over broad refactors.
- Keep deterministic finance logic intact.
- Use TinyFish mock mode by default unless live mode is explicitly verified.
- Treat `.claude` as canonical and `.kiro/steering` as a thin mirror.
- Keep the hero story focused on: stressed business -> rescue queue -> one-button survival scan -> financing options -> audit timeline.

## Read order before work

1. `.claude/README.md`
2. `.claude/PRD.md`
3. `.claude/context/current-state.md`
4. `.claude/context/12hour-execution.md`
5. `docs/rescue-demo-runbook.md`
6. The relevant playbook or checklist

## Do not break

- invoice generation and mark-paid behavior
- finance ledger writes
- webhook dedupe
- existing Supabase schema contracts

## Preferred implementation style

- Route handlers validate and delegate.
- Services own mutations.
- Queries own read models.
- AI assists decisions and actions, but not financial truth.
