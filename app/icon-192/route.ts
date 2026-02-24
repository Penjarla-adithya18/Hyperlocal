import { NextResponse } from 'next/server'

// Serves a 192x192 PWA icon as SVG wrapped in PNG-compatible response
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="36" fill="#6366f1"/>
  <text x="96" y="130" font-family="system-ui,Arial" font-size="100" font-weight="bold" text-anchor="middle" fill="white">H</text>
</svg>`
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public,max-age=86400' },
  })
}
