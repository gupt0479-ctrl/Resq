import { healthCheck } from "@/lib/tinyfish/client"
import {
  getPortalReconMode,
  TINYFISH_VAULT_ENABLED,
  TINYFISH_PORTAL_RECON_ENABLED,
} from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await healthCheck()
    return Response.json({
      data: {
        ...result,
        portalReconnaissance: {
          mode: getPortalReconMode(),
          vaultEnabled: TINYFISH_VAULT_ENABLED,
          portalReconEnabled: TINYFISH_PORTAL_RECON_ENABLED,
        },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
