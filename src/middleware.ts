import { NextRequest, NextResponse } from "next/server"

const PUBLIC = ["/", "/login", "/auth"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  const loggedIn = req.cookies.get("sb-logged-in")?.value === "1"
  if (!loggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
}
