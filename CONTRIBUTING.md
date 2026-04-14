# Contributing

## Branching

- Do not commit directly to `main`
- Use focused branches: `feat/...`, `fix/...`, `chore/...`

## Before opening a PR

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

## PR standard

- Keep the change small and reviewable
- Explain user-visible impact clearly
- Call out demo-critical risk explicitly
- Do not mix refactors with deadline-critical fixes

## Commit style

- `feat: add feedback recovery approval flow`
- `fix: make mark-paid create finance row idempotently`
- `docs: align demo handoff docs`

## Secrets

- Never commit `.env.local`
- Never expose service-role or API keys to client code
- Rotate any leaked credential immediately
