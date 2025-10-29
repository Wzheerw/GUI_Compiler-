"use client"

import type { AlgoKey, ProcessRecord } from "@/lib/scheduler"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

const head = [
  { key: "pid", label: "PID", tip: "Process identifier (e.g., P1, P2…)" },
  { key: "name", label: "Name", tip: "Human-readable process name" },
  { key: "arrival", label: "Arrival", tip: "Tick at which the process became ready" },
  { key: "burst", label: "Burst", tip: "Total CPU time units required" },
  { key: "priority", label: "Priority", tip: "Lower number means higher priority (Q1 comparison)" },
  { key: "type", label: "Type", tip: "Interactive/Important/Batch (initial queue selection)" },
  { key: "start", label: "Start", tip: "First tick the process began running" },
  { key: "end", label: "End", tip: "Tick when the process finished" },
  { key: "waiting", label: "Waiting", tip: "Turnaround − Burst (time not running)" },
  { key: "tat", label: "Turnaround", tip: "Completion time − Arrival time" },
  { key: "weighted", label: "Weighted", tip: "Turnaround / Burst (normalized responsiveness)" },
  { key: "by", label: "Terminated By", tip: "Queue/algorithm in which it completed" },
]

export default function AlgoTable({
  title,
  algo,
  rows,
}: {
  title: string
  algo: AlgoKey | "Priority"
  rows: ProcessRecord[]
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between bg-muted px-3 py-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">Per-process metrics and termination sequence</div>
      </div>
      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={100}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                {head.map((h) => (
                  <th key={h.key} className="p-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline-offset-4 hover:underline">{h.label}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{h.tip}</TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="p-2 text-muted-foreground" colSpan={12}>
                    No processes in this algorithm group yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">P{r.id}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.arrival}</td>
                  <td className="p-2">{r.burst}</td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.startTime ?? "-"}</td>
                  <td className="p-2">{r.endTime ?? "-"}</td>
                  <td className="p-2">{r.waitingTime?.toFixed(0)}</td>
                  <td className="p-2">{r.turnaroundTime?.toFixed(0)}</td>
                  <td className="p-2">{(r.weightedTurnaround ?? 0).toFixed(2)}</td>
                  <td className="p-2">{r.finishedBy ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  )
}
