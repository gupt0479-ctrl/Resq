export type CustomerClassification = "forgot" | "cash_flow" | "disputing" | "bad_actor"

export type Trajectory = "improving" | "worsening" | "flat"

export interface CollectionsDecision {
  classification:     CustomerClassification
  confidence:         number           // 0–100
  trajectory:         Trajectory
  aggressionBudget:   number           // 0–100 (higher = softer tone warranted)
  ltvFactor:          number           // 0–0.3

  allowedActions:     string[]         // from rule filter

  chainOfThought:     string           // Claude's reasoning — shown in audit trail UI

  selectedAction:     string
  channel:            "email" | "stripe" | "phone" | "formal_notice"
  tone:               "friendly" | "firm" | "formal" | "urgent"

  outreachDraft:      string           // ready-to-send message to customer

  responsePlan: {
    noReply:        string   // if no response in 3 days
    dispute:        string   // if customer disputes the invoice
    partialPayment: string   // if customer offers partial payment
  }

  humanReviewFlag:    boolean          // true when confidence < 75
  humanReviewReason?: string

  externalSignals: {
    newsSummary:  string           // AI-synthesized one-sentence digest
    rawSnippets:  string[]         // raw text from TinyFish results
    distressFlag: boolean
    dataSource:   "live" | "mock"
  }

  portalReconnaissance?: {
    visibility:          boolean
    paymentStatus:       string
    shouldSkipCollection: boolean
    hasRecentActivity:   boolean
    engagementLevel:     string
    messageSent:         boolean
    confidence:          number
  }

  reevaluateAt: string                 // ISO: now + 3 days
}
