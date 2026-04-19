import type { Screenshot } from "./portal-schemas"

// ─── Step Display Labels ───────────────────────────────────────────────────

const STEP_LABELS: Record<Screenshot["step"], string> = {
  login: "Login",
  invoice_list: "Invoice List",
  invoice_detail: "Invoice Detail",
  payment_status: "Payment Status",
  message_sent: "Message Sent",
}

// ─── Scenario Display Labels ───────────────────────────────────────────────

const SCENARIO_LABELS: Record<string, string> = {
  invoice_visible_unpaid: "Visible - Unpaid",
  invoice_visible_processing: "Visible - Processing",
  invoice_not_visible: "Not Visible",
  high_engagement: "High Engagement",
  low_engagement: "Low Engagement",
}

// ─── Color Palette per Step ────────────────────────────────────────────────

const STEP_COLORS: Record<Screenshot["step"], { bg: string; accent: string }> = {
  login:          { bg: "#1e3a5f", accent: "#4a90d9" },
  invoice_list:   { bg: "#2d4a22", accent: "#6abf4b" },
  invoice_detail: { bg: "#4a3b2d", accent: "#d4a843" },
  payment_status: { bg: "#3b2d4a", accent: "#9b6ad4" },
  message_sent:   { bg: "#2d3b4a", accent: "#4ad4c9" },
}

/**
 * Generate a labeled SVG placeholder screenshot as a base64 data URI.
 *
 * The SVG is 400×300 and shows:
 * - Step name (e.g. "Invoice Detail")
 * - Scenario label (e.g. "Visible – Unpaid")
 * - A simple icon-like visual indicator per step
 */
export function generateMockScreenshot(
  step: Screenshot["step"],
  scenario: string,
): string {
  const stepLabel = STEP_LABELS[step] ?? step
  const scenarioLabel = SCENARIO_LABELS[scenario] ?? scenario
  const { bg, accent } = STEP_COLORS[step] ?? STEP_COLORS.login

  const icon = stepIcon(step, accent)

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">`,
    `  <rect width="400" height="300" fill="${bg}" rx="8"/>`,
    `  <rect x="10" y="10" width="380" height="280" fill="none" stroke="${accent}" stroke-width="2" rx="6" stroke-dasharray="8 4"/>`,
    icon,
    `  <text x="200" y="190" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold">${escapeXml(stepLabel)}</text>`,
    `  <text x="200" y="220" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="14">${escapeXml(scenarioLabel)}</text>`,
    `  <text x="200" y="275" text-anchor="middle" fill="#ffffff80" font-family="sans-serif" font-size="10">Mock Screenshot – Demo Mode</text>`,
    `</svg>`,
  ].join("\n")

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`
}

/** Simple icon shapes per step */
function stepIcon(step: Screenshot["step"], color: string): string {
  switch (step) {
    case "login":
      // Key icon
      return [
        `  <circle cx="200" cy="100" r="20" fill="none" stroke="${color}" stroke-width="3"/>`,
        `  <line x1="200" y1="120" x2="200" y2="155" stroke="${color}" stroke-width="3"/>`,
        `  <line x1="200" y1="140" x2="212" y2="140" stroke="${color}" stroke-width="3"/>`,
        `  <line x1="200" y1="150" x2="212" y2="150" stroke="${color}" stroke-width="3"/>`,
      ].join("\n")
    case "invoice_list":
      // List icon (three lines)
      return [
        `  <rect x="160" y="80" width="80" height="12" rx="2" fill="${color}" opacity="0.9"/>`,
        `  <rect x="160" y="100" width="80" height="12" rx="2" fill="${color}" opacity="0.6"/>`,
        `  <rect x="160" y="120" width="80" height="12" rx="2" fill="${color}" opacity="0.4"/>`,
      ].join("\n")
    case "invoice_detail":
      // Document icon
      return [
        `  <rect x="175" y="70" width="50" height="65" rx="4" fill="none" stroke="${color}" stroke-width="3"/>`,
        `  <line x1="185" y1="90" x2="215" y2="90" stroke="${color}" stroke-width="2"/>`,
        `  <line x1="185" y1="100" x2="215" y2="100" stroke="${color}" stroke-width="2"/>`,
        `  <line x1="185" y1="110" x2="205" y2="110" stroke="${color}" stroke-width="2"/>`,
      ].join("\n")
    case "payment_status":
      // Checkmark in circle
      return [
        `  <circle cx="200" cy="105" r="28" fill="none" stroke="${color}" stroke-width="3"/>`,
        `  <polyline points="185,105 195,118 218,90" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      ].join("\n")
    case "message_sent":
      // Envelope icon
      return [
        `  <rect x="170" y="80" width="60" height="45" rx="4" fill="none" stroke="${color}" stroke-width="3"/>`,
        `  <polyline points="170,80 200,108 230,80" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`,
      ].join("\n")
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
