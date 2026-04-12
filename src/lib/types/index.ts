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

// ─── Domain types — authoritative definitions live in src/lib/constants/enums.ts
// and src/lib/schemas/. These re-exports keep existing component imports working.

export type {
  AppointmentStatus,
  InvoiceStatus,
  FinanceTransactionType,
  FinanceDirection,
  DomainEventName,
} from "@/lib/constants/enums"

// ─── Canonical domain event strings — import from DOMAIN_EVENT constant.
// WorkflowEventType below mirrors the DB event vocabulary for the UI timeline.

export type WorkflowEventType =
  | "reservation.created"
  | "reservation.confirmed"
  | "reservation.completed"
  | "invoice.generated"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.overdue"
  | "feedback.received"
  | "feedback.flagged"
  | "summary.refresh_requested"

// ─── UI-facing shapes (camelCase, safe to use in components) ─────────────

export type Appointment = {
  id:           string
  customerId:   string
  customerName: string
  staffId:      string | null
  staffName:    string | null
  serviceId:    string
  serviceName:  string
  covers:       number
  startsAt:     string
  endsAt:       string
  status:       import("@/lib/constants/enums").AppointmentStatus
  bookingSource: string | null
  notes:        string | null
  createdAt:    string
}

export type InvoiceItem = {
  id:          string
  serviceId:   string | null
  description: string
  quantity:    number
  unitPrice:   number
  amount:      number
}

export type LedgerInvoice = {
  id:             string
  organizationId: string
  appointmentId:  string | null
  customerId:     string
  customerName:   string
  invoiceNumber:  string
  currency:       string
  subtotal:       number
  taxRate:        number
  taxAmount:      number
  discountAmount: number
  totalAmount:    number
  amountPaid:     number
  dueAt:          string
  status:         import("@/lib/constants/enums").InvoiceStatus
  sentAt:         string | null
  paidAt:         string | null
  notes:          string | null
  createdAt:      string
}

export type WorkflowEvent = {
  id:     string
  time:   string
  type:   WorkflowEventType
  title:  string
  detail: string
  status: "completed" | "pending" | "failed"
}

export type FinanceTransaction = {
  id:               string
  organizationId:   string
  invoiceId:        string | null
  type:             import("@/lib/constants/enums").FinanceTransactionType
  direction:        import("@/lib/constants/enums").FinanceDirection
  category:         string
  amount:           number
  occurredAt:       string
  paymentMethod:    string | null
  taxRelevant:      boolean
  writeoffEligible: boolean
  notes:            string | null
}

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
  expectedDeliveryDate: string
  actualDeliveryDate: string | null
  orderedAt: string
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
  avgDaysLate: number
  maxDaysLate: number
  totalSpend30d: number
  hasPriceIncrease: boolean
  negotiationPriority: "high" | "medium" | "low"
}

export type MenuItem = {
  id: string
  name: string
  category: string
  price: number
}

export type MenuItemInventoryUsage = {
  menuItemId: string
  itemId: string
  unitsUsedPerOrder: number
}

export type HistoricalReservation = {
  id: string
  date: string
  covers: number
  menuItemIds: string[]
}

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
  orderByDate: string | null
  recommendedReorderQty: number
  demandTrendPct: number
  riskLevel: RiskLevel
  confidenceScore: number | null
  topDrivers: PredictionDriver[]
  explanationText: string | null
}

export type VendorInsight = {
  vendorName: string
  performanceSummary: string
  negotiationSuggestion: string | null
  priority: "high" | "medium" | "low"
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

export type ReservationStatus = "confirmed" | "completed" | "cancelled" | "no_show"
export type LegacyInvoiceStatus = "pending" | "paid" | "overdue"

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string | null
  visit_count: number
  created_at: string
}

export interface Reservation {
  id: string
  customer_id: string
  customer?: Customer
  party_size: number
  starts_at: string
  ends_at: string
  status: ReservationStatus
  notes?: string | null
  occasion?: string | null
  reminder_sent: boolean
  follow_up_sent: boolean
  created_at: string
  updated_at: string
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
}

export interface Invoice {
  id: string
  reservation_id: string
  reservation?: Reservation
  customer_id: string
  customer?: Customer
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  status: LegacyInvoiceStatus
  due_at: string
  paid_at?: string | null
  reminder_count: number
  last_reminded_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  reservation_id: string
  customer_id: string
  message: string
  sent_at?: string | null
  created_at: string
}

export interface ServiceResult<T> {
  data?: T
  error?: string
}

export interface BookReservationRequest {
  customer_name: string
  customer_email: string
  customer_phone?: string
  party_size?: number
  starts_at: string
  ends_at: string
  notes?: string
  occasion?: string
}

export interface RescheduleReservationRequest {
  starts_at: string
  ends_at: string
  notes?: string
  occasion?: string
  party_size?: number
}

export interface CreateInvoiceRequest {
  reservation_id: string
  line_items: InvoiceLineItem[]
  tax_rate?: number
  discount_amount?: number
  due_days?: number
}

export interface ParsedReservationAction {
  intent: "book" | "reschedule" | "cancel" | "query"
  starts_at?: string | null
  ends_at?: string | null
  confidence: "high" | "medium" | "low"
  clarification_needed?: string | null
  raw_interpretation: string
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
