import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { CreateReviewSchema } from "@/lib/schemas/feedback"
import {
  ingestFeedbackRow,
  persistAgentFeedbackAnalysis,
} from "@/lib/services/feedback"

type CustomerSnapshot = {
  id: string
  full_name: string | null
  email: string | null
  avg_feedback_score: number | null
  lifetime_value: number | null
  risk_status: string | null
  notes: string | null
}

type AppointmentSnapshot = {
  starts_at: string
  notes: string | null
}

type GuestHistoryShape = {
  visitCount?: number
  lifetimeSpend?: number
  lastVisit?: string
  vip?: boolean
  dietaryNotes?: string | null
}

function buildGuestHistoryFromSnapshots(
  customer: CustomerSnapshot,
  recentAppointments: AppointmentSnapshot[],
  visitCount: number | null
): GuestHistoryShape {
  const lifetimeSpend = Number(customer.lifetime_value) || 0
  const customerNotes = customer.notes ?? ""
  const appointmentNotes = recentAppointments.map((row) => row.notes ?? "").filter(Boolean).join(" ")
  const combinedNotes = [customerNotes, appointmentNotes].filter(Boolean).join(" ").trim()

  return {
    visitCount: visitCount ?? undefined,
    lifetimeSpend,
    lastVisit: recentAppointments[0]?.starts_at ?? undefined,
    vip: lifetimeSpend >= 1200 || /\bVIP\b/i.test(combinedNotes),
    dietaryNotes: combinedNotes.match(/allergy|nut|gluten|dairy|shellfish/i) ? combinedNotes : null,
  }
}

// Live demo / n8n entrypoint. Uses the customer-service agent but keeps messaging advisory-only.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = CreateReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  const { guestName, score, comment, source, guestId } = parsed.data

  try {
    const client = createServerSupabaseClient()

    const [customerQuery, appointmentsQuery] = await Promise.all([
      client
        .from("customers")
        .select("id, full_name, email, avg_feedback_score, lifetime_value, risk_status, notes")
        .eq("id", guestId)
        .eq("organization_id", DEMO_ORG_ID)
        .maybeSingle(),
      client
        .from("appointments")
        .select("starts_at, notes", { count: "exact" })
        .eq("customer_id", guestId)
        .eq("organization_id", DEMO_ORG_ID)
        .order("starts_at", { ascending: false })
        .limit(3),
    ])

    if (customerQuery.error) throw new Error(customerQuery.error.message)
    if (!customerQuery.data) {
      return NextResponse.json({ error: "Guest not found for this organization." }, { status: 404 })
    }
    if (appointmentsQuery.error) throw new Error(appointmentsQuery.error.message)

    const customer = customerQuery.data as CustomerSnapshot
    const recentAppointments = (appointmentsQuery.data ?? []) as AppointmentSnapshot[]
    const guestHistory = buildGuestHistoryFromSnapshots(
      customer,
      recentAppointments,
      appointmentsQuery.count ?? null
    )

    const { analyzeAndRespond } = await import("../../../../agents/customer-service/agent.js")
    const agentResult = (await analyzeAndRespond({
      guestName: customer.full_name ?? guestName,
      guestEmail: "",
      score,
      comment,
      source,
      guestHistory,
      guestId,
    })) as Record<string, unknown>

    const { feedbackId, created } = await ingestFeedbackRow(client, {
      organizationId: DEMO_ORG_ID,
      customerId:     guestId,
      appointmentId:  null,
      guestName:      customer.full_name ?? guestName,
      score,
      comment,
      source,
      externalReviewId: null,
      externalSource:   null,
    })

    const persisted = await persistAgentFeedbackAnalysis(
      client,
      DEMO_ORG_ID,
      feedbackId,
      {
        guestName: customer.full_name ?? guestName,
        score,
        comment,
        source,
        customerId: guestId,
        guestHistory,
      },
      agentResult,
      "model"
    )

    return NextResponse.json({
      data: {
        feedbackId,
        created,
        customer: {
          fullName: customer.full_name,
          avgFeedbackScore: customer.avg_feedback_score,
          lifetimeValue: customer.lifetime_value,
          riskStatus: customer.risk_status,
          notes: customer.notes,
        },
        guestHistory,
        analysisSource: persisted.analysisSource,
        ...persisted.analysis,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
