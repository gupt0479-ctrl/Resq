import { Suspense } from "react"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listAppointmentsQuery } from "@/lib/queries/appointments"
import { isSupabaseConfigured } from "@/lib/env"
import { ReservationsClient } from "./ReservationsClient"
import type { AppointmentResponse } from "@/lib/schemas/appointment"

// Map the simple `reservations` table rows to the display type
async function fetchFromReservationsTable(
  client: ReturnType<typeof createServerSupabaseClient>
): Promise<AppointmentResponse[]> {
  const [resRows, menuRows] = await Promise.all([
    client.from("reservations").select("id, date, covers, menu_item_ids").order("date", { ascending: false }),
    client.from("menu_items").select("id, name"),
  ])

  if (resRows.error || !resRows.data?.length) return []

  const nameMap = new Map<string, string>(
    (menuRows.data ?? []).map((m) => [m.id as string, m.name as string])
  )

  return resRows.data.map((r) => {
    const ids  = (r.menu_item_ids as string[]) ?? []
    const items = ids.map((id) => nameMap.get(id)).filter(Boolean).join(", ")
    return {
      id:             r.id as string,
      organizationId: DEMO_ORG_ID,
      customerId:     "",
      customerName:   "—",
      staffId:        null,
      staffName:      null,
      serviceId:      "",
      serviceName:    items || "Standard Reservation",
      covers:         Number(r.covers),
      startsAt:       `${r.date}T19:00:00.000Z`,
      endsAt:         `${r.date}T21:00:00.000Z`,
      status:         "scheduled" as const,
      bookingSource:  null,
      notes:          null,
      createdAt:      `${r.date}T00:00:00.000Z`,
      occasion:       null,
      followUpSent:   false,
    }
  })
}

async function ReservationsData() {
  const client = createServerSupabaseClient()

  // Try the full appointments table first; fall back to the simpler reservations table
  let appointments = await listAppointmentsQuery(client, DEMO_ORG_ID, { limit: 100 }).catch(() => [])

  if (appointments.length === 0) {
    appointments = await fetchFromReservationsTable(client).catch(() => [])
  }

  return <ReservationsClient initialAppointments={appointments} />
}

export default function AppointmentsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">Supabase not configured — connect a project to see reservations.</p>
        <p className="mt-1 text-amber-700">
          Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code className="bg-amber-100 px-1 rounded">.env.local</code>.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    }>
      <ReservationsData />
    </Suspense>
  )
}
