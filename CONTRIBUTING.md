# Contributing

## Working mode

This repo is in hackathon mode. Bias toward:

- small, mergeable changes
- demo reliability
- explicit handoff notes
- minimal-risk implementation

## Branching

- Do not commit directly to `main`.
- Prefer focused branches:
  - `feat/survival-agent-*`
  - `fix/demo-*`
  - `docs/hackathon-*`
  - `chore/deploy-*`

## PR standard

Every PR should answer:

1. What survival-agent capability changed?
2. What demo path does this affect?
3. What was verified locally?
4. What is still risky?

## Before opening a PR

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

If the change touches demo-critical flows, also run:

```bash
bash scripts/demo-smoke.sh
```

## Commit style

- `feat: add tinyfish demo-run route`
- `fix: keep ai_actions logging demo-safe`
- `docs: rewrite prd for smb survival agent`

## Secrets

- Never commit `.env.local`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`.
- Never expose TinyFish or AWS secrets to client code.
- If a secret leaks, rotate it immediately.

## Scope discipline

Do not mix these in one PR:

- broad refactor
- demo feature
- deployment changes
- schema experiments

Keep changes narrow enough that a teammate can reason about them fast.
