const NODES = [
  { id: "opspilot", label: "OpsPilot",  x: 200, y: 130, r: 28, primary: true },
  { id: "tinyfish", label: "TinyFish",  x: 60,  y: 45,  r: 20 },
  { id: "stripe",   label: "Stripe",    x: 340, y: 45,  r: 20 },
  { id: "gmail",    label: "Gmail",     x: 60,  y: 215, r: 20 },
  { id: "vendor",   label: "Vendors",   x: 340, y: 215, r: 20 },
  { id: "claude",   label: "Claude AI", x: 200, y: 265, r: 20 },
]

const EDGES = [
  ["opspilot", "tinyfish"],
  ["opspilot", "stripe"],
  ["opspilot", "gmail"],
  ["opspilot", "vendor"],
  ["opspilot", "claude"],
]

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]))

export function McpGraph() {
  return (
    <svg viewBox="0 20 400 270" className="w-full" aria-hidden="true">
      {EDGES.map(([a, b]) => {
        const na = nodeMap[a], nb = nodeMap[b]
        return (
          <line key={`${a}-${b}`}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke="hsl(220 13% 91%)" strokeWidth="1.5" strokeDasharray="5 4"
          />
        )
      })}
      {NODES.map(n => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <circle r={n.r} fill={n.primary ? "hsl(0 0% 10%)" : "white"} stroke="hsl(220 13% 91%)" strokeWidth="1.5" />
          <text
            textAnchor="middle" dy="4"
            fontSize={n.primary ? 9 : 7.5}
            fill={n.primary ? "white" : "hsl(0 0% 10%)"}
            fontFamily="Inter, sans-serif"
            fontWeight="600"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
