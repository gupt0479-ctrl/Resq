import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Off: Cache Components + Supabase reads caused prerender/`new Date()` errors
  // and `cacheLife()` coupling. Re-enable after adopting a full caching strategy.
  cacheComponents: false,
  // Emit a self-contained .next/standalone bundle so the Docker image in
  // the repo root can ship a ~300 MB container runnable on App Runner / ECS
  // without bringing the full node_modules tree.
  output: "standalone",
}

export default nextConfig
