import type { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

const nextConfig: NextConfig = {
  transpilePackages: ["@gameup/ui", "@gameup/types", "@gameup/utils"],
  // Docker standalone 빌드 (프로덕션 전용)
  output: isProd ? "standalone" : undefined,
  // 모노레포 Docker 빌드 시 Turbopack 워크스페이스 루트 명시
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gameup.co.kr',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'gameup.co.kr',
        pathname: '/uploads/**',
      },
    ],
  },
  // 개발 환경에서만 rewrite 적용 (프로덕션은 Nginx가 프록시 처리)
  async rewrites() {
    if (isProd) return { beforeFiles: [], afterFiles: [], fallback: [] }
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: 'http://localhost:5000/uploads/:path*',
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
      ],
    }
  },
}

export default nextConfig
