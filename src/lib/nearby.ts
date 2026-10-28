/**
 * nearby.ts — server-side nearest town, elementary school and hospital
 *
 * Three free federal map services, no keys:
 *   - Towns: Census TIGERweb incorporated places
 *   - Schools: NCES public elementary schools (2024–25), not fully virtual ones
 *   - Hospitals: FEMA's hospital list, open general and critical access
 *     hospitals (critical access hospitals must run a 24-hour ER)
 *
 * Distances are straight-line miles from the point inside the lot. Driving
 * distance will be longer. Call from API routes.
 */

import type { Nearby, NearbyPlace } from '@/types/parcel'
import { NEARBY_MAX_MILES } from '@/types/parcel'

const TOWNS_URL     = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query'
const SCHOOLS_URL   = 'https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_ADMINDATA_PUBLICSCH_2425/MapServer/1/query'
const HOSPITALS_URL = 'https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/Hospitals_RAPT/FeatureServer/6/query'

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

async function queryNear(
  url: string,
  where: string,
  outFields: string,
  lat: number,
  lng: number,
): Promise<Record<string, string | number | null>[]> {
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
      distance:       String(NEARBY_MAX_MILES),
      units:          'esriSRUnit_StatuteMile',
      returnGeometry: 'false',
      f:              'json',
    }),
    signal:  AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Nearby query error: ${res.status}`)
  const json = await res.json() as { features?: { attributes: Record<string, string | number | null> }[]; error?: unknown }
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

// Each lookup fails on its own: a down service shows "Unknown" for that row
// only. undefined means the lookup failed; null means none within range.
export async function nearbyServices(lat: number, lng: number): Promise<{
  [K in keyof Nearby]: Nearby[K] | undefined
}> {
  const settle = (p: Promise<NearbyPlace | null>) => p.catch(err => {
    console.error('[nearby]', err)
    return undefined
  })
  const [town, school, hospital] = await Promise.all([
    settle(nearestTown(lat, lng)),
    settle(nearestSchool(lat, lng)),
    settle(nearestHospital(lat, lng)),
  ])
  return { town, school, hospital }
}
