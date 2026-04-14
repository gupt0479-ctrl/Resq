import { vi, describe, it, expect } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

// vi.mock is hoisted by vitest above all imports, so "server-only" is mocked
// before feedback.ts (and its transitive deps) resolve the import.
vi.mock("server-only", () => ({}))

import { ingestFeedbackRow } from "@/lib/services/feedback"

// ── Helpers ───────────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

/**
 * Returns a Proxy that responds to any chain of PostgREST builder calls
 * (`.select()`, `.eq()`, `.insert()`, etc.) and resolves to `result` when
 * a terminal method (`.maybeSingle()` or `.single()`) is called.
 */
function makeBuilder(result: QueryResult): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve(result)
        return (..._: unknown[]) => proxy
      },
    }
  )
  return proxy
}

/**
 * Builds a minimal Supabase-shaped client.
 * `fromHandlers` maps table name → handler function that receives the call kind
 * ("find" | "insert") and returns a builder.
 */
function makeClient(
  fromHandlers: Record<string, (kind: "find" | "insert") => unknown>
): SupabaseClient {
  return {
    from(table: string) {
      const handler = fromHandlers[table]
      if (!handler) throw new Error(`Unexpected .from("${table}") call in test`)
      return {
        select: (..._: unknown[]) => handler("find"),
        insert: (_data: unknown) => ({
          select: (..._: unknown[]) => handler("insert"),
        }),
      }
    },
  } as unknown as SupabaseClient
}

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
    const client = makeClient({
      feedback: (kind) =>
        kind === "insert"
          ? makeBuilder({ data: { id: "new-fb-id" }, error: null })
          : makeBuilder({ data: null, error: null }),
    })

    const result = await ingestFeedbackRow(client, BASE_INPUT)
    expect(result).toEqual({ feedbackId: "new-fb-id", created: true })
  })

  it("returns existing id without re-inserting when external ref already exists", async () => {
    const client = makeClient({
      // first call to feedback.select is the dedup look-up
      feedback: () => makeBuilder({ data: { id: "existing-fb-id" }, error: null }),
    })

    const result = await ingestFeedbackRow(client, {
      ...BASE_INPUT,
      externalReviewId: "rev-123",
      externalSource:   "google",
    })

    expect(result).toEqual({ feedbackId: "existing-fb-id", created: false })
  })

  it("throws when customer_id does not belong to the organization", async () => {
    const client = makeClient({
      // customers.maybeSingle returns null → cross-org attempt
      customers: () => makeBuilder({ data: null, error: null }),
      feedback:  () => makeBuilder({ data: null, error: null }),
    })

    await expect(
      ingestFeedbackRow(client, { ...BASE_INPUT, customerId: "cust-other-org" })
    ).rejects.toThrow("customer_id does not belong to this organization")
  })

  it("throws when appointment_id does not belong to the organization", async () => {
    const client = makeClient({
      customers:    () => makeBuilder({ data: { id: "cust-1" }, error: null }),
      appointments: () => makeBuilder({ data: null, error: null }),
      feedback:     () => makeBuilder({ data: null, error: null }),
    })

    await expect(
      ingestFeedbackRow(client, {
        ...BASE_INPUT,
        customerId:    "cust-1",
        appointmentId: "appt-other-org",
      })
    ).rejects.toThrow("appointment_id does not belong to this organization")
  })

  it("handles race-condition duplicate (23505) by returning existing id", async () => {
    let insertCalled = false
    let feedbackFindCallCount = 0
    const client = makeClient({
      feedback: (kind) => {
        if (kind === "insert") {
          insertCalled = true
          return makeBuilder({ data: null, error: { message: "duplicate key", code: "23505" } })
        }
        feedbackFindCallCount++
        if (feedbackFindCallCount === 1) {
          // First call: pre-insert dedup check finds nothing
          return makeBuilder({ data: null, error: null })
        }
        // Second call: post-23505 re-query finds the row inserted by the concurrent request
        return makeBuilder({ data: { id: "race-fb-id" }, error: null })
      },
    })

    const result = await ingestFeedbackRow(client, {
      ...BASE_INPUT,
      externalReviewId: "rev-race",
      externalSource:   "yelp",
    })

    expect(insertCalled).toBe(true)
    expect(result).toEqual({ feedbackId: "race-fb-id", created: false })
  })
})
