import { z } from "zod"

/** Structured model output — must not contain authoritative money fields beyond echoing facts. */
export const ManagerSummarySchema = z.object({
  headline: z.string().min(1).max(240),
  bullets:  z.array(z.string().min(1).max(400)).min(1).max(5),
  riskNote: z.string().max(500).optional(),
})

export type ManagerSummary = z.infer<typeof ManagerSummarySchema>
