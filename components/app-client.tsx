"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  Play,
  Square,
  StepForward,
  RefreshCw,
  Plus,
  Cpu,
  Activity,
  Zap,
  Workflow,
  CircleAlert,
  Bug,
  Settings,
  Component,
  Table,
  Beaker,
  Sliders,
} from "lucide-react"
import {
  type ProcessType,
  type AlgoKey,
  type PresetKey,
  type ResourcePolicy,
  createInitialState,
  generateRandomProcesses,
  mlfqStep,
  resetState,
  resolveDeadlock,
  addManualProcess,
  computeMetrics,
  applyPreset,
  addResource,
  removeResource,
  setResourcePolicy,
} from "@/lib/scheduler"
import GanttChart from "@/components/gantt-chart"
import QueueView from "@/components/queue-view"
import WaitForGraph from "@/components/wait-for-graph"
import ProcessTable from "@/components/process-table"
import MLFQTable from "@/components/mlfq-table"
import ResourceTable from "@/components/resource-table"
import AlgoTable from "@/components/algo-table"
import ResourceEditor from "@/components/resource-editor"
import { cn } from "@/lib/utils"
import { InfoTip, WithTooltip } from "@/components/info-tip"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function AppClient() {
  const [state, setState] = useState(createInitialState())
  const [autoPlay, setAutoPlay] = useState(false)
  const [intervalMs, setIntervalMs] = useState(600)
  const timerRef = useRef<number | null>(null)

  const [rrQuantum, setRrQuantum] = useState(3)

  const [name, setName] = useState("")
  const [burst, setBurst] = useState(6)
  const [arrival, setArrival] = useState(0)
  const [priority, setPriority] = useState(3)
  const [ptype, setPtype] = useState<ProcessType>("Interactive")
  const [resourcePlan, setResourcePlan] = useState<string>("auto")

  const [preset, setPreset] = useState<PresetKey>("mixed")

  const hasDeadlock = state.deadlock.cycle.length > 0

  const onNext = useCallback(() => setState((prev) => mlfqStep(prev, rrQuantum)), [rrQuantum])

  const onReset = useCallback(() => {
    setAutoPlay(false)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setState((prev) => resetState(prev))
  }, [])

  const onGenerate = useCallback(() => {
    setAutoPlay(false)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setState((prev) => {
      const next = resetState(prev)
      generateRandomProcesses(next)
      return next
    })
  }, [])

  const onApplyPreset = useCallback(() => {
    setAutoPlay(false)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setState((prev) => applyPreset(prev, preset))
  }, [preset])

  const onResolveDeadlock = useCallback(() => setState((prev) => resolveDeadlock(prev)), [])

  const onAddProcess = useCallback(() => {
    if (!name.trim()) return
    setState((prev) => {
      // Important: do not mutate prev in the updater; dev Strict Mode may call this twice.
      const next = JSON.parse(JSON.stringify(prev))
      addManualProcess(next, {
        name: name.trim(),
        burst: Math.max(1, Math.floor(burst)),
        arrival: Math.max(0, Math.floor(arrival)),
        priority: Math.max(0, Math.floor(priority)),
        type: ptype,
        resources:
          resourcePlan === "none"
            ? []
            : resourcePlan === "r1"
              ? ["R1"]
              : resourcePlan === "r1r2"
                ? ["R1", "R2"]
                : resourcePlan === "r2r3"
                  ? ["R2", "R3"]
                  : [],
      })
      return next
    })
    setName("")
  }, [name, burst, arrival, priority, ptype, resourcePlan])

  // Resource editor handlers
  const onAddResource = useCallback((r: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      addResource(next, r)
      return next
    })
  }, [])
  const onRemoveResource = useCallback((r: string) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      removeResource(next, r)
      return next
    })
  }, [])
  const onSetPolicy = useCallback((r: string, p: ResourcePolicy) => {
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      setResourcePolicy(next, r, p)
      return next
    })
  }, [])

  useEffect(() => {
    if (autoPlay) {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(() => {
        setState((prev) => mlfqStep(prev, rrQuantum))
      }, intervalMs) as unknown as number
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoPlay, rrQuantum, intervalMs])

  const metrics = useMemo(() => computeMetrics(state), [state])

  const priorityChartData = useMemo(() => {
    const rows: { algo: string; "Avg Waiting": number; "Avg Turnaround": number; "Avg Weighted": number }[] = []
    ;(["RR", "Priority", "FCFS"] as AlgoKey[]).forEach((k) => {
      rows.push({
        algo: k,
        "Avg Waiting": metrics.byAlgo[k].avgWaiting,
        "Avg Turnaround": metrics.byAlgo[k].avgTurnaround,
        "Avg Weighted": metrics.byAlgo[k].avgWeighted,
      })
    })
    return rows
  }, [metrics])

  const simDone = state.finishedOrder.length === state.processes.length && state.processes.length > 0

  return (
    <TooltipProvider delayDuration={100}>
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">MLFQ Scheduler + Deadlock Visualizer</h1>
                <InfoTip side="right">
                  Multi-Level Feedback Queue with three queues: Q0 Round Robin (interactive), Q1 Preemptive Priority
                  (important), Q2 FCFS (batch). Visualizes scheduling, resources, and deadlocks.
                </InfoTip>
              </div>
              <p className="text-sm text-muted-foreground">
                Step through scheduling, resource allocation, deadlock detection, aging promotions, and I/O bursts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <WithTooltip
                  content={
                    <div>
                      Presets quickly configure processes/resources:
                      <ul className="mt-1 list-inside list-disc">
                        <li>Deadlock: induces circular wait to demonstrate resolution.</li>
                        <li>No Deadlock: ordered requests prevent cycles.</li>
                        <li>Heavy I/O: frequent I/O blocking.</li>
                        <li>Starvation: shows low-priority starvation (aging off).</li>
                        <li>Mixed: realistic workload, aging and I/O enabled.</li>
                      </ul>
                    </div>
                  }
                >
                  <div>
                    <Select value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
                      <SelectTrigger className="w-[200px]" aria-label="Preset scenarios">
                        <SelectValue placeholder="Preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadlock" title="Create a deadlock to resolve">
                          Preset: Deadlock
                        </SelectItem>
                        <SelectItem value="no-deadlock" title="Safe ordering avoids cycles">
                          Preset: No Deadlock
                        </SelectItem>
                        <SelectItem value="heavy-io" title="Frequent I/O blocking">
                          Preset: Heavy I/O
                        </SelectItem>
                        <SelectItem value="starvation" title="Shows starvation without aging">
                          Preset: Starvation
                        </SelectItem>
                        <SelectItem value="mixed" title="A balanced mix; aging + I/O enabled">
                          Preset: Mixed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </WithTooltip>
                <WithTooltip content="Apply the selected preset, replacing current processes and settings">
                  <Button variant="outline" onClick={onApplyPreset}>
                    <Beaker className="mr-2 h-4 w-4" />
                    Apply Preset
                  </Button>
                </WithTooltip>
              </div>
              <WithTooltip content="Generate 10 random processes with varied types, arrivals, priorities, and optional resource needs">
                <Button variant="outline" onClick={onGenerate}>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate 10
                </Button>
              </WithTooltip>
              <WithTooltip content="Clear all state, time, queues, and logs">
                <Button variant="outline" onClick={onReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </WithTooltip>
              <WithTooltip
                content={
                  autoPlay ? "Stop automatic stepping" : "Start automatic stepping; speed controlled by interval (ms)"
                }
              >
                <Button variant={autoPlay ? "secondary" : "default"} onClick={() => setAutoPlay((v) => !v)}>
                  {autoPlay ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {autoPlay ? "Stop" : "Auto Play"}
                </Button>
              </WithTooltip>
              <WithTooltip content="Advance the simulation by one tick">
                <Button onClick={onNext}>
                  <StepForward className="mr-2 h-4 w-4" />
                  Next
                </Button>
              </WithTooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Controls */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Controls
                  </CardTitle>
                  <InfoTip side="left">
                    Configure the scheduler:
                    <ul className="mt-1 list-inside list-disc">
                      <li>Quantum: RR time slice before demotion to Q1.</li>
                      <li>Auto Play: steps the sim automatically.</li>
                      <li>Add Process: define workload arrivals and attributes.</li>
                      <li>Aging: promotes long-waiting ready processes upward.</li>
                      <li>I/O Bursts: probabilistic blocking independent of resources.</li>
                    </ul>
                  </InfoTip>
                </div>
                <CardDescription>Quantum, speed, add processes, aging and I/O simulation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="block">Round Robin Quantum (default 3)</Label>
                    <InfoTip>Number of ticks a Q0 process may run before demotion to Q1.</InfoTip>
                  </div>
                  <div className="flex items-center gap-4">
                    <WithTooltip content="Drag to change Q0 time slice length">
                      <Slider value={[rrQuantum]} min={1} max={10} step={1} onValueChange={(v) => setRrQuantum(v[0])} />
                    </WithTooltip>
                    <Badge variant="secondary" title="Current quantum value">
                      {rrQuantum}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="block">Auto Play Interval (ms)</Label>
                    <InfoTip>Delay in milliseconds between ticks when Auto Play is enabled.</InfoTip>
                  </div>
                  <div className="flex items-center gap-4">
                    <WithTooltip content="Drag to control simulation playback speed">
                      <Slider
                        value={[intervalMs]}
                        min={200}
                        max={2000}
                        step={100}
                        onValueChange={(v) => setIntervalMs(v[0])}
                      />
                    </WithTooltip>
                    <Badge variant="secondary" title="Milliseconds between ticks">
                      {intervalMs}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <WithTooltip content="Toggle continuous stepping of the simulation">
                      <Switch id="autoplay" checked={autoPlay} onCheckedChange={setAutoPlay} />
                    </WithTooltip>
                    <Label htmlFor="autoplay" title="Enable or disable automatic stepping">
                      Auto Play
                    </Label>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="font-medium">Add Process</div>
                    <InfoTip>
                      Add a process with CPU burst, arrival time, numeric priority (lower is higher priority in Q1),
                      type (initial queue), and optional resource plan.
                    </InfoTip>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label title="Display name for the process">Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="P11"
                        title="Process name or ID"
                      />
                    </div>
                    <div>
                      <Label title="Total CPU time units required">Burst</Label>
                      <Input
                        type="number"
                        min={1}
                        value={burst}
                        onChange={(e) => setBurst(Number(e.target.value))}
                        title="Total CPU time units the process needs"
                      />
                    </div>
                    <div>
                      <Label title="Time when the process becomes ready">Arrival</Label>
                      <Input
                        type="number"
                        min={0}
                        value={arrival}
                        onChange={(e) => setArrival(Number(e.target.value))}
                        title="Tick when the process arrives"
                      />
                    </div>
                    <div>
                      <Label title="Lower number means higher priority in Q1 preemptive queue">Priority</Label>
                      <Input
                        type="number"
                        min={0}
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        title="Lower values indicate higher priority (used in Q1)"
                      />
                    </div>
                    <div>
                      <Label title="Initial queue is determined by type">Type</Label>
                      <Select value={ptype} onValueChange={(v) => setPtype(v as ProcessType)}>
                        <SelectTrigger title="Choose process type (sets initial queue)">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Interactive" title="Starts in Q0 (Round Robin)">
                            Interactive
                          </SelectItem>
                          <SelectItem value="Important" title="Starts in Q1 (Preemptive Priority)">
                            Important
                          </SelectItem>
                          <SelectItem value="Batch" title="Starts in Q2 (FCFS)">
                            Batch
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <Label title="Optional static resource needs (else auto/random on first schedule)">
                          Resource Plan
                        </Label>
                        <InfoTip>
                          Choose fixed resource requirements or use Auto to assign randomly on first run using existing
                          resources.
                        </InfoTip>
                      </div>
                      <Select value={resourcePlan} onValueChange={setResourcePlan}>
                        <SelectTrigger title="Select a predefined resource plan or Auto">
                          <SelectValue placeholder="auto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto" title="Assign randomly when first scheduled">
                            Auto (random when scheduled)
                          </SelectItem>
                          <SelectItem value="none" title="No resources needed">
                            None
                          </SelectItem>
                          {Object.keys(state.resources.owners).length >= 1 && (
                            <>
                              <SelectItem value="r1" title="Requires R1 only">
                                Needs R1
                              </SelectItem>
                              <SelectItem value="r1r2" title="Requires R1 then R2">
                                Needs R1 → R2
                              </SelectItem>
                              {Object.keys(state.resources.owners).includes("R3") && (
                                <SelectItem value="r2r3" title="Requires R2 then R3">
                                  Needs R2 → R3
                                </SelectItem>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <WithTooltip content="Create the process with the specified attributes">
                    <Button className="mt-3 w-full bg-transparent" variant="outline" onClick={onAddProcess}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Process
                    </Button>
                  </WithTooltip>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">Aging (anti-starvation)</div>
                          <InfoTip side="top" align="start">
                            <div>
                              Promotes long-waiting ready processes upward to reduce starvation:
                              <ul className="mt-1 list-inside list-disc">
                                <li>Only applies while a process is in a ready queue (not running/blocked).</li>
                                <li>Each tick in ready state increments its age counter.</li>
                                <li>At the threshold, it promotes: Q2 → Q1, then Q1 → Q0. Q0 is not promoted.</li>
                                <li>Age counter resets on promotion or when the process runs.</li>
                                <li>RR demotions (quantum expiry) still occur independently.</li>
                              </ul>
                            </div>
                          </InfoTip>
                        </div>
                        <div className="text-xs text-muted-foreground">Promote long-waiting processes upward</div>
                      </div>
                    </div>
                    <WithTooltip content="Enable promotions for processes that wait in ready queues beyond the threshold">
                      <Switch
                        checked={state.config.aging.enabled}
                        onCheckedChange={(v) =>
                          setState((prev) => ({
                            ...prev,
                            config: { ...prev.config, aging: { ...prev.config.aging, enabled: v } },
                          }))
                        }
                      />
                    </WithTooltip>
                  </div>
                  <div className="flex items-center gap-4">
                    <Label className="w-28 text-xs text-muted-foreground" title="Wait time before promotion">
                      Threshold
                    </Label>
                    <WithTooltip content="Number of ticks in ready queues before a promotion is applied">
                      <Slider
                        value={[state.config.aging.threshold]}
                        min={3}
                        max={30}
                        step={1}
                        onValueChange={(v) =>
                          setState((prev) => ({
                            ...prev,
                            config: { ...prev.config, aging: { ...prev.config.aging, threshold: v[0] } },
                          }))
                        }
                      />
                    </WithTooltip>
                    <Badge variant="secondary" title="Aging threshold">
                      {state.config.aging.threshold}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">I/O bursts</div>
                          <InfoTip side="top" align="start">
                            <div>
                              Simulates probabilistic I/O blocking (separate from resources):
                              <ul className="mt-1 list-inside list-disc">
                                <li>After a process executes a time unit, it may start I/O and block.</li>
                                <li>Type-based probabilities: Interactive 20%, Important 10%, Batch 5%.</li>
                                <li>Block length is fixed in ticks; the process consumes no CPU while blocked.</li>
                                <li>
                                  Each blocked tick increments its I/O blocked total; upon completion it becomes ready.
                                </li>
                                <li>Events are logged: begins I/O at t+1 and I/O complete when unblocked.</li>
                                <li>I/O blocking does not release resources and is independent of deadlocks.</li>
                              </ul>
                            </div>
                          </InfoTip>
                        </div>
                        <div className="text-xs text-muted-foreground">Timed blocking independent of resources</div>
                      </div>
                    </div>
                    <WithTooltip content="Enable probabilistic I/O blocking; processes occasionally block for a fixed length based on type">
                      <Switch
                        checked={state.config.io.enabled}
                        onCheckedChange={(v) =>
                          setState((prev) => ({
                            ...prev,
                            config: { ...prev.config, io: { ...prev.config.io, enabled: v } },
                          }))
                        }
                      />
                    </WithTooltip>
                  </div>
                  <div className="flex items-center gap-4">
                    <Label className="w-28 text-xs text-muted-foreground" title="Ticks a process stays blocked on I/O">
                      Block length
                    </Label>
                    <WithTooltip content="The number of ticks an I/O event will block a process">
                      <Slider
                        value={[state.config.io.blockLength]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(v) =>
                          setState((prev) => ({
                            ...prev,
                            config: { ...prev.config, io: { ...prev.config.io, blockLength: v[0] } },
                          }))
                        }
                      />
                    </WithTooltip>
                    <Badge variant="secondary" title="I/O block duration">
                      {state.config.io.blockLength}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2" title="Current simulation time in ticks">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span>Time:</span>
                    <Badge variant="secondary">{state.time}</Badge>
                  </div>
                  <div className="flex items-center gap-2" title="Percentage of ticks where a process was running">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span>CPU Util:</span>
                    <Badge variant="secondary">{metrics.cpuUtil.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex items-center gap-2" title="Total number of processes in the system">
                    <Component className="h-4 w-4 text-muted-foreground" />
                    <span>Procs:</span>
                    <Badge variant="secondary">{state.processes.length}</Badge>
                  </div>
                  <div className="flex items-center gap-2" title="How many processes have finished">
                    <Workflow className="h-4 w-4 text-muted-foreground" />
                    <span>Finished:</span>
                    <Badge variant="secondary">{state.finishedOrder.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main panels */}
            <div className="lg:col-span-8 space-y-6">
              {hasDeadlock && (
                <Alert variant="destructive">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Deadlock detected</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      Cycle found in the wait-for graph. Terminate a victim process to release resources and unblock
                      others.
                    </span>
                    <WithTooltip content="Automatically choose and terminate a victim process to break the cycle">
                      <Button size="sm" variant="secondary" onClick={onResolveDeadlock}>
                        <Bug className="mr-2 h-4 w-4" />
                        Resolve Deadlock
                      </Button>
                    </WithTooltip>
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="h-5 w-5" />
                      Queues
                    </CardTitle>
                    <InfoTip side="left">
                      Ready queues:
                      <ul className="mt-1 list-inside list-disc">
                        <li>Q0 Round Robin: time-sliced, demotes to Q1 when quantum expires.</li>
                        <li>Q1 Preemptive Priority: lower number preempts higher.</li>
                        <li>Q2 FCFS: runs to completion unless blocking occurs.</li>
                      </ul>
                    </InfoTip>
                  </div>
                  <CardDescription>Q0 Round Robin • Q1 Priority (preemptive) • Q2 FCFS</CardDescription>
                </CardHeader>
                <CardContent>
                  <QueueView snapshot={state} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Gantt Chart
                    </CardTitle>
                    <InfoTip side="left">
                      Timeline of execution per process:
                      <ul className="mt-1 list-inside list-disc">
                        <li>Color encodes queue: teal Q0, amber Q1, slate Q2.</li>
                        <li>Hover blocks for preemptions, demotions, resource and I/O events.</li>
                        <li>Idle row shows CPU idle ticks.</li>
                      </ul>
                    </InfoTip>
                  </div>
                  <CardDescription>
                    Per-unit timeline; colors denote queue level: Q0 teal, Q1 amber, Q2 slate.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GanttChart snapshot={state} completed={simDone} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Table className="h-5 w-5" />
                      MLFQ Table
                    </CardTitle>
                    <InfoTip side="left">
                      For each queue:
                      <ul className="mt-1 list-inside list-disc">
                        <li>Entered: first time a process ran in that queue (order).</li>
                        <li>Terminated: processes that finished in that queue (order).</li>
                        <li>Avg WT/TAT: waiting and turnaround averages for processes that finished here.</li>
                        <li>Overall row shows MLFQ-wide averages.</li>
                      </ul>
                    </InfoTip>
                  </div>
                  <CardDescription>
                    Entry and termination sequence per queue; includes per-queue averages and overall MLFQ averages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MLFQTable
                    snapshot={state}
                    byAlgoAverages={{
                      RR: {
                        avgWaiting: metrics.byAlgo.RR.avgWaiting,
                        avgTurnaround: metrics.byAlgo.RR.avgTurnaround,
                      },
                      Priority: {
                        avgWaiting: metrics.byAlgo.Priority.avgWaiting,
                        avgTurnaround: metrics.byAlgo.Priority.avgTurnaround,
                      },
                      FCFS: {
                        avgWaiting: metrics.byAlgo.FCFS.avgWaiting,
                        avgTurnaround: metrics.byAlgo.FCFS.avgTurnaround,
                      },
                    }}
                    overallAverages={{
                      avgWaiting: metrics.overall?.avgWaiting ?? 0,
                      avgTurnaround: metrics.overall?.avgTurnaround ?? 0,
                    }}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Priority Chart</CardTitle>
                      <InfoTip side="left">
                        Bar chart by termination algorithm:
                        <ul className="mt-1 list-inside list-disc">
                          <li>Avg Waiting (WT): sum(waiting)/n per group.</li>
                          <li>Avg Turnaround (TAT): sum(TAT)/n per group.</li>
                          <li>Avg Weighted (TAT/Burst): normalized responsiveness.</li>
                        </ul>
                      </InfoTip>
                    </div>
                    <CardDescription>Average metrics by algorithm</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        rr: { label: "RR", color: "hsl(var(--chart-1))" },
                        prio: { label: "Priority", color: "hsl(var(--chart-2))" },
                        fcfs: { label: "FCFS", color: "hsl(var(--chart-3))" },
                      }}
                      className="h-64"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityChartData} barGap={6}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="algo" />
                          <YAxis />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend content={<ChartLegendContent />} />
                          <Bar dataKey="Avg Waiting" fill="var(--color-rr)" radius={4} />
                          <Bar dataKey="Avg Turnaround" fill="var(--color-prio)" radius={4} />
                          <Bar dataKey="Avg Weighted" fill="var(--color-fcfs)" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Resources</CardTitle>
                      <InfoTip side="left">
                        Manage resources and wait policies:
                        <ul className="mt-1 list-inside list-disc">
                          <li>Owner: process currently holding the resource.</li>
                          <li>Waiting: queue of processes waiting to acquire it.</li>
                          <li>Policy: FIFO or Priority-based waiter selection.</li>
                          <li>Wait-For Graph: edge Pᵢ→Pⱼ means Pᵢ waits on Pⱼ; cycle = deadlock.</li>
                        </ul>
                      </InfoTip>
                    </div>
                    <CardDescription>Add/remove resources and set wait policies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResourceEditor
                      snapshot={state}
                      onAdd={onAddResource}
                      onRemove={onRemoveResource}
                      onPolicy={onSetPolicy}
                    />
                    <div className="rounded-md border p-2" title="Current owners, policies, and wait queues">
                      <ResourceTable resources={state.resources} />
                    </div>
                    <div
                      className={cn("rounded-md border p-2", hasDeadlock ? "border-destructive" : "")}
                      title="Visual representation of waits between processes"
                    >
                      <WaitForGraph
                        processes={state.processes}
                        waitFor={state.deadlock.waitFor}
                        cycle={state.deadlock.cycle}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Processes</CardTitle>
                    <InfoTip side="left">
                      Live process list:
                      <ul className="mt-1 list-inside list-disc">
                        <li>Click a row to open the per-process drawer.</li>
                        <li>State shows new, ready, running, blocked (I/O or resource), finished.</li>
                        <li>Held resources and what it is waiting for (if blocked).</li>
                      </ul>
                    </InfoTip>
                  </div>
                  <CardDescription>
                    Click a row for details (full event history, queue transitions, resource log).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProcessTable snapshot={state} />
                </CardContent>
              </Card>

              <Tabs defaultValue="rr">
                <TabsList title="Per-algorithm completion tables and event log">
                  <TabsTrigger value="rr" title="Processes that terminated in Round Robin (Q0)">
                    RR Table
                  </TabsTrigger>
                  <TabsTrigger value="prio" title="Processes that terminated in Priority (Q1)">
                    Priority Table
                  </TabsTrigger>
                  <TabsTrigger value="fcfs" title="Processes that terminated in FCFS (Q2)">
                    FCFS Table
                  </TabsTrigger>
                  <TabsTrigger value="log" title="Chronological scheduler and resource events">
                    Execution Log
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="rr">
                  <AlgoTable title="Round Robin" algo="RR" rows={metrics.byAlgo.RR.rows} />
                </TabsContent>
                <TabsContent value="prio">
                  <AlgoTable title="Priority (Preemptive)" algo="Priority" rows={metrics.byAlgo.Priority.rows} />
                </TabsContent>
                <TabsContent value="fcfs">
                  <AlgoTable title="FCFS" algo="FCFS" rows={metrics.byAlgo.FCFS.rows} />
                </TabsContent>
                <TabsContent value="log">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Execution Log</CardTitle>
                        <InfoTip side="left">
                          Events with timestamps t=… for arrivals, allocations, preemptions, demotions, I/O blocks,
                          resumes, and completions.
                        </InfoTip>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <ul className="space-y-1 text-sm">
                          {state.log.length === 0 && <li className="text-muted-foreground">No events yet.</li>}
                          {state.log.map((l, idx) => (
                            <li key={idx}>{l}</li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {simDone && (
                <Alert>
                  <AlertTitle>Simulation completed</AlertTitle>
                  <AlertDescription>
                    All processes have finished. You can reset, apply a preset, or generate a new set to run again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </main>
    </TooltipProvider>
  )
}
