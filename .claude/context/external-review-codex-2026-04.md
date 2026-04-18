# External Review Notes — Codex — 2026-04

This file captures the strongest external-review style guidance that should
shape the hackathon build.

## Main conclusions

1. The repo is stronger as a fintech workflow product than as a restaurant demo.
2. Broad product scope hurts judge comprehension.
3. The winning version is one narrow agentic workflow with a strong business
   pain story.
4. The best reusable technical assets are invoices, finance, integrations, and
   deterministic mutations.

## Product recommendation

Ship:

**Autonomous SMB survival agent**

Do not ship:

- a broad restaurant dashboard
- a generic AI assistant
- an unfocused operations suite

## Architecture recommendation

- preserve deterministic money logic
- add agent scaffolding additively
- keep live integrations optional and mockable
- make the audit trail part of the product story

## Demo recommendation

The strongest story is:

1. business under cash pressure
2. agent investigates
3. financing / vendor / insurance options appear
4. operator sees a concrete survival path

## What this means in practice

- narrow the nav
- narrow the pitch
- narrow the data story
- keep one memorable flow
