"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  // key -> { label, color }, sets CSS variables like --color-key for Recharts fills
  config?: Record<string, { label: string; color: string }>
}

// Create CSS variables from config so you can use fill="var(--color-rr)" etc.
export function ChartContainer({ className, children, config }: ChartContainerProps) {
  const styleVars: React.CSSProperties = {}
  if (config) {
    for (const key of Object.keys(config)) {
      const color = config[key]?.color
      if (color) {
        ;(styleVars as any)[`--color-${key}`] = color
      }
    }
  }
  return (
    <div
      style={styleVars}
      className={cn(
        "relative grid w-full min-w-0 overflow-hidden rounded-md border bg-background p-2 text-foreground",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-white px-2 py-1 text-xs shadow-sm">
      {label !== undefined && <div className="mb-1 font-medium">{String(label)}</div>}
      <div className="space-y-0.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-medium">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartLegendContent({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}
