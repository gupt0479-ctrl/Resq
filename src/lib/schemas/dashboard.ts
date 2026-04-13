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
})

export const RecentReservationSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  serviceName: z.string(),
  covers: z.number(),
  startsAt: z.string(),
  status: z.string(),
})

export const DashboardSummarySchema = z.object({
  kpis: DashboardKpisSchema,
  recentReservations: z.array(RecentReservationSchema),
  financeSnapshot: z.object({
    weeklyRevenue: z.number(),
    weeklyExpenses: z.number(),
    netCashFlow: z.number(),
  }),
})

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>
