export type InventoryIssueStatus = "none" | "equipment_issue" | "quality_concern" | "discontinued"

export type PriceTrendStatus = "stable" | "rising" | "spike"

export type InventoryAlertType = "low_stock" | "expiry_soon" | "price_increase" | "equipment_issue"

export type InventoryItem = {
  id: string
  itemName: string
  category: string
  quantityOnHand: number
  reorderLevel: number
  unitCost: number
  /** Previous price before the current rise or spike — only present when priceTrendStatus is "rising" or "spike" */
  previousUnitCost?: number
  expiresAt: string | null
  vendorName: string
  issueStatus: InventoryIssueStatus
  priceTrendStatus: PriceTrendStatus
}

export type InventoryAlert = {
  id: string
  itemId: string
  itemName: string
  alertType: InventoryAlertType
  message: string
  severity: "warning" | "critical"
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "rescheduled"
  | "cancelled"
  | "no_show"

export type InvoiceStatus = "draft" | "sent" | "pending" | "paid" | "overdue" | "void"

export type WorkflowEventType =
  | "appointment_completed"
  | "invoice_generated"
  | "invoice_sent"
  | "feedback_requested"
  | "finance_updated"
  | "ai_summary_refreshed"

export type Appointment = {
  id: string
  customerName: string
  service: string
  staff: string
  startsAt: string
  durationMin: number
  status: AppointmentStatus
  price: number
}

export type Invoice = {
  id: string
  customerName: string
  items: string
  total: number
  dueAt: string
  status: InvoiceStatus
}

export type WorkflowEvent = {
  id: string
  time: string
  type: WorkflowEventType
  title: string
  detail: string
  status: "completed" | "pending" | "failed"
}

export type FinanceTransaction = {
  id: string
  type: "revenue" | "expense" | "fee" | "inventory_purchase" | "writeoff" | "refund"
  direction: "in" | "out"
  category: string
  amount: number
  occurredAt: string
  taxRelevant: boolean
}

// ── Shipment types ───────────────────────────────────────────────────

export type ShipmentStatus = "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled"

export type ShipmentLineItem = {
  id: string
  itemId: string
  itemName: string
  quantityOrdered: number
  unitCost: number
  totalCost: number
}

export type Shipment = {
  id: string
  vendorName: string
  status: ShipmentStatus
  expectedDeliveryDate: string   // YYYY-MM-DD
  actualDeliveryDate: string | null // YYYY-MM-DD — null if not yet delivered
  orderedAt: string              // ISO timestamp
  trackingNumber: string | null
  trackingUrl: string | null
  lineItems: ShipmentLineItem[]
  totalCost: number
  notes: string | null
}

export type DeliveryPerformance = "early" | "on_time" | "late"

export type VendorPerformanceStat = {
  vendorName: string
  totalDeliveries: number
  onTimeCount: number
  earlyCount: number
  lateCount: number
  onTimePct: number
  avgDaysLate: number          // average days overdue for late deliveries only
  maxDaysLate: number          // worst single delivery
  totalSpend30d: number        // spend in last 30 days
  hasPriceIncrease: boolean    // any items from this vendor with rising/spike status
  negotiationPriority: "high" | "medium" | "low"
}

// ── Predictive inventory types ──────────────────────────────────────

export type MenuItem = {
  id: string
  name: string
  category: string
  price: number
}

/** How many units of an inventory item one dish order consumes */
export type MenuItemInventoryUsage = {
  menuItemId: string
  itemId: string
  unitsUsedPerOrder: number
}

/** A single reservation/table booking with covers and ordered dishes */
export type Reservation = {
  id: string
  date: string          // YYYY-MM-DD
  covers: number
  menuItemIds: string[] // dishes ordered
}

/** Projected consumption per inventory item over a look-ahead window */
export type DemandForecast = {
  itemId: string
  itemName: string
  projectedUnits7d: number
  projectedUnits14d: number
  projectedDailyUsage: number
  currentStock: number
  daysToStockout: number
  shortfall7d: number
}

export type RiskLevel = "low" | "medium" | "high"

export type PredictionDriver = {
  driver: string
  impact: "low" | "medium" | "high"
}

export type InventoryPrediction = {
  itemId: string
  itemName: string
  category: string
  vendorName: string
  expiresAt: string | null
  quantityOnHand: number
  reorderLevel: number
  predictedUsage7d: number
  predictedUsage14d: number
  predictedDailyUsage: number
  safetyStock: number
  daysToStockout: number
  /** YYYY-MM-DD — latest date to place the order before stockout */
  orderByDate: string | null
  recommendedReorderQty: number
  /** % change in daily usage rate: last 7d vs last 30d average */
  demandTrendPct: number
  riskLevel: RiskLevel
  confidenceScore: number | null
  topDrivers: PredictionDriver[]
  explanationText: string | null
}

export type AiInventoryReport = {
  predictionDate: string
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  predictions: InventoryPrediction[]
  summaryText: string
  vendorInsights: VendorInsight[]
  generatedAt: string
}

export type VendorInsight = {
  vendorName: string
  performanceSummary: string   // e.g. "2 of 8 deliveries were late (avg 2.5 days)"
  negotiationSuggestion: string | null  // AI-generated — null for reliable vendors
  priority: "high" | "medium" | "low"
}

// ── Gemini agent types ────────────────────────────────────────────────────────

export type OrderInsight = {
  itemName: string
  vendorName: string
  totalOrdered30d: number
  orderCount: number
  avgOrderSize: number
  lastOrderDate: string
  recommendedQty: number
  rationale: string
}

export type SpoilageAlert = {
  itemName: string
  riskLevel: "high" | "medium" | "low"
  expiresAt: string | null
  totalOrdered30d: number
  currentStock: number
  recommendation: string
  evidence: string
}

export type NegotiationOpportunity = {
  vendorName: string
  priority: "high" | "medium" | "low"
  onTimePct: number
  lateCount: number
  totalDeliveries: number
  hasPriceIncrease: boolean
  totalSpend30d: number
  tactics: string[]
  evidence: string
}

export type AgentReport = {
  summary: string
  orderInsights: OrderInsight[]
  spoilageAlerts: SpoilageAlert[]
  negotiationOpportunities: NegotiationOpportunity[]
  generatedAt: string
}