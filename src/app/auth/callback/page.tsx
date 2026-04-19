"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/db/supabase-browser"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) {
        document.cookie = `sb-logged-in=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
        router.replace("/dashboard")
      } else {
        router.replace("/login")
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f7" }}>
      <p className="text-stone-400 text-sm">Signing you in…</p>
    </div>
  )
}
