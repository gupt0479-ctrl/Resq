import { NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { executeAction } from "@/lib/services/action-executor"
import type { InterventionCategory } from "@/lib/schemas/cash"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()

  const category = body.category as InterventionCategory | undefined
  const description = body.description as string | undefined
  const executable = body.executable as boolean | undefined
  const orgId = (body.organizationId as string) ?? DEMO_ORG_ID
  const clientName = body.clientName as string | undefined

  if (!category || !description || executable === undefined) {
    return NextResponse.json(
      { error: "category, description, and executable are required" },
      { status: 400 },
    )
  }

  try {
    const result = await executeAction({
      interventionId: id,
      category,
      description,
      executable,
      orgId,
      clientName,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[cash/actions/execute] Error:", err)
    return NextResponse.json(
      { error: "Action execution failed", detail: String(err) },
      { status: 500 },
    )
  }
}
