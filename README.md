# MLFQ Scheduler + Deadlock Visualizer

Modern interactive simulation of:
- MLFQ with Q0: Round Robin (configurable quantum, default 3), Q1: Preemptive Priority, Q2: FCFS
- Resource allocation with R1/R2/R3, wait queues, wait-for graph and deadlock detection
- Step-through execution (Next), Auto Play, process generator, manual add
- Gantt chart, per-algorithm tables, and summary metrics

## Requirements
- Node.js >= 18.17
- pnpm, npm, or yarn

## Install
\`\`\`bash
npm install
# If you still see missing packages:
npm i recharts lucide-react class-variance-authority clsx tailwind-merge \
  @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-select \
  @radix-ui/react-label @radix-ui/react-slider @radix-ui/react-switch \
  @radix-ui/react-separator @radix-ui/react-scroll-area
\`\`\`

## Run
\`\`\`bash
npm run dev
# Open http://localhost:3000
\`\`\`

## Tips
- If you see "Module not found: '@/components/ui/chart'", ensure `components/ui/chart.tsx` exists (included here).
- If styles look off, ensure `app/layout.tsx` imports `app/globals.css`.
- Auto Play stops automatically when all queues are empty or when all processes finish; Summary appears with average waiting, turnaround, and CPU utilization.
