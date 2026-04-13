import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { generateFollowUp } from "@/lib/ai/generate-followup"

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const client = createServerSupabaseClient()

    // Fetch appointment with customer join
    const { data: appt, error } = await client
      .from("appointments")
      .select("*, customers ( full_name, email )")
      .eq("id", id)
      .eq("organization_id", DEMO_ORG_ID)
      .single()

    if (error || !appt) {
      return Response.json({ error: "Appointment not found" }, { status: 404 })
    }

    const customer = (appt as { customers?: { full_name: string; email: string } | null }).customers

    const apptAny = appt as Record<string, unknown>

    const followUpMessage = await generateFollowUp({
      id:          appt.id as string,
      customer_id: appt.customer_id as string,
      customer: customer
        ? { id: appt.customer_id as string, name: customer.full_name, email: customer.email, visit_count: 1, created_at: "" }
        : undefined,
      party_size:     appt.covers as number,
      starts_at:      appt.starts_at as string,
      ends_at:        appt.ends_at as string,
      status:         "completed",
      notes:          (appt.notes as string | null) ?? null,
      occasion:       (apptAny.occasion as string | null) ?? null,
      reminder_sent:  false,
      follow_up_sent: false,
      created_at:     appt.created_at as string,
      updated_at:     new Date().toISOString(),
    })

    // Mark follow-up sent
    await client
      .from("appointments")
      .update({ follow_up_sent: true })
      .eq("id", id)

    return Response.json({ data: { followUpMessage } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
