import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@gameup/ui", "@gameup/types", "@gameup/utils"],
};

export default nextConfig;
