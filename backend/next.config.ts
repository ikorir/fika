import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image deployed on Coolify.
  output: "standalone",
};

export default nextConfig;
