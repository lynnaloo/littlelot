/**
 * POST /api/slope  { geometry, acres }
 *
 * Buildable ground for the open lot. The client already has the outline
 * from search results, so it sends it rather than us fetching the lot again.
 * Returns { ground: null } when the lot can't be measured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { buildableGround } from '@/lib/terrain'

interface SlopeRequest {
  geometry: GeoJSON.Geometry | null
  acres: number
}

function isValid(body: unknown): body is SlopeRequest {
  const b = body as Partial<SlopeRequest> | null
  return !!b && typeof b.acres === 'number' && b.acres > 0 && typeof b.geometry === 'object'
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null)
  if (!isValid(body)) {
    return NextResponse.json({ error: 'Missing lot outline.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ ground: await buildableGround(body.geometry, body.acres) })
  } catch (err) {
    console.error('[/api/slope]', err)
    return NextResponse.json({ error: 'Slope lookup failed.' }, { status: 502 })
  }
}
