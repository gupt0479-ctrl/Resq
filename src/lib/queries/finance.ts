import { getFinanceSummary, listTransactions } from "@/lib/services/finance"
import type {
  FinanceSummaryResponse,
  FinanceTransactionResponse,
} from "@/lib/schemas/finance"
import { DEMO_ORG_ID } from "@/lib/env"

type TransactionRow = Record<string, unknown> & {
  id: string
  organization_id?: string
  organizationId?: string
  invoice_id?: string | null
  invoiceId?: string | null
  type: string
  category: string
  amount: number | string
  direction: "in" | "out"
  occurred_at?: string
  occurredAt?: string | Date
  payment_method?: string | null
  paymentMethod?: string | null
  tax_relevant?: boolean
  taxRelevant?: boolean
  writeoff_eligible?: boolean
  writeoffEligible?: boolean
  notes?: string | null
}

export async function getFinanceSummaryQuery(
  organizationId: string = DEMO_ORG_ID
): Promise<FinanceSummaryResponse> {
  return getFinanceSummary(organizationId)
}

export async function listTransactionsQuery(
  organizationId: string,
  opts: {
    type?: string
    taxRelevant?: boolean
    limit?: number
    offset?: number
    since?: string
  } = {}
): Promise<FinanceTransactionResponse[]> {
  const rows = await listTransactions(organizationId, opts)
  return rows.map((row) => mapTransactionRow(row as TransactionRow))
}

function mapTransactionRow(row: TransactionRow): FinanceTransactionResponse {
  return {
    id: row.id,
    organizationId: row.organizationId ?? row.organization_id ?? "",
    invoiceId: row.invoiceId ?? row.invoice_id ?? null,
    type: row.type as FinanceTransactionResponse["type"],
    category: row.category,
    amount: Number(row.amount),
    direction: row.direction,
    occurredAt:
      typeof row.occurredAt === "string"
        ? row.occurredAt
        : row.occurredAt instanceof Date
          ? row.occurredAt.toISOString()
          : row.occurred_at ?? new Date(0).toISOString(),
    paymentMethod: row.paymentMethod ?? row.payment_method ?? null,
    taxRelevant: row.taxRelevant ?? row.tax_relevant ?? false,
    writeoffEligible: row.writeoffEligible ?? row.writeoff_eligible ?? false,
    notes: row.notes ?? null,
  }
}
