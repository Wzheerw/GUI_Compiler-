"use client"

import type { SchedulerSnapshot } from "@/lib/scheduler"
import { useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function classifyMessage(msg: string) {
  // Simple tags for emphasis in the tooltip
  if (msg.includes("Preempt")) return { tag: "Preemption", tone: "text-rose-600" }
  if (msg.includes("demoted")) return { tag: "Demotion", tone: "text-amber-600" }
  if (msg.includes("allocated")) return { tag: "Allocated", tone: "text-emerald-600" }
  if (msg.includes("waiting for")) return { tag: "Blocked", tone: "text-orange-600" }
  if (msg.includes("released")) return { tag: "Released", tone: "text-sky-600" }
  if (msg.includes("resumed")) return { tag: "Resumed", tone: "text-green-600" }
  if (msg.includes("finished")) return { tag: "Finished", tone: "text-indigo-600" }
  if (msg.includes("arrived")) return { tag: "Arrival", tone: "text-neutral-600" }
  return null
}

export default function GanttChart({
  snapshot,
  completed = false,
}: {
  snapshot: SchedulerSnapshot
  completed?: boolean
}) {
  // Build per-process swimlanes from history; fallback to timeline for idle
  const procs = snapshot.processes.slice().sort((a, b) => Number(a.id) - Number(b.id))

  const maxTime = Math.max(snapshot.time, snapshot.timeline.length)

  const colorsByQueue = {
    // Q0, Q1, Q2
    0: "bg-teal-500",
    1: "bg-amber-500",
    2: "bg-slate-500",
  } as const

  const laneMap = useMemo(() => {
    const map: Record<string, { t: number; q: number }[]> = {}
    for (const p of procs) {
      map[p.id] = p.history
    }
    return map
  }, [procs])

  // Parse log into a time -> messages[] index
  const eventsByTime = useMemo(() => {
    const map: Record<number, string[]> = {}
    const re = /^t=(\d+):\s(.+)$/
    for (const line of snapshot.log) {
      const m = line.match(re)
      if (!m) continue
      const t = Number(m[1])
      const msg = m[2]
      if (!map[t]) map[t] = []
      map[t].push(msg)
    }
    return map
  }, [snapshot.log])

  // Grid rendering: each unit width is 16px
  const unitW = 16

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full overflow-x-auto">
        <div className="relative inline-block min-w-full rounded-md border">
          <div className="flex bg-muted/50 text-sm text-muted-foreground">
            <div className="w-24 shrink-0 px-2 py-2">Process</div>
            <div className="flex-1 px-2 py-2">Timeline (0..{maxTime})</div>
          </div>
          <div>
            {procs.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground">No processes yet.</div>}
            {procs.map((p) => (
              <div key={p.id} className="flex items-stretch border-t">
                <div className="w-24 shrink-0 px-2 py-2 text-sm">{p.name}</div>
                <div className="relative flex-1">
                  {/* baseline grid */}
                  <div className="relative h-10">
                    {/* idle background ticks */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: maxTime }).map((_, i) => (
                        <div key={i} className="h-full border-r last:border-0" style={{ width: unitW }} />
                      ))}
                    </div>
                    {/* execution blocks */}
                    {laneMap[p.id].map((h, idx) => {
                      const left = h.t * unitW
                      // Events at t (this tick) and t+1 (demotion/finish events often log at +1)
                      const allAtT = (eventsByTime[h.t] || []).filter((m) => m.includes(p.name))
                      const allAtT1 = (eventsByTime[h.t + 1] || []).filter((m) => m.includes(p.name))
                      const msgs = [...allAtT, ...allAtT1]
                      // Compute remaining at the END of this block from execution count
                      const execCountToNow = laneMap[p.id].filter((x) => x.t <= h.t).length
                      const remainingAfter = Math.max(0, p.burst - execCountToNow)

                      const tip = (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{`${p.name} @ t=${h.t} • Q${h.q}`}</div>
                          {msgs.length === 0 ? (
                            <div className="text-sm">{`Executed 1 unit. Remaining at end: ${remainingAfter}`}</div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium">{`Executed 1 unit. Remaining at end: ${remainingAfter}`}</div>
                              <div className="mt-1 text-xs text-muted-foreground">Events</div>
                              <ul className="space-y-0.5">
                                {msgs.map((m, i) => {
                                  const c = classifyMessage(m)
                                  return (
                                    <li key={i} className="text-sm leading-snug">
                                      {c ? <span className={`mr-2 text-[11px] ${c.tone}`}>{c.tag}:</span> : null}
                                      <span>{m}</span>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      )

                      return (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute top-1 h-6 cursor-default rounded ${colorsByQueue[h.q as 0 | 1 | 2]}`}
                              style={{ left, width: unitW - 2 }}
                              aria-label={`${p.name} ran at t=${h.t} in Q${h.q}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{tip}</TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
            {/* Idle row */}
            <div className="flex items-stretch border-t">
              <div className="w-24 shrink-0 px-2 py-2 text-sm">Idle</div>
              <div className="relative flex-1">
                <div className="relative h-6">
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: maxTime }).map((_, i) => (
                      <div key={i} className="h-full border-r last:border-0" style={{ width: unitW }} />
                    ))}
                  </div>
                  {snapshot.timeline
                    .filter((t) => !t.pid)
                    .map((t, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 h-6 w-[14px] rounded bg-neutral-300"
                        style={{ left: (t.t ?? 0) * unitW }}
                        title={`t=${t.t} idle`}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            Legend: Q0 Round Robin (teal) • Q1 Priority (amber) • Q2 FCFS (slate)
          </div>

          {completed && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="rounded-md border bg-white px-3 py-1 text-sm font-medium shadow-sm">
                Simulation complete — queues empty
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
