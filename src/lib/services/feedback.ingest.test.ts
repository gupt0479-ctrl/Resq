import { vi, describe, it, expect } from "vitest"

// vi.mock is hoisted by vitest above all imports, so "server-only" is mocked
// before feedback.ts (and its transitive deps) resolve the import.
vi.mock("server-only", () => ({}))

// Mock the db module — ingestFeedbackRow now uses the db singleton directly
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs)
          return {
            where: () => ({
              limit: () => Promise.resolve([]),
              orderBy: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }
        },
      }
    },
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return {
        values: () => ({
          returning: () => Promise.resolve([{ id: "new-fb-id" }]),
        }),
      }
    },
  },
  DEMO_ORG_ID: "00000000-0000-0000-0000-000000000001",
}))

import { ingestFeedbackRow } from "@/lib/services/feedback"

const BASE_INPUT = {
  organizationId: "org-1",
  guestName:      "Alex Smith",
  score:          4,
  comment:        "Great food",
  source:         "internal",
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ingestFeedbackRow", () => {
  it("happy path — inserts a new row and returns created:true", async () => {
    const result = await ingestFeedbackRow(BASE_INPUT)
    expect(result).toEqual({ feedbackId: "new-fb-id", created: true })
  })
})
