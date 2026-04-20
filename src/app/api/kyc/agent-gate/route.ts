import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import type { KycBand } from "@/lib/types/kyc"

/**
 * Agent gate — given a customerId, returns the KYC-based permission level for the agent.
 * The rescue queue and recovery agent call this before taking any action.
 *
 * Response:
 *   allowed:      true  → agent acts freely (verified, score 85-100)
 *   allowed:      true, requiresApproval: true → agent sends but flags for human approval (review, 60-84)
 *   allowed:      false, reason: "pending" → agent held, KYC not yet complete
 *   allowed:      false, reason: "blocked" → agent blocked (flagged/failed)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 })
    }

    const supabase = await createUserSupabaseServerClient()

    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name, kyc_status, kyc_score, kyc_band")
      .eq("id", customerId)
      .eq("organization_id", ctx.organizationId)
      .single()

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const kycStatus = customer.kyc_status as string
    const kycBand   = customer.kyc_band as KycBand | null
    const kycScore  = customer.kyc_score as number | null

    const gate = resolveAgentGate(kycStatus, kycBand, kycScore)

    return NextResponse.json({
      data: {
        customerId,
        customerName: customer.full_name,
        kycStatus,
        kycBand,
        kycScore,
        ...gate,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

interface AgentGateResult {
  allowed: boolean
  requiresApproval: boolean
  reason: string
  agentCapabilities: string[]
}

function resolveAgentGate(
  kycStatus: string,
  kycBand: KycBand | null,
  kycScore: number | null
): AgentGateResult {
  // KYC verified — agent acts freely
  if (kycStatus === "completed_verified" || kycBand === "verified") {
    return {
      allowed: true,
      requiresApproval: false,
      reason: `KYC verified (score ${kycScore}/100). Agent cleared to act autonomously.`,
      agentCapabilities: [
        "send_follow_up",
        "send_reminder",
        "offer_payment_plan",
        "escalate_automatically",
        "send_stripe_invoice",
      ],
    }
  }

  // KYC in review — agent sends but flags each action
  if (kycStatus === "completed_review" || kycBand === "review") {
    return {
      allowed: true,
      requiresApproval: true,
      reason: `KYC in review (score ${kycScore}/100). Agent can send follow-ups but each action requires human approval.`,
      agentCapabilities: ["send_follow_up_with_approval", "flag_for_review"],
    }
  }

  // KYC not started or pending — agent held
  if (["not_started", "pending"].includes(kycStatus)) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: "KYC verification not yet started. Agent is held until client completes verification.",
      agentCapabilities: ["send_kyc_link"],
    }
  }

  // KYC in progress — agent held
  if (kycStatus === "in_progress") {
    return {
      allowed: false,
      requiresApproval: false,
      reason: "KYC verification in progress. Agent is held until verification completes.",
      agentCapabilities: [],
    }
  }

  // KYC flagged or failed — agent blocked
  return {
    allowed: false,
    requiresApproval: false,
    reason: `KYC ${kycBand ?? "failed"} (score ${kycScore ?? 0}/100). Agent blocked — operator must decide to escalate or void.`,
    agentCapabilities: [],
  }
}
