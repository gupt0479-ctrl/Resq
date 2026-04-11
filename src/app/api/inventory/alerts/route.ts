import { inventoryItems } from "@/lib/data/inventory"
import { getAlerts, getAlertSummary } from "@/lib/services/inventory"

export async function GET() {
  const now = new Date()
  const alerts = getAlerts(inventoryItems, now)
  const summary = getAlertSummary(inventoryItems, now)

  return Response.json({ data: alerts, summary })
}
