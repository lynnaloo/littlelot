/**
 * geocode.ts — server-side place search
 *
 * Turns what a buyer types ("Page County, VA", "Floyd VA", "24151") into a
 * county geoid the landrecords.us API can search on.
 *
 *   1. Google Geocoding resolves the text to a point.
 *   2. The Census geocoder (free, no key) resolves the point to a county FIPS.
 *
 * GOOGLE_MAPS_API_KEY is server-side only. Call this from API routes.
 */

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY

const GOOGLE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates'

export interface GeocodeResult {
  geoid: string    // 5-digit county FIPS
  label: string    // e.g. "Page County, VA"
  lat: number
  lng: number
}

export class GeocodeError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

interface GoogleComponent {
  short_name: string
  types: string[]
}

interface GoogleResult {
  types: string[]
  address_components: GoogleComponent[]
  geometry: { location: { lat: number; lng: number } }
}

// A whole state covers many counties, so a single point would pick one at random
const TOO_BROAD = ['administrative_area_level_1']

export async function geocodeToCounty(query: string): Promise<GeocodeResult> {
  if (!GOOGLE_KEY) {
    throw new GeocodeError('GOOGLE_MAPS_API_KEY is not set', 500)
  }

  const googleParams = new URLSearchParams({
    address:    query,
    components: 'country:US',
    key:        GOOGLE_KEY,
  })
  const gRes = await fetch(`${GOOGLE_URL}?${googleParams}`, {
    next: { revalidate: 86400 }, // places don't move, cache for 24h
  })
  if (!gRes.ok) {
    throw new GeocodeError(`Google geocode error: ${gRes.status}`, 502)
  }

  const gJson: { status: string; results: GoogleResult[] } = await gRes.json()
  if (gJson.status === 'ZERO_RESULTS' || gJson.results.length === 0) {
    throw new GeocodeError('No place found', 404)
  }
  if (gJson.status !== 'OK') {
    throw new GeocodeError(`Google geocode status: ${gJson.status}`, 502)
  }

  const place = gJson.results[0]
  // Google falls back to "United States" for text it can't place
  if (place.types.includes('country')) {
    throw new GeocodeError('No place found', 404)
  }
  if (place.types.some(t => TOO_BROAD.includes(t))) {
    throw new GeocodeError('Too broad', 422)
  }

  const { lat, lng } = place.geometry.location
  const censusParams = new URLSearchParams({
    x:         String(lng),
    y:         String(lat),
    benchmark: 'Public_AR_Current',
    vintage:   'Current_Current',
    layers:    'Counties',
    format:    'json',
  })
  const cRes = await fetch(`${CENSUS_URL}?${censusParams}`, {
    next: { revalidate: 86400 },
  })
  if (!cRes.ok) {
    throw new GeocodeError(`Census geocode error: ${cRes.status}`, 502)
  }

  const cJson = await cRes.json()
  const county = cJson?.result?.geographies?.Counties?.[0] as
    { GEOID: string; NAME: string } | undefined
  if (!county) {
    throw new GeocodeError('No county found for that place', 404)
  }

  const state = place.address_components
    .find(c => c.types.includes('administrative_area_level_1'))?.short_name

  return {
    geoid: county.GEOID,
    label: state ? `${county.NAME}, ${state}` : county.NAME,
    lat,
    lng,
  }
}
