# SMB Survival Agent Spec

## Product

OpsPilot Rescue → Resq

## Goal

Help small businesses survive short-term financial stress by autonomously:

- recovering receivables
- comparing financing options
- finding vendor and insurance savings opportunities

## Target user

Owner-operator or general manager of a small service business with limited time
and weak tolerance for cash disruption.

## Happy path

1. system detects overdue cash or financial stress
2. operator opens rescue queue
3. survival scan runs
4. agent returns normalized outputs across the three pillars
5. operator sees the audit trail and next-best actions

## Why this qualifies as agentic AI

The product is not a single LLM call. It:

1. reads internal business context
2. invokes external-tool or external-data steps through TinyFish or mock
   equivalents
3. sequences multiple actions
4. produces decisions and outputs
5. records an auditable result

## System boundaries

### Deterministic core

- invoice creation
- payment handling
- finance ledger writes

### Agent layer

- investigation
- comparison
- prioritization
- external option gathering

## Demo-safe requirement

Mock mode must remain available and credible at all times.

## Sponsor alignment

### TinyFish

TinyFish is used for web-agent style search/fetch/agent scaffolding.

### AWS

The app is packaged for AWS-friendly deployment.

### Kiro

This spec and the associated skill file serve as the project’s Kiro-facing
source of truth.
