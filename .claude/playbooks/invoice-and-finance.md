# Invoice and Finance Playbook

This is the most important technical area to preserve.

## Keep stable

- invoice generation
- mark-paid flow
- finance transaction creation
- idempotency and status guards

## Why it matters

The product is now pitched as fintech. If the financial backbone feels vague or
unsafe, the whole demo loses credibility.

## Allowed changes

- read-model shaping
- labels and product copy
- rescue-specific summaries and KPIs
- auditability improvements

## Avoid unless there is a real bug

- changing invoice math
- changing due-date semantics casually
- changing how payment creates ledger rows
- replacing deterministic logic with AI outputs

## Demo message

The survival agent can investigate and recommend, but the financial system of
record remains deterministic and trustworthy.
