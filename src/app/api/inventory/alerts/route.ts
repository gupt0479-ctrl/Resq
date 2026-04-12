import { getInventoryItems } from "@/lib/supabase/queries"
import { getAlerts, getAlertSummary } from "@/lib/services/inventory"

export async function GET() {
  const items = await getInventoryItems()
  const now = new Date()
  const alerts = getAlerts(items, now)
  const summary = getAlertSummary(items, now)

  return Response.json({ data: alerts, summary })
}
