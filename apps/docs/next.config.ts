import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// In development: allow unsafe-eval/unsafe-inline so HMR and React devtools work.
// In production: remove them for a strict CSP.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self'";

const connectSrc = isDev
  ? "connect-src 'self' http://localhost:* ws://localhost:* https://api.razorpay.com"
  : "connect-src 'self' https://api.razorpay.com";

const imgSrc = isDev
  ? "img-src 'self' data: blob: https:"
  : "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      imgSrc,
      connectSrc,
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
