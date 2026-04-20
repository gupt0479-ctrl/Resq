import "server-only"

import { getSessionUser } from "./get-session-user"
import { createUserSupabaseServerClient } from "./create-user-supabase-server-client"

export async function getUserOrg() {
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
