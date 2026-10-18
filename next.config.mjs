/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the VM (node .next/standalone/server.js).
  output: "standalone",
  // Served under a sub-path in production (e.g. /planit); empty for local dev.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  poweredByHeader: false,
};

export default nextConfig;
