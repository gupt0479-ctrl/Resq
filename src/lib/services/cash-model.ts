import "server-only"
import { db } from "@/lib/db"
import { financeTransactions, invoices } from "@/lib/db/schema"
import { eq, and, sql, inArray } from "drizzle-orm"
import type { CashPosition } from "@/lib/schemas/cash"

/**
 * Cash_Model — deterministic cash position from cleared ledger only.
 *
 * currentCash   = sum(direction='in') − sum(direction='out')  from finance_transactions
 * openReceivables = sum(totalAmount − amountPaid)              from invoices where status in (sent, pending, overdue)
 * cashCollected90d = sum(amount) where direction='in' AND occurredAt >= NOW() − 90 days
 */
export async function computePosition(orgId: string): Promise<CashPosition> {
  // 1. Current cash from cleared ledger
  const [cashRow] = await db
    .select({
      totalIn: sql<string>`coalesce(sum(case when ${financeTransactions.direction} = 'in' then ${financeTransactions.amount} else 0 end), 0)`,
      totalOut: sql<string>`coalesce(sum(case when ${financeTransactions.direction} = 'out' then ${financeTransactions.amount} else 0 end), 0)`,
    })
    .from(financeTransactions)
    .where(eq(financeTransactions.organizationId, orgId))

  const currentCash = round2(Number(cashRow?.totalIn ?? 0) - Number(cashRow?.totalOut ?? 0))

  // 2. Open receivables — unpaid invoices (sent, pending, overdue)
  const [receivablesRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.totalAmount}::numeric - ${invoices.amountPaid}::numeric), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, orgId),
        inArray(invoices.status, ["sent", "pending", "overdue"]),
      ),
    )

  const openReceivables = round2(Number(receivablesRow?.total ?? 0))

  // 3. Cash collected in last 90 days (inflows only)
  const [collected90dRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${financeTransactions.amount}), 0)`,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.organizationId, orgId),
        eq(financeTransactions.direction, "in"),
        sql`${financeTransactions.occurredAt} >= now() - interval '90 days'`,
      ),
    )

  const cashCollected90d = round2(Number(collected90dRow?.total ?? 0))

  return { currentCash, openReceivables, cashCollected90d }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
