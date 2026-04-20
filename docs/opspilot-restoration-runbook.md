# OpsPilot Restoration Runbook

> Restores the OpsPilot repository from the hackathon snapshot preserved in the
> Resq repo history. This runbook extracts the codebase at the tagged commit
> `opspilot-hackathon-2026-04-14` (commit `6a62eb1`) and pushes it as a clean
> `main` branch to the `opspilot` GitHub repo.

## Prerequisites

- Git CLI installed and SSH key configured for `github.com`
- The tag `opspilot-hackathon-2026-04-14` has been pushed to the Resq remote
  (see Phase 1 tasks — `git push origin opspilot-hackathon-2026-04-14`)
- The GitHub repo `gupt0479-ctrl/opspilot` exists (create it first if needed)
- The local Resq clone is at `~/projects/hackathon/Resq`

---

## Step 1: Clone from the Resq directory using the tag

The Resq repo contains the full commit history, including the original OpsPilot
commits. We clone it locally with `--no-checkout` so we can pick the exact
snapshot we want.

```bash
cd ~/projects/hackathon
git clone --no-checkout ~/projects/hackathon/Resq opspilot-restore
cd opspilot-restore
```

## Step 2: Check out the hackathon snapshot

This puts the working tree into the exact state that was shown to judges on
April 14, 2026.

```bash
git checkout opspilot-hackathon-2026-04-14
```

## Step 3: Create a clean main branch

```bash
git checkout -b main
```

## Step 4: Set the remote to the OpsPilot repo

Remove the inherited Resq origin and point to the OpsPilot GitHub repo.

```bash
git remote remove origin
git remote add origin git@github.com:gupt0479-ctrl/opspilot.git
```

## Step 5: Force push to establish the clean main branch

```bash
git push -u origin main --force
```


> **⚠️ Force Push Warning:** Step 5 uses `--force`, which rewrites the remote
> `main` branch. Any existing commits on `origin/main` that are not ancestors of
> the tagged commit will be permanently lost from the remote. Make sure the
> remote repo is either empty or that you have no work there you need to keep.

---

## Post-Restore Verification

Run these checks inside the `opspilot-restore` directory to confirm the
restoration is correct.

### 1. Install dependencies and build

```bash
npm install
npm run build
```

Both commands should exit with code 0 (you will need the correct `.env` values
for OpsPilot — see `docs/opspilot-deploy-checklist.md`).

### 2. Verify no Resq-era artifacts

The restored tree should contain zero references to Resq-specific features.
Run these checks and confirm each returns no matches:

```bash
# No Resq branding
grep -ri "resq" src/ || echo "✅ No Resq branding found"

# No cash forecast engine
ls src/lib/services/forecast-engine.ts 2>/dev/null && echo "❌ forecast-engine.ts exists" || echo "✅ No forecast-engine.ts"

# No cash_forecast_snapshots references
grep -r "cash_forecast_snapshots" src/ || echo "✅ No cash_forecast_snapshots references"

# No rescue queue references
grep -ri "rescue" src/ || echo "✅ No rescue queue references"
```

### 3. Verify remote is correct

```bash
git remote -v
```

Expected output:

```
origin  git@github.com:gupt0479-ctrl/opspilot.git (fetch)
origin  git@github.com:gupt0479-ctrl/opspilot.git (push)
```

### 4. Verify branch and tag

```bash
git branch
# Should show: * main

git log --oneline -1
# Should show commit 6a62eb1 — "Landing page ui fix"
```

### 5. Verify landing page branding

Open the landing page source and confirm it shows OpsPilot restaurant/SMB
operations branding, not Resq fintech branding:

```bash
grep -i "opspilot\|operations" src/app/page.tsx || echo "Check landing page manually"
```

---

## Quick Reference — Full Command Sequence

Copy-paste this block to run the entire restoration in one go:

```bash
cd ~/projects/hackathon
git clone --no-checkout ~/projects/hackathon/Resq opspilot-restore
cd opspilot-restore
git checkout opspilot-hackathon-2026-04-14
git checkout -b main
git remote remove origin
git remote add origin git@github.com:gupt0479-ctrl/opspilot.git
git push -u origin main --force
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `fatal: reference is not a tree: opspilot-hackathon-2026-04-14` | Tag hasn't been created yet. Run `git tag opspilot-hackathon-2026-04-14 6a62eb1` in the Resq repo first. |
| `Permission denied (publickey)` on push | SSH key not configured for GitHub. Run `ssh -T git@github.com` to test. |
| `npm run build` fails | Ensure `.env.local` has the OpsPilot-specific env vars (Supabase URL/key, Google AI key). |
| Remote repo doesn't exist | Create `gupt0479-ctrl/opspilot` on GitHub first (empty repo, no README). |
| `opspilot-restore` directory already exists | Remove it first: `rm -rf ~/projects/hackathon/opspilot-restore` |
