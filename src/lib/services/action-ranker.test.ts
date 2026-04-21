import { describe, it, expect } from "vitest"
import fc from "fast-check"
import {
  InterventionCategorySchema,
  InterventionSchema,
} from "@/lib/schemas/cash"

/**
 * Property 14: Intervention Categories Valid
 * Validates: Requirements 5.3
 *
 * Every intervention's category must be one of:
 * accelerate_collection, secure_financing, defer_payment, reduce_expense
 */

const VALID_CATEGORIES = [
  "accelerate_collection",
  "secure_financing",
  "defer_payment",
  "reduce_expense",
] as const

describe("Property 14: Intervention Categories Valid", () => {
  it("every valid category passes InterventionCategorySchema", () => {
    for (const cat of VALID_CATEGORIES) {
      expect(InterventionCategorySchema.safeParse(cat).success).toBe(true)
    }
  })

  it("random invalid strings fail InterventionCategorySchema", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => !(VALID_CATEGORIES as readonly string[]).includes(s)),
        (randomStr) => {
          expect(InterventionCategorySchema.safeParse(randomStr).success).toBe(
            false,
          )
        },
      ),
      { numRuns: 200 },
    )
  })

  it("generated interventions always have valid categories", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          category: fc.constantFrom(...VALID_CATEGORIES),
          description: fc.string({ minLength: 1, maxLength: 50 }),
          cashImpactEstimate: fc.double({
            min: 0,
            max: 500000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          speedDays: fc.integer({ min: 0, max: 365 }),
          riskLevel: fc.constantFrom(
            "low" as const,
            "medium" as const,
            "high" as const,
          ),
          confidenceScore: fc.double({
            min: 0,
            max: 1,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          sourceAttribution: fc.option(fc.string(), { nil: null }),
          executable: fc.boolean(),
        }),
        (intervention) => {
          const result = InterventionSchema.safeParse(intervention)
          expect(result.success).toBe(true)
          if (result.success) {
            expect(VALID_CATEGORIES).toContain(result.data.category)
          }
        },
      ),
      { numRuns: 500 },
    )
  })
})
