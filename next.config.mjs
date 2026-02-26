/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true, // profile images are base64; keep unoptimized
  },
  // Reduce JS sent to browser in production
  productionBrowserSourceMaps: false,
  // Headers: cache static assets aggressively
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
}

export default nextConfig
