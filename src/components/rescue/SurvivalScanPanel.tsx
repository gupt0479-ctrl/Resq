"use client"

import { useState, useRef, useCallback } from "react"
import { Loader2, Zap, CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ScanPhase = "idle" | "starting" | "polling" | "done" | "error"

interface ScanStep {
  index: number
  label: string
  observation?: string
  durationMs?: number
}

interface ScanResult {
  mode: string
  degradedFromLive?: boolean
  warning?: string | null
  summary?: string
  steps?: ScanStep[]
  outputs?: Record<string, unknown>
}

interface PollResponse {
  runId: string
  status: string
  mode: string
  result?: { outputs?: Record<string, unknown>; steps?: ScanStep[]; summary?: string; warning?: string }
  error?: string
}

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 40 // 100s max

const STEP_LABELS: Record<string, string> = {
  search_financing_sources: "Searching financing sources",
  fetch_candidate_pages:    "Fetching lender pages",
  normalize_financing_offers: "Normalizing offers",
  agent_assist:             "Agent extraction pass",
  mock_start:               "Initializing scan",
  mock_extract:             "Extracting signals",
}

function humanLabel(raw: string) {
  return STEP_LABELS[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function ModeBadge({ mode, degraded }: { mode: string; degraded?: boolean }) {
  const label = degraded ? "degraded" : mode
  const cls =
    label === "live"        ? "bg-teal/15 text-teal border-teal/30" :
    label === "degraded"    ? "bg-amber/15 text-amber border-amber/30" :
    label === "mock"        ? "bg-steel/15 text-steel border-steel/30" :
    label === "misconfigured" ? "bg-crimson/15 text-crimson border-crimson/30" :
    "bg-steel/15 text-steel border-steel/30"
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", cls)}>
      {label}
    </span>
  )
}

function StepRow({ step, active }: { step: ScanStep; active: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn(
      "rounded border px-3 py-2 text-xs transition-all",
      active ? "border-foreground/20 bg-foreground/5" : "border-border bg-surface"
    )}>
      <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2">
          {active
            ? <Loader2 className="h-3 w-3 animate-spin text-steel" />
            : <CheckCircle className="h-3 w-3 text-teal" />}
          <span className={cn("font-medium", active ? "text-foreground" : "text-steel")}>
            {humanLabel(step.label)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-steel">
          {step.durationMs && <span>{(step.durationMs / 1000).toFixed(1)}s</span>}
          {step.observation && (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
        </div>
      </button>
      {open && step.observation && (
        <p className="mt-1.5 border-t border-border pt-1.5 text-[11.5px] text-steel leading-relaxed">
          {step.observation}
        </p>
      )}
    </div>
  )
}

export function SurvivalScanPanel() {
  const [phase, setPhase]       = useState<ScanPhase>("idle")
  const [runId, setRunId]       = useState<string | null>(null)
  const [steps, setSteps]       = useState<ScanStep[]>([])
  const [result, setResult]     = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mode, setMode]         = useState<string>("mock")
  const pollCount               = useRef(0)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const poll = useCallback(async function pollRun(id: string) {
    if (pollCount.current >= MAX_POLLS) {
      stopPolling()
      setPhase("error")
      setErrorMsg("Scan timed out. Check /api/tinyfish/health for mode status.")
      return
    }
    pollCount.current += 1

    try {
      const res = await fetch(`/api/tinyfish/poll/${encodeURIComponent(id)}`)
      const data: PollResponse = await res.json()

      if (data.result?.steps) setSteps(data.result.steps)

      if (data.status === "COMPLETED") {
        stopPolling()
        setPhase("done")
        setResult({
          mode: data.mode,
          summary: data.result?.summary,
          warning: data.result?.warning,
          steps: data.result?.steps,
          outputs: data.result?.outputs,
        })
        return
      }

      if (data.status === "FAILED" || data.status === "CANCELLED") {
        stopPolling()
        setPhase("error")
        setErrorMsg(data.error ?? `Run ended with status ${data.status}`)
        return
      }

      // Still running — schedule next poll
      timerRef.current = setTimeout(() => {
        void pollRun(id)
      }, POLL_INTERVAL_MS)
    } catch (err) {
      stopPolling()
      setPhase("error")
      setErrorMsg(err instanceof Error ? err.message : "Poll failed")
    }
  }, [stopPolling])

  async function startScan() {
    setPhase("starting")
    setSteps([])
    setResult(null)
    setErrorMsg(null)
    pollCount.current = 0

    try {
      const res = await fetch("/api/tinyfish/run-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://www.sba.gov/funding-programs/loans",
          goal: "Return JSON only: { \"offers\": [] } — financing options for a small business under cash pressure.",
        }),
      })
      const data = await res.json() as { runId: string; status: string; mode: string; error?: string }

      setMode(data.mode)

      if (data.status === "FAILED" || !data.runId || data.runId === "error") {
        setPhase("error")
        setErrorMsg(data.error ?? "Failed to start scan")
        return
      }

      setRunId(data.runId)
      setPhase("polling")
      timerRef.current = setTimeout(() => poll(data.runId), POLL_INTERVAL_MS)
    } catch (err) {
      setPhase("error")
      setErrorMsg(err instanceof Error ? err.message : "Failed to start scan")
    }
  }

  const isRunning = phase === "starting" || phase === "polling"

  return (
    <div className="card-elevated p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Autonomous agent</div>
          <h2 className="font-display text-lg mt-0.5">Survival Scan</h2>
        </div>
        <div className="flex items-center gap-2">
          {(phase !== "idle") && <ModeBadge mode={mode} degraded={result?.degradedFromLive} />}
          <button
            onClick={startScan}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isRunning
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…</>
              : <><Zap className="h-3.5 w-3.5" /> Run Survival Scan</>}
          </button>
        </div>
      </div>

      {/* Idle state */}
      {phase === "idle" && (
        <p className="mt-4 text-[12.5px] text-steel">
          Run a full survival scan to surface financing options, vendor savings, and receivables risk in one pass.
        </p>
      )}

      {/* Progress steps */}
      {(phase === "polling" || phase === "starting") && (
        <div className="mt-5 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">
            {runId ? `Run ${runId.slice(0, 8)}…` : "Initializing…"}
          </div>
          {steps.length === 0 ? (
            <div className="flex items-center gap-2 text-[12.5px] text-steel">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Agent is working…
            </div>
          ) : (
            steps.map((step, i) => (
              <StepRow key={step.index} step={step} active={i === steps.length - 1 && phase === "polling"} />
            ))
          )}
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-[12.5px] text-crimson">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg ?? "Scan failed. Check TinyFish health."}</span>
        </div>
      )}

      {/* Done state */}
      {phase === "done" && result && (
        <div className="mt-5 space-y-4">
          {/* Steps summary */}
          {result.steps && result.steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Agent steps</div>
              {result.steps.map((step) => (
                <StepRow key={step.index} step={step} active={false} />
              ))}
            </div>
          )}

          {/* Summary */}
          {result.summary && (
            <div className="rounded-md border border-teal/30 bg-teal/10 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-teal" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-teal font-semibold">Scan complete</span>
              </div>
              <p className="text-[12.5px] leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Warning */}
          {result.warning && (
            <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber/10 p-3 text-[12px] text-amber">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{result.warning}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
