"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Process, SchedulerSnapshot } from "@/lib/scheduler"

function getEventHistoryForProc(snapshot: SchedulerSnapshot, p: Process) {
  const needleA = `${p.name}`
  const needleB = `P${p.id}`
  return snapshot.log.filter((line) => line.includes(needleA) || line.includes(needleB))
}

function getQueueTransitions(p: Process) {
  const h = p.history.slice().sort((a, b) => a.t - b.t)
  if (h.length === 0) return []
  const transitions: { t: number; q: number }[] = [{ t: h[0].t, q: h[0].q }]
  for (let i = 1; i < h.length; i++) {
    if (h[i].q !== h[i - 1].q) {
      transitions.push({ t: h[i].t, q: h[i].q })
    }
  }
  return transitions
}

function getResourceLog(lines: string[]) {
  return lines.filter(
    (l) => l.includes("allocated") || l.includes("released") || l.includes("waiting for") || l.includes("resumed"),
  )
}

function computePerProcessMetrics(p: Process) {
  const end = p.endTime
  if (end == null) return null
  const turnaround = end - p.arrival
  const waiting = turnaround - p.burst
  const weighted = p.burst ? turnaround / p.burst : 0
  return { waiting, turnaround, weighted }
}

export default function ProcessDetails({
  open,
  onOpenChange,
  process,
  snapshot,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  process: Process
  snapshot: SchedulerSnapshot
}) {
  const events = getEventHistoryForProc(snapshot, process)
  const transitions = getQueueTransitions(process)
  const resourceLines = getResourceLog(events)
  const metrics = computePerProcessMetrics(process)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[520px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{process.name}</span>
            <Badge variant="secondary" className="capitalize">
              {process.state}
            </Badge>
          </SheetTitle>
          <SheetDescription className="space-y-1">
            <div className="text-xs text-muted-foreground">
              PID P{process.id} • Type {process.type} • Priority {process.priority}
            </div>
            <div className="text-xs text-muted-foreground">
              Arrival {process.arrival} • Burst {process.burst}
            </div>
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        <ScrollArea className="h-[80vh] pr-4">
          <div className="space-y-6">
            <section>
              <div className="mb-1 text-sm font-medium">Summary</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border p-2">
                  <div className="text-xs text-muted-foreground">Queue</div>
                  <div className="text-sm font-semibold">{`Q${process.queueLevel}`}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-xs text-muted-foreground">Held Resources</div>
                  <div className="text-sm font-semibold">
                    {process.acquired.length ? process.acquired.join(", ") : "-"}
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="text-sm font-semibold">{process.remaining}</div>
                </div>
              </div>
              {metrics && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground">Waiting</div>
                    <div className="text-sm font-semibold">{metrics.waiting.toFixed(0)}</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground">Turnaround</div>
                    <div className="text-sm font-semibold">{metrics.turnaround.toFixed(0)}</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground">Weighted</div>
                    <div className="text-sm font-semibold">{metrics.weighted.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="mb-1 text-sm font-medium">Queue transitions</div>
              {transitions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No execution yet.</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {transitions.map((tr, i) => (
                    <li key={i} className="leading-snug">{`t=${tr.t}: ran in Q${tr.q}`}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-1 text-sm font-medium">Resource log</div>
              {resourceLines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No resource events.</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {resourceLines.map((l, i) => (
                    <li key={i} className="leading-snug">
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-1 text-sm font-medium">Event history</div>
              {events.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events yet.</div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {events.map((l, i) => (
                    <li key={i} className="leading-snug">
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
