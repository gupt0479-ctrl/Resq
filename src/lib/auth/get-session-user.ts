import "server-only"

import { createUserSupabaseServerClient } from "./create-user-supabase-server-client"

export async function getSessionUser() {
  const supabase = await createUserSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
