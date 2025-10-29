"use client"

import type { SchedulerSnapshot } from "@/lib/scheduler"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function QueueView({ snapshot }: { snapshot: SchedulerSnapshot }) {
  const renderQueue = (label: string, items: string[], color: string, description: string) => {
    return (
      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-medium">{label}</div>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-xs text-muted-foreground underline-offset-4 hover:underline">
                    What is this?
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="secondary" title="Processes currently queued here">
            {items.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && <div className="text-sm text-muted-foreground">Empty</div>}
          {items.map((pid) => {
            const proc = snapshot.processes.find((p) => p.id === pid)
            return (
              <div
                key={pid}
                className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs ${color}`}
                title={`Process ${proc?.name ?? `P${pid}`} (priority ${proc?.priority})`}
              >
                <span>{proc?.name ?? `P${pid}`}</span>
                <span className="text-muted-foreground">prio {proc?.priority}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const running = snapshot.current ? snapshot.processes.find((p) => p.id === snapshot.current) : undefined

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="md:col-span-3">
        <div className="rounded-md border p-3">
          <div className="mb-2 font-medium">Running</div>
          {running ? (
            <div className="text-sm" title="Currently scheduled process on CPU">
              {running.name} • Q{running.queueLevel} • remaining {running.remaining}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground" title="No process running this tick">
              CPU Idle
            </div>
          )}
        </div>
      </div>
      {renderQueue(
        "Q0 • Round Robin",
        snapshot.q0,
        "bg-teal-50",
        "Time-sliced queue for interactive tasks. Exceeding quantum causes demotion to Q1.",
      )}
      {renderQueue(
        "Q1 • Priority (preemptive)",
        snapshot.q1,
        "bg-amber-50",
        "Preemptive priority queue. Lower numeric priority preempts higher.",
      )}
      {renderQueue("Q2 • FCFS", snapshot.q2, "bg-slate-50", "First-Come, First-Served. Non-preemptive.")}
    </div>
  )
}
