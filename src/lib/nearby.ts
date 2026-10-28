/**
 * nearby.ts — server-side nearest town, elementary school, hospital and
 * recreation area
 *
 * Four free federal map services, no keys:
 *   - Towns: Census TIGERweb incorporated places
 *   - Schools: NCES public elementary schools (2024–25), not fully virtual ones
 *   - Hospitals: FEMA's hospital list, open general and critical access
 *     hospitals (critical access hospitals must run a 24-hour ER)
 *   - Recreation: USGS PAD-US, publicly owned land open to the public
 *     (parks, forests, wildlife areas), measured to its nearest edge
 *
 * Distances are straight-line miles from the point inside the lot. Driving
 * distance will be longer. Call from API routes.
 */

import type { Nearby, NearbyPlace } from '@/types/parcel'
import { NEARBY_MAX_MILES } from '@/types/parcel'

const TOWNS_URL     = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query'
const SCHOOLS_URL   = 'https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_ADMINDATA_PUBLICSCH_2425/MapServer/1/query'
const HOSPITALS_URL = 'https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/Hospitals_RAPT/FeatureServer/6/query'
const PUBLIC_LAND_URL = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/PADUS_Public_Access/FeatureServer/0/query'

// Owned outright (not easements) and open to the public, skipping slivers
const REC_WHERE = "Pub_Access = 'OA' AND Category = 'Fee' AND GIS_Acres >= 5"
// Search rings, in miles, then narrow down between the last empty and first hit
const REC_RINGS = [1, 3, 10, 25, NEARBY_MAX_MILES]
const REC_NARROWING_STEPS = 5   // about half a mile of precision at 25 miles

interface Candidate { name: string; lat: number; lng: number }

function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2
          + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(a))
}

// FEMA names, and some school names, are all caps: "CARILION NEW RIVER VALLEY"
function titleCase(s: string): string {
  return s !== s.toUpperCase() ? s : s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

type Row = Record<string, string | number | null>

async function queryNear(
  url: string,
  where: string,
  outFields: string,
  lat: number,
  lng: number,
  miles = NEARBY_MAX_MILES,
): Promise<Row[]> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      where,
      outFields,
      geometry:       `${lng},${lat}`,
      geometryType:   'esriGeometryPoint',
      inSR:           '4326',
      spatialRel:     'esriSpatialRelIntersects',
      distance:       String(miles),
      units:          'esriSRUnit_StatuteMile',
      returnGeometry: 'false',
      f:              'json',
    }),
    signal:  AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Nearby query error: ${res.status}`)
  const json = await res.json() as { features?: { attributes: Row }[]; error?: unknown }
  if (json.error || !json.features) throw new Error(`Nearby query error: ${JSON.stringify(json.error)}`)
  return json.features.map(f => f.attributes)
}

function nearest(candidates: Candidate[], lat: number, lng: number): NearbyPlace | null {
  let best: NearbyPlace | null = null
  for (const c of candidates) {
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue
    const miles = milesBetween(lat, lng, c.lat, c.lng)
    if (miles <= NEARBY_MAX_MILES && (!best || miles < best.miles)) best = { name: c.name, miles }
  }
  return best
}

async function nearestTown(lat: number, lng: number): Promise<NearbyPlace | null> {
  const rows = await queryNear(TOWNS_URL, '1=1', 'BASENAME,INTPTLAT,INTPTLON', lat, lng)
  return nearest(rows.map(r => ({
    name: String(r.BASENAME),
    lat:  Number(r.INTPTLAT),   // strings like "+36.9112"
    lng:  Number(r.INTPTLON),
  })), lat, lng)
}

async function nearestSchool(lat: number, lng: number): Promise<NearbyPlace | null> {
  const rows = await queryNear(SCHOOLS_URL,
    "SCHOOL_LEVEL = 'Elementary' AND SY_STATUS_TEXT NOT IN ('Inactive','Future') AND VIRTUAL <> 'Full Virtual'",
    'SCH_NAME,LATCOD,LONCOD', lat, lng)
  return nearest(rows.map(r => ({
    name: titleCase(String(r.SCH_NAME)),
    lat:  Number(r.LATCOD),
    lng:  Number(r.LONCOD),
  })), lat, lng)
}

async function nearestHospital(lat: number, lng: number): Promise<NearbyPlace | null> {
  const rows = await queryNear(HOSPITALS_URL,
    "STATUS = 'OPEN' AND TYPE IN ('GENERAL ACUTE CARE','CRITICAL ACCESS')",
    'NAME,LATITUDE,LONGITUDE', lat, lng)
  return nearest(rows.map(r => ({
    name: titleCase(String(r.NAME)),
    lat:  Number(r.LATITUDE),
    lng:  Number(r.LONGITUDE),
  })), lat, lng)
}

// Parks and forests are big shapes, so distance to the center would mislead.
// Instead, widen the search ring until something touches it, then narrow in.
// Ties go to the biggest area, which is likelier to have trails and facilities.
async function nearestRecArea(lat: number, lng: number): Promise<NearbyPlace | null> {
  const query = (miles: number) =>
    queryNear(PUBLIC_LAND_URL, REC_WHERE, 'Unit_Nm,GIS_Acres', lat, lng, miles)

  let lo = 0
  let rows: Row[] = []
  let ringHit: number | null = null
  for (const ring of REC_RINGS) {
    rows = await query(ring)
    if (rows.length > 0) { ringHit = ring; break }
    lo = ring
  }
  if (ringHit === null) return null

  let hi = ringHit
  for (let i = 0; i < REC_NARROWING_STEPS; i++) {
    const mid = (lo + hi) / 2
    const found = await query(mid)
    if (found.length > 0) { hi = mid; rows = found } else lo = mid
  }

  const best = rows.reduce((a, b) => Number(b.GIS_Acres) > Number(a.GIS_Acres) ? b : a)
  return { name: String(best.Unit_Nm), miles: hi }
}

// Each lookup fails on its own: a down service shows "Unknown" for that row
// only. undefined means the lookup failed; null means none within range.
export async function nearbyServices(lat: number, lng: number): Promise<{
  [K in keyof Nearby]: Nearby[K] | undefined
}> {
  const settle = (p: Promise<NearbyPlace | null>) => p.catch(err => {
    console.error('[nearby]', err)
    return undefined
  })
  const [town, school, hospital, recArea] = await Promise.all([
    settle(nearestTown(lat, lng)),
    settle(nearestSchool(lat, lng)),
    settle(nearestHospital(lat, lng)),
    settle(nearestRecArea(lat, lng)),
  ])
  return { town, school, hospital, recArea }
}
