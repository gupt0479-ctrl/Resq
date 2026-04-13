import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Off: Cache Components + Supabase reads caused prerender/`new Date()` errors
    // and `cacheLife()` coupling. Re-enable after adopting a full caching strategy.
    cacheComponents: false,
  },
};

export default nextConfig;
