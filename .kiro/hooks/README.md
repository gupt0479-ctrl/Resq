# Shared Kiro Hooks

This folder contains the shared hook commands for the `resq` local
agent in `.kiro/agents/resq.json`.

Why this layout:

- `.claude` remains the product canon.
- `.kiro/steering` remains a thin mirror.
- hook logic stays lightweight and deterministic.

The current shared hooks cover:

1. canon reminder before broad work
2. secret/config hygiene after writes
3. demo-safety reminders after writes and at agent stop

Kiro IDE note:

- Official Kiro docs describe hooks through the Agent Hooks UI and agent
  configuration.
- This repo keeps the shared commands in version control so the team can reuse
  them consistently.
- If your Kiro workspace does not automatically surface local agent hooks,
  open the Hook UI and mirror the commands from the local agent definition.
