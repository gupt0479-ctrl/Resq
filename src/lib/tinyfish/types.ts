export type {
  TinyFishMode,
  TinyFishHealthResult,
  TinyFishSearchHit,
  TinyFishSearchResult,
  TinyFishFetchResult,
  TinyFishFinancingOffer,
  TinyFishFinancingOutputs,
  TinyFishAgentStep,
  TinyFishAgentRunResult,
  TinyFishScenario,
} from "./schemas"

export type {
  PortalReconnaissanceMode,
  PortalReconnaissanceResult,
  PortalReconnaissanceResponse,
  Screenshot,
  ParsedPortalData,
  ParsedInvoice,
  ParsedActivity,
  PortalLoginResult,
  PortalReconScenario,
  PortalReconOptions,
} from "./portal-types"

export interface SearchOptions {
  limit?: number
}

export interface FetchOptions {
  /** Optional selector hint passed to the remote agent. Ignored in mock mode. */
  selector?: string
}

export interface RunAgentOptions {
  scenario?: import("./schemas").TinyFishScenario
  organizationId?: string
  invoiceId?: string
  customerName?: string
  dryRun?: boolean
}
