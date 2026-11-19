import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image sets DOCKER_BUILD=1 to emit a self-contained server. Vercel builds are unaffected.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
