import "server-only"

import { recordAiAction } from "@/lib/services/ai-actions"
import type { ActionExecuteResponse, InterventionCategory } from "@/lib/schemas/cash"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExecuteInput {
  interventionId: string
  category: InterventionCategory
  description: string
  executable: boolean
  orgId: string
  clientName?: string
}

// ── Guidance text for non-executable interventions ─────────────────────────

const GUIDANCE: Record<string, string> = {
  secure_financing:
    "This action requires manual execution. Review the financing offer details, contact the lender directly, and complete their application process. Log the outcome in the audit timeline once complete.",
  defer_payment:
    "This action requires manual execution. Contact the vendor or creditor to negotiate a payment deferral. Document the agreed terms and update the obligation schedule accordingly.",
  reduce_expense:
    "This action requires manual execution. Review the flagged expense category, identify reduction opportunities, and implement changes. Record the expected savings in the audit timeline.",
}

function getGuidanceText(category: string, description: string): string {
  return (
    GUIDANCE[category] ??
    `This action requires manual execution: ${description}. Please complete it outside the system and log the outcome.`
  )
}

// ── Email template ─────────────────────────────────────────────────────────

function generateReminderEmail(clientName: string, description: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return [
    `Dear ${clientName},`,
    "",
    `I hope this message finds you well. I'm writing regarding an outstanding balance on your account that requires attention.`,
    "",
    `${description}`,
    "",
    `As of ${today}, this invoice is past its due date. We value our business relationship and want to work with you to resolve this promptly.`,
    "",
    `Could you please:`,
    `  1. Confirm receipt of this reminder`,
    `  2. Provide an expected payment date`,
    `  3. Let us know if there are any issues we can help resolve`,
    "",
    `If payment has already been sent, please disregard this notice and accept our thanks.`,
    "",
    `Best regards,`,
    `Accounts Receivable`,
  ].join("\n")
}

// ── Core execution logic ───────────────────────────────────────────────────

export async function executeAction(
  input: ExecuteInput,
): Promise<ActionExecuteResponse> {
  // ── Non-executable: return guidance ────────────────────────────────────
  if (!input.executable) {
    const auditRecordId = await recordAiAction({
      organizationId: input.orgId,
      entityType: "intervention",
      entityId: input.interventionId,
      triggerType: "cfo_action",
      actionType: "customer_followup_drafted",
      inputSummary: `Non-executable action attempted: ${input.description}`,
      outputPayload: {
        status: "requires_manual",
        category: input.category,
      },
      status: "executed",
    })

    return {
      status: "requires_manual",
      auditRecordId,
      executionType: "manual_guidance",
      artifacts: null,
      guidanceText: getGuidanceText(input.category, input.description),
    }
  }

  // ── Executable: dispatch by category ───────────────────────────────────
  switch (input.category) {
    case "accelerate_collection": {
      // Draft a payment reminder email
      const draftEmail = generateReminderEmail(
        input.clientName ?? "Valued Customer",
        input.description,
      )

      const auditRecordId = await recordAiAction({
        organizationId: input.orgId,
        entityType: "intervention",
        entityId: input.interventionId,
        triggerType: "cfo_action",
        actionType: "customer_followup_drafted",
        inputSummary: `Drafted payment reminder for ${input.clientName ?? "customer"}: ${input.description}`,
        outputPayload: {
          executionType: "draft_reminder_email",
          clientName: input.clientName,
          category: input.category,
        },
        status: "executed",
      })

      return {
        status: "executed",
        auditRecordId,
        executionType: "draft_reminder_email",
        artifacts: {
          draftEmailContent: draftEmail,
          taskDescription: null,
        },
        guidanceText: null,
      }
    }

    default: {
      // Log a follow-up task in the audit timeline
      const taskDescription = `Follow up: ${input.description}`

      const auditRecordId = await recordAiAction({
        organizationId: input.orgId,
        entityType: "intervention",
        entityId: input.interventionId,
        triggerType: "cfo_action",
        actionType: "customer_followup_sent",
        inputSummary: `Logged follow-up task: ${input.description}`,
        outputPayload: {
          executionType: "log_followup_task",
          taskDescription,
          category: input.category,
        },
        status: "executed",
      })

      return {
        status: "executed",
        auditRecordId,
        executionType: "log_followup_task",
        artifacts: {
          draftEmailContent: null,
          taskDescription,
        },
        guidanceText: null,
      }
    }
  }
}

// ── CFO-acknowledged helper ────────────────────────────────────────────────

export async function markAcknowledged(
  interventionId: string,
  orgId: string,
  description: string,
): Promise<ActionExecuteResponse> {
  const auditRecordId = await recordAiAction({
    organizationId: orgId,
    entityType: "intervention",
    entityId: interventionId,
    triggerType: "cfo_action",
    actionType: "customer_followup_sent",
    inputSummary: `CFO acknowledged action: ${description}`,
    outputPayload: {
      executionType: "cfo_acknowledged",
      description,
    },
    status: "executed",
  })

  return {
    status: "executed",
    auditRecordId,
    executionType: "cfo_acknowledged",
    artifacts: null,
    guidanceText: null,
  }
}
