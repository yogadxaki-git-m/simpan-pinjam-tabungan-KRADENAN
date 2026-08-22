import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Lewati error type checking saat deploy di Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Lewati warning ESLint saat deploy
    ignoreDuringBuilds: true,
  },
}

export default nextConfig