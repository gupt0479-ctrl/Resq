/** Shown when the linked Supabase project is missing Phase-2 ledger tables/columns. */
export function LedgerSchemaBanner({ message }: { message: string }) {
  return (
    <div className="m-8 max-w-3xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-950 space-y-3">
      <p className="font-semibold text-base">Database is not on the Resq ledger schema</p>
      <p className="whitespace-pre-wrap rounded-md bg-white/60 p-3 font-mono text-xs leading-relaxed">{message}</p>
      <p className="text-xs text-amber-900">
        If <code className="rounded bg-amber-100/80 px-1">invoices</code> already existed before the ledger (wrong
        columns), run <code className="rounded bg-amber-100/80 px-1">003_reset_billing_for_ledger.sql</code> first
        (drops billing tables — dev only), then the full{" "}
        <code className="rounded bg-amber-100/80 px-1">0001_core_ledger.sql</code>,{" "}
        <code className="rounded bg-amber-100/80 px-1">002_invoice_reminders.sql</code>, and{" "}
        <code className="rounded bg-amber-100/80 px-1">supabase/seed.sql</code> in the SQL editor (or{" "}
        <code className="rounded bg-amber-100/80 px-1">supabase db reset</code> if you use the CLI). Verify with{" "}
        <code className="rounded bg-amber-100/80 px-1">npm run db:check</code>.
      </p>
    </div>
  )
}
