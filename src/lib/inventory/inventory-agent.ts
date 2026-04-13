import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai"
import type { Shipment, InventoryItem, AgentReport } from "@/lib/types"
import { computeVendorPerformance } from "./vendor-performance"

// ── Tool implementations ──────────────────────────────────────────────────────

function getShipmentOrderHistory(
  shipments: Shipment[],
  asOfDate: string,
  days = 30
) {
  const cutoff = new Date(asOfDate)
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const delivered = shipments.filter(
    (s) => s.status === "delivered" && s.orderedAt >= cutoffStr
  )

  const byItem = new Map<
    string,
    {
      itemId: string
      itemName: string
      vendorName: string
      totalOrdered: number
      orderCount: number
      orders: { date: string; qty: number; unitCost: number }[]
    }
  >()

  for (const s of delivered) {
    for (const li of s.lineItems) {
      const existing = byItem.get(li.itemId) ?? {
        itemId: li.itemId,
        itemName: li.itemName,
        vendorName: s.vendorName,
        totalOrdered: 0,
        orderCount: 0,
        orders: [],
      }
      existing.totalOrdered += li.quantityOrdered
      existing.orderCount++
      existing.orders.push({
        date: s.orderedAt.slice(0, 10),
        qty: li.quantityOrdered,
        unitCost: li.unitCost,
      })
      byItem.set(li.itemId, existing)
    }
  }

  const items = Array.from(byItem.values())
    .map((item) => ({
      ...item,
      avgOrderSize:
        Math.round((item.totalOrdered / item.orderCount) * 100) / 100,
      lastOrderDate:
        [...item.orders].sort((a, b) => b.date.localeCompare(a.date))[0]
          ?.date ?? asOfDate,
    }))
    .sort((a, b) => b.totalOrdered - a.totalOrdered)

  return { asOfDate, daysAnalyzed: days, itemCount: items.length, items }
}

function assessSpoilageRisk(
  shipments: Shipment[],
  inventoryItems: InventoryItem[],
  asOfDate: string
) {
  const hist = getShipmentOrderHistory(shipments, asOfDate, 30)
  const histMap = new Map(hist.items.map((i) => [i.itemId, i]))

  const perishables = inventoryItems.filter((i) => i.expiresAt !== null)
  const today = new Date(asOfDate)

  const items = perishables
    .map((item) => {
      const daysUntilExpiry = item.expiresAt
        ? Math.round(
            (new Date(item.expiresAt).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null

      const h = histMap.get(item.id)
      const totalOrdered30d = h?.totalOrdered ?? 0
      const orderCount = h?.orderCount ?? 0

      return {
        itemId: item.id,
        itemName: item.itemName,
        vendorName: item.vendorName,
        expiresAt: item.expiresAt,
        daysUntilExpiry,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        totalOrdered30d,
        orderCount,
      }
    })
    .sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999))

  return { items }
}

function getVendorPerformanceDetails(
  shipments: Shipment[],
  inventoryItems: InventoryItem[]
) {
  const stats = computeVendorPerformance(shipments, inventoryItems)

  const vendors = stats.map((v) => {
    const priceChanges = inventoryItems
      .filter(
        (i) =>
          i.vendorName === v.vendorName &&
          i.previousUnitCost !== undefined &&
          i.previousUnitCost !== i.unitCost
      )
      .map((i) => ({
        itemName: i.itemName,
        previousUnitCost: i.previousUnitCost!,
        currentUnitCost: i.unitCost,
        changePct: Math.round(
          ((i.unitCost - i.previousUnitCost!) / i.previousUnitCost!) * 100
        ),
      }))

    return { ...v, priceChanges }
  })

  return { vendors }
}

// ── Function declarations for Gemini ─────────────────────────────────────────

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "get_shipment_order_history",
    description:
      "Get aggregated order history from delivered shipments in the last N days. Returns per-ingredient totals sorted by most ordered — use this to identify high-volume ingredients and ordering patterns.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        days: {
          type: SchemaType.NUMBER,
          description:
            "Number of days to look back from today (default: 30). Use 30 for monthly patterns.",
        },
      },
    },
  },
  {
    name: "assess_spoilage_risk",
    description:
      "Cross-reference perishable inventory items (those with expiry dates) against their 30-day order history. Identifies items that may be over-ordered relative to their remaining shelf life.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_vendor_performance",
    description:
      "Get detailed vendor delivery performance stats: on-time %, late counts, average days late, 30-day total spend, and item-level price changes. Use this to assess negotiation opportunities.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
]

// ── System instruction ────────────────────────────────────────────────────────

const systemInstruction = `You are the head chef and operations manager at Ember Table, a busy restaurant.
Your task is to analyse our recent purchasing and delivery data to produce three actionable insights.

REQUIRED: Call ALL THREE tools before writing any conclusions.

After gathering the data, produce a JSON report with:

1. ORDER PATTERNS — top ingredients by 30-day order volume, with recommended quantities for the next order cycle
2. SPOILAGE ALERTS — perishables where our ordering rate likely exceeds what we can use before expiry
3. VENDOR NEGOTIATION — for each vendor with issues (late deliveries or price increases), give 2-3 specific, numbered tactics backed by exact figures

Writing rules:
- Reference exact numbers: "ordered 4× in 30 days, avg 5.5 kg", "42% late rate", "$1,840 spend/30d"
- Spoilage: flag if daysUntilExpiry × estimated daily usage < quantityOnHand + recentOrders
- Negotiation tactics must be concrete, not generic. "Request a 5% credit clause for deliveries more than 2 days late" not "consider negotiating"
- Only include vendors with lateCount > 0 or hasPriceIncrease === true in negotiationOpportunities
- Return ONLY valid JSON with no markdown fences, matching this exact shape:

{
  "summary": "<2–3 sentences referencing demand trends and the biggest risks>",
  "orderInsights": [
    {
      "itemName": "<string>",
      "vendorName": "<string>",
      "totalOrdered30d": <number>,
      "orderCount": <number>,
      "avgOrderSize": <number>,
      "lastOrderDate": "<YYYY-MM-DD>",
      "recommendedQty": <number>,
      "rationale": "<string — reference the order count and any trend>"
    }
  ],
  "spoilageAlerts": [
    {
      "itemName": "<string>",
      "riskLevel": "<high|medium|low>",
      "expiresAt": "<YYYY-MM-DD or null>",
      "totalOrdered30d": <number>,
      "currentStock": <number>,
      "recommendation": "<specific reduction — e.g. 'Reduce next order to 2 kg'>",
      "evidence": "<e.g. '8 kg on hand, expires Apr 15 (3 days), avg weekly usage ~3 kg'>"
    }
  ],
  "negotiationOpportunities": [
    {
      "vendorName": "<string>",
      "priority": "<high|medium|low>",
      "onTimePct": <number>,
      "lateCount": <number>,
      "totalDeliveries": <number>,
      "hasPriceIncrease": <boolean>,
      "totalSpend30d": <number>,
      "tactics": ["<tactic 1>", "<tactic 2>", "<optional tactic 3>"],
      "evidence": "<summary of the data backing these tactics>"
    }
  ]
}`

// ── Agent entry point ─────────────────────────────────────────────────────────

export async function runInventoryAgent(
  shipments: Shipment[],
  inventoryItems: InventoryItem[],
  asOfDate: string
): Promise<AgentReport> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set in environment")

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ functionDeclarations }],
    systemInstruction,
  })

  const chat = model.startChat()
  let result = await chat.sendMessage(
    `Today is ${asOfDate}. Analyse Ember Table's inventory purchasing and shipment data.
Call all three tools to gather the data, then produce the JSON report.`
  )

  // Agentic loop — process tool calls until the model returns final text
  for (let turn = 0; turn < 10; turn++) {
    const calls = result.response.functionCalls()
    if (!calls || calls.length === 0) break

    const responses: Part[] = calls.map((call) => {
      let toolResult: unknown

      if (call.name === "get_shipment_order_history") {
        const args = call.args as { days?: number }
        toolResult = getShipmentOrderHistory(shipments, asOfDate, args.days ?? 30)
      } else if (call.name === "assess_spoilage_risk") {
        toolResult = assessSpoilageRisk(shipments, inventoryItems, asOfDate)
      } else if (call.name === "get_vendor_performance") {
        toolResult = getVendorPerformanceDetails(shipments, inventoryItems)
      } else {
        toolResult = { error: `Unknown tool: ${call.name}` }
      }

      return {
        functionResponse: {
          name: call.name,
          response: toolResult as object,
        },
      }
    })

    result = await chat.sendMessage(responses)
  }

  const finalText = result.response.text()
  const json = finalText
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim()

  const parsed = JSON.parse(json) as Omit<AgentReport, "generatedAt">
  return { ...parsed, generatedAt: new Date().toISOString() }
}
