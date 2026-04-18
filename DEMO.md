# OpsPilot Rescue — 5-Minute Demo Script

**Hackathon:** O1 Summit, Minneapolis, April 18-19, 2026  
**Prize:** $10,000+  
**Pitch:** "Cash is late. OpsPilot acts."

---

## The Story (30 seconds)

> "Small business owners lose 14 days a month chasing late invoices. 60% of SMB failures are cash flow problems.
> OpsPilot Rescue is an autonomous agent that detects overdue receivables, investigates the risk, drafts outreach,
> surfaces financing options, and proposes payment plans — automatically. Here's a live demo."

---

## Demo Path

### Screen 1: Landing page (`/`)
- Point to the hero: **"Cash is late. OpsPilot acts."**
- Show the 3 urgency stats (60% failure rate, 14 days manual work, $90K at risk)
- Show the 4-step agent loop cards: Detect → Investigate → Act → Report
- Show the TinyFish section: "The agent operates on the live web"
- Click **"Open Rescue Queue →"**

### Screen 2: Dashboard (`/dashboard`)
- 5 KPI cards: overdue count, at-risk cash total, active rescue cases, pending receivables, at-risk accounts
- Point to **Active Rescue Cases** — number is live from the database
- Show the **Cashflow Rescue** card linking to the queue
- Click **"Open rescue queue →"** or sidebar → **Rescue Queue**

### Screen 3: Rescue Queue (`/rescue`) ← PRIMARY DEMO SURFACE
- 3 KPI strip: $X at-risk, Y overdue, Z active cases
- Show **Carlos Reyes** row at the top (highest risk score, most overdue)
  - Badge: **"Action Taken"** — already has 2 steps in audit trail
  - Pills: "🔍 Risk Flagged" + "✉️ Follow-up Drafted"
- Click **"View agent timeline →"** to expand it
  - Show timeline: Step 1 (Risk Flagged), Step 2 (Follow-up Drafted)
- Click **"Run Agent"** on Carlos Reyes
  - Spinner runs… agent executes step 3: **Financing Scouted**
  - Timeline expands with the new step, marked "new"
  - Next step suggestion appears
- Click **"Investigate"** button to open the side panel
  - Watch the verification checklist animate through all 11 checks
  - Risk score ring appears, risk factors, agent summary
  - Suggested outreach message shown

### Screen 4: Finance / Cashflow (`/finance`)
- Show the ledger — revenue vs expenses
- Point to unpaid receivables impact on cash flow
- "This is what we're recovering."

### Close
> "Every step the agent takes is logged, auditable, and reversible.
> The owner never has to touch a single spreadsheet.
> Built with Claude AI and TinyFish. This is OpsPilot Rescue."

---

## Key talking points

- **No new database tables** — piggybacks on existing `ai_actions` audit table
- **State machine** — each "Run Agent" advances: detect → follow-up → financing → payment plan → resolve
- **TinyFish** — live web agent that checks payment portals, verifies business identity, fetches financing
- **Claude AI** — every step generates context-aware outreach, not templates
- **Real data** — Carlos Reyes, $632.20, 14 days overdue, seeded in the live Supabase database

---

## Fallback if API fails

The rescue agent has deterministic fallbacks — even without Claude API keys, every step produces
a realistic output. The demo works fully offline.

---

## URLs to have open before judges arrive

1. `http://localhost:3000/` — landing page
2. `http://localhost:3000/dashboard` — dashboard
3. `http://localhost:3000/rescue` — rescue queue (PRIMARY)
