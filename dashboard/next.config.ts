import type { NextConfig } from "next";

// Dev needs 'unsafe-eval' + ws: for React Refresh / Turbopack HMR; production locks them down.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Dev (Turbopack/Next RSC) injects inline <script> tags without a nonce
  // to stream the React Server Components payload for hydration; without
  // 'unsafe-inline' here those get blocked and the page never hydrates.
  // Production keeps this locked down (no 'unsafe-inline'/'unsafe-eval').
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  "style-src 'self' 'unsafe-inline'", // inline style={{}} (sector colors) + framer-motion
  "img-src 'self' data:",
  "font-src 'self' data:", // next/font self-hosts Geist; no external CDN
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
