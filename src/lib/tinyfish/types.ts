export type {
  TinyFishMode,
  TinyFishHealthResult,
  TinyFishSearchHit,
  TinyFishSearchResult,
  TinyFishFetchResult,
  TinyFishAgentStep,
  TinyFishAgentRunResult,
  TinyFishScenario,
} from "./schemas"

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
