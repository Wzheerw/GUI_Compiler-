"use client"

import { useMemo, useState } from "react"
import type { ResourcePolicy, SchedulerSnapshot } from "@/lib/scheduler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import { WithTooltip, InfoTip } from "@/components/info-tip"

export default function ResourceEditor({
  snapshot,
  onAdd,
  onRemove,
  onPolicy,
}: {
  snapshot: SchedulerSnapshot
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onPolicy: (name: string, policy: ResourcePolicy) => void
}) {
  const [name, setName] = useState("")
  const items = useMemo(
    () =>
      Object.keys(snapshot.resources.owners).map((r) => {
        const inUse = snapshot.resources.owners[r] !== null || (snapshot.resources.waitQueues[r] || []).length > 0
        return {
          resource: r,
          policy: snapshot.resources.policy[r] || "FIFO",
          inUse,
          waiting: snapshot.resources.waitQueues[r] || [],
          owner: snapshot.resources.owners[r],
        }
      }),
    [snapshot.resources],
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <Label className="block">Add Resource</Label>
            <InfoTip>Create a new named resource (e.g. R4). Must be unique and not in use.</InfoTip>
          </div>
          <Input
            placeholder="e.g. R4"
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name) {
                onAdd(name)
                setName("")
              }
            }}
            title="Resource identifier"
          />
        </div>
        <div className="flex items-end">
          <WithTooltip content="Add the new resource">
            <Button
              className="w-full bg-transparent"
              variant="outline"
              onClick={() => {
                if (!name) return
                onAdd(name)
                setName("")
              }}
            >
              Add
            </Button>
          </WithTooltip>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="grid grid-cols-5 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
          <div title="Resource name">Resource</div>
          <div title="How to pick the next waiter">Policy</div>
          <div title="Current owning process">Owner</div>
          <div title="Queue of processes waiting to acquire">Waiting</div>
          <div className="text-right" title="Remove a resource if not in use">
            Actions
          </div>
        </div>
        <div className="divide-y">
          {items.map((it) => (
            <div key={it.resource} className="grid grid-cols-5 items-center gap-2 px-3 py-2 text-sm">
              <div>{it.resource}</div>
              <div>
                <Select value={it.policy} onValueChange={(v) => onPolicy(it.resource, v as ResourcePolicy)}>
                  <SelectTrigger title="Select waiter selection policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFO" title="First-in, first-out waiter selection">
                      FIFO
                    </SelectItem>
                    <SelectItem value="Priority" title="Lowest numeric priority waiter goes first">
                      Priority
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>{it.owner ? `P${it.owner}` : "-"}</div>
              <div className="truncate" title="Waiting PIDs">
                {it.waiting.map((p) => `P${p}`).join(", ") || "-"}
              </div>
              <div className="text-right">
                <WithTooltip
                  content={
                    it.inUse ? "Cannot remove: resource is owned or has waiting processes" : "Remove this resource"
                  }
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    title={it.inUse ? "Cannot remove while in use" : "Remove resource"}
                    disabled={it.inUse}
                    onClick={() => !it.inUse && onRemove(it.resource)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </WithTooltip>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No resources defined.</div>}
        </div>
      </div>
    </div>
  )
}
