import { useContext } from "react"
import { LoadingContext, LoadingContextValue } from "@/components/loading/loading-provider"

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error("useLoading must be used within a LoadingProvider")
  return ctx
}
