import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listAppointmentsQuery } from "@/lib/queries/appointments"
import { isSupabaseConfigured } from "@/lib/env"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { APPOINTMENT_STATUS_LABEL } from "@/lib/constants/enums"
import type { AppointmentStatus } from "@/lib/constants/enums"
import type { AppointmentResponse } from "@/lib/schemas/appointment"

function statusColor(status: AppointmentStatus) {
  const map: Record<AppointmentStatus, string> = {
    scheduled:   "bg-slate-100 text-slate-700",
    confirmed:   "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    completed:   "bg-green-100 text-green-700",
    rescheduled: "bg-purple-100 text-purple-800",
    cancelled:   "bg-red-100 text-red-700",
    no_show:     "bg-zinc-100 text-zinc-500",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-600"
}

export default async function AppointmentsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">Supabase not configured — connect a project to see reservations.</p>
      </div>
    )
  }

  const client = createServerSupabaseClient()
  const rows = await listAppointmentsQuery(client, DEMO_ORG_ID, { limit: 50 }).catch(
    () => []
  )

  const counts: Record<AppointmentStatus, number> = {
    scheduled: 0, confirmed: 0, in_progress: 0, completed: 0,
    rescheduled: 0, cancelled: 0, no_show: 0,
  }
  for (const r of rows) {
    const s = r.status
    if (s in counts) counts[s]++
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reservations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All Ember Table reservations and their status</p>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(counts) as [AppointmentStatus, number][])
          .filter(([, n]) => n > 0)
          .map(([status, count]) => (
            <span key={status} className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(status)}`}>
              {APPOINTMENT_STATUS_LABEL[status]} · {count}
            </span>
          ))}
      </div>

      {/* Reservations table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">All Reservations ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reservations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Guest</th>
                    <th className="pb-2 pr-4 font-medium">Experience</th>
                    <th className="pb-2 pr-4 font-medium">Covers</th>
                    <th className="pb-2 pr-4 font-medium">Date &amp; Time</th>
                    <th className="pb-2 pr-4 font-medium">Server</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((a: AppointmentResponse) => {
                    const status = a.status
                    return (
                      <tr key={a.id} className="py-2">
                        <td className="py-2.5 pr-4 font-medium text-foreground">
                          {a.customerName}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {a.serviceName}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {a.covers}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(a.startsAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}{" "}
                          {new Date(a.startsAt).toLocaleTimeString("en-US", {
                            hour: "numeric", minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {a.staffName ?? "—"}
                        </td>
                        <td className="py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(status)}`}>
                            {APPOINTMENT_STATUS_LABEL[status]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
