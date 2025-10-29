"use client"

import type { SchedulerSnapshot } from "@/lib/scheduler"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

type AlgoKey = "RR" | "Priority" | "FCFS"

type MetricsByAlgo = {
  [K in AlgoKey]: {
    avgWaiting: number
    avgTurnaround: number
  }
}

function queueLabel(q: 0 | 1 | 2) {
  if (q === 0) return { key: "RR" as AlgoKey, label: "Q0 • Round Robin", color: "bg-teal-50" }
  if (q === 1) return { key: "Priority" as AlgoKey, label: "Q1 • Priority (Preemptive)", color: "bg-amber-50" }
  return { key: "FCFS" as AlgoKey, label: "Q2 • FCFS", color: "bg-slate-50" }
}

export default function MLFQTable({
  snapshot,
  byAlgoAverages,
  overallAverages,
}: {
  snapshot: SchedulerSnapshot
  byAlgoAverages: MetricsByAlgo
  overallAverages: { avgWaiting: number; avgTurnaround: number }
}) {
  const queues: (0 | 1 | 2)[] = [0, 1, 2]

  const rows = queues.map((q) => {
    const { key: algoKey, label, color } = queueLabel(q)

    const enteredAll = snapshot.processes
      .map((p) => {
        const hits = p.history.filter((h) => h.q === q)
        if (hits.length === 0) return null
        const firstT = Math.min(...hits.map((h) => h.t))
        return { id: p.id, name: p.name, t: firstT, state: p.state }
      })
      .filter(Boolean) as { id: string; name: string; t: number; state: string }[]
    enteredAll.sort((a, b) => a.t - b.t || Number(a.id) - Number(b.id))

    const enteredActive = enteredAll.filter((e) => e.state !== "finished")

    const terminated = snapshot.finishedOrder
      .map((pid) => snapshot.processes.find((p) => p.id === pid))
      .filter((p) => p && p.finishedBy === algoKey)
      .map((p) => ({ id: p!.id, name: p!.name }))

    const showAverages = terminated.length > 0
    const avgW = showAverages ? byAlgoAverages[algoKey].avgWaiting : undefined
    const avgT = showAverages ? byAlgoAverages[algoKey].avgTurnaround : undefined

    return {
      q,
      label,
      color,
      entered: enteredActive,
      terminated,
      counts: { in: enteredActive.length, out: terminated.length },
      averages: { waiting: avgW, turnaround: avgT },
    }
  })

  return (
    <div className="overflow-hidden rounded-md border">
      <TooltipProvider delayDuration={100}>
        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Queue</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                The ready queue in which the process executed.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="col-span-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Entered (order)</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                First tick when each active process ran in this queue (sorted).
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="col-span-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Terminated (order)</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Processes that finished while running in this queue, with their completion order.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="col-span-1 text-right">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Avg WT</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Average waiting time of processes that terminated in this queue.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="col-span-1 text-right">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Avg TAT</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Average turnaround time of processes that terminated in this queue.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-12 items-start px-3 py-2">
              <div className="col-span-2">
                <span className={`inline-block rounded px-2 py-1 text-xs ${r.color}`} title="Queue name and policy">
                  {r.label}
                </span>
                <div
                  className="mt-1 text-[11px] text-muted-foreground"
                  title="Counts of active entries and terminations"
                >
                  In: {r.counts.in} • Out: {r.counts.out}
                </div>
              </div>
              <div className="col-span-4">
                {r.entered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {r.entered.map((e) => (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs"
                        title={`First ran in this queue at t=${e.t}`}
                      >
                        {e.name}
                        <span className="text-muted-foreground">{`@t${e.t}`}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-4">
                {r.terminated.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {r.terminated.map((t, idx) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs"
                        title={`Termination order #${idx + 1} in this queue`}
                      >
                        <span className="rounded bg-muted px-1">{idx + 1}</span>
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-1 text-right text-sm">
                {r.averages.waiting === undefined ? "–" : r.averages.waiting.toFixed(2)}
              </div>
              <div className="col-span-1 text-right text-sm">
                {r.averages.turnaround === undefined ? "–" : r.averages.turnaround.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 items-center border-t bg-muted/40 px-3 py-2 text-sm">
          <div className="col-span-10 text-right font-medium" title="Averages across all finished processes">
            Overall (MLFQ) Averages
          </div>
          <div className="col-span-1 text-right font-semibold" title="Average waiting time overall">
            {overallAverages.avgWaiting.toFixed(2)}
          </div>
          <div className="col-span-1 text-right font-semibold" title="Average turnaround time overall">
            {overallAverages.avgTurnaround.toFixed(2)}
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
