/**
 * GET /api/nearby?lat=36.9&lng=-80.3
 *
 * Nearest town, elementary school and hospital for the open lot. A field is
 * missing when its lookup failed, and null when there's none within range.
 */

import { NextRequest, NextResponse } from 'next/server'
import { nearbyServices } from '@/lib/nearby'

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get('lat'))
  const lng = Number(req.nextUrl.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Missing lot location.' }, { status: 400 })
  }

  const nearby = await nearbyServices(lat, lng)
  const complete = Object.values(nearby).every(v => v !== undefined)
  return NextResponse.json(nearby, {
    // Stores and hospitals change slowly; don't cache a partial failure
    headers: { 'Cache-Control': complete ? 'public, s-maxage=604800' : 'no-store' },
  })
}
