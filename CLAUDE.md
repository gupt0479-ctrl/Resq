OpsPilot — Ember Table Restaurant
Claude Code Project Context
Critical version warnings — read before writing any code

Next.js 16.2.3 — NOT Next.js 14/15. Check node_modules/next/dist/docs/ before using any Next.js API.
React 19.2.4 — hooks and patterns may differ from training data
Tailwind CSS 4 — configuration is different. No tailwind.config.js. Config lives in globals.css via @theme
shadcn/ui style is "base-nova" — NOT "default" or "new-york". Components may look different.
Zod 4.3.x — breaking changes from v3. Schema API changed.
lucide-react 1.8.x — major version, some icon names changed
@base-ui/react 1.3.x — Radix replacement, different import paths
When in doubt about any of these: read the installed package docs first, don't assume

What this project is
AI-powered restaurant operations dashboard for Ember Table (Minneapolis).
Hackathon demo. Replaces manual manager workflows end-to-end.
Stack: Next.js App Router + Supabase + n8n + Claude API.
Project structure
src/
  app/                  ← Next.js App Router pages
    api/                ← Route handlers (server-side only)
    dashboard/
    workflow/
    customers/
    invoices/
    feedback/           ← Customer service agent surfaces here
    finance/
    integrations/
    inventory/
  components/
    ui/                 ← shadcn components (base-nova style)
  lib/
    supabase.ts         ← Supabase client (already set up by teammate)
    utils.ts
  hooks/
agents/
  customer-service/
    agent.js            ← MY FILE — core analyzeReview() function
    test.js
    README.md
  Agent.py              ← TEAMMATE's performance agent (Python/sklearn, Colab)
                           Do not modify. Different language, different owner.
The four AI agents — who owns what
AgentLanguageOwnerStatusCustomer serviceJS (Claude API)MeIn progressInventory managementTBDTeammateIn progressMarketing helperTBDTeammateIn progressPerformance analyzerPython (sklearn)TeammateAgent.py — DO NOT TOUCH
My agent — customer service (agents/customer-service/agent.js)
Core function
jsanalyzeReview({ guestName, score, comment, source, guestHistory }) → JSON
Output schema — field names are frozen, teammates depend on them
json{
  "sentiment": "positive|neutral|negative",
  "score_label": "excellent|good|mixed|poor|critical",
  "topics": ["food_quality","service_speed","staff_attitude","noise_level",
             "wait_time","allergy_safety","value","ambiance","cleanliness"],
  "urgency": 1-5,
  "safety_flag": boolean,
  "churn_risk": "low|medium|high",
  "risk_status_update": "healthy|at_risk|churned",
  "reply_draft": "string",
  "internal_note": "string",
  "recovery_action": {
    "type": "none|thank_you_email|personal_call|comp_offer|refund|urgent_escalation",
    "message_draft": "string|null",
    "channel": "email|sms|phone|none",
    "priority": "low|normal|high|urgent"
  },
  "follow_up_status": "none|thankyou_sent|callback_needed|resolved",
  "manager_summary": "string"
}
Business rules — hardcoded, never remove

Allergy / illness / food safety mention → urgency 5, safety_flag true, always
VIP guest (vip: true) → never recovery_action "none"
Score 1–2 → minimum urgency 3
Score 5 + internal source → thank_you_email
Google or Yelp source → always populate reply_draft even if positive

Database — built by teammate, DO NOT change schema
Supabase client: import { supabase } from '@/lib/supabase'
Tables my agent writes to
TableFields I writefeedbacksentiment, topics, urgency, safety_flag, follow_up_status, flaggedai_actionsagent='customer_service', trigger_type, action_type, output_payloadguestsrisk_status only — PATCH, never overwrite other fields
Tables my agent reads from
TableWhyguestsfetch guestHistory before calling analyzeReviewfeedbackdedup check before processing
Tables I never touch
reservations, invoices, invoice_items, finance_transactions,
inventory_items, inventory_events, ai_summaries, performance_snapshots
API route I need to build
src/app/api/review/route.ts

POST handler
Accepts: { guestName, score, comment, source, guestId }
Fetches guest from Supabase by guestId → builds guestHistory
Calls analyzeReview()
Writes result to feedback + ai_actions + guests tables
Returns full result as JSON
Validate input with Zod before anything else

Environment variables
envANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # server-side writes only, never expose to client
Claude API usage

Model: claude-sonnet-4-20250514
max_tokens: 1024
Structured JSON output — parse with JSON.parse(), throw on failure with raw response in error
No streaming, no multi-turn — one call per review
ESM imports: import Anthropic from '@anthropic-ai/sdk'

Code conventions

TypeScript everywhere in src/ — agent.js stays JS (it's standalone)
ESM modules, async/await only
Named exports, no default exports except where Next.js requires
Zod validation on all API route inputs
Never put SUPABASE_SERVICE_ROLE_KEY or ANTHROPIC_API_KEY in client components
'use client' only when absolutely necessary — prefer server components

Performance agent (Agent.py) — context only, do not touch
Teammate's work. Python + sklearn + pandas. Runs in Google Colab, not in this Next.js app.
Generates 2 years of synthetic restaurant + hair salon data, trains two RandomForest models
(customers_that_day and revenue_that_day), exposes predict_for_day().
This will eventually be called from a Next.js API route via a Python service — not your concern.
Demo scenarios that must always work for my agent

Happy VIP (score 5, internal) → urgency 1, thank_you_email
Allergy incident (score 2, nut allergy on file) → urgency 5, safety_flag true, urgent_escalation
Negative Google review → urgency 4+, reply_draft populated
Mixed review (score 4, slow service) → urgency 2, internal_note specific
Lapsed Yelp guest (score 3) → churn_risk high, comp_offer
First-time happy guest (score 5) → thank_you_email, return-visit nudge

The demo moment
Guest submits internal form → POST /api/review → analyzeReview() →
writes to Supabase → dashboard feedback page shows new flagged card
within 5 seconds. That live loop is what judges see.
