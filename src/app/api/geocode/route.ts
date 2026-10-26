/**
 * GET /api/geocode?q=Page+County,+VA
 *
 * Resolves a place name, city, or zip to a county geoid for /api/parcels.
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodeToCounty, GeocodeError } from '@/lib/geocode'

// Buyer-facing messages, keyed by GeocodeError status
const MESSAGES: Record<number, string> = {
  404: "We couldn't find that place. Try a county, city, or zip code.",
  422: 'That covers too much ground. Try a county, city, or zip code.',
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Type a county, city, or zip code.' }, { status: 400 })
  }

  try {
    return NextResponse.json(await geocodeToCounty(q))
  } catch (err) {
    const status = err instanceof GeocodeError ? err.status : 500
    if (status >= 500) console.error('[/api/geocode]', err)
    return NextResponse.json(
      { error: MESSAGES[status] ?? 'Search is having trouble right now. Please try again.' },
      { status }
    )
  }
}
