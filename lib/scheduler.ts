export type ProcessType = "Interactive" | "Important" | "Batch"
export type AlgoKey = "RR" | "Priority" | "FCFS"
export type ProcState = "new" | "ready" | "running" | "blocked" | "finished"
export type BlockedReason = "resource" | "io"

export type TimelineItem = { t: number; pid?: string; q?: number }
export type ResourcePolicy = "FIFO" | "Priority"

export type Process = {
  id: string
  name: string
  arrival: number
  burst: number
  remaining: number
  priority: number
  type: ProcessType
  state: ProcState
  queueLevel: 0 | 1 | 2
  startTime?: number
  endTime?: number
  required: string[]
  acquired: string[]
  history: { t: number; q: number }[]
  finishedBy?: AlgoKey
  ageWait: number
  blockedReason?: BlockedReason
  ioBlockRemaining: number
  totalIoBlocked: number
}

export type ResourceSnapshot = {
  owners: Record<string, string | null>
  waitQueues: Record<string, string[]>
  policy: Record<string, ResourcePolicy>
}

export type DeadlockSnapshot = {
  waitFor: Record<string, string[]>
  cycle: string[]
}

export type SchedulerSettings = {
  aging: { enabled: boolean; threshold: number }
  io: { enabled: boolean; blockLength: number }
  deadlock: { autoResolve: boolean }
}

export type SchedulerSnapshot = {
  time: number
  processes: Process[]
  finishedOrder: string[]
  current?: string
  q0: string[]
  q1: string[]
  q2: string[]
  rrSlice: number
  timeline: TimelineItem[]
  resources: ResourceSnapshot
  deadlock: DeadlockSnapshot
  log: string[]
  config: SchedulerSettings
}

let idCounter = 1
function nextPid(): string {
  return String(idCounter++)
}
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function createInitialState(): SchedulerSnapshot {
  return {
    time: 0,
    processes: [],
    finishedOrder: [],
    current: undefined,
    q0: [],
    q1: [],
    q2: [],
    rrSlice: 0,
    timeline: [],
    resources: {
      owners: { R1: null, R2: null, R3: null },
      waitQueues: { R1: [], R2: [], R3: [] },
      policy: { R1: "FIFO", R2: "FIFO", R3: "FIFO" },
    },
    deadlock: { waitFor: {}, cycle: [] },
    log: [],
    config: {
      aging: { enabled: false, threshold: 10 },
      io: { enabled: false, blockLength: 3 },
      deadlock: { autoResolve: true },
    },
  }
}

export function resetState(_prev: SchedulerSnapshot): SchedulerSnapshot {
  const fresh = createInitialState()
  idCounter = 1
  return fresh
}

function initialQueueForType(t: ProcessType): 0 | 1 | 2 {
  if (t === "Interactive") return 0
  if (t === "Important") return 1
  return 2
}

export function addManualProcess(
  state: SchedulerSnapshot,
  p: { name: string; burst: number; arrival: number; priority: number; type: ProcessType; resources: string[] },
) {
  const pid = nextPid()
  const proc: Process = {
    id: pid,
    name: p.name || `P${pid}`,
    arrival: p.arrival,
    burst: p.burst,
    remaining: p.burst,
    priority: p.priority,
    type: p.type,
    state: "new",
    queueLevel: initialQueueForType(p.type),
    startTime: undefined,
    endTime: undefined,
    required: p.resources.length ? p.resources.slice() : [],
    acquired: [],
    history: [],
    ageWait: 0,
    ioBlockRemaining: 0,
    totalIoBlocked: 0,
  }
  state.processes.push(proc)
}

export function generateRandomProcesses(state: SchedulerSnapshot) {
  const types: ProcessType[] = ["Interactive", "Important", "Batch"]
  for (let i = 0; i < 10; i++) {
    const pid = nextPid()
    const type = types[Math.floor(Math.random() * types.length)]
    const burst = Math.floor(3 + Math.random() * 12)
    const arrival = Math.floor(Math.random() * 10)
    const priority = Math.floor(Math.random() * 5)
    const name = `P${pid}`
    const reqPlan = Math.random()
    const required =
      reqPlan < 0.4
        ? []
        : reqPlan < 0.7
          ? [Math.random() < 0.5 ? "R1" : "R2"]
          : Math.random() < 0.5
            ? ["R1", "R2"]
            : ["R2", "R3"]

    const proc: Process = {
      id: pid,
      name,
      arrival,
      burst,
      remaining: burst,
      priority,
      type,
      state: "new",
      queueLevel: initialQueueForType(type),
      startTime: undefined,
      endTime: undefined,
      required,
      acquired: [],
      history: [],
      ageWait: 0,
      ioBlockRemaining: 0,
      totalIoBlocked: 0,
    }
    state.processes.push(proc)
  }
}

// Resource editor helpers
export function addResource(state: SchedulerSnapshot, name: string) {
  if (!name || state.resources.owners[name] !== undefined) return
  state.resources.owners[name] = null
  state.resources.waitQueues[name] = []
  state.resources.policy[name] = "FIFO"
}
export function removeResource(state: SchedulerSnapshot, name: string) {
  if (!(name in state.resources.owners)) return
  const inUse = state.resources.owners[name] !== null || (state.resources.waitQueues[name] || []).length > 0
  if (inUse) return
  delete state.resources.owners[name]
  delete state.resources.waitQueues[name]
  delete state.resources.policy[name]
}
export function setResourcePolicy(state: SchedulerSnapshot, name: string, policy: ResourcePolicy) {
  if (!(name in state.resources.owners)) return
  state.resources.policy[name] = policy
}

// Presets
export type PresetKey = "deadlock" | "no-deadlock" | "heavy-io" | "starvation" | "mixed"

export function applyPreset(_prev: SchedulerSnapshot, key: PresetKey): SchedulerSnapshot {
  const state = createInitialState()
  idCounter = 1

  const push = (p: {
    name: string
    arrival: number
    burst: number
    priority: number
    type: ProcessType
    required?: string[]
  }) => {
    const pid = nextPid()
    const proc: Process = {
      id: pid,
      name: p.name || `P${pid}`,
      arrival: p.arrival,
      burst: p.burst,
      remaining: p.burst,
      priority: p.priority,
      type: p.type,
      state: "new",
      queueLevel: initialQueueForType(p.type),
      startTime: undefined,
      endTime: undefined,
      required: p.required || [],
      acquired: [],
      history: [],
      ageWait: 0,
      ioBlockRemaining: 0,
      totalIoBlocked: 0,
    }
    state.processes.push(proc)
  }

  switch (key) {
    case "deadlock":
      push({ name: "P1", arrival: 0, burst: 6, priority: 2, type: "Important", required: ["R1", "R2"] })
      push({ name: "P2", arrival: 0, burst: 6, priority: 2, type: "Important", required: ["R2", "R1"] })
      push({ name: "P3", arrival: 1, burst: 5, priority: 3, type: "Batch", required: [] })
      break
    case "no-deadlock":
      push({ name: "P1", arrival: 0, burst: 6, priority: 2, type: "Important", required: ["R1", "R2"] })
      push({ name: "P2", arrival: 0, burst: 6, priority: 1, type: "Important", required: ["R1", "R2"] })
      push({ name: "P3", arrival: 2, burst: 4, priority: 3, type: "Interactive", required: [] })
      break
    case "heavy-io":
      state.config.io.enabled = true
      state.config.io.blockLength = 3
      for (let i = 0; i < 5; i++) {
        push({ name: `I${i + 1}`, arrival: i % 2, burst: 10, priority: 2, type: "Interactive", required: [] })
      }
      push({ name: "B1", arrival: 0, burst: 14, priority: 4, type: "Batch", required: [] })
      push({ name: "B2", arrival: 3, burst: 12, priority: 4, type: "Batch", required: [] })
      break
    case "starvation":
      state.config.aging.enabled = false
      push({ name: "HI1", arrival: 0, burst: 8, priority: 0, type: "Important" })
      push({ name: "HI2", arrival: 1, burst: 8, priority: 0, type: "Important" })
      push({ name: "HI3", arrival: 2, burst: 8, priority: 0, type: "Important" })
      push({ name: "HI4", arrival: 3, burst: 8, priority: 0, type: "Important" })
      push({ name: "BatchStarve", arrival: 0, burst: 20, priority: 4, type: "Batch" })
      break
    case "mixed":
      state.config.aging.enabled = true
      state.config.aging.threshold = 12
      state.config.io.enabled = true
      state.config.io.blockLength = 2
      push({ name: "I1", arrival: 0, burst: 9, priority: 2, type: "Interactive", required: [] })
      push({ name: "I2", arrival: 1, burst: 7, priority: 1, type: "Interactive", required: ["R1"] })
      push({ name: "IMP1", arrival: 2, burst: 10, priority: 0, type: "Important", required: ["R2"] })
      push({ name: "B1", arrival: 0, burst: 15, priority: 4, type: "Batch", required: [] })
      push({ name: "B2", arrival: 3, burst: 11, priority: 3, type: "Batch", required: ["R2", "R3"] })
      break
  }

  return state
}

// Deadlock helpers
function addWaitEdge(state: SchedulerSnapshot, fromPid: string, toPid: string) {
  const wf = state.deadlock.waitFor
  if (!wf[fromPid]) wf[fromPid] = []
  if (!wf[fromPid].includes(toPid)) wf[fromPid].push(toPid)
}
function removeWaitEdgesFrom(state: SchedulerSnapshot, pid: string) {
  delete state.deadlock.waitFor[pid]
  for (const k of Object.keys(state.deadlock.waitFor)) {
    state.deadlock.waitFor[k] = state.deadlock.waitFor[k].filter((x) => x !== pid)
    if (state.deadlock.waitFor[k].length === 0) delete state.deadlock.waitFor[k]
  }
}
function detectCycle(waitFor: Record<string, string[]>): string[] {
  const visited = new Set<string>()
  const stack = new Set<string>()
  const path: string[] = []

  const dfs = (u: string): string[] | null => {
    visited.add(u)
    stack.add(u)
    path.push(u)

    const neighbors = waitFor[u] || []
    for (const v of neighbors) {
      if (!visited.has(v)) {
        const cycle = dfs(v)
        if (cycle) return cycle
      } else if (stack.has(v)) {
        // Found back edge - extract cycle from path
        const cycleStart = path.indexOf(v)
        return path.slice(cycleStart)
      }
    }

    stack.delete(u)
    path.pop()
    return null
  }

  for (const node of Object.keys(waitFor)) {
    if (!visited.has(node)) {
      const cycle = dfs(node)
      if (cycle) return cycle
    }
  }

  return []
}

function enqueueIfNotPresent(queue: string[], pid: string) {
  if (!queue.includes(pid)) queue.push(pid)
}
function removeFromQueues(state: SchedulerSnapshot, pid: string) {
  state.q0 = state.q0.filter((p) => p !== pid)
  state.q1 = state.q1.filter((p) => p !== pid)
  state.q2 = state.q2.filter((p) => p !== pid)
}
function getProc(state: SchedulerSnapshot, pid: string | undefined): Process | undefined {
  return state.processes.find((p) => p.id === pid)
}

// Aging promotions
function applyAging(state: SchedulerSnapshot) {
  if (!state.config.aging.enabled) return
  const threshold = Math.max(1, state.config.aging.threshold)
  const incAge = (pid: string) => {
    const p = getProc(state, pid)
    if (!p) return
    p.ageWait += 1
    if (p.ageWait >= threshold) {
      if (p.queueLevel === 2) {
        state.q2 = state.q2.filter((x) => x !== p.id)
        p.queueLevel = 1
        enqueueIfNotPresent(state.q1, p.id)
        state.log.push(`t=${state.time}: Aging promotion → ${p.name} to Q1`)
      } else if (p.queueLevel === 1) {
        state.q1 = state.q1.filter((x) => x !== p.id)
        p.queueLevel = 0
        enqueueIfNotPresent(state.q0, p.id)
        state.log.push(`t=${state.time}: Aging promotion → ${p.name} to Q0`)
      }
      p.ageWait = 0
    }
  }
  state.q0.forEach(incAge)
  state.q1.forEach(incAge)
  state.q2.forEach(incAge)
}

// I/O bursts
function handleIoUnblock(state: SchedulerSnapshot) {
  if (!state.config.io.enabled) return
  for (const p of state.processes) {
    if (p.state === "blocked" && p.blockedReason === "io" && p.ioBlockRemaining > 0) {
      p.ioBlockRemaining -= 1
      if (p.ioBlockRemaining <= 0) {
        p.blockedReason = undefined
        p.state = "ready"
        if (p.queueLevel === 0) enqueueIfNotPresent(state.q0, p.id)
        else if (p.queueLevel === 1) enqueueIfNotPresent(state.q1, p.id)
        else enqueueIfNotPresent(state.q2, p.id)
        state.log.push(`t=${state.time}: ${p.name} I/O complete, ready`)
      } else {
        p.totalIoBlocked += 1
      }
    }
  }
}
function shouldTriggerIo(state: SchedulerSnapshot, p: Process): boolean {
  if (!state.config.io.enabled) return false
  if (p.remaining <= 0) return false
  const prob = p.type === "Interactive" ? 0.2 : p.type === "Important" ? 0.1 : 0.05
  return Math.random() < prob
}

// Resources
function allocateNextRequired(
  state: SchedulerSnapshot,
  p: Process,
): { ok: boolean; resource?: string; owner?: string | null } {
  if (p.required.length === 0 && p.acquired.length === 0) {
    const r = Math.random()
    const keys = Object.keys(state.resources.owners)
    if (r < 0.3) {
      // none
    } else if (r < 0.7) {
      if (keys.length) p.required = [keys[Math.floor(Math.random() * keys.length)]]
    } else {
      if (keys.length >= 2) {
        const r1 = keys[Math.floor(Math.random() * keys.length)]
        let r2 = keys[Math.floor(Math.random() * keys.length)]
        if (r2 === r1 && keys.length > 1) r2 = keys.find((k) => k !== r1) || r2
        p.required = [r1, r2]
      } else if (keys.length === 1) {
        p.required = [keys[0]]
      }
    }
  }

  if (p.acquired.length >= p.required.length) return { ok: true }

  const next = p.required[p.acquired.length]
  if (!(next in state.resources.owners)) {
    p.acquired.push(next)
    return { ok: true }
  }

  const owner = state.resources.owners[next]
  if (owner === null || owner === undefined) {
    state.resources.owners[next] = p.id
    p.acquired.push(next)
    state.log.push(`t=${state.time}: ${p.name} allocated ${next}`)
    state.resources.waitQueues[next] = (state.resources.waitQueues[next] || []).filter((x) => x !== p.id)
    removeWaitEdgesFrom(state, p.id)
    return { ok: true, resource: next, owner }
  } else if (owner === p.id) {
    return { ok: true }
  } else {
    const wq = state.resources.waitQueues[next] || []
    if (!wq.includes(p.id)) {
      wq.push(p.id)
      state.resources.waitQueues[next] = wq
      addWaitEdge(state, p.id, owner)
      p.blockedReason = "resource"
      state.log.push(`t=${state.time}: ${p.name} waiting for ${next} (owned by P${owner})`)
    }
    return { ok: false, resource: next, owner }
  }
}

function chooseNextWaiter(state: SchedulerSnapshot, resource: string): string | undefined {
  const wq = state.resources.waitQueues[resource] || []
  if (wq.length === 0) return undefined
  const policy = state.resources.policy[resource] || "FIFO"
  if (policy === "FIFO") return wq.shift()
  // Priority: pick lowest numeric priority
  let bestIdx = 0
  let bestPid = wq[0]
  let bestPr = getProc(state, bestPid!)?.priority ?? Number.MAX_SAFE_INTEGER
  for (let i = 1; i < wq.length; i++) {
    const pid = wq[i]
    const pr = getProc(state, pid)?.priority ?? Number.MAX_SAFE_INTEGER
    if (pr < bestPr) {
      bestPr = pr
      bestPid = pid
      bestIdx = i
    }
  }
  const [picked] = wq.splice(bestIdx, 1)
  state.resources.waitQueues[resource] = wq
  return picked
}

function releaseAll(state: SchedulerSnapshot, p: Process) {
  for (const r of p.acquired) {
    if (!(r in state.resources.owners)) continue
    if (state.resources.owners[r] === p.id) {
      state.resources.owners[r] = null
      state.log.push(`t=${state.time}: ${p.name} released ${r}`)
      const nextPid = chooseNextWaiter(state, r)
      if (nextPid) {
        state.resources.owners[r] = nextPid
        const np = state.processes.find((x) => x.id === nextPid)
        if (np) {
          np.acquired.push(r)
          removeWaitEdgesFrom(state, nextPid)
          if (np.state === "blocked" && np.blockedReason === "resource") {
            np.blockedReason = undefined
            np.state = "ready"
            if (np.queueLevel === 0) enqueueIfNotPresent(state.q0, np.id)
            else if (np.queueLevel === 1) enqueueIfNotPresent(state.q1, np.id)
            else enqueueIfNotPresent(state.q2, np.id)
            state.log.push(`t=${state.time}: ${np.name} resumed (acquired ${r})`)
          }
        }
      }
    }
  }
  p.acquired = []
}

// Pick highest-cost victim (lowest effective priority; tie by latest arrival, then largest pid)
function pickDeadlockVictim(state: SchedulerSnapshot, pids: string[]): Process | null {
  const victims = pids.map((pid) => getProc(state, pid)).filter(Boolean) as Process[]
  if (victims.length === 0) return null
  victims.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    if (a.arrival !== b.arrival) return b.arrival - a.arrival
    return Number(b.id) - Number(a.id)
  })
  return victims[0]
}

// Internal: resolve cycles repeatedly in-place
function resolveDeadlocksInPlace(state: SchedulerSnapshot) {
  let guard = 0
  while (state.deadlock.cycle.length > 0 && guard < 20) {
    const victim = pickDeadlockVictim(state, state.deadlock.cycle)
    if (!victim) {
      state.log.push(`t=${state.time}: No valid victim found in cycle: [${state.deadlock.cycle.join(", ")}]`)
      break
    }

    // Log the deadlock state before resolution
    state.log.push(`t=${state.time}: Deadlock cycle detected: [${state.deadlock.cycle.join(" → ")}]`)
    state.log.push(
      `t=${state.time}: Terminating victim ${victim.name} (priority=${victim.priority}, arrival=${victim.arrival})`,
    )

    victim.state = "finished"
    victim.endTime = state.time
    victim.finishedBy = victim.queueLevel === 0 ? "RR" : victim.queueLevel === 1 ? "Priority" : "FCFS"
    victim.remaining = 0
    state.finishedOrder.push(victim.id)
    releaseAll(state, victim)
    removeWaitEdgesFrom(state, victim.id)
    removeFromQueues(state, victim.id)
    if (state.current === victim.id) {
      state.current = undefined
      state.rrSlice = 0
    }

    // Re-detect cycle after victim termination
    const oldCycle = [...state.deadlock.cycle]
    state.deadlock.cycle = detectCycle(state.deadlock.waitFor)

    if (state.deadlock.cycle.length === 0) {
      state.log.push(`t=${state.time}: Deadlock resolved successfully`)
    } else if (JSON.stringify(oldCycle) === JSON.stringify(state.deadlock.cycle)) {
      // Cycle didn't change - something is wrong
      state.log.push(`t=${state.time}: Warning: Cycle unchanged after victim termination`)
      break
    }

    guard++
  }

  if (guard >= 20) {
    state.log.push(`t=${state.time}: Deadlock resolution aborted - too many iterations`)
  }
}

export function mlfqStep(prev: SchedulerSnapshot, rrQuantum: number): SchedulerSnapshot {
  const state = clone(prev) as SchedulerSnapshot

  // Start-of-tick: I/O unblocks
  handleIoUnblock(state)

  // Admit arrivals
  for (const p of state.processes) {
    if (p.arrival <= state.time && p.state === "new") {
      p.state = "ready"
      if (p.queueLevel === 0) enqueueIfNotPresent(state.q0, p.id)
      else if (p.queueLevel === 1) enqueueIfNotPresent(state.q1, p.id)
      else enqueueIfNotPresent(state.q2, p.id)
      state.log.push(`t=${state.time}: ${p.name} arrived → Q${p.queueLevel}`)
    }
  }

  // Clean finished from queues
  for (const p of state.processes) {
    if (p.state === "finished") removeFromQueues(state, p.id)
  }

  // Aging promotions
  applyAging(state)

  // Preemption housekeeping
  const current = getProc(state, state.current)
  if (current && (current.state === "finished" || current.state === "blocked")) {
    state.current = undefined
    state.rrSlice = 0
  }
  if (current && current.state === "running" && current.queueLevel === 1) {
    const higherExists = state.q1.some((pid) => {
      const p = getProc(state, pid)!
      return p.priority < current.priority
    })
    if (higherExists) {
      current.state = "ready"
      enqueueIfNotPresent(state.q1, current.id)
      state.log.push(`t=${state.time}: Preempt ${current.name} (higher priority arrived)`)
      state.current = undefined
      state.rrSlice = 0
    }
  }

  // Choose next process
  let cur = getProc(state, state.current)
  if (!cur) {
    if (state.q0.length > 0) {
      const pid = state.q0.shift()!
      cur = getProc(state, pid)
      if (cur) {
        state.current = pid
        state.rrSlice = 0
        cur.state = "running"
        cur.queueLevel = 0
        cur.ageWait = 0
      }
    } else if (state.q1.length > 0) {
      const pid = state.q1.sort((a, b) => getProc(state, a)!.priority - getProc(state, b)!.priority)[0]
      state.q1 = state.q1.filter((p) => p !== pid)
      cur = getProc(state, pid)
      if (cur) {
        state.current = pid
        cur.state = "running"
        cur.queueLevel = 1
        cur.ageWait = 0
      }
    } else if (state.q2.length > 0) {
      const pid = state.q2.shift()!
      cur = getProc(state, pid)
      if (cur) {
        state.current = pid
        cur.state = "running"
        cur.queueLevel = 2
        cur.ageWait = 0
      }
    }
  }

  // Try to allocate required resource(s)
  cur = getProc(state, state.current)
  if (cur) {
    const alloc = allocateNextRequired(state, cur)
    if (!alloc.ok) {
      cur.state = "blocked"
      cur.blockedReason = "resource"
      state.current = undefined
      state.rrSlice = 0
      // opportunistically schedule another for this tick
      const scheduleAlt = () => {
        if (state.q0.length > 0) {
          const pid = state.q0.shift()!
          const p = getProc(state, pid)!
          p.state = "running"
          p.queueLevel = 0
          p.ageWait = 0
          state.current = pid
          state.rrSlice = 0
          return true
        }
        if (state.q1.length > 0) {
          const pid = state.q1.sort((a, b) => getProc(state, a)!.priority - getProc(state, b)!.priority)[0]
          state.q1 = state.q1.filter((x) => x !== pid)
          const p = getProc(state, pid)!
          p.state = "running"
          p.queueLevel = 1
          p.ageWait = 0
          state.current = pid
          return true
        }
        if (state.q2.length > 0) {
          const pid = state.q2.shift()!
          const p = getProc(state, pid)!
          p.state = "running"
          p.queueLevel = 2
          p.ageWait = 0
          state.current = pid
          return true
        }
        return false
      }
      scheduleAlt()
      cur = getProc(state, state.current)
    }
  }

  // Execute 1 time unit
  cur = getProc(state, state.current)
  if (cur) {
    if (cur.startTime === undefined) cur.startTime = state.time
    cur.remaining -= 1
    state.rrSlice += 1
    state.timeline.push({ t: state.time, pid: cur.id, q: cur.queueLevel })
    cur.history.push({ t: state.time, q: cur.queueLevel })

    // IO check after running unit
    if (cur.remaining > 0 && shouldTriggerIo(state, cur)) {
      cur.state = "blocked"
      cur.blockedReason = "io"
      cur.ioBlockRemaining = Math.max(1, state.config.io.blockLength)
      state.current = undefined
      state.rrSlice = 0
      state.log.push(`t=${state.time + 1}: ${cur.name} begins I/O (blocks for ${cur.ioBlockRemaining})`)
    }

    // Finished?
    if (cur.remaining <= 0) {
      cur.remaining = 0
      cur.state = "finished"
      cur.endTime = state.time + 1
      cur.finishedBy = cur.queueLevel === 0 ? "RR" : cur.queueLevel === 1 ? "Priority" : "FCFS"
      state.finishedOrder.push(cur.id)
      releaseAll(state, cur)
      state.log.push(`t=${state.time + 1}: ${cur.name} finished (via ${cur.finishedBy})`)
      state.current = undefined
      state.rrSlice = 0
    } else {
      // RR demotion if quantum exhausted
      if (cur.queueLevel === 0 && state.rrSlice >= Math.max(1, rrQuantum) && cur.state === "running") {
        cur.state = "ready"
        cur.queueLevel = 1
        enqueueIfNotPresent(state.q1, cur.id)
        state.log.push(`t=${state.time + 1}: ${cur.name} demoted to Q1 (quantum exhausted)`)
        state.current = undefined
        state.rrSlice = 0
      }
    }
  } else {
    // CPU idle
    state.timeline.push({ t: state.time })
  }

  // Advance time
  state.time += 1

  // Deadlock detection
  state.deadlock.cycle = detectCycle(state.deadlock.waitFor)
  if (state.config.deadlock.autoResolve && state.deadlock.cycle.length > 0) {
    resolveDeadlocksInPlace(state)
  }

  // Keep ready processes inside queues
  for (const p of state.processes) {
    if (p.state === "ready") {
      if (p.queueLevel === 0) enqueueIfNotPresent(state.q0, p.id)
      else if (p.queueLevel === 1) enqueueIfNotPresent(state.q1, p.id)
      else enqueueIfNotPresent(state.q2, p.id)
    }
  }

  return state
}

export function resolveDeadlock(prev: SchedulerSnapshot): SchedulerSnapshot {
  if (prev.deadlock.cycle.length === 0) return prev
  const state = clone(prev) as SchedulerSnapshot
  resolveDeadlocksInPlace(state)
  return state
}

export type ProcessRecord = {
  id: string
  name: string
  arrival: number
  burst: number
  priority: number
  type: ProcessType
  startTime?: number
  endTime?: number
  waitingTime?: number
  turnaroundTime?: number
  weightedTurnaround?: number
  finishedBy?: AlgoKey
}

export function computeMetrics(state: SchedulerSnapshot) {
  const activeTicks = state.timeline.filter((t) => t.pid).length
  const cpuUtil = state.time > 0 ? (activeTicks / state.time) * 100 : 0

  const finished = state.processes.filter((p) => p.state === "finished")
  const records: ProcessRecord[] = finished.map((p) => {
    const tat = (p.endTime ?? state.time) - p.arrival
    const wt = tat - p.burst
    return {
      id: p.id,
      name: p.name,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      type: p.type,
      startTime: p.startTime,
      endTime: p.endTime,
      waitingTime: wt,
      turnaroundTime: tat,
      weightedTurnaround: p.burst ? tat / p.burst : 0,
      finishedBy: p.finishedBy,
    }
  })

  const groupByAlgo = (algo: AlgoKey) => records.filter((r) => r.finishedBy === algo)
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const sum = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) : 0)

  const byAlgo = {
    RR: {
      rows: groupByAlgo("RR"),
      avgWaiting: avg(groupByAlgo("RR").map((r) => r.waitingTime ?? 0)),
      avgTurnaround: avg(groupByAlgo("RR").map((r) => r.turnaroundTime ?? 0)),
      avgWeighted: avg(groupByAlgo("RR").map((r) => r.weightedTurnaround ?? 0)),
    },
    Priority: {
      rows: groupByAlgo("Priority"),
      avgWaiting: avg(groupByAlgo("Priority").map((r) => r.waitingTime ?? 0)),
      avgTurnaround: avg(groupByAlgo("Priority").map((r) => r.turnaroundTime ?? 0)),
      avgWeighted: avg(groupByAlgo("Priority").map((r) => r.weightedTurnaround ?? 0)),
    },
    FCFS: {
      rows: groupByAlgo("FCFS"),
      avgWaiting: avg(groupByAlgo("FCFS").map((r) => r.waitingTime ?? 0)),
      avgTurnaround: avg(groupByAlgo("FCFS").map((r) => r.turnaroundTime ?? 0)),
      avgWeighted: avg(groupByAlgo("FCFS").map((r) => r.weightedTurnaround ?? 0)),
    },
  }

  const overall = {
    avgWaiting: avg(records.map((r) => r.waitingTime ?? 0)),
    avgTurnaround: avg(records.map((r) => r.turnaroundTime ?? 0)),
    avgWeighted: avg(records.map((r) => r.weightedTurnaround ?? 0)),
    finished: records.length,
    total: state.processes.length,
  }

  const totals = {
    waiting: sum(records.map((r) => r.waitingTime ?? 0)),
    turnaround: sum(records.map((r) => r.turnaroundTime ?? 0)),
  }

  return { cpuUtil, byAlgo, overall, totals }
}
