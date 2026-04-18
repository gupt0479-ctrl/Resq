---
inclusion: fileMatch
fileMatchPattern: "**/app/api/**"
---

# Kiro Mirror: API Patterns

This file is a thin mirror. See `.claude/playbooks/backend-and-api.md`.

Use these rules:

- validate and delegate
- keep business logic out of route handlers
- preserve `mode`, `degradedFromLive`, and `warning`
- never let audit logging failure 500 the route
