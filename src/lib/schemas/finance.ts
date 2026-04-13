import { z } from "zod"
import { FINANCE_TRANSACTION_TYPE, FINANCE_DIRECTION } from "@/lib/constants/enums"

export const FinanceTransactionTypeSchema = z.enum(FINANCE_TRANSACTION_TYPE)
export const FinanceDirectionSchema       = z.enum(FINANCE_DIRECTION)

// ─── DB row shape ────────────────────────────────────────────────────────

export const FinanceTransactionRowSchema = z.object({
  id:               z.string().uuid(),
  organization_id:  z.string().uuid(),
  invoice_id:       z.string().uuid().nullable(),
  type:             FinanceTransactionTypeSchema,
  category:         z.string(),
  amount:           z.number(),
  direction:        FinanceDirectionSchema,
  occurred_at:      z.string(),
  payment_method:   z.string().nullable(),
  tax_relevant:     z.boolean(),
  writeoff_eligible: z.boolean(),
  receipt_id:       z.string().uuid().nullable(),
  notes:            z.string().nullable(),
  external_ref:     z.string().nullable(),
  created_at:       z.string(),
})

export type FinanceTransactionRow = z.infer<typeof FinanceTransactionRowSchema>

// ─── API response shapes ─────────────────────────────────────────────────

export const FinanceTransactionResponseSchema = z.object({
  id:               z.string(),
  organizationId:   z.string(),
  invoiceId:        z.string().nullable(),
  type:             FinanceTransactionTypeSchema,
  category:         z.string(),
  amount:           z.number(),
  direction:        FinanceDirectionSchema,
  occurredAt:       z.string(),
  paymentMethod:    z.string().nullable(),
  taxRelevant:      z.boolean(),
  writeoffEligible: z.boolean(),
  notes:            z.string().nullable(),
})

export type FinanceTransactionResponse = z.infer<typeof FinanceTransactionResponseSchema>

// ─── Finance summary (assembled server-side, never from model) ───────────

export const InvoiceAgingBucketSchema = z.object({
  count:  z.number(),
  amount: z.number(),
})

export const FinanceSummaryResponseSchema = z.object({
  asOf:                z.string(),
  revenueToday:        z.number(),
  revenueThisWeek:     z.number(),
  pendingReceivables:  z.number(),
  overdueReceivables:  z.number(),
  expensesThisWeek:    z.number(),
  netCashFlowEstimate: z.number(),
  overdueInvoiceCount: z.number(),
  pendingInvoiceCount: z.number(),
  aging: z.object({
    current:   InvoiceAgingBucketSchema,
    due1to30:  InvoiceAgingBucketSchema,
    due31to60: InvoiceAgingBucketSchema,
    over60:    InvoiceAgingBucketSchema,
  }),
})

export type FinanceSummaryResponse = z.infer<typeof FinanceSummaryResponseSchema>

// ─── FinanceSummaryFacts — input to AI manager summary (later milestone) ─

export const FinanceSummaryFactsSchema = z.object({
  revenueThisWeek:        z.number(),
  pendingReceivables:     z.number(),
  overdueReceivables:     z.number(),
  overdueInvoiceCount:    z.number(),
  expensesThisWeek:       z.number(),
  netCashFlowEstimate:    z.number(),
  largestOverdueInvoices: z.array(
    z.object({ invoiceNumber: z.string(), amount: z.number(), customerName: z.string() })
  ),
  /** Deterministic feedback signals (Phase 4 grounding). */
  urgentFeedbackCount:  z.number(),
  flaggedFeedbackCount: z.number(),
})

export type FinanceSummaryFacts = z.infer<typeof FinanceSummaryFactsSchema>

// ─── Create transaction input ────────────────────────────────────────────

export const CreateTransactionBodySchema = z.object({
  type:             FinanceTransactionTypeSchema,
  category:         z.string().min(1),
  amount:           z.number().positive(),
  direction:        FinanceDirectionSchema,
  occurredAt:       z.string().optional(),
  paymentMethod:    z.string().optional(),
  taxRelevant:      z.boolean().optional().default(false),
  writeoffEligible: z.boolean().optional().default(false),
  notes:            z.string().optional(),
  invoiceId:        z.string().uuid().optional(),
})
