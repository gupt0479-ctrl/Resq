import { z } from "zod"

// ─── Mode + health ─────────────────────────────────────────────────────────

export const TinyFishModeSchema = z.enum(["live", "mock", "misconfigured"])
export type TinyFishMode = z.infer<typeof TinyFishModeSchema>

export const TinyFishHealthResultSchema = z.object({
  ok:                z.boolean(),
  mode:              TinyFishModeSchema,
  details:           z.string().optional(),
  /** True when live mode was attempted but we had to fall back. */
  degradedFromLive:  z.boolean().optional(),
  warning:           z.string().optional(),
})
export type TinyFishHealthResult = z.infer<typeof TinyFishHealthResultSchema>

// ─── Search ────────────────────────────────────────────────────────────────

export const TinyFishSearchHitSchema = z.object({
  title:   z.string(),
  url:     z.string(),
  snippet: z.string(),
  score:   z.number().optional(),
})
export type TinyFishSearchHit = z.infer<typeof TinyFishSearchHitSchema>

export const TinyFishSearchResultSchema = z.object({
  query:            z.string(),
  mode:             TinyFishModeSchema,
  results:          z.array(TinyFishSearchHitSchema),
  degradedFromLive: z.boolean().optional(),
  warning:          z.string().optional(),
})
export type TinyFishSearchResult = z.infer<typeof TinyFishSearchResultSchema>

// ─── Fetch ─────────────────────────────────────────────────────────────────

export const TinyFishFetchResultSchema = z.object({
  url:              z.string(),
  mode:             TinyFishModeSchema,
  status:           z.number(),
  title:            z.string().optional(),
  text:             z.string(),
  fetchedAt:        z.string(),
  degradedFromLive: z.boolean().optional(),
  warning:          z.string().optional(),
})
export type TinyFishFetchResult = z.infer<typeof TinyFishFetchResultSchema>

// ─── Agent run ─────────────────────────────────────────────────────────────

export const TinyFishAgentStepSchema = z.object({
  index:       z.number().int().nonnegative(),
  label:       z.string(),
  observation: z.string(),
  durationMs:  z.number().int().nonnegative(),
})
export type TinyFishAgentStep = z.infer<typeof TinyFishAgentStepSchema>

export const TinyFishScenarioSchema = z.enum([
  "collections",
  "financing",
  "vendor",
  "insurance",
  "full_survival_scan",
])
export type TinyFishScenario = z.infer<typeof TinyFishScenarioSchema>

export const TinyFishAgentRunResultSchema = z.object({
  task:             z.string(),
  scenario:         TinyFishScenarioSchema,
  mode:             TinyFishModeSchema,
  steps:            z.array(TinyFishAgentStepSchema),
  summary:          z.string(),
  outputs:          z.record(z.string(), z.unknown()),
  degradedFromLive: z.boolean().optional(),
  warning:          z.string().optional(),
})
export type TinyFishAgentRunResult = z.infer<typeof TinyFishAgentRunResultSchema>
