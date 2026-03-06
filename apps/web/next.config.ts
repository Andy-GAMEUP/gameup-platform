import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@gameup/ui", "@gameup/types", "@gameup/utils"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
    ]
  },
}

export default nextConfig
