type Node = { id: string; label: string; sub: string[]; x: number; y: number; w: number; h: number; primary?: boolean }
type Edge = { from: string; to: string; label: string }

const NODES: Node[] = [
  { id: "gmail",   label: "Gmail",          sub: ["Outreach"],                                            x: 310, y: 55,  w: 110, h: 44 },
  { id: "vendor",  label: "Vendor Sources", sub: ["Catalog"],                                             x: 490, y: 80,  w: 130, h: 44 },
  { id: "tinyfish",label: "TinyFish",       sub: ["Web agent"],                                           x: 100, y: 160, w: 110, h: 44 },
  { id: "opspilot",label: "Resq",sub: ["Agent core"],                                          x: 310, y: 210, w: 150, h: 50, primary: true },
  { id: "stripe",  label: "Stripe",         sub: ["Ledger"],                                              x: 100, y: 305, w: 110, h: 44 },
  { id: "insurance",label: "Insurance",     sub: ["Autonomous multi-step tool use", "Mock-safe and live-ready"], x: 490, y: 290, w: 160, h: 58 },
]

const EDGES: Edge[] = [
  { from: "tinyfish",  to: "opspilot", label: "fetch offers" },
  { from: "gmail",     to: "opspilot", label: "draft outreach" },
  { from: "vendor",    to: "opspilot", label: "compare pricing" },
  { from: "opspilot",  to: "stripe",   label: "inspect invoice state" },
  { from: "opspilot",  to: "insurance",label: "check renewal terms" },
]

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]))

function midpoint(ax: number, ay: number, bx: number, by: number) {
  return { x: (ax + bx) / 2, y: (ay + by) / 2 }
}

export function McpGraph() {
  return (
    <svg viewBox="20 20 600 360" className="w-full" aria-hidden="true">
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(0 72% 51%)" opacity="0.7" />
        </marker>
      </defs>

      {/* Edges */}
      {EDGES.map(({ from, to, label }) => {
        const a = nodeMap[from], b = nodeMap[to]
        const x1 = a.x, y1 = a.y
        const x2 = b.x, y2 = b.y
        const mid = midpoint(x1, y1, x2, y2)
        return (
          <g key={`${from}-${to}`}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="hsl(0 72% 51%)" strokeWidth="1" strokeDasharray="5 4" opacity="0.55"
              markerEnd="url(#arr)"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.2s" repeatCount="indefinite" />
            </line>
            <text
              x={mid.x} y={mid.y - 4}
              textAnchor="middle"
              fontSize="9"
              fill="hsl(0 72% 51%)"
              fontFamily="Inter, sans-serif"
              opacity="0.9"
            >
              {label}
            </text>
          </g>
        )
      })}

      {/* Nodes */}
      {NODES.map(n => {
        const rx = n.x - n.w / 2
        const ry = n.y - n.h / 2
        return (
          <g key={n.id}>
            <rect
              x={rx} y={ry} width={n.w} height={n.h} rx="6"
              fill="white"
              stroke="hsl(0 0% 10%)"
              strokeWidth={n.primary ? 1.5 : 1}
            />
            <text
              x={n.x} y={n.y - (n.sub.length > 1 ? 10 : 6)}
              textAnchor="middle"
              fontSize={n.primary ? 10.5 : 10}
              fontWeight="600"
              fill="hsl(0 0% 10%)"
              fontFamily="Inter, sans-serif"
            >
              {n.label}
            </text>
            {n.sub.map((s, i) => (
              <text
                key={i}
                x={n.x}
                y={n.y + (n.sub.length > 1 ? (i === 0 ? 5 : 16) : 8)}
                textAnchor="middle"
                fontSize="8"
                fill="hsl(220 9% 52%)"
                fontFamily="Inter, sans-serif"
              >
                {s}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
