import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/db/supabase-server"
import { getKycRequestByToken, recordLinkOpened } from "@/lib/services/kyc"
import { SubmitVerificationDataSchema } from "@/lib/schemas/kyc"
import { logKycEvent } from "@/lib/services/kyc/audit"

// GET — client lands on verification link: return request state for the frontend flow
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase  = createServerSupabaseClient()
    const request   = await getKycRequestByToken(supabase, token)

    if (!request) {
      return NextResponse.json({ error: "Verification link not found or expired" }, { status: 404 })
    }

    // Mark link as opened (first time only)
    await recordLinkOpened(supabase, request.id)

    // Return only what the client needs (no sensitive org internals)
    return NextResponse.json({
      data: {
        requestId:     request.id,
        status:        request.status,
        businessName:  request.businessName,
        directorName:  request.directorName,
        linkExpiresAt: request.linkExpiresAt,
        isExpired:     new Date(request.linkExpiresAt) < new Date(),
        checksCompleted: [],
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

// POST — client submits their identity data to begin verification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body: unknown = await req.json().catch(() => ({}))
    const parsed = SubmitVerificationDataSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()
    const request  = await getKycRequestByToken(supabase, token)

    if (!request) {
      return NextResponse.json({ error: "Verification link not found or expired" }, { status: 404 })
    }

    if (new Date(request.linkExpiresAt) < new Date()) {
      return NextResponse.json({ error: "Verification link has expired" }, { status: 410 })
    }

    const now = new Date().toISOString()

    // Update request with client-submitted data and transition to in_progress
    await supabase.from("kyc_verification_requests").update({
      status:              "in_progress",
      business_name:       parsed.data.businessName,
      registered_state:    parsed.data.registeredState,
      business_address:    parsed.data.businessAddress,
      website_url:         parsed.data.websiteUrl,
      director_name:       parsed.data.directorName,
      director_dob:        parsed.data.directorDob,
      bank_account_last4:  parsed.data.bankAccountLast4,
      bank_routing_number: parsed.data.bankRoutingNumber,
      updated_at:          now,
    }).eq("id", request.id)

    await supabase.from("customers").update({
      kyc_status: "in_progress",
    }).eq("id", request.customerId)

    await logKycEvent(supabase, request.id, "client_data_submitted", {
      business:       parsed.data.businessName,
      director:       parsed.data.directorName,
      state:          parsed.data.registeredState,
    }, "client")

    return NextResponse.json({
      data: {
        requestId: request.id,
        status:    "in_progress",
        message:   "Identity data received. Verification checks will begin shortly.",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
