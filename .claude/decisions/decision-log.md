# Decision Log

Append short factual entries here when the build learns something important.

## 2026-04-17 - Pivot To SMB Survival Agent

- Decision: stop positioning the app as a restaurant-ops dashboard and narrow
  the hackathon build to an autonomous SMB survival agent.
- Why: the fintech track and agentic-AI requirement reward a sharp,
  high-pain financial workflow more than a broad operational product.

## 2026-04-17 - Keep Deterministic Finance Backbone

- Decision: preserve invoice math, payment handling, and finance ledger logic
  from the existing app.
- Why: those flows are already the strongest and most credible technical assets
  in the repo.

## 2026-04-17 - TinyFish Mock Mode Is Mandatory

- Decision: every TinyFish-backed feature must have a deterministic mock mode.
- Why: the demo must survive external service issues and unverified endpoint
  details.

## 2026-04-17 - Additive Schema, Not Broad Renames

- Decision: keep legacy table names such as `appointments` where they already
  work; adapt the product narrative in docs and UI instead of renaming the data
  model.
- Why: broad schema churn is too risky for the hackathon window.

## 2026-04-17 - One Hero Flow Over Breadth

- Decision: optimize for one memorable demo flow that proves agentic fintech
  value.
- Why: hackathon judges reward clarity, execution, and product sharpness more
  than feature count.
