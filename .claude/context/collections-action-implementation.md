# Collections Action Implementation Status

## Completed (Phases 1-4)

### Phase 1: Demo Moment UI ✅
**File:** `src/app/rescue/RescueClient.tsx`

Upgraded the agent reasoning display to match the "agent working" format:

**Before:**
- Single "Agent reasoning" text block

**After:**
- **Assessment** block: Shows human-readable reasoning + confidence
- **Action** block: Shows selected action, channel, tone
- **Contingency** block: Shows "if no reply" plan prominently
- **Message drafted** section: Outreach draft
- **External signals** section: TinyFish news + distress flags
- **Full response plan**: Dispute/partial payment scenarios (collapsed)

This matches the document's vision:
```
Assessment: They've seen it. Not a dispute. Recovery probability: 84%.
Action: Firm reminder via email, Tuesday 9am. Message drafted.
Contingency: If no reply by Friday, offer payment plan.
```

### Phase 2: Legal Guardrails + High-Stakes Gate ✅
**Files:** 
- `src/lib/services/collections-decision-agent.ts`
- `src/app/api/receivables/send-reminder/route.ts`
- `src/app/rescue/RescueClient.tsx`

#### Legal Guardrails Implemented:
1. **Contact frequency limits**
   - Max 1 contact per day per customer
   - Max 3 contacts per week per customer
   - Returns 429 status if violated

2. **Time-of-day restrictions**
   - No contact before 8am or after 9pm
   - Returns 403 status if violated

3. **Do-not-contact list**
   - Checks customer notes for "do not contact" or "dnc"
   - Returns 403 status if flagged

#### High-Stakes Gate Implemented:
1. **Invoice > $5,000** → Requires human approval
2. **Formal escalation** (aggression ≥ 80) → Requires human approval
3. **Settlement offers** → Requires human approval (reserved for future)
4. **High-LTV customer** (>$10k) at escalation → Requires human approval

#### UI Enhancements:
- Error messages show appropriate icons (⏱ frequency, 🕐 time, 🚫 DNC, ⚠️ approval)
- Approval-required messages guide user to contact manager
- Guardrail violations prevent action execution

### Phase 3: Prioritization Formula ✅
**File:** `src/lib/services/recovery-agent.ts`

Replaced risk-score sorting with the cash-flow-aware formula from the document:

**Formula:** `priority = (amount × recovery_probability) / days_until_cash_crunch`

#### Implementation Details:
1. **Cash position signal** - Computes `daysUntilCashCrunch` from recent revenue/expenses
   - Queries last 30 days of finance transactions
   - Calculates monthly burn rate
   - Estimates runway (mocked at $50k cash on hand for demo)

2. **Recovery probability** - Computed per invoice based on:
   - Days overdue (2% decay per day, capped at -40%)
   - Payment history (+15% for excellent, -20% for poor)
   - Prior overdue count (-5% per prior overdue)
   - Reminder fatigue (-8% per reminder sent)
   - Range: 5-95%

3. **Priority-based sorting** - Queue now sorts by:
   - Primary: Priority score (highest first)
   - Tiebreaker: Risk score

**Result:** A $4k invoice 14 days overdue with 80% recovery probability now ranks higher than a $500 invoice 60 days overdue with 20% recovery probability when cash crunch is 30 days away.

### Phase 4: Dynamic Ladder Extensions ✅
**Files:**
- `src/lib/domain/recovery-state-machine.ts`
- `src/lib/services/recovery-agent.ts`

#### Settlement Rung Added:
- **New status:** `settlement_offered` (between payment_plan and escalation)
- **Trigger:** Risk ≥55, or 60+ days overdue with 2+ reminders
- **Discount:** 5-15% based on risk score (higher risk = higher discount)
- **Requires approval:** Yes (via high-stakes gate)
- **Message:** "We're prepared to offer a {discount}% settlement discount — pay {amount} to close this account in full. This offer expires in 7 days."

#### Partial Payment Drop-Back:
- **New action:** `drop_back`
- **Trigger:** `partialPaymentReceived` flag in context
- **Behavior:** Drops back one rung when customer engages
  - `escalated` → `settlement_offered`
  - `settlement_offered` → `payment_plan_offered`
  - `payment_plan_offered` → `reminder_sent`
- **Message:** "Thank you for your recent payment. We appreciate your engagement. Your remaining balance is {amount}."

#### State Transitions Updated:
- All rungs can now drop back (bidirectional transitions)
- `disputed` can restart at `reminder_sent` after resolution
- Settlement offers can escalate or drop back to payment plan

**Result:** The ladder is now fully dynamic - customers who engage get gentler treatment, while non-responsive customers escalate through settlement before formal escalation.

---

## Not Yet Implemented (Phases 5-8)

### Phase 5: Send-Time Optimization
**Missing:**
- Tue–Thu 9–11am scheduling
- Customer response-history timing
- Timezone awareness

### Phase 6: Message Personalization Enhancements
**Current:** Fresh messages with amount + days
**Missing:**
- Specific job/service name from appointment
- Payment link inline
- B2B decision-maker identification via TinyFish

### Phase 7: Execution Enhancements
**Current:** Email/Stripe send, audit log
**Missing:**
- Open/click tracking
- 24hr follow-up on opened-not-clicked
- Portal execution via TinyFish (login, verify, send, screenshot)
- Channel failover (email fails → SMS)

### Phase 8: Writeback + Learning
**Current:** Action logging (channel, rung, reason)
**Missing:**
- Outcome logging (what sequence led to payment)
- Per-channel/tone effectiveness tracking
- Adaptive learning ("restaurant clients in Q1, rung 2 firm email on Wednesday closes 70%")

---

## Demo Readiness

**Ready to demo:**
- ✅ Structured agent reasoning display
- ✅ Legal guardrails prevent violations
- ✅ High-stakes gate requires approval
- ✅ Human-readable explanations (from improve-decision-reasoning spec)
- ✅ External signals (TinyFish distress detection)
- ✅ Cash-flow-aware prioritization formula
- ✅ Settlement rung with dynamic discounts (5-15%)
- ✅ Partial payment drop-back (customer engagement rewarded)

**Demo talking points:**
1. "The agent doesn't just decide—it explains its reasoning in plain language"
2. "Legal guardrails prevent over-contacting customers (1/day, 3/week max)"
3. "High-value invoices (>$5k) and settlements require human approval"
4. "Queue prioritizes by cash flow impact, not just age"
5. "Settlement offers (5-15% discount) before formal escalation"
6. "Customers who make partial payments get gentler treatment—the ladder drops back"
7. "External signals (bankruptcy, distress) influence the approach"
8. "Assessment → Action → Contingency format shows the agent working, not just a dashboard"

---

## Next Steps (if time permits)

**Highest impact for demo:**
1. Phase 3 (Prioritization) - Shows intelligent queue ordering
2. Phase 4 (Settlement rung) - Shows full escalation ladder
3. Phase 7 (Open/click tracking) - Shows closed-loop execution

**Lower priority:**
4. Phase 5 (Send-time optimization) - Nice to have
5. Phase 6 (Job/service personalization) - Nice to have
6. Phase 8 (Learning) - Future enhancement
