import { vi, describe, it, expect, beforeEach } from "vitest"

// vi.mock is hoisted by vitest above all imports, so "server-only" is mocked
// before feedback.ts (and its transitive deps) resolve the import.
vi.mock("server-only", () => ({}))

// Mock the db module — ingestFeedbackRow now uses the db singleton directly
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockLimit = vi.fn()
const mockReturning = vi.fn()

let selectLimitQueue: unknown[][] = []
let insertReturningValue: unknown[] = [{ id: "new-fb-id" }]
let insertReturningError: Error | null = null

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs)
          return {
            where: () => ({
              limit: () => {
                mockLimit()
                const next = selectLimitQueue.shift()
                return Promise.resolve(next ?? [])
              },
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
          returning: async () => {
            mockReturning()
            if (insertReturningError) throw insertReturningError
            return insertReturningValue
          },
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
  beforeEach(() => {
    mockSelect.mockClear()
    mockInsert.mockClear()
    mockFrom.mockClear()
    mockLimit.mockClear()
    mockReturning.mockClear()
    selectLimitQueue = []
    insertReturningValue = [{ id: "new-fb-id" }]
    insertReturningError = null
  })

  it("happy path — inserts a new row and returns created:true", async () => {
    const result = await ingestFeedbackRow(BASE_INPUT)
    expect(result).toEqual({ feedbackId: "new-fb-id", created: true })
  })

  it("returns existing id without re-inserting when external ref already exists", async () => {
    selectLimitQueue = [[{ id: "existing-fb-id" }]]

    const result = await ingestFeedbackRow({
      ...BASE_INPUT,
      externalReviewId: "rev-123",
      externalSource:   "google",
    })

    expect(result).toEqual({ feedbackId: "existing-fb-id", created: false })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("throws when customer_id does not belong to the organization", async () => {
    selectLimitQueue = [[]]

    await expect(
      ingestFeedbackRow({ ...BASE_INPUT, customerId: "cust-other-org" })
    ).rejects.toThrow("customer_id does not belong to this organization")
  })

  it("throws when appointment_id does not belong to the organization", async () => {
    selectLimitQueue = [[{ id: "cust-1" }], []]

    await expect(
      ingestFeedbackRow({
        ...BASE_INPUT,
        customerId:    "cust-1",
        appointmentId: "appt-other-org",
      })
    ).rejects.toThrow("appointment_id does not belong to this organization")
  })

  it("handles race-condition duplicate (23505) by returning existing id", async () => {
    selectLimitQueue = [[], [{ id: "race-fb-id" }]]
    insertReturningError = Object.assign(new Error("duplicate key"), { code: "23505" })

    const result = await ingestFeedbackRow({
      ...BASE_INPUT,
      externalReviewId: "rev-race",
      externalSource:   "yelp",
    })

    expect(mockReturning).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ feedbackId: "race-fb-id", created: false })
  })
})
