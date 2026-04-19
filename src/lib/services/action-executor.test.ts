import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionExecuteResponseSchema } from "@/lib/schemas/cash"

vi.mock("server-only", () => ({}))

// ── Mock recordAiAction ────────────────────────────────────────────────────

const mockRecordAiAction = vi.fn<() => Promise<string>>()
vi.mock("@/lib/services/ai-actions", () => ({
  recordAiAction: (...args: unknown[]) => mockRecordAiAction(...args),
}))

// Must import after mock setup
const { executeAction, markAcknowledged } = await import(
  "@/lib/services/action-executor"
)

describe("action-executor", () => {
  beforeEach(() => {
    mockRecordAiAction.mockReset()
    mockRecordAiAction.mockResolvedValue("a0000000-0000-4000-a000-000000000001")
  })

  // ── Non-executable interventions ───────────────────────────────────────

  describe("non-executable interventions", () => {
    it("returns requires_manual with guidance for secure_financing", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000001",
        category: "secure_financing",
        description: "Apply for line of credit",
        executable: false,
        orgId: "org-1",
      })

      expect(result.status).toBe("requires_manual")
      expect(result.executionType).toBe("manual_guidance")
      expect(result.guidanceText).toContain("manual execution")
      expect(result.guidanceText).toContain("lender")
      expect(result.artifacts).toBeNull()
      expect(mockRecordAiAction).toHaveBeenCalledOnce()
    })

    it("returns requires_manual with guidance for defer_payment", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000002",
        category: "defer_payment",
        description: "Negotiate rent deferral",
        executable: false,
        orgId: "org-1",
      })

      expect(result.status).toBe("requires_manual")
      expect(result.guidanceText).toContain("vendor or creditor")
    })

    it("returns requires_manual with guidance for reduce_expense", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000003",
        category: "reduce_expense",
        description: "Cut vendor costs",
        executable: false,
        orgId: "org-1",
      })

      expect(result.status).toBe("requires_manual")
      expect(result.guidanceText).toContain("expense category")
    })

    it("returns generic guidance for unknown categories", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000004",
        category: "accelerate_collection",
        description: "Some custom action",
        executable: false,
        orgId: "org-1",
      })

      expect(result.status).toBe("requires_manual")
      expect(result.guidanceText).toBeTruthy()
    })
  })

  // ── Executable: accelerate_collection → draft email ────────────────────

  describe("accelerate_collection execution", () => {
    it("drafts a payment reminder email", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000010",
        category: "accelerate_collection",
        description: "Invoice INV-2043 is 11 days past due — $12,500",
        executable: true,
        orgId: "org-1",
        clientName: "Carlos Rivera",
      })

      expect(result.status).toBe("executed")
      expect(result.executionType).toBe("draft_reminder_email")
      expect(result.artifacts).not.toBeNull()
      expect(result.artifacts!.draftEmailContent).toContain("Carlos Rivera")
      expect(result.artifacts!.draftEmailContent).toContain("INV-2043")
      expect(result.artifacts!.taskDescription).toBeNull()
      expect(result.guidanceText).toBeNull()
      expect(result.auditRecordId).toBe("a0000000-0000-4000-a000-000000000001")
    })

    it("uses fallback name when clientName is not provided", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000011",
        category: "accelerate_collection",
        description: "Follow up on overdue invoice",
        executable: true,
        orgId: "org-1",
      })

      expect(result.artifacts!.draftEmailContent).toContain("Valued Customer")
    })
  })

  // ── Executable: default → log follow-up task ───────────────────────────

  describe("default execution (log follow-up task)", () => {
    it("logs a follow-up task for non-collection categories", async () => {
      const result = await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000020",
        category: "defer_payment",
        description: "Negotiate rent deferral with landlord",
        executable: true,
        orgId: "org-1",
      })

      expect(result.status).toBe("executed")
      expect(result.executionType).toBe("log_followup_task")
      expect(result.artifacts).not.toBeNull()
      expect(result.artifacts!.taskDescription).toContain("Follow up:")
      expect(result.artifacts!.taskDescription).toContain("rent deferral")
      expect(result.artifacts!.draftEmailContent).toBeNull()
      expect(result.guidanceText).toBeNull()
    })
  })

  // ── CFO-acknowledged ───────────────────────────────────────────────────

  describe("markAcknowledged", () => {
    it("records CFO acknowledgment and returns executed status", async () => {
      const result = await markAcknowledged(
        "00000000-0000-0000-0000-000000000030",
        "org-1",
        "Reviewed financing options",
      )

      expect(result.status).toBe("executed")
      expect(result.executionType).toBe("cfo_acknowledged")
      expect(result.artifacts).toBeNull()
      expect(result.guidanceText).toBeNull()
      expect(mockRecordAiAction).toHaveBeenCalledOnce()
    })
  })

  // ── Audit record written for every execution ───────────────────────────

  describe("audit records", () => {
    it("writes audit record for executable actions", async () => {
      await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000040",
        category: "accelerate_collection",
        description: "Send reminder",
        executable: true,
        orgId: "org-1",
        clientName: "Test Client",
      })

      expect(mockRecordAiAction).toHaveBeenCalledOnce()
      const call = mockRecordAiAction.mock.calls[0]![0] as Record<string, unknown>
      expect(call.organizationId).toBe("org-1")
      expect(call.entityType).toBe("intervention")
      expect(call.entityId).toBe("00000000-0000-0000-0000-000000000040")
      expect(call.triggerType).toBe("cfo_action")
      expect(call.status).toBe("executed")
    })

    it("writes audit record for non-executable actions", async () => {
      await executeAction({
        interventionId: "00000000-0000-0000-0000-000000000041",
        category: "secure_financing",
        description: "Apply for credit",
        executable: false,
        orgId: "org-1",
      })

      expect(mockRecordAiAction).toHaveBeenCalledOnce()
    })
  })

  // ── Schema conformance ─────────────────────────────────────────────────

  describe("schema conformance", () => {
    it("all responses conform to ActionExecuteResponseSchema", async () => {
      const cases = [
        // executable accelerate_collection
        executeAction({
          interventionId: "00000000-0000-0000-0000-000000000050",
          category: "accelerate_collection",
          description: "Send reminder",
          executable: true,
          orgId: "org-1",
          clientName: "Test",
        }),
        // executable default
        executeAction({
          interventionId: "00000000-0000-0000-0000-000000000051",
          category: "defer_payment",
          description: "Defer rent",
          executable: true,
          orgId: "org-1",
        }),
        // non-executable
        executeAction({
          interventionId: "00000000-0000-0000-0000-000000000052",
          category: "secure_financing",
          description: "Get loan",
          executable: false,
          orgId: "org-1",
        }),
        // acknowledged
        markAcknowledged(
          "00000000-0000-0000-0000-000000000053",
          "org-1",
          "Reviewed",
        ),
      ]

      const results = await Promise.all(cases)
      for (const result of results) {
        const parsed = ActionExecuteResponseSchema.safeParse(result)
        expect(parsed.success).toBe(true)
      }
    })
  })
})
