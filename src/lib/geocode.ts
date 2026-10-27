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

import { unstable_cache } from 'next/cache'
import { allCounties, countyLabel, type County } from '@/lib/counties'

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
  long_name: string
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

async function lookup(query: string): Promise<GeocodeResult> {
  if (!GOOGLE_KEY) {
    throw new GeocodeError('GOOGLE_MAPS_API_KEY is not set', 500)
  }

  const googleParams = new URLSearchParams({
    address:    query,
    components: 'country:US',
    key:        GOOGLE_KEY,
  })
  // Not cached here: a bad response would stick for a day. Successful
  // lookups are cached as a whole below.
  const gRes = await fetch(`${GOOGLE_URL}?${googleParams}`, { cache: 'no-store' })
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
  const component = (type: string) =>
    place.address_components.find(c => c.types.includes(type))
  const state = component('administrative_area_level_1')?.short_name

  // Google usually names the county, so match it against our list. Fall back
  // to the Census geocoder (by point) for places it doesn't, like
  // independent cities.
  const countyName = component('administrative_area_level_2')?.long_name
  const county = (state && countyName ? findByName(state, countyName) : undefined)
    ?? await countyAtPoint(lat, lng)

  return { geoid: county.geoid, label: countyLabel(county), lat, lng }
}

const normalize = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function findByName(state: string, name: string): County | undefined {
  const wanted = normalize(name)
  return allCounties().find(c => c.state === state && normalize(c.name) === wanted)
}

async function countyAtPoint(lat: number, lng: number): Promise<County> {
  const params = new URLSearchParams({
    x:         String(lng),
    y:         String(lat),
    benchmark: 'Public_AR_Current',
    vintage:   'Current_Current',
    layers:    'Counties',
    format:    'json',
  })

  // The Census service is flaky from Cloudflare (HTML error pages), so try twice
  let lastError = new GeocodeError('Census geocode error', 502)
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${CENSUS_URL}?${params}`, { cache: 'no-store' })
    const json = res.ok ? await res.json().catch(() => null) : null
    if (!json) {
      lastError = new GeocodeError(`Census geocode error: ${res.status}`, 502)
      continue
    }
    const geoid = json.result?.geographies?.Counties?.[0]?.GEOID as string | undefined
    const county = geoid ? allCounties().find(c => c.geoid === geoid) : undefined
    if (!county) {
      throw new GeocodeError('No county found for that place', 404)
    }
    return county
  }
  throw lastError
}

// Places don't move, so cache each answer for a day. Errors throw and are
// never cached, so a hiccup at Google or Census doesn't stick.
export const geocodeToCounty = unstable_cache(lookup, ['geocode-v2'], { revalidate: 86400 })
