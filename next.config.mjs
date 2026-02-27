/** @type {import('next').NextConfig} */
const SUPABASE_URL = 'https://yecelpnlaruavifzxunw.supabase.co'

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
  // Proxy /functions/v1/* → Supabase edge functions.
  // This means the browser can use a relative URL (/functions/v1/auth)
  // even when NEXT_PUBLIC_SUPABASE_URL is not baked into the client bundle,
  // and avoids CORS pre-flight issues in development.
  async rewrites() {
    return [
      {
        source: '/functions/v1/:path*',
        destination: `${SUPABASE_URL}/functions/v1/:path*`,
      },
    ]
  },
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
