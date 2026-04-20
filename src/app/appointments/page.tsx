import { Suspense } from "react"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { listAppointmentsQuery } from "@/lib/queries/appointments"
import { isDatabaseConfigured } from "@/lib/env"
import { ReservationsClient } from "./ReservationsClient"

async function ReservationsData() {
  const ctx = await getUserOrg()
  const appointments = ctx
    ? await listAppointmentsQuery(ctx.organizationId, { limit: 100 }).catch(() => [])
    : []

  return <ReservationsClient initialAppointments={appointments} />
}

export default function AppointmentsPage() {
  if (!isDatabaseConfigured()) {
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
