# Repository Topology — OpsPilot ↔ Resq

## Canonical Repos

| Product | App Repo (canonical) | Lovable Repo | Vercel Project | Supabase Project |
|---------|---------------------|-------------|----------------|-----------------|
| OpsPilot | `gupt0479-ctrl/opspilot` | `gupt0479-ctrl/ai-operations-companion` | TBD | TBD |
| Resq | `gupt0479-ctrl/Resq` | `gupt0479-ctrl/Resq-lovable` | TBD | TBD |

## Canonical Source of Truth

- **OpsPilot**: `gupt0479-ctrl/opspilot` is the canonical repo. Restored from tag `opspilot-hackathon-2026-04-14` (commit `6a62eb1`). The Lovable repo `ai-operations-companion` is a design companion, not the source of truth.
- **Resq**: `gupt0479-ctrl/Resq` is the canonical repo. All active development happens here. The Lovable repo `Resq-lovable` is a design companion that needs OpsPilot branding scrubbed.

## Target Remote State

Each local clone should have exactly one `origin` remote pointing to its own GitHub repo:

```
~/projects/hackathon/Resq      → origin: git@github.com:gupt0479-ctrl/Resq.git
~/projects/hackathon/opspilot  → origin: git@github.com:gupt0479-ctrl/opspilot.git
```

No local clone should reference the other product's remote.

## Git Remote Commands

### Resq (this workspace)

```bash
# Verify current remote (likely still points to opspilot)
git remote -v

# Fix it
git remote set-url origin git@github.com:gupt0479-ctrl/Resq.git

# Confirm
git remote -v
# Expected: origin  git@github.com:gupt0479-ctrl/Resq.git (fetch)
#           origin  git@github.com:gupt0479-ctrl/Resq.git (push)
```

### OpsPilot (separate workspace)

```bash
# In ~/projects/hackathon/opspilot
git remote set-url origin git@github.com:gupt0479-ctrl/opspilot.git

# Confirm
git remote -v
# Expected: origin  git@github.com:gupt0479-ctrl/opspilot.git (fetch)
#           origin  git@github.com:gupt0479-ctrl/opspilot.git (push)
```

## Lovable Repo Mapping

| Lovable Repo | Maps To | Status |
|-------------|---------|--------|
| `ai-operations-companion` | OpsPilot | Keep as-is |
| `Resq-lovable` | Resq | Needs OpsPilot branding scrub (Codex task) |

## Prerequisites

- Ensure `gupt0479-ctrl/Resq` exists on GitHub. If the repo was renamed from `opspilot`, the URL should already resolve — verify at `https://github.com/gupt0479-ctrl/Resq`.
- Ensure `gupt0479-ctrl/opspilot` exists on GitHub for the restored hackathon codebase.
