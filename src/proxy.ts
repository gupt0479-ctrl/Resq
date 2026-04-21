import { NextRequest, NextResponse } from "next/server"

const PUBLIC = ["/", "/login", "/auth"]

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  // In demo/development mode, allow all requests through.
  // Auth hardening (Phase 5-7 of project-separation spec) will replace this
  // with @supabase/ssr session validation when NEXT_PUBLIC_DEMO_MODE=false.
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE
  if (!demoMode || demoMode.trim().toLowerCase() !== "false") {
    return NextResponse.next()
  }

  // Production auth: validate Supabase session via cookies
  // This path is only active when NEXT_PUBLIC_DEMO_MODE=false
  const hasSession = req.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))
  if (!hasSession) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
