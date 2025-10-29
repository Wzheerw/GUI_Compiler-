"use client"
import dynamic from "next/dynamic"

// Disable SSR for the interactive simulator to prevent hydration mismatches.
const AppClient = dynamic(() => import("@/components/app-client"), { ssr: false })

export default function Page() {
  return <AppClient />
}
