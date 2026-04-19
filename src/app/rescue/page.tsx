export const dynamic = "force-dynamic"
export const revalidate = 0

import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getRescueQueue } from "@/lib/queries/rescue"
import { RescueClient } from "./RescueClient"

export default async function RescuePage() {
  const client = createServerSupabaseClient()
  const queue = await getRescueQueue(client, DEMO_ORG_ID).catch(() => [])
  return <RescueClient initialQueue={queue} />
}
