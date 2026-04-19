# OpsPilot Rescue PRD

**Version:** 2.0  
**Status:** Active hackathon source of truth  
**Product:** OpsPilot Rescue  
**Track:** Fintech  
**Event:** O1 Summit 2026  
**Build window:** 24 hours  

This document supersedes the earlier restaurant-ops framing. The codebase still
contains legacy restaurant terminology in places, but the product we are
building and pitching is now an autonomous SMB survival agent.

---

## 1. Product Definition

OpsPilot Rescue is an autonomous fintech copilot for small businesses under
cash pressure. It detects near-term survival risk, investigates financial
context, and helps the operator act before the business falls behind.

The hackathon demo combines three connected agentic workflows:

1. **Collections**
   Recover overdue or at-risk receivables.
2. **Financing Scout**
   Gather and compare short-term financing options.
3. **Vendor / Insurance Optimization**
   Surface savings opportunities from vendor price changes and insurance
   renewals.

The product must satisfy the event's hard requirement for agentic AI: it must
take multi-step actions, use tools or APIs, and make decisions without needing
human input after every step.

---

## 2. Why This Product Exists

Small businesses often operate with weak financial margin for error. When cash
arrives late and costs rise at the same time, the owner is forced into manual,
fragmented work:

- checking overdue invoices
- comparing financing offers
- reviewing vendor price changes
- dealing with insurance renewals
- deciding what to do first under time pressure

Existing software usually stops at dashboards or raw alerts. OpsPilot Rescue is
designed to go one step further: it investigates and proposes or executes
survival actions.

**Positioning:** Large companies retain consultants, analysts, and finance staff.
Small business owners cannot afford that. OpsPilot Rescue is the always-on AI
operator that fills those roles — the equivalent of the advisor Google keeps on
retainer, built for the owner running the front desk, the kitchen, and the books
at the same time.

### 2.1 Core Pain Points

| Pain Point | Owner Experience Today | How OpsPilot Addresses It |
|---|---|---|
| **Unpaid and delayed invoices** | Customers pay weeks, months, or never — owners chase manually and lose track | Automated reminders, overdue flags, and cash-flow risk alerts surface risk before it becomes a write-off |
| **Cross-border communication gaps** | Language barriers, timezone confusion, and missed messages with international customers or suppliers | AI-drafted follow-ups adapt tone and clarity; flag communication threads gone cold |
| **Affordable hiring** | Finding qualified staff at a sustainable cost is hard; owners waste time on unsuitable candidates | Future: AI-assisted job description drafts and candidate screening surfaced to the dashboard |
| **Marketing and social media** | Many owners lack the time or skill to advertise on social platforms or post job listings | Future: AI-drafted posting copy and suggested channels reduce the skill gap |
| **Manual disconnected workflow** | Reservations, invoices, payments, and follow-ups tracked across disconnected tools and memory | Full reservation → invoice → payment → feedback loop automated so nothing drops |
| **No expert operational guidance** | Enterprise companies employ consultants; small businesses cannot | AI agents surface the same recommendations — flag risks, suggest next actions, draft messages — without a retainer |

---

## 3. Hackathon Fit

### 3.1 Fintech fit

This product qualifies because it meaningfully improves financial interactions
and systems for small businesses:

- accounts receivable automation
- survival-focused cashflow decision support
- financing option comparison
- cost optimization tied directly to financial health

### 3.2 Agentic fit

The product is only valid if the agent performs visible multi-step work:

1. inspect internal financial context
2. use TinyFish tools or equivalent external integrations
3. compare options or detect anomalies
4. produce or trigger next-best actions
5. write an auditable result back into the product

### 3.3 Judging fit

The product is optimized for:

- **Technical execution**
  Clear, working agent workflow with deterministic financial foundations.
- **Market readiness**
  Obvious pain and willingness-to-pay for SMB owners.
- **Overall product quality**
  Focused UX, coherent story, polished demo.

---

## 4. Core User

### Primary persona

**Owner-operator of a small service business**

They are not a finance professional. They are trying to keep the business alive
while dealing with delayed payments, rising costs, and limited time.

### Secondary personas

- general manager
- operations lead
- fractional finance lead
- bookkeeper-adjacent operator

---

## 5. Core Jobs To Be Done

1. As an owner, I want overdue cash surfaced and prioritized so I know what
   needs recovery now.
2. As an owner, I want financing options gathered and normalized quickly so I
   can decide whether short-term capital is worth taking.
3. As an owner, I want vendor spikes and insurance increases surfaced before
   they compound cash pressure.
4. As an owner, I want an agent to do the first pass of investigation so I am
   not manually checking every tool and website.
5. As an owner, I want an audit trail of what the system did and why.

---

## 6. Product Scope

### 6.1 In scope for the hackathon

- survival-focused landing page and product narrative
- recovery / rescue queue
- agent run timeline
- financing scout result set
- vendor comparison result set
- insurance renewal risk result set
- TinyFish-backed or TinyFish-mock-backed external investigation
- auditability via `ai_actions`
- demo-safe mock mode

### 6.2 Out of scope

- real underwriting
- real money movement
- production-grade lending marketplace
- full ERP / accounting platform
- deep multi-tenant auth
- perfect vertical generalization

---

## 7. Product Surfaces

### 7.1 Required routes

- `/`
  Survival-agent landing page
- `/dashboard`
  High-level cash stress and system visibility
- `/rescue`
  Prioritized queue of risks and actions
- `/finance`
  Cashflow and ledger context
- `/invoices`
  Receivables and invoice context
- `/workflow`
  Agent run timeline / audit view
- `/integrations`
  Connector state, TinyFish status, webhook explanation

### 7.2 Legacy routes

Legacy operational routes may remain in the codebase, but they are not part of
the hackathon story unless required for data generation or internal reuse.

---

## 8. Agent Workflows

### 8.1 Collections workflow

Goal: reduce outstanding receivables risk.

Steps:

1. identify overdue or risky invoices
2. inspect payment and invoice context
3. determine next action
4. log or execute the action
5. write result into timeline / queue

### 8.2 Financing scout workflow

Goal: surface credible short-term financing options.

Steps:

1. inspect current cash pressure
2. gather financing options externally
3. normalize terms
4. rank options by fit and urgency
5. attach rationale

### 8.3 Vendor / insurance workflow

Goal: reduce avoidable cost pressure.

Steps:

1. detect price spike or renewal risk
2. investigate alternatives
3. summarize the financial delta
4. produce a recommended action
5. write result into the product

---

## 9. Technical Architecture

### 9.1 Foundations to preserve

- Supabase/Postgres is the source of truth.
- Deterministic services own invoice and finance mutations.
- Query modules own UI-facing shaping.
- AI is downstream of facts.

### 9.2 Agent stack

- TinyFish for search/fetch/browser/agent scaffolding
- mock mode for demo-safe operation
- `ai_actions` for audit timeline
- additive API routes under `/api/tinyfish/*`

### 9.3 Deployment

- local-first development
- AWS-friendly container scaffold for prize eligibility
- optional S3 artifact helpers

---

## 10. Key Rules

### 10.1 AI must not own

- invoice totals
- amount calculations
- finance ledger truth
- invoice status truth
- deterministic business transitions

### 10.2 AI may own

- investigation
- summarization
- option comparison
- prioritization
- action recommendation
- demo-safe external tool orchestration

### 10.3 TinyFish rules

- mock mode must always exist
- live mode must be env-gated
- do not invent endpoint paths in code
- route handlers must remain stable even when TinyFish is unavailable

---

## 11. Demo Story

### 11.1 Private judges demo

1. show the business is under cash pressure
2. show the rescue queue
3. run the survival agent
4. show financing options
5. show vendor / insurance savings opportunities
6. show the audit trail

### 11.2 Winning message

This is not another dashboard.

It is an autonomous operator for the exact financial chaos that kills small
businesses:

- money arrives late
- options are fragmented
- costs keep rising
- the owner has no time

---

## 12. Execution Strategy

### 12.1 Team lanes

- **Lane 1**
  product shell, landing page, rescue UX
- **Lane 2**
  dashboard/read models and queue shaping
- **Lane 3**
  TinyFish scaffolding and demo routes
- **Lane 4**
  demo data, deploy, runbook, AWS/Kiro artifacts

### 12.2 Build discipline

- keep changes additive
- prefer stable mocks over broken live integrations
- verify after each meaningful change
- optimize for judge comprehension, not scope inflation

---

## 13. Success Criteria

The project is successful if, by demo time:

1. the product clearly reads as fintech
2. the product clearly reads as agentic
3. one survival-agent flow works end to end
4. the demo is polished enough that judges understand the value in under a
   minute
5. the audit trail proves the system did real multi-step work
