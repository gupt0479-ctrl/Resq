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

## 2026-04-18 - Financing Scout Is The Hero Live Lane

- Decision: make financing scout the only required live TinyFish workflow.
- Why: it is the clearest fintech proof, the most repeatable public-web flow,
  and the least fragile external path for the hackathon demo.

## 2026-04-18 - `.claude` Is Canonical And `.kiro/steering` Mirrors It

- Decision: keep `.claude` as the only canonical agent-facing source of truth.
- Why: duplicating planning guidance across `.claude` and `.kiro` increases
  drift and agent hallucination risk.

## 2026-04-18 - Archive Stale Agent Docs Aggressively

- Decision: move stale, legacy, or human-only docs out of the active read path.
- Why: the docs were directionally correct but too noisy; reducing the active
  surface improves agent reliability under time pressure.
