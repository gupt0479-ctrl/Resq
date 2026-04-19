import { getFinanceSummary, listTransactions } from "@/lib/services/finance"
import type {
  FinanceSummaryResponse,
  FinanceTransactionResponse,
} from "@/lib/schemas/finance"
import { DEMO_ORG_ID } from "@/lib/db"

type TransactionRow = Record<string, unknown> & {
  id: string
  organization_id: string
  invoice_id?: string | null
  type: string
  category: string
  amount: number | string
  direction: "in" | "out"
  occurred_at: string
  payment_method?: string | null
  tax_relevant: boolean
  writeoff_eligible: boolean
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
    organizationId: row.organization_id,
    invoiceId: row.invoice_id ?? null,
    type: row.type as FinanceTransactionResponse["type"],
    category: row.category,
    amount: Number(row.amount),
    direction: row.direction,
    occurredAt: row.occurred_at,
    paymentMethod: row.payment_method ?? null,
    taxRelevant: row.tax_relevant,
    writeoffEligible: row.writeoff_eligible,
    notes: row.notes ?? null,
  }
}
