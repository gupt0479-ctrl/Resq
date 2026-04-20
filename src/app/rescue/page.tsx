export const dynamic = "force-dynamic"
export const revalidate = 0

import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getRescueQueue } from "@/lib/queries/rescue"
import { RescueClient } from "./RescueClient"

export default async function RescuePage() {
  const ctx = await getUserOrg()
  const client = await createUserSupabaseServerClient()
  const queue = ctx ? await getRescueQueue(client, ctx.organizationId).catch(() => []) : []
  return <RescueClient initialQueue={queue} />
}
