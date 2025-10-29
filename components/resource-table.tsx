"use client"

import type { ResourceSnapshot } from "@/lib/scheduler"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export default function ResourceTable({ resources }: { resources: ResourceSnapshot }) {
  const items = Object.keys(resources.owners).map((r) => {
    return {
      resource: r,
      policy: resources.policy[r] || "FIFO",
      owner: resources.owners[r] ?? null,
      waiting: resources.waitQueues[r] ?? [],
    }
  })

  const head = [
    { key: "resource", label: "Resource", tip: "Resource name (R1, R2, ...)" },
    { key: "policy", label: "Policy", tip: "FIFO or Priority waiter selection" },
    { key: "owner", label: "Owner", tip: "Process ID that holds the resource, if any" },
    { key: "waiting", label: "Waiting", tip: "Queued processes waiting to acquire the resource" },
  ]

  return (
    <div className="overflow-hidden rounded-md border">
      <TooltipProvider delayDuration={100}>
        <div className="grid grid-cols-4 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
          {head.map((h) => (
            <div key={h.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">{h.label}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{h.tip}</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
        <div className="divide-y">
          {items.map((it) => (
            <div key={it.resource} className="grid grid-cols-4 px-3 py-2 text-sm">
              <div>{it.resource}</div>
              <div>{it.policy}</div>
              <div>{it.owner ? `P${it.owner}` : "-"}</div>
              <div className="truncate" title="Waiting PIDs">
                {it.waiting.map((p) => `P${p}`).join(", ") || "-"}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No resources defined.</div>}
        </div>
      </TooltipProvider>
    </div>
  )
}
