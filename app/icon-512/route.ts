import { NextResponse } from 'next/server'

// Serves a 512x512 PWA icon
export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#6366f1"/>
  <text x="256" y="350" font-family="system-ui,Arial" font-size="280" font-weight="bold" text-anchor="middle" fill="white">H</text>
</svg>`
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public,max-age=86400' },
  })
}
