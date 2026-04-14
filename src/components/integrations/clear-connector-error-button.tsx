"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function ClearConnectorErrorButton({ provider }: { provider: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [isRefreshing, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const disabled = busy || isRefreshing

  return (
    <div className="mt-2 flex flex-col items-end gap-1">
      {error ? <p className="max-w-xs text-[10px] text-destructive">{error}</p> : null}
      <Button
        size="xs"
        variant="outline"
        disabled={disabled}
        onClick={async () => {
          setError(null)
          setBusy(true)
          try {
            const res = await fetch(`/api/integrations/connectors/${provider}/clear-error`, {
              method: "POST",
            })
            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as { error?: string }
              throw new Error(typeof body.error === "string" ? body.error : `Request failed (${res.status})`)
            }
            startTransition(() => router.refresh())
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
          } finally {
            setBusy(false)
          }
        }}
      >
        {disabled ? "Clearing..." : "Clear demo error"}
      </Button>
    </div>
  )
}
