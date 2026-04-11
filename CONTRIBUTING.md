# Contributing

## Branching

- Never commit directly to `main`.
- Create feature branches from `main` using this format:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`

## Local Setup

```bash
npm ci
npm run lint
npm run build
```

## Pull Request Rules

- Keep PRs focused and reasonably small.
- Rebase your branch on latest `main` before opening PR.
- Ensure CI is green before requesting review.
- At least 1 teammate review before merge.

## Commit Message Style

Use clear imperative messages, for example:

- `feat: add incident timeline panel`
- `fix: handle empty table state`
- `chore: update eslint config`

## Secrets Safety

- Never commit `.env` files or API keys.
- Use `.env.local` for local development.
- Rotate any key immediately if it was exposed.
