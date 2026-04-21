import "server-only"

import { getSessionUser } from "./get-session-user"
import { createUserSupabaseServerClient } from "./create-user-supabase-server-client"

const DEMO_ORG_ID = process.env.DEMO_ORG_ID?.trim() || "00000000-0000-0000-0000-000000000001"
const isDemoMode = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE?.trim().toLowerCase() === "true"

export async function getUserOrg() {
  // In demo mode, skip auth and return the demo org
  if (isDemoMode) {
    return {
      userId: "demo-user",
      organizationId: DEMO_ORG_ID,
      role: "owner",
    }
  }

  const user = await getSessionUser()
  if (!user) return null

  const supabase = await createUserSupabaseServerClient()
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  return {
    userId: user.id,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
  }
}
