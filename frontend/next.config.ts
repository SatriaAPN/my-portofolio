import type { NextConfig } from "next";

// Proxy /api/* to the Go backend so the browser makes same-origin calls
// (first-party auth cookie, no CORS in the browser).
const backend = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
