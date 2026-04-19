export const dynamic = "force-dynamic"
export const revalidate = 0

import { DEMO_ORG_ID } from "@/lib/db"
import { getRescueQueue } from "@/lib/queries/rescue"
import { RescueClient } from "./RescueClient"

export default async function RescuePage() {
  const queue = await getRescueQueue(null, DEMO_ORG_ID).catch(() => [])
  return <RescueClient initialQueue={queue} />
}
