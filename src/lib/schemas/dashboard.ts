import { z } from "zod"

export const DashboardKpisSchema = z.object({
  todayReservationCount: z.number(),
  upcomingReservationCount: z.number(),
  todayRevenue: z.number(),
  overdueInvoiceCount: z.number(),
  overdueInvoiceAmount: z.number(),
  pendingInvoiceCount: z.number(),
  pendingInvoiceAmount: z.number(),
  unhappyGuestCount: z.number(),
  activeRescueActionsCount: z.number(),
})

export const RecentReservationSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  serviceName: z.string(),
  covers: z.number(),
  startsAt: z.string(),
  status: z.string(),
})

export const DashboardConnectorHealthSchema = z.object({
  provider:    z.string(),
  displayName: z.string(),
  status:      z.string(),
  lastSyncAt:  z.string().nullable(),
  lastError:   z.string().nullable(),
})

export const DashboardManagerSummarySchema = z.object({
  source:      z.enum(["ai", "fallback"]),
  headline:    z.string(),
  bullets:     z.array(z.string()),
  riskNote:    z.string().optional(),
  generatedAt: z.string().optional(),
})

export const DashboardFeedbackSpotlightItemSchema = z.object({
  id:         z.string(),
  guestName:  z.string(),
  score:      z.number(),
  summary:    z.string(),
  urgency:    z.number(),
  safetyFlag: z.boolean(),
})

export const DashboardAiActivityItemSchema = z.object({
  id:           z.string(),
  actionType:   z.string(),
  inputSummary: z.string(),
  status:       z.string(),
  createdAt:    z.string(),
})

export const DashboardSummarySchema = z.object({
  kpis: DashboardKpisSchema,
  recentReservations: z.array(RecentReservationSchema),
  financeSnapshot: z.object({
    weeklyRevenue: z.number(),
    weeklyExpenses: z.number(),
    netCashFlow: z.number(),
  }),
  integrationConnectors: z.array(DashboardConnectorHealthSchema),
  managerSummary:          DashboardManagerSummarySchema,
  feedbackSpotlight:     z.array(DashboardFeedbackSpotlightItemSchema),
  recentAiActivity:      z.array(DashboardAiActivityItemSchema),
})

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>
