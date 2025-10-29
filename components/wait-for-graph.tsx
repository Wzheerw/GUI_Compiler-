"use client"

import type { Process } from "@/lib/scheduler"
import { useMemo } from "react"

// Simple circular layout SVG wait-for graph with arrows and cycle highlighting.
export default function WaitForGraph({
  processes,
  waitFor,
  cycle,
}: {
  processes: Process[]
  waitFor: Record<string, string[]>
  cycle: string[]
}) {
  const nodes = processes.map((p) => ({ id: p.id, label: p.name }))
  const edges: { from: string; to: string }[] = []
  for (const from of Object.keys(waitFor)) {
    for (const to of waitFor[from]) edges.push({ from, to })
  }

  const size = 280
  const center = size / 2
  const radius = size / 2 - 28

  const layout = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {}
    const n = Math.max(nodes.length, 1)
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)
      map[node.id] = { x, y }
    })
    return map
  }, [nodes.length])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-64 w-full"
      role="img"
      aria-label="Wait-For graph. Node Pᵢ points to Pⱼ if Pᵢ waits for a resource owned by Pⱼ. Cycles indicate deadlock."
    >
      <title>{"Wait-For Graph (edge Pᵢ→Pⱼ means Pᵢ waits on Pⱼ; cycle = deadlock)"}</title>
      {/* Edges */}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="currentColor" />
        </marker>
      </defs>
      {edges.map((e, idx) => {
        const from = layout[e.from]
        const to = layout[e.to]
        if (!from || !to) return null
        const isCycle = cycle.includes(e.from) && cycle.includes(e.to)
        const dx = to.x - from.x
        const dy = to.y - from.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / dist
        const uy = dy / dist
        const startX = from.x + ux * 18
        const startY = from.y + uy * 18
        const endX = to.x - ux * 18
        const endY = to.y - uy * 18
        return (
          <line
            key={idx}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={isCycle ? "rgb(239 68 68)" : "rgb(107 114 128)"}
            strokeWidth={isCycle ? 2.5 : 1.5}
            markerEnd="url(#arrow)"
          />
        )
      })}
      {/* Nodes */}
      {nodes.map((n) => {
        const pos = layout[n.id]
        const inCycle = cycle.includes(n.id)
        return (
          <g key={n.id}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={16}
              fill={inCycle ? "rgb(254 242 242)" : "white"}
              stroke={inCycle ? "rgb(239 68 68)" : "rgb(156 163 175)"}
              strokeWidth={2}
            />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10" fill="black">
              {n.label}
            </text>
          </g>
        )
      })}
      <text x={8} y={size - 8} fontSize="10" fill="rgb(100 116 139)">
        {"Wait-For Graph — Pᵢ→Pⱼ means Pᵢ waits on Pⱼ"}
      </text>
    </svg>
  )
}
