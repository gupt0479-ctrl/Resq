import { describe, expect, it } from "vitest"
import { parseAndApplyReviewBusinessRules, rulesOnlyReviewAnalysis } from "./feedback-rules"

describe("parseAndApplyReviewBusinessRules", () => {
  it("forces allergy / illness to urgency 5 and safety_flag", () => {
    const raw = {
      sentiment:          "negative",
      score_label:        "poor",
      topics:             ["food_quality"],
      urgency:            2,
      safety_flag:        false,
      churn_risk:         "medium",
      risk_status_update: "at_risk",
      reply_draft:        null,
      internal_note:      "x",
      recovery_action: {
        type:          "none",
        channel:       "none",
        priority:      "low",
        message_draft: null,
      },
      follow_up_status: "none",
      manager_summary:  "Guest issue",
    }
    const out = parseAndApplyReviewBusinessRules(raw, {
      score:        4,
      source:       "internal",
      guestHistory: { dietaryNotes: "severe peanut allergy on file" },
      comment:      "Dessert tasted fine",
    })
    expect(out.safety_flag).toBe(true)
    expect(out.urgency).toBe(5)
    expect(out.topics).toContain("allergy_safety")
  })

  it("requires non-empty reply_draft for google", () => {
    const raw = {
      sentiment:          "negative",
      score_label:        "poor",
      topics:             ["wait_time"],
      urgency:            3,
      safety_flag:        false,
      churn_risk:         "high",
      risk_status_update: "at_risk",
      reply_draft:        null,
      internal_note:      "x",
      recovery_action: {
        type:          "personal_call",
        channel:       "phone",
        priority:      "high",
        message_draft: "call",
      },
      follow_up_status: "callback_needed",
      manager_summary:  "y",
    }
    const out = parseAndApplyReviewBusinessRules(raw, {
      score:        2,
      source:       "google",
      guestHistory: null,
      comment:      "slow",
    })
    expect(out.reply_draft).toBeTruthy()
  })

  it("coerces 5-star internal + model recovery none to thank_you_email and thankyou_sent", () => {
    const raw = {
      sentiment:          "positive",
      score_label:        "excellent",
      topics:             ["food_quality"],
      urgency:            1,
      safety_flag:        false,
      churn_risk:         "low",
      risk_status_update: "healthy",
      reply_draft:        null,
      internal_note:      "x",
      recovery_action: {
        type:          "none",
        channel:       "none",
        priority:      "low",
        message_draft: null,
      },
      follow_up_status: "none",
      manager_summary:  "Great visit",
    }
    const out = parseAndApplyReviewBusinessRules(raw, {
      score:        5,
      source:       "internal",
      guestHistory: null,
      comment:      "Loved it",
    })
    expect(out.recovery_action.type).toBe("thank_you_email")
    expect(out.follow_up_status).toBe("thankyou_sent")
  })
})

describe("rulesOnlyReviewAnalysis", () => {
  it("produces thank_you path for 5-star internal", () => {
    const out = rulesOnlyReviewAnalysis({
      guestName:    "Alex",
      score:        5,
      comment:      "Amazing",
      source:       "internal",
      guestHistory: null,
    })
    expect(out.recovery_action.type).toBe("thank_you_email")
    expect(out.follow_up_status).toBe("thankyou_sent")
  })
})
