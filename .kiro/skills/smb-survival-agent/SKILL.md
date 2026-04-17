---
name: smb-survival-agent
description: Build and operate the OpsPilot Rescue hackathon product: an autonomous SMB survival agent focused on collections, financing scout, and vendor or insurance optimization.
---

# SMB Survival Agent Skill

## Mission

Ship and improve a single focused product:

**OpsPilot Rescue**

an autonomous SMB survival agent for the fintech hackathon track.

## Core pillars

1. Collections
2. Financing Scout
3. Vendor / Insurance Optimization

## Operating rules

- preserve deterministic finance logic
- prefer additive changes
- keep TinyFish mock mode available
- optimize for judge comprehension over feature breadth

## Tool sequence

When working on a task:

1. read the PRD and current-state docs
2. identify which survival pillar the task supports
3. confirm whether the task changes deterministic truth or only agent behavior
4. implement the smallest credible change
5. verify lint, typecheck, tests, and demo path

## Fallback behavior

If live integrations are uncertain:

- switch to mock mode
- keep outputs deterministic
- preserve the product story

## Demo-safe constraints

- the app must never require unverified live TinyFish endpoints to demo
- the audit trail must remain visible
- the system should always be able to explain what the agent did
