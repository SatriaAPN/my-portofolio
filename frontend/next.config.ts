import type { NextConfig } from "next";

// Proxy /api/* to the Go backend so the browser makes same-origin calls
// (first-party auth cookie, no CORS in the browser).
const backend = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  // Emit a self-contained `.next/standalone` server for a minimal Docker image
  // (only the files the app needs at runtime, no full node_modules install).
  output: "standalone",
  // The AI-assist endpoint can legitimately run for a minute on long posts;
  // the rewrite proxy's default 30s timeout would cut it off mid-request.
  experimental: { proxyTimeout: 180_000 },
  // NOTE: `rewrites()` destinations are baked at build time, so this proxy is
  // used for local dev (`npm run dev`). In production the reverse proxy (Caddy)
  // routes /api/* straight to the backend, so this never runs there.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
