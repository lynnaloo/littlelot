/**
 * GET /api/zillow?addr=110+BOONE+RD+SW&state=VA&county=Floyd&lat=36.9&lng=-80.3
 *
 * Redirects to Zillow's search for the lot's street address. The lot data has
 * no ZIP or mailing city, and Zillow can't place "123 Main St, VA" without
 * one, so we look up the ZIP (Census ZIP code area) at the lot's location.
 */

import { NextRequest, NextResponse } from 'next/server'

const ZCTA_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query'

async function zipAtPoint(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    geometry:       `${lng},${lat}`,
    geometryType:   'esriGeometryPoint',
    inSR:           '4326',
    spatialRel:     'esriSpatialRelIntersects',
    outFields:      'ZCTA5',
    returnGeometry: 'false',
    f:              'json',
  })
  try {
    const res = await fetch(`${ZCTA_URL}?${params}`, { signal: AbortSignal.timeout(5_000) })
    const json = res.ok ? await res.json() as { features?: { attributes: { ZCTA5?: string } }[] } : null
    return json?.features?.[0]?.attributes.ZCTA5 ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const p      = req.nextUrl.searchParams
  const addr   = p.get('addr')?.trim()
  const state  = p.get('state')?.trim() ?? ''
  const county = p.get('county')?.trim()
  const lat    = Number(p.get('lat'))
  const lng    = Number(p.get('lng'))
  if (!addr) return NextResponse.redirect('https://www.zillow.com/')

  const zip = Number.isFinite(lat) && Number.isFinite(lng) ? await zipAtPoint(lat, lng) : null
  // Without a ZIP, the county name is the best hint we have
  const query = zip
    ? `${addr}, ${state} ${zip}`
    : [addr, county ? `${county} County` : null, state].filter(Boolean).join(', ')

  return NextResponse.redirect(`https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`)
}
