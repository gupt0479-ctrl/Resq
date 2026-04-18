# Merge Notes

Use this before pulling, rebasing, or opening a PR during the hackathon.

## Core principle

The repo is undergoing a product pivot and a documentation reset at the same
time. Avoid broad merges that silently reintroduce the old restaurant-first
story.

## Merge rules

1. Commit or stash local work before syncing.
2. Prefer one clear integration step instead of many tiny conflict resolutions.
3. Treat docs, seeds, env config, and TinyFish scaffolding as first-class merge
   surfaces.
4. Never blindly accept older restaurant copy over newer survival-agent docs.

## High-risk collision areas

- sidebar and navigation
- landing page copy
- dashboard read models
- TinyFish routes and env helpers
- seed files and runbooks

## Safe merge strategy

- keep deterministic invoice and finance logic
- keep additive schema changes only
- prefer preserving the newest survival-agent documentation

## After any merge

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
bash scripts/demo-smoke.sh
```
