"use client"

import { useMemo, useState, useCallback } from "react"
import type { SchedulerSnapshot, Process } from "@/lib/scheduler"
import ProcessDetails from "@/components/process-details"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

function getWaitingInfo(snapshot: SchedulerSnapshot, p: Process): string {
  const inQueues =
    Object.keys(snapshot.resources.waitQueues).filter((r) => (snapshot.resources.waitQueues[r] || []).includes(p.id)) ||
    []

  if (inQueues.length === 0 && p.state === "blocked") {
    const nextReq = p.required[p.acquired.length]
    if (nextReq) {
      const owner = snapshot.resources.owners[nextReq]
      return owner && owner !== p.id ? `${nextReq} (owner P${owner})` : nextReq
    }
  }

  if (inQueues.length === 0) return "-"
  const parts = inQueues.map((r) => {
    const owner = snapshot.resources.owners[r]
    return owner && owner !== p.id ? `${r} (owner P${owner})` : r
  })
  return parts.join(", ")
}

export default function ProcessTable({ snapshot }: { snapshot: SchedulerSnapshot }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Process | null>(null)

  const rows = useMemo(
    () =>
      snapshot.processes
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((p) => {
          return {
            pid: p.id,
            name: p.name,
            type: p.type,
            queue: `Q${p.queueLevel}`,
            arrival: p.arrival,
            burst: p.burst,
            priority: p.priority,
            state: p.state,
            held: p.acquired.length ? p.acquired.join(", ") : "-",
            waitingFor: getWaitingInfo(snapshot, p),
          }
        }),
    [snapshot],
  )

  const onOpenRow = useCallback(
    (pid: string) => {
      const proc = snapshot.processes.find((x) => x.id === pid) || null
      setSelected(proc)
      setOpen(!!proc)
    },
    [snapshot.processes],
  )

  const head = [
    { key: "pid", label: "PID", tip: "Process identifier (P…)" },
    { key: "name", label: "Name", tip: "Human-friendly name" },
    { key: "type", label: "Type", tip: "Interactive/Important/Batch (initial queue)" },
    { key: "queue", label: "Queue", tip: "Current queue level (Q0/Q1/Q2)" },
    { key: "arrival", label: "Arrival", tip: "Tick when process became ready" },
    { key: "burst", label: "Burst", tip: "Total CPU time required" },
    { key: "priority", label: "Priority", tip: "Lower number = higher priority (Q1 preemption)" },
    { key: "state", label: "State", tip: "new, ready, running, blocked, finished" },
    { key: "held", label: "Held Resources", tip: "Resources currently owned by the process" },
    { key: "waiting", label: "Waiting For", tip: "What resource (and owner) it waits for, if blocked" },
  ] as const

  return (
    <>
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
                  <td className="p-2 text-muted-foreground" colSpan={10}>
                    No processes yet. Generate or add a process to see details.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.pid}
                  className="cursor-pointer border-b hover:bg-muted/30"
                  onClick={() => onOpenRow(r.pid)}
                  role="button"
                  tabIndex={0}
                  title="Click to open details"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpenRow(r.pid)
                  }}
                >
                  <td className="p-2">P{r.pid}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.queue}</td>
                  <td className="p-2">{r.arrival}</td>
                  <td className="p-2">{r.burst}</td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2 capitalize">{r.state}</td>
                  <td className="p-2">{r.held}</td>
                  <td className="p-2">{r.waitingFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipProvider>
      </div>

      {selected && <ProcessDetails open={open} onOpenChange={setOpen} process={selected} snapshot={snapshot} />}
    </>
  )
}
