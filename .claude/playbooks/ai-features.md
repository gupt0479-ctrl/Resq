# AI Features Playbook

Use this file when designing or implementing AI functionality.

Keywords:

- ai
- summary
- classify
- feedback
- recovery
- orchestrator
- prompt
- model

## Current Status

AI is not the first milestone priority. The deterministic data and finance foundation must be trustworthy first.

## Allowed AI Work

- classify feedback
- draft follow-up messages
- suggest recovery actions
- generate manager summaries from existing facts

## Forbidden AI Work

- creating or editing invoice totals
- deciding payment amounts
- setting reservation or invoice statuses directly
- writing finance ledger entries

## Minimum Contract For Any AI Feature

Every AI task should have:

1. a stable input shape
2. a Zod output schema
3. provider isolation behind an adapter
4. response validation
5. a safe failure mode
6. persistence for auditability if the feature matters to the product

## Preconditions Before AI Summary Work

Do not start summary work until:

- live Supabase data exists
- finance summary routes are working
- there is at least one paid invoice with a revenue row
- there are real overdue or pending examples to summarize

## Common Mistakes To Avoid

- building AI around mock facts
- letting prompts substitute for missing domain modeling
- calling provider SDKs directly from route handlers or page code
