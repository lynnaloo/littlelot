import { NextResponse, type NextRequest } from 'next/server'

// One address for search engines: send www to the bare domain
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  if (host.startsWith('www.')) {
    const url = new URL(req.url)
    url.host = host.slice(4)
    url.protocol = 'https:'
    url.port = ''
    return NextResponse.redirect(url, 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
